// timeline.ts — single source of truth for frame ranges and animation constants
// Composition: HeroDemo, 30 fps, 1920×1080, 450 frames (15 s)

export const FPS = 30;
export const W = 1920;
export const H = 1080;
export const TOTAL_FRAMES = 450; // 15 s

// Agent cursor lag: 6 frames behind user cursor at 30 fps
export const LAG_FRAMES = 6;

// Phase frame ranges (inclusive start, exclusive end)
export const PHASES = {
  A: { start: 0,   end: 105 }, // 0–3.5 s  — Follow (IDE, figure-8 cursor)
  B: { start: 105, end: 195 }, // 3.5–6.5 s — Speak (waveform + caption)
  C: { start: 195, end: 285 }, // 6.5–9.5 s — SCM crossfade
  D: { start: 285, end: 405 }, // 9.5–13.5 s — Callout + click
  E: { start: 405, end: 450 }, // 13.5–15 s — Loop breathe-out
} as const;

// Click animation keyframes (Phase D)
export const CLICK_FRAME    = 348; // frame when fake cursor "presses" Commit
export const CLICK_DURATION = 8;   // frames of press animation

// Message-field typing animation range (Phase D)
export const MSG_TYPE_START = 300;
export const MSG_TYPE_END   = 333;

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
export const SCM = {
  headerY:       CONTENT_Y + 5,       // 37
  filesStartY:   CONTENT_Y + 100,     // 132
  fileRowH:      36,
  msgLabelY:     CONTENT_Y + 390,     // 422
  msgBoxY:       CONTENT_Y + 408,     // 440
  msgBoxH:       130,
  commitBtnY:    CONTENT_Y + 565,     // 597
  commitBtnH:    44,
  commitBtnCY:   CONTENT_Y + 565 + 22, // 619
} as const;

// Waveform overlay position (scene coords, in editor area, lower center)
export const WAVEFORM_CX = EDITOR_CX;   // 1110
export const WAVEFORM_CY = 870;
export const WAVEFORM_W  = 520;
export const WAVEFORM_H  = 90;

// Caption position (below waveform)
export const CAPTION_CX = EDITOR_CX;    // 1110
export const CAPTION_CY = 950;

// Callout bubble (in editor area, same y as commit button, pointing left)
export const CALLOUT_X  = 360;  // left edge
export const CALLOUT_Y  = SCM.commitBtnCY - 36; // vertically near commit
export const CALLOUT_W  = 530;
export const CALLOUT_H  = 72;
