/**
 * Design Tokens - Centralized design system for HexDI DevTools.
 *
 * This file defines all design tokens used throughout the DevTools UI:
 * - Spacing scale (generous, accessible)
 * - Typography scale (clear hierarchy)
 * - Color palette (vibrant, high contrast)
 * - Border radius, shadows, transitions
 *
 * Based on Tokyo Night color scheme for a modern, developer-friendly aesthetic.
 *
 * @packageDocumentation
 */

// =============================================================================
// Spacing Tokens
// =============================================================================

/**
 * Spacing scale - generous values for better breathing room.
 */
export const SPACING = {
  "2xs": "2px",
  xs: "6px",
  sm: "10px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  "2xl": "48px",
} as const;

export type SpacingToken = keyof typeof SPACING;

// =============================================================================
// Typography Tokens
// =============================================================================

/**
 * Font size scale.
 */
export const FONT_SIZE = {
  xs: "11px",
  sm: "12px",
  md: "13px",
  lg: "14px",
  xl: "16px",
  "2xl": "18px",
  "3xl": "22px",
} as const;

/**
 * Font weight scale.
 */
export const FONT_WEIGHT = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

/**
 * Line height scale.
 */
export const LINE_HEIGHT = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
} as const;

/**
 * Font family stacks.
 */
export const FONT_FAMILY = {
  sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  mono: 'ui-monospace, "JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, Monaco, Consolas, monospace',
} as const;

// =============================================================================
// Color Tokens - Dark Theme (Tokyo Night inspired)
// =============================================================================

/**
 * Dark theme color palette.
 */
export const COLORS_DARK = {
  // Backgrounds - layered for depth
  bg: "#1a1b26",
  bgSecondary: "#24283b",
  bgTertiary: "#2e3347",
  bgHover: "#363b54",
  bgActive: "#414868",

  // Foreground / Text - high contrast
  text: "#c0caf5",
  textSecondary: "#a9b1d6",
  textMuted: "#7982a9",

  // Borders - visible but subtle
  border: "#3b4261",
  borderHover: "#565f89",
  borderFocus: "#7aa2f7",

  // Primary accent - vibrant blue
  primary: "#7aa2f7",
  primaryHover: "#89b4fa",
  primaryActive: "#5d8af0",

  // Secondary accent - purple
  accent: "#bb9af7",
  accentHover: "#c9a9ff",

  // Semantic colors
  success: "#9ece6a",
  successBg: "rgba(158, 206, 106, 0.15)",
  warning: "#e0af68",
  warningBg: "rgba(224, 175, 104, 0.15)",
  error: "#f7768e",
  errorBg: "rgba(247, 118, 142, 0.15)",
  info: "#7dcfff",
  infoBg: "rgba(125, 207, 255, 0.15)",

  // Lifetime colors - distinct and accessible
  singleton: "#73daca",
  singletonBg: "rgba(115, 218, 202, 0.15)",
  scoped: "#7aa2f7",
  scopedBg: "rgba(122, 162, 247, 0.15)",
  transient: "#ff9e64",
  transientBg: "rgba(255, 158, 100, 0.15)",
} as const;

/**
 * Light theme color palette.
 */
export const COLORS_LIGHT = {
  // Backgrounds
  bg: "#f8f8fc",
  bgSecondary: "#f0f0f8",
  bgTertiary: "#e8e8f0",
  bgHover: "#e0e0ec",
  bgActive: "#d8d8e4",

  // Foreground / Text
  text: "#24283b",
  textSecondary: "#4a4a68",
  textMuted: "#6a6a88",

  // Borders
  border: "#d0d0e0",
  borderHover: "#b8b8d0",
  borderFocus: "#5d8af0",

  // Primary accent
  primary: "#5d8af0",
  primaryHover: "#4a7ae0",
  primaryActive: "#3a6ad0",

  // Secondary accent
  accent: "#9580ff",
  accentHover: "#8570f0",

  // Semantic colors
  success: "#50a060",
  successBg: "rgba(80, 160, 96, 0.15)",
  warning: "#d09030",
  warningBg: "rgba(208, 144, 48, 0.15)",
  error: "#e05070",
  errorBg: "rgba(224, 80, 112, 0.15)",
  info: "#3090d0",
  infoBg: "rgba(48, 144, 208, 0.15)",

  // Lifetime colors
  singleton: "#40a0a0",
  singletonBg: "rgba(64, 160, 160, 0.15)",
  scoped: "#5d8af0",
  scopedBg: "rgba(93, 138, 240, 0.15)",
  transient: "#e07030",
  transientBg: "rgba(224, 112, 48, 0.15)",
} as const;

// =============================================================================
// Border Radius Tokens
// =============================================================================

/**
 * Border radius scale.
 */
export const BORDER_RADIUS = {
  sm: "4px",
  md: "6px",
  lg: "8px",
  xl: "12px",
  full: "9999px",
} as const;

// =============================================================================
// Shadow Tokens
// =============================================================================

/**
 * Shadow scale for elevation.
 */
export const SHADOWS = {
  sm: "0 1px 2px rgba(0, 0, 0, 0.1)",
  md: "0 2px 8px rgba(0, 0, 0, 0.15)",
  lg: "0 4px 16px rgba(0, 0, 0, 0.2)",
  xl: "0 8px 32px rgba(0, 0, 0, 0.25)",
  // Colored shadows for glow effects
  primary: "0 0 20px rgba(122, 162, 247, 0.3)",
  success: "0 0 20px rgba(158, 206, 106, 0.3)",
  error: "0 0 20px rgba(247, 118, 142, 0.3)",
} as const;

// =============================================================================
// Transition Tokens
// =============================================================================

/**
 * Transition presets for animations.
 */
export const TRANSITIONS = {
  fast: "0.1s ease",
  normal: "0.15s ease",
  slow: "0.3s ease",
  // Specific transitions
  color: "color 0.15s ease, background-color 0.15s ease",
  transform: "transform 0.2s ease",
  all: "all 0.15s ease",
} as const;

// =============================================================================
// Consolidated Design Tokens Object
// =============================================================================

/**
 * All design tokens consolidated into a single object.
 */
export const DESIGN_TOKENS = {
  spacing: SPACING,
  fontSize: FONT_SIZE,
  fontWeight: FONT_WEIGHT,
  lineHeight: LINE_HEIGHT,
  fontFamily: FONT_FAMILY,
  colors: {
    dark: COLORS_DARK,
    light: COLORS_LIGHT,
  },
  borderRadius: BORDER_RADIUS,
  shadows: SHADOWS,
  transitions: TRANSITIONS,
} as const;

export type DesignTokens = typeof DESIGN_TOKENS;

// =============================================================================
// CSS Variable Helpers
// =============================================================================

/**
 * Generates CSS custom properties from dark theme colors.
 * Use this to inject variables into the document root.
 */
export function generateCSSVariables(theme: "dark" | "light" = "dark"): Record<string, string> {
  const colors = theme === "dark" ? COLORS_DARK : COLORS_LIGHT;
  const vars: Record<string, string> = {};

  // Color variables
  Object.entries(colors).forEach(([key, value]) => {
    vars[`--hex-devtools-${camelToKebab(key)}`] = value;
  });

  // Font variables
  vars["--hex-devtools-font-sans"] = FONT_FAMILY.sans;
  vars["--hex-devtools-font-mono"] = FONT_FAMILY.mono;

  // Spacing variables
  Object.entries(SPACING).forEach(([key, value]) => {
    vars[`--hex-devtools-space-${key}`] = value;
  });

  // Border radius variables
  Object.entries(BORDER_RADIUS).forEach(([key, value]) => {
    vars[`--hex-devtools-radius-${key}`] = value;
  });

  // Shadow variables
  Object.entries(SHADOWS).forEach(([key, value]) => {
    vars[`--hex-devtools-shadow-${key}`] = value;
  });

  return vars;
}

/**
 * Helper to convert camelCase to kebab-case.
 */
function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

/**
 * Injects CSS variables into the document root.
 */
export function injectCSSVariables(theme: "dark" | "light" = "dark"): void {
  const vars = generateCSSVariables(theme);
  const root = document.documentElement;

  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

/**
 * Removes CSS variables from the document root.
 */
export function removeCSSVariables(): void {
  const root = document.documentElement;
  const vars = generateCSSVariables("dark");

  Object.keys(vars).forEach((key) => {
    root.style.removeProperty(key);
  });
}
