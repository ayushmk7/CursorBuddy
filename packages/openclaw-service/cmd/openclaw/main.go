package main

import (
	"log/slog"
	"net/http"
	"os"

	"github.com/cursorbuddy/openclaw-service/internal/api"
	"github.com/cursorbuddy/openclaw-service/internal/config"
	"github.com/cursorbuddy/openclaw-service/internal/session"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("config error", "err", err)
		os.Exit(1)
	}
	handler := api.NewHandler(cfg, session.NewManager())
	if err := http.ListenAndServe(cfg.Listen, api.NewRouter(handler)); err != nil {
		slog.Error("server error", "err", err)
		os.Exit(1)
	}
}
