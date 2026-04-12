package api

import (
	"encoding/json"
	"net/http"

	"github.com/cursorbuddy/openclaw-service/internal/config"
	"github.com/cursorbuddy/openclaw-service/internal/session"
)

type Handler struct {
	cfg     *config.Config
	manager *session.Manager
}

func NewHandler(cfg *config.Config, manager *session.Manager) *Handler {
	return &Handler{cfg: cfg, manager: manager}
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":      true,
		"version": h.cfg.Version,
		"model":   h.cfg.RealtimeModel,
	})
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}
