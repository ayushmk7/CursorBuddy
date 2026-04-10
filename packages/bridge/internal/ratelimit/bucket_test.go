package ratelimit_test

import (
	"context"
	"testing"

	"github.com/cursorbuddy/bridge/internal/ratelimit"
)

// memStore is an in-memory store for testing without Redis.
type memStore struct {
	counts map[string]int64
}

func newMemStore() *memStore { return &memStore{counts: make(map[string]int64)} }

func (m *memStore) Increment(ctx context.Context, key string) (int64, error) {
	m.counts[key]++
	return m.counts[key], nil
}

func (m *memStore) TTL(ctx context.Context, key string, windowSecs int) error {
	return nil // no-op for tests
}

func TestBucket_Allow(t *testing.T) {
	store := newMemStore()
	b := ratelimit.NewBucket(store, ratelimit.Config{
		BurstPerMinute: 3,
		SustainPerHour: 10,
	})

	ctx := context.Background()

	// First 3 requests within burst should be allowed
	for i := 0; i < 3; i++ {
		ok, err := b.Allow(ctx, "user:alice", ratelimit.WindowMinute)
		if err != nil {
			t.Fatalf("Allow error: %v", err)
		}
		if !ok {
			t.Errorf("request %d: expected allowed", i+1)
		}
	}

	// 4th request exceeds burst
	ok, err := b.Allow(ctx, "user:alice", ratelimit.WindowMinute)
	if err != nil {
		t.Fatalf("Allow error: %v", err)
	}
	if ok {
		t.Error("4th request should be denied (exceeds burst)")
	}
}

func TestBucket_DifferentKeys_Independent(t *testing.T) {
	store := newMemStore()
	b := ratelimit.NewBucket(store, ratelimit.Config{BurstPerMinute: 2, SustainPerHour: 10})
	ctx := context.Background()

	// alice uses 2
	b.Allow(ctx, "user:alice", ratelimit.WindowMinute)
	b.Allow(ctx, "user:alice", ratelimit.WindowMinute)

	// bob should still have full allowance
	ok, _ := b.Allow(ctx, "user:bob", ratelimit.WindowMinute)
	if !ok {
		t.Error("bob should be allowed (different key)")
	}
}
