import React from "react";
import { interpolate } from "remotion";
import {
  SCM,
  CLICK_FRAME, CLICK_DURATION,
  MSG_TYPE_START, MSG_TYPE_END,
} from "../timeline";

// ── VS Code Dark+ Source Control panel — faithful open-source replica ─────────
// Layout matches VS Code's actual SCM viewlet order:
//   1. Panel header (SOURCE CONTROL + actions)
//   2. Commit message input
//   3. Commit button (split)
//   4. CHANGES section + file rows
//   5. Footer / sync row

const C = {
  panelBg:          "#252526",
  headerBg:         "#252526",
  sectionLabel:     "#bbbbbb",
  label:            "#8a8a8e",
  labelSm:          "#6a6a6e",
  text:             "#cccccc",
  textDim:          "#9a9a9e",
  border:           "rgba(255,255,255,0.06)",
  borderMid:        "rgba(255,255,255,0.10)",
  inputBg:          "#3c3c3c",
  inputBorder:      "rgba(255,255,255,0.12)",
  inputBorderFocus: "#007fd4",
  inputPlaceholder: "#6a6a6e",
  btnBg:            "#0e639c",
  btnBgHover:       "#1177bb",
  btnBgPressed:     "#094771",
  btnText:          "#ffffff",
  btnBorder:        "rgba(255,255,255,0.10)",
  badgeBg:          "#4d4d4d",
  badgeText:        "#cccccc",
  modifiedColor:    "#e2a52e",
  addedColor:       "#81b88b",
  deletedColor:     "#c74e39",
  rowHoverBg:       "rgba(255,255,255,0.04)",
  iconColor:        "#c5c5c5",
  iconDim:          "rgba(197,197,197,0.55)",
  activeRowBg:      "rgba(255,255,255,0.07)",
  syncBg:           "#007acc",
};

// ── Icon components (VS Code Codicon-faithful) ────────────────────────────────

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" fill={C.iconColor} />
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M13.451 5.609a6.5 6.5 0 1 0 .49 2.89l-1-.024A5.5 5.5 0 1 1 11.373 4H9v1h4V1h-1v2.638A6.491 6.491 0 0 0 13.451 5.609z" fill={C.iconDim} />
  </svg>
);

const EllipsisIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="4"  cy="8" r="1.2" fill={C.iconDim} />
    <circle cx="8"  cy="8" r="1.2" fill={C.iconDim} />
    <circle cx="12" cy="8" r="1.2" fill={C.iconDim} />
  </svg>
);

const ChevronDownIcon = ({ color = C.label }: { color?: string }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M4 6l4 4 4-4" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronRightIcon = ({ color = C.label }: { color?: string }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M6 4l4 4-4 4" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Revert file icon (↩ codicon-discard)
const RevertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M4.5 3.5l-3 3 3 3" stroke={C.iconDim} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M1.5 6.5h7a4 4 0 0 1 0 8" stroke={C.iconDim} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Stage file icon (+ codicon-add)
const StageIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M8 3v10M3 8h10" stroke={C.iconDim} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Sync arrows (↑↓ in status bar)
const SyncIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
    <path d="M1 4l3-3 3 3M4 1v9" stroke="rgba(255,255,255,0.85)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 12l-3 3-3-3M12 15V6" stroke="rgba(255,255,255,0.85)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Data ─────────────────────────────────────────────────────────────────────

interface FileRow {
  status: "M" | "A" | "D";
  filename: string;
  path: string;
}

const CHANGED_FILES: FileRow[] = [
  { status: "M", filename: "Dashboard.tsx", path: "src/components" },
  { status: "M", filename: "api.ts",        path: "src/services"   },
  { status: "A", filename: "useData.ts",    path: "src/hooks"      },
];

const STATUS_LABEL: Record<FileRow["status"], string> = { M: "M", A: "U", D: "D" };
const STATUS_COLOR: Record<FileRow["status"], string> = {
  M: C.modifiedColor,
  A: C.addedColor,
  D: C.deletedColor,
};

const MESSAGE = "feat: add dashboard component";

// ── Sub-components ────────────────────────────────────────────────────────────

// Panel header action button (icon-only, subtle hover region)
const ActionBtn: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      width: 22,
      height: 22,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 4,
      cursor: "default",
    }}
  >
    {children}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  frame: number;
  slot?: string;
}

export const SCMSidebar: React.FC<Props> = ({ frame }) => {
  // ── Typing animation ────────────────────────────────────────────────────────
  const charsShown = Math.round(
    interpolate(frame, [MSG_TYPE_START, MSG_TYPE_END], [0, MESSAGE.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const typedMsg   = MESSAGE.slice(0, charsShown);
  const isTyping   = charsShown > 0 && charsShown < MESSAGE.length;
  const isFocused  = charsShown > 0;

  // ── Commit button press animation ───────────────────────────────────────────
  const btnScale = interpolate(
    frame,
    [
      CLICK_FRAME,
      CLICK_FRAME + 4,
      CLICK_FRAME + CLICK_DURATION,
      CLICK_FRAME + CLICK_DURATION + 4,
    ],
    [1, 0.95, 0.95, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const btnGlow = interpolate(
    frame,
    [
      CLICK_FRAME + CLICK_DURATION,
      CLICK_FRAME + CLICK_DURATION + 6,
      CLICK_FRAME + CLICK_DURATION + 20,
    ],
    [0, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const isClickPressed = frame >= CLICK_FRAME && frame < CLICK_FRAME + CLICK_DURATION + 4;
  const commitBg = isClickPressed ? C.btnBgPressed : C.btnBg;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: C.panelBg,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Segoe UI', 'SF Pro Text', system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* ── 1. Panel header ─────────────────────────────────────────────────── */}
      <div
        style={{
          height: 35,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingLeft: 12,
          paddingRight: 4,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        {/* Title */}
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.8,
            color: C.sectionLabel,
            textTransform: "uppercase",
            userSelect: "none",
          }}
        >
          Source Control
        </span>

        {/* Action icons */}
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          <ActionBtn><CheckIcon /></ActionBtn>
          <ActionBtn><RefreshIcon /></ActionBtn>
          <ActionBtn><EllipsisIcon /></ActionBtn>
        </div>
      </div>

      {/* ── 2. Commit message textarea ──────────────────────────────────────── */}
      <div style={{ padding: "8px 10px 0", flexShrink: 0 }}>
        <div
          style={{
            width: "100%",
            minHeight: 90,
            background: C.inputBg,
            border: `1px solid ${isFocused ? C.inputBorderFocus : C.inputBorder}`,
            borderRadius: 2,
            padding: "6px 8px",
            fontSize: 13,
            color: C.text,
            lineHeight: 1.5,
            boxSizing: "border-box",
            position: "relative",
            outline: isFocused ? `1px solid ${C.inputBorderFocus}` : "none",
            outlineOffset: -1,
          }}
        >
          {typedMsg ? (
            <span style={{ fontFamily: "inherit", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {typedMsg}
            </span>
          ) : (
            <span style={{ color: C.inputPlaceholder, fontStyle: "normal" }}>
              Message (Ctrl+Enter to commit on &apos;main&apos;)
            </span>
          )}

          {/* Blinking cursor while typing */}
          {isTyping && (
            <span
              style={{
                display: "inline-block",
                width: 1.5,
                height: "0.9em",
                background: C.inputBorderFocus,
                marginLeft: 1,
                verticalAlign: "text-bottom",
                opacity: Math.floor(frame / 8) % 2 === 0 ? 1 : 0.1,
              }}
            />
          )}
        </div>
      </div>

      {/* ── 3. Commit button (split-button style) ───────────────────────────── */}
      <div
        style={{
          padding: "8px 10px 0",
          flexShrink: 0,
          display: "flex",
          gap: 1,
          transform: `scale(${btnScale})`,
          transformOrigin: "center center",
        }}
      >
        {/* Main commit section */}
        <div
          style={{
            flex: 1,
            height: SCM.commitBtnH,
            background: commitBg,
            borderRadius: "2px 0 0 2px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "default",
            boxShadow:
              btnGlow > 0
                ? `0 0 ${16 * btnGlow}px rgba(0,127,212,${0.6 * btnGlow}), inset 0 0 0 1px ${C.btnBorder}`
                : `inset 0 0 0 1px ${C.btnBorder}`,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 400,
              color: C.btnText,
              letterSpacing: 0.1,
              userSelect: "none",
            }}
          >
            Commit
          </span>
        </div>

        {/* Dropdown arrow section */}
        <div
          style={{
            width: 24,
            height: SCM.commitBtnH,
            background: commitBg,
            borderRadius: "0 2px 2px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "default",
            borderLeft: "1px solid rgba(255,255,255,0.15)",
            boxShadow: `inset 0 0 0 1px ${C.btnBorder}`,
          }}
        >
          <ChevronDownIcon color="rgba(255,255,255,0.75)" />
        </div>
      </div>

      {/* ── 4. CHANGES section header ───────────────────────────────────────── */}
      <div
        style={{
          height: 28,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          paddingLeft: 10,
          paddingRight: 6,
          marginTop: 10,
          cursor: "default",
        }}
      >
        {/* Expand chevron */}
        <div style={{ marginRight: 2, marginLeft: -4 }}>
          <ChevronDownIcon color={C.label} />
        </div>

        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.7,
            color: C.sectionLabel,
            textTransform: "uppercase",
            flex: 1,
            userSelect: "none",
          }}
        >
          Changes
        </span>

        {/* Badge */}
        <div
          style={{
            fontSize: 11,
            color: C.badgeText,
            background: C.badgeBg,
            borderRadius: 10,
            padding: "1px 6px",
            lineHeight: "16px",
            fontWeight: 500,
            minWidth: 16,
            textAlign: "center",
          }}
        >
          {CHANGED_FILES.length}
        </div>
      </div>

      {/* ── 5. File rows ────────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0 }}>
        {CHANGED_FILES.map((f, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              height: SCM.fileRowH,
              paddingLeft: 28,   // indented under CHANGES
              paddingRight: 8,
              gap: 6,
              background: i === 0 ? C.activeRowBg : "transparent",
              cursor: "default",
            }}
          >
            {/* File name */}
            <span
              style={{
                fontSize: 13,
                color: C.text,
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                userSelect: "none",
              }}
            >
              {f.filename}
            </span>

            {/* Path (dimmed) */}
            <span
              style={{
                fontSize: 11,
                color: C.textDim,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 80,
                userSelect: "none",
              }}
            >
              {f.path}
            </span>

            {/* Status letter badge */}
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: STATUS_COLOR[f.status],
                minWidth: 14,
                textAlign: "right",
                userSelect: "none",
                letterSpacing: 0,
              }}
            >
              {STATUS_LABEL[f.status]}
            </span>

            {/* Hover action icons (always shown at low opacity for readability) */}
            <div style={{ display: "flex", gap: 2, opacity: i === 0 ? 0.75 : 0.35, marginLeft: 2 }}>
              <RevertIcon />
              <StageIcon />
            </div>
          </div>
        ))}
      </div>

      {/* ── 6. Footer / sync info ───────────────────────────────────────────── */}
      <div style={{ flex: 1 }} />
      <div
        style={{
          flexShrink: 0,
          borderTop: `1px solid ${C.border}`,
          padding: "7px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "default",
        }}
      >
        <SyncIcon />
        <span style={{ fontSize: 11, color: C.label, userSelect: "none" }}>
          Sync Changes{" "}
          <span style={{ color: C.textDim, fontSize: 11 }}>0↑ 0↓</span>
        </span>
      </div>
    </div>
  );
};
