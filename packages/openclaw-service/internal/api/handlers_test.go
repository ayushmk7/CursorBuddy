package api_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/cursorbuddy/openclaw-service/internal/api"
	"github.com/cursorbuddy/openclaw-service/internal/config"
	"github.com/cursorbuddy/openclaw-service/internal/session"
)

func TestHealth(t *testing.T) {
	h := api.NewHandler(&config.Config{
		Listen:                "127.0.0.1:9090",
		PublicHost:            "127.0.0.1:9090",
		OpenAIAPIKey:          "OPENAI_API_KEY_PLACEHOLDER",
		RealtimeModel:         "gpt-realtime",
		ServiceToken:          "CHANGE_ME_OPENCLAW_SERVICE_TOKEN",
		DefaultVoice:          "alloy",
		SessionTimeoutMinutes: 30,
		LogLevel:              "info",
		Version:               "dev",
	}, session.NewManager())
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	w := httptest.NewRecorder()
	h.Health(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("got %d want 200", w.Code)
	}
}
