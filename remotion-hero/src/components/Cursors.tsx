import React from "react";
import type { Pos } from "../utils/cursorPath";

// ── User cursor — standard white arrow pointer ────────────────────────────────
const UserCursorSVG: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => (
  <svg
    width="22"
    height="27"
    viewBox="0 0 22 27"
    fill="none"
    style={{ display: "block", filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.7))" }}
    opacity={opacity}
  >
    <path
      d="M3 2L3 22L7.5 17.5L11.5 24.5L14 23.5L10 16.5L17 16.5Z"
      fill="white"
      stroke="#1a1a1a"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

// ── Agent cursor — blue arrow cursor representing CursorBuddy ─────────────────
const AgentCursorSVG: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => (
  <svg
    width="22"
    height="27"
    viewBox="0 0 22 27"
    fill="none"
    style={{
      display: "block",
      filter: "drop-shadow(0 0 6px #0066FF) drop-shadow(0 0 12px rgba(90,200,250,0.5))",
    }}
    opacity={opacity}
  >
    <path
      d="M3 2L3 22L7.5 17.5L11.5 24.5L14 23.5L10 16.5L17 16.5Z"
      fill="#0066FF"
      stroke="#5AC8FA"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

// ── Trail (ghost agent cursor positions for last N frames) ───────────────────
const TRAIL_OFFSETS = [3, 6, 9]; // frames behind agent cursor

interface Props {
  userPos:   Pos;
  agentPos:  Pos;
  trailPositions: Pos[]; // [agentPos-3f, agentPos-6f, agentPos-9f]
}

// Cursor tip offsets — both cursors have tip at approx (3,2) in their SVG
const USER_TIP_X  = 3;
const USER_TIP_Y  = 2;
const AGENT_TIP_X = 3;
const AGENT_TIP_Y = 2;

export const Cursors: React.FC<Props> = ({ userPos, agentPos, trailPositions }) => (
  <>
    {/* ── Agent trail (faint ghost arrows behind the agent cursor) ── */}
    {trailPositions.map((tp, i) => {
      const trailOpacity = 0.22 - i * 0.06;
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: tp.x - AGENT_TIP_X,
            top:  tp.y - AGENT_TIP_Y,
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
        left: agentPos.x - AGENT_TIP_X,
        top:  agentPos.y - AGENT_TIP_Y,
        pointerEvents: "none",
        zIndex: 50,
      }}
    >
      <AgentCursorSVG />
      {/* CursorBuddy label below the cursor */}
      <div
        style={{
          position: "absolute",
          top: 26,
          left: 8,
          background: "#0066FF",
          color: "#ffffff",
          fontSize: 11,
          fontWeight: 700,
          padding: "2px 7px",
          borderRadius: 4,
          whiteSpace: "nowrap",
          fontFamily: "'SF Pro Text', 'Segoe UI', system-ui, sans-serif",
          boxShadow: "0 0 10px rgba(0,102,255,0.7), 0 1px 4px rgba(0,0,0,0.4)",
          letterSpacing: 0.3,
          lineHeight: 1.5,
          pointerEvents: "none",
        }}
      >
        CursorBuddy
      </div>
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
