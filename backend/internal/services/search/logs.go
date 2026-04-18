package search

import (
	"context"
	"fmt"
	"log"
	"time"

	"remmy/internal/database"
	"remmy/internal/services/ai"

	"github.com/pgvector/pgvector-go"
)

type LogSearchParams struct {
	Query    string
	DateFrom string
	DateTo   string
	Limit    int
}

type LogSearchResult struct {
	ChunkText    string    `json:"chunk_text"`
	LogType      string    `json:"type"`
	LoggedAt     time.Time `json:"logged_at"`
	HabitMatches string    `json:"habit_matches"` // raw JSON string from DB
	Similarity   float64   `json:"similarity"`
}

func SearchLogs(ctx context.Context, userID uint, params LogSearchParams) ([]LogSearchResult, error) {
	if !ai.IsGeminiAvailable() {
		return nil, fmt.Errorf("search unavailable: Gemini not initialized")
	}

	if params.Limit <= 0 {
		params.Limit = 5
	}

	log.Printf("[Search] userID=%d query=%q date_from=%q date_to=%q limit=%d",
		userID, params.Query, params.DateFrom, params.DateTo, params.Limit)

	var rawCounts struct {
		ChunksAll   int64
		ChunksForMe int64
		LogsForMe   int64
	}
	database.DB.Raw(`SELECT COUNT(*) FROM log_chunks`).Scan(&rawCounts.ChunksAll)
	database.DB.Raw(`SELECT COUNT(*) FROM log_chunks lc JOIN logs l ON l.id = lc.log_id WHERE l.user_id = ?`, userID).Scan(&rawCounts.ChunksForMe)
	database.DB.Raw(`SELECT COUNT(*) FROM logs WHERE user_id = ?`, userID).Scan(&rawCounts.LogsForMe)
	log.Printf("[Search] DB state: chunks_total=%d chunks_for_user=%d logs_for_user=%d",
		rawCounts.ChunksAll, rawCounts.ChunksForMe, rawCounts.LogsForMe)

	gemini := ai.NewGeminiUnderstanding(ai.GetGeminiClient())
	embedding, err := gemini.Embed(ctx, params.Query)
	if err != nil {
		return nil, fmt.Errorf("embed query: %w", err)
	}
	log.Printf("[Search] query embedding dims=%d", len(embedding))

	vec := pgvector.NewVector(embedding)

	var results []LogSearchResult

	query := `
		SELECT
			lc.chunk_text,
			l.type,
			l.logged_at,
			l.habit_matches,
			1 - (lc.embedding <=> ?) AS similarity
		FROM log_chunks lc
		JOIN logs l ON l.id = lc.log_id
		WHERE l.user_id = ?`

	args := []interface{}{vec, userID}

	if params.DateFrom != "" {
		query += ` AND l.logged_at::date >= ?`
		args = append(args, params.DateFrom)
	}
	if params.DateTo != "" {
		query += ` AND l.logged_at::date <= ?`
		args = append(args, params.DateTo)
	}

	query += ` ORDER BY lc.embedding <=> ? LIMIT ?`
	args = append(args, vec, params.Limit)

	if err := database.DB.Raw(query, args...).Scan(&results).Error; err != nil {
		return nil, fmt.Errorf("vector search: %w", err)
	}

	log.Printf("[Search] query returned %d results", len(results))
	return results, nil
}
