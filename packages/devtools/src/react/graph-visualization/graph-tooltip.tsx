/**
 * GraphTooltip component for showing node details on hover.
 *
 * @packageDocumentation
 */

import React, { type ReactElement } from "react";
import type { PositionedNode } from "./types.js";
import { tooltipStyles, getLifetimeStrokeVar } from "./graph-styles.js";

// =============================================================================
// Types
// =============================================================================

export interface GraphTooltipProps {
  /** The node to show tooltip for */
  readonly node: PositionedNode;
  /** X position of the tooltip */
  readonly x: number;
  /** Y position of the tooltip */
  readonly y: number;
  /** Number of dependencies this node has */
  readonly dependencyCount: number;
  /** Number of dependents (nodes that depend on this) */
  readonly dependentCount: number;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Renders a tooltip with node details.
 *
 * Shows:
 * - Node name
 * - Lifetime with color indicator
 * - Number of dependencies
 * - Number of dependents
 */
export function GraphTooltip({
  node,
  x,
  y,
  dependencyCount,
  dependentCount,
}: GraphTooltipProps): ReactElement {
  const lifetimeColor = getLifetimeStrokeVar(node.lifetime);

  return (
    <div
      style={{
        ...tooltipStyles.container,
        left: x + 10,
        top: y + 10,
      }}
    >
      {/* Node name */}
      <div style={tooltipStyles.title}>{node.label}</div>

      {/* Lifetime */}
      <div style={{ ...tooltipStyles.row, marginTop: "4px" }}>
        <span style={tooltipStyles.label}>Lifetime</span>
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: lifetimeColor,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              ...tooltipStyles.value,
              color: lifetimeColor,
              textTransform: "capitalize",
            }}
          >
            {node.lifetime}
          </span>
        </span>
      </div>

      {/* Origin (only shown for child containers) */}
      {node.origin !== undefined && (
        <div style={tooltipStyles.row}>
          <span style={tooltipStyles.label}>Origin</span>
          <span
            style={{
              ...tooltipStyles.value,
              textTransform: "capitalize",
              color:
                node.origin === "inherited"
                  ? "var(--hex-devtools-text-muted, #a6adc8)"
                  : "var(--hex-devtools-text, #cdd6f4)",
            }}
          >
            {node.origin}
          </span>
        </div>
      )}

      {/* Factory Kind */}
      <div style={tooltipStyles.row}>
        <span style={tooltipStyles.label}>Factory</span>
        <span
          style={{
            ...tooltipStyles.value,
            textTransform: "capitalize",
            color: node.factoryKind === "async" ? "#cba6f7" : "var(--hex-devtools-text, #cdd6f4)",
          }}
        >
          {node.factoryKind ?? "sync"}
        </span>
      </div>

      {/* Inheritance Mode (only for inherited services) */}
      {node.inheritanceMode !== undefined && (
        <div style={tooltipStyles.row}>
          <span style={tooltipStyles.label}>Inheritance</span>
          <span
            style={{
              ...tooltipStyles.value,
              textTransform: "capitalize",
              color:
                node.inheritanceMode === "shared"
                  ? "#89b4fa"
                  : node.inheritanceMode === "forked"
                    ? "#fab387"
                    : "#f38ba8",
            }}
          >
            {node.inheritanceMode}
          </span>
        </div>
      )}

      {/* Dependencies */}
      <div style={tooltipStyles.row}>
        <span style={tooltipStyles.label}>Dependencies</span>
        <span style={tooltipStyles.value}>{dependencyCount}</span>
      </div>

      {/* Dependents */}
      <div style={tooltipStyles.row}>
        <span style={tooltipStyles.label}>Dependents</span>
        <span style={tooltipStyles.value}>{dependentCount}</span>
      </div>
    </div>
  );
}
