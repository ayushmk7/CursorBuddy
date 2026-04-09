import React from "react";
import { WAVEFORM_CX, WAVEFORM_CY, PHASES } from "../timeline";
import { barHeight } from "./Waveform";

// Speech-to-prompt overlay shown during Phase B.
// Shows: microphone icon + animated waveform bars + typewriter transcription text.

const TEXT = "Where do I commit?";
const NUM_BARS = 26;
const BAR_W = 7;
const BAR_GAP = 3;
const BAR_MAX_H = 52;

const CARD_W = 780;
const CARD_H = 210;

// ── Microphone SVG ────────────────────────────────────────────────────────────
const MicIcon: React.FC<{ pulse: number }> = ({ pulse }) => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
    <rect x="8.5" y="2" width="7" height="12" rx="3.5" fill="#5AC8FA" opacity={0.85 + 0.15 * pulse} />
    <path
      d="M5 11C5 14.866 8.134 18 12 18C15.866 18 19 14.866 19 11"
      stroke="#5AC8FA"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <line x1="12" y1="18" x2="12" y2="22" stroke="#5AC8FA" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="8" y1="22" x2="16" y2="22" stroke="#5AC8FA" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

interface Props {
  opacity: number;
  frame: number;
}

export const Caption: React.FC<Props> = ({ opacity, frame }) => {
  const waveFrame = Math.max(0, frame - PHASES.B.start);

  // Typewriter: start 14 frames into Phase B, 1 char per 4 frames
  const TYPING_START = PHASES.B.start + 14;
  const charsShown = Math.min(TEXT.length, Math.max(0, Math.floor((frame - TYPING_START) / 4)));
  const typedText = TEXT.slice(0, charsShown);
  const showCaret = charsShown > 0 && charsShown < TEXT.length;

  // Pulse tied to waveform amplitude
  const pulse = 0.5 + 0.5 * Math.abs(Math.sin(waveFrame * 0.15));

  const left = WAVEFORM_CX - CARD_W / 2;
  const top  = WAVEFORM_CY - CARD_H / 2 - 20;

  const totalBarsW = NUM_BARS * BAR_W + (NUM_BARS - 1) * BAR_GAP;

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: CARD_W,
        height: CARD_H,
        opacity,
        pointerEvents: "none",
        zIndex: 40,
      }}
    >
      {/* ── Frosted glass card ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(8, 12, 20, 0.90)",
          borderRadius: 18,
          border: `1.5px solid rgba(90,200,250,${0.22 + 0.14 * pulse})`,
          boxShadow: `0 12px 60px rgba(0,0,0,0.65), 0 0 ${28 * pulse}px rgba(90,200,250,0.07)`,
        }}
      />

      {/* ── Header row: recording dot + label ── */}
      <div
        style={{
          position: "absolute",
          top: 18,
          left: 26,
          display: "flex",
          alignItems: "center",
          gap: 9,
        }}
      >
        {/* Pulsing red recording dot */}
        <div
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: "#ff3b30",
            boxShadow: `0 0 ${9 * pulse}px #ff3b30, 0 0 ${4 * pulse}px rgba(255,59,48,0.4)`,
            opacity: 0.65 + 0.35 * pulse,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            letterSpacing: 1.3,
            color: "rgba(200,200,210,0.65)",
            textTransform: "uppercase" as const,
            fontFamily: "'Segoe UI', 'SF Pro Text', system-ui, sans-serif",
          }}
        >
          CursorBuddy — Listening
        </span>
      </div>

      {/* ── Center row: mic icon + waveform bars ── */}
      <div
        style={{
          position: "absolute",
          top: 54,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
        }}
      >
        {/* Mic icon with pulse ring */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div
            style={{
              position: "absolute",
              inset: -(6 + 5 * pulse),
              borderRadius: "50%",
              border: "1.5px solid rgba(90,200,250,0.3)",
              opacity: 0.3 + 0.35 * pulse,
            }}
          />
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "rgba(90,200,250,0.10)",
              border: `1.5px solid rgba(90,200,250,${0.35 + 0.2 * pulse})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 ${16 * pulse}px rgba(90,200,250,0.15)`,
            }}
          >
            <MicIcon pulse={pulse} />
          </div>
        </div>

        {/* Waveform bars */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: BAR_GAP,
            height: BAR_MAX_H + 8,
          }}
        >
          {Array.from({ length: NUM_BARS }, (_, b) => {
            // Map 26 bars across the barHeight function's 32-bar design space
            const bIdx = Math.round((b / (NUM_BARS - 1)) * 31);
            const h = Math.max(3, barHeight(bIdx, waveFrame) * BAR_MAX_H);
            const t = 1 - Math.abs(b / (NUM_BARS - 1) - 0.5) * 2;
            const r = Math.round(0   + t * 90);
            const g = Math.round(102 + t * 98);
            const bC = Math.round(255 - t * 5);
            const color = `rgb(${r},${g},${bC})`;
            return (
              <div
                key={b}
                style={{
                  width: BAR_W,
                  height: h,
                  background: color,
                  borderRadius: `${BAR_W / 2}px ${BAR_W / 2}px 0 0`,
                  boxShadow: `0 0 ${3 + t * 5}px ${color}88`,
                  flexShrink: 0,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* ── Transcription row ── */}
      <div
        style={{
          position: "absolute",
          bottom: 22,
          left: 26,
          right: 26,
          display: "flex",
          alignItems: "center",
          gap: 8,
          minHeight: 34,
        }}
      >
        <span
          style={{
            fontSize: 13,
            color: "rgba(90,200,250,0.55)",
            fontFamily: "'SF Mono', 'Menlo', 'Consolas', monospace",
            flexShrink: 0,
            lineHeight: 1,
          }}
        >
          ›
        </span>
        <span
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: "#ffffff",
            letterSpacing: -0.3,
            fontFamily: "'SF Pro Display', 'Segoe UI', system-ui, sans-serif",
            lineHeight: 1.3,
          }}
        >
          {typedText || (
            <span style={{ opacity: 0 }}>_</span>
          )}
          {showCaret && (
            <span
              style={{
                display: "inline-block",
                width: 2,
                height: "0.85em",
                background: "#5AC8FA",
                marginLeft: 2,
                verticalAlign: "middle",
                borderRadius: 1,
              }}
            />
          )}
        </span>
      </div>
    </div>
  );
};
