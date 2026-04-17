package ai

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/google/generative-ai-go/genai"
)

type GeminiVision struct {
	client *genai.Client
}

func NewGeminiVision(client *genai.Client) *GeminiVision {
	return &GeminiVision{client: client}
}

func (g *GeminiVision) Describe(ctx context.Context, imageURL string) (string, error) {
	resp, err := http.Get(imageURL)
	if err != nil {
		return "", fmt.Errorf("fetch image: %w", err)
	}
	defer resp.Body.Close()

	imageBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read image: %w", err)
	}

	mimeType := resp.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = http.DetectContentType(imageBytes)
	}
	// genai.ImageData expects just the subtype (e.g. "png"), not the full MIME type
	mimeType = strings.TrimPrefix(mimeType, "image/")

	model := g.client.GenerativeModel("gemini-3.1-flash-lite-preview")
	res, err := model.GenerateContent(ctx,
		genai.ImageData(mimeType, imageBytes),
		genai.Text("Describe everything you see in this image in detail. This is a personal daily log entry — capture all relevant context, activities, objects, text, and observations."),
	)
	if err != nil {
		return "", fmt.Errorf("gemini vision: %w", err)
	}

	if len(res.Candidates) == 0 || len(res.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("empty response from gemini vision")
	}

	return fmt.Sprintf("%v", res.Candidates[0].Content.Parts[0]), nil
}
