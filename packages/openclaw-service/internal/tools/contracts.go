package tools

import "github.com/google/uuid"

type ToolCall struct {
	CallID string         `json:"call_id"`
	Name   string         `json:"name"`
	Input  map[string]any `json:"input,omitempty"`
}

func newToolCall(name string, input map[string]any) ToolCall {
	return ToolCall{
		CallID: uuid.NewString(),
		Name:   name,
		Input:  input,
	}
}
