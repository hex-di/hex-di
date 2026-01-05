/**
 * Type definitions for inspector plugin.
 *
 * Clean API: Only exports types needed for InspectorAPI.
 * - For display types (ScopeInfo), import from @hex-di/plugin
 * - For plugin hooks (ScopeEventInfo), import from internal plugin module
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
} from "@hex-di/plugin";
import type { ScopeEventInfo } from "../../plugin/types.js";

// Re-export types used in InspectorAPI
export type { ContainerKind, ContainerPhase, ContainerSnapshot, ScopeTree };

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
  readonly lifetime: "singleton" | "scoped" | "transient";
  /** Factory type (sync or async) */
  readonly factoryKind: "sync" | "async";
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
 *
 * @example
 * ```typescript
 * const adapter: VisualizableAdapter = {
 *   portName: "Logger",
 *   lifetime: "singleton",
 *   factoryKind: "sync",
 *   dependencyNames: [],
 *   origin: "own",
 * };
 * ```
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
   * - `'shared'`: Child shares parent's singleton instance
   * - `'forked'`: Child gets a snapshot copy of parent's instance
   * - `'isolated'`: Child creates its own fresh instance
   */
  readonly inheritanceMode?: InheritanceMode;
  /**
   * Whether this adapter overrides a parent adapter.
   *
   * This flag enables DevTools to distinguish between:
   * - `true`: This adapter replaces a parent adapter for the same port
   * - `false`/`undefined`: This is either a new port or inherited from parent
   *
   * When `isOverride` is `true`, `origin` will be `'overridden'`.
   */
  readonly isOverride?: boolean;
}

/**
 * Graph data extracted from a container for DevTools visualization.
 *
 * Provides all information needed to render a dependency graph
 * without requiring direct access to the container's internal state.
 *
 * @example
 * ```typescript
 * const graphData: ContainerGraphData = {
 *   adapters: [
 *     { portName: "Logger", lifetime: "singleton", factoryKind: "sync", dependencyNames: [], origin: "own" },
 *     { portName: "Database", lifetime: "singleton", factoryKind: "async", dependencyNames: ["Logger"], origin: "own" },
 *   ],
 *   containerName: "AppContainer",
 *   kind: "root",
 *   parentName: null,
 * };
 * ```
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
 * Events emitted by InspectorPlugin for real-time updates.
 *
 * Uses discriminated unions for type-safe event handling in subscribers.
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
 * Listener function for InspectorPlugin events.
 */
export type InspectorListener = (event: InspectorEvent) => void;

// =============================================================================
// Inspector API
// =============================================================================

/**
 * Unified container inspector interface.
 *
 * Pull-based by default. When created via InspectorPlugin,
 * includes subscribe() for push-based events.
 *
 * All returned data is frozen and immutable.
 *
 * @example Pull-based usage
 * ```typescript
 * const inspector = createInspector(container);
 *
 * const snapshot = inspector.getSnapshot();
 * console.log(`Container kind: ${snapshot.kind}`);
 * ```
 *
 * @example Push-based with InspectorPlugin
 * ```typescript
 * const inspector = container[INSPECTOR];
 *
 * if (hasSubscription(inspector)) {
 *   const unsubscribe = inspector.subscribe((event) => {
 *     if (event.type === "resolution") {
 *       console.log(`Resolved ${event.portName}`);
 *     }
 *   });
 * }
 * ```
 */
export interface InspectorAPI {
  // =========================================================================
  // Pull-based queries
  // =========================================================================

  /**
   * Returns a complete snapshot of the container state.
   *
   * The snapshot is a discriminated union based on container kind.
   * Use `snapshot.kind` for type-safe narrowing.
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
  // Push-based subscriptions (optional)
  // =========================================================================

  /**
   * Subscribe to container state changes.
   *
   * Only available when using InspectorPlugin. Use `hasSubscription()`
   * type guard to check availability before calling.
   *
   * Events are emitted on:
   * - Service resolution (with timing)
   * - Scope creation/disposal
   * - Phase changes
   * - Initialization progress
   *
   * @param listener - Called when container state changes
   * @returns Unsubscribe function
   */
  subscribe?(listener: InspectorListener): () => void;

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
}

/**
 * Type for inspector with subscription and child discovery support.
 * Returned by InspectorPlugin.
 *
 * Extends InspectorAPI with:
 * - `subscribe()` for push-based event notifications
 * - `getChildContainers()` for traversing the container hierarchy
 */
export interface InspectorWithSubscription extends InspectorAPI {
  /**
   * Subscribe to container state changes.
   * @param listener - Called when container state changes
   * @returns Unsubscribe function
   */
  subscribe(listener: InspectorListener): () => void;

  /**
   * Gets InspectorAPIs for all child containers of this container.
   *
   * Enables recursive traversal of the container hierarchy without
   * manual registration. DevTools uses this to discover all containers
   * automatically starting from the root.
   *
   * @returns Array of InspectorWithSubscription for each child container
   *
   * @example
   * ```typescript
   * const rootInspector = container[INSPECTOR];
   *
   * // Recursively traverse all containers
   * function walkContainers(inspector: InspectorWithSubscription) {
   *   console.log(inspector.getSnapshot().containerId);
   *   for (const child of inspector.getChildContainers()) {
   *     walkContainers(child);
   *   }
   * }
   *
   * walkContainers(rootInspector);
   * ```
   */
  getChildContainers(): readonly InspectorWithSubscription[];

  /**
   * Gets adapter information for graph visualization.
   *
   * Returns port names, lifetimes, factory kinds, and dependencies
   * for all adapters registered in this container. Used by DevTools
   * to build dependency graphs without direct container access.
   *
   * @returns Array of AdapterInfo for each registered adapter
   *
   * @example
   * ```typescript
   * const inspector = container[INSPECTOR];
   * const adapters = inspector.getAdapterInfo();
   *
   * // Build dependency graph
   * for (const adapter of adapters) {
   *   console.log(`${adapter.portName}: ${adapter.lifetime}`);
   *   for (const dep of adapter.dependencyNames) {
   *     console.log(`  -> ${dep}`);
   *   }
   * }
   * ```
   */
  getAdapterInfo(): readonly AdapterInfo[];

  /**
   * Gets complete graph data for DevTools visualization.
   *
   * Returns all information needed to render a dependency graph,
   * including container metadata, adapter origins, and inheritance modes.
   * This is the primary method used by DevTools to extract visualization data.
   *
   * @returns ContainerGraphData with adapters, container name, kind, and parent info
   *
   * @example
   * ```typescript
   * const inspector = container[INSPECTOR];
   * const graphData = inspector.getGraphData();
   *
   * console.log(`Container: ${graphData.containerName} (${graphData.kind})`);
   * for (const adapter of graphData.adapters) {
   *   const badge = adapter.origin === "inherited" ? `[${adapter.inheritanceMode}]` : "";
   *   console.log(`  ${adapter.portName} ${badge}`);
   * }
   * ```
   */
  getGraphData(): ContainerGraphData;
}

/**
 * Type guard to check if an inspector has subscription support.
 *
 * Inspectors created via `createInspector()` are pull-only.
 * Inspectors from InspectorPlugin have subscription support.
 *
 * @example
 * ```typescript
 * const inspector = getInspector(); // may or may not have subscribe
 *
 * if (hasSubscription(inspector)) {
 *   // TypeScript knows subscribe() is available
 *   const unsubscribe = inspector.subscribe(listener);
 * } else {
 *   // Fall back to polling
 *   setInterval(() => refresh(inspector.getSnapshot()), 1000);
 * }
 * ```
 */
export function hasSubscription(inspector: InspectorAPI): inspector is InspectorWithSubscription {
  return inspector.subscribe !== undefined;
}
