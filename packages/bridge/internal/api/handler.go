package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/cursorbuddy/bridge/internal/auth"
	"github.com/cursorbuddy/bridge/internal/config"
	"github.com/cursorbuddy/bridge/internal/dlp"
	"github.com/cursorbuddy/bridge/internal/ratelimit"
	"github.com/google/uuid"
)

// Handler holds all HTTP handler methods for the bridge.
type Handler struct {
	cfg       *config.Config
	validator *auth.Validator
	limiter   *ratelimit.Bucket
}

// NewHandler constructs a Handler from config.
func NewHandler(cfg *config.Config) *Handler {
	return &Handler{
		cfg:       cfg,
		validator: auth.NewValidator(cfg.JWTSecret, cfg.JWTIssuer),
		limiter: ratelimit.NewBucket(newMemoryRateLimitStore(), ratelimit.Config{
			BurstPerMinute: 5,
			SustainPerHour: 30,
		}),
	}
}

// Validator returns the JWT validator (used by middleware wiring in router).
func (h *Handler) Validator() *auth.Validator {
	return h.validator
}

// Health handles GET /v1/healthz — no auth required.
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"ok":                 true,
		"version":            h.cfg.Version,
		"upstream_configured": h.cfg.OpenClawUpstreamURL != "",
	})
}

// Policy handles GET /v1/policy — returns org-level policy to the sidecar.
func (h *Handler) Policy(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"vision_allowed":          false,
		"command_alias_overrides": map[string]interface{}{},
		"dlp_rules_version":       "0.4.0",
	})
}

// CreateSession handles POST /v1/sessions — mints a proxied upstream connection.
func (h *Handler) CreateSession(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req SessionMintRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", err.Error())
		return
	}

	if req.Client.VSCodeVersion == "" || req.Locale == "" || req.OpenClawWorkflow == "" {
		writeError(w, http.StatusBadRequest, "missing_fields", "client, openclaw_workflow, and locale are required")
		return
	}
	claims := auth.ClaimsFromContext(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "E_AUTH", "no claims in context")
		return
	}
	if allowed, err := h.limiter.Allow(r.Context(), "user:"+claims.Sub, ratelimit.WindowMinute); err != nil {
		writeError(w, http.StatusTooManyRequests, "rate_limit_error", "session mint limiter unavailable")
		return
	} else if !allowed {
		writeError(w, http.StatusTooManyRequests, "rate_limited", "session mint rate limit exceeded")
		return
	}

	sessionID := uuid.NewString()
	expiresAt := time.Now().UTC().Add(time.Duration(h.cfg.MaxSessionMinutes) * time.Minute)

	// 5-minute buffer over MaxSessionMinutes for clock-skew tolerance
	ephemeralTTL := time.Duration(h.cfg.MaxSessionMinutes)*time.Minute + 5*time.Minute
	ephemeralToken, err := auth.MintToken(h.cfg.JWTSecret, h.cfg.JWTIssuer, sessionID, "bridge", ephemeralTTL)
	if err != nil {
		slog.Error("failed to mint ephemeral token", "err", err)
		writeError(w, http.StatusInternalServerError, "token_error", "could not mint session token")
		return
	}

	resp := SessionMintResponse{
		SessionID: sessionID,
		Upstream: UpstreamWebsocket{
			Type: "websocket",
			URL:  fmt.Sprintf("%s://%s/v1/stream/%s", bridgeScheme(h.cfg.PublicHost), h.cfg.PublicHost, sessionID),
			Headers: map[string]string{
				"Authorization": "Bearer " + ephemeralToken,
			},
		},
		ExpiresAt: expiresAt,
		Policy: SessionPolicy{
			VisionAllowed:     false,
			MaxSessionMinutes: h.cfg.MaxSessionMinutes,
			FallbackMode:      "none",
		},
	}

	slog.Info("session created", "session_id", sessionID, "workflow", req.OpenClawWorkflow)
	writeJSON(w, http.StatusCreated, resp)
}

// Telemetry handles POST /v1/sessions/{sessionId}/telemetry.
func (h *Handler) Telemetry(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var batch TelemetryBatch
	if err := json.NewDecoder(r.Body).Decode(&batch); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", err.Error())
		return
	}
	if len(batch.Events) > 500 {
		writeError(w, http.StatusBadRequest, "too_many_events", "max 500 events per batch")
		return
	}
	sanitized := sanitizeTelemetryBatch(batch)
	slog.Info("telemetry received", "session_id", sanitized.SessionID, "events", len(sanitized.Events))
	w.WriteHeader(http.StatusNoContent)
}

// AuthRefresh handles POST /v1/auth/refresh — issues a new short-lived token.
func (h *Handler) AuthRefresh(w http.ResponseWriter, r *http.Request) {
	claims := auth.ClaimsFromContext(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "E_AUTH", "no claims in context")
		return
	}
	const ttl = 60 * time.Minute
	newToken, err := auth.MintToken(h.cfg.JWTSecret, h.cfg.JWTIssuer, claims.Sub, claims.Org, ttl)
	if err != nil {
		slog.Error("failed to mint refresh token", "err", err)
		writeError(w, http.StatusInternalServerError, "token_error", "could not mint refresh token")
		return
	}
	writeJSON(w, http.StatusOK, AuthRefreshResponse{
		AccessToken: newToken,
		ExpiresIn:   int(ttl.Seconds()),
	})
}

// ─── helpers ─────────────────────────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, code int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("writeJSON encode", "err", err)
	}
}

func writeError(w http.ResponseWriter, code int, errCode, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(ErrorResponse{Error: msg, Code: errCode})
}

func bridgeScheme(publicHost string) string {
	host := strings.ToLower(publicHost)
	if strings.HasPrefix(host, "127.0.0.1") || strings.HasPrefix(host, "localhost") {
		return "ws"
	}
	return "wss"
}

func sanitizeTelemetryBatch(batch TelemetryBatch) TelemetryBatch {
	sanitized := batch
	sanitized.SessionID = dlp.Redact(batch.SessionID)
	sanitized.Events = make([]TelemetryEvent, len(batch.Events))
	for i, event := range batch.Events {
		sanitizedEvent := event
		sanitizedEvent.Name = dlp.Redact(event.Name)
		if event.UtteranceID != "" {
			sanitizedEvent.UtteranceID = dlp.Redact(event.UtteranceID)
		}
		if event.ActionID != "" {
			sanitizedEvent.ActionID = dlp.Redact(event.ActionID)
		}
		if len(event.Attrs) > 0 {
			sanitizedEvent.Attrs = make(map[string]interface{}, len(event.Attrs))
			for k, v := range event.Attrs {
				if s, ok := v.(string); ok {
					sanitizedEvent.Attrs[k] = dlp.Redact(s)
				} else {
					sanitizedEvent.Attrs[k] = v
				}
			}
		}
		sanitized.Events[i] = sanitizedEvent
	}
	return sanitized
}

type memoryRateLimitStore struct {
	mu     sync.Mutex
	counts map[string]int64
}

func newMemoryRateLimitStore() *memoryRateLimitStore {
	return &memoryRateLimitStore{counts: make(map[string]int64)}
}

func (m *memoryRateLimitStore) Increment(ctx context.Context, key string) (int64, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.counts[key]++
	return m.counts[key], nil
}

func (m *memoryRateLimitStore) TTL(ctx context.Context, key string, windowSecs int) error {
	return nil
}
