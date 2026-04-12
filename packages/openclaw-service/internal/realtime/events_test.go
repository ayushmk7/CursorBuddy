package realtime_test

import (
	"testing"

	"github.com/cursorbuddy/openclaw-service/internal/realtime"
)

func TestParseServerEvent(t *testing.T) {
	raw := []byte(`{"type":"response.output_text.delta","delta":"hello"}`)
	event, err := realtime.ParseServerEvent(raw)
	if err != nil {
		t.Fatalf("ParseServerEvent() error: %v", err)
	}
	if event.Type != "response.output_text.delta" {
		t.Fatalf("Type = %q", event.Type)
	}
	if event.Delta != "hello" {
		t.Fatalf("Delta = %q", event.Delta)
	}
}
