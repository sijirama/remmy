package database

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/redis/go-redis/v9"
)

var Redis *redis.Client

func InitializeRedis() {
	var opts *redis.Options
	var displayAddr string

	if redisURL := os.Getenv("REDIS_URL"); redisURL != "" {
		parsed, err := redis.ParseURL(redisURL)
		if err != nil {
			log.Fatalf("[Remmy] Invalid REDIS_URL: %v", err)
		}
		opts = parsed
		displayAddr = opts.Addr
	} else {
		host := os.Getenv("REDIS_HOST")
		port := os.Getenv("REDIS_PORT")
		password := os.Getenv("REDIS_PASSWORD")
		if host == "" {
			host = "localhost"
		}
		if port == "" {
			port = "6379"
		}
		displayAddr = fmt.Sprintf("%s:%s", host, port)
		opts = &redis.Options{
			Addr:     displayAddr,
			Password: password,
			DB:       0,
		}
	}

	Redis = redis.NewClient(opts)

	ctx := context.Background()
	if _, err := Redis.Ping(ctx).Result(); err != nil {
		log.Fatalf("[Remmy] Failed to connect to Redis at %s — %v", displayAddr, err)
	}

	log.Printf("[Remmy] Redis connected at %s", displayAddr)
}
