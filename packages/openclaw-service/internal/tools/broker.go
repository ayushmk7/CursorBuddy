package tools

import (
	"fmt"
	"sync"
	"time"
)

type Broker struct {
	timeout time.Duration
	mu      sync.Mutex
	calls   map[string]chan map[string]any
}

func NewBroker(timeout time.Duration) *Broker {
	return &Broker{timeout: timeout, calls: make(map[string]chan map[string]any)}
}

func (b *Broker) Create(name string, input map[string]any) (ToolCall, error) {
	if name != "vscode_probe_state" {
		return ToolCall{}, fmt.Errorf("unknown tool")
	}
	call := newToolCall(name, input)
	b.mu.Lock()
	b.calls[call.CallID] = make(chan map[string]any, 1)
	b.mu.Unlock()
	return call, nil
}

func (b *Broker) NewCall(name string, input map[string]any) ToolCall {
	call, _ := b.Create(name, input)
	return call
}

func (b *Broker) Resolve(callID string, result map[string]any) error {
	b.mu.Lock()
	ch, ok := b.calls[callID]
	b.mu.Unlock()
	if !ok {
		return fmt.Errorf("unknown call id")
	}
	ch <- result
	return nil
}

func (b *Broker) Wait(callID string) (map[string]any, error) {
	b.mu.Lock()
	ch, ok := b.calls[callID]
	b.mu.Unlock()
	if !ok {
		return nil, fmt.Errorf("unknown call id")
	}
	select {
	case result := <-ch:
		return result, nil
	case <-time.After(b.timeout):
		return nil, fmt.Errorf("tool result timeout")
	}
}
