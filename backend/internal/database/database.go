package database

import (
	"fmt"
	"log"
	"os"
	"strings"

	"remmy/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

var DB *gorm.DB

func resolveLogLevel() gormlogger.LogLevel {
	switch strings.ToLower(os.Getenv("LOG_LEVEL")) {
	case "silent":
		return gormlogger.Silent
	case "error":
		return gormlogger.Error
	case "info":
		return gormlogger.Info
	default:
		return gormlogger.Warn
	}
}

func InitializeDatabase() {
	var err error
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
	)

	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: gormlogger.Default.LogMode(resolveLogLevel()),
	})
	if err != nil {
		log.Fatalf("[Remmy] Failed to connect to database: %v", err)
	}

	log.Printf("[Remmy] Database connected at %s:%s/%s",
		os.Getenv("DB_HOST"), os.Getenv("DB_PORT"), os.Getenv("DB_NAME"))

	if err := DB.Exec("CREATE EXTENSION IF NOT EXISTS vector").Error; err != nil {
		log.Fatalf("[Remmy] Failed to enable pgvector extension: %v", err)
	}

	err = DB.AutoMigrate(
		&models.User{},
		&models.Log{},
		&models.LogChunk{},
		&models.Habit{},
		&models.ChatMessage{},
	)
	if err != nil {
		log.Fatal("[Remmy] Failed to migrate database:", err)
	}

	log.Println("[Remmy] Database migrations complete")
}

// BackfillTitles sets a default title on any logs that don't have one yet.
// Derives the title from rewritten_content (first 6 words) or falls back to type + date.
func BackfillTitles() {
	var logs []models.Log
	if err := DB.Where("title = ''").Find(&logs).Error; err != nil {
		log.Printf("[Remmy] BackfillTitles: query failed: %v", err)
		return
	}
	if len(logs) == 0 {
		return
	}
	log.Printf("[Remmy] BackfillTitles: backfilling %d logs", len(logs))
	for _, l := range logs {
		title := deriveTitle(l.RewrittenContent, l.Type, l.LoggedAt.Format("Jan 2"))
		DB.Model(&models.Log{}).Where("id = ?", l.ID).Update("title", title)
	}
	log.Printf("[Remmy] BackfillTitles: done")
}

func deriveTitle(rewritten, logType, dateStr string) string {
	if rewritten != "" {
		words := strings.Fields(rewritten)
		if len(words) > 6 {
			return strings.Join(words[:6], " ") + "…"
		}
		return strings.Join(words, " ")
	}
	if logType == "audio" {
		return "Voice memo · " + dateStr
	}
	return "Photo · " + dateStr
}
