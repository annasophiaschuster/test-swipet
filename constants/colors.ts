export const Colors = {
  PRIMARY: "#CC96C1",
  SECONDARY: "#82667F",
  BACKGROUND: "#FFFFFF",
  SURFACE: "#F7F0F7",
  TEXT: "#2C2C2A",
  TEXT_MUTED: "#888780",
  SUCCESS: "#8A9F79",
  WARNING: "#FFD12F",
  WHITE: "#FFFFFF",
  BLACK: "#000000",
  ERROR: "#E53E3E",
  BORDER: "#EAE0EA",
} as const;

export type ColorKey = keyof typeof Colors;
