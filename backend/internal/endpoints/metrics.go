package endpoints

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"remmy/internal/database"
	"remmy/internal/models"

	"github.com/gin-gonic/gin"
)

type HeatmapDay struct {
	Date    string  `json:"date"`
	AvgMood float64 `json:"avg_mood"`
	Count   int     `json:"count"`
}

func GetHeatmapData(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	cacheKey := fmt.Sprintf("heatmap:%d", userID)

	// Try cache
	if database.Redis != nil {
		cached, err := database.Redis.Get(c, cacheKey).Result()
		if err == nil {
			var data []HeatmapDay
			if err := json.Unmarshal([]byte(cached), &data); err == nil {
				c.JSON(http.StatusOK, data)
				return
			}
		}
	}

	// Fetch from DB
	// Rolling 12 months
	startDate := time.Now().AddDate(-1, 0, 0)
	
	var results []struct {
		Day     time.Time
		AvgMood float64
		Count   int
	}

	err := database.DB.Model(&models.Log{}).
		Select("DATE(logged_at) as day, AVG(mood_score) as avg_mood, COUNT(*) as count").
		Where("user_id = ? AND logged_at >= ?", userID, startDate).
		Group("DATE(logged_at)").
		Order("day ASC").
		Scan(&results).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch metrics"})
		return
	}

	heatmap := make([]HeatmapDay, len(results))
	for i, r := range results {
		heatmap[i] = HeatmapDay{
			Date:    r.Day.Format("2006-01-02"),
			AvgMood: r.AvgMood,
			Count:   r.Count,
		}
	}

	// Save to cache
	if database.Redis != nil {
		encoded, _ := json.Marshal(heatmap)
		database.Redis.Set(c, cacheKey, encoded, 1*time.Hour)
	}

	c.JSON(http.StatusOK, heatmap)
}
