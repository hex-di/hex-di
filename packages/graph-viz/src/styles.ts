/**
 * Default styles for graph visualization components.
 *
 * Uses CSS variables for theming. Override these by setting the CSS variables
 * in your application or by using the style props on components.
 *
 * @packageDocumentation
 */

import type { CSSProperties } from "react";

// =============================================================================
// CSS Variable Names
// =============================================================================

/**
 * CSS variable names used by graph-viz components.
 * Set these in your application to customize the appearance.
 *
 * @example
 * ```css
 * :root {
 *   --graph-viz-bg: #1e1e2e;
 *   --graph-viz-bg-secondary: #2a2a3e;
 *   --graph-viz-border: #45475a;
 *   --graph-viz-text: #cdd6f4;
 *   --graph-viz-text-muted: #a6adc8;
 *   --graph-viz-accent: #89b4fa;
 *   --graph-viz-font-mono: 'JetBrains Mono', monospace;
 * }
 * ```
 */
export const CSS_VARIABLES = {
  bg: "--graph-viz-bg",
  bgSecondary: "--graph-viz-bg-secondary",
  bgHover: "--graph-viz-bg-hover",
  border: "--graph-viz-border",
  text: "--graph-viz-text",
  textMuted: "--graph-viz-text-muted",
  accent: "--graph-viz-accent",
  fontMono: "--graph-viz-font-mono",
} as const;

// =============================================================================
// Default Style Values
// =============================================================================

/**
 * Default values for CSS variables (Catppuccin Mocha theme).
 */
export const DEFAULT_COLORS = {
  bg: "#1e1e2e",
  bgSecondary: "#2a2a3e",
  bgHover: "#3a3a4e",
  border: "#45475a",
  text: "#cdd6f4",
  textMuted: "#a6adc8",
  accent: "#89b4fa",
  fontMono: "'JetBrains Mono', monospace",
} as const;

// =============================================================================
// Container Styles
// =============================================================================

/**
 * Default styles for the graph container wrapper.
 */
export const DEFAULT_CONTAINER_STYLES: CSSProperties = {
  width: "100%",
  height: "100%",
  minHeight: "200px",
  position: "relative",
  overflow: "hidden",
  backgroundColor: `var(${CSS_VARIABLES.bg}, ${DEFAULT_COLORS.bg})`,
  borderRadius: "6px",
  border: `1px solid var(${CSS_VARIABLES.border}, ${DEFAULT_COLORS.border})`,
};

/**
 * Default styles for the SVG element.
 */
export const DEFAULT_SVG_STYLES: CSSProperties = {
  width: "100%",
  height: "100%",
  cursor: "grab",
};

// =============================================================================
// Node Styles
// =============================================================================

/**
 * Default styles for graph nodes.
 */
export const DEFAULT_NODE_STYLES = {
  fill: `var(${CSS_VARIABLES.bgSecondary}, ${DEFAULT_COLORS.bgSecondary})`,
  stroke: `var(${CSS_VARIABLES.border}, ${DEFAULT_COLORS.border})`,
  textFill: `var(${CSS_VARIABLES.text}, ${DEFAULT_COLORS.text})`,
  fontFamily: `var(${CSS_VARIABLES.fontMono}, ${DEFAULT_COLORS.fontMono})`,
} as const;

// =============================================================================
// Edge Styles
// =============================================================================

/**
 * Default styles for graph edges.
 */
export const DEFAULT_EDGE_STYLES = {
  stroke: `var(${CSS_VARIABLES.border}, ${DEFAULT_COLORS.border})`,
  strokeHighlighted: `var(${CSS_VARIABLES.accent}, ${DEFAULT_COLORS.accent})`,
  strokeWidth: 1.5,
  strokeWidthHighlighted: 2,
  dimmedOpacity: 0.2,
} as const;

// =============================================================================
// Controls Styles
// =============================================================================

/**
 * Default styles for the controls container.
 */
export const DEFAULT_CONTROLS_CONTAINER_STYLES: CSSProperties = {
  position: "absolute",
  bottom: "12px",
  right: "12px",
  display: "flex",
  alignItems: "center",
  gap: "4px",
  padding: "4px",
  backgroundColor: `var(${CSS_VARIABLES.bgSecondary}, ${DEFAULT_COLORS.bgSecondary})`,
  borderRadius: "6px",
  border: `1px solid var(${CSS_VARIABLES.border}, ${DEFAULT_COLORS.border})`,
  zIndex: 10,
};

/**
 * Default styles for control buttons.
 */
export const DEFAULT_BUTTON_STYLES: CSSProperties = {
  width: "28px",
  height: "28px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "transparent",
  border: "none",
  borderRadius: "4px",
  color: `var(${CSS_VARIABLES.text}, ${DEFAULT_COLORS.text})`,
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 600,
  transition: "all 0.15s ease",
};

/**
 * Styles for hovered control buttons.
 */
export const DEFAULT_BUTTON_HOVER_STYLES: CSSProperties = {
  backgroundColor: `var(${CSS_VARIABLES.bgHover}, ${DEFAULT_COLORS.bgHover})`,
};

/**
 * Default styles for the separator in controls.
 */
export const DEFAULT_SEPARATOR_STYLES: CSSProperties = {
  width: "1px",
  height: "20px",
  backgroundColor: `var(${CSS_VARIABLES.border}, ${DEFAULT_COLORS.border})`,
  margin: "0 4px",
};

/**
 * Default styles for the zoom label.
 */
export const DEFAULT_ZOOM_LABEL_STYLES: CSSProperties = {
  fontSize: "11px",
  color: `var(${CSS_VARIABLES.textMuted}, ${DEFAULT_COLORS.textMuted})`,
  minWidth: "40px",
  textAlign: "center",
  fontFamily: `var(${CSS_VARIABLES.fontMono}, ${DEFAULT_COLORS.fontMono})`,
};
