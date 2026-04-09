// camera.ts — virtual 2-D camera: translate + scale on the entire scene graph
import { interpolate, Easing } from "remotion";
import {
  W, H, TOTAL_FRAMES,
  PHASES,
  SIDEBAR_CX,
  EDITOR_CX, EDITOR_CONTENT_Y, EDITOR_CONTENT_H,
  SCM,
  WAVEFORM_CY,
} from "../timeline";

export interface CameraState {
  lookAtX: number;
  lookAtY: number;
  scale: number;
}

// Editor midpoint
const editorMidY = EDITOR_CONTENT_Y + EDITOR_CONTENT_H / 2; // ~530

// ── Keyframe arrays for Remotion's multi-segment interpolate ──────────────────
// Each array must have the same length; frames must be strictly ascending.
const KF_FRAMES = [
  0,                         // Phase A start — establishing
  22,                        // Ease to medium as cursors start moving
  85,                        // Cursors near top of figure-8
  PHASES.B.start,            // 105 — Phase B starts
  PHASES.B.start + 20,       // 125 — punch into waveform
  PHASES.B.start + 55,       // 160 — hold at tight on waveform
  PHASES.B.end - 14,         // 181 — breathe out
  PHASES.C.start,            // 195 — SCM crossfade begins
  PHASES.C.start + 14,       // 209 — pan toward sidebar
  PHASES.C.start + 38,       // 233 — medium on SCM panel
  PHASES.D.start - 12,       // 273 — brief pause
  PHASES.D.start,            // 285 — Phase D: zoom toward commit
  PHASES.D.start + 22,       // 307 — punch into tight on commit
  PHASES.D.start + 55,       // 340 — hold (click happens at 348)
  PHASES.D.start + 100,      // 385 — breathe out
  PHASES.E.start,            // 405 — Phase E: return
  PHASES.E.start + 22,       // 427 — easing back
  TOTAL_FRAMES,              // 450 — matches frame 0 for seamless loop
];

const KF_LOOK_X = [
  EDITOR_CX,   // 1110
  EDITOR_CX,
  EDITOR_CX - 80,
  EDITOR_CX,   // Phase B: still in editor
  EDITOR_CX,
  EDITOR_CX,
  EDITOR_CX,
  700,         // Phase C: camera starts moving left toward sidebar
  450,
  SIDEBAR_CX,  // 174 — SCM panel center
  SIDEBAR_CX,
  SIDEBAR_CX,  // Phase D: tight on commit (same x)
  SIDEBAR_CX,
  SIDEBAR_CX,
  SIDEBAR_CX,
  600,         // Phase E: return
  EDITOR_CX,
  EDITOR_CX,  // matches frame 0
];

const KF_LOOK_Y = [
  editorMidY,  // ~530
  editorMidY,
  editorMidY - 60,
  WAVEFORM_CY - 40,  // 830 — transition to waveform
  WAVEFORM_CY,       // 870
  WAVEFORM_CY,       // hold
  WAVEFORM_CY - 30,  // breathe
  editorMidY,        // 530 — wide as SCM crossfades in
  400,
  SCM.filesStartY + SCM.fileRowH,  // ~168 — SCM files list
  SCM.commitBtnCY - 60,            // ~559
  SCM.commitBtnCY,                 // 619 — Phase D: commit button
  SCM.commitBtnCY,
  SCM.commitBtnCY,    // hold through click
  SCM.commitBtnCY - 30,
  editorMidY,         // Phase E
  editorMidY,
  editorMidY,         // matches frame 0
];

const KF_SCALE = [
  1.00,  // establishing
  1.15,  // medium — cursors moving
  1.15,
  1.15,  // Phase B start
  1.25,  // punch to waveform (medium→tight)
  1.28,  // hold
  1.18,  // breathe out
  1.10,  // Phase C: wide to see crossfade
  1.12,
  1.15,  // medium on SCM panel
  1.15,
  1.18,  // Phase D: start zooming
  1.33,  // tight on commit
  1.33,  // hold through click
  1.22,  // breathe out
  1.10,  // Phase E
  1.00,  // establishing
  1.00,  // matches frame 0
];

// Validate lengths at module load (TypeScript const assertion would catch mismatches)
if (KF_FRAMES.length !== KF_LOOK_X.length ||
    KF_FRAMES.length !== KF_LOOK_Y.length ||
    KF_FRAMES.length !== KF_SCALE.length) {
  throw new Error("camera.ts: keyframe array length mismatch");
}

const easingConfig = {
  easing: Easing.bezier(0.42, 0, 0.58, 1), // cubic ease-in-out
  extrapolateLeft:  "clamp" as const,
  extrapolateRight: "clamp" as const,
};

export function getCameraState(frame: number): CameraState {
  return {
    lookAtX: interpolate(frame, KF_FRAMES, KF_LOOK_X, easingConfig),
    lookAtY: interpolate(frame, KF_FRAMES, KF_LOOK_Y, easingConfig),
    scale:   interpolate(frame, KF_FRAMES, KF_SCALE,  easingConfig),
  };
}

// CSS transform string that centres the viewport on (lookAtX, lookAtY) at scale s
export function cameraTransform({ lookAtX, lookAtY, scale }: CameraState): string {
  const tx = W / 2 - lookAtX * scale;
  const ty = H / 2 - lookAtY * scale;
  return `translate(${tx}px,${ty}px) scale(${scale})`;
}
