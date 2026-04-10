import React from "react";
import { PHASES } from "../timeline";
import { barHeight } from "./Waveform";

// Cursor-anchored speech bubble overlay shown during Phase B.
// Matches the COMPANION_OVERLAY_UX_SPEC: pointer-locked capsule, offset 18-24px
// below-right of the cursor tip, with a mini waveform + transcription text.

const TEXT = "Where do I commit?";

// Mini waveform config (very small — embedded in the capsule)
const MINI_BARS    = 10;
const MINI_BAR_W   = 4;
const MINI_BAR_GAP = 2;
const MINI_MAX_H   = 26;

// Capsule offset from cursor tip (down-right, per spec)
const OFFSET_X = 20;
const OFFSET_Y = 30;

interface Props {
  opacity:    number;
  frame:      number;
  cursorPos:  { x: number; y: number };
}

export const Caption: React.FC<Props> = ({ opacity, frame, cursorPos }) => {
  const waveFrame = Math.max(0, frame - PHASES.B.start);

  // Typewriter: 3 frames per char (faster → more reading time after)
  const TYPING_START = PHASES.B.start + 14;
  const charsShown = Math.min(TEXT.length, Math.max(0, Math.floor((frame - TYPING_START) / 3)));
  const typedText  = TEXT.slice(0, charsShown);
  const showCaret  = charsShown > 0 && charsShown < TEXT.length;

  // Pulse tied to waveform amplitude
  const pulse = 0.5 + 0.5 * Math.abs(Math.sin(waveFrame * 0.15));

  // Position capsule below-right of cursor tip
  const left = cursorPos.x + OFFSET_X;
  const top  = cursorPos.y + OFFSET_Y;

  return (
    <div
      style={{
        position:      "absolute",
        left,
        top,
        opacity,
        pointerEvents: "none",
        zIndex:        55, // above cursors (z50/z51)
      }}
    >
      {/* ── Speech-bubble tail pointing up-left toward the cursor ── */}
      <div
        style={{
          position:    "absolute",
          top:         -7,
          left:        10,
          width:       0,
          height:      0,
          borderLeft:  "7px solid transparent",
          borderRight: "7px solid transparent",
          borderBottom: "8px solid rgba(8, 12, 24, 0.93)",
          filter:      "drop-shadow(0 -1px 0 rgba(90,200,250,0.22))",
        }}
      />

      {/* ── Capsule ── */}
      <div
        style={{
          display:      "flex",
          alignItems:   "center",
          gap:          12,
          padding:      "10px 16px 10px 12px",
          background:   "rgba(8, 12, 24, 0.93)",
          borderRadius: 14,
          border:       `1px solid rgba(90,200,250,${0.22 + 0.12 * pulse})`,
          boxShadow:    `0 8px 32px rgba(0,0,0,0.70), 0 0 ${20 * pulse}px rgba(90,200,250,0.06)`,
          whiteSpace:   "nowrap",
        }}
      >
        {/* ── Mini waveform ── */}
        <div
          style={{
            display:     "flex",
            alignItems:  "flex-end",
            gap:         MINI_BAR_GAP,
            height:      MINI_MAX_H + 4,
            flexShrink:  0,
          }}
        >
          {Array.from({ length: MINI_BARS }, (_, b) => {
            // Map mini bars across the barHeight function's 32-bar space
            const bIdx = Math.round((b / (MINI_BARS - 1)) * 31);
            const h    = Math.max(3, barHeight(bIdx, waveFrame) * MINI_MAX_H);
            const t    = 1 - Math.abs(b / (MINI_BARS - 1) - 0.5) * 2;
            const r    = Math.round(0   + t * 90);
            const g    = Math.round(102 + t * 98);
            const bC   = Math.round(255 - t * 5);
            const color = `rgb(${r},${g},${bC})`;
            return (
              <div
                key={b}
                style={{
                  width:        MINI_BAR_W,
                  height:       h,
                  background:   color,
                  borderRadius: `${MINI_BAR_W / 2}px ${MINI_BAR_W / 2}px 0 0`,
                  boxShadow:    `0 0 ${2 + t * 4}px ${color}88`,
                  flexShrink:   0,
                }}
              />
            );
          })}
        </div>

        {/* ── Transcription text ── */}
        <span
          style={{
            fontSize:    20,
            fontWeight:  600,
            color:       "#ffffff",
            letterSpacing: -0.2,
            fontFamily:  "'SF Pro Display', 'Segoe UI', system-ui, sans-serif",
            lineHeight:  1,
          }}
        >
          {typedText || <span style={{ opacity: 0 }}>_</span>}
          {showCaret && (
            <span
              style={{
                display:       "inline-block",
                width:         2,
                height:        "0.8em",
                background:    "#5AC8FA",
                marginLeft:    2,
                verticalAlign: "middle",
                borderRadius:  1,
              }}
            />
          )}
        </span>
      </div>
    </div>
  );
};
