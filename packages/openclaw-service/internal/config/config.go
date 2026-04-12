package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	Listen                string
	PublicHost            string
	OpenAIAPIKey          string
	RealtimeModel         string
	ServiceToken          string
	DefaultVoice          string
	SessionTimeoutMinutes int
	LogLevel              string
	Version               string
}

func Load() (*Config, error) {
	cfg := &Config{
		LogLevel: getEnvOrDefault("LOG_LEVEL", "info"),
		Version:  getEnvOrDefault("OPENCLAW_VERSION", "dev"),
	}
	var missing []string
	cfg.Listen = os.Getenv("OPENCLAW_LISTEN")
	if cfg.Listen == "" {
		missing = append(missing, "OPENCLAW_LISTEN")
	}
	cfg.PublicHost = os.Getenv("OPENCLAW_PUBLIC_HOST")
	if cfg.PublicHost == "" {
		missing = append(missing, "OPENCLAW_PUBLIC_HOST")
	}
	cfg.OpenAIAPIKey = os.Getenv("OPENAI_API_KEY")
	if cfg.OpenAIAPIKey == "" {
		missing = append(missing, "OPENAI_API_KEY")
	}
	cfg.RealtimeModel = os.Getenv("OPENAI_REALTIME_MODEL")
	if cfg.RealtimeModel == "" {
		missing = append(missing, "OPENAI_REALTIME_MODEL")
	}
	cfg.ServiceToken = os.Getenv("OPENCLAW_SERVICE_TOKEN")
	if cfg.ServiceToken == "" {
		missing = append(missing, "OPENCLAW_SERVICE_TOKEN")
	}
	cfg.DefaultVoice = os.Getenv("OPENCLAW_DEFAULT_VOICE")
	if cfg.DefaultVoice == "" {
		missing = append(missing, "OPENCLAW_DEFAULT_VOICE")
	}
	timeout := os.Getenv("OPENCLAW_SESSION_TIMEOUT_MINUTES")
	if timeout == "" {
		missing = append(missing, "OPENCLAW_SESSION_TIMEOUT_MINUTES")
	} else {
		minutes, err := strconv.Atoi(timeout)
		if err != nil {
			return nil, fmt.Errorf("invalid OPENCLAW_SESSION_TIMEOUT_MINUTES: %w", err)
		}
		cfg.SessionTimeoutMinutes = minutes
	}
	if len(missing) > 0 {
		return nil, fmt.Errorf("missing required env vars: %v", missing)
	}
	return cfg, nil
}

func getEnvOrDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
