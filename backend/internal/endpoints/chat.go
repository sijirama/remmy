package endpoints

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"remmy/internal/database"
	"remmy/internal/models"
	"remmy/internal/services/ai"
	"remmy/internal/services/search"

	"github.com/gin-gonic/gin"
	"github.com/google/generative-ai-go/genai"
)

const systemPrompt = `You are Remmy, a personal assistant with access to the user's daily logs.
The user logs their day through voice memos and images. You have a tool called log_search that lets you search through their logs semantically.

Use log_search whenever the user asks about:
- Something they did, said, or captured
- Patterns in their habits or activities
- Anything from a specific day or time period
- Questions about themselves or their routine

Be conversational, warm, and concise. Never make up log content — only reference what log_search returns.`

type chatRequest struct {
	Message string        `json:"message" binding:"required"`
	History []chatMessage `json:"history"`
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

var logSearchTool = &genai.Tool{
	FunctionDeclarations: []*genai.FunctionDeclaration{
		{
			Name:        "log_search",
			Description: "Search the user's personal daily logs semantically. Use this whenever the user references something they may have logged.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"query":     {Type: genai.TypeString, Description: "semantic search query describing what to find"},
					"date_from": {Type: genai.TypeString, Description: "optional start date filter, format YYYY-MM-DD"},
					"date_to":   {Type: genai.TypeString, Description: "optional end date filter, format YYYY-MM-DD"},
					"limit":     {Type: genai.TypeInteger, Description: "max number of results, default 5"},
				},
				Required: []string{"query"},
			},
		},
	},
}

func GetChatHistory(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	var messages []models.ChatMessage
	if err := database.DB.
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(40).
		Find(&messages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch history", "code": "db_error"})
		return
	}

	// Reverse so oldest is first
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	c.JSON(http.StatusOK, gin.H{"messages": messages})
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
	model.Tools = []*genai.Tool{logSearchTool}
	model.SystemInstruction = &genai.Content{
		Parts: []genai.Part{genai.Text(systemPrompt)},
	}

	cs := model.StartChat()

	for _, msg := range req.History {
		cs.History = append(cs.History, &genai.Content{
			Role:  msg.Role,
			Parts: []genai.Part{genai.Text(msg.Content)},
		})
	}

	var parts []genai.Part
	parts = append(parts, genai.Text(req.Message))

	resp, err := cs.SendMessage(c.Request.Context(), parts...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI request failed", "code": "ai_error"})
		return
	}

	finalText, err := runToolLoop(c.Request.Context(), cs, resp, userID)
	if err != nil {
		log.Printf("[Chat] Tool loop error for user %d: %v", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI processing failed", "code": "ai_error"})
		return
	}

	// Persist both turns
	database.DB.Create(&models.ChatMessage{UserID: userID, Role: "user", Content: req.Message})
	database.DB.Create(&models.ChatMessage{UserID: userID, Role: "model", Content: finalText})

	c.JSON(http.StatusOK, gin.H{"response": finalText})
}

func runToolLoop(ctx context.Context, cs *genai.ChatSession, resp *genai.GenerateContentResponse, userID uint) (string, error) {
	for {
		if len(resp.Candidates) == 0 {
			return "", fmt.Errorf("empty response")
		}

		candidate := resp.Candidates[0]
		if candidate.Content == nil {
			return "", fmt.Errorf("nil content in response")
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
				return strings.Join(textParts, ""), nil
			}
			return "", fmt.Errorf("no text in response")
		}

		toolResult, err := executeLogSearch(ctx, userID, funcCall.Args)
		if err != nil {
			log.Printf("[Chat] log_search failed: %v", err)
			toolResult = map[string]interface{}{"error": err.Error(), "results": []interface{}{}}
		}

		var sendErr error
		for attempt := 0; attempt < 5; attempt++ {
			if attempt > 0 {
				wait := time.Duration(1<<uint(attempt)) * time.Second
				select {
				case <-ctx.Done():
					return "", ctx.Err()
				case <-time.After(wait):
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
			log.Printf("[Chat] 429 on SendMessage attempt %d, retrying", attempt+1)
		}
		if sendErr != nil {
			return "", fmt.Errorf("send tool response: %w", sendErr)
		}
	}
}

func executeLogSearch(ctx context.Context, userID uint, args map[string]interface{}) (map[string]interface{}, error) {
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

	results, err := search.SearchLogs(ctx, userID, params)
	if err != nil {
		return nil, err
	}

	serialized, err := json.Marshal(results)
	if err != nil {
		return nil, err
	}

	var asMap []interface{}
	json.Unmarshal(serialized, &asMap)

	return map[string]interface{}{
		"results": asMap,
		"count":   len(results),
	}, nil
}
