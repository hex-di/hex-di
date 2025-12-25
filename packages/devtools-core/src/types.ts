/**
 * Core types for @hex-di/devtools-core.
 *
 * This module defines the canonical type definitions for the entire
 * DevTools ecosystem. All other packages should import from here
 * to ensure type consistency.
 *
 * @packageDocumentation
 */

import type { Lifetime as GraphLifetime, FactoryKind } from "@hex-di/graph";

// Re-export from graph
export type { FactoryKind } from "@hex-di/graph";

/**
 * Service lifetime - directly from @hex-di/graph.
 */
export type Lifetime = GraphLifetime;

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
  /**
   * Port name (same as id, included for clarity in certain contexts).
   * @deprecated Use `id` instead. This field is included for backward compatibility.
   */
  readonly portName?: string;
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
// Trace Types (Canonical - Single Source of Truth)
// =============================================================================

/**
 * Represents a single resolution trace entry.
 *
 * Each TraceEntry captures comprehensive data about one service resolution,
 * including timing information, cache status, and dependency hierarchy.
 * Entries form a tree structure through parentId/childIds relationships.
 *
 * @example
 * ```typescript
 * const entry: TraceEntry = {
 *   id: "trace-1",
 *   portName: "UserService",
 *   lifetime: "scoped",
 *   startTime: 1234.567,
 *   duration: 25.3,
 *   isCacheHit: false,
 *   parentId: null,
 *   childIds: ["trace-2", "trace-3"],
 *   scopeId: "scope-1",
 *   order: 1,
 *   isPinned: false,
 * };
 * ```
 */
export interface TraceEntry {
  /** Unique identifier for this trace entry */
  readonly id: string;
  /** Name of the port being resolved */
  readonly portName: string;
  /** Service lifetime of the resolved adapter */
  readonly lifetime: Lifetime;
  /** High-resolution timestamp when resolution started */
  readonly startTime: number;
  /** Duration of the resolution in milliseconds */
  readonly duration: number;
  /** Whether this resolution was served from cache */
  readonly isCacheHit: boolean;
  /** ID of the parent trace entry, or null for root resolutions */
  readonly parentId: string | null;
  /** IDs of child trace entries */
  readonly childIds: readonly string[];
  /** ID of the scope where resolution occurred, or null for container-level */
  readonly scopeId: string | null;
  /** Global resolution order counter */
  readonly order: number;
  /** Whether this trace is pinned (protected from FIFO eviction) */
  readonly isPinned: boolean;
}

/**
 * Aggregate statistics computed from trace entries.
 *
 * Provides high-level metrics for performance analysis and monitoring.
 *
 * @example
 * ```typescript
 * const stats: TraceStats = {
 *   totalResolutions: 150,
 *   averageDuration: 25.5,
 *   cacheHitRate: 0.65,    // 65% cache hit rate
 *   slowCount: 12,
 *   sessionStart: 1702500000000,
 * };
 * ```
 */
export interface TraceStats {
  /** Total number of resolution traces recorded */
  readonly totalResolutions: number;
  /** Average resolution duration in milliseconds */
  readonly averageDuration: number;
  /** Ratio of cache hits to total resolutions (0 to 1) */
  readonly cacheHitRate: number;
  /** Number of resolutions that exceeded slowThresholdMs */
  readonly slowCount: number;
  /** Timestamp when the tracing session started */
  readonly sessionStart: number;
  /** Total cumulative duration of all resolutions in milliseconds */
  readonly totalDuration: number;
}

/**
 * Filter criteria for querying trace entries.
 *
 * All properties are optional; multiple criteria are ANDed together.
 *
 * @example
 * ```typescript
 * const filter: TraceFilter = {
 *   lifetime: "scoped",
 *   minDuration: 50,
 * };
 * ```
 */
export interface TraceFilter {
  /** Filter by port name (partial match, case-insensitive) */
  readonly portName?: string;
  /** Filter by service lifetime */
  readonly lifetime?: Lifetime;
  /** Filter by cache hit status */
  readonly isCacheHit?: boolean;
  /** Minimum duration in milliseconds (inclusive) */
  readonly minDuration?: number;
  /** Maximum duration in milliseconds (inclusive) */
  readonly maxDuration?: number;
  /** Filter by scope ID */
  readonly scopeId?: string | null;
  /** Filter by pinned status */
  readonly isPinned?: boolean;
}

/**
 * Configuration for trace buffer retention and eviction policy.
 */
export interface TraceRetentionPolicy {
  /** Maximum number of traces to retain in the buffer. @default 1000 */
  readonly maxTraces: number;
  /** Maximum number of pinned (slow) traces to retain. @default 100 */
  readonly maxPinnedTraces: number;
  /** Duration threshold in milliseconds for auto-pinning slow traces. @default 100 */
  readonly slowThresholdMs: number;
  /** Time in milliseconds after which non-pinned traces expire. @default 300000 */
  readonly expiryMs: number;
}

/**
 * Default trace retention policy values.
 */
export const DEFAULT_RETENTION_POLICY: TraceRetentionPolicy = {
  maxTraces: 1000,
  maxPinnedTraces: 100,
  slowThresholdMs: 100,
  expiryMs: 300000,
} as const;

/**
 * Configuration options for createTracingContainer().
 */
export interface TracingOptions {
  /** Custom retention policy configuration */
  readonly retentionPolicy?: Partial<TraceRetentionPolicy>;
}

/**
 * API exposed via TRACING_ACCESS Symbol on tracing-enabled containers.
 */
export interface TracingAPI {
  /** Retrieves trace entries, optionally filtered */
  getTraces(filter?: TraceFilter): readonly TraceEntry[];
  /** Computes and returns aggregate trace statistics */
  getStats(): TraceStats;
  /** Pauses trace recording */
  pause(): void;
  /** Resumes trace recording after pause() */
  resume(): void;
  /** Clears all traces from the buffer */
  clear(): void;
  /** Subscribes to new trace entries in real-time */
  subscribe(callback: (entry: TraceEntry) => void): () => void;
  /** Returns whether tracing is currently paused */
  isPaused(): boolean;
  /** Manually pins a trace to protect it from FIFO eviction */
  pin(traceId: string): void;
  /** Unpins a trace, making it eligible for FIFO eviction */
  unpin(traceId: string): void;
}

/**
 * Type guard to check if an object has tracing capabilities.
 */
export function hasTracingAccess(container: unknown): container is { [key: symbol]: TracingAPI } {
  return (
    typeof container === "object" &&
    container !== null &&
    Symbol.for("hex-di/tracing-access") in container
  );
}

// =============================================================================
// Container Types
// =============================================================================

/**
 * Container type discriminant for type-safe snapshot handling.
 */
export type ContainerKind = "root" | "child" | "lazy" | "scope";

/**
 * Container phase states across all container types.
 *
 * Different container types have different valid phases:
 * - Root: "uninitialized" | "initialized" | "disposing" | "disposed"
 * - Child: "initialized" | "disposing" | "disposed" (inherits init from parent)
 * - Lazy: "unloaded" | "loading" | "loaded" | "disposing" | "disposed"
 * - Scope: "active" | "disposing" | "disposed"
 */
export type ContainerPhase =
  | "uninitialized"
  | "initialized"
  | "unloaded"
  | "loading"
  | "loaded"
  | "active"
  | "disposing"
  | "disposed";

/**
 * Information about a resolved singleton.
 */
export interface SingletonEntry {
  /** Port name of the singleton */
  readonly portName: string;
  /** Timestamp when the singleton was resolved */
  readonly resolvedAt: number;
  /** Whether the singleton is currently resolved (has cached instance) */
  readonly isResolved: boolean;
}

/**
 * Information about an active scope.
 */
export interface ScopeInfo {
  readonly id: string;
  readonly parentId: string | null;
  readonly childIds: readonly string[];
  readonly resolvedPorts: readonly string[];
  readonly createdAt: number;
  readonly isActive: boolean;
}

/**
 * Hierarchical tree structure for scopes.
 */
export interface ScopeTree {
  readonly id: string;
  readonly status: "active" | "disposed";
  readonly resolvedCount: number;
  readonly totalCount: number;
  readonly children: readonly ScopeTree[];
}

/**
 * Base snapshot fields shared by all container types.
 */
interface ContainerSnapshotBase {
  readonly singletons: readonly SingletonEntry[];
  readonly scopes: ScopeTree;
  readonly isDisposed: boolean;
}

/**
 * Root container snapshot.
 *
 * Root containers are created via `createContainer(graph)` and own
 * the dependency graph. They manage async adapter initialization.
 */
export interface RootContainerSnapshot extends ContainerSnapshotBase {
  readonly kind: "root";
  readonly phase: "uninitialized" | "initialized" | "disposing" | "disposed";
  readonly isInitialized: boolean;
  readonly asyncAdaptersTotal: number;
  readonly asyncAdaptersInitialized: number;
}

/**
 * Child container snapshot.
 *
 * Child containers are created via `container.createChild(graph)` and
 * extend or override the parent's adapters.
 */
export interface ChildContainerSnapshot extends ContainerSnapshotBase {
  readonly kind: "child";
  readonly phase: "initialized" | "disposing" | "disposed";
  readonly parentId: string;
  readonly inheritanceMode: "shared" | "forked" | "isolated";
}

/**
 * Lazy container snapshot.
 *
 * Lazy containers are created via `container.createLazyChild(loader)` and
 * defer graph loading until first use.
 */
export interface LazyContainerSnapshot extends ContainerSnapshotBase {
  readonly kind: "lazy";
  readonly phase: "unloaded" | "loading" | "loaded" | "disposing" | "disposed";
  readonly isLoaded: boolean;
}

/**
 * Scope snapshot.
 *
 * Scopes are created via `container.createScope()` and provide
 * isolated scoped service instances.
 */
export interface ScopeSnapshot extends ContainerSnapshotBase {
  readonly kind: "scope";
  readonly phase: "active" | "disposing" | "disposed";
  readonly scopeId: string;
  readonly parentScopeId: string | null;
}

/**
 * Discriminated union of all container snapshots.
 *
 * Use `snapshot.kind` for type-safe narrowing to specific container types.
 *
 * @example
 * ```typescript
 * function handleSnapshot(snapshot: ContainerSnapshot) {
 *   switch (snapshot.kind) {
 *     case "root":
 *       console.log(`Async adapters: ${snapshot.asyncAdaptersInitialized}/${snapshot.asyncAdaptersTotal}`);
 *       break;
 *     case "lazy":
 *       console.log(`Loaded: ${snapshot.isLoaded}`);
 *       break;
 *     case "child":
 *       console.log(`Inheritance: ${snapshot.inheritanceMode}`);
 *       break;
 *     case "scope":
 *       console.log(`Scope ID: ${snapshot.scopeId}`);
 *       break;
 *   }
 * }
 * ```
 */
export type ContainerSnapshot =
  | RootContainerSnapshot
  | ChildContainerSnapshot
  | LazyContainerSnapshot
  | ScopeSnapshot;

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
