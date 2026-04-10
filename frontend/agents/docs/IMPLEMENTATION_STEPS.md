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

**Goal:** Create a runnable local UI prototype that previews the sidebar and overlay surfaces.

**Outputs:**

- `frontend/index.html`
- `frontend/assets/styles.css`
- `frontend/assets/app.js`

**Verification:**

- The prototype opens locally in a browser and renders without external dependencies.

---

## Phase 2 — Sidebar webview shell

**Goal:** Build the primary local surface.

**Outputs:**

- Header with product mark, connection pill, and latency hint
- Push-to-talk region with waveform or level visualization
- Transcript section
- Step / plan list
- Safety footer

**Verification:**

- Layout works at desktop and narrow widths.
- Focus states are visible and semantic regions are present.

---

## Phase 3 — Overlay capsule

**Goal:** Implement the cursor-adjacent companion preview.

**Outputs:**

- Overlay capsule with caption text
- Pointer-follow positioning with edge-aware flipping
- Reduced-motion-safe waveform presentation

**Verification:**

- Overlay follows pointer within the preview stage without clipping.
- Reduced motion removes decorative movement while keeping state legible.

---

## Phase 4 — Session states and confirmations

**Goal:** Represent real local product states from the PRDs.

**Outputs:**

- `Live`, `Degraded`, and `Blocked` states
- Listening / thinking / confirm states
- High-risk confirmation card or modal

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
- state how the prototype maps to the sidebar and overlay docs
