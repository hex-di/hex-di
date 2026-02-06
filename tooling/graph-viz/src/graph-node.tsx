/**
 * GraphNode component for rendering individual nodes in the graph.
 *
 * This is a generic component that accepts a render prop for custom node content.
 * For domain-specific rendering (like DI-specific badges), use the renderContent prop.
 *
 * @packageDocumentation
 */

import React, { type ReactElement, useCallback } from "react";
import type { GraphNodeProps, RenderNodeProps } from "./types.js";
import { DEFAULT_NODE_STYLES } from "./styles.js";

// =============================================================================
// Default Node Renderer
// =============================================================================

/**
 * Default render function for node content.
 * Renders a simple rounded rectangle with a centered label.
 */
function DefaultNodeContent<TMetadata>({
  node,
  isHovered,
  isSelected,
  isDimmed,
  x,
  y,
}: RenderNodeProps<TMetadata>): ReactElement {
  const opacity = isDimmed ? 0.3 : 1;
  const strokeWidth = isHovered || isSelected ? 3 : 2;
  const filter = isSelected
    ? "drop-shadow(0 0 6px var(--graph-viz-accent, #89b4fa))"
    : isHovered
      ? "brightness(1.15)"
      : undefined;

  return (
    <>
      {/* Node rectangle */}
      <rect
        x={x}
        y={y}
        width={node.width}
        height={node.height}
        rx={6}
        ry={6}
        fill={DEFAULT_NODE_STYLES.fill}
        stroke={DEFAULT_NODE_STYLES.stroke}
        strokeWidth={strokeWidth}
        style={{
          transition: "all 0.15s ease",
          filter,
          opacity,
        }}
      />

      {/* Node label */}
      <text
        x={node.x}
        y={node.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={DEFAULT_NODE_STYLES.textFill}
        fontSize="12px"
        fontFamily={DEFAULT_NODE_STYLES.fontFamily}
        style={{ pointerEvents: "none", userSelect: "none", opacity }}
      >
        {node.label}
      </text>
    </>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * Renders a single node in the graph.
 *
 * The node is displayed as a group containing:
 * - Either custom content from renderContent prop
 * - Or default: rounded rectangle with centered label
 *
 * Supports:
 * - Hover/selected/dimmed visual states
 * - Click and mouse event handlers
 * - Generic TMetadata for domain-specific data
 *
 * @typeParam TMetadata - Custom metadata type for domain-specific node data
 */
export function GraphNode<TMetadata = unknown>({
  node,
  isHovered,
  isSelected,
  isDimmed,
  onClick,
  onMouseEnter,
  onMouseLeave,
  renderContent,
}: GraphNodeProps<TMetadata>): ReactElement {
  const handleClick = useCallback(() => {
    onClick?.(node.id);
  }, [onClick, node.id]);

  const handleMouseEnter = useCallback(() => {
    onMouseEnter?.(node.id);
  }, [onMouseEnter, node.id]);

  // Compute position (top-left corner from center)
  const x = node.x - node.width / 2;
  const y = node.y - node.height / 2;

  // Render props for custom content
  const renderProps: RenderNodeProps<TMetadata> = {
    node,
    isHovered,
    isSelected,
    isDimmed,
    x,
    y,
  };

  return (
    <g
      className="graph-node"
      data-node-id={node.id}
      style={{ cursor: "pointer" }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {renderContent ? renderContent(renderProps) : <DefaultNodeContent {...renderProps} />}
    </g>
  );
}
