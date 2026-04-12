package auth

import (
	"fmt"
	"net/http"
	"strings"
)

func ValidateServiceToken(r *http.Request, expected string) error {
	header := r.Header.Get("Authorization")
	if !strings.HasPrefix(header, "Bearer ") {
		return fmt.Errorf("missing bearer token")
	}
	if strings.TrimPrefix(header, "Bearer ") != expected {
		return fmt.Errorf("invalid service token")
	}
	return nil
}
