package middleware

import (
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

type limiterEntry struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

type rateLimiterStore struct {
	mu       sync.Mutex
	entries  map[string]*limiterEntry
	rps      rate.Limit
	burst    int
	ttl      time.Duration
	lastGC   time.Time
	gcEvery  time.Duration
}

func newRateLimiterStore(rps rate.Limit, burst int) *rateLimiterStore {
	return &rateLimiterStore{
		entries: make(map[string]*limiterEntry),
		rps:     rps,
		burst:   burst,
		ttl:     15 * time.Minute,
		gcEvery: 5 * time.Minute,
	}
}

func (s *rateLimiterStore) get(key string) *rate.Limiter {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	if now.Sub(s.lastGC) > s.gcEvery {
		for k, e := range s.entries {
			if now.Sub(e.lastSeen) > s.ttl {
				delete(s.entries, k)
			}
		}
		s.lastGC = now
	}

	e, ok := s.entries[key]
	if !ok {
		e = &limiterEntry{limiter: rate.NewLimiter(s.rps, s.burst)}
		s.entries[key] = e
	}
	e.lastSeen = now
	return e.limiter
}

// RateLimit returns a gin middleware that enforces per-user token-bucket limits.
// Keys on userID when AuthMiddleware has run; otherwise falls back to client IP.
func RateLimit(rps rate.Limit, burst int) gin.HandlerFunc {
	store := newRateLimiterStore(rps, burst)
	return func(c *gin.Context) {
		key := "ip:" + c.ClientIP()
		if v, ok := c.Get("userID"); ok {
			if uid, ok := v.(uint); ok {
				key = fmt.Sprintf("u:%d", uid)
			}
		}
		if !store.get(key).Allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "rate limit exceeded, slow down",
				"code":  "rate_limited",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}
