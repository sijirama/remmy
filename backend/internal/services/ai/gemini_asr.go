package ai

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"strings"

	"remmy/internal/services/media"

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

	// Derive MIME from the URL extension first — stored Content-Type on R2
	// objects is unreliable (older uploads landed as application/octet-stream,
	// and system registries sometimes map webm to video/webm).
	var mimeType string
	if u, err := url.Parse(audioURL); err == nil {
		mimeType = media.AudioMIMEByExt[strings.ToLower(path.Ext(u.Path))]
	}
	if mimeType == "" {
		mimeType = resp.Header.Get("Content-Type")
		mimeType = strings.SplitN(mimeType, ";", 2)[0]
		mimeType = strings.TrimSpace(mimeType)
	}
	if mimeType == "" || !strings.HasPrefix(mimeType, "audio/") {
		mimeType = "audio/webm"
	}

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
