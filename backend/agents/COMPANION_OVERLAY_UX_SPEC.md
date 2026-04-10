# Companion overlay UX specification

**Status:** Normative for **agent implementation** and product QA. Extends [`docs/07_LOCAL_CURSOR_AND_COMPANION.md`](../../docs/07_LOCAL_CURSOR_AND_COMPANION.md) §4 with **shortcut**, **streaming layout**, and **PRD tension** called out below.

## PRD tension and stance

- [`docs/01_GENERAL_PRD.md`](../../docs/01_GENERAL_PRD.md) limits **OS‑wide** scope in v1 (no generic “move the mouse anywhere” automation).
- [`docs/07_LOCAL_CURSOR_AND_COMPANION.md`](../../docs/07_LOCAL_CURSOR_AND_COMPANION.md) allows an **optional overlay**: pointer‑anchored caption + waveform.

**Stance for this repo:** Ship the **pointer‑locked capsule** as a **v1 goal on macOS** where OS permissions and performance allow; **degrade** gracefully to **editor decorations + sidebar webview** on unsupported platforms or when the user denies accessibility/screen permissions. “Guide the user” is implemented via **`AssistantEnvelopeV1`** (text + allowlisted actions), not OS‑level mouse control.

## Vision

- A **single** lightweight surface **anchored near the system pointer** (below‑right by default), visually **attached** to the cursor (speech‑bubble / callout tail optional in a later polish pass).
- **No separate application window** dedicated to chat: the capsule is the **only** floating assistant chrome for inline feedback. The **sidebar webview** remains for transcript, steps, confirmations, and settings ([`docs/07_LOCAL_CURSOR_AND_COMPANION.md`](../../docs/07_LOCAL_CURSOR_AND_COMPANION.md) §3)—not an extra “popup app,” but the existing product surface.
- When **not** in voice/interaction mode, the companion **may** show a minimal idle state (dot or thin wave) that **follows** the pointer at throttled rate, or **hide** entirely until the chord arms interaction—**product choice:** default = **follow idle indicator** until dismissed by settings.

## Global shortcut (macOS default)

| Input | Role |
|-------|------|
| **⌃⌥⌘** — Control + Option + Command (same physical chord, user‑rebindable) | **Arms voice turn:** press‑and‑hold **or** tap‑to‑toggle **listening** (pick **one** default for v1: **press‑and‑hold** recommended for fewer accidental hot mics). |

**Implementation note:** Express as a `keybindings` contribution in the extension; avoid hardcoding scan codes. Document the default in README and settings.

### Windows / Linux

- No single canonical triple‑modifier; ship **defaults per platform** and allow **user override** in `keybindings.json` ([`docs/02_TECHNICAL_PRD.md`](../../docs/02_TECHNICAL_PRD.md) §2.1).

## Voice and processing flow

1. User holds (or toggles) chord → sidecar **starts capture** (subject to mic permission).
2. Audio streams to **OpenClaw** per architecture; `assistant_text` and optional incremental tokens arrive on the **local** transport.
3. **Capsule** shows **streaming text** as chunks arrive (ChatGPT‑style reveal: growing height, multi‑line wrap).
4. When the turn completes, **actions** in `AssistantEnvelopeV1` run through the executor; capsule may **summarize** or **echo** final `assistant_text`; highlights/reveals happen per envelope.

## Pointer follow

- Update position on pointer move **throttled** to **30–60 Hz** max ([`docs/07_LOCAL_CURSOR_AND_COMPANION.md`](../../docs/07_LOCAL_CURSOR_AND_COMPANION.md) §5).
- Offset **12–24 px** below‑right of the pointer; **flip** to above‑left when near screen edges (**collision detection**).
- **Do not** block the extension host thread; overlay process or compositor thread owns layout.

## Streaming text layout (normative)

| Rule | Detail |
|------|--------|
| **Growth** | Start at **one line** min height; **grow vertically** as wrapped lines increase, up to **`max_height`** (~40–50% of viewport height or **280–360 px**, whichever is smaller—tune in implementation). |
| **Scroll** | After `max_height`, **inner scroll** with subtle fade at bottom edge; no separate window resize by the user. |
| **Wrapping** | Hard wrap at capsule **max width** ~**280–320 px** (aligns with §4.2 of local PRD). |
| **Typography** | System UI **12–13 px**; instruction weight **500**; monospace for command IDs when shown. |
| **Animation** | Optional caret or fade‑in per chunk; **respect `prefers-reduced-motion`** → static text updates, no decorative motion ([`docs/07_LOCAL_CURSOR_AND_COMPANION.md`](../../docs/07_LOCAL_CURSOR_AND_COMPANION.md) §4.3, §6). |
| **Clearing** | New user turn **clears** or **archives** prior bubble content per session policy (default: clear on new listen arm). |

## Visual baseline (aligned with PRD §4.2)

- Rounded rect or pill, **12–16 px** radius; frosted translucent fill where supported; solid high‑contrast fallback in **high contrast** themes.
- Border **1 px** subtle; shadow for separation from busy backgrounds.

## Accessibility

- Overlay is **visually supplemental**. **Same** critical content MUST appear in the **sidebar** transcript with **`aria-live="polite"`** on the webview side ([`docs/07_LOCAL_CURSOR_AND_COMPANION.md`](../../docs/07_LOCAL_CURSOR_AND_COMPANION.md) §6).
- If overlay is non‑interactive, decorative waveform may be **`aria-hidden`**; spoken/announced content still in sidebar.

## Failure and degrade modes

| Condition | Behavior |
|-----------|----------|
| Overlay unavailable | Sidebar + status bar + **editor decorations** only. |
| OpenClaw blocked | Show blocked state in sidebar; capsule **short** error string or hide. |
| Mic denied | Sidebar message + text‑only input fallback ([`docs/07_LOCAL_CURSOR_AND_COMPANION.md`](../../docs/07_LOCAL_CURSOR_AND_COMPANION.md) §3.3). |

## Related

- [`BACKEND_VS_LOCAL_RUNTIME.md`](BACKEND_VS_LOCAL_RUNTIME.md)
- [`docs/02_TECHNICAL_PRD.md`](../../docs/02_TECHNICAL_PRD.md) §4 (`assistant_text`)
- [`docs/07_LOCAL_CURSOR_AND_COMPANION.md`](../../docs/07_LOCAL_CURSOR_AND_COMPANION.md)
