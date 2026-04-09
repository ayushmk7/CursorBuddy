import React from "react";
import { interpolate } from "remotion";
import {
  CONTENT_Y, SIDEBAR_W, SCM,
  CLICK_FRAME, CLICK_DURATION,
  MSG_TYPE_START, MSG_TYPE_END,
} from "../timeline";

// SCM-inspired panel (Phase C–D).
// Generic source-control layout — not a pixel-perfect copy of any product.

const C = {
  bg:           "#252526",
  headerBg:     "#2d2d2f",
  border:       "rgba(255,255,255,0.08)",
  borderMid:    "rgba(255,255,255,0.13)",
  label:        "#8a8a8e",
  labelSm:      "#6a6a6e",
  text:         "#cccccc",
  textDim:      "#9a9a9e",
  modifiedDot:  "#e2a52e",
  addedDot:     "#4ec9b0",
  inputBg:      "rgba(255,255,255,0.05)",
  inputBorder:  "rgba(255,255,255,0.12)",
  inputBorderFocus: "#0066FF",
  btnBg:        "#0066FF",
  btnText:      "#ffffff",
  btnPressedBg: "#0052cc",
};

interface FileRow {
  status: "M" | "A" | "D";
  path: string;
  filename: string;
}

const CHANGED_FILES: FileRow[] = [
  { status: "M", path: "src/components/", filename: "Dashboard.tsx" },
  { status: "M", path: "src/services/",   filename: "api.ts" },
  { status: "A", path: "src/hooks/",      filename: "useData.ts" },
];

const STATUS_COLOR = { M: C.modifiedDot, A: C.addedDot, D: "#c74e39" };

const MESSAGE = "feat: add dashboard component";

interface Props {
  frame: number;
  slot?: string;
}

export const SCMSidebar: React.FC<Props> = ({ frame }) => {
  // Message typing animation
  const charsShown = Math.round(
    interpolate(frame, [MSG_TYPE_START, MSG_TYPE_END], [0, MESSAGE.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const typedMsg = MESSAGE.slice(0, charsShown);

  // Commit button press animation
  const btnScale = interpolate(
    frame,
    [CLICK_FRAME, CLICK_FRAME + 4, CLICK_FRAME + CLICK_DURATION, CLICK_FRAME + CLICK_DURATION + 4],
    [1, 0.94, 0.94, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const btnGlow = interpolate(
    frame,
    [CLICK_FRAME + CLICK_DURATION, CLICK_FRAME + CLICK_DURATION + 6, CLICK_FRAME + CLICK_DURATION + 18],
    [0, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const isClickPressed = frame >= CLICK_FRAME && frame < CLICK_FRAME + CLICK_DURATION + 4;

  return (
    <div style={{ width: "100%", height: "100%", background: C.bg, display: "flex", flexDirection: "column" }}>

      {/* ── Panel header ── */}
      <div
        style={{
          padding: "10px 12px 8px",
          background: C.headerBg,
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Generic "branch" icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="18" cy="18" r="3" stroke={C.label} strokeWidth="1.5" />
            <circle cx="6"  cy="6"  r="3" stroke={C.label} strokeWidth="1.5" />
            <circle cx="6"  cy="18" r="3" stroke={C.label} strokeWidth="1.5" />
            <path d="M8.5 6H15a3 3 0 0 1 3 3v6" stroke={C.label} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="6" y1="9" x2="6" y2="15" stroke={C.label} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: C.label, textTransform: "uppercase" }}>
            Source Control
          </span>
        </div>
        {/* Sync icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5 }}>
          <polyline points="1 4 1 10 7 10" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="23 20 23 14 17 14" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* ── CHANGES header ── */}
      <div
        style={{
          padding: "10px 12px 4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: C.labelSm, letterSpacing: 0.8, textTransform: "uppercase" }}>
          Changes
        </span>
        <span
          style={{
            fontSize: 11,
            color: "#ffffff",
            background: "rgba(255,255,255,0.15)",
            borderRadius: 10,
            padding: "0 6px",
            lineHeight: "18px",
          }}
        >
          {CHANGED_FILES.length}
        </span>
      </div>

      {/* ── Changed files list ── */}
      <div style={{ flexShrink: 0 }}>
        {CHANGED_FILES.map((f, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              height: SCM.fileRowH,
              paddingLeft: 16,
              paddingRight: 12,
              gap: 8,
              borderBottom: `1px solid ${C.border}`,
              cursor: "default",
            }}
          >
            {/* Status badge */}
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: STATUS_COLOR[f.status],
                minWidth: 14,
                textAlign: "center",
              }}
            >
              {f.status}
            </span>

            {/* File info */}
            <div style={{ flex: 1, overflow: "hidden" }}>
              <span style={{ fontSize: 13, color: C.text, fontWeight: 400 }}>{f.filename}</span>
              <span style={{ fontSize: 11, color: C.textDim, marginLeft: 6 }}>{f.path}</span>
            </div>

            {/* Action icons */}
            <div style={{ display: "flex", gap: 6, opacity: 0.5 }}>
              {["↩","＋","−"].map((ic, j) => (
                <span key={j} style={{ fontSize: 12, color: C.label, cursor: "default" }}>{ic}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: C.border, margin: "12px 0 0", flexShrink: 0 }} />

      {/* ── Message section ── */}
      <div style={{ padding: "12px 12px 8px", flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: C.labelSm, marginBottom: 6 }}>
          Message&nbsp;
          <span style={{ opacity: 0.55 }}>(⌘↵ to commit)</span>
        </div>

        {/* Message textarea */}
        <div
          style={{
            width: "100%",
            height: SCM.msgBoxH,
            background: C.inputBg,
            border: `1px solid ${charsShown > 0 ? C.inputBorderFocus : C.inputBorder}`,
            borderRadius: 4,
            padding: "8px 10px",
            fontSize: 13,
            color: charsShown > 0 ? C.text : C.labelSm,
            lineHeight: "1.5",
            boxSizing: "border-box",
            overflow: "hidden",
            fontFamily: "'SF Mono', 'Menlo', 'Monaco', monospace",
            position: "relative",
          }}
        >
          {typedMsg || (
            <span style={{ color: C.labelSm, fontStyle: "italic" }}>
              e.g. fix: resolve login error
            </span>
          )}
          {/* Blinking caret */}
          {charsShown > 0 && charsShown < MESSAGE.length && (
            <span
              style={{
                display: "inline-block",
                width: 1.5,
                height: "1em",
                background: "#0066FF",
                marginLeft: 1,
                verticalAlign: "text-bottom",
              }}
            />
          )}
        </div>
      </div>

      {/* ── Commit button ── */}
      <div style={{ padding: "4px 12px 0", flexShrink: 0 }}>
        <div
          style={{
            width: "100%",
            height: SCM.commitBtnH,
            background: isClickPressed ? C.btnPressedBg : C.btnBg,
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            cursor: "default",
            transform: `scale(${btnScale})`,
            transformOrigin: "center center",
            boxShadow: btnGlow > 0
              ? `0 0 ${20 * btnGlow}px rgba(0,102,255,${0.7 * btnGlow}), 0 0 ${8 * btnGlow}px rgba(90,200,250,${0.5 * btnGlow})`
              : "0 1px 3px rgba(0,0,0,0.35)",
            transition: "none",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <polyline points="20 6 9 17 4 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.btnText, letterSpacing: 0.2 }}>
            Commit
          </span>
        </div>
      </div>

      {/* ── Remaining space ── */}
      <div style={{ flex: 1, borderTop: `1px solid ${C.border}`, marginTop: 14 }}>
        <div style={{ padding: "10px 12px", fontSize: 11, color: C.labelSm }}>
          Repository: my-app &nbsp;·&nbsp; Branch:&nbsp;
          <span style={{ color: "#4ec9b0" }}>main</span>
        </div>
      </div>
    </div>
  );
};
