package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/generative-ai-go/genai"
)

type GeminiUnderstanding struct {
	client *genai.Client
}

func NewGeminiUnderstanding(client *genai.Client) *GeminiUnderstanding {
	return &GeminiUnderstanding{client: client}
}

type rewriteResponse struct {
	Title     string   `json:"title"`
	Rewritten string   `json:"rewritten"`
	Habits    []string `json:"habits"`
	MoodScore int      `json:"mood_score"`
}

func (g *GeminiUnderstanding) Rewrite(ctx context.Context, raw string, logType string) (*UnderstandingResult, error) {
	prompt := fmt.Sprintf(`You are processing a personal daily log entry. The user has either spoken a voice memo or captured an image. Your job is to:

1. Generate a short title (3-6 words) that captures the essence of the entry
2. Rewrite the raw content into clean, structured prose that preserves all meaning and detail but reads clearly
3. Extract any habits or activities mentioned
4. Evaluate the user's emotional state and mood from 1 (very negative/stressed) to 10 (very positive/happy). Use 5 for neutral or purely informational entries.
5. Return a JSON object with:
   - title: string (3-6 word title)
   - rewritten: string (the clean rewritten content)
   - habits: string[] (list of habits or activities detected)
   - mood_score: number (1-10)

Raw content type: %s
Raw content: %s

Return only valid JSON. No preamble.`, logType, raw)

	model := g.client.GenerativeModel("gemini-3.1-flash-lite-preview")
	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return nil, fmt.Errorf("gemini rewrite: %w", err)
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("empty response from gemini")
	}

	text := fmt.Sprintf("%v", resp.Candidates[0].Content.Parts[0])
	text = stripJSONFences(text)

	var parsed rewriteResponse
	if err := json.Unmarshal([]byte(text), &parsed); err != nil {
		return nil, fmt.Errorf("parse gemini response: %w (raw: %s)", err, text)
	}

	if parsed.Habits == nil {
		parsed.Habits = []string{}
	}

	if parsed.MoodScore == 0 {
		parsed.MoodScore = 5
	}

	return &UnderstandingResult{
		Title:     parsed.Title,
		Rewritten: parsed.Rewritten,
		Habits:    parsed.Habits,
		MoodScore: parsed.MoodScore,
	}, nil
}

func (g *GeminiUnderstanding) Embed(ctx context.Context, text string) ([]float32, error) {
	em := g.client.EmbeddingModel("gemini-embedding-001")
	var lastErr error
	for attempt := 0; attempt < 5; attempt++ {
		if attempt > 0 {
			wait := time.Duration(1<<uint(attempt)) * time.Second
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(wait):
			}
		}
		res, err := em.EmbedContent(ctx, genai.Text(text))
		if err == nil {
			return res.Embedding.Values, nil
		}
		lastErr = err
		if !strings.Contains(err.Error(), "429") {
			break
		}
	}
	return nil, fmt.Errorf("gemini embed: %w", lastErr)
}

func stripJSONFences(s string) string {
	s = strings.TrimSpace(s)
	if strings.HasPrefix(s, "```json") {
		s = strings.TrimPrefix(s, "```json")
	} else if strings.HasPrefix(s, "```") {
		s = strings.TrimPrefix(s, "```")
	}
	s = strings.TrimSuffix(s, "```")
	return strings.TrimSpace(s)
}
