import React from "react";
import { Composition } from "remotion";
import { HeroDemo } from "./HeroDemo";
import { FPS, W, H, TOTAL_FRAMES } from "./timeline";

// Root registers all Remotion compositions.
// Composition: HeroDemo — 30 fps, 1920×1080, 450 frames (15 s loop).
export const Root: React.FC = () => (
  <Composition
    id="HeroDemo"
    component={HeroDemo}
    fps={FPS}
    width={W}
    height={H}
    durationInFrames={TOTAL_FRAMES}
  />
);
