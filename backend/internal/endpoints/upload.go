package endpoints

import (
	"net/http"

	"remmy/internal/services/media"

	"github.com/gin-gonic/gin"
)

func UploadAvatar(c *gin.Context) {
	if !media.IsR2Available() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "File upload not configured"})
		return
	}

	file, header, err := c.Request.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file provided"})
		return
	}
	defer file.Close()

	result, err := media.UploadFile(c.Request.Context(), file, header, "avatars")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Upload failed"})
		return
	}

	c.JSON(http.StatusOK, result)
}

func UploadMedia(c *gin.Context) {
	if !media.IsR2Available() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "File upload not configured"})
		return
	}

	file, header, err := c.Request.FormFile("media")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file provided"})
		return
	}
	defer file.Close()

	result, err := media.UploadFile(c.Request.Context(), file, header, "media")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Upload failed"})
		return
	}

	c.JSON(http.StatusOK, result)
}
