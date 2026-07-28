// Package ratelimit provides a small process-local sliding-window limiter.
// Fine for a single Railway replica sandbox; not shared across multiple processes.
package ratelimit

import (
	"net/http"
	"strings"
	"sync"
	"time"
)

// Limiter tracks request timestamps per key inside a fixed window.
type Limiter struct {
	mu       sync.Mutex
	events   map[string][]time.Time
	limit    int
	window   time.Duration
	clockNow func() time.Time
}

// NewLimiter allows `limit` events per `window` for each distinct key.
func NewLimiter(limit int, window time.Duration) *Limiter {
	return &Limiter{
		events:   make(map[string][]time.Time),
		limit:    limit,
		window:   window,
		clockNow: time.Now,
	}
}

// Allow records an event for key when under the limit. Returns false when blocked.
func (limiter *Limiter) Allow(key string) bool {
	limiter.mu.Lock()
	defer limiter.mu.Unlock()

	now := limiter.clockNow()
	cutoff := now.Add(-limiter.window)
	pruned := limiter.events[key][:0]
	for _, stampedAt := range limiter.events[key] {
		if stampedAt.After(cutoff) {
			pruned = append(pruned, stampedAt)
		}
	}

	if len(pruned) >= limiter.limit {
		limiter.events[key] = pruned
		return false
	}

	limiter.events[key] = append(pruned, now)
	return true
}

// CooldownGate allows at most one success per key inside cooldown.
type CooldownGate struct {
	mu         sync.Mutex
	lastPassAt map[string]time.Time
	cooldown   time.Duration
	clockNow   func() time.Time
}

// NewCooldownGate creates a per-key cooldown (e.g. one sync per hour).
func NewCooldownGate(cooldown time.Duration) *CooldownGate {
	return &CooldownGate{
		lastPassAt: make(map[string]time.Time),
		cooldown:   cooldown,
		clockNow:   time.Now,
	}
}

// Remaining reports whether key is still inside cooldown without recording a pass.
func (gate *CooldownGate) Remaining(key string) (blocked bool, retryAfter time.Duration) {
	gate.mu.Lock()
	defer gate.mu.Unlock()

	now := gate.clockNow()
	if previous, exists := gate.lastPassAt[key]; exists {
		elapsed := now.Sub(previous)
		if elapsed < gate.cooldown {
			return true, gate.cooldown - elapsed
		}
	}
	return false, 0
}

// Mark records a successful pass for key (starts the cooldown window).
func (gate *CooldownGate) Mark(key string) {
	gate.mu.Lock()
	defer gate.mu.Unlock()
	gate.lastPassAt[key] = gate.clockNow()
}

// Middleware rejects with 429 when the limiter blocks the resolved key.
func Middleware(limiter *Limiter, keyFn func(*http.Request) string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(responseWriter http.ResponseWriter, request *http.Request) {
			key := keyFn(request)
			if key == "" {
				key = "unknown"
			}
			if !limiter.Allow(key) {
				responseWriter.Header().Set("Content-Type", "application/json")
				responseWriter.Header().Set("Retry-After", "60")
				responseWriter.WriteHeader(http.StatusTooManyRequests)
				_, _ = responseWriter.Write([]byte(`{"error":"rate limit exceeded, try again shortly"}`))
				return
			}
			next.ServeHTTP(responseWriter, request)
		})
	}
}

// ClientIP prefers X-Real-IP / X-Forwarded-For left-most hop, then RemoteAddr.
func ClientIP(request *http.Request) string {
	if realIP := strings.TrimSpace(request.Header.Get("X-Real-IP")); realIP != "" {
		return realIP
	}
	if forwarded := strings.TrimSpace(request.Header.Get("X-Forwarded-For")); forwarded != "" {
		parts := strings.Split(forwarded, ",")
		return strings.TrimSpace(parts[0])
	}
	host := request.RemoteAddr
	if colon := strings.LastIndex(host, ":"); colon >= 0 {
		return host[:colon]
	}
	return host
}
