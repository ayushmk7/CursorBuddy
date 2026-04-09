# Landing page dark mode (home)

This document describes the **CursorBuddy home** visual system: a full black canvas so the Remotion hero export sits flush with the page, plus white typography and the existing electric blue accent.

## Goals

- **Canvas**: Pure black (`#000000`) — no soft gray gradients behind the first screen.
- **Video**: Embed **`/assets/cursorbuddy-hero-remotion.mp4`** with poster **`/assets/cursorbuddy-hero-remotion-poster.png`**. The hero panel uses a transparent “frame” so the MP4 blends into the background (Remotion’s own black matte should line up with the page).
- **Type**: Primary text white; secondary/tertiary use translucent white for hierarchy.
- **Accent**: Keep **`#0066ff`** (links, step indices, primary buttons, logo highlights).

## Implementation map

| Area | Location |
|------|----------|
| Scoped theme | `body.page-home` CSS custom properties and overrides in `assets/styles.css` |
| Logo on black | `index.html` uses `brand-mark-on-dark.svg` (`assets/brand-mark-on-dark.svg`) |
| Browser chrome | `theme-color` meta on `index.html` set to `#000000` |
| Other routes | `privacy/`, `terms/`, `404.html`, `thanks/` keep the **light** `:root` tokens (class `page-legal` / others, not `page-home`) |

## Token summary (`body.page-home`)

- `--landing-canvas`: `#000000`
- `--landing-text-primary`: `#ffffff`
- `--landing-text-secondary`: `rgba(255, 255, 255, 0.78)`
- `--landing-text-tertiary`: `rgba(255, 255, 255, 0.52)`
- `--landing-accent`: `#0066ff` (unchanged from the light theme accent)
- Glass panels: low-opacity white fill and border on black (see stylesheet)

## Hero video checklist

1. Export from Remotion to **`landingpage/assets/cursorbuddy-hero-remotion.mp4`**.
2. Optional poster: **`landingpage/assets/cursorbuddy-hero-remotion-poster.png`**.
3. In **`index.html`**, the `<video>` should reference those paths under `/assets/...`.
4. Remove or stop using older hero assets (e.g. `cursorbuddy-hero-demo.mp4`) so the site only ships one hero file.

## Accessibility

- Focus rings use a slightly stronger blue glow on dark (`rgba(0, 102, 255, 0.35)`) where overridden.
- Form error/success copy uses lighter tints so messages stay readable on `#000`.

## Changing accent strict “as-is”

To preserve exactly the same blue everywhere, only adjust `--landing-accent` in the `body.page-home` block together with any hard-coded `#0066ff` in `brand-mark-on-dark.svg` if you recolor the mark.
