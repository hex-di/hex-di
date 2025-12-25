/**
 * Type definitions for @hex-di/inspector.
 *
 * @packageDocumentation
 */

import type {
  ContainerKind,
  ContainerPhase,
  ContainerSnapshot,
  ScopeTree,
  ScopeInfo,
} from "@hex-di/devtools-core";

// Re-export for convenience
export type { ContainerKind, ContainerPhase, ContainerSnapshot, ScopeTree, ScopeInfo };

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
  | { readonly type: "scope-created"; readonly scope: ScopeInfo }
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
 * API exposed by InspectorPlugin on containers.
 *
 * Provides hybrid push/pull design:
 * - Pull-based: `getSnapshot()`, `getScopeTree()`, etc. for on-demand queries
 * - Push-based: `subscribe()` for real-time UI updates
 *
 * All returned data is frozen and immutable.
 *
 * @example
 * ```typescript
 * const inspector = container[INSPECTOR];
 *
 * // Pull-based: get current state
 * const snapshot = inspector.getSnapshot();
 * console.log(`Container kind: ${snapshot.kind}`);
 *
 * // Push-based: subscribe to changes
 * const unsubscribe = inspector.subscribe((event) => {
 *   if (event.type === "resolution") {
 *     console.log(`Resolved ${event.portName} in ${event.duration}ms`);
 *   }
 * });
 *
 * // Cleanup
 * unsubscribe();
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
  // Push-based subscriptions
  // =========================================================================

  /**
   * Subscribe to container state changes.
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
}
