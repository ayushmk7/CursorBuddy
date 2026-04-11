# Frontend stack — local application UI

This document is normative for the **local frontend** in `frontend/`.

## Folder meaning

`frontend/` is for the **on-device product UI** only:

- Larry as the primary guide surface
- support UI presentation
- local visual states for confirmations and status

It is **not** the marketing website and **not** a Next.js app.

## Recommended implementation shape

| Layer | Choice | Role |
|------|--------|------|
| Markup | HTML | Webview-friendly structure and prototype preview |
| Styling | CSS custom properties | Theme bridge, `wg.*` token mapping, reduced-motion support |
| Interactivity | Vanilla JS | Lightweight state handling, cursor-follow mode, self-move guidance mode, no framework requirement |
| Assets | Local static files | CSP-safe packaging for eventual host embedding |

## Design rules

| Topic | Guidance |
|------|----------|
| **Theme model** | Prefer host theme variables (`--vscode-*`) with local fallbacks for preview mode. |
| **Token source** | Use `docs/design/autoapply-design-tokens.md` Part B for `wg.*` spacing, radius, type, color, and waveform tokens. |
| **Surface priority** | Larry is required for v1. Support UI is secondary and must not become the main product surface. |
| **Interaction model** | Use the documented default controls `Control+Option+L`, `Control+Option+V`, and `Control+Option+C` as the current baseline. |
| **Motion** | Keep motion subtle and functional; respect `prefers-reduced-motion`. |
| **Accessibility** | `aria-live`, visible focus rings, readable contrast, keyboardable controls. |
| **CSP** | Assume eventual embedding inside a strict host webview. Prefer local scripts and styles only. |

## What not to build here

- landing-page hero or waitlist UI
- Next.js routes or marketing-site data flows
- Postgres or Redis integrations
- bridge/backend auth logic
- mic capture or OpenClaw orchestration

## Data model expectations

The frontend should be ready to render local session state such as:

- connection status
- Larry cursor-follow versus self-move guidance state
- Larry bubble guidance text
- TTS speaking state
- mini chat expansion state
- confirmation requirements
- support UI fallback states

These are derived from the local runtime and `AssistantEnvelopeV1`, not from marketing-site APIs.
