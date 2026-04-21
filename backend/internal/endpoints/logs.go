package endpoints

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"remmy/internal/database"
	"remmy/internal/models"
	"remmy/internal/services/media"
	"remmy/internal/services/processing"
	"io"

	"github.com/gin-gonic/gin"
)

const (
	maxAudioSize = 50 << 20 // 50 MB
	maxImageSize = 20 << 20 // 20 MB
)

func UploadAudioLog(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	if !media.IsR2Available() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "file upload not configured", "code": "storage_unavailable"})
		return
	}

	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxAudioSize)
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no file provided", "code": "missing_file"})
		return
	}
	defer file.Close()

	fileContent, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read file", "code": "read_error"})
		return
	}

	entry := models.Log{
		UserID:       userID,
		Type:         "audio",
		Status:       "processing",
		RawFileURL:   "", // Will be populated after background upload
		HabitMatches: []string{},
		LoggedAt:     time.Now().UTC(),
	}
	if err := database.DB.Create(&entry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create log", "code": "db_error"})
		return
	}

	// Buffer in Redis
	redisKey := fmt.Sprintf("blob:%s", entry.ID)
	if err := database.Redis.Set(c.Request.Context(), redisKey, fileContent, 30*time.Minute).Err(); err != nil {
		log.Printf("[Logs] Redis buffer failed for log %s: %v", entry.ID, err)
		// Fallback: delete entry and fail
		database.DB.Delete(&entry)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to buffer log", "code": "buffer_error"})
		return
	}

	// Respond accepted immediately
	c.JSON(http.StatusAccepted, gin.H{
		"id":         entry.ID,
		"type":       entry.Type,
		"status":     entry.Status,
		"created_at": entry.CreatedAt,
	})

	// Handle storage upload and processing in background
	go backgroundUpload(entry.ID, entry.Type, header.Filename, userID)
}

func UploadImageLog(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	if !media.IsR2Available() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "file upload not configured", "code": "storage_unavailable"})
		return
	}

	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxImageSize)
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no file provided", "code": "missing_file"})
		return
	}
	defer file.Close()

	fileContent, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read file", "code": "read_error"})
		return
	}

	entry := models.Log{
		UserID:       userID,
		Type:         "image",
		Status:       "processing",
		RawFileURL:   "",
		HabitMatches: []string{},
		LoggedAt:     time.Now().UTC(),
	}
	if err := database.DB.Create(&entry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create log", "code": "db_error"})
		return
	}

	// Buffer in Redis
	redisKey := fmt.Sprintf("blob:%s", entry.ID)
	if err := database.Redis.Set(c.Request.Context(), redisKey, fileContent, 30*time.Minute).Err(); err != nil {
		log.Printf("[Logs] Redis buffer failed for log %s: %v", entry.ID, err)
		database.DB.Delete(&entry)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to buffer log", "code": "buffer_error"})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"id":         entry.ID,
		"type":       entry.Type,
		"status":     entry.Status,
		"created_at": entry.CreatedAt,
	})

	go backgroundUpload(entry.ID, entry.Type, header.Filename, userID)
}

const defaultPageSize = 20

func GetLogs(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	dateStr := c.Query("date")

	var date time.Time
	if dateStr == "" {
		date = time.Now().UTC()
	} else {
		var err error
		date, err = time.Parse("2006-01-02", dateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid date, use YYYY-MM-DD", "code": "invalid_date"})
			return
		}
	}

	offset := 0
	if o := c.Query("offset"); o != "" {
		if v, err := strconv.Atoi(o); err == nil && v >= 0 {
			offset = v
		}
	}

	start := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, time.UTC)
	end := start.Add(24 * time.Hour)

	base := database.DB.Model(&models.Log{}).
		Where("user_id = ? AND logged_at >= ? AND logged_at < ?", userID, start, end)

	var total int64
	base.Count(&total)

	var logs []models.Log
	if err := base.
		Order("logged_at DESC").
		Limit(defaultPageSize).
		Offset(offset).
		Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch logs", "code": "db_error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"logs":     logs,
		"has_more": int64(offset+defaultPageSize) < total,
	})
}

func GetLogByID(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	logID := c.Param("id")

	var entry models.Log
	if err := database.DB.Where("id = ? AND user_id = ?", logID, userID).First(&entry).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "log not found", "code": "not_found"})
		return
	}

	c.JSON(http.StatusOK, entry)
}

func ReprocessLog(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	logID := c.Param("id")

	var entry models.Log
	if err := database.DB.Where("id = ? AND user_id = ?", logID, userID).First(&entry).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "log not found", "code": "not_found"})
		return
	}

	if entry.RawFileURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "log has no source file", "code": "missing_file"})
		return
	}

	if err := database.DB.Where("log_id = ?", entry.ID).Delete(&models.LogChunk{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to clear chunks", "code": "db_error"})
		return
	}

	updates := map[string]interface{}{
		"status":            "processing",
		"raw_transcript":    "",
		"raw_description":   "",
		"rewritten_content": "",
		"title":             "",
		"habit_matches":     []string{},
	}
	if err := database.DB.Model(&entry).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reset log", "code": "db_error"})
		return
	}

	processing.Enqueue(processing.ProcessingJob{
		LogID:   entry.ID,
		LogType: entry.Type,
		FileURL: entry.RawFileURL,
		UserID:  userID,
	})

	c.JSON(http.StatusAccepted, gin.H{
		"id":     entry.ID,
		"status": "processing",
	})
}

func DeleteLog(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	logID := c.Param("id")

	var entry models.Log
	if err := database.DB.Where("id = ? AND user_id = ?", logID, userID).First(&entry).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "log not found", "code": "not_found"})
		return
	}

	if err := database.DB.Where("log_id = ?", entry.ID).Delete(&models.LogChunk{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete chunks", "code": "db_error"})
		return
	}

	if err := database.DB.Delete(&entry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete log", "code": "db_error"})
		return
	}

	if media.IsR2Available() {
		if key := media.KeyFromURL(entry.RawFileURL); key != "" {
			if err := media.DeleteFile(c.Request.Context(), key); err != nil {
				log.Printf("[Logs] R2 cleanup failed for log %s (key %s): %v", entry.ID, key, err)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"id": entry.ID, "deleted": true})
}

func backgroundUpload(logID string, logType string, fileName string, userID uint) {
	ctx := context.Background()
	redisKey := fmt.Sprintf("blob:%s", logID)

	// Retrieve from Redis
	blob, err := database.Redis.Get(ctx, redisKey).Bytes()
	if err != nil {
		log.Printf("[Logs] Background upload failed to get blob from Redis for log %s: %v", logID, err)
		return
	}

	folder := fmt.Sprintf("%s/%d", logType, userID)
	if logType == "audio" {
		folder = fmt.Sprintf("audio/%d", userID)
	} else if logType == "image" {
		folder = fmt.Sprintf("images/%d", userID)
	}

	// Upload to R2
	result, err := media.UploadFromBytes(ctx, blob, fileName, folder)
	if err != nil {
		log.Printf("[Logs] Background upload to R2 failed for log %s: %v", logID, err)
		return
	}

	// Update DB and cleanup Redis
	database.DB.Model(&models.Log{}).Where("id = ?", logID).Update("raw_file_url", result.URL)
	database.Redis.Del(ctx, redisKey)

	// Trigger processing
	processing.Enqueue(processing.ProcessingJob{
		LogID:   logID,
		LogType: logType,
		FileURL: result.URL,
		UserID:  userID,
	})

	log.Printf("[Logs] Background upload and enqueue complete for log %s", logID)
}
