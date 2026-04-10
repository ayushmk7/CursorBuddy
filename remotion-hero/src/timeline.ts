// timeline.ts — single source of truth for frame ranges and animation constants
// Composition: HeroDemo, 30 fps, 1920×1080, 510 frames (17 s)

export const FPS = 30;
export const W = 1920;
export const H = 1080;
export const TOTAL_FRAMES = 510; // 17 s

// Agent cursor lag: 6 frames behind user cursor at 30 fps
export const LAG_FRAMES = 6;

// Phase frame ranges (inclusive start, exclusive end)
export const PHASES = {
  A: { start: 0,   end: 105 }, // 0–3.5 s   — Follow (IDE, figure-8 cursor)
  B: { start: 105, end: 255 }, // 3.5–8.5 s  — Speak (waveform + caption; extended for readability)
  C: { start: 255, end: 345 }, // 8.5–11.5 s — SCM crossfade
  D: { start: 345, end: 465 }, // 11.5–15.5 s — Callout + click
  E: { start: 465, end: 510 }, // 15.5–17 s  — Loop breathe-out
} as const;

// Click animation keyframes (Phase D)
export const CLICK_FRAME    = 408; // frame when fake cursor "presses" Commit
export const CLICK_DURATION = 8;   // frames of press animation

// Message-field typing animation range (Phase D)
export const MSG_TYPE_START = 360;
export const MSG_TYPE_END   = 393;

// IDE layout coordinates (scene space, 1920×1080)
export const IDE = {
  titleBarH:    32,
  activityBarW: 48,
  sidebarW:     252, // sidebar is x: 48–300
  statusBarH:   22,
  tabBarH:      30,
} as const;

// Derived bounds
export const SIDEBAR_X  = IDE.activityBarW;                         // 48
export const SIDEBAR_W  = IDE.sidebarW;                             // 252
export const SIDEBAR_CX = SIDEBAR_X + SIDEBAR_W / 2;               // 174
export const EDITOR_X   = IDE.activityBarW + IDE.sidebarW;         // 300
export const EDITOR_W   = W - EDITOR_X;                             // 1620
export const EDITOR_CX  = EDITOR_X + EDITOR_W / 2;                 // 1110
export const CONTENT_Y  = IDE.titleBarH;                            // 32
export const CONTENT_H  = H - IDE.titleBarH - IDE.statusBarH;      // 1026
export const EDITOR_CONTENT_Y = CONTENT_Y + IDE.tabBarH;           // 62
export const EDITOR_CONTENT_H = CONTENT_H - IDE.tabBarH;           // 996
export const EDITOR_CY  = EDITOR_CONTENT_Y + EDITOR_CONTENT_H / 2; // 560

// SCM sidebar element positions (scene y coords)
// Layout: header(35) → msgBox(pad8 + h90) → commitBtn(pad8 + h44) → changes(mT10 + h28) → fileRows
export const SCM = {
  headerY:       CONTENT_Y,                    // 32
  msgBoxY:       CONTENT_Y + 43,               // 75  (35 header + 8 pad)
  msgBoxH:       90,
  commitBtnY:    CONTENT_Y + 141,              // 173 (75 + 90 msgBox + 8 pad)
  commitBtnH:    44,
  commitBtnCY:   CONTENT_Y + 141 + 22,         // 195 (center of button)
  filesStartY:   CONTENT_Y + 223,              // 255 (141+44 btn + 10 mT + 28 header)
  fileRowH:      36,
} as const;

// Waveform overlay position (scene coords, in editor area, lower center)
export const WAVEFORM_CX = EDITOR_CX;   // 1110
export const WAVEFORM_CY = 870;
export const WAVEFORM_W  = 520;
export const WAVEFORM_H  = 90;

// Caption position (below waveform)
export const CAPTION_CX = EDITOR_CX;    // 1110
export const CAPTION_CY = 950;

// Callout bubble (in editor area, arrow tip aligned to sidebar right edge)
// ARROW_W in Callout.tsx = 14, so ARROW_TIP_X = CALLOUT_X - 14 = EDITOR_X = 300
export const CALLOUT_X  = 314;  // left edge of bubble; arrow tip lands at x=300 (sidebar boundary)
export const CALLOUT_Y  = SCM.commitBtnCY - 36; // center aligned to commit button
export const CALLOUT_W  = 530;
export const CALLOUT_H  = 72;
