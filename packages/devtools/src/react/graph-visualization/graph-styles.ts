/**
 * CSS-in-JS styles for the visual dependency graph.
 *
 * Uses CSS variables for theming consistency with the DevTools panel.
 *
 * @packageDocumentation
 */

import type { CSSProperties } from "react";
import type { ServiceOrigin } from "@hex-di/core";

// =============================================================================
// Style Type Definitions
// =============================================================================

/** Graph container styles */
interface GraphContainerStyleDef {
  wrapper: CSSProperties;
  svg: CSSProperties;
}

/** Tooltip styles */
interface TooltipStyleDef {
  container: CSSProperties;
  title: CSSProperties;
  row: CSSProperties;
  label: CSSProperties;
  value: CSSProperties;
}

/**
 * Configuration for ownership-based visual styling of graph nodes.
 *
 * Each ownership state has distinct visual characteristics to help
 * developers quickly identify adapter origins in the dependency graph.
 */
interface OwnershipStyleConfig {
  /** Border style name for documentation */
  readonly borderStyle: "solid" | "dashed" | "double";
  /** SVG stroke-dasharray value (undefined = solid) */
  readonly strokeDasharray: string | undefined;
  /** SVG stroke-width value */
  readonly strokeWidth: number;
  /** Opacity for the entire node */
  readonly opacity: number;
  /** Whether to show the OVR badge (overridden nodes only) */
  readonly showOvrBadge: boolean;
}

/**
 * Result type for getOwnershipStyle utility.
 */
interface OwnershipStyleResult {
  /** SVG stroke-dasharray value */
  readonly strokeDasharray: string | undefined;
  /** SVG stroke-width value */
  readonly strokeWidth: number;
  /** Opacity for the entire node */
  readonly opacity: number;
  /** Whether to show the OVR badge */
  readonly showOvrBadge: boolean;
}

// =============================================================================
// Graph Container Styles
// =============================================================================

export const graphContainerStyles: GraphContainerStyleDef = {
  wrapper: {
    width: "100%",
    height: "100%",
    minHeight: "200px",
    position: "relative",
    overflow: "hidden",
    backgroundColor: "var(--hex-devtools-bg, #1e1e2e)",
    borderRadius: "6px",
    border: "1px solid var(--hex-devtools-border, #45475a)",
  },
  svg: {
    width: "100%",
    height: "100%",
    cursor: "grab",
  },
};

// =============================================================================
// Tooltip Styles
// =============================================================================

export const tooltipStyles: TooltipStyleDef = {
  container: {
    position: "absolute",
    padding: "12px 16px",
    backgroundColor: "var(--hex-devtools-bg-secondary, #2a2a3e)",
    border: "1px solid var(--hex-devtools-border, #45475a)",
    borderRadius: "8px",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
    zIndex: 100,
    pointerEvents: "none",
    minWidth: "160px",
  },
  title: {
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--hex-devtools-text, #cdd6f4)",
    marginBottom: "10px",
    paddingBottom: "10px",
    borderBottom: "1px solid var(--hex-devtools-border, #45475a)",
    fontFamily: "var(--hex-devtools-font-mono, 'JetBrains Mono', monospace)",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "11px",
    marginTop: "8px",
    gap: "16px",
  },
  label: {
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    flexShrink: 0,
  },
  value: {
    color: "var(--hex-devtools-text, #cdd6f4)",
    fontWeight: 500,
    textAlign: "right",
  },
};

// =============================================================================
// Lifetime Color Mapping
// =============================================================================

/**
 * Get the CSS variable for a lifetime's stroke color.
 */
export function getLifetimeStrokeVar(lifetime: string): string {
  switch (lifetime) {
    case "singleton":
      return "var(--hex-devtools-singleton, #a6e3a1)";
    case "scoped":
      return "var(--hex-devtools-scoped, #89b4fa)";
    case "transient":
      return "var(--hex-devtools-request, #fab387)";
    default:
      return "var(--hex-devtools-border, #45475a)";
  }
}

/**
 * Colors for inheritance mode badge indicator.
 * - shared: Blue (sharing parent's singleton instances)
 * - forked: Orange (independent snapshot copies)
 * - isolated: Pink/Red (completely isolated instances)
 */
export const INHERITANCE_MODE_COLORS = {
  shared: "#89b4fa",
  forked: "#fab387",
  isolated: "#f38ba8",
} as const;

// =============================================================================
// Ownership Styling
// =============================================================================

/**
 * Ownership-based visual styling configurations for graph nodes.
 *
 * Defines distinct visual treatments for the 3-state adapter ownership model:
 * - `own`: Adapter registered directly in the current container
 * - `inherited`: Adapter inherited from a parent container
 * - `overridden`: Child container override of a parent adapter
 *
 * Visual specifications from the DevTools Architecture Visualization spec:
 * - Own: Solid 2px border, opacity 1.0
 * - Inherited: Dashed "4 2" border, opacity 0.85, S/F/I badge for inheritance mode
 * - Overridden: Double 3px border, opacity 1.0, OVR badge
 */
export const OWNERSHIP_STYLES: Record<ServiceOrigin, OwnershipStyleConfig> = {
  own: {
    borderStyle: "solid",
    strokeDasharray: undefined,
    strokeWidth: 2,
    opacity: 1,
    showOvrBadge: false,
  },
  inherited: {
    borderStyle: "dashed",
    strokeDasharray: "4 2",
    strokeWidth: 2,
    opacity: 0.85,
    showOvrBadge: false,
  },
  overridden: {
    borderStyle: "double",
    // For SVG, we simulate "double" with a solid stroke but thicker width
    // The visual effect is achieved through stroke-width of 3
    strokeDasharray: "1 0",
    strokeWidth: 3,
    opacity: 1,
    showOvrBadge: true,
  },
};

/**
 * Get ownership-based style properties for a graph node.
 *
 * Returns CSS properties to apply based on the node's ownership state.
 * Defaults to "own" styling if ownership is undefined.
 *
 * @param ownership - The ownership state of the node (own, inherited, or overridden)
 * @returns Style properties to apply to the node
 *
 * @example
 * ```typescript
 * const style = getOwnershipStyle("inherited");
 * // Returns: { strokeDasharray: "4 2", strokeWidth: 2, opacity: 0.85, showOvrBadge: false }
 *
 * const defaultStyle = getOwnershipStyle(undefined);
 * // Returns: { strokeDasharray: undefined, strokeWidth: 2, opacity: 1, showOvrBadge: false }
 * ```
 */
export function getOwnershipStyle(ownership: ServiceOrigin | undefined): OwnershipStyleResult {
  const config = ownership !== undefined ? OWNERSHIP_STYLES[ownership] : OWNERSHIP_STYLES.own;

  return {
    strokeDasharray: config.strokeDasharray,
    strokeWidth: config.strokeWidth,
    opacity: config.opacity,
    showOvrBadge: config.showOvrBadge,
  };
}

/**
 * Color for the OVR (overridden) badge.
 * Uses an amber/orange color to draw attention to overridden adapters.
 */
export const OVR_BADGE_COLOR = "#fab387";

/**
 * Color for the adapter count badge background.
 * Uses a muted gray to not compete with other badges.
 */
export const COUNT_BADGE_COLOR = "#6c7086";
