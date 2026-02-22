/**
 * GraphEdge component for rendering enriched graph edges.
 *
 * Renders 5 edge styles based on relationship type.
 *
 * @packageDocumentation
 */

import type { EnrichedGraphEdge } from "../types.js";

interface GraphEdgeProps {
  readonly edge: EnrichedGraphEdge;
  readonly onClick?: (source: string, target: string) => void;
}

function pointsToPath(points: readonly { readonly x: number; readonly y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const parts = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 1; i < points.length; i++) {
    parts.push(`L ${points[i].x} ${points[i].y}`);
  }
  return parts.join(" ");
}

function getEdgeStyle(edge: EnrichedGraphEdge): {
  stroke: string;
  strokeWidth: number;
  strokeDasharray: string | undefined;
  opacity: number;
} {
  // Selected edge (connected to selected node)
  if (edge.isHighlighted && edge.transitiveDepth === 0) {
    return {
      stroke: "var(--hex-accent)",
      strokeWidth: 2,
      strokeDasharray: undefined,
      opacity: 1,
    };
  }

  // Transitive dependency (progressively lighter)
  if (edge.isHighlighted && edge.transitiveDepth > 0) {
    const fade = Math.max(0.3, 1 - edge.transitiveDepth * 0.15);
    return {
      stroke: "var(--hex-accent-muted, var(--hex-accent))",
      strokeWidth: 1,
      strokeDasharray: undefined,
      opacity: fade,
    };
  }

  // Inherited edge
  if (edge.isInherited) {
    return {
      stroke: "var(--hex-text-muted)",
      strokeWidth: 1,
      strokeDasharray: "4 3",
      opacity: 0.7,
    };
  }

  // Override edge
  if (edge.isOverridden) {
    return {
      stroke: "var(--hex-info)",
      strokeWidth: 1.5,
      strokeDasharray: "2 2",
      opacity: 0.9,
    };
  }

  // Default direct dependency
  return {
    stroke: "var(--hex-border)",
    strokeWidth: 1.5,
    strokeDasharray: undefined,
    opacity: 1,
  };
}

function GraphEdge({ edge, onClick }: GraphEdgeProps): React.ReactElement {
  const pathData = pointsToPath(edge.points);
  const style = getEdgeStyle(edge);

  return (
    <g
      data-testid={`graph-edge-${edge.source}-${edge.target}`}
      onClick={() => onClick?.(edge.source, edge.target)}
      style={{ cursor: onClick ? "pointer" : undefined }}
    >
      {/* Click target (wider invisible path) */}
      {onClick !== undefined && (
        <path d={pathData} fill="none" stroke="transparent" strokeWidth={8} />
      )}
      <path
        d={pathData}
        fill="none"
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        strokeDasharray={style.strokeDasharray}
        opacity={style.opacity}
        markerEnd="url(#hex-graph-arrowhead)"
      />
    </g>
  );
}

export { GraphEdge, pointsToPath, getEdgeStyle };
export type { GraphEdgeProps };
