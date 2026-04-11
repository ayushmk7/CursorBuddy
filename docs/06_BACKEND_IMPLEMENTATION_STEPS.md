# CursorBuddy — Implementation Steps (Real Larry Path)

This document is the implementation guide for the real product path:

```text
Larry overlay in VS Code -> extension -> sidecar -> Go bridge -> OpenClaw service -> OpenAI Realtime Mini
```

No mock-first path is described here as the primary system.

---

## Phase 0 — Inputs and architecture lock

### Step 0.1 — Lock the backend shape

The repo must consistently assume:

- VS Code only for v1
- Larry as the primary user-facing surface
- bridge mode as the intended real connection mode
- OpenClaw as the real backend service
- `OpenAI Realtime Mini` as the default provider behind OpenClaw

### Step 0.2 — Gather user-blocking inputs

The user must supply:

- OpenAI API key with Realtime access
- JWT signing secret
- OpenClaw service token
- local bind addresses or deployment hostnames

These are captured in `todo.md`.

---

## Phase 1 — OpenClaw backend service

Build the real OpenClaw service layer in-repo.

Required responsibilities:

- accept bridge/upstream session traffic
- manage realtime sessions against OpenAI Realtime
- call backend tools such as `vscode_probe_state`
- emit validated `AssistantEnvelopeV1`
- produce text/TTS guidance output for Larry

This is no longer described as an external unspecified dependency.

---

## Phase 2 — Go bridge

Complete the bridge so it supports the real Larry path:

- `POST /v1/sessions`
- `GET /v1/stream/{sessionId}`
- auth middleware
- policy endpoint
- optional refresh flow

The bridge must proxy upstream to the real OpenClaw service, not to a canned mock.

---

## Phase 3 — Extension bridge-mode support

Update the extension so it truly supports bridge mode:

- read `cursorbuddy.connectionMode`
- read `cursorbuddy.bridge.baseUrl`
- store user auth in `SecretStorage`
- start Larry sessions against the bridge in bridge mode
- expose only minimal support UI for auth, settings, logs, and failure states

The current extension must not silently behave like direct mode when bridge mode is selected.

---

## Phase 4 — Sidecar bridge transport

Update the sidecar so it:

- connects to the bridge instead of assuming direct OpenClaw WebSocket access
- uses returned session/upstream connection details
- forwards tool calls and tool results correctly
- sends audio and receives envelope/guidance events over the real bridge/OpenClaw path
- plays TTS output when available

---

## Phase 5 — Larry overlay and executor completion

Complete the local product experience:

- Larry overlay inside VS Code as the primary surface
- `Control+Option+L`, `Control+Option+V`, and `Control+Option+C` as the current documented default controls
- Larry cursor-follow mode and self-move guidance mode
- blue Larry cursor rendering with green idle / yellow thinking / red error state-dot semantics
- transient comic-style text guidance bubble and TTS playback
- secondary mini chat behavior after arrival or for follow-up detail
- safe-navigation action handling
- confirmation flow for anything above the safe-navigation boundary
- fallback/support UI states

These remain local-runtime work, but they must reflect real bridge/OpenClaw session state.

---

## Phase 6 — Real end-to-end verification

Verify the system with the real architecture:

1. Start Redis if required by the bridge.
2. Start OpenClaw with a valid OpenAI Realtime key.
3. Start the Go bridge with real env vars.
4. Launch the extension in VS Code.
5. Store the user auth token in VS Code.
6. Start Larry and use the documented default controls.
7. Ask Larry a safe-navigation question such as how to commit.
8. Verify that Larry follows the cursor by default, opens Source Control, explains the flow with a short bubble, and can speak the guidance.

---

## Phase 7 — Remove old architectural ambiguity

As code and docs land:

- remove mock-first language
- remove "OpenClaw is some external thing you must find" language
- remove direct-to-provider production suggestions
- remove sidebar-first product language
- remove Ollama/local-model-first guidance as the canonical runtime

Historical docs can remain only if they are clearly marked as superseded.

---

## Definition of Done

The real Larry implementation is done when:

- the bridge runs
- OpenClaw runs
- OpenClaw can call OpenAI Realtime
- the extension can authenticate and start Larry sessions in bridge mode
- Larry appears in VS Code as the primary guide surface
- Larry follows by default and moves on its own only during safe guidance
- Larry can perform safe navigation such as opening Source Control
- Larry can return brief bubble guidance plus TTS
- docs consistently describe only the real architecture
