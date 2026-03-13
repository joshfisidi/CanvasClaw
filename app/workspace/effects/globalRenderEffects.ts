import type Phaser from "phaser";

export const GLOBAL_RENDER_EFFECTS: Pick<
  Phaser.Types.Core.GameConfig,
  "antialias" | "antialiasGL" | "pixelArt" | "roundPixels" | "desynchronized" | "powerPreference"
> = {
  antialias: true,
  antialiasGL: true,
  pixelArt: false,
  roundPixels: false,
  desynchronized: true,
  powerPreference: "high-performance",
};
