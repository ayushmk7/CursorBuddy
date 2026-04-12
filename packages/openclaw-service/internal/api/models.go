package api

type SessionReady struct {
	Type      string `json:"type"`
	SessionID string `json:"session_id"`
}

type AssistantError struct {
	Type    string `json:"type"`
	Code    string `json:"code"`
	Message string `json:"message"`
}
