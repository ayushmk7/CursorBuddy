package envelope

import (
	"fmt"

	"github.com/google/uuid"
)

type Action struct {
	ID      string         `json:"id"`
	Type    string         `json:"type"`
	Risk    string         `json:"risk"`
	Alias   string         `json:"alias,omitempty"`
	Args    []any          `json:"args,omitempty"`
	Message string         `json:"message,omitempty"`
	Modal   bool           `json:"modal,omitempty"`
	URI     string         `json:"uri,omitempty"`
	Start   map[string]int `json:"start,omitempty"`
	End     map[string]int `json:"end,omitempty"`
	Title   string         `json:"title,omitempty"`
	Details string         `json:"details,omitempty"`
	Reason  string         `json:"reason,omitempty"`
}

type AssistantEnvelopeV1 struct {
	SchemaVersion string   `json:"schema_version"`
	SessionID     string   `json:"session_id"`
	UtteranceID   string   `json:"utterance_id"`
	AssistantText string   `json:"assistant_text"`
	Confidence    float64  `json:"confidence"`
	Actions       []Action `json:"actions"`
	TelemetryNote string   `json:"telemetry_note,omitempty"`
}

var allowedRisks = map[string]bool{"low": true, "medium": true, "high": true}
var allowedTypes = map[string]bool{
	"execute_command":       true,
	"show_information_message": true,
	"reveal_uri":            true,
	"set_editor_selection":  true,
	"request_user_confirm":  true,
	"noop":                  true,
}

func Validate(env AssistantEnvelopeV1) error {
	if env.SchemaVersion != "1.0" {
		return fmt.Errorf("invalid schema version")
	}
	if _, err := uuid.Parse(env.SessionID); err != nil {
		return fmt.Errorf("invalid session_id")
	}
	if _, err := uuid.Parse(env.UtteranceID); err != nil {
		return fmt.Errorf("invalid utterance_id")
	}
	if env.Confidence < 0 || env.Confidence > 1 {
		return fmt.Errorf("invalid confidence")
	}
	if len(env.Actions) == 0 {
		return fmt.Errorf("actions must be non-empty")
	}
	seen := map[string]bool{}
	for _, action := range env.Actions {
		if seen[action.ID] {
			return fmt.Errorf("duplicate action id: %s", action.ID)
		}
		seen[action.ID] = true
		if !allowedRisks[action.Risk] {
			return fmt.Errorf("invalid risk")
		}
		if !allowedTypes[action.Type] {
			return fmt.Errorf("invalid action type")
		}
		if action.Type == "execute_command" && action.Alias == "" {
			return fmt.Errorf("execute_command alias required")
		}
	}
	return nil
}
