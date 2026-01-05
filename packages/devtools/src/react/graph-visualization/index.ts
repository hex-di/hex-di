/**
 * Graph visualization components for DevTools.
 *
 * Provides a visual dependency graph with interactive features:
 * - Hierarchical layout using Dagre (via @hex-di/graph-viz)
 * - Zoom and pan support
 * - Hover/click highlighting
 * - DI-specific node styling (lifetime colors, ownership badges)
 * - Tooltips with DI details
 *
 * @packageDocumentation
 */

// Main component
export { DependencyGraph } from "./dependency-graph.js";

// DI-specific mapping layer
export {
  // Metadata extraction
  extractDIMetadata,

  // Render props for @hex-di/graph-viz integration
  renderDINode,
  renderDITooltip,
  renderDIEdge,

  // Types
  type DINodeMetadata,
} from "./di-metadata.js";

// Re-export from di-render-props for alternative import path
export * from "./di-render-props.js";

// DI-specific types (keep for backward compatibility and DI-specific extensions)
export type {
  Point,
  PositionedNode,
  PositionedEdge,
  LayoutResult,
  GraphDirection,
  GraphInteractionState,
  TransformState,
  DependencyGraphProps,
  ContainerOwnershipEntry,
} from "./types.js";
export { createEdgeKey, DEFAULT_TRANSFORM } from "./types.js";

// DI-specific styles (keep - these are DevTools specific)
export {
  graphContainerStyles,
  graphNodeStyles,
  graphEdgeStyles,
  graphControlsStyles,
  tooltipStyles,
  getLifetimeStrokeVar,
  LIFETIME_COLORS,
  INHERITANCE_MODE_COLORS,
  OWNERSHIP_STYLES,
  getOwnershipStyle,
  OVR_BADGE_COLOR,
  COUNT_BADGE_COLOR,
} from "./graph-styles.js";

// Re-export commonly used types from @hex-di/graph-viz for convenience
export type {
  GraphNodeType as GenericGraphNode,
  GraphEdgeType as GenericGraphEdge,
  LayoutConfig,
  RenderNodeProps,
  RenderEdgeProps,
  RenderTooltipProps,
  GraphRendererProps,
} from "@hex-di/graph-viz";

// Re-export layout utilities from @hex-di/graph-viz
export {
  computeLayout,
  generateEdgePath,
  findConnectedNodes,
  findConnectedEdges,
  DEFAULT_LAYOUT_CONFIG,
} from "@hex-di/graph-viz";

// Re-export components from @hex-di/graph-viz for advanced usage
export {
  GraphRenderer,
  GraphNode,
  GraphEdge,
  ArrowMarkerDefs,
  GraphControls,
} from "@hex-di/graph-viz";
