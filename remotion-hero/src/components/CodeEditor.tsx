import React from "react";
import { IDE, CONTENT_Y } from "../timeline";

// VS Code Dark+ accurate code editor pane.
// Uses Consolas (VS Code's actual default editor font).

const C = {
  bg:           "#1e1e1e",
  tabBarBg:     "#2d2d2d",    // VS Code tab bar background
  tabActive:    "#1e1e1e",    // active tab matches editor bg
  tabAccent:    "#0e639c",    // VS Code focus blue (not #0066FF)
  tabInactive:  "#2d2d2d",
  lineNum:      "#6e6e6e",    // VS Code inactive line number
  lineNumActive:"#c6c6c6",   // VS Code active line number
  keyword:      "#569cd6",
  typeKw:       "#4ec9b0",
  func:         "#dcdcaa",
  str:          "#ce9178",
  comment:      "#6a9955",
  normal:       "#d4d4d4",
  num:          "#b5cea8",
  punct:        "#d4d4d4",
  prop:         "#9cdcfe",
  lineHighlight:"rgba(255,255,255,0.04)",
  minimap:      "#252526",
  breadcrumb:   "#3c3c3c",
};

type Token = { type: keyof typeof C | "operator" | "decorator" | "import"; text: string };
type Line  = Token[];

const K  = (text: string): Token => ({ type: "keyword",  text });
const T  = (text: string): Token => ({ type: "typeKw",   text });
const F  = (text: string): Token => ({ type: "func",     text });
const S  = (text: string): Token => ({ type: "str",      text });
const Cm = (text: string): Token => ({ type: "comment",  text });
const N  = (text: string): Token => ({ type: "normal",   text });
const P  = (text: string): Token => ({ type: "prop",     text });
const _  = ():             Token => ({ type: "normal",   text: " " });

const CODE_LINES: Line[] = [
  [ Cm("// src/components/Dashboard.tsx") ],
  [],
  [ K("import"), _(), N("{"), _(), F("useState"), N(","), _(), F("useEffect"), _(), N("}"), _(), K("from"), _(), S("'react'"), N(";") ],
  [ K("import"), _(), N("{"), _(), P("api"), _(), N("}"), _(), K("from"), _(), S("'../services/api'"), N(";") ],
  [ K("import"), _(), K("type"), _(), N("{"), _(), T("UserProfile"), _(), N("}"), _(), K("from"), _(), S("'../types'"), N(";") ],
  [],
  [ K("interface"), _(), T("DashboardProps"), _(), N("{") ],
  [ N("  "), P("userId"), N(": "), T("string"), N(";") ],
  [ N("  "), P("onSignOut"), N("?: () => "), T("void"), N(";") ],
  [ N("}") ],
  [],
  [ K("export"), _(), K("function"), _(), F("Dashboard"), N("({ "), P("userId"), N(", "), P("onSignOut"), N(" }: "), T("DashboardProps"), N(") {") ],
  [ N("  "), K("const"), _(), N("["), P("profile"), N(", "), F("setProfile"), N("]"), _(), N("="), _(), F("useState"), N("<"), T("UserProfile"), _(), N("|"), _(), T("null"), N(">("), K("null"), N(");") ],
  [ N("  "), K("const"), _(), N("["), P("loading"), N(", "), F("setLoading"), N("]"), _(), N("="), _(), F("useState"), N("<"), T("boolean"), N(">("), K("true"), N(");") ],
  [],
  [ N("  "), F("useEffect"), N("(() => {") ],
  [ N("    "), N("api."), F("getProfile"), N("(userId)") ],
  [ N("      ."), F("then"), N("(data => {") ],
  [ N("        "), F("setProfile"), N("(data);") ],
  [ N("        "), F("setLoading"), N("("), K("false"), N(");") ],
  [ N("      })")],
  [ N("      ."), F("catch"), N("(err => console."), F("error"), N("("), S("'Profile fetch:'"), N(", err));") ],
  [ N("  }, [userId]);") ],
  [],
  [ N("  "), K("if"), N(" (loading) "), K("return"), _(), N("<div className="), S('"skeleton-loader"'), N(" />;") ],
  [],
  [ N("  "), K("return"), N(" (") ],
  [ N("    <div className="), S('"dashboard"'), N(">") ],
  [ N("      <header>") ],
  [ N("        <h1>Welcome, {profile?."), P("name"), N(" ?? "), S('"User"'), N("}</h1>") ],
  [ N("        <button onClick={onSignOut}>Sign out</button>") ],
  [ N("      </header>") ],
  [ N("      <main>") ],
  [ N("        "), Cm("{/* activity feed goes here */}") ],
  [ N("      </main>") ],
  [ N("    </div>") ],
  [ N("  );") ],
  [ N("}") ],
];

function tokenColor(type: Token["type"]): string {
  switch (type) {
    case "keyword":  return C.keyword;
    case "typeKw":   return C.typeKw;
    case "func":     return C.func;
    case "str":      return C.str;
    case "comment":  return C.comment;
    case "num":      return C.num;
    case "prop":     return C.prop;
    default:         return C.normal;
  }
}

const LINE_H       = 24;
const FONT_SIZE    = 14;
const LINE_NUM_W   = 52;
const PADDING_LEFT = 12;
const MINIMAP_W    = 70;
const BREADCRUMB_H = 22;
const TAB_BAR_H    = IDE.tabBarH;

// Minimap "code line" stubs — deterministic widths simulating line lengths
const MINIMAP_LINES = CODE_LINES.map((line) => {
  if (line.length === 0) return 0;
  const textLen = line.reduce((acc, t) => acc + t.text.length, 0);
  return Math.min(textLen * 1.8, MINIMAP_W - 8);
});

interface Props { slot?: string }

export const CodeEditor: React.FC<Props> = () => {
  const tabBarH   = TAB_BAR_H;
  const contentY  = CONTENT_Y + tabBarH;
  const ACTIVE_LINE = 11; // 0-indexed

  return (
    <div style={{ width: "100%", height: "100%", background: C.bg, position: "relative", overflow: "hidden" }}>

      {/* ── Tab bar ── */}
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: tabBarH,
          background: C.tabBarBg,
          display: "flex",
          alignItems: "flex-end",
          borderBottom: "1px solid rgba(0,0,0,0.4)",
        }}
      >
        {/* Active tab */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "0 12px",
            height: "100%",
            background: C.tabActive,
            borderTop: `1px solid ${C.tabAccent}`,
            borderRight: "1px solid rgba(255,255,255,0.07)",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 11, color: C.typeKw, fontFamily: "'Consolas','Courier New',monospace", fontWeight: 700, lineHeight: 1 }}>TS</span>
          <span style={{ fontSize: 13, color: C.normal }}>Dashboard.tsx</span>
          <span style={{ fontSize: 14, color: C.lineNum, marginLeft: 2, lineHeight: 1, opacity: 0.6 }}>×</span>
        </div>

        {/* Inactive tabs */}
        {["api.ts", "useData.ts"].map((name, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "0 12px",
              height: "100%",
              background: C.tabInactive,
              borderTop: "1px solid transparent",
              borderRight: "1px solid rgba(255,255,255,0.06)",
              opacity: 0.5,
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 11, color: C.typeKw, fontFamily: "'Consolas','Courier New',monospace", fontWeight: 700 }}>TS</span>
            <span style={{ fontSize: 13, color: C.lineNum }}>{name}</span>
            <span style={{ fontSize: 14, color: C.lineNum, marginLeft: 2, lineHeight: 1, opacity: 0.5 }}>×</span>
          </div>
        ))}
      </div>

      {/* ── Breadcrumb bar ── */}
      <div
        style={{
          position: "absolute",
          top: tabBarH,
          left: 0,
          right: 0,
          height: BREADCRUMB_H,
          background: C.bg,
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex",
          alignItems: "center",
          paddingLeft: LINE_NUM_W,
          gap: 4,
          fontSize: 12,
        }}
      >
        {[
          { label: "src",        color: C.lineNum },
          { label: ">",          color: C.lineNum, dim: true },
          { label: "components", color: C.lineNum },
          { label: ">",          color: C.lineNum, dim: true },
          { label: "Dashboard.tsx", color: C.typeKw },
        ].map(({ label, color, dim }, i) => (
          <span key={i} style={{ color, opacity: dim ? 0.5 : 0.8, whiteSpace: "nowrap" }}>
            {label}
          </span>
        ))}
      </div>

      {/* ── Editor content ── */}
      <div
        style={{
          position: "absolute",
          top: tabBarH + BREADCRUMB_H,
          left: 0,
          right: MINIMAP_W,
          bottom: 0,
          overflow: "hidden",
          fontFamily: "'Consolas', 'Courier New', 'Menlo', monospace",
          fontSize: FONT_SIZE,
          lineHeight: `${LINE_H}px`,
        }}
      >
        {/* Line-number gutter */}
        <div
          style={{
            position: "absolute",
            top: 0, left: 0,
            width: LINE_NUM_W,
            bottom: 0,
            background: C.bg,
            borderRight: "1px solid rgba(255,255,255,0.03)",
          }}
        />

        {/* Code lines */}
        {CODE_LINES.map((line, lineIdx) => {
          const isActive = lineIdx === ACTIVE_LINE;
          return (
            <div
              key={lineIdx}
              style={{
                display: "flex",
                alignItems: "center",
                height: LINE_H,
                background: isActive ? C.lineHighlight : "transparent",
              }}
            >
              {/* Line number */}
              <div
                style={{
                  width: LINE_NUM_W,
                  textAlign: "right",
                  paddingRight: 14,
                  color: isActive ? C.lineNumActive : C.lineNum,
                  flexShrink: 0,
                  userSelect: "none",
                  fontSize: 13,
                }}
              >
                {lineIdx + 1}
              </div>

              {/* Tokens */}
              <div style={{ paddingLeft: PADDING_LEFT }}>
                {line.map((tok, j) => (
                  <span key={j} style={{ color: tokenColor(tok.type), whiteSpace: "pre" }}>
                    {tok.text}
                  </span>
                ))}
              </div>
            </div>
          );
        })}

        {/* Scrollbar stub */}
        <div
          style={{
            position: "absolute",
            right: 0, top: 0, bottom: 0,
            width: 12,
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 38, right: 2,
              width: 8, height: 70,
              background: "rgba(255,255,255,0.10)",
              borderRadius: 4,
            }}
          />
        </div>
      </div>

      {/* ── Minimap ── */}
      <div
        style={{
          position: "absolute",
          top: tabBarH + BREADCRUMB_H,
          right: 0,
          width: MINIMAP_W,
          bottom: 0,
          background: "#1e1e1e",
          borderLeft: "1px solid rgba(255,255,255,0.04)",
          overflow: "hidden",
        }}
      >
        {/* Viewport highlight in minimap */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 130,
            background: "rgba(255,255,255,0.04)",
          }}
        />

        {/* Mini code lines */}
        {MINIMAP_LINES.map((w, i) => {
          if (w === 0) return null;
          const isActive = i === ACTIVE_LINE;
          // Color based on first token type in the line
          const firstToken = CODE_LINES[i]?.[0];
          let lineColor = "rgba(212,212,212,0.18)";
          if (firstToken?.type === "comment")   lineColor = "rgba(106,153,85,0.30)";
          if (firstToken?.type === "keyword")   lineColor = "rgba(86,156,214,0.30)";
          if (isActive) lineColor = "rgba(255,255,255,0.28)";
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: i * 4 + 2,
                left: 6,
                width: w * 0.35,
                height: 2,
                background: lineColor,
                borderRadius: 1,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
