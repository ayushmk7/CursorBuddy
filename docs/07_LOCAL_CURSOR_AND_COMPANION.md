# CursorBuddy — Larry Overlay And Local Experience (Design + UX PRD)

**Project:** CursorBuddy  
**Version:** 1.0  
**Date:** April 2026  

**Purpose:** This document specifies everything that runs on the user's computer for Larry, the cursor-following guide inside CursorBuddy. The public website is waitlist-only; the real product experience is Larry inside VS Code.

Tone check: this should feel a little vibe-coded in the best way. Larry is not supposed to feel like enterprise middleware wearing a face. Larry should feel light, present, and helpful, like a guide that is already there when you need it.

---

## 1. Scope & Layers

| Layer | Where it runs | Role |
|-------|----------------|------|
| **Larry overlay** | Inside VS Code | Primary user-facing guide surface |
| **VS Code Extension Host** | Inside VS Code | Orchestrates sidecar, executes `AssistantEnvelopeV1`, exposes minimal support UI |
| **Minimal support UI** | Inside VS Code | Auth, settings, logs, blocked/error states |
| **Sidecar process** | Local machine | Audio I/O, TTS playback, OpenClaw transport |

**Normative for v1:** Ship Larry as the primary surface inside VS Code. Support UI is secondary and minimal. Sidebar-first product framing is not the v1 direction.

---

## 2. Brand Relationship to Marketing Site

The landing page uses liquid-glass marketing language. The local product should stay visually consistent with the brand without pretending to be the marketing site inside VS Code.

**Strategy:**

- **Larry overlay:** small, crisp, readable, cursor-adjacent, and clearly alive when listening or speaking
- **Support UI:** theme-native first using `var(--vscode-*)`
- **Branding:** CursorBuddy remains the product name; Larry is the in-product guide

---

## 3. Primary UX Surface — Larry

### 3.1 Core behavior

Larry is the primary surface the user interacts with in v1.

Larry must:

- follow the user's working context inside VS Code
- use `Control+Option+L` as the current documented default for wake/follow
- use `Control+Option+V` as the current documented default for voice input
- use `Control+Option+C` as the current documented default for the mini chat
- treat voice as the primary interaction path
- show short transient text guidance as a comic-style pop-out bubble from Larry itself
- speak the same guidance using TTS when available
- move on its own only after the user directs it somewhere relevant inside VS Code
- point the user toward the relevant VS Code surface and explain what happens next

Larry must not:

- act like a detached chat panel
- imply generic OS-wide automation in v1
- require a sidebar as the main path for ordinary guidance

The feel we want:

- fast to understand
- visually attached to where you are working
- low-friction enough that asking Larry feels easier than hunting through menus
- opinionated enough to guide, but not so aggressive that it feels like automation taking over

### 3.2 Default controls

The current documented defaults are macOS-first:

- `Control+Option+L` wakes Larry and keeps Larry in follow mode
- `Control+Option+V` starts a voice request
- `Control+Option+C` toggles the mini dropdown chat

These should be documented as current defaults, not as a permanent API promise. Later configuration is allowed. The point for now is to keep the docs concrete enough that implementation does not drift.

### 3.3 Example flow

1. The user is in VS Code.
2. Larry is awake and following the user's cursor.
3. The user presses `Control+Option+V`.
4. The user says, "Larry, how do I commit?"
5. Larry moves on its own to Source Control.
6. Larry opens Source Control.
7. Larry shows a short comic-style bubble and optionally speaks:
   - where the commit message goes
   - where the commit action lives
   - what the user should do next
8. If the user wants follow-up detail, the mini chat can drop down from Larry after arrival.

### 3.4 Support UI boundary

Minimal support UI is still allowed for:

- auth entry
- settings
- logs/output
- blocked or degraded state messaging
- fallback transcript/history if needed

That UI is not the primary product experience.

### 3.5 Mini chat timing

The mini chat is secondary. It should not feel like the main product surface.

Use it for:

- follow-up questions after Larry reaches a destination
- brief transcript/history when the user wants more context
- lightweight clarification when a short bubble is not enough

Do not use it as:

- a large persistent assistant panel
- the default place where every interaction starts
- a replacement for Larry's cursor-adjacent guidance

### 3.6 Simple local web version

Before the full extension implementation is done, it is valid to build a simple local web version of Larry that runs at a local URL and just shows the intended states and flow.

That preview should:

- show Larry as a blue cursor with a tiny status dot
- use green for idle, yellow for thinking, and red for error
- show Larry following the user cursor until directed somewhere
- show Larry moving on its own during a safe-navigation guidance moment
- show the "Larry, how do I commit?" flow
- show a transient comic-style bubble plus TTS-oriented guidance text
- show the mini dropdown chat in a minimal way after Larry reaches a destination
- be treated as a visual proof-of-feel, not as the real architecture

This is useful when we want to vibe-check the product quickly before the full VS Code + sidecar + OpenClaw path is wired up.

---

## 4. Larry Visual Spec

### 4.1 Shape and presence

- **Shape:** blue cursor-first guide surface, not a floating chat card
- **Size:** small enough to feel lightweight, large enough to stay visible against editor content
- **Offset:** 12-24px from the cursor/work point, with collision-aware flipping for bubble placement
- **Motion:** smooth but restrained; never distracting

### 4.2 State-dot semantics

Larry uses a tiny status dot for the most important resting/error states:

- **Green** — idle and ready
- **Yellow** — thinking / processing a request
- **Red** — blocked or error state

Listening, speaking, and guiding should be communicated primarily through motion, bubble text, and subtle supporting cues rather than by inventing a second competing dot-color system.

### 4.3 Bubble behavior

- bubble text should appear as a short comic-style pop-out from Larry itself
- bubble text should stay brief and contextual
- the bubble should disappear once the guidance moment has passed
- TTS should speak the same guidance when enabled
- the bubble should never turn into a giant persistent panel

### 4.4 Movement rules

- when awake, Larry follows the user's main cursor by default
- when the user asks Larry to go somewhere safe inside VS Code, Larry moves there on its own
- once Larry reaches the destination, Larry explains the next user action
- after guidance completes, Larry can return to an ordinary follow posture

### 4.5 Visual language

- clean system-style typography
- strong readability over editor content
- limited brand accent outside the blue Larry cursor identity
- high contrast in light, dark, and high-contrast themes
- no gaudy equalizer visuals

---

## 5. Safe-Navigation Behavior

Larry v1 may perform safe navigation only.

Allowed examples:

- open Source Control
- reveal a safe panel or file tree location
- move focus to a safe surface
- highlight where the next user action should happen

Not default v1 behavior:

- destructive Git actions
- arbitrary command execution
- generic OS-level automation

---

## 6. Motion & Performance

- Larry should update position smoothly without causing extension-host churn.
- Following the user cursor should feel stable and lightweight.
- Autonomous movement toward a safe destination should be deliberate, readable, and fast.
- Bubble and speaking cues should be lightweight and low-frequency.
- TTS playback should not block navigation or UI responsiveness.
- Any fallback UI should update more slowly and less often than the primary overlay.

---

## 7. Accessibility

- Larry's spoken content should also exist as visible bubble or chat text.
- High-contrast themes must preserve overlay legibility.
- Support UI should expose accessible logs/status for blocked states.
- TTS should be optional or degradable if unavailable.
- The mini chat should remain readable without becoming the main required interaction surface.

---

## 8. Engineering Constraints

- VS Code remains the only supported host in v1.
- The product should use structured VS Code state as primary grounding.
- No screenshot-first perception path is required for the main product flow.
- No full landing-page embed inside product UI.
- Any support UI must stay lightweight and CSP-safe.

---

## 9. Design Deliverables

1. Larry idle/thinking/error status-dot behavior
2. Larry follow mode and self-move guidance mode
3. Source Control guidance flow mock
4. Blocked/error handoff to support UI
5. Theme variants for light, dark, and high contrast

---

## 10. Related Documents

- `docs/05_FRONTEND_PROMPT.md` — marketing site only
- `docs/design/autoapply-design-tokens.md` — shared visual tokens
- `docs/02_TECHNICAL_PRD.md` — IPC, envelopes, OpenClaw
- `docs/01_GENERAL_PRD.md` — product behavior and scope
