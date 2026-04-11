# Frontend implementation steps — local application UI

Phased build order for the **local frontend** in `frontend/`.

This folder is for the **on-device UI only**. Do not use these steps for `landingpage/`.

## How to use this file

- Implement phases in order unless a task explicitly narrows scope.
- Each phase should end with a visual or functional verification step.
- If a phase is intentionally skipped, document why.

---

## Phase 0 — Scope and boundary lock

**Goal:** Make the local-vs-marketing boundary explicit.

**Outputs:**

- `frontend/README.md` states this folder is for local application UI only.
- Agent docs explicitly say `landingpage/` is out of scope unless requested.

**Verification:**

- A new contributor can tell, from `frontend/` docs alone, that this folder is not for the waitlist site.

---

## Phase 1 — Local frontend scaffold

**Goal:** Create a runnable local UI prototype that previews Larry and the minimal support UI.

**Outputs:**

- `frontend/index.html`
- `frontend/assets/styles.css`
- `frontend/assets/app.js`

**Verification:**

- The prototype opens locally in a browser and renders without external dependencies.

---

## Phase 2 — Sidebar webview shell

**Goal:** Build Larry as the primary local surface.

**Outputs:**

- Larry shell with blue cursor identity and green idle / yellow thinking / red error dot semantics
- Cursor-follow mode and self-move guidance mode
- Cursor-adjacent transient bubble guidance text
- Documented default controls for wake/follow, voice, and mini chat
- Safe-navigation guidance examples

**Verification:**

- Larry states are visually distinct and readable.
- Guidance remains legible in light, dark, and narrow layouts.

---

## Phase 3 — Minimal support UI

**Goal:** Implement the secondary support surface for setup and failure states.

**Outputs:**

- Auth and settings states
- Logs/status surface
- Fallback transcript/history if needed
- Confirmation UI for non-safe actions

**Verification:**

- Support UI is clearly secondary to Larry.
- Blocked and setup states are understandable without becoming the main product surface.

---

## Phase 4 — Session states and confirmations

**Goal:** Represent real local product states from the PRDs.

**Outputs:**

- `Live`, `Degraded`, and `Blocked` states
- thinking / confirm states
- mini chat open / closed secondary states
- High-risk confirmation card or modal
- TTS speaking state

**Verification:**

- Status changes update the UI copy and emphasis correctly.
- High-risk state is clearly separated from read-only guidance.

---

## Phase 5 — Theme bridge and accessibility

**Goal:** Keep the local frontend host-native and accessible.

**Outputs:**

- CSS variables that map to `--vscode-*` style tokens with fallbacks
- Dark, light, and high-contrast preview modes
- `aria-live` transcript region and keyboardable controls

**Verification:**

- Theme switching is visually coherent.
- High contrast remains readable.

---

## Phase 6 — Host integration readiness

**Goal:** Prepare the prototype for eventual embedding in the extension/webview.

**Outputs:**

- Clear state model in JS for host-driven updates
- CSP-safe asset structure
- Minimal assumptions about backend/network ownership

**Verification:**

- The UI can be driven from local state objects rather than hardcoded DOM mutations only.

---

## Done check

Before claiming completion:

- confirm `frontend/` clearly reads as local application UI only
- confirm `landingpage/` was left untouched
- run a local preview or static verification
- state how the prototype maps to Larry and support UI docs
