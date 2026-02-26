export const colors = {
  bg: "#020408",
  surface: "#08101C",
  surfaceLight: "#0C1829",
  primary: "#00F0FF",
  primaryLight: "#5FFFFF",
  primaryDark: "#008F99",
  accent: "#FF5E00",
  accentDark: "#CC4A00",
  text: "#DAE6F0",
  muted: "#586E85",
  green: "#A6E22E",
  pink: "#F92672",
  amber: "#FFB020",
  amberDark: "#CC8A00",
} as const;

export const phases = {
  1: { label: "THE PROBLEM", color: colors.accent },
  2: { label: "GUARD PRIMITIVES", color: colors.primary },
  3: { label: "COMPOSITION", color: colors.green },
  4: { label: "DAVINCI MIGRATION", color: colors.amber },
  5: { label: "VISIBILITY & QUALITY", color: colors.pink },
} as const;
