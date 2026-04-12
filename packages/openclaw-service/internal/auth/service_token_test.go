package auth_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	authpkg "github.com/cursorbuddy/openclaw-service/internal/auth"
)

func TestValidateServiceToken(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/sessions/test", nil)
	req.Header.Set("Authorization", "Bearer CHANGE_ME_OPENCLAW_SERVICE_TOKEN")
	if err := authpkg.ValidateServiceToken(req, "CHANGE_ME_OPENCLAW_SERVICE_TOKEN"); err != nil {
		t.Fatalf("ValidateServiceToken() error: %v", err)
	}
}

func TestValidateServiceToken_RejectsMissing(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/sessions/test", nil)
	if err := authpkg.ValidateServiceToken(req, "CHANGE_ME_OPENCLAW_SERVICE_TOKEN"); err == nil {
		t.Fatal("expected missing token error")
	}
}
