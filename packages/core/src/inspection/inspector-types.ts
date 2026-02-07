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
    };

/**
 * Listener function for inspector events.
 */
export type InspectorListener = (event: InspectorEvent) => void;

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
}
