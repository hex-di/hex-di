/**
 * GraphViewModel - Immutable view data for dependency graph visualization.
 *
 * Contains all data needed to render a dependency graph, including nodes,
 * edges, and layout information. Framework-agnostic - can be rendered by
 * React, TUI, or any other presentation layer.
 *
 * @packageDocumentation
 */

import type { Lifetime } from "@hex-di/devtools-core";

// =============================================================================
// Node Types
// =============================================================================

/**
 * Position of a node in the graph layout.
 */
export interface NodePosition {
  readonly x: number;
  readonly y: number;
}

/**
 * Dimensions of a node for layout calculations.
 */
export interface NodeDimensions {
  readonly width: number;
  readonly height: number;
}

/**
 * A node in the dependency graph view.
 */
export interface GraphNodeViewModel {
  /** Unique identifier for the node (port name) */
  readonly id: string;
  /** Display label for the node */
  readonly label: string;
  /** Service lifetime (singleton, scoped, request) */
  readonly lifetime: Lifetime;
  /** Factory type (sync or async) */
  readonly factoryKind: "sync" | "async";
  /** Position in the layout */
  readonly position: NodePosition;
  /** Dimensions for rendering */
  readonly dimensions: NodeDimensions;
  /** Whether this node is currently selected */
  readonly isSelected: boolean;
  /** Whether this node is highlighted (e.g., dependency path) */
  readonly isHighlighted: boolean;
  /** Whether this node is dimmed (e.g., not in current filter) */
  readonly isDimmed: boolean;
}

// =============================================================================
// Edge Types
// =============================================================================

/**
 * An edge (dependency) in the dependency graph view.
 */
export interface GraphEdgeViewModel {
  /** Unique identifier for the edge */
  readonly id: string;
  /** Source node ID (the dependent) */
  readonly from: string;
  /** Target node ID (the dependency) */
  readonly to: string;
  /** Whether this edge is highlighted */
  readonly isHighlighted: boolean;
  /** Whether this edge is dimmed */
  readonly isDimmed: boolean;
}

// =============================================================================
// Layout Types
// =============================================================================

/**
 * Layout direction for the graph.
 */
export type LayoutDirection = "TB" | "BT" | "LR" | "RL";

/**
 * Viewport bounds for the graph canvas.
 */
export interface GraphViewport {
  readonly width: number;
  readonly height: number;
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

// =============================================================================
// Graph View Model
// =============================================================================

/**
 * Complete view model for rendering a dependency graph.
 *
 * This is the primary data structure passed to graph view implementations.
 * It contains all information needed to render the graph without any
 * additional computation.
 */
export interface GraphViewModel {
  /** All nodes in the graph */
  readonly nodes: readonly GraphNodeViewModel[];
  /** All edges in the graph */
  readonly edges: readonly GraphEdgeViewModel[];
  /** Layout direction */
  readonly direction: LayoutDirection;
  /** Viewport bounds calculated from node positions */
  readonly viewport: GraphViewport;
  /** Currently selected node ID, if any */
  readonly selectedNodeId: string | null;
  /** List of highlighted node IDs */
  readonly highlightedNodeIds: readonly string[];
  /** Current zoom level (1.0 = 100%) */
  readonly zoom: number;
  /** Pan offset from origin */
  readonly panOffset: NodePosition;
  /** Whether the graph is empty */
  readonly isEmpty: boolean;
  /** Total node count */
  readonly nodeCount: number;
  /** Total edge count */
  readonly edgeCount: number;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Creates an empty GraphViewModel.
 */
export function createEmptyGraphViewModel(): GraphViewModel {
  return Object.freeze({
    nodes: Object.freeze([]),
    edges: Object.freeze([]),
    direction: "TB" as const,
    viewport: Object.freeze({ width: 0, height: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 }),
    selectedNodeId: null,
    highlightedNodeIds: Object.freeze([]),
    zoom: 1,
    panOffset: Object.freeze({ x: 0, y: 0 }),
    isEmpty: true,
    nodeCount: 0,
    edgeCount: 0,
  });
}
