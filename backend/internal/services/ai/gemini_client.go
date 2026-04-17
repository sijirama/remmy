package ai

import (
	"context"
	"log"
	"os"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

var geminiClient *genai.Client

func InitGemini() {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		log.Println("[Remmy] GEMINI_API_KEY not set — understanding layer will use raw content only")
		return
	}

	var err error
	geminiClient, err = genai.NewClient(context.Background(), option.WithAPIKey(apiKey))
	if err != nil {
		log.Printf("[Remmy] Failed to initialize Gemini client: %v", err)
		return
	}
	log.Println("[Remmy] Gemini client initialized")
}

func GetGeminiClient() *genai.Client {
	return geminiClient
}

func IsGeminiAvailable() bool {
	return geminiClient != nil
}
