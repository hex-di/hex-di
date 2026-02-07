/**
 * LifecycleManager - Manages container/scope child registration and disposal.
 *
 * Encapsulates lifecycle management for containers:
 * - Child scope registration
 * - Child container registration
 * - LIFO disposal ordering
 *
 * @packageDocumentation
 * @internal
 */

import type { MemoMap } from "../../util/memo-map.js";
import type { InspectorAPI } from "../../inspection/types.js";

// =============================================================================
// Internal Symbols
// =============================================================================

/**
 * Symbol for internal ID storage on child containers.
 * Enables O(1) unregistration via Map.delete().
 * @internal
 */
const CHILD_ID = Symbol("childContainerId");

/**
 * Map storing child inspector references by childId.
 * Used by tracing package to instrument dynamically created children.
 * Note: Using Map instead of WeakMap because childId is a number, not object.
 * @internal
 */
export const childInspectorMap = new Map<number, InspectorAPI>();

// =============================================================================
// Types
// =============================================================================

/**
 * Interface for disposable children (scopes or containers).
 * @internal
 */
export interface Disposable {
  dispose(): Promise<void>;
  readonly isDisposed: boolean;
  /**
   * Internal ID for O(1) child container unregistration.
   * Set by LifecycleManager.registerChildContainer().
   * @internal
   */
  [CHILD_ID]?: number;
}

/**
 * Callback to unregister from parent container on disposal.
 * @internal
 */
export type ParentUnregisterFn = () => void;

// =============================================================================
// LifecycleManager Class
// =============================================================================

/**
 * Manages child registration and LIFO disposal for containers.
 *
 * This class encapsulates lifecycle state:
 * - Tracks child scopes and child containers
 * - Maintains disposal flag
 * - Orchestrates LIFO disposal order
 *
 * @example
 * ```typescript
 * const lifecycle = new LifecycleManager();
 *
 * // Register children
 * lifecycle.registerChildScope(scope);
 * lifecycle.registerChildContainer(childContainer);
 *
 * // Dispose in correct order
 * await lifecycle.dispose(singletonMemo, () => {
 *   parentContainer.unregisterChildContainer(this);
 * });
 * ```
 *
 * @internal
 */
export class LifecycleManager {
  /**
   * Tracks all child scopes created from this container.
   */
  private readonly childScopes: Set<Disposable> = new Set();

  /**
   * Tracks all child containers via numeric ID for O(1) unregistration.
   * Map preserves insertion order for LIFO disposal.
   */
  private readonly childContainers: Map<number, Disposable> = new Map();

  /**
   * Counter for assigning unique IDs to child containers.
   */
  private childIdCounter: number = 0;

  /**
   * Whether this container has been disposed.
   */
  private disposed: boolean = false;

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Whether the container has been disposed.
   */
  get isDisposed(): boolean {
    return this.disposed;
  }

  /**
   * Marks the container as disposed without running disposal logic.
   * Used when disposal needs to be triggered but the flag checked elsewhere.
   */
  markDisposed(): void {
    this.disposed = true;
  }

  /**
   * Registers a child scope for lifecycle tracking.
   *
   * @param scope - The child scope to track
   */
  registerChildScope(scope: Disposable): void {
    this.childScopes.add(scope);
  }

  /**
   * Registers a child container for lifecycle tracking.
   * Assigns unique ID stored as Symbol property for O(1) unregistration.
   *
   * @param child - The child container to track
   * @param inspector - Optional inspector to store in childInspectorMap
   * @returns The assigned child ID
   */
  registerChildContainer(child: Disposable, inspector?: InspectorAPI): number {
    const id = this.childIdCounter++;
    child[CHILD_ID] = id;
    this.childContainers.set(id, child);

    // Store child inspector if provided
    if (inspector !== undefined) {
      childInspectorMap.set(id, inspector);
    }

    return id;
  }

  /**
   * Unregisters a child container from lifecycle tracking.
   * O(1) operation via Map.delete() using Symbol-stored ID.
   *
   * @param child - The child container to remove
   */
  unregisterChildContainer(child: Disposable): void {
    const id = child[CHILD_ID];
    if (id !== undefined) {
      this.childContainers.delete(id);
      childInspectorMap.delete(id);
    }
  }

  /**
   * Unregisters a child scope from lifecycle tracking.
   *
   * Called when a root scope is disposed to remove it from the container's
   * tracking Set. This prevents disposed scopes from accumulating.
   *
   * @param scope - The child scope to remove
   */
  unregisterChildScope(scope: Disposable): void {
    this.childScopes.delete(scope);
  }

  /**
   * Disposes all managed resources in correct order.
   *
   * Disposal order (LIFO):
   * 1. Child containers (last registered first)
   * 2. Child scopes
   * 3. Singleton memo
   * 4. Parent unregistration (for child containers)
   *
   * @param singletonMemo - The container's singleton cache to dispose
   * @param parentUnregister - Optional callback to unregister from parent
   * @returns Promise that resolves when disposal is complete
   */
  async dispose(singletonMemo: MemoMap, parentUnregister?: ParentUnregisterFn): Promise<void> {
    if (this.disposed) {
      return;
    }
    this.disposed = true;

    // Dispose child containers in LIFO order (convert Map to Array and reverse)
    const children = Array.from(this.childContainers.values());
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (child) {
        await child.dispose();
      }
    }
    this.childContainers.clear();

    // Dispose child scopes
    for (const scope of this.childScopes) {
      await scope.dispose();
    }
    this.childScopes.clear();

    // Dispose singleton memo
    await singletonMemo.dispose();

    // Unregister from parent if provided
    if (parentUnregister !== undefined) {
      parentUnregister();
    }
  }

  /**
   * Returns snapshots of child scopes for inspection.
   *
   * @param getSnapshot - Function to get snapshot from a scope (may throw for disposed)
   * @returns Array of snapshots, excluding any that threw
   */
  getChildScopeSnapshots<T>(getSnapshot: (scope: Disposable) => T): T[] {
    const snapshots: T[] = [];
    for (const scope of this.childScopes) {
      try {
        snapshots.push(getSnapshot(scope));
      } catch {
        // Skip disposed scopes
      }
    }
    return snapshots;
  }

  /**
   * Returns snapshots of child containers for inspection.
   *
   * @param getSnapshot - Function to get snapshot from a container (may throw for disposed)
   * @returns Array of snapshots, excluding any that threw
   */
  getChildContainerSnapshots<T>(getSnapshot: (container: Disposable) => T): T[] {
    const snapshots: T[] = [];
    for (const container of this.childContainers.values()) {
      try {
        snapshots.push(getSnapshot(container));
      } catch {
        // Skip disposed containers
      }
    }
    return snapshots;
  }
}
