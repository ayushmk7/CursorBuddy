package session

import "sync"

type Session struct {
	ID            string
	State         State
	UtteranceID   string
	ActiveToolCall string
	PendingText   string
	LastEnvelope  string
}

type Store struct {
	mu       sync.RWMutex
	sessions map[string]*Session
}

func NewStore() *Store {
	return &Store{sessions: make(map[string]*Session)}
}

func (s *Store) Put(session *Session) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[session.ID] = session
}

func (s *Store) Get(id string) (*Session, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	session, ok := s.sessions[id]
	return session, ok
}
