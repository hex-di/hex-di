/**
 * DI metadata extraction for graph-viz integration.
 *
 * This module provides functions to convert DevTools-specific node types
 * to the generic graph-viz metadata format while preserving all DI-specific
 * information like ContainerKind, ServiceOrigin, and InheritanceMode.
 *
 * @packageDocumentation
 */

import React, { type ReactElement } from "react";
import type { Lifetime, FactoryKind } from "@hex-di/core";
import type { InheritanceMode, ServiceOrigin } from "@hex-di/core";
import type { ContainerOwnershipEntry } from "./types.js";
import type { RenderNodeProps, RenderEdgeProps, RenderTooltipProps } from "@hex-di/graph-viz";
import type { PositionedNode } from "./types.js";
import {
  getLifetimeStrokeVar,
  getOwnershipStyle,
  INHERITANCE_MODE_COLORS,
  OVR_BADGE_COLOR,
  COUNT_BADGE_COLOR,
  tooltipStyles,
} from "./graph-styles.js";

// =============================================================================
// DI Metadata Types
// =============================================================================

/**
 * Metadata type for DI-specific node information.
 *
 * This is the TMetadata type parameter for @hex-di/graph-viz components
 * when used with DevTools DI graphs.
 */
export interface DINodeMetadata {
  /** Service lifetime (singleton, scoped, transient) */
  readonly lifetime: Lifetime;
  /** Factory kind - sync or async */
  readonly factoryKind?: FactoryKind;
  /** Service origin - own, inherited, or overridden */
  readonly origin?: ServiceOrigin;
  /** Ownership state for visual styling */
  readonly ownership?: ServiceOrigin;
  /** Inheritance mode for inherited services (shared, forked, isolated) */
  readonly inheritanceMode?: InheritanceMode;
  /** List of containers that provide this port */
  readonly containers?: readonly string[];
  /** Per-container ownership metadata */
  readonly containerOwnership?: ReadonlyArray<ContainerOwnershipEntry>;
}

// =============================================================================
// Metadata Extraction
// =============================================================================

/**
 * Extracts DI metadata from a DevTools PositionedNode.
 *
 * Converts the DevTools-specific node format to the generic graph-viz
 * metadata format while preserving all DI-specific information.
 *
 * @param node - The DevTools positioned node
 * @returns DI metadata for graph-viz rendering
 *
 * @example
 * ```typescript
 * const devToolsNode: PositionedNode = {
 *   id: "Logger",
 *   label: "Logger",
 *   lifetime: "singleton",
 *   factoryKind: "async",
 *   // ... other fields
 * };
 *
 * const metadata = extractDIMetadata(devToolsNode);
 * // { lifetime: "singleton", factoryKind: "async", ... }
 * ```
 */
export function extractDIMetadata(node: PositionedNode): DINodeMetadata {
  return {
    lifetime: node.lifetime,
    factoryKind: node.factoryKind,
    origin: node.origin,
    ownership: node.ownership,
    inheritanceMode: node.inheritanceMode,
    containers: node.containers,
    containerOwnership: node.containerOwnership,
  };
}

// =============================================================================
// Render Props for DI Nodes
// =============================================================================

/** Threshold for showing the adapter count badge (3+ adapters) */
const ADAPTER_COUNT_THRESHOLD = 3;

/**
 * Render prop for DI-specific node styling.
 *
 * Renders a node with:
 * - Border color based on lifetime (singleton=green, scoped=blue, transient=orange)
 * - Border style based on ownership (solid=own, dashed=inherited, double=overridden)
 * - Label centered in the node
 * - Hover/selected/dimmed visual states
 * - OVR badge for overridden nodes (top-right)
 * - S/F/I badge for inherited nodes showing inheritance mode (top-left)
 * - Async "A" badge for async factory kind
 * - Count badge for ports with 3+ adapters (bottom-right)
 *
 * @param props - Render props from graph-viz
 * @returns React element for the node
 */
export function renderDINode(props: RenderNodeProps<DINodeMetadata>): ReactElement {
  const { node, isHovered, isSelected, isDimmed, x, y } = props;
  const metadata = node.metadata;

  // Default to singleton if no metadata
  const lifetime = metadata?.lifetime ?? "singleton";
  const factoryKind = metadata?.factoryKind;
  const ownership = metadata?.ownership ?? metadata?.origin;
  const inheritanceMode = metadata?.inheritanceMode;
  const containers = metadata?.containers;

  // Get stroke color based on lifetime
  const strokeColor = getLifetimeStrokeVar(lifetime);

  // Get ownership-based style
  const ownershipStyle = getOwnershipStyle(ownership);

  // Compute opacity: use ownership opacity unless dimmed
  const opacity = isDimmed ? 0.3 : ownershipStyle.opacity;

  // Compute stroke width: ownership-based, but increase for hover/selected
  const strokeWidth =
    isHovered || isSelected ? ownershipStyle.strokeWidth + 1 : ownershipStyle.strokeWidth;

  const filter = isSelected
    ? "drop-shadow(0 0 6px var(--hex-devtools-accent, #89b4fa))"
    : isHovered
      ? "brightness(1.15)"
      : undefined;

  // Determine strokeDasharray based on ownership
  const strokeDasharray =
    ownershipStyle.strokeDasharray ??
    (metadata?.origin === "inherited" && ownership === undefined ? "4 2" : undefined);

  // Async services get a purple-tinted background
  const bgFill =
    factoryKind === "async"
      ? "rgba(203, 166, 247, 0.3)"
      : "var(--hex-devtools-bg-secondary, #2a2a3e)";

  // Calculate count for multi-adapter ports
  const containerCount = containers?.length ?? 0;
  const showCountBadge = containerCount >= ADAPTER_COUNT_THRESHOLD;
  const additionalAdapters = containerCount - 2;

  // Determine which inheritance mode badge to show
  const showInheritanceModeBadge =
    ownership === "inherited" || (inheritanceMode !== undefined && ownership !== "overridden");

  return (
    <g style={{ opacity }}>
      {/* Node rectangle */}
      <rect
        x={x}
        y={y}
        width={node.width}
        height={node.height}
        rx={6}
        ry={6}
        fill={bgFill}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        style={{
          transition: "all 0.15s ease",
          filter,
        }}
      />

      {/* Node label */}
      <text
        x={node.x}
        y={node.y - 4}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--hex-devtools-text, #cdd6f4)"
        fontSize="12px"
        fontFamily="var(--hex-devtools-font-mono, 'JetBrains Mono', monospace)"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {node.label}
      </text>

      {/* Lifetime badge */}
      <text
        x={node.x}
        y={node.y + 12}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={strokeColor}
        fontSize="9px"
        fontWeight={600}
        fontFamily="var(--hex-devtools-font-mono, 'JetBrains Mono', monospace)"
        style={{
          pointerEvents: "none",
          userSelect: "none",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {lifetime}
      </text>

      {/* Async corner badge (top-right, but offset if OVR badge is present) */}
      {factoryKind === "async" && (
        <g style={{ pointerEvents: "none" }}>
          <circle
            cx={x + node.width - (ownershipStyle.showOvrBadge ? 28 : 8)}
            cy={y + 8}
            r={8}
            fill="#cba6f7"
          />
          <text
            x={x + node.width - (ownershipStyle.showOvrBadge ? 28 : 8)}
            y={y + 8}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#1e1e2e"
            fontSize="9px"
            fontWeight={700}
            fontFamily="var(--hex-devtools-font-mono, 'JetBrains Mono', monospace)"
            style={{ userSelect: "none" }}
          >
            A
          </text>
        </g>
      )}

      {/* OVR badge for overridden nodes (top-right corner) */}
      {ownershipStyle.showOvrBadge && (
        <g style={{ pointerEvents: "none" }} data-testid="ovr-badge">
          <rect
            x={x + node.width - 26}
            y={y + 2}
            width={24}
            height={14}
            rx={3}
            ry={3}
            fill={OVR_BADGE_COLOR}
          />
          <text
            x={x + node.width - 14}
            y={y + 9}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#1e1e2e"
            fontSize="8px"
            fontWeight={700}
            fontFamily="var(--hex-devtools-font-mono, 'JetBrains Mono', monospace)"
            style={{ userSelect: "none" }}
          >
            OVR
          </text>
        </g>
      )}

      {/* Inheritance mode corner badge (top-left) - S/F/I */}
      {showInheritanceModeBadge && inheritanceMode !== undefined && (
        <g style={{ pointerEvents: "none" }} data-testid="inheritance-mode-badge">
          <circle cx={x + 8} cy={y + 8} r={8} fill={INHERITANCE_MODE_COLORS[inheritanceMode]} />
          <text
            x={x + 8}
            y={y + 8}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#1e1e2e"
            fontSize="9px"
            fontWeight={700}
            fontFamily="var(--hex-devtools-font-mono, 'JetBrains Mono', monospace)"
            style={{ userSelect: "none" }}
          >
            {inheritanceMode[0].toUpperCase()}
          </text>
        </g>
      )}

      {/* Count badge for multi-adapter ports (bottom-right corner) */}
      {showCountBadge && (
        <g style={{ pointerEvents: "none" }} data-testid="adapter-count-badge">
          <rect
            x={x + node.width - 22}
            y={y + node.height - 14}
            width={20}
            height={12}
            rx={3}
            ry={3}
            fill={COUNT_BADGE_COLOR}
          />
          <text
            x={x + node.width - 12}
            y={y + node.height - 8}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#cdd6f4"
            fontSize="8px"
            fontWeight={600}
            fontFamily="var(--hex-devtools-font-mono, 'JetBrains Mono', monospace)"
            style={{ userSelect: "none" }}
          >
            +{additionalAdapters}
          </text>
        </g>
      )}
    </g>
  );
}

// =============================================================================
// Render Props for DI Tooltips
// =============================================================================

/**
 * Color mapping for ownership states.
 */
const OWNERSHIP_COLORS: Record<ServiceOrigin, string> = {
  own: "#a6e3a1", // Green
  inherited: "#a6adc8", // Gray/Muted
  overridden: "#fab387", // Orange
};

/**
 * Formats ownership state for display.
 */
function formatOwnership(ownership: ServiceOrigin): string {
  return ownership.charAt(0).toUpperCase() + ownership.slice(1);
}

/**
 * Render prop for DI-specific tooltip content.
 *
 * Shows:
 * - Node name
 * - Lifetime with color indicator
 * - Ownership state with color
 * - Inheritance mode for inherited services
 * - Factory kind
 * - Container list with per-container ownership
 *
 * @param props - Render props from graph-viz
 * @returns React element for the tooltip, or null if no tooltip needed
 */
export function renderDITooltip(props: RenderTooltipProps<DINodeMetadata>): ReactElement | null {
  const { node, x, y } = props;
  const metadata = node.metadata;

  // Default values if no metadata
  const lifetime = metadata?.lifetime ?? "singleton";
  const factoryKind = metadata?.factoryKind ?? "sync";
  const ownership = metadata?.ownership ?? metadata?.origin ?? "own";
  const inheritanceMode = metadata?.inheritanceMode;
  const containers = metadata?.containers;
  const containerOwnership = metadata?.containerOwnership;

  const lifetimeColor = getLifetimeStrokeVar(lifetime);
  const ownershipColor = OWNERSHIP_COLORS[ownership];

  // Build a lookup map for container ownership
  const containerOwnershipMap = new Map<string, ContainerOwnershipEntry>();
  if (containerOwnership !== undefined) {
    for (const entry of containerOwnership) {
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
            {lifetime}
          </span>
        </span>
      </div>

      {/* Ownership */}
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

      {/* Factory Kind */}
      <div style={tooltipStyles.row}>
        <span style={tooltipStyles.label}>Factory</span>
        <span
          style={{
            ...tooltipStyles.value,
            textTransform: "capitalize",
            color: factoryKind === "async" ? "#cba6f7" : "var(--hex-devtools-text, #cdd6f4)",
          }}
        >
          {factoryKind}
        </span>
      </div>

      {/* Inheritance Mode (only for inherited services) */}
      {inheritanceMode !== undefined && (
        <div style={tooltipStyles.row}>
          <span style={tooltipStyles.label}>Inheritance</span>
          <span
            style={{
              ...tooltipStyles.value,
              textTransform: "capitalize",
              color:
                inheritanceMode === "shared"
                  ? "#89b4fa"
                  : inheritanceMode === "forked"
                    ? "#fab387"
                    : "#f38ba8",
            }}
          >
            {inheritanceMode}
          </span>
        </div>
      )}

      {/* Containers */}
      {containers !== undefined && containers.length > 0 && (
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
            {containers.map(containerName => {
              const ownershipEntry = containerOwnershipMap.get(containerName);
              const containerOwnershipValue = ownershipEntry?.ownership ?? "own";
              const containerColor = OWNERSHIP_COLORS[containerOwnershipValue];

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
                  {containerName}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Render Props for DI Edges
// =============================================================================

/**
 * Render prop for DI-specific edge styling.
 *
 * Renders edges with:
 * - DevTools color scheme
 * - Highlighted state for connected edges
 * - Dimmed state for unrelated edges
 *
 * @param props - Render props from graph-viz
 * @returns React element for the edge
 */
export function renderDIEdge(props: RenderEdgeProps): ReactElement {
  const { edge, isHighlighted, isDimmed, pathD } = props;

  const stroke = isHighlighted
    ? "var(--hex-devtools-accent, #89b4fa)"
    : "var(--hex-devtools-border, #45475a)";
  const strokeWidth = isHighlighted ? 2 : 1.5;
  const opacity = isDimmed ? 0.2 : 1;

  return (
    <path
      className="graph-edge"
      data-edge-from={edge.from}
      data-edge-to={edge.to}
      d={pathD}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      style={{
        opacity,
        transition: "all 0.15s ease",
      }}
    />
  );
}
