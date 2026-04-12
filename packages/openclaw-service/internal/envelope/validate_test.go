package envelope_test

import (
	"testing"

	"github.com/cursorbuddy/openclaw-service/internal/envelope"
)

func TestValidateEnvelope_OK(t *testing.T) {
	err := envelope.Validate(envelope.AssistantEnvelopeV1{
		SchemaVersion: "1.0",
		SessionID:     "11111111-1111-1111-1111-111111111111",
		UtteranceID:   "22222222-2222-2222-2222-222222222222",
		AssistantText: "Opening Source Control.",
		Confidence:    0.92,
		Actions: []envelope.Action{
			{ID: "a1", Type: "execute_command", Risk: "low", Alias: "open_scm"},
		},
	})
	if err != nil {
		t.Fatalf("Validate() error: %v", err)
	}
}

func TestValidateEnvelope_RejectsDuplicateActionIDs(t *testing.T) {
	err := envelope.Validate(envelope.AssistantEnvelopeV1{
		SchemaVersion: "1.0",
		SessionID:     "11111111-1111-1111-1111-111111111111",
		UtteranceID:   "22222222-2222-2222-2222-222222222222",
		AssistantText: "Opening Source Control.",
		Confidence:    0.92,
		Actions: []envelope.Action{
			{ID: "dup", Type: "execute_command", Risk: "low", Alias: "open_scm"},
			{ID: "dup", Type: "noop", Risk: "low", Reason: "duplicate"},
		},
	})
	if err == nil {
		t.Fatal("expected duplicate action id error")
	}
}

func TestValidateEnvelope_RejectsUnknownActionType(t *testing.T) {
	err := envelope.Validate(envelope.AssistantEnvelopeV1{
		SchemaVersion: "1.0",
		SessionID:     "11111111-1111-1111-1111-111111111111",
		UtteranceID:   "22222222-2222-2222-2222-222222222222",
		AssistantText: "Opening Source Control.",
		Confidence:    0.92,
		Actions: []envelope.Action{
			{ID: "a1", Type: "unknown", Risk: "low"},
		},
	})
	if err == nil {
		t.Fatal("expected unknown action type error")
	}
}
