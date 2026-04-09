import React from "react";
import { WAVEFORM_CX, WAVEFORM_CY, WAVEFORM_W, WAVEFORM_H } from "../timeline";

// Scripted waveform — deterministic, no microphone.
// Bar heights derived from seeded pseudo-random + layered sine waves.

const NUM_BARS  = 32;
const BAR_W     = 7;
const GAP       = 4;
const MAX_H     = WAVEFORM_H - 4;

// Seeded deterministic "voice" envelope:
// Amplitude envelope simulating syllable grouping over time.
function syllableEnvelope(t: number): number {
  // Groups of speech: three "words" with brief pauses between them
  const groups = [
    { center: 0.12, width: 0.08, peak: 0.85 },
    { center: 0.27, width: 0.06, peak: 0.70 },
    { center: 0.40, width: 0.07, peak: 1.00 },
    { center: 0.55, width: 0.05, peak: 0.60 },
    { center: 0.68, width: 0.09, peak: 0.90 },
    { center: 0.80, width: 0.06, peak: 0.75 },
    { center: 0.90, width: 0.05, peak: 0.55 },
  ];
  let env = 0.04;
  for (const g of groups) {
    const d = Math.abs(t - g.center) / g.width;
    env = Math.max(env, g.peak * Math.exp(-d * d * 2.5));
  }
  return env;
}

// Height for bar `b` at global frame `f`.
// `waveFrame` is the frame offset within Phase B (0-indexed).
export function barHeight(b: number, waveFrame: number): number {
  // Normalised time 0–1 through Phase B (90 frames)
  const t = waveFrame / 89;

  // Frequency/phase offset per bar (seeded spread)
  const phaseOff = (b / NUM_BARS) * Math.PI * 6.3 + b * 1.1;

  // Three layered oscillators at different frequencies for realism
  const f1 = Math.sin((waveFrame / 7.0)  + phaseOff * 0.8) * 0.40;
  const f2 = Math.sin((waveFrame / 3.2)  + phaseOff * 1.7) * 0.25;
  const f3 = Math.sin((waveFrame / 1.7)  + phaseOff * 3.1) * 0.12;

  // Center bars taller (voice spectrum shape)
  const centerBias = 1 - Math.pow(Math.abs(b / (NUM_BARS - 1) - 0.5) * 1.6, 2);

  // Envelope from syllable model
  const env = syllableEnvelope(t);

  const raw = (0.5 + f1 + f2 + f3) * centerBias * env;
  // Ensure minimum visible bar and cap at 1
  return Math.max(0.04, Math.min(1.0, raw));
}

interface Props {
  waveFrame: number; // frame offset within Phase B, 0-indexed
  opacity: number;
}

export const Waveform: React.FC<Props> = ({ waveFrame, opacity }) => {
  const totalWidth = NUM_BARS * BAR_W + (NUM_BARS - 1) * GAP;
  const left = WAVEFORM_CX - totalWidth / 2;
  const baseline = WAVEFORM_CY + WAVEFORM_H / 2; // bars grow upward from baseline

  // Pulsing dot: beat tied to waveFrame so it pulses with the audio envelope
  const dotPulse = 0.6 + 0.4 * Math.abs(Math.sin(waveFrame * 0.22));

  // Pill container is taller to accommodate the SPEAKING badge above bars
  const BADGE_H = 22;
  const containerH = WAVEFORM_H + BADGE_H + 20;

  return (
    <div
      style={{
        position: "absolute",
        left: left - 24,
        top: WAVEFORM_CY - WAVEFORM_H / 2 - BADGE_H - 16,
        width: totalWidth + 48,
        height: containerH,
        opacity,
      }}
    >
      {/* Subtle background pill */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.50)",
          borderRadius: 14,
          border: "1px solid rgba(90,200,250,0.15)",
        }}
      />

      {/* ── SPEAKING badge ── */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "5px 16px",
          background: "rgba(90,200,250,0.16)",
          border: `1.5px solid rgba(90,200,250,${0.4 + 0.25 * dotPulse})`,
          borderRadius: 24,
          whiteSpace: "nowrap",
          boxShadow: `0 0 ${12 * dotPulse}px rgba(90,200,250,0.25)`,
        }}
      >
        {/* Pulsing dot */}
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#5AC8FA",
            boxShadow: `0 0 ${10 * dotPulse}px #5AC8FA, 0 0 ${4 * dotPulse}px #fff`,
            opacity: 0.7 + 0.3 * dotPulse,
          }}
        />
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 1.5,
            color: "#5AC8FA",
            textTransform: "uppercase" as const,
            fontFamily: "'Segoe UI', 'SF Pro Text', system-ui, sans-serif",
            textShadow: `0 0 ${8 * dotPulse}px rgba(90,200,250,0.6)`,
          }}
        >
          Speaking
        </span>
      </div>

      {/* Bars */}
      {Array.from({ length: NUM_BARS }, (_, b) => {
        const h = barHeight(b, waveFrame) * MAX_H;
        const x = left + b * (BAR_W + GAP);
        const y = baseline - h;
        // Colour gradient: center bars #5AC8FA, outer bars #0066FF
        const t = 1 - Math.abs(b / (NUM_BARS - 1) - 0.5) * 2;
        const r = Math.round(0   + t * 90);
        const g = Math.round(102 + t * 98);
        const bC= Math.round(255 - t * 5);
        const color = `rgb(${r},${g},${bC})`;

        return (
          <div
            key={b}
            style={{
              position: "absolute",
              left: x - left + 24,
              // offset from new container top (badge adds BADGE_H + 16 above old top)
              top: y - (WAVEFORM_CY - WAVEFORM_H / 2 - BADGE_H - 16),
              width: BAR_W,
              height: h,
              background: color,
              borderRadius: `${BAR_W / 2}px ${BAR_W / 2}px 0 0`,
              boxShadow: `0 0 ${4 + t * 6}px ${color}88`,
            }}
          />
        );
      })}
    </div>
  );
};
