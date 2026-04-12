package session_test

import (
	"testing"

	"github.com/cursorbuddy/openclaw-service/internal/session"
)

func TestManager_CreateAndTransition(t *testing.T) {
	m := session.NewManager()
	s, err := m.Create("session-1")
	if err != nil {
		t.Fatalf("Create() error: %v", err)
	}
	if s.State != session.StateCreated {
		t.Fatalf("initial state = %s", s.State)
	}
	if err := m.Transition("session-1", session.StateAwaitingInput); err != nil {
		t.Fatalf("Transition() error: %v", err)
	}
	got, ok := m.Get("session-1")
	if !ok {
		t.Fatal("session not found")
	}
	if got.State != session.StateAwaitingInput {
		t.Fatalf("state = %s want %s", got.State, session.StateAwaitingInput)
	}
}

func TestManager_RejectsInvalidTransition(t *testing.T) {
	m := session.NewManager()
	if _, err := m.Create("session-2"); err != nil {
		t.Fatalf("Create() error: %v", err)
	}
	if err := m.Transition("session-2", session.StateEmittingResponse); err == nil {
		t.Fatal("expected invalid transition error")
	}
}
