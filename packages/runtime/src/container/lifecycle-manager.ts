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

import type { MemoMap } from "../common/memo-map.js";

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
   * Tracks all child containers in registration order for LIFO disposal.
   */
  private readonly childContainers: Disposable[] = [];

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
   *
   * @param child - The child container to track
   */
  registerChildContainer(child: Disposable): void {
    this.childContainers.push(child);
  }

  /**
   * Unregisters a child container from lifecycle tracking.
   *
   * @param child - The child container to remove
   */
  unregisterChildContainer(child: Disposable): void {
    const idx = this.childContainers.indexOf(child);
    if (idx !== -1) {
      this.childContainers.splice(idx, 1);
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

    // Dispose child containers in LIFO order
    for (let i = this.childContainers.length - 1; i >= 0; i--) {
      const child = this.childContainers[i];
      if (child) {
        await child.dispose();
      }
    }
    this.childContainers.length = 0;

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
    for (const container of this.childContainers) {
      try {
        snapshots.push(getSnapshot(container));
      } catch {
        // Skip disposed containers
      }
    }
    return snapshots;
  }
}
