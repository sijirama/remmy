package database

import (
	"fmt"
	"log"
	"os"

	"remmy/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

var DB *gorm.DB

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
		Logger: gormlogger.Default.LogMode(gormlogger.Info),
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
	)
	if err != nil {
		log.Fatal("[Remmy] Failed to migrate database:", err)
	}

	log.Println("[Remmy] Database migrations complete")
}
