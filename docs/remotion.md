# CursorBuddy hero MP4 — Claude Code prompt & spec

**For Claude Code:** Treat this file as your **single source of truth** for building the hero video. Follow **[Execution order for Claude Code](#execution-order-for-claude-code)** step by step. Use the rest of the document as **constraints and creative detail**, not optional flavor. Verify against **[Definition of done](#definition-of-done)** before you stop.

**For humans:** The sections below the execution block are the full readable spec (storyboard, camera, legal). The **[Copy-paste prompt block](#copy-paste-prompt-block-one-message)** is optional if you need one message without file context.

---

## Execution order for Claude Code

Do these **in order**. Do not skip verification steps.

1. **Choose a package location** (pick one and stick to it):  
   **`remotion-hero/`** at the **repository root** (recommended), **or** `landingpage/remotion/`. Document the path in a one-line `remotion-hero/README.md` (or `landingpage/remotion/README.md`) stating how to render.

2. **Scaffold a Remotion 4.x TypeScript project** in that folder (`remotion` CLI / official template is fine). Commit-friendly: include `package.json`, `src/Root.tsx`, entry composition, and Remotion config.

3. **Register one composition** named exactly **`HeroDemo`** with:
   - **`fps`:** `30`
   - **`width` × `height`:** `1920` × `1080` (or `1600` × `900` — if you change this, state it in README and keep consistent)
   - **`durationInFrames`:** `450` (15 seconds at 30fps). You may use `360–540` (12–18s) if the story needs it; **document the final value** in README and in `Root.tsx` comments.

4. **Implement the mock UI** (React + inline styles or CSS modules — your choice):
   - **Phase A–B:** Generic **dark IDE** (title bar, activity strip, editor area). **No** real logos (see [Trademark and visual fidelity](#trademark-and-visual-fidelity)).
   - **Phase C–D:** **SCM-inspired** view: changed files list, **Message** input, primary button labeled **Commit**.

5. **Implement two cursors:**
   - **User cursor:** standard pointer; animated path (arc or gentle figure-8).
   - **Agent cursor:** visually distinct (**#0066FF** / **#5AC8FA**, soft glow, optional trail). Position = **user position from 8–12 frames earlier** (frame-delay follow, not instant mirror).

6. **Implement scripted waveform** for the “speaking” beat: bar heights from **`interpolate`**, seeded pseudo-random, or similar — **not** Web Audio / microphone.

7. **Implement virtual camera** as a **single wrapper** around the full scene graph:
   - Per-frame **`translate` + `scale`** so the viewport tracks a **look-at** point and uses zoom presets **`establishing` (~1.0)**, **`medium` (~1.12–1.18)**, **`tight` (~1.28–1.38)** per [Virtual camera and zoom](#virtual-camera-and-zoom).
   - **Ease** look-at and scale (interpolate or spring). Respect **safe area** and **motion limits** in that section.

8. **Sequence the narrative** with Remotion **`Sequence`** components **or** an explicit frame → phase map in one module (e.g. `timeline.ts`). Phases **A → B → C → D → E** must match [Storyboard (phases A–E)](#storyboard-phases-ae).

9. **Copy and motion:**
   - Caption during speak: **“Where do I commit?”**
   - Callout during SCM beat: **“Here’s where you commit.”**
   - **Fake cursor** moves to **Message** and/or **Commit**; **press** animation (6–8 frames minimum of clear feedback).

10. **Loop:** Last frames must **visually match** the opening (camera zoom, look-at, cursor rest positions) so **`loop`** on a `<video>` tag does not jump. Use crossfade or hard cut only if the first and last frames are **pixel-aligned** for the visible mock.

11. **Render MP4:** Run Remotion’s render to a file under the repo, preferably:
    - **`landingpage/assets/cursorbuddy-hero-demo.mp4`**  
    so the marketing site can embed it later. Use **H.264 + AAC**. If `ffmpeg` is missing, **install it** or document the exact blocker in README — do not silently skip render.

12. **Optional but valuable:** Export one **poster** frame (e.g. PNG/WebP) next to the MP4 for future `<video poster>`.

**Out of scope unless the user explicitly asks:** Editing `landingpage/index.html`, Playwright tests, or adding `@remotion/player` to the deployed landing page.

---

## Definition of done

Claude Code is **not done** until **all** applicable items are true:

- [ ] `HeroDemo` exists, **30 fps**, documented **durationInFrames**, **1080p-class** dimensions.
- [ ] **User** + **agent** cursors behave as specified; agent lag is **8–12 frames** at 30fps.
- [ ] **Scripted** waveform only — **no** mic APIs.
- [ ] **Virtual camera** (translate + scale) follows **look-at** and uses **establishing / medium / tight** zoom across beats; no clipping of callouts/cursors inside [Safe area](#safe-area).
- [ ] Phases **A–E** are all present and ordered; **callout** text is exactly **“Here’s where you commit.”**
- [ ] **In-animation click** on commit UI is obvious (cursor + press/highlight).
- [ ] **Loop** is seamless or documented why a 1-frame crossfade is used.
- [ ] **MP4 file exists** at the path you chose (prefer **`landingpage/assets/cursorbuddy-hero-demo.mp4`**).
- [ ] **README** in the Remotion package includes the **exact** render command you used (copy-pasteable).
- [ ] **No** VS Code / Microsoft / Cursor **official** logos or trade-dress screenshots.

---

## Commands (reference — adjust paths to your scaffold)

After `npm install` in the Remotion package directory:

```bash
# List compositions (verify name HeroDemo)
npx remotion compositions

# Render (entry file may be src/index.tsx or src/root.tsx depending on template)
npx remotion render src/index.tsx HeroDemo ../landingpage/assets/cursorbuddy-hero-demo.mp4
```

If the entry path or composition id differs, **put the working command in README**.

**Dependency note:** Remotion rendering requires a working **ffmpeg** on the machine (or Remotion’s bundled flow per current docs). If render cannot run in the environment, implement the full composition anyway and leave README with the exact command for local render.

---

## Copy-paste prompt block (one message)

Use this when you cannot attach the file — it is a **compressed** version of the same contract (the sections above remain authoritative if anything conflicts).

```text
You are Claude Code working in the CursorBuddy repo. Build a Remotion 4.x TypeScript project (folder: remotion-hero/ at repo root OR landingpage/remotion/) that renders a looping MP4 for marketing.

Deliverables:
- Composition id: HeroDemo, 30fps, 1920x1080 (or 1600x900), duration 12-18s (e.g. 450 frames at 15s).
- Output file: landingpage/assets/cursorbuddy-hero-demo.mp4 (H.264+AAC). README with exact npx remotion render command.

Narrative (in order):
A) Dark generic IDE mock (no VS Code/Cursor/Microsoft logos). User cursor moves; agent cursor follows with 8-12 frame delay, styled #0066FF / #5AC8FA.
B) Scripted waveform (no microphone). Caption: "Where do I commit?"
C) Transition to SCM-inspired UI: changed files, Message field, Commit button.
D) Callout: "Here's where you commit." Fake cursor moves and clicks Commit (or message field) with clear press feedback.
E) Loop seamlessly back to A (match camera zoom, look-at, cursor rest).

Virtual camera: one wrapper transform translate+scale on entire scene; look-at lerps between focal points; zoom presets establishing ~1.0, medium ~1.15, tight ~1.33; ease motion; keep 6-8% safe margins at tight zoom; cap pan/zoom velocity.

Do not add Remotion Player to the landing page or edit index.html unless explicitly asked.
Verify: npx remotion compositions shows HeroDemo; render produces the mp4.
```

---

## Product intent

| Requirement | Detail |
|---------------|--------|
| **Deliverable** | One **looping MP4** (H.264 + AAC), suitable for `<video muted playsinline loop>` on the marketing site. |
| **No live features** | **No** visitor microphone, **no** `@remotion/player` on the public page for this hero. Waveforms are **fully scripted**. |
| **Click behavior** | **In-animation only**: a **fake cursor** moves and performs a **press** on the commit UI. No clickable HTML overlay for users on top of the video (unless added separately later). |
| **Narrative** | Show that CursorBuddy is an **agent cursor** that **follows** the user, react to **speech** with a **waveform**, then **navigate** to a **source-control / commit** view and **call out** where to commit, ending with a **scripted click**. |

---

## Trademark and visual fidelity

- **Do not** use official **Visual Studio Code**, **Microsoft**, or **Cursor** logos, wordmarks, or product icons.
- **Do not** reproduce proprietary UI pixel-perfectly. Build a **generic dark IDE mock**: title bar, activity strip, sidebar, editor area, then an **SCM-inspired** panel (changed files, message field, primary action button labeled e.g. “Commit”).
- **Rationale**: Avoid trademark and trade-dress issues; the video should read as “a desktop code editor” and “version control sidebar,” not a licensed screenshot.

**Brand alignment (recommended):** Agent accent **#0066FF**, secondary **#5AC8FA** — aligns with landing tokens in `landingpage/assets/styles.css` (`--landing-accent`, `--landing-info`).

---

## Composition constants

| Constant | Suggested value | Notes |
|----------|-----------------|--------|
| **FPS** | `30` | Easy math for frame ranges; 24 is acceptable if you prefer a softer cine look. |
| **Resolution** | `1920 × 1080` or `1600 × 900` | Export one size; scale in CSS on the site. Keep **safe margins** (below). |
| **Total duration (loop)** | `12–18 s` | Shorter loops feel snappier; longer loops allow slower camera moves. |
| **Cursor lag (agent)** | `8–12` frames behind user cursor at 30fps | Tweak until “follow” reads clearly without feeling broken. |

---

## Virtual camera and zoom

Implement a **2D virtual camera**: one wrapper around the **entire mock UI** (not a 3D camera). Each frame, apply **`translate` + `scale`** so the composition **pans** toward a **look-at point** and **zooms** to direct attention.

### Zoom presets (named states)

| Preset | Scale (relative) | Typical use |
|--------|------------------|-------------|
| `establishing` | `1.00` | Full window readable; loop reset, between beats. |
| `medium` | `1.12–1.18` | Following two cursors, waveform band, SCM overview. |
| `tight` | `1.28–1.38` | Commit field, button, callout text. |

**Rules of thumb**

- **Zoom in** when introducing a new idea: speech/waves, SCM layout, commit target.
- **Zoom out** briefly between major beats or to **match the first frame** for a seamless loop.
- **Ease** zoom and pan with `interpolate` (e.g. cubic) or a **spring** with low bounce so motion stays professional.

### Look-at (follow target)

For each phase, define a **look-at** `(lookAtX, lookAtY)` in **design coordinates** (same space as the full mock before camera transform). Suggested pattern:

- **Phase A (follow):** Track **user cursor** position; optionally use a weighted midpoint between **user** and **agent** cursors so both stay inside frame:  
  `lookAt = lerp(user, agent, 0.35)` (tunable).
- **Phase B (speak):** Move look-at toward the **waveform** (or caption + waveform), with a slight **zoom to `medium` or `tight`**.
- **Phase C (SCM):** Lerp look-at from editor toward **SCM sidebar + first file row**; zoom **`medium`**.
- **Phase D (callout + click):** Lerp to **message field** and/or **Commit** control; zoom **`tight`** while callout is visible.

**Transform hint:** If `W,H` are composition size, `s` is scale, and look-at is `(lx, ly)`:

- Center the viewport on the look-at after scaling, e.g. conceptually:  
  `translate( W/2 - lx * s, H/2 - ly * s )` then `scale(s)`  
  (order and signs depend on whether you transform from the top-left; match your Remotion/CSS convention.)

### Safe area

- At **`tight`** zoom, keep **at least ~6–8%** of comp width/height as **padding** between any **callout text**, **cursor tips**, and the frame edge.
- **Callouts** should sit in a **lower-third or top-third** band that remains inside safe area at max zoom.

### Motion limits (comfort)

- Cap **pan velocity** (e.g. max pixels per frame at 1080p equivalent) so the camera never “whips.”
- Cap **scale change per frame** when entering/exiting zoom (e.g. avoid &gt; ~0.02 scale units per frame spikes without easing).

### Web page (future embed)

When the MP4 ships on the site, respect **`prefers-reduced-motion`**: show a **poster image** or the existing static hero mock instead of autoplaying video. (Reference: `landingpage/index.html` hero `.hero-visual`.)

---

## Storyboard (phases A–E)

Lock **exact** frame ranges in code comments when you implement. Example assumes **30 fps** and **~15 s** total (**450 frames**); adjust proportionally if you change duration.

| Phase | Time (ex.) | Frames (ex.) | On-screen content | User / agent motion | Camera look-at | Zoom |
|-------|------------|--------------|-------------------|---------------------|----------------|------|
| **A — Follow** | 0–3.5 s | 0–105 | Generic dark IDE: editor + optional file tab. | **User cursor** moves on a simple path (arc or gentle figure). **Agent cursor** follows with **8–12f lag**, distinct style (accent color, soft glow, optional dotted trail). | Mostly **user cursor**; optional blend toward midpoint so **agent** stays visible. | Start **`establishing`**, ease to **`medium`** as motion starts. |
| **B — Speak** | 3.5–6.5 s | 105–195 | Same scene; caption: *“Where do I commit?”* | Cursors slow or hold near “speaking” pose. | **Waveform region** (and caption if present). | **`medium` → tight`** on waveform/caption band. |
| **C — SCM** | 6.5–9.5 s | 195–285 | **Crossfade or 10–15f push** to SCM-inspired layout: activity strip, changed files, **Message** field, **Commit** button. | Cursor(s) idle or small move toward sidebar. | Lerp from prior focal point to **SCM panel** (files list + message area). | Ease to **`medium`**; brief **`establishing`** optional if layout is wide. |
| **D — Callout + click** | 9.5–13.5 s | 285–405 | SCM holds steady. | **Fake cursor** moves to **Message** and/or **Commit**; **press** animation (scale down 6–8f + ripple or highlight ring). | **Commit control** or message field during click. | **`tight`** on target during callout and click. |
| **E — Loop** | 13.5–15 s | 405–450 | Fade or cut back toward **phase A** first frame. | Reset cursor positions if needed for seamless loop. | Lerp back to **phase A** look-at. | Zoom out to **`establishing`** to match loop start. |

**Callout copy (on-screen text):**  
**“Here’s where you commit.”** — Fade or short typewriter; must remain inside **safe area** at `tight` zoom.

**Waveform:** Deterministic bars driven by `interpolate`, seeded noise, or a **silent reference audio** spectrum in Remotion — **not** tied to the user’s microphone.

---

## Scene layering (suggested)

Order from back to front:

1. IDE chrome background (sidebar, editor placeholder).
2. Content (fake code lines or neutral blocks — avoid real project/code that needs a license).
3. Waveform + caption.
4. Cursors (user + agent) with trails as needed.
5. Callout typography / bubble.
6. Optional vignette or subtle grain (very light) for polish.

---

## Audio (optional)

- MP4 **can be silent** (still valid for muted autoplay).
- If you add audio: short **whoosh** on transitions + optional **UI tick** on click — keep levels low; **do not** imply recording the user.

---

## Architecture (landing site — later)

When integrating into the repo after the MP4 exists:

- **Authoring**: Package at `remotion-hero/` or `landingpage/remotion/`, Remotion 4.x, composition **`HeroDemo`**.
- **Render**: `npx remotion render …` → e.g. `landingpage/assets/cursorbuddy-hero-demo.mp4` (+ optional poster).
- **Site**: `<video>` in `landingpage/index.html` hero; **CSP** `default-src 'self'` allows same-origin MP4.
- **Tests**: `landingpage/tests/smoke.spec.js` for `video` or poster.

---

## Implementation backlog (site integration — deferred)

- [ ] Embed `<video>` in `landingpage/index.html` hero; CSS aspect-ratio; `prefers-reduced-motion` fallback.
- [ ] Update Playwright smoke test for video/poster.

---

## Reference in this repo

- Static hero structure: `landingpage/index.html` (`.hero-visual`).
- Visual tokens: `landingpage/assets/styles.css` (`--landing-accent`, etc.).
