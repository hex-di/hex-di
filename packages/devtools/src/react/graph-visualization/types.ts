/**
 * DI-specific types for the visual dependency graph component.
 *
 * These types extend the generic graph-viz types with DI-specific
 * properties like lifetime, ownership, and inheritance mode.
 *
 * Generic graph types (Point, GraphDirection, etc.) are re-exported
 * from @hex-di/graph-viz for convenience.
 *
 * @packageDocumentation
 */

import type { Lifetime, FactoryKind } from "@hex-di/core";
import type { InheritanceMode, ServiceOrigin } from "@hex-di/core";

// Re-export generic types from @hex-di/graph-viz
export type {
  Point,
  GraphDirection,
  TransformState,
  GraphInteractionState,
} from "@hex-di/graph-viz";

// Note: createEdgeKey and DEFAULT_TRANSFORM are available from @hex-di/graph-viz
// but not re-exported here as they're not used by devtools consumers

// =============================================================================
// DI-Specific Node Types
// =============================================================================

/**
 * Per-container ownership entry for a port/adapter.
 *
 * Used in unified multi-container graph views to show which containers
 * provide a given port and what their individual ownership state is.
 */
export interface ContainerOwnershipEntry {
  /** The unique identifier of the container */
  readonly containerId: string;
  /** The ownership state for this port in this container */
  readonly ownership: ServiceOrigin;
  /** Optional inheritance mode (only for inherited ownership) */
  readonly inheritanceMode?: InheritanceMode;
}

/**
 * A DI node with computed position and dimensions from layout algorithm.
 *
 * Extends the generic PositionedNode with DI-specific metadata.
 */
export interface PositionedNode {
  /** Unique identifier (port name) */
  readonly id: string;
  /** Display label */
  readonly label: string;
  /** Service lifetime */
  readonly lifetime: Lifetime;
  /** Factory kind - sync or async */
  readonly factoryKind?: FactoryKind;
  /** Center X position */
  readonly x: number;
  /** Center Y position */
  readonly y: number;
  /** Node width */
  readonly width: number;
  /** Node height */
  readonly height: number;
  /** Service origin - own (defined locally), inherited (from parent), or overridden (replaces parent) */
  readonly origin?: ServiceOrigin;
  /** Inheritance mode for inherited services (shared, forked, isolated) */
  readonly inheritanceMode?: InheritanceMode;
  /** List of containers that provide this port (for unified multi-select view) */
  readonly containers?: readonly string[];
  /**
   * Ownership state for visual styling.
   *
   * Determines the visual treatment of the node:
   * - `"own"`: Solid 2px border, full opacity - adapter registered directly in container
   * - `"inherited"`: Dashed 4-2 border, 85% opacity - adapter from parent container
   * - `"overridden"`: Double 3px border, OVR badge - child override of parent adapter
   */
  readonly ownership?: ServiceOrigin;
  /**
   * Per-container ownership metadata for multi-container views.
   *
   * When displaying a unified graph across multiple containers, this field
   * provides the ownership state for each container that provides this port.
   */
  readonly containerOwnership?: ReadonlyArray<ContainerOwnershipEntry>;
}

// =============================================================================
// DI-Specific Edge Types
// =============================================================================

/**
 * A DI edge with computed path points from layout algorithm.
 *
 * Uses the same structure as generic PositionedEdge from @hex-di/graph-viz.
 */
export interface PositionedEdge {
  /** Source node id */
  readonly from: string;
  /** Target node id */
  readonly to: string;
  /** Path points for the edge curve */
  readonly points: readonly { readonly x: number; readonly y: number }[];
}

// =============================================================================
// DI-Specific Layout Result
// =============================================================================

/**
 * Result of DI graph layout computation.
 */
export interface LayoutResult {
  /** Positioned DI nodes */
  readonly nodes: readonly PositionedNode[];
  /** Positioned edges */
  readonly edges: readonly PositionedEdge[];
  /** Total graph width */
  readonly width: number;
  /** Total graph height */
  readonly height: number;
}

// =============================================================================
// Component Props
// =============================================================================

/**
 * Props for the DependencyGraph component.
 */
export interface DependencyGraphProps {
  /** The graph nodes */
  readonly nodes: ReadonlyArray<{
    readonly id: string;
    readonly label: string;
    readonly lifetime: Lifetime;
    /** Factory kind - sync or async */
    readonly factoryKind?: FactoryKind;
    /** Service origin - own, inherited, or overridden */
    readonly origin?: ServiceOrigin;
    /** Inheritance mode for inherited services */
    readonly inheritanceMode?: InheritanceMode;
    /** List of containers that provide this port (for unified multi-select view) */
    readonly containers?: readonly string[];
    /**
     * Ownership state for visual styling.
     *
     * Determines the visual treatment of the node:
     * - `"own"`: Solid 2px border, full opacity
     * - `"inherited"`: Dashed 4-2 border, 85% opacity
     * - `"overridden"`: Double 3px border, OVR badge
     */
    readonly ownership?: ServiceOrigin;
    /**
     * Per-container ownership metadata for multi-container views.
     *
     * When displaying a unified graph across multiple containers, this field
     * provides the ownership state for each container that provides this port.
     */
    readonly containerOwnership?: ReadonlyArray<ContainerOwnershipEntry>;
  }>;
  /** The graph edges */
  readonly edges: ReadonlyArray<{
    readonly from: string;
    readonly to: string;
  }>;
  /** Graph layout direction */
  readonly direction?: "TB" | "LR";
  /** Callback when a node is clicked */
  readonly onNodeClick?: (nodeId: string) => void;
  /** Callback when a node is hovered */
  readonly onNodeHover?: (nodeId: string | null) => void;
  /** Whether to show zoom controls */
  readonly showControls?: boolean;
  /** Minimum zoom scale */
  readonly minZoom?: number;
  /** Maximum zoom scale */
  readonly maxZoom?: number;
}
