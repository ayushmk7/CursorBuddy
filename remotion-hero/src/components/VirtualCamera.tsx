import React from "react";
import { AbsoluteFill } from "remotion";
import { cameraTransform } from "../utils/camera";
import type { CameraState } from "../utils/camera";
import { W, H } from "../timeline";

interface Props {
  camera: CameraState;
  children: React.ReactNode;
}

// Wraps the entire scene graph with a 2-D virtual camera (translate + scale).
// The inner div is fixed at composition size; CSS transform shifts/zooms it so
// the look-at point lands at the viewport centre.
export const VirtualCamera: React.FC<Props> = ({ camera, children }) => (
  <AbsoluteFill style={{ overflow: "hidden", background: "#1e1e1e" }}>
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: W,
        height: H,
        transformOrigin: "0 0",
        transform: cameraTransform(camera),
        willChange: "transform",
      }}
    >
      {children}
    </div>
  </AbsoluteFill>
);
