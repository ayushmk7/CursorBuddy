# CursorBuddy — Frontend Design Prompt (Figma AI)

## Scope (read first)

This document defines the **public marketing website only**: a **liquid-glass landing page** with **waitlist** (and minimal supporting chrome—footer, legal links, post-submit confirmation). It is intentionally aligned with **`docs/05_FRONTEND_PROMPT.md`** (AutoApply): same anti–“AI slop” bar, same typography extremes, same glass system, same motion philosophy.

**Out of scope here:** The **live product**—Larry inside CursorBuddy, the VS Code runtime, sidecar, support UI, and anything that runs **on the user’s computer**—is specified in **`docs/07_LOCAL_CURSOR_AND_COMPANION.md`**. Do not design the product chrome as if it lived on this site.

---

## Design Direction

Design a **single primary experience**: a landing + waitlist site for **CursorBuddy**, a developer product where **Larry** is the local guide inside VS Code (OpenClaw-orchestrated; the editor does the real work locally). The visual language should feel like **Apple’s liquid glass**: translucent layers, frosted glass panels, soft depth, light refraction, smooth rounded surfaces—panels of glass floating over a soft gradient canvas.

**This must not look AI-generated.** No purple-blue gradients. No generic SaaS dashboard look. No Inter at weight 400 as the hero of the layout. No flat cards with heavy drop shadows. The goal is something a visitor would screenshot and share because it looks that good—not because it screams “chatbot.”

Think: **Apple Vision Pro UI** meets **Linear** meets **Vercel**—translucent, layered, precise, intentional color moments.

---

## Design System Tokens

### Typography — Use Extremes

**Go to extremes:** 100–200 (thin) vs 800–900 (black), not safe 400 vs 600. Hierarchy through **weight contrast**, not only size.

**Font pairing (same as AutoApply):**

```
Display / Headings: 'SF Pro Display' or 'Space Grotesk' at weight 700–900, tight letter-spacing (-0.03em)
Body: 'SF Pro Text' or 'Inter' at weight 200–300, slight letter-spacing (0.01em)
Monospace (waitlist count, micro-trust, “Built for VS Code” labels): 'JetBrains Mono' or 'SF Mono' at weight 400
```

Do not use medium weights (400–600) for display or body except monospace data.

### Color Theme — Liquid Glass

Background: soft, muted gradient. Not vibrant cyberpunk. Early morning fog with hints of color.

```
Canvas / Background:       #F2F0ED (warm off-white, not pure white)
Glass Panel Background:    rgba(255, 255, 255, 0.45) with backdrop-filter: blur(40px)
Glass Panel Border:        rgba(255, 255, 255, 0.6) (1px, subtle edge catch)
Glass Panel Shadow:        0 8px 32px rgba(0, 0, 0, 0.06)

Text Primary:              #1A1A1A
Text Secondary:            #6B6B6B
Text Tertiary:             #9B9B9B

Accent (Primary CTA):      #0066FF (clean blue, not purple)
Accent Success:            #00B341
Accent Warning:            #F5A623
Accent Danger:             #FF3B30
Accent Info:               #5AC8FA

Waitlist / trust accents (use sparingly):
  Subtle blue tint panel:   rgba(0, 102, 255, 0.04)
  Success confirmation:     rgba(0, 179, 65, 0.06)
```

Canvas: very subtle **radial** gradient—barely warm (peach/pink) one corner, barely cool (blue) opposite—so glass has something to refract against.

### Glass Effect (All Panels, Cards, Waitlist Form)

```
background: rgba(255, 255, 255, 0.45);
backdrop-filter: blur(40px) saturate(1.8);
-webkit-backdrop-filter: blur(40px) saturate(1.8);
border: 1px solid rgba(255, 255, 255, 0.6);
border-radius: 20px;
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
```

Nested elements (form fields inside waitlist card):

```
background: rgba(255, 255, 255, 0.3);
border-radius: 16px;
border: 1px solid rgba(255, 255, 255, 0.5);
```

### Motion — Orchestrated Page Load

Prioritize **page-load choreography** over scattered micro-interactions. Staggered reveals; intentional entrance.

```
Base: elements start invisible.

.fade-in {
  opacity: 0;
  animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.stagger-1 { animation-delay: 0.1s; }
.stagger-2 { animation-delay: 0.2s; }
.stagger-3 { animation-delay: 0.3s; }
.stagger-4 { animation-delay: 0.4s; }
.stagger-5 { animation-delay: 0.5s; }

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
```

Hero glass may **scale** from 0.97 → 1.0 on enter. Waitlist card staggers after hero. Optional: subtle **noise** overlay on canvas at 2–3% opacity (same tactile idea as AutoApply).

### Spacing

```
--space-xs: 4px
--space-sm: 8px
--space-md: 16px
--space-lg: 24px
--space-xl: 40px
--space-2xl: 64px
```

Generous padding inside glass (24–40px). Card gaps 16–24px. **Spacious, not cramped.**

### Border Radius

```
Large panels / waitlist card: 20px
Inner fields:                  10–12px
Buttons:                       12px
Pills / badges:                999px
```

Everything rounded; no sharp corners.

---

## Avoid These (AI Slop Checklist)

Do **NOT** use:

- Inter or Roboto as primary display at weights 400–600
- Purple–blue gradient backgrounds
- Flat white + gray cards + default shadows
- Pastel low-contrast-only palettes
- Generic “three columns of icons” startup template without variation
- Stock “robot head” / generic AI illustration for hero
- Gradient buttons with white text that look like every GPT wrapper

**DO** aim for:

- Extreme weight contrast (thin body vs black headlines)
- Cohesive liquid glass + subtle gradient canvas
- Orchestrated staggered load
- Layered depth (glass on atmospheric background)
- **Varied** layout rhythm (not a boring uniform grid)—e.g. one wide waitlist panel, offset feature glass tiles
- Monospace for trust signals (“Local-first · OpenClaw”) to add texture
- Bold **#0066FF** CTA against neutral glass—not purple

---

## Pages and Screens (CursorBuddy Web — Minimal Set)

### Page 1 — Landing + Waitlist (primary URL)

**Purpose:** Explain CursorBuddy in one breath; capture email for waitlist; set expectation that **the product runs on your machine** in VS Code, not in the browser.

**Layout:**

- **Full-viewport hero**
  - Headline, weight **900**, tight tracking: e.g. *“Your editor, finally listens.”* or *“Speak. It shows you the way.”* (final copy TBD—tone: confident, human, not “AI assistant” hype)
  - Subhead, weight **200**: one line on **local / VS Code / OpenClaw**—e.g. *“Larry guides you inside VS Code. Runs on your computer—this page is only the waitlist.”*
  - **Primary CTA:** scroll or anchor to **waitlist glass panel** (filled blue `#0066FF`)
  - **Secondary CTA:** glass-outline button—*“How it works”* scrolls to explainer strip

- **Waitlist panel** (large glass card, hero-adjacent or slightly below fold—not a tacky tiny box)
  - Short label, weight 800: *“Join the waitlist”*
  - Body, weight 200: one sentence on early access
  - **Email** input (glass inner field), **optional name**
  - **Submit** = primary blue; loading = subtle pulse on glass border (not spinner cliché unless refined)
  - Microcopy in monospace: *“No spam · Local product · We’ll email when your build is ready”*
  - **Honeypot** field (hidden) for bots—design must not break layout

- **“Why it’s different”** — 3–4 **staggered glass cards** (not identical boxes in a row):
  - *Local-first guide* — Larry lives in VS Code; OpenClaw orchestrates
  - *Built for real workflows* — Git, SCM, palette—not a generic chat window
  - *Fast path* — latency-aware stack (copy light on vendor names; no “powered by” wall of logos unless legal requires)
  - Optional fourth: *Privacy posture* — high-level, honest

- **Social proof strip** (optional, subtle): monospace line—*“Designed for developers who live in VS Code”*—no fake testimonials unless real

- **Footer**: minimal—Privacy, Terms, maybe GitHub/X links—same glass-adjacent minimalism as AutoApply landing footer intent

**Animation:** Headline → subhead → CTAs → waitlist card → feature cards on scroll. Respect `prefers-reduced-motion`.

### Page 2 — Waitlist confirmation (post-submit)

**Options:** same page inline state **or** dedicated `/thanks` route.

- Centered or hero-aligned **glass panel**
- Weight 900: *“You’re on the list.”*
- Weight 200: *“We’ll be in touch. The CursorBuddy companion installs on your machine—watch your inbox for the download.”*
- Single secondary: *“Back to home”*

### Page 3 — Legal (minimal)

- **Privacy** and **Terms** as simple long-form pages **or** modals
- Same canvas + glass container for readability; typography extremes for headings only, readable body (still thin weight acceptable at 16–18px for legal)

**Do not** add login, dashboard, or in-browser “app” for CursorBuddy v1 web—**waitlist + story only.**

---

## Responsive Behavior

- **Desktop (1280+):** Full hero + side-by-side or asymmetric layout (waitlist glass can sit right of headline or below with max-width)
- **Tablet:** Stack hero; waitlist full width with max-width 560px centered
- **Mobile:** Single column; touch targets 44px+; glass degrades to solid near-opaque white if `backdrop-filter` unsupported

---

## Empty / Error States (Waitlist)

- **API error:** glass panel with weight 800 title *“Something went wrong”* and thin body; retry button
- **Duplicate email:** friendly message in accent info tone—not alarming red unless hard error
- **Validation:** inline, small monospace hint under field

---

## Micro-interactions

- Buttons: scale **1.02** hover, **0.98** active
- Glass panels: border brightness bump on hover
- Waitlist submit success: brief **glass border glow** (box-shadow pulse), then transition to confirmation
- Inputs: focus ring using accent blue, not default browser only

---

## Distinctive Frontend Reference (Non-Generic)

Apply the same principles as **`docs/05_FRONTEND_PROMPT.md`** § “Distinctive Frontend Design Reference”:

- **Typography extremes** and distinctive pairing (Space Grotesk + thin Inter body is the default path)
- **Liquid glass cohesion**—this is the one true theme for the marketing site
- **Orchestrated motion** first; decorative loops second
- **Atmospheric canvas** = warm off-white + subtle radial tints + optional 2–3% noise
- **Test against AI slop:** no purple gradients, no safe-gray dashboard, no uniform template grid

### Landing-Specific Notes

- This is **not** a dashboard: no sidebar nav, no data tables. **One narrative scroll** (or two short pages).
- Use **monospace** for “Runs locally” / “VS Code extension” / waitlist number if you show *“2,847 on the list”* (only if real data—otherwise omit count).
- **Hero visual:** prefer **abstract wave / sonar / refractive glass** motif that suggests **sound + precision**—not a literal robot. Could be a **faux editor chrome** blurred inside a glass panel (screenshot-like but artistic), similar in *spirit* to AutoApply’s “feed preview” idea but showing a **stylized** VS Code silhouette + waveform.

---

## Handoff to Engineering

- Export Figma with **spacing / radius** matching tokens above
- Implement with **CSS variables**; support `prefers-reduced-motion`
- Waitlist POST to backend endpoint (contract in `docs/openapi.yaml` if extended—otherwise separate BaaS)
- **CSP-safe** static site (Vite/Next static export)—no inline eval

---

## Related Documents

- `docs/05_FRONTEND_PROMPT.md` — AutoApply reference (full liquid glass system)
- `docs/design/autoapply-design-tokens.md` — token JSON handoff (landing + local sections)
- `docs/07_LOCAL_CURSOR_AND_COMPANION.md` — **on-device** cursor, overlay, VS Code UI
