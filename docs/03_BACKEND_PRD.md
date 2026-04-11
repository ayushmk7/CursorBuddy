# CursorBuddy — Backend / Bridge Requirements

**Project:** CursorBuddy  
**Version:** 1.0  
**Date:** April 2026

---

## 1. Backend Definition

For CursorBuddy in this repo, "backend" means:

- the Go bridge service
- the real OpenClaw service
- OpenAI Realtime integration inside OpenClaw

This document treats OpenClaw as the real orchestration backend for Larry. It is not an unspecified external dependency.

---

## 2. Canonical Backend Topology

```text
Larry overlay in VS Code -> extension -> sidecar -> Go bridge -> OpenClaw service -> OpenAI Realtime Mini
```

### 2.1 Bridge role

The bridge is the stable entrypoint used by the sidecar in bridge mode. It owns:

- user authentication
- session minting
- session policy lookup
- WebSocket / upstream proxying to OpenClaw
- audit and rate-limiting hooks

### 2.2 OpenClaw role

OpenClaw owns:

- session orchestration
- turn handling
- OpenAI Realtime connection management
- tool calling
- `AssistantEnvelopeV1` generation
- text and TTS-ready guidance generation for Larry

---

## 3. Concrete Provider Choice

The current documented provider choice is:

- **OpenAI Realtime Mini** by default

OpenClaw is expected to use OpenAI Realtime as its primary low-latency model backend for real Larry sessions. `OpenAI Realtime Mini` is the recommended default because it keeps the real architecture intact while reducing recurring cost.

The repo should therefore document:

- OpenAI API key on the backend
- OpenClaw service as the client of OpenAI Realtime
- no direct provider wiring in the extension
- no Ollama/local-model-first default path

---

## 4. Authentication Flows

### 4.1 User -> bridge

The user authenticates to the bridge using a bridge-issued JWT or equivalent user token stored in VS Code `SecretStorage`.

### 4.2 Bridge -> OpenClaw

The bridge authenticates upstream using a service credential such as:

- service token
- internal bearer
- mutually trusted internal channel

### 4.3 OpenClaw -> OpenAI

OpenClaw authenticates to OpenAI Realtime using an OpenAI API key stored only in backend configuration.

---

## 5. Required Runtime Inputs

The real system requires user-provided values for:

- `OPENAI_API_KEY`
- `OPENCLAW_SERVICE_TOKEN`
- `JWT_SECRET`
- `JWT_ISSUER`
- bridge and OpenClaw bind/public hosts

Those values are external inputs. They are not generated automatically by the product.

---

## 6. Bridge API Surface

The bridge must support:

- `GET /v1/healthz`
- `GET /v1/policy`
- `POST /v1/sessions`
- `POST /v1/auth/refresh`
- `GET /v1/stream/{sessionId}`

`POST /v1/sessions` returns connection details for the realtime stream that ultimately terminates in OpenClaw.

---

## 7. Session Minting Behavior

When the sidecar requests a Larry session:

1. The bridge validates the user's auth.
2. The bridge creates or authorizes a session context.
3. The bridge returns an upstream WebSocket URL plus auth headers for the sidecar.
4. The bridge proxies the stream to OpenClaw.
5. OpenClaw manages the actual OpenAI Realtime turn lifecycle.
6. OpenClaw returns validated guidance/action output for Larry.

---

## 8. Local Development

### 8.1 Expected local shape

For local development, the intended real path is:

```text
VS Code extension -> sidecar -> bridge on localhost -> OpenClaw on localhost -> OpenAI Realtime Mini
```

### 8.2 Example env vars

```bash
BRIDGE_LISTEN=127.0.0.1:8787
BRIDGE_PUBLIC_HOST=127.0.0.1:8787
OPENCLAW_UPSTREAM_URL=ws://127.0.0.1:9090
OPENCLAW_SERVICE_TOKEN=change-me
JWT_ISSUER=cursorbuddy-bridge
JWT_SECRET=change-me-at-least-32-chars
OPENAI_API_KEY=sk-...
```

`OPENAI_API_KEY` belongs to the OpenClaw runtime, even if both services are started locally.

---

## 9. Non-Goals

This backend design explicitly does not describe:

- direct extension -> OpenAI integration
- mock OpenClaw as the product backend
- an undefined external vendor runtime that the reader has to discover on their own
- Ollama as the default runtime

---

## 10. Operational Expectations

- If the bridge is down, bridge mode is unavailable.
- If OpenClaw is down, no real Larry session can run.
- If OpenAI Realtime credentials are missing or invalid, OpenClaw cannot serve turns.
- Errors should surface as bridge/OpenClaw/session failures, not as silent fallbacks to a different architecture.

---

## 11. Related Documents

- `docs/01_GENERAL_PRD.md`
- `docs/02_TECHNICAL_PRD.md`
- `docs/06_BACKEND_IMPLEMENTATION_STEPS.md`
- `todo.md`
