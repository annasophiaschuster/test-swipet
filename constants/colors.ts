export const Colors = {
  PRIMARY: "#E27289",
  SECONDARY: "#F0956A",
  BACKGROUND: "#FFFFFF",
  SURFACE: "#FFF5F7",
  TEXT: "#2C2C2A",
  TEXT_MUTED: "#888780",
  SUCCESS: "#8A9F79",
  WARNING: "#FFD12F",
  WHITE: "#FFFFFF",
  BLACK: "#000000",
  ERROR: "#E53E3E",
  BORDER: "#F0E0E4",
} as const;

export type ColorKey = keyof typeof Colors;
