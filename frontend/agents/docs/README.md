# Frontend agents — local application UI

This folder holds documentation and prompts for building the **local on-device frontend** for CursorBuddy / CursorBuddy.

The `frontend/` folder is for the UI that runs **inside or alongside the host application**:

- **sidebar webview**
- **cursor-adjacent companion / overlay**
- transcript, steps, confirmations, and local status states

It is **not** for the public landing page or waitlist site. Those live in `landingpage/` and should only be changed when a task explicitly targets marketing.

## Scope

This local frontend should align with:

- [`docs/07_LOCAL_CURSOR_AND_COMPANION.md`](../../../docs/07_LOCAL_CURSOR_AND_COMPANION.md)
- [`backend/agents/docs/COMPANION_OVERLAY_UX_SPEC.md`](../../../backend/agents/docs/COMPANION_OVERLAY_UX_SPEC.md)
- [`backend/agents/docs/BACKEND_VS_LOCAL_RUNTIME.md`](../../../backend/agents/docs/BACKEND_VS_LOCAL_RUNTIME.md)
- [`docs/02_TECHNICAL_PRD.md`](../../../docs/02_TECHNICAL_PRD.md)

## Read first

1. [`AGENT_SYSTEM_INSTRUCTIONS.md`](AGENT_SYSTEM_INSTRUCTIONS.md)
2. [`STACK.md`](STACK.md)
3. [`GLOSSARY.md`](GLOSSARY.md)
4. [`IMPLEMENTATION_STEPS.md`](IMPLEMENTATION_STEPS.md)
5. [`PHASED_IMPLEMENTATION_PROMPTS.md`](PHASED_IMPLEMENTATION_PROMPTS.md)

## Product and design sources

| Document | Use |
|----------|-----|
| [`docs/07_LOCAL_CURSOR_AND_COMPANION.md`](../../../docs/07_LOCAL_CURSOR_AND_COMPANION.md) | Primary local UI structure and behavior |
| [`backend/agents/docs/COMPANION_OVERLAY_UX_SPEC.md`](../../../backend/agents/docs/COMPANION_OVERLAY_UX_SPEC.md) | Pointer-locked capsule rules, chord, streaming layout |
| [`backend/agents/docs/BACKEND_VS_LOCAL_RUNTIME.md`](../../../backend/agents/docs/BACKEND_VS_LOCAL_RUNTIME.md) | Prevents pushing local UI work into backend/web scopes |
| [`docs/design/autoapply-design-tokens.md`](../../../docs/design/autoapply-design-tokens.md) | `wg.*` tokens for webview and overlay styling |
| [`docs/02_TECHNICAL_PRD.md`](../../../docs/02_TECHNICAL_PRD.md) | `AssistantEnvelopeV1`, local execution boundaries |
| [`docs/05_FRONTEND_PROMPT.md`](../../../docs/05_FRONTEND_PROMPT.md) | Marketing-site only; read only when a task explicitly targets `landingpage/` |

## Contracts

- [`../contracts/README.md`](../contracts/README.md) points to the authoritative contracts for local message shapes and envelope handling.

## Path rule

Always reference canonical files under `docs/…` and `backend/agents/docs/…`.

## Session prompt

From repo root:

> Read `frontend/agents/docs/AGENT_SYSTEM_INSTRUCTIONS.md`, `docs/07_LOCAL_CURSOR_AND_COMPANION.md`, and `backend/agents/docs/COMPANION_OVERLAY_UX_SPEC.md`. Summarize the local frontend boundaries and the next implementation step for the sidebar and overlay UI.
