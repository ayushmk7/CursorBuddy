# Agent system instructions — local application frontend

Use this document at the start of every implementation session that changes the **local frontend** in `frontend/`.

This folder is for the **on-device UI only**:

- Larry as the primary guide surface
- minimal support UI
- transcript and confirmation UI
- theme-aware frontend assets that plug into the host application

It is **not** for the landing page. Do not change `landingpage/` unless the task explicitly asks for marketing work.

## Canonical sources

Read in this order:

1. [`docs/07_LOCAL_CURSOR_AND_COMPANION.md`](../../../docs/07_LOCAL_CURSOR_AND_COMPANION.md)
2. [`backend/agents/docs/COMPANION_OVERLAY_UX_SPEC.md`](../../../backend/agents/docs/COMPANION_OVERLAY_UX_SPEC.md)
3. [`backend/agents/docs/BACKEND_VS_LOCAL_RUNTIME.md`](../../../backend/agents/docs/BACKEND_VS_LOCAL_RUNTIME.md)
4. [`docs/02_TECHNICAL_PRD.md`](../../../docs/02_TECHNICAL_PRD.md)
5. [`docs/design/autoapply-design-tokens.md`](../../../docs/design/autoapply-design-tokens.md)
6. [`STACK.md`](STACK.md)
7. [`IMPLEMENTATION_STEPS.md`](IMPLEMENTATION_STEPS.md)

## Non-negotiables

| Rule | Detail |
|------|--------|
| **Local only** | `frontend/` is the UI for the local application, not the public website. |
| **Theme-native first** | The local UI should prefer `--vscode-*` tokens and local `wg.*` token mapping. Do not paste the landing-page visual system directly into the host UI. |
| **Larry is primary** | Larry is the primary product surface in v1. Support UI is secondary. |
| **No fake backend responsibilities** | Do not put mic capture, session orchestration, OpenClaw policy, or bridge logic in the frontend. This UI renders local state; backend and sidecar own transport/orchestration. |
| **No OS-wide automation promise** | The local frontend may guide and explain; it must not imply arbitrary OS-wide mouse control as the main execution model. |
| **Accessibility required** | `aria-live`, keyboard focus, contrast, and reduced-motion handling are mandatory. |
| **CSP-safe assets** | Prefer local assets and CSP-friendly scripts/styles that can ship inside a host webview. |
| **Contract fidelity** | UI labels and states should align with `AssistantEnvelopeV1`, OpenClaw status, and glossary terms from the PRDs. |
| **V1 interaction model** | Larry uses `Control+Option+L` / `Control+Option+V` / `Control+Option+C` as the current documented defaults, follows by default, responds with a short bubble plus TTS, exposes mini chat as a secondary surface, and performs safe navigation only. |

## What this frontend renders

- Connection state: `Live`, `Degraded`, `Blocked`
- Larry wake/follow, voice, and mini chat control states
- Larry cursor-follow and self-move guidance states
- Larry guidance bubble text
- TTS speaking state
- High-risk confirmation UI
- Support UI fallback states

## What it does not own

- Mic device access
- OpenClaw session orchestration
- bridge auth or policy logic
- landing-page waitlist UX

## When uncertain

- Re-read [`docs/07_LOCAL_CURSOR_AND_COMPANION.md`](../../../docs/07_LOCAL_CURSOR_AND_COMPANION.md)
- Re-read [`backend/agents/docs/COMPANION_OVERLAY_UX_SPEC.md`](../../../backend/agents/docs/COMPANION_OVERLAY_UX_SPEC.md)
- Re-read [`backend/agents/docs/BACKEND_VS_LOCAL_RUNTIME.md`](../../../backend/agents/docs/BACKEND_VS_LOCAL_RUNTIME.md)
