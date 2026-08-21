package ratelimit

import (
	"sync"
	"time"
)

// TokenBucket implements a simple thread-safe rate limiter using the
// token bucket algorithm. Tokens refill continuously at rate tokens/sec,
// up to the configured capacity.
type TokenBucket struct {
	mu         sync.Mutex
	capacity   float64
	tokens     float64
	refillRate float64
	lastRefill time.Time
}

func NewTokenBucket(capacity, refillRate float64) *TokenBucket {
	return &TokenBucket{
		capacity:   capacity,
		tokens:     capacity,
		refillRate: refillRate,
		lastRefill: time.Now(),
	}
}

func (b *TokenBucket) Allow() bool {
	return b.AllowN(1)
}

func (b *TokenBucket) AllowN(n float64) bool {
	b.mu.Lock()
	defer b.mu.Unlock()

	b.refill()
	if b.tokens < n {
		return false
	}
	b.tokens -= n
	return true
}

func (b *TokenBucket) refill() {
	now := time.Now()
	elapsed := now.Sub(b.lastRefill).Seconds()
	if elapsed <= 0 {
		return
	}
	b.tokens = min(b.capacity, b.tokens+elapsed*b.refillRate)
	b.lastRefill = now
}

func min(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

// Wait blocks until a token is available or the context deadline passes.
func (b *TokenBucket) Wait(timeout time.Duration) bool {
	deadline := time.Now().Add(timeout)
	for {
		if b.Allow() {
			return true
		}
		if time.Now().After(deadline) {
			return false
		}
		time.Sleep(5 * time.Millisecond)
	}
}
