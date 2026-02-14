/**
 * GraphNode component for rendering enriched graph nodes.
 *
 * Renders the appropriate shape, fill color, border style, badges,
 * and opacity based on enriched node properties. Uses a 3-line card
 * anatomy with library accent strip, inline metadata, and
 * contrast-aware text colors.
 *
 * @packageDocumentation
 */

import type { EnrichedGraphNode, LibraryAdapterKind } from "../types.js";
import { getNodeShapePath, isDashedShape } from "./node-shapes.js";
import { getLibraryLogo, LOGO_SIZE } from "./library-logos.js";
import {
  CATEGORY_COLORS,
  DEFAULT_CATEGORY_COLOR,
  CATEGORY_BAR_WIDTH,
  NODE_BORDER_RADIUS,
  LIBRARY_ACCENT_COLORS,
  LIBRARY_ACCENT_STRIP_WIDTH,
  LIBRARY_KIND_LABELS,
} from "../constants.js";

interface GraphNodeProps {
  readonly node: EnrichedGraphNode;
  readonly isSelected: boolean;
  readonly isMultiSelected: boolean;
  readonly isHovered: boolean;
  readonly onClick?: (portName: string) => void;
  readonly onMouseEnter?: (portName: string) => void;
  readonly onMouseLeave?: () => void;
}

function getLifetimeColor(lifetime: string): string {
  switch (lifetime) {
    case "singleton":
      return "var(--hex-lifetime-singleton)";
    case "scoped":
      return "var(--hex-lifetime-scoped)";
    case "transient":
      return "var(--hex-lifetime-transient)";
    default:
      return "var(--hex-text-muted)";
  }
}

function getOriginStrokeStyle(
  origin: string,
  isSelected: boolean,
  isMultiSelected: boolean,
  libraryKind: LibraryAdapterKind | undefined
): { stroke: string; strokeWidth: number; strokeDasharray: string | undefined } {
  if (isSelected) {
    return {
      stroke: "var(--hex-accent)",
      strokeWidth: 3,
      strokeDasharray: undefined,
    };
  }
  if (isMultiSelected) {
    return {
      stroke: "var(--hex-accent)",
      strokeWidth: 2,
      strokeDasharray: "4 2",
    };
  }
  switch (origin) {
    case "inherited":
      return {
        stroke: "var(--hex-border)",
        strokeWidth: 2,
        strokeDasharray: "4 2",
      };
    case "overridden":
      return {
        stroke: "var(--hex-accent)",
        strokeWidth: 2,
        strokeDasharray: undefined,
      };
    default: {
      const accentColor = getLibraryAccentColor(libraryKind);
      if (accentColor !== undefined) {
        return {
          stroke: accentColor,
          strokeWidth: 1,
          strokeDasharray: undefined,
        };
      }
      return {
        stroke: "var(--hex-border)",
        strokeWidth: 1,
        strokeDasharray: undefined,
      };
    }
  }
}

function getNodeOpacity(node: EnrichedGraphNode): number {
  if (!node.matchesFilter) return 0.15;
  if (!node.isResolved) return 0.5;
  return 1.0;
}

function getCategoryBarColor(category: string | undefined): string {
  if (category === undefined) return DEFAULT_CATEGORY_COLOR;
  return CATEGORY_COLORS[category] ?? DEFAULT_CATEGORY_COLOR;
}

function getLibraryAccentColor(kind: LibraryAdapterKind | undefined): string | undefined {
  if (kind === undefined) return undefined;
  if (kind.library === "core") return undefined;
  return LIBRARY_ACCENT_COLORS[kind.library];
}

function getLibraryKindLabel(kind: LibraryAdapterKind | undefined): string {
  if (kind === undefined) return "";
  const key = `${kind.library}/${kind.kind}`;
  return LIBRARY_KIND_LABELS[key] ?? "";
}

function getInheritanceModeColor(mode: string): string {
  switch (mode) {
    case "shared":
      return "var(--hex-info)";
    case "forked":
      return "var(--hex-warning)";
    case "isolated":
      return "var(--hex-error)";
    default:
      return "var(--hex-text-muted)";
  }
}

function GraphNode({
  node,
  isSelected,
  isMultiSelected,
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: GraphNodeProps): React.ReactElement {
  const fillColor = getLifetimeColor(node.adapter.lifetime);
  const strokeStyle = getOriginStrokeStyle(
    node.adapter.origin,
    isSelected,
    isMultiSelected,
    node.libraryKind
  );
  const opacity = getNodeOpacity(node);
  const shapePath = getNodeShapePath(node.libraryKind, node.width, node.height, NODE_BORDER_RADIUS);
  const dashed = isDashedShape(node.libraryKind);
  const accentColor = getLibraryAccentColor(node.libraryKind);
  const isLibraryAdapter = accentColor !== undefined;
  const categoryColor = getCategoryBarColor(node.category);
  const kindLabel = getLibraryKindLabel(node.libraryKind);
  const truncatedName =
    node.adapter.portName.length > 22
      ? node.adapter.portName.slice(0, 20) + "..."
      : node.adapter.portName;

  const line2Text =
    kindLabel !== "" ? `${kindLabel} \u00B7 ${node.adapter.lifetime}` : node.adapter.lifetime;

  const depCount = node.adapter.dependencyNames.length;
  const line3Text = `deps: ${depCount} \u00B7 dependents: ${node.dependentCount}`;

  const halfW = node.width / 2;
  const halfH = node.height / 2;
  const stripWidth = isLibraryAdapter ? LIBRARY_ACCENT_STRIP_WIDTH : CATEGORY_BAR_WIDTH;
  const textStartX = -halfW + stripWidth + 6;

  return (
    <g
      data-testid={`graph-node-${node.adapter.portName}`}
      transform={`translate(${node.x}, ${node.y})`}
      opacity={opacity}
      onClick={() => onClick?.(node.adapter.portName)}
      onMouseEnter={() => onMouseEnter?.(node.adapter.portName)}
      onMouseLeave={onMouseLeave}
      style={{ cursor: "pointer" }}
      role="button"
      tabIndex={0}
      aria-label={`Node ${node.adapter.portName}, ${node.adapter.lifetime} lifetime`}
    >
      {/* Main shape */}
      <path
        d={shapePath}
        fill={fillColor}
        fillOpacity={node.isResolved ? 0.15 : 0.08}
        stroke={strokeStyle.stroke}
        strokeWidth={strokeStyle.strokeWidth}
        strokeDasharray={dashed ? "6 3" : strokeStyle.strokeDasharray}
      />

      {/* Hover overlay */}
      {isHovered && (
        <path d={shapePath} fill="var(--hex-bg-hover)" fillOpacity={0.2} stroke="none" />
      )}

      {/* Library accent strip (for non-core library adapters) */}
      {isLibraryAdapter && (
        <rect
          data-testid="library-accent-strip"
          x={-halfW}
          y={-halfH + 2}
          width={LIBRARY_ACCENT_STRIP_WIDTH}
          height={node.height - 4}
          fill={accentColor}
          rx={1}
        />
      )}

      {/* Category color bar (for core/generic adapters only) */}
      {!isLibraryAdapter && node.category !== undefined && (
        <rect
          x={-halfW}
          y={-halfH + 2}
          width={CATEGORY_BAR_WIDTH}
          height={node.height - 4}
          fill={categoryColor}
          rx={1}
        />
      )}

      {/* Line 1: Port name */}
      <text
        x={textStartX}
        y={-halfH + 16}
        textAnchor="start"
        dominantBaseline="central"
        fill="var(--hex-text-primary)"
        fontSize="13"
        fontFamily="var(--hex-font-mono)"
      >
        {truncatedName}
      </text>

      {/* Line 2: Library kind + lifetime label */}
      <text
        data-testid="node-line2"
        x={textStartX}
        y={-halfH + 34}
        textAnchor="start"
        dominantBaseline="central"
        fill="var(--hex-text-secondary)"
        fontSize="11"
        fontFamily="var(--hex-font-mono)"
      >
        {line2Text}
      </text>

      {/* Line 3: Dependency/dependent counts */}
      <text
        data-testid="node-line3"
        x={textStartX}
        y={-halfH + 52}
        textAnchor="start"
        dominantBaseline="central"
        fill="var(--hex-text-muted)"
        fontSize="10"
        fontFamily="var(--hex-font-mono)"
      >
        {line3Text}
      </text>

      {/* Library logo (top-right) */}
      {getLibraryLogo(node.libraryKind, halfW - LOGO_SIZE / 2 - 2, -halfH + LOGO_SIZE / 2 + 4)}

      {/* Async badge (lightning bolt) */}
      {node.adapter.factoryKind === "async" && (
        <text
          x={halfW - 8}
          y={-halfH + 14}
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--hex-info)"
          fontSize="10"
          aria-label="Async factory"
        >
          {"\u26A1"}
        </text>
      )}

      {/* Error rate badge */}
      {node.hasHighErrorRate && node.errorRate !== undefined && (
        <g>
          <circle cx={halfW - 14} cy={-halfH + 14} r={8} fill="var(--hex-error)" />
          <text
            x={halfW - 14}
            y={-halfH + 15}
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize="7"
            fontFamily="var(--hex-font-mono)"
          >
            {Math.round(node.errorRate * 100)}%
          </text>
        </g>
      )}

      {/* Override badge */}
      {node.adapter.isOverride === true && (
        <text
          x={halfW - 14}
          y={halfH - 10}
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--hex-warning)"
          fontSize="8"
          fontWeight="bold"
          fontFamily="var(--hex-font-mono)"
        >
          OVR
        </text>
      )}

      {/* Inheritance mode badge */}
      {node.adapter.inheritanceMode !== undefined && (
        <text
          x={textStartX}
          y={halfH - 10}
          textAnchor="start"
          dominantBaseline="central"
          fill={getInheritanceModeColor(node.adapter.inheritanceMode)}
          fontSize="8"
          fontWeight="bold"
          fontFamily="var(--hex-font-mono)"
        >
          {node.adapter.inheritanceMode === "shared"
            ? "S"
            : node.adapter.inheritanceMode === "forked"
              ? "F"
              : "I"}
        </text>
      )}

      {/* Direction indicator */}
      {node.direction === "inbound" && (
        <text x={-halfW + 6} y={-halfH + 34} fill="var(--hex-text-muted)" fontSize="8">
          {"\u25B6"}
        </text>
      )}
      {node.direction === "outbound" && (
        <text x={halfW - 10} y={-halfH + 34} fill="var(--hex-text-muted)" fontSize="8">
          {"\u25C0"}
        </text>
      )}

      {/* Override double border effect */}
      {node.adapter.origin === "overridden" && !isSelected && (
        <path
          d={shapePath}
          fill="none"
          stroke="var(--hex-accent)"
          strokeWidth={1}
          transform="scale(0.92)"
          opacity={0.5}
        />
      )}
    </g>
  );
}

export { GraphNode, getLibraryAccentColor, getLibraryKindLabel };
export type { GraphNodeProps };
