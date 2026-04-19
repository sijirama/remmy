package ai

import "context"

type ASRModel interface {
	Transcribe(ctx context.Context, audioURL string) (string, error)
}

type VisionModel interface {
	Describe(ctx context.Context, imageURL string) (string, error)
}

type UnderstandingResult struct {
	Title     string
	Rewritten string
	Habits    []string
	MoodScore int
}

type UnderstandingModel interface {
	Rewrite(ctx context.Context, raw string, logType string) (*UnderstandingResult, error)
	Embed(ctx context.Context, text string) ([]float32, error)
}
