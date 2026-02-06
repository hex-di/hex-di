/**
 * GraphEdge component for rendering edges (arrows) between nodes.
 *
 * This is a generic component that accepts a render prop for custom edge styling.
 *
 * @packageDocumentation
 */

import React, { type ReactElement } from "react";
import type { GraphEdgeProps, RenderEdgeProps } from "./types.js";
import { generateEdgePath } from "./graph-layout.js";
import { DEFAULT_EDGE_STYLES } from "./styles.js";

// =============================================================================
// Component
// =============================================================================

/**
 * Renders a single edge in the graph.
 *
 * The edge is displayed as a curved path with an optional arrow marker at the end.
 * Supports highlighted and dimmed visual states.
 */
export function GraphEdge({
  edge,
  isHighlighted,
  isDimmed,
  markerId,
  highlightedMarkerId,
  renderContent,
}: GraphEdgeProps): ReactElement {
  const pathD = generateEdgePath(edge.points);

  // Render props for custom content
  const renderProps: RenderEdgeProps = {
    edge,
    isHighlighted,
    isDimmed,
    pathD,
  };

  if (renderContent) {
    return renderContent(renderProps);
  }

  // Default rendering with arrow markers
  const stroke = isHighlighted ? DEFAULT_EDGE_STYLES.strokeHighlighted : DEFAULT_EDGE_STYLES.stroke;
  const strokeWidth = isHighlighted
    ? DEFAULT_EDGE_STYLES.strokeWidthHighlighted
    : DEFAULT_EDGE_STYLES.strokeWidth;
  const opacity = isDimmed ? DEFAULT_EDGE_STYLES.dimmedOpacity : 1;
  const marker = isHighlighted ? `url(#${highlightedMarkerId})` : `url(#${markerId})`;

  return (
    <path
      className="graph-edge"
      data-edge-from={edge.from}
      data-edge-to={edge.to}
      d={pathD}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      markerEnd={marker}
      style={{
        opacity,
        transition: "all 0.15s ease",
      }}
    />
  );
}

// =============================================================================
// Arrow Marker Definitions
// =============================================================================

export interface ArrowMarkerDefsProps {
  /** Base ID for the marker */
  readonly id: string;
  /** ID for the highlighted variant */
  readonly highlightedId: string;
  /** Color for the default marker */
  readonly color?: string;
  /** Color for the highlighted marker */
  readonly highlightedColor?: string;
}

/**
 * SVG defs element containing arrow markers for edges.
 *
 * Must be included in the SVG to enable arrow markers on edges.
 */
export function ArrowMarkerDefs({
  id,
  highlightedId,
  color = DEFAULT_EDGE_STYLES.stroke,
  highlightedColor = DEFAULT_EDGE_STYLES.strokeHighlighted,
}: ArrowMarkerDefsProps): ReactElement {
  return (
    <defs>
      {/* Default arrow marker */}
      <marker
        id={id}
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
      </marker>

      {/* Highlighted arrow marker */}
      <marker
        id={highlightedId}
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill={highlightedColor} />
      </marker>
    </defs>
  );
}
