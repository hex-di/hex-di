/**
 * Type definitions for @hex-di/inspector.
 *
 * Clean API: Only exports types needed for InspectorAPI.
 * - For display types (ScopeInfo), import from @hex-di/devtools-core
 * - For plugin hooks (ScopeEventInfo), import from @hex-di/runtime
 *
 * @packageDocumentation
 */

import type {
  ContainerKind,
  ContainerPhase,
  ContainerSnapshot,
  ScopeTree,
} from "@hex-di/devtools-core";
import type { ScopeEventInfo } from "@hex-di/runtime";

// Re-export types used in InspectorAPI
export type { ContainerKind, ContainerPhase, ContainerSnapshot, ScopeTree };

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
 * Type for inspector with subscription support.
 * Returned by InspectorPlugin.
 */
export type InspectorWithSubscription = InspectorAPI & {
  subscribe(listener: InspectorListener): () => void;
};

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
