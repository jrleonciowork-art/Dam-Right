import React from "react";
import { Composition } from "remotion";
import { DamRightDemo, FPS, TOTAL_FRAMES } from "./DamRightDemo";

export const Root: React.FC = () => (
  <Composition
    id="DamRight"
    component={DamRightDemo}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
