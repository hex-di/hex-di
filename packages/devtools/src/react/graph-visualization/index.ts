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

// DI-specific types for type consumers
export { type DINodeMetadata } from "./di-metadata.js";

// DI-specific types (kept for external integrations)
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
