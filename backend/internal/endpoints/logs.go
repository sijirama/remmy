package endpoints

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"remmy/internal/database"
	"remmy/internal/models"
	"remmy/internal/services/media"
	"remmy/internal/services/processing"

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

	folder := fmt.Sprintf("audio/%d", userID)
	result, err := media.UploadFile(c.Request.Context(), file, header, folder)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "upload failed", "code": "upload_error"})
		return
	}

	entry := models.Log{
		UserID:       userID,
		Type:         "audio",
		Status:       "processing",
		RawFileURL:   result.URL,
		HabitMatches: []string{},
		LoggedAt:     time.Now().UTC(),
	}
	if err := database.DB.Create(&entry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create log", "code": "db_error"})
		return
	}

	processing.Enqueue(processing.ProcessingJob{
		LogID:   entry.ID,
		LogType: "audio",
		FileURL: result.URL,
		UserID:  userID,
	})

	c.JSON(http.StatusAccepted, gin.H{
		"id":         entry.ID,
		"type":       entry.Type,
		"status":     entry.Status,
		"created_at": entry.CreatedAt,
	})
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

	folder := fmt.Sprintf("images/%d", userID)
	result, err := media.UploadFile(c.Request.Context(), file, header, folder)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "upload failed", "code": "upload_error"})
		return
	}

	entry := models.Log{
		UserID:       userID,
		Type:         "image",
		Status:       "processing",
		RawFileURL:   result.URL,
		HabitMatches: []string{},
		LoggedAt:     time.Now().UTC(),
	}
	if err := database.DB.Create(&entry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create log", "code": "db_error"})
		return
	}

	processing.Enqueue(processing.ProcessingJob{
		LogID:   entry.ID,
		LogType: "image",
		FileURL: result.URL,
		UserID:  userID,
	})

	c.JSON(http.StatusAccepted, gin.H{
		"id":         entry.ID,
		"type":       entry.Type,
		"status":     entry.Status,
		"created_at": entry.CreatedAt,
	})
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
