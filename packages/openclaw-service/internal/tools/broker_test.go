package tools_test

import (
	"testing"
	"time"

	"github.com/cursorbuddy/openclaw-service/internal/tools"
)

func TestBroker_CallAndResolve(t *testing.T) {
	b := tools.NewBroker(250 * time.Millisecond)
	call := b.NewCall("vscode_probe_state", map[string]any{"include_git": true})
	if call.CallID == "" {
		t.Fatal("expected call id")
	}
	if err := b.Resolve(call.CallID, map[string]any{"ok": true}); err != nil {
		t.Fatalf("Resolve() error: %v", err)
	}
	result, err := b.Wait(call.CallID)
	if err != nil {
		t.Fatalf("Wait() error: %v", err)
	}
	if result["ok"] != true {
		t.Fatalf("unexpected result: %#v", result)
	}
}

func TestBroker_RejectsUnknownTool(t *testing.T) {
	b := tools.NewBroker(250 * time.Millisecond)
	if _, err := b.Create("unknown_tool", nil); err == nil {
		t.Fatal("expected unknown tool error")
	}
}
