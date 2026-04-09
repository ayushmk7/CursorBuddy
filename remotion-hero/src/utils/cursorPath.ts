// cursorPath.ts — pure deterministic cursor position functions
import {
  PHASES,
  TOTAL_FRAMES,
  CLICK_FRAME,
  SIDEBAR_CX,
  EDITOR_CX,
  EDITOR_CONTENT_Y,
  SCM,
} from "../timeline";

export interface Pos { x: number; y: number; }

// ── easing helpers ────────────────────────────────────────────────────────────
function easeInOut(t: number): number {
  const tc = Math.max(0, Math.min(1, t));
  return tc < 0.5 ? 2 * tc * tc : -1 + (4 - 2 * tc) * tc;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpPos(a: Pos, b: Pos, t: number): Pos {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

// ── figure-8 path in editor area ─────────────────────────────────────────────
// Phase A: user cursor traces a gentle Lissajous figure-8
// Center: EDITOR_CX, mid-editor-y = 530; amplitudes chosen to stay in editor area
const FIG8_CX = EDITOR_CX;    // 1110
const FIG8_CY = 530;
const FIG8_RX = 290;
const FIG8_RY = 110;

function figureEight(t: number): Pos {
  const angle = t * Math.PI * 2;
  return {
    x: FIG8_CX + FIG8_RX * Math.sin(angle),
    y: FIG8_CY + FIG8_RY * Math.sin(2 * angle) * 0.5,
  };
}

// ── key waypoints ─────────────────────────────────────────────────────────────
const WAVEFORM_HOLD: Pos = { x: EDITOR_CX, y: 875 };
const SCM_FILES:    Pos = { x: SIDEBAR_CX, y: SCM.filesStartY + SCM.fileRowH };
const MSG_FIELD:    Pos = { x: SIDEBAR_CX, y: SCM.msgBoxY + SCM.msgBoxH / 2 };
const COMMIT_BTN:   Pos = { x: SIDEBAR_CX, y: SCM.commitBtnCY };

// ── main cursor path ──────────────────────────────────────────────────────────
// Returns the USER cursor position at any global frame (pure function → no state)
export function getUserCursorPos(frame: number): Pos {
  const f = Math.max(0, Math.min(TOTAL_FRAMES, frame));

  // Phase A (0–105): figure-8 in editor
  if (f <= PHASES.A.end) {
    const t = f / PHASES.A.end;
    return figureEight(t);
  }

  // Phase B (105–195): glide from figure-8 end toward waveform, then hold
  if (f <= PHASES.B.end) {
    const t = (f - PHASES.B.start) / (PHASES.B.end - PHASES.B.start);
    // Move in first 45% of phase, hold the rest
    const moveT = easeInOut(Math.min(t / 0.45, 1));
    return lerpPos(figureEight(1.0), WAVEFORM_HOLD, moveT);
  }

  // Phase C (195–285): glide toward SCM files list
  if (f <= PHASES.C.end) {
    const t = (f - PHASES.C.start) / (PHASES.C.end - PHASES.C.start);
    return lerpPos(WAVEFORM_HOLD, SCM_FILES, easeInOut(t));
  }

  // Phase D (285–405):
  // Part 1 (285–330): move to message field
  if (f <= PHASES.D.start + 45) {
    const t = (f - PHASES.D.start) / 45;
    return lerpPos(SCM_FILES, MSG_FIELD, easeInOut(Math.min(t, 1)));
  }

  // Part 2 (330–CLICK_FRAME): move to commit button
  if (f < CLICK_FRAME) {
    const t = (f - (PHASES.D.start + 45)) / (CLICK_FRAME - PHASES.D.start - 45);
    return lerpPos(MSG_FIELD, COMMIT_BTN, easeInOut(t));
  }

  // Hold at commit button through end of Phase D
  if (f < PHASES.E.start) {
    return COMMIT_BTN;
  }

  // Phase E (405–450): ease back to Phase A start (frame 0 of figure-8)
  const t = (f - PHASES.E.start) / (PHASES.E.end - PHASES.E.start);
  return lerpPos(COMMIT_BTN, figureEight(0), easeInOut(t));
}

// Agent cursor: user position LAG_FRAMES frames ago
export function getAgentCursorPos(frame: number, lag = 10): Pos {
  return getUserCursorPos(Math.max(0, frame - lag));
}
