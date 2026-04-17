package ai

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/google/generative-ai-go/genai"
)

type GeminiASR struct {
	client *genai.Client
}

func NewGeminiASR(client *genai.Client) *GeminiASR {
	return &GeminiASR{client: client}
}

func (g *GeminiASR) Transcribe(ctx context.Context, audioURL string) (string, error) {
	resp, err := http.Get(audioURL)
	if err != nil {
		return "", fmt.Errorf("fetch audio: %w", err)
	}
	defer resp.Body.Close()

	audioBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read audio: %w", err)
	}

	mimeType := resp.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "audio/webm"
	}
	// normalise: strip any suffix params like "audio/webm; codecs=opus"
	mimeType = strings.SplitN(mimeType, ";", 2)[0]
	mimeType = strings.TrimSpace(mimeType)

	model := g.client.GenerativeModel("gemini-3.1-flash-lite-preview")
	res, err := model.GenerateContent(ctx,
		genai.Blob{MIMEType: mimeType, Data: audioBytes},
		genai.Text("Transcribe this audio exactly as spoken. Return only the transcript, no labels or commentary."),
	)
	if err != nil {
		return "", fmt.Errorf("gemini asr: %w", err)
	}

	if len(res.Candidates) == 0 || len(res.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("empty response from gemini asr")
	}

	return fmt.Sprintf("%v", res.Candidates[0].Content.Parts[0]), nil
}
