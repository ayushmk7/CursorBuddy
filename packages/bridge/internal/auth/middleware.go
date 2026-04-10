package auth

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
)

type contextKey string

const claimsKey contextKey = "claims"

// BearerMiddleware extracts and validates the Authorization: Bearer <token> header.
// Responds 401 on missing or invalid token. Stores Claims in request context.
func BearerMiddleware(v *Validator) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if !strings.HasPrefix(header, "Bearer ") {
				writeUnauthorized(w, "missing bearer token")
				return
			}
			tokenStr := strings.TrimPrefix(header, "Bearer ")
			claims, err := v.Validate(tokenStr)
			if err != nil {
				slog.Error("token validation failed", "err", err)
				writeUnauthorized(w, "invalid token")
				return
			}
			ctx := context.WithValue(r.Context(), claimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// ClaimsFromContext retrieves Claims stored by BearerMiddleware.
// Returns nil if not present.
func ClaimsFromContext(ctx context.Context) *Claims {
	c, _ := ctx.Value(claimsKey).(*Claims)
	return c
}

// ContextWithClaims stores Claims in a context. Used by tests to inject claims directly.
func ContextWithClaims(ctx context.Context, c *Claims) context.Context {
	return context.WithValue(ctx, claimsKey, c)
}

func writeUnauthorized(w http.ResponseWriter, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	b, _ := json.Marshal(map[string]string{"error": msg, "code": "E_AUTH"})
	w.Write(b)
}
