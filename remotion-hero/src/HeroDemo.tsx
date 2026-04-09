import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  AbsoluteFill,
} from "remotion";

import { PHASES, TOTAL_FRAMES, LAG_FRAMES, W, H } from "./timeline";
import { getCameraState } from "./utils/camera";
import { getUserCursorPos, getAgentCursorPos } from "./utils/cursorPath";

import { VirtualCamera }    from "./components/VirtualCamera";
import { IDEFrame }         from "./components/IDEFrame";
import { FileTreeSidebar }  from "./components/FileTreeSidebar";
import { SCMSidebar }       from "./components/SCMSidebar";
import { CodeEditor }       from "./components/CodeEditor";
import { Waveform }         from "./components/Waveform";
import { Caption }          from "./components/Caption";
import { Cursors }          from "./components/Cursors";
import { Callout }          from "./components/Callout";

const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

// ─────────────────────────────────────────────────────────────────────────────
// HeroDemo
// Phases:
//   A (0–105):   Dark IDE, figure-8 cursor, agent follows
//   B (105–195): Scripted waveform + caption "Where do I commit?"
//   C (195–285): Crossfade to SCM panel
//   D (285–405): Callout "Here's where you commit." + click on Commit
//   E (405–450): Breathe out; cursors/camera return to Phase A start → loop
// ─────────────────────────────────────────────────────────────────────────────
export const HeroDemo: React.FC = () => {
  const frame = useCurrentFrame();

  // ── Camera ────────────────────────────────────────────────────────────────
  const camera = getCameraState(frame);

  // ── SCM sidebar crossfade (Phase C) ──────────────────────────────────────
  // File tree → SCM: fade over 20 frames
  const scmOpacity = interpolate(
    frame,
    [PHASES.C.start, PHASES.C.start + 20],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const fileTreeOpacity = 1 - scmOpacity;

  // ── Waveform (Phase B) ────────────────────────────────────────────────────
  const waveformOpacity = interpolate(
    frame,
    [PHASES.B.start, PHASES.B.start + 12, PHASES.B.end - 12, PHASES.B.end],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const waveFrame = Math.max(0, frame - PHASES.B.start); // offset within Phase B

  // ── Caption (Phase B) ────────────────────────────────────────────────────
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

  // ── Loop fade (Phase E end → start) ──────────────────────────────────────
  // Brief black dip at the very end to cover any micro-jitter on loop reset
  const loopFade = interpolate(
    frame,
    [PHASES.E.end - 10, PHASES.E.end - 2],
    [0, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── Cursor positions ──────────────────────────────────────────────────────
  const userPos  = getUserCursorPos(frame);
  const agentPos = getAgentCursorPos(frame, LAG_FRAMES);

  // Trail: agent cursor positions at -3, -6, -9 frames (beyond the lag offset)
  const trailPositions = [3, 6, 9].map((extra) =>
    getAgentCursorPos(frame, LAG_FRAMES + extra)
  );

  // ── SCM active (activity-bar highlight) ──────────────────────────────────
  const scmActive = frame >= PHASES.C.start;

  return (
    <AbsoluteFill style={{ background: "#1e1e1e" }}>
      <VirtualCamera camera={camera}>
        <IDEFrame scmActive={scmActive}>

          {/* ── Sidebar slot ── */}
          {/* File tree fades out during Phase C */}
          {fileTreeOpacity > 0.01 && (
            <div slot="sidebar" style={{ position: "absolute", inset: 0, opacity: fileTreeOpacity, zIndex: 2 }}>
              <FileTreeSidebar />
            </div>
          )}
          {/* SCM panel fades in during Phase C */}
          {scmOpacity > 0.01 && (
            <div slot="sidebar" style={{ position: "absolute", inset: 0, opacity: scmOpacity, zIndex: 3 }}>
              <SCMSidebar frame={frame} />
            </div>
          )}

          {/* ── Editor slot ── */}
          <div slot="editor" style={{ position: "absolute", inset: 0 }}>
            <CodeEditor />
          </div>

          {/* ── Overlays (no slot = overlay layer in IDEFrame) ── */}

          {/* Waveform */}
          {waveformOpacity > 0.01 && (
            <Waveform waveFrame={waveFrame} opacity={waveformOpacity} />
          )}

          {/* Caption */}
          {captionOpacity > 0.01 && (
            <Caption opacity={captionOpacity} />
          )}

          {/* Callout */}
          {calloutOpacity > 0.01 && (
            <Callout opacity={calloutOpacity} />
          )}

          {/* Cursors — always on top */}
          <Cursors
            userPos={userPos}
            agentPos={agentPos}
            trailPositions={trailPositions}
          />
        </IDEFrame>
      </VirtualCamera>

      {/* Loop fade overlay — outside camera transform, covers full viewport */}
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
    </AbsoluteFill>
  );
};
