/**
 * Type definitions for InspectorAPI.
 *
 * Provides the contract for runtime container inspection.
 * Implementation lives in @hex-di/runtime.
 *
 * @packageDocumentation
 */

import type {
  ContainerKind,
  ContainerPhase,
  ContainerSnapshot,
  ScopeTree,
  InheritanceMode,
  ServiceOrigin,
  Lifetime,
  FactoryKind,
} from "./container-types.js";
import type {
  LibraryEvent,
  LibraryInspector,
  UnifiedSnapshot,
  LibraryQueryEntry,
  LibraryQueryResult,
  LibraryQueryPredicate,
} from "./library-inspector-types.js";

// =============================================================================
// Scope Event Types
// =============================================================================

/**
 * Information about a scope event (creation/disposal).
 */
export interface ScopeEventInfo {
  readonly id: string;
  readonly parentId: string | undefined;
  readonly createdAt: number;
  readonly scopeId: string;
  readonly scopeName: string | undefined;
}

// =============================================================================
// Adapter Info Types
// =============================================================================

/**
 * Adapter information for graph visualization.
 *
 * Exposes the data needed to build dependency graphs without
 * requiring direct access to the container's internal state.
 */
export interface AdapterInfo {
  /** Port name (service identifier) */
  readonly portName: string;
  /** Service lifetime */
  readonly lifetime: Lifetime;
  /** Factory type (sync or async) */
  readonly factoryKind: FactoryKind;
  /** Names of ports this service depends on */
  readonly dependencyNames: readonly string[];
}

// =============================================================================
// Container Graph Data Types (for DevTools visualization)
// =============================================================================

/**
 * Extended adapter information for DevTools visualization.
 *
 * Includes origin and inheritance mode information needed to render
 * dependency graphs with proper styling for inherited vs local adapters.
 */
export interface VisualizableAdapter {
  /** Port name (service identifier) */
  readonly portName: string;
  /** Service lifetime */
  readonly lifetime: Lifetime;
  /** Factory type (sync or async) */
  readonly factoryKind: FactoryKind;
  /** Names of ports this service depends on */
  readonly dependencyNames: readonly string[];
  /**
   * Origin of this adapter in the container hierarchy.
   * - `'own'`: Adapter is defined in the current container (new local adapter)
   * - `'inherited'`: Adapter is inherited from a parent container
   * - `'overridden'`: Adapter replaces a parent adapter (child override)
   */
  readonly origin: ServiceOrigin;
  /**
   * Inheritance mode for inherited adapters.
   * Only present when `origin` is `'inherited'`.
   */
  readonly inheritanceMode?: InheritanceMode;
  /**
   * Whether this adapter overrides a parent adapter.
   */
  readonly isOverride?: boolean;
  /**
   * Optional adapter metadata (e.g., description, category, tags).
   * Populated from the adapter's port metadata if available.
   */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Graph data extracted from a container for DevTools visualization.
 */
export interface ContainerGraphData {
  /** All adapters registered in this container */
  readonly adapters: readonly VisualizableAdapter[];
  /** Human-readable container name */
  readonly containerName: string;
  /** Container type in the hierarchy */
  readonly kind: "root" | "child" | "lazy";
  /** Parent container name, null for root containers */
  readonly parentName: string | null;
}

// =============================================================================
// Inspector Event Types
// =============================================================================

/**
 * Events emitted by inspector for real-time updates.
 */
export type InspectorEvent =
  | { readonly type: "snapshot-changed" }
  | { readonly type: "scope-created"; readonly scope: ScopeEventInfo }
  | { readonly type: "scope-disposed"; readonly scopeId: string }
  | {
      readonly type: "resolution";
      readonly portName: string;
      readonly duration: number;
      readonly isCacheHit: boolean;
    }
  | { readonly type: "phase-changed"; readonly phase: ContainerPhase }
  | {
      readonly type: "init-progress";
      readonly current: number;
      readonly total: number;
      readonly portName: string;
    }
  | {
      readonly type: "child-created";
      readonly childId: string;
      readonly childKind: "child" | "lazy";
    }
  | {
      readonly type: "child-disposed";
      readonly childId: string;
    }
  | {
      readonly type: "result:ok";
      readonly portName: string;
      readonly timestamp: number;
    }
  | {
      readonly type: "result:err";
      readonly portName: string;
      readonly errorCode: string;
      readonly timestamp: number;
    }
  | {
      readonly type: "result:recovered";
      readonly portName: string;
      readonly fromCode: string;
      readonly timestamp: number;
    }
  | { readonly type: "library"; readonly event: LibraryEvent }
  | { readonly type: "library-registered"; readonly name: string }
  | { readonly type: "library-unregistered"; readonly name: string }
  | { readonly type: "chain-registered"; readonly chainId: string }
  | {
      readonly type: "execution-added";
      readonly chainId: string;
      readonly executionId: string;
    };

/**
 * Listener function for inspector events.
 */
export type InspectorListener = (event: InspectorEvent) => void;

// =============================================================================
// Result Statistics
// =============================================================================

/**
 * Statistics for Result outcomes tracked per port.
 *
 * Provides aggregated counts of ok/err outcomes and error rate
 * for monitoring and alerting on resolution reliability.
 */
export interface ResultStatistics {
  readonly portName: string;
  readonly totalCalls: number;
  readonly okCount: number;
  readonly errCount: number;
  readonly errorRate: number;
  readonly errorsByCode: ReadonlyMap<string, number>;
  readonly lastError?: {
    readonly code: string;
    readonly timestamp: number;
  };
}

// =============================================================================
// Inspector API (Unified)
// =============================================================================

/**
 * Unified container inspector interface.
 *
 * Provides both pull-based queries and push-based subscriptions for
 * container state inspection. All containers have full inspector
 * functionality via `container.inspector`.
 *
 * All returned data is frozen and immutable.
 *
 * @example Basic usage
 * ```typescript
 * const container = createContainer(graph, { name: "App" });
 *
 * // Pull-based queries
 * const snapshot = container.inspector.getSnapshot();
 * const ports = container.inspector.listPorts();
 *
 * // Push-based subscriptions
 * const unsubscribe = container.inspector.subscribe((event) => {
 *   if (event.type === "resolution") {
 *     console.log(`Resolved ${event.portName}`);
 *   }
 * });
 *
 * // Hierarchy traversal
 * const children = container.inspector.getChildContainers();
 *
 * // Graph data for visualization
 * const graphData = container.inspector.getGraphData();
 * ```
 */
export interface InspectorAPI {
  // =========================================================================
  // Pull-based queries
  // =========================================================================

  /**
   * Returns a complete snapshot of the container state.
   */
  getSnapshot(): ContainerSnapshot;

  /**
   * Returns the hierarchical scope tree.
   */
  getScopeTree(): ScopeTree;

  /**
   * Returns all registered port names in alphabetical order.
   */
  listPorts(): readonly string[];

  /**
   * Checks if a port has been resolved (has a cached instance).
   *
   * @param portName - The name of the port to check
   * @returns `true` if resolved, `false` if not, `"scope-required"` for scoped ports
   */
  isResolved(portName: string): boolean | "scope-required";

  // =========================================================================
  // Push-based subscriptions
  // =========================================================================

  /**
   * Subscribe to container state changes.
   *
   * @param listener - Called when container state changes
   * @returns Unsubscribe function
   */
  subscribe(listener: InspectorListener): () => void;

  // =========================================================================
  // Container metadata
  // =========================================================================

  /**
   * Returns the type of container being inspected.
   */
  getContainerKind(): ContainerKind;

  /**
   * Returns the current initialization phase.
   */
  getPhase(): ContainerPhase;

  /**
   * Whether the container has been disposed.
   */
  readonly isDisposed: boolean;

  // =========================================================================
  // Hierarchy traversal
  // =========================================================================

  /**
   * Gets inspectors for all child containers.
   *
   * Enables recursive traversal of the container hierarchy.
   */
  getChildContainers(): readonly InspectorAPI[];

  // =========================================================================
  // Graph data (for DevTools)
  // =========================================================================

  /**
   * Gets adapter information for graph visualization.
   */
  getAdapterInfo(): readonly AdapterInfo[];

  /**
   * Gets complete graph data for DevTools visualization.
   */
  getGraphData(): ContainerGraphData;

  // =========================================================================
  // Result Statistics
  // =========================================================================

  /**
   * Gets result statistics for a specific port.
   *
   * @param portName - The port name to get statistics for
   * @returns Statistics for the port, or undefined if no results recorded
   */
  getResultStatistics(portName: string): ResultStatistics | undefined;

  /**
   * Gets result statistics for all ports that have recorded results.
   *
   * @returns A map of port names to their result statistics
   */
  getAllResultStatistics(): ReadonlyMap<string, ResultStatistics>;

  /**
   * Gets ports whose error rate exceeds the given threshold.
   *
   * @param threshold - Error rate threshold (0.0 to 1.0)
   * @returns Array of ResultStatistics for ports above the threshold
   */
  getHighErrorRatePorts(threshold: number): readonly ResultStatistics[];

  // =========================================================================
  // Library Inspector Registry
  // =========================================================================

  /**
   * Registers a library inspector with the container.
   *
   * The inspector participates in unified snapshots and its events
   * are forwarded to container subscribers as `{ type: "library", event }`.
   *
   * If an inspector with the same name is already registered,
   * the previous one is unregistered first (last-write-wins).
   *
   * @param inspector - The library inspector to register
   * @returns Unsubscribe function that removes the inspector
   */
  registerLibrary(inspector: LibraryInspector): () => void;

  /**
   * Gets all registered library inspectors.
   *
   * @returns Map of library name to inspector
   */
  getLibraryInspectors(): ReadonlyMap<string, LibraryInspector>;

  /**
   * Gets a specific library inspector by name.
   *
   * @param name - The library name (e.g., "flow", "store")
   * @returns The inspector, or undefined if not registered
   */
  getLibraryInspector(name: string): LibraryInspector | undefined;

  /**
   * Gets a unified snapshot combining container state and all
   * registered library snapshots.
   *
   * @returns Frozen unified snapshot
   */
  getUnifiedSnapshot(): UnifiedSnapshot;

  // =========================================================================
  // Cross-Library Query API
  // =========================================================================

  /**
   * Queries all library snapshots with a custom predicate.
   *
   * Flattens each library's snapshot into `{library, key, value}` entries
   * and returns those matching the predicate. Libraries whose `getSnapshot()`
   * throws are silently skipped.
   *
   * @param predicate - Filter function applied to each entry
   * @returns Frozen array of matching entries
   */
  queryLibraries(predicate: LibraryQueryPredicate): readonly LibraryQueryResult[];

  /**
   * Queries a single library's snapshot entries.
   *
   * @param name - Library name (e.g., "flow", "store")
   * @param predicate - Optional filter; if omitted, all entries are returned
   * @returns Frozen array of matching entries, or empty if library not found
   */
  queryByLibrary(
    name: string,
    predicate?: (entry: LibraryQueryEntry) => boolean
  ): readonly LibraryQueryResult[];

  /**
   * Queries all libraries for entries whose key matches a pattern.
   *
   * @param pattern - Exact string or RegExp to match against entry keys
   * @returns Frozen array of matching entries
   */
  queryByKey(pattern: string | RegExp): readonly LibraryQueryResult[];

  // =========================================================================
  // Internal methods (for runtime and tracing)
  // =========================================================================

  /**
   * Gets the container instance this inspector wraps.
   *
   * @internal For reverse lookup by instrumentation (tracing package)
   * @returns The container instance
   */
  getContainer?(): unknown;

  /**
   * Emits an inspector event to all subscribers.
   *
   * @internal For runtime use only (event emission from LifecycleManager)
   * @param event - The event to emit
   */
  emit?(event: InspectorEvent): void;

  /**
   * Disposes all registered library inspectors.
   *
   * @internal Called by the container during disposal to clean up library resources.
   */
  disposeLibraries?(): void;
}
