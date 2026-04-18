package processing

import (
	"context"
	"fmt"
	"log"
	"strings"

	"remmy/internal/database"
	"remmy/internal/models"
	"remmy/internal/services/ai"

	"github.com/pgvector/pgvector-go"
)

var (
	asrModel    ai.ASRModel    = &ai.StubASR{}
	visionModel ai.VisionModel = &ai.StubVision{}
)

func SetASRModel(m ai.ASRModel)       { asrModel = m }
func SetVisionModel(m ai.VisionModel) { visionModel = m }

func ProcessLog(ctx context.Context, job ProcessingJob) error {
	log.Printf("[Processing] Starting pipeline for log %s (type=%s)", job.LogID, job.LogType)

	activeASR := asrModel
	activeVision := visionModel
	if ai.IsGeminiAvailable() {
		activeASR = ai.NewGeminiASR(ai.GetGeminiClient())
		activeVision = ai.NewGeminiVision(ai.GetGeminiClient())
	}

	var raw string
	var err error

	switch job.LogType {
	case "audio":
		raw, err = activeASR.Transcribe(ctx, job.FileURL)
		if err != nil {
			setStatus(job.LogID, "failed")
			return fmt.Errorf("ASR: %w", err)
		}
		database.DB.Model(&models.Log{}).Where("id = ?", job.LogID).Update("raw_transcript", raw)

	case "image":
		raw, err = activeVision.Describe(ctx, job.FileURL)
		if err != nil {
			setStatus(job.LogID, "failed")
			return fmt.Errorf("vision: %w", err)
		}
		database.DB.Model(&models.Log{}).Where("id = ?", job.LogID).Update("raw_description", raw)

	default:
		return fmt.Errorf("unknown log type: %s", job.LogType)
	}

	if !ai.IsGeminiAvailable() {
		setStatus(job.LogID, "ready")
		return nil
	}

	gemini := ai.NewGeminiUnderstanding(ai.GetGeminiClient())

	result, err := gemini.Rewrite(ctx, raw, job.LogType)
	if err != nil {
		log.Printf("[Processing] Rewrite failed for log %s: %v — marking ready with raw content", job.LogID, err)
		setStatus(job.LogID, "ready")
		return nil
	}

	var entry models.Log
	if err := database.DB.First(&entry, "id = ?", job.LogID).Error; err != nil {
		return fmt.Errorf("fetch log for update: %w", err)
	}
	entry.Title = result.Title
	entry.RewrittenContent = result.Rewritten
	entry.HabitMatches = result.Habits
	database.DB.Save(&entry)

	chunks := chunkText(result.Rewritten)
	log.Printf("[Processing] Embedding %d chunks for log %s", len(chunks), job.LogID)
	for i, chunk := range chunks {
		embedding, err := gemini.Embed(ctx, chunk)
		if err != nil {
			log.Printf("[Processing] Embed failed for chunk %d of log %s: %v", i, job.LogID, err)
			continue
		}
		log.Printf("[Processing] Chunk %d embedded: %d dimensions", i, len(embedding))
		if err := database.DB.Create(&models.LogChunk{
			LogID:      job.LogID,
			ChunkIndex: i,
			ChunkText:  chunk,
			Embedding:  pgvector.NewVector(embedding),
		}).Error; err != nil {
			log.Printf("[Processing] Failed to save chunk %d for log %s: %v", i, job.LogID, err)
		}
	}

	setStatus(job.LogID, "ready")
	log.Printf("[Processing] Complete for log %s (%d chunks)", job.LogID, len(chunks))
	return nil
}

func setStatus(logID, status string) {
	database.DB.Model(&models.Log{}).Where("id = ?", logID).Update("status", status)
}

func chunkText(text string) []string {
	const maxChars = 2000
	const overlapChars = 200

	if len(text) <= maxChars {
		return []string{text}
	}

	sentences := strings.Split(text, ". ")
	var chunks []string
	current := ""

	for i, s := range sentences {
		part := s
		if i < len(sentences)-1 {
			part = s + ". "
		}
		if len(current)+len(part) > maxChars && current != "" {
			chunks = append(chunks, strings.TrimSpace(current))
			if len(current) > overlapChars {
				current = current[len(current)-overlapChars:]
			}
		}
		current += part
	}
	if strings.TrimSpace(current) != "" {
		chunks = append(chunks, strings.TrimSpace(current))
	}
	return chunks
}
