package endpoints

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"math/rand"
	"strings"
	"time"

	"strconv"

	"remmy/internal/database"
	"remmy/internal/models"
	"remmy/internal/services/ai"
	"remmy/internal/services/search"

	"github.com/gin-gonic/gin"
	"github.com/google/generative-ai-go/genai"
)

func buildSystemPrompt(clientDate, clientDay string) string {
	todayDate := clientDate
	todayDay := clientDay
	if todayDate == "" {
		todayDate = time.Now().UTC().Format("2006-01-02")
		todayDay = time.Now().UTC().Format("Monday")
	}
	return fmt.Sprintf(`You are Remmy, a personal assistant with access to the user's daily logs.
Today's date is %s (%s). Use this when interpreting relative dates like "today", "yesterday", "last week".

The user logs their day through voice memos and images. You have a tool called log_search that lets you search through their logs semantically.

Use log_search whenever the user asks about:
- Something they did, said, or captured
- Patterns in their habits or activities
- Anything from a specific day or time period
- Questions about themselves or their routine

When calling log_search, only supply date_from/date_to if the user's question is explicitly scoped to a specific day or range. When in doubt, omit them so the semantic match can find anything relevant.

Be conversational, warm, and concise. Never make up log content — only reference what log_search returns.`, todayDate, todayDay)
}

type chatRequest struct {
	Message    string `json:"message" binding:"required"`
	ClientDate string `json:"client_date"`
	ClientDay  string `json:"client_day"`
}

const chatHistoryContextSize = 15

func buildLogSearchTool(clientDate string) *genai.Tool {
	todayDate := clientDate
	if todayDate == "" {
		todayDate = time.Now().UTC().Format("2006-01-02")
	}
	return &genai.Tool{
		FunctionDeclarations: []*genai.FunctionDeclaration{
			{
				Name:        "log_search",
				Description: "Semantic search over the user's personal daily logs (voice memos + images). Call this whenever the user references something they might have logged. Prefer calling with only a query — the semantic match handles most intent well. Only add date filters when the user is clearly scoped to a specific day or range.",
				Parameters: &genai.Schema{
					Type: genai.TypeObject,
					Properties: map[string]*genai.Schema{
						"query":     {Type: genai.TypeString, Description: "semantic search query describing what to find"},
						"date_from": {Type: genai.TypeString, Description: fmt.Sprintf("OPTIONAL start date, format YYYY-MM-DD. Today is %s. OMIT this parameter unless the user explicitly scopes to a date or range. Do NOT invent dates.", todayDate)},
						"date_to":   {Type: genai.TypeString, Description: fmt.Sprintf("OPTIONAL end date, format YYYY-MM-DD. Today is %s. OMIT this parameter unless the user explicitly scopes to a date or range. Do NOT invent dates.", todayDate)},
						"limit":     {Type: genai.TypeInteger, Description: "max number of results, default 5"},
					},
					Required: []string{"query"},
				},
			},
		},
	}
}

const chatPageSize = 40

func GetChatHistory(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	q := database.DB.Where("user_id = ?", userID)
	if beforeID := c.Query("before_id"); beforeID != "" {
		if id, err := strconv.ParseUint(beforeID, 10, 64); err == nil {
			q = q.Where("id < ?", id)
		}
	}

	var messages []models.ChatMessage
	if err := q.
		Order("created_at DESC").
		Limit(chatPageSize).
		Find(&messages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch history", "code": "db_error"})
		return
	}

	// Reverse so oldest is first for display
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	c.JSON(http.StatusOK, gin.H{
		"messages": messages,
		"has_more": len(messages) >= chatPageSize,
	})
}

func Chat(c *gin.Context) {
	if !ai.IsGeminiAvailable() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI not configured", "code": "ai_unavailable"})
		return
	}

	userID := c.MustGet("userID").(uint)

	var req chatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "code": "invalid_request"})
		return
	}

	client := ai.GetGeminiClient()
	model := client.GenerativeModel("gemini-2.0-flash")
	model.Tools = []*genai.Tool{buildLogSearchTool(req.ClientDate)}
	model.SystemInstruction = &genai.Content{
		Parts: []genai.Part{genai.Text(buildSystemPrompt(req.ClientDate, req.ClientDay))},
	}

	cs := model.StartChat()

	var prior []models.ChatMessage
	if err := database.DB.
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(chatHistoryContextSize).
		Find(&prior).Error; err != nil {
		log.Printf("[Chat] failed to load history for user %d: %v", userID, err)
	}
	// Reverse so oldest is first
	for i, j := 0, len(prior)-1; i < j; i, j = i+1, j-1 {
		prior[i], prior[j] = prior[j], prior[i]
	}
	for _, msg := range prior {
		cs.History = append(cs.History, &genai.Content{
			Role:  msg.Role,
			Parts: []genai.Part{genai.Text(msg.Content)},
		})
	}

	var parts []genai.Part
	parts = append(parts, genai.Text(req.Message))

	var resp *genai.GenerateContentResponse
	var sendErr error
	for attempt := 0; attempt < 8; attempt++ {
		if attempt > 0 {
			// Exponential backoff: 2s, 4s, 8s, 16s...
			// Add jitter: ±20%
			baseWait := time.Duration(1<<uint(attempt)) * 2 * time.Second
			jitter := time.Duration(rand.Int63n(int64(baseWait) / 5))
			if rand.Intn(2) == 0 {
				baseWait += jitter
			} else {
				baseWait -= jitter
			}

			log.Printf("[Chat] 429 detected, backing off for %v (attempt %d/8)", baseWait, attempt+1)

			select {
			case <-c.Request.Context().Done():
				c.JSON(http.StatusInternalServerError, gin.H{"error": "request cancelled", "code": "cancelled"})
				return
			case <-time.After(baseWait):
			}
		}
		resp, sendErr = cs.SendMessage(c.Request.Context(), parts...)
		if sendErr == nil {
			break
		}

		if !strings.Contains(sendErr.Error(), "429") {
			log.Printf("[Chat] SendMessage failed for user %d: %v", userID, sendErr)
			break
		}
	}
	if sendErr != nil {
		log.Printf("[Chat] SendMessage failed for user %d after retries: %v", userID, sendErr)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI request failed", "code": "ai_error"})
		return
	}

	finalText, searchCtx, err := runToolLoop(c.Request.Context(), cs, resp, userID)
	if err != nil {
		log.Printf("[Chat] Tool loop error for user %d: %v", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI processing failed", "code": "ai_error"})
		return
	}

	// Persist both turns
	database.DB.Create(&models.ChatMessage{UserID: userID, Role: "user", Content: req.Message})
	database.DB.Create(&models.ChatMessage{UserID: userID, Role: "model", Content: finalText})

	c.JSON(http.StatusOK, gin.H{"response": finalText, "search_context": searchCtx})
}

type SearchContext struct {
	Query   string                `json:"query"`
	Results []search.LogSearchResult `json:"results"`
}

func runToolLoop(ctx context.Context, cs *genai.ChatSession, resp *genai.GenerateContentResponse, userID uint) (string, []SearchContext, error) {
	var searchContexts []SearchContext

	for {
		if len(resp.Candidates) == 0 {
			return "", nil, fmt.Errorf("empty response")
		}

		candidate := resp.Candidates[0]
		if candidate.Content == nil {
			return "", nil, fmt.Errorf("nil content in response")
		}

		var funcCall *genai.FunctionCall
		var textParts []string

		for _, part := range candidate.Content.Parts {
			switch p := part.(type) {
			case genai.FunctionCall:
				funcCall = &p
			case genai.Text:
				textParts = append(textParts, string(p))
			}
		}

		if funcCall == nil {
			if len(textParts) > 0 {
				return strings.Join(textParts, ""), searchContexts, nil
			}
			return "", nil, fmt.Errorf("no text in response")
		}

		query := ""
		if q, ok := funcCall.Args["query"].(string); ok {
			query = q
		}

		results, toolResult, err := executeLogSearch(ctx, userID, funcCall.Args)
		if err != nil {
			log.Printf("[Chat] log_search failed: %v", err)
			toolResult = map[string]interface{}{"error": err.Error(), "results": []interface{}{}}
		} else {
			searchContexts = append(searchContexts, SearchContext{Query: query, Results: results})
		}

		var sendErr error
		for attempt := 0; attempt < 8; attempt++ {
			if attempt > 0 {
				baseWait := time.Duration(1<<uint(attempt)) * 2 * time.Second
				jitter := time.Duration(rand.Int63n(int64(baseWait) / 5))
				if rand.Intn(2) == 0 {
					baseWait += jitter
				} else {
					baseWait -= jitter
				}

				log.Printf("[Chat] 429 on tool response, backing off for %v (attempt %d/8)", baseWait, attempt+1)

				select {
				case <-ctx.Done():
					return "", nil, ctx.Err()
				case <-time.After(baseWait):
				}
			}
			resp, sendErr = cs.SendMessage(ctx, genai.FunctionResponse{
				Name:     funcCall.Name,
				Response: toolResult,
			})
			if sendErr == nil {
				break
			}
			if !strings.Contains(sendErr.Error(), "429") {
				break
			}
		}
		if sendErr != nil {
			return "", nil, fmt.Errorf("send tool response: %w", sendErr)
		}
	}
}

func executeLogSearch(ctx context.Context, userID uint, args map[string]interface{}) ([]search.LogSearchResult, map[string]interface{}, error) {
	params := search.LogSearchParams{}

	if q, ok := args["query"].(string); ok {
		params.Query = q
	}
	if df, ok := args["date_from"].(string); ok {
		params.DateFrom = df
	}
	if dt, ok := args["date_to"].(string); ok {
		params.DateTo = dt
	}
	if l, ok := args["limit"].(float64); ok {
		params.Limit = int(l)
	}

	log.Printf("[Chat] Starting executeLogSearch for user %d. Query: %q, DateFrom: %q, DateTo: %q, Limit: %d", userID, params.Query, params.DateFrom, params.DateTo, params.Limit)
	startTime := time.Now()

	results, err := search.SearchLogs(ctx, userID, params)
	elapsedTime := time.Since(startTime)

	if err != nil {
		log.Printf("[Chat] executeLogSearch failed after %v: %v", elapsedTime, err)
		return nil, nil, err
	}

	log.Printf("[Chat] executeLogSearch completed in %v. Found %d results.", elapsedTime, len(results))

	serialized, err := json.Marshal(results)
	if err != nil {
		return nil, nil, err
	}

	var asMap []interface{}
	json.Unmarshal(serialized, &asMap)

	return results, map[string]interface{}{
		"results": asMap,
		"count":   len(results),
	}, nil
}
