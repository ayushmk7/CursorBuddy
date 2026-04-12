# OpenClaw Service Protocol

This document defines the local websocket protocol spoken between the Go bridge
and the Go OpenClaw service.

Canonical path:
`sidecar -> Go bridge -> Go OpenClaw service -> OpenAI Realtime`

Inbound frames from bridge-side websocket client:
- `session_start`
- `user_text`
- `audio_chunk`
- `audio_end`
- `tool_result`
- `ping`

Outbound frames from OpenClaw service:
- `session_ready`
- `tool_call`
- `assistant_envelope`
- `assistant_tts`
- `assistant_error`
- `pong`

Protocol rules:
- All frames are JSON objects with a top-level `type`.
- `session_id` must match the websocket route session being served.
- `tool_result` must include the original `call_id`.
- `assistant_envelope` payloads must validate as `AssistantEnvelopeV1`.
- Invalid frames fail closed with `assistant_error` and structured logs.
