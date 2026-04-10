package api

import (
	"net/http"

	"github.com/cursorbuddy/bridge/internal/auth"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// NewRouter wires all routes and middleware for the bridge.
func NewRouter(h *Handler) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)

	bearer := auth.BearerMiddleware(h.Validator())

	// Public
	r.Get("/v1/healthz", h.Health)

	// Protected
	r.Group(func(r chi.Router) {
		r.Use(bearer)
		r.Get("/v1/policy", h.Policy)
		r.Post("/v1/sessions", h.CreateSession)
		r.Post("/v1/sessions/{sessionId}/telemetry", h.Telemetry)
		r.Post("/v1/auth/refresh", h.AuthRefresh)
	})

	return r
}
