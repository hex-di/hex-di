/**
 * Generic types for graph visualization components.
 *
 * These types are domain-agnostic and can be used for any graph visualization,
 * not just dependency injection graphs.
 *
 * @packageDocumentation
 */

import type { ReactElement, CSSProperties } from "react";

// =============================================================================
// Core Layout Types
// =============================================================================

/**
 * A point in 2D space.
 */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * Direction of the graph layout.
 * - TB: Top to bottom (default)
 * - LR: Left to right
 */
export type GraphDirection = "TB" | "LR";

// =============================================================================
// Generic Node Types
// =============================================================================

/**
 * Input node for layout computation.
 *
 * @typeParam TMetadata - Custom metadata type for domain-specific node data
 */
export interface GraphNode<TMetadata = unknown> {
  /** Unique identifier for the node */
  readonly id: string;
  /** Display label */
  readonly label: string;
  /** Custom metadata for domain-specific rendering */
  readonly metadata?: TMetadata;
}

/**
 * A node with computed position and dimensions from layout algorithm.
 *
 * @typeParam TMetadata - Custom metadata type for domain-specific node data
 */
export interface PositionedNode<TMetadata = unknown> {
  /** Unique identifier */
  readonly id: string;
  /** Display label */
  readonly label: string;
  /** Center X position */
  readonly x: number;
  /** Center Y position */
  readonly y: number;
  /** Node width */
  readonly width: number;
  /** Node height */
  readonly height: number;
  /** Custom metadata for domain-specific rendering */
  readonly metadata?: TMetadata;
}

// =============================================================================
// Generic Edge Types
// =============================================================================

/**
 * Input edge for layout computation.
 */
export interface GraphEdge {
  /** Source node id */
  readonly from: string;
  /** Target node id */
  readonly to: string;
}

/**
 * An edge with computed path points from layout algorithm.
 */
export interface PositionedEdge {
  /** Source node id */
  readonly from: string;
  /** Target node id */
  readonly to: string;
  /** Path points for the edge curve */
  readonly points: readonly Point[];
}

// =============================================================================
// Layout Types
// =============================================================================

/**
 * Configuration options for the layout algorithm.
 */
export interface LayoutConfig {
  /** Graph direction: TB (top-to-bottom) or LR (left-to-right) */
  readonly direction: GraphDirection;
  /** Horizontal spacing between nodes */
  readonly nodeSep: number;
  /** Vertical spacing between ranks/levels */
  readonly rankSep: number;
  /** Outer margin on X axis */
  readonly marginX: number;
  /** Outer margin on Y axis */
  readonly marginY: number;
  /** Fixed node width */
  readonly nodeWidth: number;
  /** Fixed node height */
  readonly nodeHeight: number;
}

/**
 * Result of layout computation.
 *
 * @typeParam TMetadata - Custom metadata type for domain-specific node data
 */
export interface LayoutResult<TMetadata = unknown> {
  /** Positioned nodes */
  readonly nodes: readonly PositionedNode<TMetadata>[];
  /** Positioned edges */
  readonly edges: readonly PositionedEdge[];
  /** Total graph width */
  readonly width: number;
  /** Total graph height */
  readonly height: number;
}

// =============================================================================
// Interaction State
// =============================================================================

/**
 * State for tracking user interactions with the graph.
 */
export interface GraphInteractionState {
  /** Currently hovered node id, or null if none */
  readonly hoveredNodeId: string | null;
  /** Currently selected node id, or null if none */
  readonly selectedNodeId: string | null;
  /** Set of node ids that should be highlighted (connected to hovered/selected) */
  readonly highlightedNodeIds: ReadonlySet<string>;
  /** Set of edge keys (from-to) that should be highlighted */
  readonly highlightedEdgeKeys: ReadonlySet<string>;
}

/**
 * Creates an edge key for lookup in Sets/Maps.
 */
export function createEdgeKey(from: string, to: string): string {
  return `${from}->${to}`;
}

// =============================================================================
// Zoom/Pan State
// =============================================================================

/**
 * Transform state for zoom and pan.
 */
export interface TransformState {
  /** Current zoom scale (1 = 100%) */
  readonly scale: number;
  /** X translation offset */
  readonly translateX: number;
  /** Y translation offset */
  readonly translateY: number;
}

/**
 * Default transform state (no zoom, no pan).
 */
export const DEFAULT_TRANSFORM: TransformState = {
  scale: 1,
  translateX: 0,
  translateY: 0,
};

// =============================================================================
// Render Props Types
// =============================================================================

/**
 * Props passed to the renderNode render prop.
 *
 * @typeParam TMetadata - Custom metadata type for domain-specific node data
 */
export interface RenderNodeProps<TMetadata = unknown> {
  /** The positioned node to render */
  readonly node: PositionedNode<TMetadata>;
  /** Whether this node is currently hovered */
  readonly isHovered: boolean;
  /** Whether this node is currently selected */
  readonly isSelected: boolean;
  /** Whether this node should be dimmed (not connected to hovered/selected) */
  readonly isDimmed: boolean;
  /** X position of top-left corner */
  readonly x: number;
  /** Y position of top-left corner */
  readonly y: number;
}

/**
 * Props passed to the renderEdge render prop.
 */
export interface RenderEdgeProps {
  /** The positioned edge to render */
  readonly edge: PositionedEdge;
  /** Whether this edge should be highlighted */
  readonly isHighlighted: boolean;
  /** Whether this edge should be dimmed */
  readonly isDimmed: boolean;
  /** SVG path d attribute for the edge */
  readonly pathD: string;
}

/**
 * Props passed to the renderTooltip render prop.
 *
 * @typeParam TMetadata - Custom metadata type for domain-specific node data
 */
export interface RenderTooltipProps<TMetadata = unknown> {
  /** The node to show tooltip for */
  readonly node: PositionedNode<TMetadata>;
  /** X position for tooltip */
  readonly x: number;
  /** Y position for tooltip */
  readonly y: number;
}

// =============================================================================
// Component Props Types
// =============================================================================

/**
 * Props for the GraphRenderer component.
 *
 * @typeParam TMetadata - Custom metadata type for domain-specific node data
 */
export interface GraphRendererProps<TMetadata = unknown> {
  /** Layout result with positioned nodes and edges */
  readonly layout: LayoutResult<TMetadata>;
  /** Currently hovered node ID */
  readonly hoveredNodeId: string | null;
  /** Currently selected node ID */
  readonly selectedNodeId: string | null;
  /** Set of highlighted node IDs */
  readonly highlightedNodeIds: ReadonlySet<string>;
  /** Set of highlighted edge keys */
  readonly highlightedEdgeKeys: ReadonlySet<string>;
  /** Callback when a node is clicked */
  readonly onNodeClick?: (nodeId: string) => void;
  /** Callback when mouse enters a node */
  readonly onNodeHover?: (nodeId: string | null) => void;
  /** Whether to show zoom controls */
  readonly showControls?: boolean;
  /** Minimum zoom scale */
  readonly minZoom?: number;
  /** Maximum zoom scale */
  readonly maxZoom?: number;
  /** Custom render function for nodes */
  readonly renderNode?: (props: RenderNodeProps<TMetadata>) => ReactElement;
  /** Custom render function for edges */
  readonly renderEdge?: (props: RenderEdgeProps) => ReactElement;
  /** Custom render function for tooltips */
  readonly renderTooltip?: (props: RenderTooltipProps<TMetadata>) => ReactElement | null;
  /** Custom styles for the graph container */
  readonly containerStyle?: CSSProperties;
  /** Custom styles for the SVG element */
  readonly svgStyle?: CSSProperties;
}

/**
 * Props for the GraphNode component.
 *
 * @typeParam TMetadata - Custom metadata type for domain-specific node data
 */
export interface GraphNodeProps<TMetadata = unknown> {
  /** The positioned node to render */
  readonly node: PositionedNode<TMetadata>;
  /** Whether this node is currently hovered */
  readonly isHovered: boolean;
  /** Whether this node is currently selected */
  readonly isSelected: boolean;
  /** Whether this node should be dimmed (not connected to hovered/selected) */
  readonly isDimmed: boolean;
  /** Callback when node is clicked */
  readonly onClick?: (nodeId: string) => void;
  /** Callback when mouse enters node */
  readonly onMouseEnter?: (nodeId: string) => void;
  /** Callback when mouse leaves node */
  readonly onMouseLeave?: () => void;
  /** Custom render function for node content */
  readonly renderContent?: (props: RenderNodeProps<TMetadata>) => ReactElement;
}

/**
 * Props for the GraphEdge component.
 */
export interface GraphEdgeProps {
  /** The positioned edge to render */
  readonly edge: PositionedEdge;
  /** Whether this edge should be highlighted */
  readonly isHighlighted: boolean;
  /** Whether this edge should be dimmed */
  readonly isDimmed: boolean;
  /** ID for the arrow marker to use */
  readonly markerId: string;
  /** ID for the highlighted arrow marker */
  readonly highlightedMarkerId: string;
  /** Custom render function for edge content */
  readonly renderContent?: (props: RenderEdgeProps) => ReactElement;
}

/**
 * Props for the GraphControls component.
 */
export interface GraphControlsProps {
  /** Current zoom scale (1 = 100%) */
  readonly zoom: number;
  /** Minimum zoom scale */
  readonly minZoom: number;
  /** Maximum zoom scale */
  readonly maxZoom: number;
  /** Callback to zoom in */
  readonly onZoomIn: () => void;
  /** Callback to zoom out */
  readonly onZoomOut: () => void;
  /** Callback to fit graph in view */
  readonly onFitView: () => void;
  /** Callback to reset to 100% zoom */
  readonly onResetZoom: () => void;
  /** Custom styles for the controls container */
  readonly containerStyle?: CSSProperties;
  /** Custom styles for buttons */
  readonly buttonStyle?: CSSProperties;
}
