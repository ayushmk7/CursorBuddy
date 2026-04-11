# CursorBuddy Hero — Remotion Package

Renders the looping hero MP4 for the CursorBuddy marketing site.

The marketing story should match the product docs: CursorBuddy is the product, and Larry is the local guide inside VS Code.

## Composition

| Property | Value |
|---|---|
| ID | `HeroDemo` |
| FPS | 30 |
| Resolution | 1920 × 1080 |
| Duration | 450 frames (15 s) |

## Setup

```bash
cd remotion-hero
npm install
```

## Commands

```bash
# Preview in Remotion Studio
npm run studio

# List compositions (verify HeroDemo appears)
npm run compositions
# or:
npx remotion compositions src/index.tsx

# Render MP4 (output: ../landingpage/assets/cursorbuddy-hero-remotion.mp4)
npm run render
# or the full explicit command used to produce the file:
npx remotion render src/index.tsx HeroDemo ../landingpage/assets/cursorbuddy-hero-remotion.mp4 --codec h264 --crf 18

# Export poster frame (frame 30 ≈ 1 s in)
npm run poster
# or:
npx remotion still src/index.tsx HeroDemo ../landingpage/assets/cursorbuddy-hero-remotion-poster.png --frame 30
```

## Phases (storyboard)

| Phase | Frames | Time | Content |
|---|---|---|---|
| A — Follow | 0–105 | 0–3.5 s | Dark IDE; user cursor moves figure-8; agent cursor follows 10 f lag |
| B — Speak | 105–195 | 3.5–6.5 s | Scripted waveform; caption "Where do I commit?" |
| C — SCM | 195–285 | 6.5–9.5 s | Crossfade to SCM-inspired panel (changed files, Message, Commit) |
| D — Callout + click | 285–405 | 9.5–13.5 s | Callout "Here's where you commit."; cursor clicks Commit |
| E — Loop | 405–450 | 13.5–15 s | Camera breathes out; cursor returns to phase-A start; seamless loop |

## Dependencies

Rendering requires **ffmpeg** on the PATH. The version bundled with Remotion's CLI should handle this automatically if your system ffmpeg is missing, but a system ffmpeg (`brew install ffmpeg`) is recommended.

## Output

`../landingpage/assets/cursorbuddy-hero-remotion.mp4` — H.264 + no audio; suitable for `<video muted playsinline loop>`.
