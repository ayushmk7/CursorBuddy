package config_test

import (
	"os"
	"testing"

	"github.com/cursorbuddy/bridge/internal/config"
)

func setEnv(t *testing.T, pairs ...string) {
	t.Helper()
	for i := 0; i < len(pairs); i += 2 {
		t.Setenv(pairs[i], pairs[i+1])
	}
}

func setAllRequired(t *testing.T) {
	t.Helper()
	setEnv(t,
		"OPENCLAW_UPSTREAM_URL", "ws://127.0.0.1:9090",
		"OPENCLAW_SERVICE_TOKEN", "test-token",
		"JWT_ISSUER", "cursorbuddy-bridge",
		"JWT_SECRET", "test-secret-at-least-32-bytes!!!!",
	)
}

func TestLoad_AllRequired(t *testing.T) {
	setAllRequired(t)
	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Load() error: %v", err)
	}
	if cfg.OpenClawUpstreamURL != "ws://127.0.0.1:9090" {
		t.Errorf("OpenClawUpstreamURL = %q", cfg.OpenClawUpstreamURL)
	}
	if cfg.JWTSecret != "test-secret-at-least-32-bytes!!!!" {
		t.Errorf("JWTSecret = %q", cfg.JWTSecret)
	}
}

func TestLoad_Defaults(t *testing.T) {
	setAllRequired(t)
	// Don't set optional vars — should get defaults
	os.Unsetenv("BRIDGE_LISTEN")
	os.Unsetenv("REDIS_URL")
	os.Unsetenv("MAX_SESSION_MINUTES")
	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Load() error: %v", err)
	}
	if cfg.Listen != "127.0.0.1:8787" {
		t.Errorf("Listen = %q want 127.0.0.1:8787", cfg.Listen)
	}
	if cfg.RedisURL != "redis://localhost:6379" {
		t.Errorf("RedisURL = %q want redis://localhost:6379", cfg.RedisURL)
	}
	if cfg.MaxSessionMinutes != 30 {
		t.Errorf("MaxSessionMinutes = %d want 30", cfg.MaxSessionMinutes)
	}
}

func TestLoad_MissingRequired(t *testing.T) {
	// Unset all required vars
	os.Unsetenv("OPENCLAW_UPSTREAM_URL")
	os.Unsetenv("OPENCLAW_SERVICE_TOKEN")
	os.Unsetenv("JWT_ISSUER")
	os.Unsetenv("JWT_SECRET")
	// Set optionals so they don't interfere
	setEnv(t, "BRIDGE_LISTEN", "127.0.0.1:9999")

	_, err := config.Load()
	if err == nil {
		t.Fatal("expected error for missing required vars")
	}
	// Error should mention all 4 missing vars
	errStr := err.Error()
	for _, v := range []string{"OPENCLAW_UPSTREAM_URL", "OPENCLAW_SERVICE_TOKEN", "JWT_ISSUER", "JWT_SECRET"} {
		if !contains(errStr, v) {
			t.Errorf("error %q missing mention of %s", errStr, v)
		}
	}
}

func TestLoad_MissingOneRequired(t *testing.T) {
	setAllRequired(t)
	os.Unsetenv("JWT_SECRET") // remove just one

	_, err := config.Load()
	if err == nil {
		t.Fatal("expected error for missing JWT_SECRET")
	}
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(s) > 0 && containsHelper(s, sub))
}

func containsHelper(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
