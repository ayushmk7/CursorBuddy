package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

// Config holds all bridge runtime configuration loaded from environment variables.
type Config struct {
	Listen               string // BRIDGE_LISTEN, default 127.0.0.1:8787
	PublicHost           string // BRIDGE_PUBLIC_HOST; used for WSS URL construction; defaults to Listen
	OpenClawUpstreamURL  string // OPENCLAW_UPSTREAM_URL, required
	OpenClawServiceToken string // OPENCLAW_SERVICE_TOKEN, required
	RedisURL             string // REDIS_URL, default redis://localhost:6379
	JWTIssuer            string // JWT_ISSUER, required
	JWTSecret            string // JWT_SECRET, required for HS256 dev mode
	LogLevel             string // LOG_LEVEL, default info
	Version              string // injected at build time via -ldflags
	MaxSessionMinutes    int    // MAX_SESSION_MINUTES, default 30
}

// Load reads configuration from environment variables.
// Returns an error listing all missing required variables.
func Load() (*Config, error) {
	c := &Config{
		Listen:            getEnvOrDefault("BRIDGE_LISTEN", "127.0.0.1:8787"),
		RedisURL:          getEnvOrDefault("REDIS_URL", "redis://localhost:6379"),
		LogLevel:          getEnvOrDefault("LOG_LEVEL", "info"),
		MaxSessionMinutes: getEnvIntOrDefault("MAX_SESSION_MINUTES", 30),
		Version:           getEnvOrDefault("BRIDGE_VERSION", "dev"),
	}
	c.PublicHost = getEnvOrDefault("BRIDGE_PUBLIC_HOST", c.Listen)

	var missing []string
	c.OpenClawUpstreamURL = strings.TrimRight(os.Getenv("OPENCLAW_UPSTREAM_URL"), "/")
	if c.OpenClawUpstreamURL == "" {
		missing = append(missing, "OPENCLAW_UPSTREAM_URL")
	}
	c.OpenClawServiceToken = os.Getenv("OPENCLAW_SERVICE_TOKEN")
	if c.OpenClawServiceToken == "" {
		missing = append(missing, "OPENCLAW_SERVICE_TOKEN")
	}
	c.JWTIssuer = os.Getenv("JWT_ISSUER")
	if c.JWTIssuer == "" {
		missing = append(missing, "JWT_ISSUER")
	}
	c.JWTSecret = os.Getenv("JWT_SECRET")
	if c.JWTSecret == "" {
		missing = append(missing, "JWT_SECRET")
	}

	if len(missing) > 0 {
		return nil, fmt.Errorf("missing required env vars: %v", missing)
	}
	return c, nil
}

func getEnvOrDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func getEnvIntOrDefault(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}
