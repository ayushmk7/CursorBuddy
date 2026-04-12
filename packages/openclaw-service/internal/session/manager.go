package session

import "fmt"

type Manager struct {
	store *Store
}

func NewManager() *Manager {
	return &Manager{store: NewStore()}
}

func (m *Manager) Create(id string) (*Session, error) {
	if _, ok := m.store.Get(id); ok {
		return nil, fmt.Errorf("session already exists")
	}
	s := &Session{ID: id, State: StateCreated}
	m.store.Put(s)
	return s, nil
}

func (m *Manager) Get(id string) (*Session, bool) {
	return m.store.Get(id)
}

func (m *Manager) Transition(id string, next State) error {
	s, ok := m.store.Get(id)
	if !ok {
		return fmt.Errorf("session not found")
	}
	if !validTransition(s.State, next) {
		return fmt.Errorf("invalid transition from %s to %s", s.State, next)
	}
	s.State = next
	m.store.Put(s)
	return nil
}

func validTransition(from, to State) bool {
	switch from {
	case StateCreated:
		return to == StateAwaitingInput
	case StateAwaitingInput:
		return to == StateReceivingAudio || to == StateComposingResponse || to == StateClosed
	case StateReceivingAudio:
		return to == StateFinalizingInput || to == StateErrored
	case StateFinalizingInput:
		return to == StateAwaitingToolResult || to == StateComposingResponse || to == StateErrored
	case StateAwaitingToolResult:
		return to == StateComposingResponse || to == StateErrored
	case StateComposingResponse:
		return to == StateEmittingResponse || to == StateErrored
	case StateEmittingResponse:
		return to == StateAwaitingInput || to == StateClosed || to == StateErrored
	default:
		return false
	}
}
