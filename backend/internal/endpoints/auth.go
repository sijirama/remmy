package endpoints

import (
	"net/http"
	"os"

	"remmy/internal/database"
	"remmy/internal/models"
	"remmy/internal/utils/jwt"

	"github.com/gin-gonic/gin"
	"github.com/markbates/goth/gothic"
)

func AuthGoogle(c *gin.Context) {
	provider := c.Param("provider")
	if provider == "" {
		provider = "google"
	}

	q := c.Request.URL.Query()
	q.Set("provider", provider)
	c.Request.URL.RawQuery = q.Encode()

	gothic.BeginAuthHandler(c.Writer, c.Request)
}

func AuthGoogleCallback(c *gin.Context) {
	provider := c.Param("provider")
	if provider == "" {
		provider = "google"
	}

	q := c.Request.URL.Query()
	q.Set("provider", provider)
	c.Request.URL.RawQuery = q.Encode()

	gothUser, err := gothic.CompleteUserAuth(c.Writer, c.Request)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	result := database.DB.Where("google_id = ?", gothUser.UserID).First(&user)

	if result.Error != nil {
		var userCount int64
		database.DB.Model(&models.User{}).Count(&userCount)

		user = models.User{
			GoogleID:       gothUser.UserID,
			Email:          gothUser.Email,
			FirstName:      gothUser.FirstName,
			LastName:       gothUser.LastName,
			ProfilePicture: gothUser.AvatarURL,
		}
		database.DB.Create(&user)
	}

	token, err := jwt.GenerateToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	jwt.SetTokenCookie(c.Writer, token)

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}

	c.Redirect(http.StatusTemporaryRedirect, frontendURL+"/me")
}

func AuthLogout(c *gin.Context) {
	jwt.ClearTokenCookie(c.Writer)
	c.JSON(http.StatusOK, gin.H{"message": "Logged out"})
}

func AuthMe(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func AuthToken(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	token, err := jwt.GenerateToken(userID.(uint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": token})
}

func UpdateProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		Bio            string `json:"bio"`
		ProfilePicture string `json:"profilePicture"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if req.Bio != "" {
		updates["bio"] = req.Bio
	}
	if req.ProfilePicture != "" {
		updates["profile_picture"] = req.ProfilePicture
	}

	if err := database.DB.Model(&models.User{}).Where("id = ?", userID).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	var user models.User
	database.DB.First(&user, userID)
	c.JSON(http.StatusOK, user)
}

