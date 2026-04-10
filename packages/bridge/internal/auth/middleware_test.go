package auth_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/cursorbuddy/bridge/internal/auth"
)

func TestBearerMiddleware(t *testing.T) {
	v := auth.NewValidator(testSecret)

	handler := auth.BearerMiddleware(v)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := auth.ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "no claims", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(claims.Sub))
	}))

	t.Run("passes valid bearer token", func(t *testing.T) {
		token, _ := auth.MintToken(testSecret, "user-99", "acme", 5*time.Minute)
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Errorf("got %d want 200", w.Code)
		}
		if w.Body.String() != "user-99" {
			t.Errorf("body = %q want user-99", w.Body.String())
		}
	})

	t.Run("rejects missing header", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, req)
		if w.Code != http.StatusUnauthorized {
			t.Errorf("got %d want 401", w.Code)
		}
	})

	t.Run("rejects expired token", func(t *testing.T) {
		token, _ := auth.MintToken(testSecret, "user-100", "acme", -1*time.Minute)
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, req)
		if w.Code != http.StatusUnauthorized {
			t.Errorf("got %d want 401", w.Code)
		}
	})
}
