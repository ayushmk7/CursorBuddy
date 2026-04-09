import React from "react";
import { CAPTION_CX, CAPTION_CY } from "../timeline";

// Caption overlay: "Where do I commit?" — shown during Phase B (speak phase).

interface Props {
  opacity: number;
}

export const Caption: React.FC<Props> = ({ opacity }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      top: CAPTION_CY - 28,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      pointerEvents: "none",
      opacity,
      zIndex: 40,
    }}
  >
    <div
      style={{
        background: "rgba(0,0,0,0.72)",
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 8,
        padding: "10px 24px",
        backdropFilter: "blur(6px)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
      }}
    >
      <span
        style={{
          fontSize: 32,
          fontWeight: 600,
          color: "#ffffff",
          letterSpacing: -0.3,
          fontFamily: "'SF Pro Display', 'Segoe UI', system-ui, sans-serif",
          textShadow: "0 1px 8px rgba(0,0,0,0.6)",
        }}
      >
        Where do I commit?
      </span>
    </div>
  </div>
);
