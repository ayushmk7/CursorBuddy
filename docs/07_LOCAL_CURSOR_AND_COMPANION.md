# CursorBuddy — Local Cursor, Overlay & In-Editor Companion (Design + UX PRD)

**Project:** CursorBuddy  
**Version:** 1.0  
**Date:** April 2026  

**Purpose:** This document specifies everything that runs **on the user’s computer**: the **VS Code extension** UI, optional **native overlay** (cursor-adjacent hints, waveform), **sidecar** status, and how the **local** experience relates to the **liquid-glass marketing site** (`docsforother/05_FRONTEND_PROMPT.md`). The public website is **waitlist-only**; **this** is the product surface users live in.

---

## 1. Scope & Layers

| Layer | Where it runs | Role |
|-------|----------------|------|
| **VS Code Extension Host** | Inside VS Code | Orchestrates sidecar, executes `AssistantEnvelopeV1`, Git adapters |
| **VS Code Webview (sidebar)** | Sandboxed webview | Transcript, steps, mic, OpenClaw status, confirmations |
| **Sidecar process** | macOS / Windows / Linux | Audio I/O, OpenClaw transport; may own **overlay** window if implemented |
| **Optional overlay surface** | OS-level transparent window (optional v1+) | Cursor-following or cursor-adjacent caption, wave decoration |

**Normative for v1:** Ship **sidebar webview + sidecar**; **overlay** is optional enhancement when OS APIs and performance allow.

---

## 2. Brand Relationship to Marketing Site

The **landing page** uses **AutoApply-parity liquid glass** (warm canvas, frosted panels, extreme type). The **local** product cannot paste that pixel-for-pixel into VS Code (theme conflicts, CSP, accessibility).

**Strategy:**

- **In-editor (webview):** **Theme-native first**—consume `var(--vscode-*)` for backgrounds and text. Use **CursorBuddy accent** only for primary actions and recording state, aligned with user’s theme (pick `#0066FF` only when theme allows contrast; otherwise use `textLinkForeground`).
- **Optional overlay:** May use **stronger brand glass** (subtle blur, soft white translucent capsule) so it reads as **CursorBuddy** floating over **any** app—but keep **small footprint** and **high contrast** for WCAG on arbitrary wallpapers.
- **Wordmark / icon:** Same logotype system as web where space allows (monochrome or single accent).

---

## 3. VS Code Sidebar Webview — Information Architecture

### 3.1 Vertical regions (top → bottom)

1. **Header** — Wordmark (text or tiny SVG), **OpenClaw** status pill (Live / Degraded / Blocked), optional **RTT / latency** hint (monospace, small).
2. **Session strip** — Push-to-talk (large hit target), input level meter, **waveform** while user speaks or while assistant streams audio.
3. **Transcript** — User bubbles right; assistant left; optional redacted mode (“Listening…” only).
4. **Plan / steps** — Numbered rows; icons for pending / running / done / blocked; expandable technical detail (`executeCommand` target).
5. **Safety footer** — High-risk actions: summary + **Cancel** (default) + **Confirm**.

### 3.2 Modals (high-risk Git / destructive)

- Glass-styled **within webview** constraints: rounded panel, clear hierarchy, monospace for resolved command ID.
- Focus trap; `Esc` → cancel.

### 3.3 Empty & error states

| State | UX |
|-------|-----|
| No OpenClaw token | CTA → open settings; short explanation |
| OpenClaw unreachable | **Blocked** pill + troubleshooting line |
| Mic denied | Text-only input fallback; link to OS privacy |
| Sidecar crashed | “Restart session” primary; log snippet in output channel |

---

## 4. The “Local Cursor” Concept

### 4.1 Vision (product)

A **companion** that feels tied to **where the user is working**: not a disconnected chat panel only. Implementations:

- **Minimum:** Sidebar + **editor decorations** (highlight line / range OpenClaw referenced) + **reveal** SCM / files.
- **Enhanced:** **Overlay** anchored to **screen cursor** or **editor caret** (platform-dependent): small **glass capsule** with **one-line caption** + optional **waveform** when speaking.

### 4.2 Overlay — visual spec (when shipped)

- **Shape:** Pill or **rounded rect** (12–16px radius), max width ~320px, **frosted** `rgba(255,255,255,0.55)` + `backdrop-filter: blur(24px)` on macOS/Windows where supported; fallback solid near-white.
- **Border:** 1px `rgba(255,255,255,0.65)`.
- **Shadow:** `0 8px 30px rgba(0,0,0,0.12)`—enough to separate from busy IDE screenshots.
- **Typography:** System UI font 12–13px; **caption** weight 500 for instruction; monospace 11px for command IDs (optional expand).
- **Waveform:** Thin **sonar** lines (2px stroke), accent color; **no** neon bar equalizer cliché; **respect reduced motion** → static level dot.
- **Offset from cursor:** 12–24px below-right of pointer; flip above-left if near screen edge (collision detection).

### 4.3 Platform notes

- **macOS:** `NSWindow` level or Electron transparent window; **Screen Recording** / **Accessibility** may be required for global cursor follow—document in onboarding.
- **Windows:** Similar transparent topmost window; DPI awareness mandatory.
- **VS Code only (no global overlay):** All of §4.2 can be **degraded** to **status bar** + sidebar-only; still “local,” just not cursor-locked.

---

## 5. Motion & Performance

- **Sidebar:** 180–220ms ease-out for status changes; no infinite spinners—use **breathing** border on glass for “thinking.”
- **Overlay:** Position updates **throttled** to 30–60 Hz max to avoid GPU churn; **do not** block Extension Host.
- **Waveform:** Driven by **RMS** from sidecar; cap repaint rate.

---

## 6. Accessibility

- Webview: `aria-live="polite"` for assistant text; visible **focus rings**; all icons with labels.
- Overlay: if non-interactive, `aria-hidden` on decorative wave; **spoken** content still duplicated in sidebar for screen readers.
- **High contrast** VS Code theme: overlay must increase border contrast or switch to **solid** fill.

---

## 7. Icons & Assets

- Prefer **Codicons** in webview where possible.
- Custom: **wave** mark (2–3 parallel curves), monochrome; matches landing favicon.

---

## 8. Engineering Constraints (Design Handoff)

- Webview: strict **CSP**, `webview.asWebviewUri`, no remote scripts unless allowlisted.
- Overlay: if separate process, **sign** binaries; **not** in Marketplace VSIX if unsigned per platform rules—document packaging.
- **No** embedding full landing page inside webview—lightweight bundle only.

---

## 9. Figma Deliverables (Local)

1. Sidebar — light / dark / high-contrast VS Code themes.
2. High-risk modal.
3. Overlay capsule — light wallpaper + dark IDE screenshot backgrounds.
4. Component sheet: pills, transcript bubbles, step rows, PTT button states.

---

## 10. Related Documents

- `docsforother/05_FRONTEND_PROMPT.md` — **Web** landing + waitlist (liquid glass, AutoApply-aligned)
- `docsforother/design/autoapply-design-tokens.md` — `wg.*` tokens for webview; landing hex reference
- `docsforother/02_TECHNICAL_PRD.md` — IPC, envelopes, OpenClaw
- `docsforother/01_GENERAL_PRD.md` — product flows
