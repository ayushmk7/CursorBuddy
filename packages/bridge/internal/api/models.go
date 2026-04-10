package api

import "time"

// ─── Request models ──────────────────────────────────────────────────────────

// ClientInfo identifies the calling sidecar + extension versions.
type ClientInfo struct {
	VSCodeVersion    string `json:"vscode_version"`
	ExtensionVersion string `json:"extension_version"`
	OS               string `json:"os"`
	SidecarVersion   string `json:"sidecar_version"`
}

// SessionMintRequest is the body for POST /v1/sessions.
type SessionMintRequest struct {
	Client               ClientInfo `json:"client"`
	OpenClawWorkflow     string     `json:"openclaw_workflow"`
	DesiredModelTierHint string     `json:"desired_model_tier_hint,omitempty"`
	Locale               string     `json:"locale"`
}

// TelemetryEvent is a single metric event.
type TelemetryEvent struct {
	TS          time.Time              `json:"ts"`
	Name        string                 `json:"name"`
	UtteranceID string                 `json:"utterance_id,omitempty"`
	ActionID    string                 `json:"action_id,omitempty"`
	LatencyMS   int                    `json:"latency_ms,omitempty"`
	Attrs       map[string]interface{} `json:"attrs,omitempty"`
}

// TelemetryBatch is the body for POST /v1/sessions/{id}/telemetry.
type TelemetryBatch struct {
	SessionID string           `json:"session_id"`
	Events    []TelemetryEvent `json:"events"`
}

// ─── Response models ─────────────────────────────────────────────────────────

// UpstreamWebsocket describes the WSS connection sidecar should dial.
type UpstreamWebsocket struct {
	Type    string            `json:"type"`
	URL     string            `json:"url"`
	Headers map[string]string `json:"headers,omitempty"`
}

// SessionPolicy conveys org-level constraints back to the sidecar.
type SessionPolicy struct {
	VisionAllowed     bool   `json:"vision_allowed"`
	MaxSessionMinutes int    `json:"max_session_minutes"`
	FallbackMode      string `json:"fallback_mode,omitempty"`
}

// SessionMintResponse is returned by POST /v1/sessions.
type SessionMintResponse struct {
	SessionID string            `json:"session_id"`
	Upstream  UpstreamWebsocket `json:"upstream"`
	ExpiresAt time.Time         `json:"expires_at"`
	Policy    SessionPolicy     `json:"policy"`
}

// AuthRefreshResponse is returned by POST /v1/auth/refresh.
type AuthRefreshResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
}

// ─── Error model ─────────────────────────────────────────────────────────────

// ErrorResponse is the standard error body: {"error":"...","code":"...","details":...}
type ErrorResponse struct {
	Error   string      `json:"error"`
	Code    string      `json:"code,omitempty"`
	Details interface{} `json:"details,omitempty"`
}
