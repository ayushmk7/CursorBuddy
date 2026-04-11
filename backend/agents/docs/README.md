# Backend agents — guidance for implementers

This folder holds **documentation and copy-paste prompts only**. Implementers and coding agents should use these files as the **entry point**, then read the canonical PRDs under [`docs/`](../../docs/).

When backend / bridge code is introduced in this repo, the default server-side language is **Go**.

## Read first

1. [`AGENT_SYSTEM_INSTRUCTIONS.md`](AGENT_SYSTEM_INSTRUCTIONS.md) — non‑negotiable rules (OpenClaw, envelopes, security).
2. [`GLOSSARY.md`](GLOSSARY.md) — terms used across PRDs.
3. [`BACKEND_VS_LOCAL_RUNTIME.md`](BACKEND_VS_LOCAL_RUNTIME.md) — what “backend” means vs extension / sidecar / Larry overlay.
4. [`COMPANION_OVERLAY_UX_SPEC.md`](COMPANION_OVERLAY_UX_SPEC.md) — Larry overlay behavior, streaming text, and TTS.
5. [`HOST_COMPAT_VS_CURSOR.md`](HOST_COMPAT_VS_CURSOR.md) — superseded host-compat notes retained for history.

## Prompts

- [`PHASED_IMPLEMENTATION_PROMPTS.md`](PHASED_IMPLEMENTATION_PROMPTS.md) — phased prompts aligned with [`docs/06_BACKEND_IMPLEMENTATION_STEPS.md`](../../docs/06_BACKEND_IMPLEMENTATION_STEPS.md).

## Contracts (do not duplicate)

- [`contracts/README.md`](contracts/README.md) — pointers to OpenAPI and envelope schema in `docs/`.

## How to run a session with an agent

Open the repository root in your terminal or IDE. Paste an initial instruction such as:

> Read `backend/agents/AGENT_SYSTEM_INSTRUCTIONS.md` and `docs/01_GENERAL_PRD.md`. Summarize architecture and list the next implementation step I asked for.

Always use paths relative to repo root. **Canonical doc paths are `docs/…`** (not `docsforother/…`, which appears as historical prose in some older files).

## Repo map (outside this folder)

| Path | Role |
|------|------|
| [`docs/01_GENERAL_PRD.md`](../../docs/01_GENERAL_PRD.md) | Product overview, OpenClaw requirement |
| [`docs/02_TECHNICAL_PRD.md`](../../docs/02_TECHNICAL_PRD.md) | Extension APIs, `AssistantEnvelopeV1`, sidecar |
| [`docs/03_BACKEND_PRD.md`](../../docs/03_BACKEND_PRD.md) | Bridge, OpenClaw service, auth, OpenAI Realtime backend direction |
| [`docs/06_BACKEND_IMPLEMENTATION_STEPS.md`](../../docs/06_BACKEND_IMPLEMENTATION_STEPS.md) | Phased build order |
| [`docs/07_LOCAL_CURSOR_AND_COMPANION.md`](../../docs/07_LOCAL_CURSOR_AND_COMPANION.md) | Larry overlay and local product surface |
| [`docs/openapi.yaml`](../../docs/openapi.yaml) | Bridge REST shape (illustrative) |
