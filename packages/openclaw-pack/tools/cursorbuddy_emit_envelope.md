# Tool: cursorbuddy_emit_envelope

**Purpose:** Validates an `AssistantEnvelopeV1` JSON object and emits it to the sidecar
transport for the extension's Action Executor. This is the *only* actuator contract.

## Input schema (AssistantEnvelopeV1)

```json
{
  "schema_version": "1.0",
  "session_id": "<uuid matching current session>",
  "utterance_id": "<uuid for this turn>",
  "assistant_text": "Plain language summary shown in UI and optionally spoken via TTS.",
  "confidence": 0.0,
  "actions": [
    {
      "id": "a1",
      "type": "execute_command",
      "risk": "low",
      "alias": "open_scm",
      "args": []
    }
  ]
}
```

## Validation rules (fail closed on any violation)

1. `schema_version` must equal `"1.0"`.
2. `session_id` must match the current OpenClaw session handle.
3. All `action.id` values must be unique within the envelope.
4. `action.type` must be one of: `execute_command`, `show_information_message`,
   `reveal_uri`, `set_editor_selection`, `request_user_confirm`, `noop`.
5. `action.risk` must be one of: `low`, `medium`, `high`.
6. For `execute_command`: `alias` must be a non-empty string. OpenClaw does NOT verify
   the alias is in the allowlist — that check happens in the extension. OpenClaw MUST NOT
   pass arbitrary command ID strings as the alias value.
7. No additional properties allowed (`additionalProperties: false`).
8. Envelopes with `risk: "high"` actions MUST include a preceding `request_user_confirm`
   action in the same envelope (or the agent must have received user confirmation via
   `confirm_high_risk_before_emit` guardrail).

## Emission

On validation success: serialize JSON to sidecar transport (WebSocket or HTTPS SSE).
On validation failure: return error to agent loop; do NOT emit partial envelopes.

## Related

- TypeScript Zod schema: `packages/shared/src/envelope.ts`
- Executor: `packages/extension/src/executor/ActionExecutor.ts` (local runtime)
