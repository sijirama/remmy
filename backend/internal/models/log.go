package models

import (
	"time"

	"github.com/pgvector/pgvector-go"
)

type Log struct {
	ID               string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID           uint      `gorm:"not null;index" json:"user_id"`
	Type             string    `gorm:"size:10;not null" json:"type"`
	Status           string    `gorm:"size:20;not null;default:'processing'" json:"status"`
	Title            string    `gorm:"size:200" json:"title"`
	RawFileURL       string    `gorm:"not null" json:"raw_file_url"`
	RawTranscript    string    `json:"raw_transcript,omitempty"`
	RawDescription   string    `json:"raw_description,omitempty"`
	RewrittenContent string    `json:"rewritten_content,omitempty"`
	HabitMatches     []string  `gorm:"serializer:json" json:"habit_matches"`
	LoggedAt         time.Time `gorm:"index" json:"logged_at"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"-"`
}

type LogChunk struct {
	ID         string          `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	LogID      string          `gorm:"type:uuid;not null;index" json:"log_id"`
	ChunkIndex int             `gorm:"not null" json:"chunk_index"`
	ChunkText  string          `gorm:"not null" json:"chunk_text"`
	Embedding  pgvector.Vector `gorm:"type:vector(3072)" json:"-"`
	CreatedAt  time.Time       `json:"created_at"`
}
