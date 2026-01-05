/**
 * GraphTooltip component for showing node details on hover.
 *
 * @packageDocumentation
 */

import React, { type ReactElement } from "react";
import type { PositionedNode, ContainerOwnershipEntry } from "./types.js";
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
// Constants
// =============================================================================

/**
 * Color mapping for ownership states.
 */
const OWNERSHIP_COLORS = {
  own: "#a6e3a1", // Green
  inherited: "#a6adc8", // Gray/Muted
  overridden: "#fab387", // Orange
} as const;

/**
 * Inheritance mode abbreviations.
 */
const INHERITANCE_MODE_ABBREV = {
  shared: "S",
  forked: "F",
  isolated: "I",
} as const;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Formats ownership state for display.
 */
function formatOwnership(ownership: "own" | "inherited" | "overridden"): string {
  return ownership.charAt(0).toUpperCase() + ownership.slice(1);
}

/**
 * Formats a container entry with ownership for display.
 */
function formatContainerWithOwnership(
  containerName: string,
  ownership: "own" | "inherited" | "overridden",
  inheritanceMode?: "shared" | "forked" | "isolated"
): string {
  if (ownership === "inherited" && inheritanceMode !== undefined) {
    return `${containerName} (inherited [${INHERITANCE_MODE_ABBREV[inheritanceMode]}])`;
  }
  return `${containerName} (${ownership})`;
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
 * - Ownership state with color
 * - Inheritance mode for inherited services
 * - Factory kind
 * - Number of dependencies
 * - Number of dependents
 * - Container list with per-container ownership
 */
export function GraphTooltip({
  node,
  x,
  y,
  dependencyCount,
  dependentCount,
}: GraphTooltipProps): ReactElement {
  const lifetimeColor = getLifetimeStrokeVar(node.lifetime);
  const ownership = node.ownership ?? node.origin ?? "own";
  const ownershipColor = OWNERSHIP_COLORS[ownership];

  // Build a lookup map for container ownership
  const containerOwnershipMap = new Map<string, ContainerOwnershipEntry>();
  if (node.containerOwnership !== undefined) {
    for (const entry of node.containerOwnership) {
      containerOwnershipMap.set(entry.containerId, entry);
    }
  }

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

      {/* Ownership - always shown with color coding */}
      <div style={tooltipStyles.row}>
        <span style={tooltipStyles.label}>Ownership</span>
        <span
          style={{
            ...tooltipStyles.value,
            color: ownershipColor,
          }}
        >
          {formatOwnership(ownership)}
        </span>
      </div>

      {/* Origin (legacy support - only shown if different from ownership) */}
      {node.origin !== undefined && node.origin !== ownership && (
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

      {/* Containers with per-container ownership */}
      {node.containers !== undefined && node.containers.length > 0 && (
        <div style={{ ...tooltipStyles.row, flexDirection: "column", alignItems: "flex-start" }}>
          <span style={tooltipStyles.label}>Containers</span>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              marginTop: "4px",
              width: "100%",
            }}
          >
            {node.containers.map(containerName => {
              const ownershipEntry = containerOwnershipMap.get(containerName);
              const containerOwnership = ownershipEntry?.ownership ?? "own";
              const containerInheritanceMode = ownershipEntry?.inheritanceMode;
              const containerColor = OWNERSHIP_COLORS[containerOwnership];

              return (
                <span
                  key={containerName}
                  style={{
                    fontSize: "10px",
                    padding: "2px 6px",
                    borderRadius: "3px",
                    backgroundColor: "var(--hex-devtools-bg-tertiary, #313244)",
                    color: containerColor,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: containerColor,
                      flexShrink: 0,
                    }}
                  />
                  {formatContainerWithOwnership(
                    containerName,
                    containerOwnership,
                    containerInheritanceMode
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
