package dlp_test

import (
	"testing"

	"github.com/cursorbuddy/bridge/internal/dlp"
)

func TestRedact(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{
			name:  "redacts email",
			input: "Contact user@example.com for help",
			want:  "Contact [REDACTED_EMAIL] for help",
		},
		{
			name:  "redacts AWS key",
			input: "Key: AKIAIOSFODNN7EXAMPLE",
			want:  "Key: [REDACTED_AKIA]",
		},
		{
			name:  "redacts OpenAI key",
			input: "token=sk-abcdefghijklmnopqrstu",
			want:  "token=[REDACTED_OPENAI]",
		},
		{
			name:  "redacts Google API key",
			input: "key=AIzaSyD-abcdefghijklmnopqrst",
			want:  "key=[REDACTED_GOOGLE]",
		},
		{
			name:  "passes clean text",
			input: "Open the source control view",
			want:  "Open the source control view",
		},
		{
			name:  "handles empty string",
			input: "",
			want:  "",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := dlp.Redact(tc.input)
			if got != tc.want {
				t.Errorf("Redact(%q) = %q; want %q", tc.input, got, tc.want)
			}
		})
	}
}
