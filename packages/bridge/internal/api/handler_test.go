package api_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/cursorbuddy/bridge/internal/api"
	"github.com/cursorbuddy/bridge/internal/auth"
	"github.com/cursorbuddy/bridge/internal/config"
)

const testSecret = "test-secret-at-least-32-bytes-long!!"

func newTestHandler() *api.Handler {
	return api.NewHandler(&config.Config{
		Version:             "test",
		JWTSecret:           testSecret,
		OpenClawUpstreamURL: "wss://openclaw.test",
		MaxSessionMinutes:   30,
	})
}

func validBearerHeader(t *testing.T) string {
	t.Helper()
	token, err := auth.MintToken(testSecret, "user-1", "acme", 5*time.Minute)
	if err != nil {
		t.Fatalf("MintToken: %v", err)
	}
	return "Bearer " + token
}

func TestHealth(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/v1/healthz", nil)
	w := httptest.NewRecorder()
	h.Health(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("got %d want 200", w.Code)
	}
	var body map[string]interface{}
	json.NewDecoder(w.Body).Decode(&body)
	if body["ok"] != true {
		t.Errorf("ok field = %v want true", body["ok"])
	}
}

func TestPolicy(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodGet, "/v1/policy", nil)
	req.Header.Set("Authorization", validBearerHeader(t))
	w := httptest.NewRecorder()
	h.Policy(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("got %d want 200", w.Code)
	}
	var body map[string]interface{}
	json.NewDecoder(w.Body).Decode(&body)
	if body["vision_allowed"] != false {
		t.Errorf("vision_allowed = %v want false", body["vision_allowed"])
	}
}

func TestCreateSession(t *testing.T) {
	h := newTestHandler()
	body := `{
		"client": {"vscode_version":"1.99.0","extension_version":"0.4.2","os":"darwin","sidecar_version":"0.4.2"},
		"openclaw_workflow": "waveclick_session",
		"locale": "en-US"
	}`
	req := httptest.NewRequest(http.MethodPost, "/v1/sessions", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", validBearerHeader(t))
	w := httptest.NewRecorder()
	h.CreateSession(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("got %d want 201; body: %s", w.Code, w.Body.String())
	}
	var resp api.SessionMintResponse
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.SessionID == "" {
		t.Error("session_id is empty")
	}
	if resp.Upstream.Type != "websocket" {
		t.Errorf("upstream.type = %q want websocket", resp.Upstream.Type)
	}
	if resp.Policy.MaxSessionMinutes != 30 {
		t.Errorf("max_session_minutes = %d want 30", resp.Policy.MaxSessionMinutes)
	}
}

func TestCreateSession_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPost, "/v1/sessions", strings.NewReader("not-json"))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", validBearerHeader(t))
	w := httptest.NewRecorder()
	h.CreateSession(w, req)
	if w.Code != http.StatusBadRequest {
		t.Errorf("got %d want 400", w.Code)
	}
}

func TestTelemetry(t *testing.T) {
	h := newTestHandler()
	body := `{"session_id":"11111111-1111-1111-1111-111111111111","events":[{"ts":"2026-04-09T00:00:00Z","name":"executor.command_ok"}]}`
	req := httptest.NewRequest(http.MethodPost, "/v1/sessions/11111111-1111-1111-1111-111111111111/telemetry", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", validBearerHeader(t))
	w := httptest.NewRecorder()
	h.Telemetry(w, req)
	if w.Code != http.StatusNoContent {
		t.Errorf("got %d want 204", w.Code)
	}
}

func TestAuthRefresh(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/refresh", nil)
	req.Header.Set("Authorization", validBearerHeader(t))
	// Inject claims into context as middleware would do
	v := auth.NewValidator(testSecret)
	token, _ := auth.MintToken(testSecret, "user-1", "acme", 5*time.Minute)
	claims, _ := v.Validate(token)
	ctx := auth.ContextWithClaims(req.Context(), claims)
	req = req.WithContext(ctx)
	w := httptest.NewRecorder()
	h.AuthRefresh(w, req)
	if w.Code != http.StatusOK {
		t.Errorf("got %d want 200", w.Code)
	}
	var resp api.AuthRefreshResponse
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.AccessToken == "" {
		t.Error("access_token is empty")
	}
	if resp.ExpiresIn <= 0 {
		t.Errorf("expires_in = %d want > 0", resp.ExpiresIn)
	}
}
