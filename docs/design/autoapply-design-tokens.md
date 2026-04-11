# CursorBuddy — Design Tokens

**Note:** This file intentionally keeps the name `autoapply-design-tokens.md` to mirror `docs/design/autoapply-design-tokens.md` in this repository.

**Consumers:** (A) **Marketing landing + waitlist** — static site CSS, Figma; (B) **Larry + support UI in VS Code** — bundled extension CSS, theme bridge.

---

## Part A — Marketing landing & waitlist (liquid glass, AutoApply-aligned)

Use **fixed hex / rgba** on the public site—same system as `docs/05_FRONTEND_PROMPT.md` (AutoApply). **Not** VS Code theme variables.

| Token | Value |
|-------|--------|
| `landing.canvas` | `#F2F0ED` |
| `landing.glass.bg` | `rgba(255, 255, 255, 0.45)` |
| `landing.glass.border` | `rgba(255, 255, 255, 0.6)` |
| `landing.glass.shadow` | `0 8px 32px rgba(0, 0, 0, 0.06)` |
| `landing.glass.blur` | `blur(40px) saturate(1.8)` |
| `landing.text.primary` | `#1A1A1A` |
| `landing.text.secondary` | `#6B6B6B` |
| `landing.text.tertiary` | `#9B9B9B` |
| `landing.accent.cta` | `#0066FF` |
| `landing.accent.success` | `#00B341` |
| `landing.accent.warning` | `#F5A623` |
| `landing.accent.danger` | `#FF3B30` |
| `landing.tint.blue` | `rgba(0, 102, 255, 0.04)` |
| `landing.radius.panel` | `20px` |
| `landing.radius.control` | `12px` |

**Typography (landing):** display **800–900**; body **200–300**; trust line / counts in **JetBrains Mono** or **SF Mono** at 400.

**Related:** `docs/05_FRONTEND_PROMPT.md`

---

## Part B — Larry + support UI in VS Code (`wg.*`)

---

## 1. Token Naming Convention

```
wg.<category>.<name>.<variant?>
```

Maps to CSS custom properties:

```
--wg-color-surface-default
--wg-space-md
--wg-radius-pill
```

---

## 2. Spacing Scale

| Token | px | Usage |
|-------|-----|--------|
| `wg.space.0` | 0 | Reset |
| `wg.space.1` | 4 | Tight inline padding |
| `wg.space.2` | 8 | Default gap between icon and label |
| `wg.space.3` | 12 | Section inset |
| `wg.space.4` | 16 | Card padding |
| `wg.space.5` | 20 | Major section separation |
| `wg.space.6` | 24 | Rare large gaps |

**Rule:** Support UI width is constrained; **do not** exceed `wg.space.6` for vertical rhythm between major blocks without scroll.

---

## 3. Radius Scale

| Token | px |
|-------|-----|
| `wg.radius.sm` | 6 |
| `wg.radius.md` | 10 |
| `wg.radius.lg` | 14 |
| `wg.radius.pill` | 999 |

**Usage**

- Larry bubble / mini chat: `md`
- Larry cursor-adjacent controls: `pill`
- modal/support surface: `lg`

---

## 4. Typography Scale

| Token | size | line-height | weight |
|-------|------|-------------|--------|
| `wg.type.caption` | 11 | 14 | 400 |
| `wg.type.body` | 13 | 18 | 400 |
| `wg.type.body-strong` | 13 | 18 | 600 |
| `wg.type.title` | 15 | 20 | 600 |
| `wg.type.mono` | 12 | 16 | 400 |

**Font stacks**

- UI: `var(--vscode-font-family)`
- Mono: `var(--vscode-editor-font-family)`

---

## 5. Color Semantics (Theme-Mapped)

### 5.1 Core surfaces

| Token | Source |
|-------|--------|
| `wg.color.canvas` | `--vscode-sideBar-background` |
| `wg.color.surface` | `color-mix(in srgb, var(--vscode-editor-background) 88%, transparent)` |
| `wg.color.surface-elevated` | `color-mix(in srgb, var(--vscode-editorWidget-background) 70%, transparent)` |
| `wg.color.border-subtle` | `--vscode-widget-border` |
| `wg.color.border-strong` | `--vscode-focusBorder` |

### 5.2 Content

| Token | Source |
|-------|--------|
| `wg.color.fg` | `--vscode-foreground` |
| `wg.color.fg-muted` | `--vscode-descriptionForeground` |
| `wg.color.fg-inverse` | `--vscode-button-foreground` |

### 5.3 Semantic states

| Token | Source / rule |
|-------|----------------|
| `wg.color.accent` | `--vscode-textLink-foreground` |
| `wg.color.success` | `--vscode-testing-iconPassed` or `charts.green` |
| `wg.color.warning` | `--vscode-inputValidation-warningForeground` |
| `wg.color.danger` | `--vscode-errorForeground` |
| `wg.color.info` | `--vscode-textLink-foreground` at 90% |

Larry state-dot mapping in v1:

- `wg.color.success` -> idle dot
- `wg.color.warning` -> thinking dot
- `wg.color.danger` -> error / blocked dot
- Larry's base cursor body should stay blue and separate from the dot-state semantic colors

---

## 6. Elevation & Shadows

VS Code product surfaces rarely need heavy shadows. Prefer **borders**.

| Token | Value |
|-------|--------|
| `wg.shadow.none` | none |
| `wg.shadow.soft` | `0 4px 16px color-mix(in srgb, var(--vscode-widget-shadow) 40%, transparent)` |

Use `soft` only for modal overlay.

---

## 7. Motion Durations

| Token | ms | easing |
|-------|-----|--------|
| `wg.motion.fast` | 120 | `cubic-bezier(0.33, 1, 0.68, 1)` |
| `wg.motion.base` | 200 | `cubic-bezier(0.16, 1, 0.3, 1)` |
| `wg.motion.slow` | 320 | `cubic-bezier(0.16, 1, 0.3, 1)` |

**Reduced motion:** `@media (prefers-reduced-motion: reduce)` sets all to `0ms`.

---

## 8. Z-Index Layers

| Token | value |
|-------|-------|
| `wg.z.base` | 0 |
| `wg.z.sticky-header` | 10 |
| `wg.z.toast` | 20 |
| `wg.z.modal` | 30 |

---

## 9. Component Token Bundles

### 9.1 Connection pill

```
background: var(--wg-color-surface-elevated);
border: 1px solid var(--wg-color-border-subtle);
padding: 2px var(--wg-space-2);
border-radius: var(--wg-radius-pill);
font: var(--wg-type-caption);
```

### 9.2 Larry guidance bubble

```
background: color-mix(in srgb, var(--vscode-editor-selectionBackground) 35%, transparent);
color: var(--wg-color-fg);
border-radius: var(--wg-radius-md);
padding: var(--wg-space-2) var(--wg-space-3);
```

Use this as a transient comic-style pop-out bubble from the blue Larry cursor. Keep copy short and contextual.

### 9.3 Larry mini chat surface

```
background: var(--wg-color-surface-elevated);
color: var(--wg-color-fg);
border: 1px solid var(--wg-color-border-subtle);
border-radius: var(--wg-radius-md);
padding: var(--wg-space-3);
```

This is a secondary dropdown surface for follow-up detail after Larry reaches a destination. It must not become a giant persistent primary panel.

### 9.4 Support-state row

```
display: grid;
grid-template-columns: 16px 1fr;
gap: var(--wg-space-2);
align-items: start;
border-bottom: 1px solid var(--wg-color-border-subtle);
padding: var(--wg-space-3) 0;
```

---

## 10. Icon Sizes

| Token | px |
|-------|-----|
| `wg.icon.sm` | 14 |
| `wg.icon.md` | 16 |
| `wg.icon.lg` | 22 |

---

## 11. Waveform Visualization Tokens

| Token | Meaning |
|-------|---------|
| `wg.wave.stroke` | `var(--wg-color-accent)` at 0.85 alpha |
| `wg.wave.fill` | `color-mix(in srgb, var(--wg-color-accent) 15%, transparent)` |
| `wg.wave.height` | 40px |
| `wg.wave.bar-width` | 2px |
| `wg.wave.gap` | 2px |

**Accessibility:** when reduced motion, replace animated bars with static horizontal meter using `wg.wave.fill` width driven by RMS level.

---

## 12. JSON Export (Figma / Code Shared)

```json
{
  "space": { "1": 4, "2": 8, "3": 12, "4": 16, "5": 20, "6": 24 },
  "radius": { "sm": 6, "md": 10, "lg": 14, "pill": 999 },
  "type": {
    "caption": { "size": 11, "line": 14, "weight": 400 },
    "body": { "size": 13, "line": 18, "weight": 400 },
    "title": { "size": 15, "line": 20, "weight": 600 }
  }
}
```

---

## 13. Related Documents

- `docs/05_FRONTEND_PROMPT.md` — landing + waitlist  
- `docs/07_LOCAL_CURSOR_AND_COMPANION.md` — Larry + local support UI  
- `docs/02_TECHNICAL_PRD.md`  
