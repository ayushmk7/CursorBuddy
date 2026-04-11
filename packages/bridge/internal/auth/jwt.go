package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims is the JWT payload for CursorBuddy bridge sessions.
type Claims struct {
	Sub    string         `json:"sub"`
	Org    string         `json:"org"`
	Scopes []string       `json:"scopes,omitempty"`
	RL     map[string]int `json:"rl,omitempty"`
	jwt.RegisteredClaims
}

// Validator validates HS256 JWTs using a shared secret.
type Validator struct {
	secret []byte
}

// NewValidator creates a Validator for the given HMAC secret.
func NewValidator(secret string) *Validator {
	return &Validator{secret: []byte(secret)}
}

// Validate parses and validates a Bearer token string.
// Returns parsed Claims on success, or an error.
func (v *Validator) Validate(tokenStr string) (*Claims, error) {
	claims := &Claims{}
	_, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return v.secret, nil
	}, jwt.WithExpirationRequired())
	if err != nil {
		return nil, err
	}
	return claims, nil
}

// MintToken creates a signed HS256 JWT for the given subject and org.
// ttl controls token lifetime. Used for ephemeral session tokens and tests.
func MintToken(secret, sub, org string, ttl time.Duration) (string, error) {
	now := time.Now()
	claims := &Claims{
		Sub: sub,
		Org: org,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}
