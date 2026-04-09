import React from "react";
import type { Pos } from "../utils/cursorPath";

// ── User cursor — standard arrow pointer ─────────────────────────────────────
// Rendered as inline SVG so it can be crisp at any camera scale.

const UserCursorSVG: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => (
  <svg
    width="22"
    height="27"
    viewBox="0 0 22 27"
    fill="none"
    style={{ display: "block", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }}
    opacity={opacity}
  >
    {/* Arrow outline */}
    <path
      d="M3 2L3 22L7.5 17.5L11.5 24.5L14 23.5L10 16.5L17 16.5Z"
      fill="white"
      stroke="#1a1a1a"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

// ── Agent cursor — glowing blue circle with ring ──────────────────────────────
const AgentCursorSVG: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 28 28"
    fill="none"
    style={{
      display: "block",
      filter: "drop-shadow(0 0 6px #0066FF) drop-shadow(0 0 12px rgba(90,200,250,0.5))",
    }}
    opacity={opacity}
  >
    {/* Outer ring */}
    <circle cx="14" cy="14" r="12" stroke="#5AC8FA" strokeWidth="1.5" opacity={0.7} />
    {/* Inner fill */}
    <circle cx="14" cy="14" r="7" fill="#0066FF" opacity={0.9} />
    {/* Centre dot */}
    <circle cx="14" cy="14" r="2.5" fill="#ffffff" />
  </svg>
);

// ── Trail (ghost agent cursor positions for last N frames) ───────────────────
// We show 3 ghost positions at diminishing opacity for a "follow" trail.
const TRAIL_OFFSETS = [3, 6, 9]; // frames behind agent cursor

interface Props {
  userPos:   Pos;
  agentPos:  Pos;
  trailPositions: Pos[]; // [agentPos-3f, agentPos-6f, agentPos-9f]
}

// Cursor tip offsets (SVG arrow tip is at approx 3,2 in user-cursor coords)
const USER_TIP_X = 3;
const USER_TIP_Y = 2;
// Agent cursor is centred in its 28×28 SVG
const AGENT_CX = 14;
const AGENT_CY = 14;

export const Cursors: React.FC<Props> = ({ userPos, agentPos, trailPositions }) => (
  <>
    {/* ── Agent trail (faint ghosts behind the agent cursor) ── */}
    {trailPositions.map((tp, i) => {
      const trailOpacity = 0.25 - i * 0.07;
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: tp.x - AGENT_CX,
            top:  tp.y - AGENT_CY,
            pointerEvents: "none",
          }}
        >
          <AgentCursorSVG opacity={Math.max(0, trailOpacity)} />
        </div>
      );
    })}

    {/* ── Agent cursor ── */}
    <div
      style={{
        position: "absolute",
        left: agentPos.x - AGENT_CX,
        top:  agentPos.y - AGENT_CY,
        pointerEvents: "none",
        zIndex: 50,
      }}
    >
      <AgentCursorSVG />
    </div>

    {/* ── User cursor (rendered on top) ── */}
    <div
      style={{
        position: "absolute",
        left: userPos.x - USER_TIP_X,
        top:  userPos.y - USER_TIP_Y,
        pointerEvents: "none",
        zIndex: 51,
      }}
    >
      <UserCursorSVG />
    </div>
  </>
);
