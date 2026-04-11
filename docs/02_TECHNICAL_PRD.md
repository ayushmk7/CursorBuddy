# CursorBuddy — Technical Product Requirements Document

**Project:** CursorBuddy  
**Version:** 1.0  
**Date:** April 2026

---

## 1. System Architecture

### 1.1 Canonical topology

The canonical production topology for this repo is:

```text
Larry overlay in VS Code <-> extension <-> sidecar <-> Go bridge <-> OpenClaw service <-> OpenAI Realtime Mini
```

OpenClaw is the real backend service for CursorBuddy, and OpenAI Realtime is the concrete model backend behind it. `OpenAI Realtime Mini` is the default recommendation when the docs need to name a cost-conscious default.

### 1.2 Responsibility split

| Layer | Responsibility |
|-------|----------------|
| Larry overlay + extension | primary guidance UI, executor, VS Code integrations, secret storage, minimal support UI |
| Sidecar | audio capture, TTS playback, IPC, long-lived connection to bridge |
| Bridge | auth, session minting, WebSocket proxy, policy hooks |
| OpenClaw | orchestration, tool calling, envelope emission, guidance generation |
| OpenAI Realtime | realtime inference used by OpenClaw |

### 1.3 Forbidden production shortcuts

- No direct extension -> OpenAI Realtime orchestration path
- No sidecar -> OpenAI Realtime production path
- No mock backend described as the intended end-to-end product path
- No default architecture centered on Ollama or local models

---

## 2. VS Code Integration Surface

### 2.1 Required extension capabilities

The extension must contribute:

- commands to start / stop Larry sessions and manage auth
- Larry as the primary overlay/cursor-following surface in VS Code
- a minimal support surface for logs, auth, settings, and failure states
- configuration for bridge mode and backend URLs
- secure token storage using `SecretStorage`
- the current documented default controls `Control+Option+L`, `Control+Option+V`, and `Control+Option+C`

### 2.2 Core APIs

| Capability | API |
|------------|-----|
| Execute allowlisted commands | `vscode.commands.executeCommand` |
| Git state | built-in Git extension API |
| Workspace and editor state | `vscode.workspace`, `vscode.window` |
| Overlay/support UI plumbing | extension host plus local UI surface |
| Secret storage | `context.secrets` |

---

## 3. Session Lifecycle

### 3.1 State machine

```text
inactive -> connecting -> live
inactive -> connecting -> blocked
live -> inactive
blocked -> inactive
```

### 3.2 Real bridge-mode flow

1. The user wakes or keeps Larry active with `Control+Option+L` and starts a voice request with `Control+Option+V`.
2. The extension asks the sidecar to start a session.
3. The sidecar calls the Go bridge.
4. The bridge authenticates the user token and mints session/upstream connection details.
5. The bridge proxies the realtime connection to OpenClaw.
6. OpenClaw manages the active turn with OpenAI Realtime.
7. OpenClaw emits a validated `AssistantEnvelopeV1` plus guidance data for text/TTS.
8. The extension validates and executes the envelope locally.
9. Larry follows the user's cursor by default, moves on its own for safe navigation when needed, renders a transient comic-style bubble near itself, and can speak the same guidance aloud.

---

## 4. Structured Action Protocol

### 4.1 Core principle

OpenClaw proposes actions. The local executor decides whether and how they run.

Larry v1 uses a safe-navigation-first policy:

- open Source Control
- reveal safe files/panels
- move focus
- explain what the user should do next
- expose a secondary mini chat after arrival when the user wants follow-up detail

### 4.2 Canonical envelope

```json
{
  "schema_version": "1.0",
  "session_id": "uuid",
  "utterance_id": "uuid",
  "assistant_text": "I opened Source Control. Type your commit message here, then use Commit when you're ready.",
  "confidence": 0.92,
  "actions": [
    {
      "id": "a1",
      "type": "execute_command",
      "risk": "low",
      "alias": "open_scm"
    }
  ]
}
```

### 4.3 Action rules

- All envelopes must validate strictly.
- Unknown action types fail closed.
- Unknown command aliases fail closed.
- Safe-navigation actions are the default v1 boundary.
- High-risk actions require confirmation and are not part of Larry's default commit-guidance flow.

---

## 5. Tooling Contract

The key backend tool contract remains:

- `vscode_probe_state`

That tool lets OpenClaw ask for current VS Code state from the extension through the sidecar bridge.

Default rule:

- metadata only
- no raw file bodies unless explicitly allowed

Primary grounding for v1 should come from structured VS Code state, not screenshot-first vision.

The local UI contract should support:

- blue cursor-based Larry rendering
- green idle / yellow thinking / red error state-dot semantics
- cursor-follow mode when Larry is awake and idle
- autonomous movement toward a safe destination during guidance
- transient bubble text paired with optional TTS
- a collapsible mini chat that is secondary to voice-led guidance

---

## 6. Security Model

### 6.1 Secrets

- OpenAI API keys live in OpenClaw service configuration only.
- Bridge secrets live on the backend.
- The extension stores user auth tokens, not provider keys.

### 6.2 Threat mitigations

| Threat | Mitigation |
|--------|------------|
| Prompt injection via repo contents | metadata-first tools, explicit opt-in for file bodies |
| Arbitrary command execution | alias maps and strict envelope validation |
| Rogue network payloads | only validated `AssistantEnvelopeV1` can drive the executor |
| Credential leakage | no OpenAI key in extension or sidecar |

---

## 7. OpenClaw Requirements

OpenClaw is mandatory for this product architecture and must provide:

- session management
- OpenAI Realtime client integration
- tool invocation support
- `AssistantEnvelopeV1` validation and emission
- correlation IDs across session and utterance boundaries
- text/TTS guidance payload generation for Larry

The repo package `packages/openclaw-pack` documents the workflow/tool contract OpenClaw must support.

---

## 8. Performance Target

For navigation-style intents, the target remains:

- low enough latency to feel interactive after `Control+Option+V`
- bridge overhead kept minimal
- OpenClaw and OpenAI Realtime deployed/configured for low-latency turns

Bridge mode is acceptable only if it preserves the intended responsiveness of the product.

---

## 9. Testing Direction

Testing should prefer:

- real bridge and OpenClaw integration where practical
- real WebSocket transport behavior
- real extension host tests for executor behavior
- realistic Larry guidance flows such as opening Source Control and speaking/explaining commit guidance

Mocks may still exist in narrow unit-test contexts, but they are not the documented product path and should not define the architecture.

---

## 10. Related Documents

- `docs/01_GENERAL_PRD.md`
- `docs/03_BACKEND_PRD.md`
- `docs/06_BACKEND_IMPLEMENTATION_STEPS.md`
- `ARCHITECTURE.md`
