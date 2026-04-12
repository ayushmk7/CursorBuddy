package config_test

import (
	"os"
	"testing"

	"github.com/cursorbuddy/openclaw-service/internal/config"
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
		"OPENCLAW_LISTEN", "127.0.0.1:9090",
		"OPENCLAW_PUBLIC_HOST", "127.0.0.1:9090",
		"OPENAI_API_KEY", "OPENAI_API_KEY_PLACEHOLDER",
		"OPENAI_REALTIME_MODEL", "gpt-realtime",
		"OPENCLAW_SERVICE_TOKEN", "CHANGE_ME_OPENCLAW_SERVICE_TOKEN",
		"OPENCLAW_DEFAULT_VOICE", "alloy",
		"OPENCLAW_SESSION_TIMEOUT_MINUTES", "30",
		"LOG_LEVEL", "info",
		"OPENCLAW_VERSION", "dev",
	)
}

func TestLoad_AllRequired(t *testing.T) {
	setAllRequired(t)
	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Load() error: %v", err)
	}
	if cfg.Listen != "127.0.0.1:9090" {
		t.Errorf("Listen = %q", cfg.Listen)
	}
	if cfg.RealtimeModel != "gpt-realtime" {
		t.Errorf("RealtimeModel = %q", cfg.RealtimeModel)
	}
}

func TestLoad_MissingRequired(t *testing.T) {
	for _, key := range []string{
		"OPENCLAW_LISTEN",
		"OPENCLAW_PUBLIC_HOST",
		"OPENAI_API_KEY",
		"OPENAI_REALTIME_MODEL",
		"OPENCLAW_SERVICE_TOKEN",
		"OPENCLAW_DEFAULT_VOICE",
		"OPENCLAW_SESSION_TIMEOUT_MINUTES",
	} {
		os.Unsetenv(key)
	}
	_, err := config.Load()
	if err == nil {
		t.Fatal("expected missing env error")
	}
}
