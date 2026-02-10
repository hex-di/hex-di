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
// @ts-nocheck
function stryNS_9fa48() {
  var g =
    (typeof globalThis === "object" && globalThis && globalThis.Math === Math && globalThis) ||
    new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (
    ns.activeMutant === undefined &&
    g.process &&
    g.process.env &&
    g.process.env.__STRYKER_ACTIVE_MUTANT__
  ) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov =
    ns.mutantCoverage ||
    (ns.mutantCoverage = {
      static: {},
      perTest: {},
    });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error("Stryker: Hit count limit reached (" + ns.hitCount + ")");
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
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
  private disposed: boolean = stryMutAct_9fa48("691") ? true : (stryCov_9fa48("691"), false);

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Whether the container has been disposed.
   */
  get isDisposed(): boolean {
    if (stryMutAct_9fa48("692")) {
      {
      }
    } else {
      stryCov_9fa48("692");
      return this.disposed;
    }
  }

  /**
   * Marks the container as disposed without running disposal logic.
   * Used when disposal needs to be triggered but the flag checked elsewhere.
   */
  markDisposed(): void {
    if (stryMutAct_9fa48("693")) {
      {
      }
    } else {
      stryCov_9fa48("693");
      this.disposed = stryMutAct_9fa48("694") ? false : (stryCov_9fa48("694"), true);
    }
  }

  /**
   * Registers a child scope for lifecycle tracking.
   *
   * @param scope - The child scope to track
   */
  registerChildScope(scope: Disposable): void {
    if (stryMutAct_9fa48("695")) {
      {
      }
    } else {
      stryCov_9fa48("695");
      this.childScopes.add(scope);
    }
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
    if (stryMutAct_9fa48("696")) {
      {
      }
    } else {
      stryCov_9fa48("696");
      const id = stryMutAct_9fa48("697")
        ? this.childIdCounter--
        : (stryCov_9fa48("697"), this.childIdCounter++);
      child[CHILD_ID] = id;
      this.childContainers.set(id, child);

      // Store child inspector if provided
      if (
        stryMutAct_9fa48("700")
          ? inspector === undefined
          : stryMutAct_9fa48("699")
            ? false
            : stryMutAct_9fa48("698")
              ? true
              : (stryCov_9fa48("698", "699", "700"), inspector !== undefined)
      ) {
        if (stryMutAct_9fa48("701")) {
          {
          }
        } else {
          stryCov_9fa48("701");
          childInspectorMap.set(id, inspector);
        }
      }
      return id;
    }
  }

  /**
   * Unregisters a child container from lifecycle tracking.
   * O(1) operation via Map.delete() using Symbol-stored ID.
   *
   * @param child - The child container to remove
   */
  unregisterChildContainer(child: Disposable): void {
    if (stryMutAct_9fa48("702")) {
      {
      }
    } else {
      stryCov_9fa48("702");
      const id = child[CHILD_ID];
      if (
        stryMutAct_9fa48("705")
          ? id === undefined
          : stryMutAct_9fa48("704")
            ? false
            : stryMutAct_9fa48("703")
              ? true
              : (stryCov_9fa48("703", "704", "705"), id !== undefined)
      ) {
        if (stryMutAct_9fa48("706")) {
          {
          }
        } else {
          stryCov_9fa48("706");
          this.childContainers.delete(id);
          childInspectorMap.delete(id);
        }
      }
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
    if (stryMutAct_9fa48("707")) {
      {
      }
    } else {
      stryCov_9fa48("707");
      this.childScopes.delete(scope);
    }
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
    if (stryMutAct_9fa48("708")) {
      {
      }
    } else {
      stryCov_9fa48("708");
      if (
        stryMutAct_9fa48("710")
          ? false
          : stryMutAct_9fa48("709")
            ? true
            : (stryCov_9fa48("709", "710"), this.disposed)
      ) {
        if (stryMutAct_9fa48("711")) {
          {
          }
        } else {
          stryCov_9fa48("711");
          return;
        }
      }
      this.disposed = stryMutAct_9fa48("712") ? false : (stryCov_9fa48("712"), true);

      // Dispose child containers in LIFO order (convert Map to Array and reverse)
      const children = Array.from(this.childContainers.values());
      for (
        let i = stryMutAct_9fa48("713")
          ? children.length + 1
          : (stryCov_9fa48("713"), children.length - 1);
        stryMutAct_9fa48("716")
          ? i < 0
          : stryMutAct_9fa48("715")
            ? i > 0
            : stryMutAct_9fa48("714")
              ? false
              : (stryCov_9fa48("714", "715", "716"), i >= 0);
        stryMutAct_9fa48("717") ? i++ : (stryCov_9fa48("717"), i--)
      ) {
        if (stryMutAct_9fa48("718")) {
          {
          }
        } else {
          stryCov_9fa48("718");
          const child = children[i];
          if (
            stryMutAct_9fa48("720")
              ? false
              : stryMutAct_9fa48("719")
                ? true
                : (stryCov_9fa48("719", "720"), child)
          ) {
            if (stryMutAct_9fa48("721")) {
              {
              }
            } else {
              stryCov_9fa48("721");
              await child.dispose();
            }
          }
        }
      }
      this.childContainers.clear();

      // Dispose child scopes
      for (const scope of this.childScopes) {
        if (stryMutAct_9fa48("722")) {
          {
          }
        } else {
          stryCov_9fa48("722");
          await scope.dispose();
        }
      }
      this.childScopes.clear();

      // Dispose singleton memo
      await singletonMemo.dispose();

      // Unregister from parent if provided
      if (
        stryMutAct_9fa48("725")
          ? parentUnregister === undefined
          : stryMutAct_9fa48("724")
            ? false
            : stryMutAct_9fa48("723")
              ? true
              : (stryCov_9fa48("723", "724", "725"), parentUnregister !== undefined)
      ) {
        if (stryMutAct_9fa48("726")) {
          {
          }
        } else {
          stryCov_9fa48("726");
          parentUnregister();
        }
      }
    }
  }

  /**
   * Returns snapshots of child scopes for inspection.
   *
   * @param getSnapshot - Function to get snapshot from a scope (may throw for disposed)
   * @returns Array of snapshots, excluding any that threw
   */
  getChildScopeSnapshots<T>(getSnapshot: (scope: Disposable) => T): T[] {
    if (stryMutAct_9fa48("727")) {
      {
      }
    } else {
      stryCov_9fa48("727");
      const snapshots: T[] = stryMutAct_9fa48("728")
        ? ["Stryker was here"]
        : (stryCov_9fa48("728"), []);
      for (const scope of this.childScopes) {
        if (stryMutAct_9fa48("729")) {
          {
          }
        } else {
          stryCov_9fa48("729");
          try {
            if (stryMutAct_9fa48("730")) {
              {
              }
            } else {
              stryCov_9fa48("730");
              snapshots.push(getSnapshot(scope));
            }
          } catch {
            // Skip disposed scopes
          }
        }
      }
      return snapshots;
    }
  }

  /**
   * Returns snapshots of child containers for inspection.
   *
   * @param getSnapshot - Function to get snapshot from a container (may throw for disposed)
   * @returns Array of snapshots, excluding any that threw
   */
  getChildContainerSnapshots<T>(getSnapshot: (container: Disposable) => T): T[] {
    if (stryMutAct_9fa48("731")) {
      {
      }
    } else {
      stryCov_9fa48("731");
      const snapshots: T[] = stryMutAct_9fa48("732")
        ? ["Stryker was here"]
        : (stryCov_9fa48("732"), []);
      for (const container of this.childContainers.values()) {
        if (stryMutAct_9fa48("733")) {
          {
          }
        } else {
          stryCov_9fa48("733");
          try {
            if (stryMutAct_9fa48("734")) {
              {
              }
            } else {
              stryCov_9fa48("734");
              snapshots.push(getSnapshot(container));
            }
          } catch {
            // Skip disposed containers
          }
        }
      }
      return snapshots;
    }
  }
}
