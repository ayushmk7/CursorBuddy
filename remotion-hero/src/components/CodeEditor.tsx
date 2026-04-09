import React from "react";
import { IDE, EDITOR_X, W, CONTENT_Y, CONTENT_H } from "../timeline";

// Generic dark-theme code editor pane.
// Displays original/fictional TypeScript code — not copied from any real project.

const C = {
  bg:        "#1e1e1e",
  tabBg:     "#2d2d2f",
  tabActive: "#1e1e1e",
  tabBorder: "#0066FF",
  lineNum:   "#555558",
  keyword:   "#569cd6",
  typeKw:    "#4ec9b0",
  func:      "#dcdcaa",
  str:       "#ce9178",
  comment:   "#6a9955",
  normal:    "#d4d4d4",
  num:       "#b5cea8",
  punct:     "#d4d4d4",
  prop:      "#9cdcfe",
  cursor:    "rgba(255,255,255,0.07)",
  mini:      "#3c3c3c",
};

type Token = { type: keyof typeof C | "operator" | "decorator" | "import"; text: string };
type Line  = Token[];

const K = (text: string): Token => ({ type: "keyword", text });
const T = (text: string): Token => ({ type: "typeKw", text });
const F = (text: string): Token => ({ type: "func", text });
const S = (text: string): Token => ({ type: "str", text });
const Cm= (text: string): Token => ({ type: "comment", text });
const N = (text: string): Token => ({ type: "normal", text });
const P = (text: string): Token => ({ type: "prop", text });
const Num=(text: string): Token => ({ type: "num", text });
const _ = (): Token => ({ type: "normal", text: " " });
const CMT = (text: string): Token => ({ type: "comment", text });

const CODE_LINES: Line[] = [
  [ CMT("// src/components/Dashboard.tsx") ],
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
    case "keyword":   return C.keyword;
    case "typeKw":    return C.typeKw;
    case "func":      return C.func;
    case "str":       return C.str;
    case "comment":   return C.comment;
    case "num":       return C.num;
    case "prop":      return C.prop;
    default:          return C.normal;
  }
}

const LINE_H = 24;
const FONT_SIZE = 14;
const LINE_NUM_W = 52;
const PADDING_LEFT = 12;

interface Props { slot?: string }

export const CodeEditor: React.FC<Props> = () => {
  const tabBarH = IDE.tabBarH;
  const contentY = CONTENT_Y + tabBarH;

  return (
    <div style={{ width: "100%", height: "100%", background: C.bg, position: "relative", overflow: "hidden" }}>

      {/* ── Tab bar ── */}
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: tabBarH,
          background: C.tabBg,
          display: "flex",
          alignItems: "flex-end",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Active tab */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "0 14px",
            height: "100%",
            background: C.tabActive,
            borderTop: `2px solid ${C.tabBorder}`,
            borderRight: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <span style={{ fontSize: 12, color: "#4ec9b0", fontFamily: "monospace", fontWeight: 600 }}>TS</span>
          <span style={{ fontSize: 13, color: C.normal }}>Dashboard.tsx</span>
          <span style={{ fontSize: 14, color: C.lineNum, marginLeft: 4, lineHeight: 1 }}>×</span>
        </div>
        {/* Inactive tabs */}
        {["api.ts", "useData.ts"].map((name, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "0 14px",
              height: "100%",
              borderRight: "1px solid rgba(255,255,255,0.06)",
              opacity: 0.55,
            }}
          >
            <span style={{ fontSize: 12, color: C.typeKw, fontFamily: "monospace", fontWeight: 600 }}>TS</span>
            <span style={{ fontSize: 13, color: C.lineNum }}>{name}</span>
          </div>
        ))}
      </div>

      {/* ── Editor content ── */}
      <div
        style={{
          position: "absolute",
          top: tabBarH,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: "hidden",
          fontFamily: "'SF Mono', 'Menlo', 'Fira Code', 'Consolas', monospace",
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
            borderRight: "1px solid rgba(255,255,255,0.04)",
          }}
        />

        {/* Code lines */}
        {CODE_LINES.map((line, lineIdx) => (
          <div
            key={lineIdx}
            style={{
              display: "flex",
              alignItems: "center",
              height: LINE_H,
              background: lineIdx === 11 ? C.cursor : "transparent", // highlight active line
            }}
          >
            {/* Line number */}
            <div
              style={{
                width: LINE_NUM_W,
                textAlign: "right",
                paddingRight: 14,
                color: lineIdx === 11 ? "rgba(255,255,255,0.4)" : C.lineNum,
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
        ))}

        {/* Scrollbar stub */}
        <div
          style={{
            position: "absolute",
            right: 0, top: 0, bottom: 0,
            width: 14,
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 40, right: 2,
              width: 10, height: 80,
              background: "rgba(255,255,255,0.12)",
              borderRadius: 5,
            }}
          />
        </div>
      </div>
    </div>
  );
};
