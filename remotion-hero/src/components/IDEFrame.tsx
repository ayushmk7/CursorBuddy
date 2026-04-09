import React from "react";
import { W, H, IDE, SIDEBAR_X, SIDEBAR_W, EDITOR_X, CONTENT_Y, CONTENT_H } from "../timeline";

// ── VS Code Dark+ colour tokens (accurate to the real theme) ─────────────────
const C = {
  titleBar:    "#3c3c3c",   // VS Code Dark+ titleBar.activeBackground
  activityBar: "#333333",   // VS Code Dark+ activityBar.background
  statusBar:   "#007acc",   // VS Code Dark+ statusBar.background
  border:      "rgba(255,255,255,0.08)",
  borderMid:   "rgba(255,255,255,0.13)",
  text:        "#cccccc",
  textMuted:   "#8a8a8e",
  textDim:     "#555558",
};

// ── Traffic-light window controls ─────────────────────────────────────────────
const TrafficLights: React.FC = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 16, flexShrink: 0 }}>
    {[["#ff5f57","#e0443e"], ["#febc2e","#d4a012"], ["#28c840","#1aab29"]].map(([fill, shadow], i) => (
      <div
        key={i}
        style={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: fill,
          boxShadow: `0 0 0 0.5px ${shadow}`,
        }}
      />
    ))}
  </div>
);

// ── Codicon-accurate activity bar icons ───────────────────────────────────────
const FilesIcon: React.FC<{ active?: boolean }> = ({ active }) => {
  const s = active ? "#ffffff" : C.textMuted;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      {/* Back page */}
      <path d="M4 4h9l5 5v11H4V4z" stroke={s} strokeWidth="1.4" strokeLinejoin="round" />
      {/* Front page (offset) */}
      <path d="M7 2h9l5 5v11" stroke={s} strokeWidth="1.4" strokeLinejoin="round" opacity="0.55" />
      {/* Fold */}
      <path d="M13 4v5h5" stroke={s} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
};

const SearchIcon: React.FC<{ active?: boolean }> = ({ active }) => {
  const s = active ? "#fff" : C.textMuted;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="6.5" stroke={s} strokeWidth="1.4" />
      <path d="M16.5 16.5L21 21" stroke={s} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
};

const GitIcon: React.FC<{ active?: boolean }> = ({ active }) => {
  const s = active ? "#fff" : C.textMuted;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="18" cy="18" r="2.5" stroke={s} strokeWidth="1.4" />
      <circle cx="6"  cy="6"  r="2.5" stroke={s} strokeWidth="1.4" />
      <circle cx="6"  cy="18" r="2.5" stroke={s} strokeWidth="1.4" />
      <path d="M8.5 6H16a2 2 0 0 1 2 2v7.5" stroke={s} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="6" y1="8.5" x2="6" y2="15.5" stroke={s} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
};

const RunDebugIcon: React.FC<{ active?: boolean }> = ({ active }) => {
  const s = active ? "#fff" : C.textMuted;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      {/* Play arrow */}
      <path d="M7 4l13 8-13 8V4z" stroke={s} strokeWidth="1.4" strokeLinejoin="round" />
      {/* Bug circle below */}
      <circle cx="12" cy="20" r="2" stroke={s} strokeWidth="1.2" opacity="0.7" />
    </svg>
  );
};

const ExtIcon: React.FC<{ active?: boolean }> = ({ active }) => {
  const s = active ? "#fff" : C.textMuted;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3"  y="3"  width="7.5" height="7.5" rx="1.2" stroke={s} strokeWidth="1.4" />
      <rect x="13.5" y="3"  width="7.5" height="7.5" rx="1.2" stroke={s} strokeWidth="1.4" />
      <rect x="3"  y="13.5" width="7.5" height="7.5" rx="1.2" stroke={s} strokeWidth="1.4" />
      <path d="M13.5 17.25h7.5M17.25 13.5v7.5" stroke={s} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
};

const SettingsIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3" stroke={C.textDim} strokeWidth="1.4" />
    <path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
      stroke={C.textDim}
      strokeWidth="1.4"
    />
  </svg>
);

const AccountIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="4" stroke={C.textDim} strokeWidth="1.4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={C.textDim} strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

// ── Props ─────────────────────────────────────────────────────────────────────
interface IDEFrameProps {
  scmActive: boolean;
  children: React.ReactNode;
}

// Activity bar icons in order
const ACTIVITY_ICONS = (scmActive: boolean) => [
  <FilesIcon    key="f" active={!scmActive} />,
  <SearchIcon   key="s" />,
  <GitIcon      key="g" active={scmActive} />,
  <RunDebugIcon key="r" />,
  <ExtIcon      key="e" />,
];

// Active indicator y offset for each icon slot (8px top padding + slot_index * 48)
const INDICATOR_Y = (i: number) => 8 + i * 48 + 12;

// ── Component ─────────────────────────────────────────────────────────────────
export const IDEFrame: React.FC<IDEFrameProps> = ({ scmActive, children }) => {
  const activeIconIdx = scmActive ? 2 : 0; // SCM = index 2, Explorer = index 0

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: W,
        height: H,
        background: "#1e1e1e",
        fontFamily: "'Segoe UI', 'SF Pro Text', system-ui, sans-serif",
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
          borderBottom: `1px solid rgba(0,0,0,0.3)`,
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
            color: "rgba(204,204,204,0.9)",
            letterSpacing: 0.1,
            fontWeight: 400,
          }}
        >
          Dashboard.tsx — my-app
        </div>
        {/* right padding to balance traffic lights */}
        <div style={{ width: 64 }} />
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
          borderRight: `1px solid rgba(0,0,0,0.35)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 8,
          zIndex: 9,
        }}
      >
        {/* Active indicator bar */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: INDICATOR_Y(activeIconIdx),
            width: 2,
            height: 24,
            background: "#ffffff",
            borderRadius: "0 2px 2px 0",
            transition: "top 0.2s",
          }}
        />

        {/* Icons */}
        {ACTIVITY_ICONS(scmActive).map((icon, i) => {
          const isActive = i === activeIconIdx;
          return (
            <div
              key={i}
              style={{
                width: 48,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: isActive ? 1 : 0.42,
                cursor: "default",
              }}
            >
              {icon}
            </div>
          );
        })}

        {/* Bottom: Account + Settings */}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 4, gap: 0 }}>
          <div style={{ width: 48, height: 44, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.32 }}>
            <AccountIcon />
          </div>
          <div style={{ width: 48, height: 44, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.32 }}>
            <SettingsIcon />
          </div>
        </div>
      </div>

      {/* ── Sidebar area ── */}
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
          justifyContent: "space-between",
          paddingLeft: 10,
          paddingRight: 10,
          zIndex: 10,
          boxSizing: "border-box",
        }}
      >
        {/* Left side */}
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {[
            { icon: "⎇", label: " main" },
            { icon: "✕", label: " 0", color: "rgba(255,255,255,0.75)" },
            { icon: "⚠", label: " 2", color: "rgba(255,255,255,0.75)" },
          ].map(({ icon, label, color }, i) => (
            <span
              key={i}
              style={{
                fontSize: 12,
                color: color ?? "rgba(255,255,255,0.9)",
                whiteSpace: "nowrap",
                padding: "0 8px",
                lineHeight: `${IDE.statusBarH}px`,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              {icon}{label}
            </span>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {["Ln 24, Col 3", "Spaces: 2", "UTF-8", "LF", "TypeScript", "Prettier"].map((item, i) => (
            <span
              key={i}
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.85)",
                whiteSpace: "nowrap",
                padding: "0 7px",
                lineHeight: `${IDE.statusBarH}px`,
              }}
            >
              {item}
            </span>
          ))}
        </div>
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
};
