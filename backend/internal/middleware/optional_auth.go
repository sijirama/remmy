package middleware

import (
	"strings"

	"remmy/internal/utils/jwt"

	"github.com/gin-gonic/gin"
)

func OptionalAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		var tokenString string

		authHeader := c.GetHeader("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		}

		if tokenString == "" {
			tokenString, _ = c.Cookie("auth_token")
		}

		if tokenString != "" {
			userID, err := jwt.ValidateToken(tokenString)
			if err == nil {
				c.Set("userID", userID)
			}
		}

		c.Next()
	}
}
