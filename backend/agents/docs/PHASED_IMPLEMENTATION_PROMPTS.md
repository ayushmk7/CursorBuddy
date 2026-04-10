# Phased implementation prompts

Copy‑paste blocks for **Claude Code / Cursor**. Each block assumes the repo root is open and [`AGENT_SYSTEM_INSTRUCTIONS.md`](AGENT_SYSTEM_INSTRUCTIONS.md) applies.

**Path reminder:** All canonical PRDs live under **`docs/`** (ignore `docsforother/` if you see it in older sentences inside copied PRD text).

---

## Phase 0 — Decisions and gates (whole team)

```
Read docs/01_GENERAL_PRD.md, docs/02_TECHNICAL_PRD.md §1–4, and docs/03_BACKEND_PRD.md §1–4.
Summarize: (1) why OpenClaw cannot be bypassed in production, (2) when a bridge is justified vs sidecar→OpenClaw direct,
(3) trust boundaries between Extension Host, Sidecar, Bridge, OpenClaw. Output a one-page ARCHITECTURE.md skeleton
with deployment mode A vs B and latency measurement plan per docs/06_BACKEND_IMPLEMENTATION_STEPS.md Phase 0.1.
```

---

## Phase 0.5 — OpenClaw pack only (backend / pack repo)

```
Read docs/02_TECHNICAL_PRD.md §9 (OpenClaw pack / tools) and docs/06_BACKEND_IMPLEMENTATION_STEPS.md Phase 0.5.
Scaffold packages/openclaw-pack with waveclick_session workflow (names may match OpenClaw DSL),
tools vscode_probe_state and waveclick_emit_envelope, and SKILL.md for safe Git guidance.
waveclick_emit_envelope must validate AssistantEnvelopeV1 before transport; cite docs/02_TECHNICAL_PRD.md §4 for the JSON shape.
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
Read docs/02_TECHNICAL_PRD.md §2, docs/06_BACKEND_IMPLEMENTATION_STEPS.md Phase 2, and backend/agents/HOST_COMPAT_VS_CURSOR.md.
Scaffold packages/extension: esbuild, strict TypeScript, narrow activationEvents, WaveClick output channel,
SecretStorage helpers for OpenClaw token only (never provider keys), configuration keys per Step 2.4.
```

---

## Phase 3 — Webview UI (local)

```
Read docs/07_LOCAL_CURSOR_AND_COMPANION.md §3, docs/06_BACKEND_IMPLEMENTATION_STEPS.md Phase 3.
Implement sidebar WebviewViewProvider with strict CSP and typed postMessage protocol per Step 3.2.
Use VS Code theme variables (--vscode-*); no remote scripts. High-contrast test pass.
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
enforce high-risk confirms. Sidecar: audio framing to OpenClaw transport; forward AssistantEnvelopeV1 to extension;
no orchestration bypass.
```

---

## Companion overlay + chord (local UX; cross‑cutting)

```
Read backend/agents/COMPANION_OVERLAY_UX_SPEC.md and docs/07_LOCAL_CURSOR_AND_COMPANION.md §4–6.
Plan overlay or degraded path: pointer-follow throttling, default macOS chord Ctrl+Option+Command as keybinding contribution,
press-and-hold PTT default, streaming caption growth with max height and inner scroll, aria-live duplication in sidebar,
reduced-motion behavior. Do not implement OS-wide mouse automation for navigation.
```

---

## Optional bridge service (backend)

```
Read docs/03_BACKEND_PRD.md §4–6 and docs/openapi.yaml.
Scaffold packages/bridge as a Go service only if policy requires: POST /v1/sessions, health, JWT/mTLS per Backend PRD;
transparent proxy for realtime where possible; no UI logic.
```

---

## Verification prompt (before claiming “done”)

```
Read backend/agents/AGENT_SYSTEM_INSTRUCTIONS.md and docs/06_BACKEND_IMPLEMENTATION_STEPS.md “How to use this file”.
List what was implemented, run the repo’s tests/lint if present, and state any skipped phases or platform limits (VS Code vs Cursor).
```
