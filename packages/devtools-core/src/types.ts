/**
 * Core types for @hex-di/devtools-core.
 *
 * This module defines visualization-layer types for the DevTools ecosystem.
 * Container and tracing types are defined in @hex-di/core and should be
 * imported directly from there.
 *
 * @packageDocumentation
 */

// Import types from core
import type {
  FactoryKind,
  Lifetime,
  InheritanceMode,
  ServiceOrigin,
  TraceEntry,
  TraceStats,
  ContainerSnapshot,
} from "@hex-di/core";

// Re-export types visualization layer needs
export type { FactoryKind } from "@hex-di/core";

// =============================================================================
// Container Ownership Metadata
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
}

// =============================================================================
// Exported Graph Types
// =============================================================================

/**
 * Represents a node in the exported dependency graph.
 *
 * Each node corresponds to a port/adapter registration in the original Graph.
 * The structure is designed for serialization and visualization purposes.
 *
 * @example
 * ```typescript
 * const node: ExportedNode = {
 *   id: 'Logger',
 *   label: 'Logger',
 *   lifetime: 'singleton',
 *   factoryKind: 'sync'
 * };
 * ```
 */
export interface ExportedNode {
  /** Unique identifier for the node (port name) */
  readonly id: string;
  /** Display label for the node (defaults to port name) */
  readonly label: string;
  /** Service instance lifetime scope */
  readonly lifetime: Lifetime;
  /** Factory kind - sync or async */
  readonly factoryKind: FactoryKind;
  /** Origin of this service - own (defined locally), inherited (from parent), or overridden (replaces parent) */
  readonly origin?: ServiceOrigin;
  /** Inheritance mode for inherited services in child containers (shared, forked, isolated) */
  readonly inheritanceMode?: InheritanceMode;
  /**
   * Ownership state for visual styling.
   *
   * Determines the visual treatment of the node in graph visualizations:
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
   * This enables tooltips and detailed views to show per-container ownership.
   *
   * @example
   * ```typescript
   * const node: ExportedNode = {
   *   id: 'Logger',
   *   label: 'Logger',
   *   lifetime: 'singleton',
   *   factoryKind: 'sync',
   *   containerOwnership: [
   *     { containerId: 'root', ownership: 'own' },
   *     { containerId: 'child-1', ownership: 'inherited' },
   *     { containerId: 'child-2', ownership: 'overridden' },
   *   ]
   * };
   * ```
   */
  readonly containerOwnership?: ReadonlyArray<ContainerOwnershipEntry>;
}

/**
 * Represents a directed edge (dependency relationship) in the exported graph.
 *
 * An edge indicates that the service at `from` depends on the service at `to`.
 * Edge direction follows the dependency direction: dependent -> dependency.
 *
 * @example
 * ```typescript
 * // UserService depends on Logger
 * const edge: ExportedEdge = {
 *   from: 'UserService',
 *   to: 'Logger'
 * };
 * ```
 */
export interface ExportedEdge {
  /** The id of the dependent node (source of the dependency arrow) */
  readonly from: string;
  /** The id of the required node (target of the dependency arrow) */
  readonly to: string;
}

/**
 * Represents the complete exported dependency graph.
 *
 * Contains all nodes (services/ports) and edges (dependencies) from
 * the original Graph in a serializable format suitable for JSON export,
 * visualization, or further transformation.
 *
 * @example
 * ```typescript
 * const graph: ExportedGraph = {
 *   nodes: [
 *     { id: 'Logger', label: 'Logger', lifetime: 'singleton', factoryKind: 'sync' },
 *     { id: 'UserService', label: 'UserService', lifetime: 'scoped', factoryKind: 'sync' }
 *   ],
 *   edges: [
 *     { from: 'UserService', to: 'Logger' }
 *   ]
 * };
 * ```
 */
export interface ExportedGraph {
  /** Array of all nodes in the graph */
  readonly nodes: readonly ExportedNode[];
  /** Array of all edges (dependencies) in the graph */
  readonly edges: readonly ExportedEdge[];
}

// =============================================================================
// Export Options Types
// =============================================================================

/**
 * Configuration options for DOT (Graphviz) format export.
 *
 * @example
 * ```typescript
 * const options: DOTOptions = {
 *   direction: 'LR',    // Left-to-right layout
 *   preset: 'styled'    // Color-coded by lifetime
 * };
 * ```
 */
export interface DOTOptions {
  /**
   * Graph layout direction.
   * - `'TB'`: Top to bottom (default)
   * - `'LR'`: Left to right
   */
  readonly direction?: "TB" | "LR";

  /**
   * Visual styling preset.
   * - `'minimal'`: Basic box nodes (default)
   * - `'styled'`: Color-coded nodes by lifetime
   */
  readonly preset?: "minimal" | "styled";
}

/**
 * Configuration options for Mermaid format export.
 *
 * @example
 * ```typescript
 * const options: MermaidOptions = {
 *   direction: 'LR'  // Left-to-right layout
 * };
 * ```
 */
export interface MermaidOptions {
  /**
   * Graph layout direction.
   * - `'TD'`: Top to down (default)
   * - `'LR'`: Left to right
   */
  readonly direction?: "TD" | "LR";
}

// =============================================================================
// Filter and Transform Types
// =============================================================================

/**
 * Predicate function for filtering nodes in an exported graph.
 *
 * Used with `filterGraph` to select which nodes to include in the output.
 * Returns `true` to include the node, `false` to exclude it.
 *
 * @example
 * ```typescript
 * // Filter to only singleton nodes
 * const isSingleton: NodePredicate = (node) => node.lifetime === 'singleton';
 *
 * // Filter by name pattern
 * const isService: NodePredicate = (node) => node.id.endsWith('Service');
 * ```
 */
export type NodePredicate = (node: ExportedNode) => boolean;

/**
 * Transform function for relabeling nodes in an exported graph.
 *
 * Used with `relabelPorts` to customize node display labels while
 * preserving the original node IDs for edge references.
 *
 * @example
 * ```typescript
 * // Add lifetime to label
 * const addLifetime: LabelTransform = (node) =>
 *   `${node.label} [${node.lifetime}]`;
 *
 * // Strip common prefix
 * const stripPrefix: LabelTransform = (node) =>
 *   node.label.replace('App.Services.', '');
 * ```
 */
export type LabelTransform = (node: ExportedNode) => string;

// =============================================================================
// Error Types
// =============================================================================

/**
 * Structured error type for DevTools operations.
 */
export interface DevToolsError {
  readonly code: string;
  readonly message: string;
  readonly category: "connection" | "protocol" | "data" | "validation" | "internal";
  readonly recoverable: boolean;
  readonly cause?: Error;
  readonly context?: Record<string, unknown>;
}

// =============================================================================
// Presenter Data Source Contract
// =============================================================================

/**
 * Contract for presenter data access.
 *
 * This interface defines how presenters access DevTools data without
 * coupling to specific data source implementations. Presenters inject
 * this dependency to remain testable and framework-agnostic.
 *
 * @example
 * ```typescript
 * class GraphPresenter {
 *   constructor(private readonly dataSource: PresenterDataSourceContract) {}
 *
 *   getViewModel(): GraphViewModel {
 *     const graph = this.dataSource.getGraph();
 *     // Transform to view model...
 *   }
 * }
 * ```
 */
export interface PresenterDataSourceContract {
  /** Get the current dependency graph */
  getGraph(): ExportedGraph;
  /** Get all trace entries */
  getTraces(): readonly TraceEntry[];
  /** Get aggregate trace statistics */
  getStats(): TraceStats;
  /** Get the current container snapshot, if available */
  getContainerSnapshot(): ContainerSnapshot | null;
  /** Check if tracing is available */
  hasTracing(): boolean;
  /** Check if container inspection is available */
  hasContainer(): boolean;
  /** Check if trace collection is paused */
  isPaused(): boolean;
  /** Pause trace collection */
  pause(): void;
  /** Resume trace collection */
  resume(): void;
  /** Clear all trace entries */
  clearTraces(): void;
  /** Pin a trace to protect it from eviction */
  pinTrace(traceId: string): void;
  /** Unpin a trace */
  unpinTrace(traceId: string): void;
  /** Subscribe to data changes, returns unsubscribe function */
  subscribe(callback: () => void): () => void;
}

// =============================================================================
// Communication Types
// =============================================================================

/**
 * Role of a client in the DevTools communication.
 */
export type ClientRole = "host" | "observer" | "controller" | "admin";

/**
 * Information about a DevTools server.
 */
export interface ServerInfo {
  readonly id: string;
  readonly appName: string;
  readonly type: "browser" | "node" | "relay";
  readonly url: string;
  readonly pid?: number;
  readonly startedAt: number;
  readonly capabilities: readonly string[];
}
