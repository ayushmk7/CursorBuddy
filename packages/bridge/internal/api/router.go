package api

import (
	"net/http"
	"time"

	"github.com/cursorbuddy/bridge/internal/auth"
	"github.com/cursorbuddy/bridge/internal/proxy"
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
	p := proxy.New(proxy.Config{IdleTimeout: 120 * time.Second})

	// Public
	r.Get("/v1/healthz", h.Health)

	// Protected REST
	r.Group(func(r chi.Router) {
		r.Use(bearer)
		r.Get("/v1/policy", h.Policy)
		r.Post("/v1/sessions", h.CreateSession)
		r.Post("/v1/sessions/{sessionId}/telemetry", h.Telemetry)
		r.Post("/v1/auth/refresh", h.AuthRefresh)
	})

	// WebSocket stream proxy (authenticated via Bearer)
	r.Group(func(r chi.Router) {
		r.Use(bearer)
		r.Get("/v1/stream/{sessionId}", func(w http.ResponseWriter, r *http.Request) {
			sessionID := chi.URLParam(r, "sessionId")
			claims := auth.ClaimsFromContext(r.Context())
			if claims == nil || claims.Sub != sessionID {
				http.Error(w, `{"error":"session mismatch","code":"E_AUTH"}`, http.StatusUnauthorized)
				return
			}
			upstreamURL := h.cfg.OpenClawUpstreamURL + "/sessions/" + sessionID
			p.ServeWS(w, r, upstreamURL, http.Header{
				"Authorization": []string{"Bearer " + h.cfg.OpenClawServiceToken},
			})
		})
	})

	return r
}
