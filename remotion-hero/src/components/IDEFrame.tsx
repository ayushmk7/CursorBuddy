import React from "react";
import { W, H, IDE, SIDEBAR_X, SIDEBAR_W, EDITOR_X, CONTENT_Y, CONTENT_H } from "../timeline";

// ── colour tokens ────────────────────────────────────────────────────────────
const C = {
  titleBar:    "#2c2c2e",
  activityBar: "#2d2d2f",
  statusBar:   "#007acc",
  border:      "rgba(255,255,255,0.08)",
  borderMid:   "rgba(255,255,255,0.13)",
  text:        "#cccccc",
  textMuted:   "#8a8a8e",
  textDim:     "#555558",
};

// ── Activity-bar icons (generic SVG paths) ────────────────────────────────────
const FilesIcon: React.FC<{ active?: boolean }> = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"
      stroke={active ? "#ffffff" : C.textMuted}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13 2v7h7"
      stroke={active ? "#ffffff" : C.textMuted}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SearchIcon: React.FC<{ active?: boolean }> = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="7" stroke={active ? "#fff" : C.textMuted} strokeWidth="1.5" />
    <path d="M21 21l-4.35-4.35" stroke={active ? "#fff" : C.textMuted} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const GitIcon: React.FC<{ active?: boolean }> = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <circle cx="18" cy="18" r="2.5" stroke={active ? "#fff" : C.textMuted} strokeWidth="1.5" />
    <circle cx="6"  cy="6"  r="2.5" stroke={active ? "#fff" : C.textMuted} strokeWidth="1.5" />
    <circle cx="6"  cy="18" r="2.5" stroke={active ? "#fff" : C.textMuted} strokeWidth="1.5" />
    <path d="M8.5 6H16a2 2 0 0 1 2 2v7.5" stroke={active ? "#fff" : C.textMuted} strokeWidth="1.5" strokeLinecap="round" />
    <line x1="6" y1="8.5" x2="6" y2="15.5" stroke={active ? "#fff" : C.textMuted} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const ExtIcon: React.FC<{ active?: boolean }> = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect x="3"  y="3"  width="8" height="8" rx="1" stroke={active ? "#fff" : C.textMuted} strokeWidth="1.5" />
    <rect x="13" y="3"  width="8" height="8" rx="1" stroke={active ? "#fff" : C.textMuted} strokeWidth="1.5" />
    <rect x="3"  y="13" width="8" height="8" rx="1" stroke={active ? "#fff" : C.textMuted} strokeWidth="1.5" />
    <path d="M13 17h8M17 13v8" stroke={active ? "#fff" : C.textMuted} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const SettingsIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3" stroke={C.textDim} strokeWidth="1.5" />
    <path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
      stroke={C.textDim}
      strokeWidth="1.5"
    />
  </svg>
);

// ── Traffic-light window controls ─────────────────────────────────────────────
const TrafficLights: React.FC = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 16 }}>
    {[["#ff5f57","#e0443e"], ["#febc2e","#d4a012"], ["#28c840","#1aab29"]].map(([fill, hover], i) => (
      <div
        key={i}
        style={{
          width: 13,
          height: 13,
          borderRadius: "50%",
          background: fill,
          boxShadow: `0 0 0 0.5px ${hover}`,
        }}
      />
    ))}
  </div>
);

// ── Props ─────────────────────────────────────────────────────────────────────
interface IDEFrameProps {
  scmActive: boolean;      // switches activity-bar icon highlight
  children: React.ReactNode;
}

// ── Component ─────────────────────────────────────────────────────────────────
export const IDEFrame: React.FC<IDEFrameProps> = ({ scmActive, children }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      width: W,
      height: H,
      background: "#1e1e1e",
      fontFamily: "'SF Pro Text', 'Segoe UI', system-ui, sans-serif",
      userSelect: "none",
    }}
  >
    {/* ── Title bar ── */}
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: W,
        height: IDE.titleBarH,
        background: C.titleBar,
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "center",
        zIndex: 10,
      }}
    >
      <TrafficLights />
      <div
        style={{
          flex: 1,
          textAlign: "center",
          fontSize: 13,
          color: C.textMuted,
          letterSpacing: 0.1,
        }}
      >
        Dashboard.tsx — my-app
      </div>
      {/* right padding placeholder */}
      <div style={{ width: 80 }} />
    </div>

    {/* ── Activity bar ── */}
    <div
      style={{
        position: "absolute",
        top: CONTENT_Y,
        left: 0,
        width: IDE.activityBarW,
        height: CONTENT_H,
        background: C.activityBar,
        borderRight: `1px solid ${C.border}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 8,
        zIndex: 9,
      }}
    >
      {/* Active indicator bar */}
      {!scmActive && (
        <div style={{ position: "absolute", left: 0, top: 8 + 14, width: 2, height: 24, background: "#ffffff", borderRadius: "0 2px 2px 0" }} />
      )}
      {scmActive && (
        <div style={{ position: "absolute", left: 0, top: 8 + 60, width: 2, height: 24, background: "#ffffff", borderRadius: "0 2px 2px 0" }} />
      )}

      {/* Icons */}
      {[
        <FilesIcon key="f" active={!scmActive} />,
        <SearchIcon key="s" />,
        <GitIcon key="g" active={scmActive} />,
        <ExtIcon key="e" />,
      ].map((icon, i) => (
        <div
          key={i}
          style={{
            width: 48,
            height: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: (i === 0 && !scmActive) || (i === 2 && scmActive) ? 1 : 0.45,
            cursor: "default",
          }}
        >
          {icon}
        </div>
      ))}

      {/* Settings at bottom */}
      <div style={{ marginTop: "auto", marginBottom: 12, opacity: 0.35 }}>
        <SettingsIcon />
      </div>
    </div>

    {/* ── Sidebar area (children provide content) ── */}
    <div
      style={{
        position: "absolute",
        top: CONTENT_Y,
        left: SIDEBAR_X,
        width: SIDEBAR_W,
        height: CONTENT_H,
        background: "#252526",
        borderRight: `1px solid ${C.borderMid}`,
        overflow: "hidden",
        zIndex: 8,
      }}
    >
      {/* Children inject either FileTreeSidebar or SCMSidebar here */}
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && (child as React.ReactElement<{slot?: string}>).props.slot === "sidebar") {
          return child;
        }
        return null;
      })}
    </div>

    {/* ── Editor / main pane ── */}
    <div
      style={{
        position: "absolute",
        top: CONTENT_Y,
        left: EDITOR_X,
        width: W - EDITOR_X,
        height: CONTENT_H,
        background: "#1e1e1e",
        overflow: "hidden",
        zIndex: 7,
      }}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && (child as React.ReactElement<{slot?: string}>).props.slot === "editor") {
          return child;
        }
        return null;
      })}
    </div>

    {/* ── Status bar ── */}
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width: W,
        height: IDE.statusBarH,
        background: C.statusBar,
        display: "flex",
        alignItems: "center",
        paddingLeft: 12,
        gap: 16,
        zIndex: 10,
      }}
    >
      {["⎇  main", "✓ 0", "⚠ 2", "TypeScript", "UTF-8", "LF", "Ln 24, Col 3"].map((item, i) => (
        <span key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", whiteSpace: "nowrap" }}>
          {item}
        </span>
      ))}
    </div>

    {/* ── Overlay children (cursors, waveform, captions, callout) ── */}
    {React.Children.map(children, (child) => {
      if (
        React.isValidElement(child) &&
        (child as React.ReactElement<{slot?: string}>).props.slot !== "sidebar" &&
        (child as React.ReactElement<{slot?: string}>).props.slot !== "editor"
      ) {
        return child;
      }
      return null;
    })}
  </div>
);
