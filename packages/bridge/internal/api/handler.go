package api

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/cursorbuddy/bridge/internal/auth"
	"github.com/cursorbuddy/bridge/internal/config"
	"github.com/google/uuid"
)

// Handler holds all HTTP handler methods for the bridge.
type Handler struct {
	cfg       *config.Config
	validator *auth.Validator
}

// NewHandler constructs a Handler from config.
func NewHandler(cfg *config.Config) *Handler {
	return &Handler{
		cfg:       cfg,
		validator: auth.NewValidator(cfg.JWTSecret),
	}
}

// Validator returns the JWT validator (used by middleware wiring in router).
func (h *Handler) Validator() *auth.Validator {
	return h.validator
}

// Health handles GET /v1/healthz — no auth required.
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"ok":      true,
		"version": h.cfg.Version,
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

	sessionID := uuid.NewString()
	expiresAt := time.Now().UTC().Add(time.Duration(h.cfg.MaxSessionMinutes) * time.Minute)

	// 5-minute buffer over MaxSessionMinutes for clock-skew tolerance
	ephemeralTTL := time.Duration(h.cfg.MaxSessionMinutes)*time.Minute + 5*time.Minute
	ephemeralToken, err := auth.MintToken(h.cfg.JWTSecret, sessionID, "bridge", ephemeralTTL)
	if err != nil {
		slog.Error("failed to mint ephemeral token", "err", err)
		writeError(w, http.StatusInternalServerError, "token_error", "could not mint session token")
		return
	}

	resp := SessionMintResponse{
		SessionID: sessionID,
		Upstream: UpstreamWebsocket{
			Type: "websocket",
			URL:  buildUpstreamURL(h.cfg.PublicHost, sessionID),
			Headers: map[string]string{
				"Authorization": "Bearer " + ephemeralToken,
			},
		},
		ExpiresAt: expiresAt,
		Policy: SessionPolicy{
			VisionAllowed:     false,
			MaxSessionMinutes: h.cfg.MaxSessionMinutes,
			FallbackMode:      "rest",
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
	slog.Info("telemetry received", "session_id", batch.SessionID, "events", len(batch.Events))
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
	newToken, err := auth.MintToken(h.cfg.JWTSecret, claims.Sub, claims.Org, ttl)
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

func buildUpstreamURL(publicHost, sessionID string) string {
	normalized := publicHost
	scheme := "wss"
	if strings.HasPrefix(normalized, "http://") {
		normalized = strings.TrimPrefix(normalized, "http://")
		scheme = "ws"
	} else if strings.HasPrefix(normalized, "https://") {
		normalized = strings.TrimPrefix(normalized, "https://")
		scheme = "wss"
	} else if strings.HasPrefix(normalized, "127.0.0.1:") || strings.HasPrefix(normalized, "localhost:") {
		scheme = "ws"
	}
	return fmt.Sprintf("%s://%s/v1/stream/%s", scheme, normalized, sessionID)
}
