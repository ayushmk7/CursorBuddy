import React from "react";
import { CALLOUT_X, CALLOUT_Y, CALLOUT_W, CALLOUT_H, SCM, SIDEBAR_X, SIDEBAR_W } from "../timeline";

// Callout bubble: "Here's where you commit."
// Positioned in editor area at same y as Commit button, with arrow pointing left toward the button.

const ARROW_W = 14;
const ARROW_H = 20;
// Arrow tip x (leftmost point of callout, pointing left toward sidebar)
const ARROW_TIP_X = CALLOUT_X - ARROW_W;
const ARROW_TIP_Y = CALLOUT_Y + CALLOUT_H / 2;

interface Props {
  opacity: number;
}

export const Callout: React.FC<Props> = ({ opacity }) => (
  <div
    style={{
      position: "absolute",
      left: ARROW_TIP_X,
      top: CALLOUT_Y - 4,
      width: CALLOUT_W + ARROW_W + 8,
      height: CALLOUT_H + 8,
      pointerEvents: "none",
      opacity,
      zIndex: 45,
    }}
  >
    {/* Arrow triangle (pointing left) */}
    <div
      style={{
        position: "absolute",
        left: 0,
        top: "50%",
        transform: "translateY(-50%)",
        width: 0,
        height: 0,
        borderTop:    `${ARROW_H / 2}px solid transparent`,
        borderBottom: `${ARROW_H / 2}px solid transparent`,
        borderRight:  `${ARROW_W}px solid #0066FF`,
        filter: "drop-shadow(-2px 0 4px rgba(0,102,255,0.4))",
      }}
    />

    {/* Bubble body */}
    <div
      style={{
        position: "absolute",
        left: ARROW_W,
        top: 4,
        width: CALLOUT_W,
        height: CALLOUT_H,
        background: "linear-gradient(135deg, #0066FF 0%, #005ae0 100%)",
        borderRadius: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 28px rgba(0,102,255,0.55), 0 0 0 1px rgba(90,200,250,0.25)",
        padding: "0 28px",
      }}
    >
      {/* Subtle inner highlight */}
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: "50%",
          background: "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, transparent 100%)",
          borderRadius: "10px 10px 0 0",
          pointerEvents: "none",
        }}
      />

      <span
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: "#ffffff",
          letterSpacing: -0.2,
          fontFamily: "'SF Pro Display', 'Segoe UI', system-ui, sans-serif",
          whiteSpace: "nowrap",
          textShadow: "0 1px 4px rgba(0,0,0,0.25)",
          position: "relative",
          zIndex: 1,
        }}
      >
        Here&rsquo;s where you commit.
      </span>
    </div>
  </div>
);
