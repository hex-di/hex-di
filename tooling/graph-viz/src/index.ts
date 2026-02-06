/**
 * @hex-di/graph-viz - Generic graph visualization components
 *
 * This package provides domain-agnostic graph visualization components
 * with zoom/pan support and render props for customization.
 *
 * @example
 * ```tsx
 * import {
 *   GraphRenderer,
 *   computeLayout,
 *   type GraphNode,
 *   type GraphEdge,
 * } from '@hex-di/graph-viz';
 *
 * // Define your nodes and edges
 * const nodes: GraphNode<MyMetadata>[] = [
 *   { id: 'A', label: 'Node A', metadata: { type: 'input' } },
 *   { id: 'B', label: 'Node B', metadata: { type: 'output' } },
 * ];
 *
 * const edges: GraphEdge[] = [
 *   { from: 'A', to: 'B' },
 * ];
 *
 * // Compute the layout
 * const layout = computeLayout(nodes, edges);
 *
 * // Render the graph with custom node styling
 * <GraphRenderer
 *   layout={layout}
 *   hoveredNodeId={hoveredId}
 *   selectedNodeId={selectedId}
 *   highlightedNodeIds={highlightedNodes}
 *   highlightedEdgeKeys={highlightedEdges}
 *   onNodeClick={handleNodeClick}
 *   onNodeHover={handleNodeHover}
 *   renderNode={({ node, isHovered, isSelected, isDimmed, x, y }) => (
 *     <g opacity={isDimmed ? 0.3 : 1}>
 *       <rect
 *         x={x}
 *         y={y}
 *         width={node.width}
 *         height={node.height}
 *         fill={node.metadata?.type === 'input' ? 'blue' : 'green'}
 *       />
 *       <text x={node.x} y={node.y} textAnchor="middle">
 *         {node.label}
 *       </text>
 *     </g>
 *   )}
 * />
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Components
// =============================================================================

export { GraphRenderer } from "./graph-renderer.js";
export { GraphNode } from "./graph-node.js";
export { GraphEdge, ArrowMarkerDefs } from "./graph-edge.js";
export { GraphControls } from "./graph-controls.js";

// =============================================================================
// Layout Algorithm
// =============================================================================

export {
  computeLayout,
  generateEdgePath,
  findConnectedNodes,
  findConnectedEdges,
  DEFAULT_LAYOUT_CONFIG,
} from "./graph-layout.js";

// =============================================================================
// Types
// =============================================================================

export type {
  // Core types
  Point,
  GraphDirection,

  // Node types
  GraphNode as GraphNodeType,
  PositionedNode,

  // Edge types
  GraphEdge as GraphEdgeType,
  PositionedEdge,

  // Layout types
  LayoutConfig,
  LayoutResult,

  // Interaction state
  GraphInteractionState,
  TransformState,

  // Render props
  RenderNodeProps,
  RenderEdgeProps,
  RenderTooltipProps,

  // Component props
  GraphRendererProps,
  GraphNodeProps,
  GraphEdgeProps,
  GraphControlsProps,
} from "./types.js";

export { createEdgeKey, DEFAULT_TRANSFORM } from "./types.js";

// =============================================================================
// Styles
// =============================================================================

export {
  CSS_VARIABLES,
  DEFAULT_COLORS,
  DEFAULT_CONTAINER_STYLES,
  DEFAULT_SVG_STYLES,
  DEFAULT_NODE_STYLES,
  DEFAULT_EDGE_STYLES,
  DEFAULT_CONTROLS_CONTAINER_STYLES,
  DEFAULT_BUTTON_STYLES,
  DEFAULT_BUTTON_HOVER_STYLES,
  DEFAULT_SEPARATOR_STYLES,
  DEFAULT_ZOOM_LABEL_STYLES,
} from "./styles.js";
