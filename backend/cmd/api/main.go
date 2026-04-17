package main

import (
	"log"
	"os"
	"strings"
	"time"

	"remmy/internal/database"
	"remmy/internal/endpoints"
	"remmy/internal/initializers"
	"remmy/internal/middleware"
	"remmy/internal/services/ai"
	"remmy/internal/services/media"
	"remmy/internal/services/processing"
	"remmy/internal/utils/jwt"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func buildAllowedOrigins() map[string]struct{} {
	origins := map[string]struct{}{
		"http://localhost:5173": {},
		"http://localhost:5174": {},
		"http://localhost:5175": {},
		"http://localhost:5176": {},
	}
	if extra := os.Getenv("ALLOWED_ORIGINS"); extra != "" {
		for _, o := range strings.Split(extra, ",") {
			o = strings.TrimSpace(o)
			if o != "" {
				origins[o] = struct{}{}
			}
		}
	}
	return origins
}

func main() {
	initializers.InitializeEnv()
	database.InitializeDatabase()
	database.InitializeRedis()
	initializers.InitGothic()
	jwt.InitJWT()
	ai.InitGemini()
	processing.InitWorkers(3)

	if err := media.InitializeR2(); err != nil {
		log.Printf("[Warning] R2 not initialized: %v", err)
		log.Println("[Warning] File upload features will be unavailable")
	}

	r := gin.Default()

	allowedOrigins := buildAllowedOrigins()
	config := cors.DefaultConfig()
	config.AllowOriginFunc = func(origin string) bool {
		_, ok := allowedOrigins[origin]
		return ok
	}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"}
	config.AllowCredentials = true
	config.MaxAge = 12 * time.Hour

	r.Use(cors.New(config))

	// ── Auth Routes ──
	auth := r.Group("/auth")
	{
		auth.GET("/:provider", endpoints.AuthGoogle)
		auth.GET("/:provider/callback", endpoints.AuthGoogleCallback)
		auth.POST("/logout", endpoints.AuthLogout)

		protected := auth.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.GET("/me", endpoints.AuthMe)
			protected.POST("/onboard", endpoints.AuthOnboard)
		}
	}

	api := r.Group("/api")
	{
		// ── Auth ──
		apiAuth := api.Group("/auth")
		{
			apiAuth.GET("/me", middleware.AuthMiddleware(), endpoints.AuthMe)
			apiAuth.GET("/token", middleware.AuthMiddleware(), endpoints.AuthToken)
			apiAuth.POST("/onboard", middleware.AuthMiddleware(), endpoints.AuthOnboard)
			apiAuth.POST("/logout", endpoints.AuthLogout)
			apiAuth.PUT("/profile", middleware.AuthMiddleware(), endpoints.UpdateProfile)
			apiAuth.GET("/check-username", middleware.OptionalAuthMiddleware(), endpoints.CheckUsername)
		}

		// ── Logs ──
		logs := api.Group("/v1/logs")
		logs.Use(middleware.AuthMiddleware())
		{
			logs.POST("/audio", endpoints.UploadAudioLog)
			logs.POST("/image", endpoints.UploadImageLog)
			logs.GET("", endpoints.GetLogs)
			logs.GET("/:id", endpoints.GetLogByID)
		}

		// ── Chat ──
		api.POST("/v1/chat", middleware.AuthMiddleware(), endpoints.Chat)

		// ── Health ──
		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok"})
		})
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("[Remmy] Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
