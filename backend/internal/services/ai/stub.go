package ai

import "context"

type StubASR struct{}

func (s *StubASR) Transcribe(ctx context.Context, audioURL string) (string, error) {
	return "this is a placeholder transcript for development purposes", nil
}

type StubVision struct{}

func (s *StubVision) Describe(ctx context.Context, imageURL string) (string, error) {
	return "this is a placeholder image description for development purposes", nil
}
