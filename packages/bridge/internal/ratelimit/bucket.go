package ratelimit

import (
	"context"
	"fmt"
)

// Window identifies which time window to check.
type Window string

const (
	WindowMinute Window = "min"
	WindowHour   Window = "hr"
)

// Config defines rate limit thresholds.
type Config struct {
	BurstPerMinute int // Max requests per minute per key
	SustainPerHour int // Max requests per hour per key
}

// Store is a minimal interface for atomic counters (Redis INCR / in-memory for tests).
type Store interface {
	Increment(ctx context.Context, key string) (int64, error)
	TTL(ctx context.Context, key string, windowSecs int) error
}

// Bucket implements a simple counter-based rate limiter.
type Bucket struct {
	store Store
	cfg   Config
}

// NewBucket creates a rate limiter backed by the given Store.
func NewBucket(store Store, cfg Config) *Bucket {
	return &Bucket{store: store, cfg: cfg}
}

// Allow returns true if the key has not exceeded the limit for the given window.
// key should be e.g. "user:alice:min:2026040912" (caller constructs time suffix).
// For test simplicity, this implementation just uses the key as-is and checks count.
func (b *Bucket) Allow(ctx context.Context, key string, w Window) (bool, error) {
	windowSecs := 60
	limit := b.cfg.BurstPerMinute
	if w == WindowHour {
		windowSecs = 3600
		limit = b.cfg.SustainPerHour
	}

	storageKey := fmt.Sprintf("wg:rl:%s:%s", key, w)
	count, err := b.store.Increment(ctx, storageKey)
	if err != nil {
		// Fail closed: deny on store error
		return false, err
	}
	if err := b.store.TTL(ctx, storageKey, windowSecs); err != nil {
		return false, err
	}
	return count <= int64(limit), nil
}
