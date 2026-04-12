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
const testIssuer = "cursorbuddy-bridge"

func newTestHandler() *api.Handler {
	return api.NewHandler(&config.Config{
		Version:              "test",
		JWTSecret:            testSecret,
		JWTIssuer:            testIssuer,
		OpenClawServiceToken: "service-token",
		OpenClawUpstreamURL:  "wss://openclaw.test",
		MaxSessionMinutes:    30,
		Listen:               "127.0.0.1:8787",
		PublicHost:           "127.0.0.1:8787",
	})
}

func validBearerHeader(t *testing.T) string {
	t.Helper()
	token, err := auth.MintToken(testSecret, testIssuer, "user-1", "acme", 5*time.Minute)
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
	if body["upstream_configured"] != true {
		t.Errorf("upstream_configured = %v want true", body["upstream_configured"])
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
		"openclaw_workflow": "cursorbuddy_session",
		"locale": "en-US"
	}`
	req := httptest.NewRequest(http.MethodPost, "/v1/sessions", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", validBearerHeader(t))
	req = req.WithContext(auth.ContextWithClaims(req.Context(), &auth.Claims{Sub: "user-1", Org: "acme"}))
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
	if resp.Upstream.URL == "" {
		t.Error("upstream.url is empty")
	}
	if !strings.HasPrefix(resp.Upstream.URL, "ws://") {
		t.Errorf("upstream.url = %q; want ws:// prefix", resp.Upstream.URL)
	}
	if resp.Policy.MaxSessionMinutes != 30 {
		t.Errorf("max_session_minutes = %d want 30", resp.Policy.MaxSessionMinutes)
	}
	if resp.Policy.FallbackMode != "none" {
		t.Errorf("fallback_mode = %q want none", resp.Policy.FallbackMode)
	}
	authHeader := resp.Upstream.Headers["Authorization"]
	if authHeader == "" {
		t.Fatal("expected upstream authorization header")
	}
	v := auth.NewValidator(testSecret, testIssuer)
	claims, err := v.Validate(strings.TrimPrefix(authHeader, "Bearer "))
	if err != nil {
		t.Fatalf("Validate(upstream token): %v", err)
	}
	if claims.Sub != resp.SessionID {
		t.Errorf("ephemeral token subject = %q want session id %q", claims.Sub, resp.SessionID)
	}
}

func TestCreateSession_InvalidBody(t *testing.T) {
	h := newTestHandler()
	req := httptest.NewRequest(http.MethodPost, "/v1/sessions", strings.NewReader("not-json"))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", validBearerHeader(t))
	req = req.WithContext(auth.ContextWithClaims(req.Context(), &auth.Claims{Sub: "user-1", Org: "acme"}))
	w := httptest.NewRecorder()
	h.CreateSession(w, req)
	if w.Code != http.StatusBadRequest {
		t.Errorf("got %d want 400", w.Code)
	}
}

func TestCreateSession_RateLimited(t *testing.T) {
	h := newTestHandler()
	body := `{
		"client": {"vscode_version":"1.99.0","extension_version":"0.4.2","os":"darwin","sidecar_version":"0.4.2"},
		"openclaw_workflow": "cursorbuddy_session",
		"locale": "en-US"
	}`
	for i := 0; i < 5; i++ {
		req := httptest.NewRequest(http.MethodPost, "/v1/sessions", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", validBearerHeader(t))
		ctx := auth.ContextWithClaims(req.Context(), &auth.Claims{Sub: "user-1", Org: "acme"})
		req = req.WithContext(ctx)
		w := httptest.NewRecorder()
		h.CreateSession(w, req)
		if w.Code != http.StatusCreated {
			t.Fatalf("request %d got %d want 201", i+1, w.Code)
		}
	}

	req := httptest.NewRequest(http.MethodPost, "/v1/sessions", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", validBearerHeader(t))
	ctx := auth.ContextWithClaims(req.Context(), &auth.Claims{Sub: "user-1", Org: "acme"})
	req = req.WithContext(ctx)
	w := httptest.NewRecorder()
	h.CreateSession(w, req)
	if w.Code != http.StatusTooManyRequests {
		t.Errorf("got %d want 429", w.Code)
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
	v := auth.NewValidator(testSecret, testIssuer)
	token, _ := auth.MintToken(testSecret, testIssuer, "user-1", "acme", 5*time.Minute)
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

	claims, err := v.Validate(resp.AccessToken)
	if err != nil {
		t.Fatalf("Validate(refresh token): %v", err)
	}
	if claims.Sub != "user-1" {
		t.Errorf("refreshed sub = %q want user-1", claims.Sub)
	}
}
