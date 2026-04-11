# Phased implementation prompts

Copy-paste blocks for coding agents. Each block assumes the repo root is open and [`AGENT_SYSTEM_INSTRUCTIONS.md`](AGENT_SYSTEM_INSTRUCTIONS.md) applies.

**Path reminder:** All canonical PRDs live under **`docs/`** (ignore `docsforother/` if you see it in older sentences inside copied PRD text).

---

## Phase 0 — Decisions and gates (whole team)

```
Read docs/01_GENERAL_PRD.md, docs/02_TECHNICAL_PRD.md §1–4, and docs/03_BACKEND_PRD.md §1–4.
Summarize: (1) why OpenClaw cannot be bypassed in production, (2) why the accepted topology is Larry in VS Code -> extension -> sidecar -> bridge -> OpenClaw -> OpenAI Realtime Mini,
(3) trust boundaries between Extension Host, Sidecar, Bridge, OpenClaw, and OpenAI. Output a one-page ARCHITECTURE.md skeleton
that reflects the current accepted architecture and required user-provided secrets.
```

---

## Phase 0.5 — OpenClaw pack only (backend / pack repo)

```
Read docs/02_TECHNICAL_PRD.md §9 (OpenClaw pack / tools) and docs/06_BACKEND_IMPLEMENTATION_STEPS.md Phase 0.5.
Scaffold packages/openclaw-pack with cursorbuddy_session workflow (names may match OpenClaw DSL),
tools vscode_probe_state and cursorbuddy_emit_envelope, and SKILL.md for safe Git guidance.
cursorbuddy_emit_envelope must validate AssistantEnvelopeV1 before transport; cite docs/02_TECHNICAL_PRD.md §4 for the JSON shape.
Do not add direct model SDK calls from the VS Code extension.
```

---

## Phase 1 — Shared contracts (monorepo shared package)

```
Read docs/02_TECHNICAL_PRD.md §4 and docs/06_BACKEND_IMPLEMENTATION_STEPS.md Phase 1.
Create packages/shared with Zod AssistantEnvelopeV1Schema (strict, discriminated action union), fixtures for valid/invalid envelopes,
and command-map file format per Step 1.2. Ensure duplicate action ids fail closed.
```

---

## Phase 2 — Extension skeleton (local)

```
Read docs/02_TECHNICAL_PRD.md §2 and docs/06_BACKEND_IMPLEMENTATION_STEPS.md Phase 2.
Scaffold packages/extension: esbuild, strict TypeScript, narrow activationEvents, CursorBuddy output channel,
SecretStorage helpers for OpenClaw token only (never provider keys), configuration keys per Step 2.4.
```

---

## Phase 3 — Larry UI shell (local)

```
Read docs/07_LOCAL_CURSOR_AND_COMPANION.md and docs/06_BACKEND_IMPLEMENTATION_STEPS.md Phase 3.
Implement Larry as the primary local guide surface plus minimal support UI for auth, logs, and blocked states.
Use VS Code theme variables where relevant; no remote scripts. High-contrast test pass.
```

---

## Phase 4 — Adapters (local)

```
Read docs/02_TECHNICAL_PRD.md §2.3–2.4 and docs/06_BACKEND_IMPLEMENTATION_STEPS.md Phase 4.
Implement GitAdapter and WorkspaceAdapter; never shell git with string concat; handle untitled URIs and disabled Git extension.
```

---

## Phase 5+ — Executor and sidecar (local + transport)

```
Read docs/02_TECHNICAL_PRD.md §4, docs/06_BACKEND_IMPLEMENTATION_STEPS.md Phase 5 onward.
Implement ActionExecutor: parse with shared Zod, map command aliases via versioned maps, block unknown commands,
enforce high-risk confirms. Sidecar: audio framing to bridge/OpenClaw transport; forward AssistantEnvelopeV1 to extension;
no orchestration bypass.
```

---

## Larry listening + guidance UX (local; cross-cutting)

```
Read backend/agents/COMPANION_OVERLAY_UX_SPEC.md and docs/07_LOCAL_CURSOR_AND_COMPANION.md.
Plan Larry's primary guidance path: `Control+Option+L` / `Control+Option+V` / `Control+Option+C`, blue cursor follow mode,
self-move-to-destination guidance, transient bubble text, TTS playback, secondary mini chat after arrival, reduced-motion behavior,
and minimal support UI fallback. Do not implement OS-wide mouse automation for navigation.
```

---

## Optional bridge service (backend)

```
Read docs/03_BACKEND_PRD.md §4–6 and docs/openapi.yaml.
Implement packages/bridge as a Go service for the accepted real path: POST /v1/sessions, health, JWT/mTLS per Backend PRD;
transparent proxy to OpenClaw where possible; no UI logic.
```

---

## Verification prompt (before claiming “done”)

```
Read backend/agents/AGENT_SYSTEM_INSTRUCTIONS.md and docs/06_BACKEND_IMPLEMENTATION_STEPS.md “How to use this file”.
List what was implemented, run the repo’s tests/lint if present, and state any skipped phases or platform limits.
```
