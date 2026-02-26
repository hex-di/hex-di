export const colors = {
  bg: "#060210",
  surface: "#0E0A20",
  surfaceLight: "#181230",
  primary: "#A78BFA",
  primaryLight: "#C4B5FD",
  primaryDark: "#7C3AED",
  accent: "#F59E0B",
  accentDark: "#D97706",
  text: "#E8E0F0",
  muted: "#6B6085",
  green: "#34D399",
  pink: "#F472B6",
  red: "#EF4444",
  teal: "#2DD4BF",
  blue: "#60A5FA",
} as const;

export const phases = {
  1: { label: "FOUNDATIONS", color: colors.primary },
  2: { label: "TRADITIONAL MODELS", color: colors.accent },
  3: { label: "ROLE & ATTRIBUTE MODELS", color: colors.green },
  4: { label: "MODERN MODELS", color: colors.teal },
  5: { label: "COMPARISON & TOOLS", color: colors.pink },
  6: { label: "PRACTICAL GUIDE", color: colors.blue },
} as const;
