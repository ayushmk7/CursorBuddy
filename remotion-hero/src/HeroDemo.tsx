import React from "react";
import {
  useCurrentFrame,
  interpolate,
  AbsoluteFill,
} from "remotion";

import { PHASES, TOTAL_FRAMES, LAG_FRAMES, W, H, EDITOR_X, EDITOR_CONTENT_Y, SCM, SIDEBAR_X, IDE } from "./timeline";
import { getCameraState } from "./utils/camera";
import { getUserCursorPos, getAgentCursorPos } from "./utils/cursorPath";

import { VirtualCamera }    from "./components/VirtualCamera";
import { IDEFrame }         from "./components/IDEFrame";
import { FileTreeSidebar }  from "./components/FileTreeSidebar";
import { SCMSidebar }       from "./components/SCMSidebar";
import { CodeEditor }       from "./components/CodeEditor";
import { Caption }          from "./components/Caption";
import { Cursors }          from "./components/Cursors";
import { Callout }          from "./components/Callout";

const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

// ── Transitioning caret constants ────────────────────────────────────────────
// Editor caret: on active line (line 11, 0-indexed), col ~25
// x = EDITOR_X(300) + lineNumW(52) + padding(12) + ~25chars * ~8.4px = ~674
// y = EDITOR_CONTENT_Y(62) + breadcrumb(22) + 11*lineH(24) + lineH/2 = 62+22+264+12 = 360
const EDITOR_CARET = { x: 620, y: 360 };

// Commit message box caret: top-left of textarea text area
// x = SIDEBAR_X(48) + sectionPad(12) + boxPadL(10) = 70
// y = SCM.msgBoxY(440) + boxPadT(8) + 8 = 456
const COMMIT_CARET = { x: 70, y: 456 };

// Frame range for the caret travel animation
const CARET_START   = PHASES.C.start;       // 195 — begin transitioning
const CARET_ARRIVE  = PHASES.C.start + 55;  // 250 — arrived at commit box
const CARET_FADEOUT = PHASES.D.start - 5;   // 280 — fade just before Phase D

// ─────────────────────────────────────────────────────────────────────────────
// HeroDemo
// Phases:
//   A (0–105):   Dark IDE, figure-8 cursor, agent follows
//   B (105–195): Waveform + "Where do I commit?" caption
//   C (195–285): Crossfade to SCM panel; caret travels editor→commit box
//   D (285–405): Callout "Here's where you commit." + click on Commit
//   E (405–450): Breathe out; cursors/camera return to Phase A start → loop
// ─────────────────────────────────────────────────────────────────────────────
export const HeroDemo: React.FC = () => {
  const frame = useCurrentFrame();

  // ── Camera ────────────────────────────────────────────────────────────────
  const camera = getCameraState(frame);

  // ── SCM sidebar crossfade (Phase C) ──────────────────────────────────────
  const scmOpacity = interpolate(
    frame,
    [PHASES.C.start, PHASES.C.start + 20],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const fileTreeOpacity = 1 - scmOpacity;

  // ── Caption / speech overlay (Phase B) ──────────────────────────────────
  const captionOpacity = interpolate(
    frame,
    [PHASES.B.start + 8, PHASES.B.start + 22, PHASES.B.end - 12, PHASES.B.end],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── Callout (Phase D) ────────────────────────────────────────────────────
  const calloutOpacity = interpolate(
    frame,
    [PHASES.D.start, PHASES.D.start + 18, PHASES.D.end - 14, PHASES.D.end],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── Loop fade (Phase E end) ───────────────────────────────────────────────
  const loopFade = interpolate(
    frame,
    [PHASES.E.end - 10, PHASES.E.end - 2],
    [0, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── Cursor positions ──────────────────────────────────────────────────────
  const userPos  = getUserCursorPos(frame);
  const agentPos = getAgentCursorPos(frame, LAG_FRAMES);
  const trailPositions = [3, 6, 9].map((extra) =>
    getAgentCursorPos(frame, LAG_FRAMES + extra)
  );

  // ── SCM active (activity-bar highlight) ──────────────────────────────────
  const scmActive = frame >= PHASES.C.start;

  // ── Transitioning caret ───────────────────────────────────────────────────
  // Eased travel progress 0→1 from CARET_START to CARET_ARRIVE
  const rawT = clamp01((frame - CARET_START) / (CARET_ARRIVE - CARET_START));
  const easedT = rawT < 0.5 ? 2 * rawT * rawT : -1 + (4 - 2 * rawT) * rawT;

  const caretX = EDITOR_CARET.x + (COMMIT_CARET.x - EDITOR_CARET.x) * easedT;
  const caretY = EDITOR_CARET.y + (COMMIT_CARET.y - EDITOR_CARET.y) * easedT;

  const caretOpacity = interpolate(
    frame,
    [CARET_START - 8, CARET_START, CARET_FADEOUT - 8, CARET_FADEOUT],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Blink after caret has arrived (frame % 30: on 18 frames, off 12 frames)
  const caretArrived = frame >= CARET_ARRIVE;
  const caretBlink   = caretArrived ? (frame % 30 < 18 ? 1 : 0.05) : 1;
  const showCaret    = caretOpacity > 0.01;

  return (
    <AbsoluteFill style={{ background: "#1e1e1e" }}>
      <VirtualCamera camera={camera}>
        <IDEFrame scmActive={scmActive}>

          {/* ── Sidebar slot ── */}
          {fileTreeOpacity > 0.01 && (
            <div slot="sidebar" style={{ position: "absolute", inset: 0, opacity: fileTreeOpacity, zIndex: 2 }}>
              <FileTreeSidebar />
            </div>
          )}
          {scmOpacity > 0.01 && (
            <div slot="sidebar" style={{ position: "absolute", inset: 0, opacity: scmOpacity, zIndex: 3 }}>
              <SCMSidebar frame={frame} />
            </div>
          )}

          {/* ── Editor slot ── */}
          <div slot="editor" style={{ position: "absolute", inset: 0 }}>
            <CodeEditor />
          </div>

          {/* ── Transitioning caret (one continuous cursor story) ── */}
          {showCaret && (
            <div
              style={{
                position: "absolute",
                left: caretX,
                top:  caretY,
                width: 2,
                height: 17,
                background: "#0e639c",
                opacity: caretOpacity * caretBlink,
                pointerEvents: "none",
                zIndex: 48,
                boxShadow: "0 0 4px rgba(14,99,156,0.7)",
              }}
            />
          )}

          {/* ── Speech overlay (mic + waveform + typewriter text) ── */}
          {captionOpacity > 0.01 && (
            <Caption opacity={captionOpacity} frame={frame} />
          )}

          {/* ── Callout ── */}
          {calloutOpacity > 0.01 && (
            <Callout opacity={calloutOpacity} />
          )}

          {/* ── Cursors — always on top ── */}
          <Cursors
            userPos={userPos}
            agentPos={agentPos}
            trailPositions={trailPositions}
          />
        </IDEFrame>
      </VirtualCamera>

      {/* ── Loop fade overlay ── */}
      {loopFade > 0.001 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#1e1e1e",
            opacity: loopFade,
            pointerEvents: "none",
            zIndex: 100,
          }}
        />
      )}

      {/* ── Fine print — fixed position, outside camera transform ── */}
      <div
        style={{
          position: "absolute",
          bottom: IDE.statusBarH + 5,
          left: 12,
          fontSize: 9,
          color: "rgba(255,255,255,0.22)",
          fontFamily: "'Segoe UI', 'SF Pro Text', system-ui, sans-serif",
          letterSpacing: 0.2,
          pointerEvents: "none",
          zIndex: 200,
          userSelect: "none",
          lineHeight: 1,
        }}
      >
        For illustration purposes only — not Microsoft VS Code®
      </div>
    </AbsoluteFill>
  );
};
