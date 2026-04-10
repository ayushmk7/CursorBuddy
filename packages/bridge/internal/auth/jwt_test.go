package auth_test

import (
	"testing"
	"time"

	"github.com/cursorbuddy/bridge/internal/auth"
)

const testSecret = "test-secret-at-least-32-bytes-long!!"

func TestValidator(t *testing.T) {
	v := auth.NewValidator(testSecret)

	t.Run("validates a freshly minted token", func(t *testing.T) {
		token, err := auth.MintToken(testSecret, "user-1", "acme", 10*time.Minute)
		if err != nil {
			t.Fatalf("MintToken error: %v", err)
		}
		claims, err := v.Validate(token)
		if err != nil {
			t.Fatalf("Validate error: %v", err)
		}
		if claims.Sub != "user-1" {
			t.Errorf("got Sub=%q want user-1", claims.Sub)
		}
		if claims.Org != "acme" {
			t.Errorf("got Org=%q want acme", claims.Org)
		}
	})

	t.Run("rejects expired token", func(t *testing.T) {
		token, err := auth.MintToken(testSecret, "user-2", "acme", -1*time.Minute)
		if err != nil {
			t.Fatalf("MintToken error: %v", err)
		}
		_, err = v.Validate(token)
		if err == nil {
			t.Fatal("expected error for expired token")
		}
	})

	t.Run("rejects token signed with wrong secret", func(t *testing.T) {
		token, err := auth.MintToken("wrong-secret-padded-to-32-bytes!!", "user-3", "acme", 10*time.Minute)
		if err != nil {
			t.Fatalf("MintToken error: %v", err)
		}
		_, err = v.Validate(token)
		if err == nil {
			t.Fatal("expected error for wrong secret")
		}
	})

	t.Run("rejects malformed token", func(t *testing.T) {
		_, err := v.Validate("not.a.token")
		if err == nil {
			t.Fatal("expected error for malformed token")
		}
	})
}
