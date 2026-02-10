/**
 * Scope lifecycle event types and subscription infrastructure.
 *
 * This module provides the event mechanism that enables React components
 * to reactively respond to scope disposal, supporting use cases like:
 * - Logout/session end: dispose user scope -> unmount user UI
 * - Resource cleanup: connection closes -> show reconnect UI
 * - Multi-tenant switching: dispose workspace scope -> swap UI trees
 *
 * @packageDocumentation
 */
// @ts-nocheck

// =============================================================================
// Types
// =============================================================================

/**
 * Scope lifecycle event types.
 *
 * - `'disposing'`: Emitted synchronously at the start of dispose()
 * - `'disposed'`: Emitted after async disposal completes
 */ function stryNS_9fa48() {
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
export type ScopeLifecycleEvent = "disposing" | "disposed";

/**
 * Callback type for scope lifecycle events.
 */
export type ScopeLifecycleListener = (event: ScopeLifecycleEvent) => void;

/**
 * Subscription handle returned by subscribe().
 * Call to unsubscribe from lifecycle events.
 */
export type ScopeSubscription = () => void;

/**
 * Scope disposal state.
 *
 * - `'active'`: Scope is usable, not disposed
 * - `'disposing'`: dispose() has been called, async cleanup in progress
 * - `'disposed'`: Disposal complete, scope is unusable
 */
export type ScopeDisposalState = "active" | "disposing" | "disposed";

// =============================================================================
// Lifecycle Emitter
// =============================================================================

/**
 * Internal event emitter for scope lifecycle events.
 *
 * Used by ScopeImpl to notify subscribers when disposal begins and completes.
 * Designed for React integration via useSyncExternalStore pattern.
 *
 * @internal
 */
export class ScopeLifecycleEmitter {
  private readonly listeners: Set<ScopeLifecycleListener> = new Set();
  private state: ScopeDisposalState = stryMutAct_9fa48("2041")
    ? ""
    : (stryCov_9fa48("2041"), "active");

  /**
   * Subscribe to scope lifecycle events.
   *
   * @param listener - Callback for lifecycle events
   * @returns Unsubscribe function
   *
   * @remarks
   * - `'disposing'` is emitted synchronously before async disposal begins
   * - `'disposed'` is emitted after disposal completes
   * - Listeners are called in registration order
   * - Calling unsubscribe after dispose is a no-op
   */
  subscribe(listener: ScopeLifecycleListener): ScopeSubscription {
    if (stryMutAct_9fa48("2042")) {
      {
      }
    } else {
      stryCov_9fa48("2042");
      this.listeners.add(listener);
      return () => {
        if (stryMutAct_9fa48("2043")) {
          {
          }
        } else {
          stryCov_9fa48("2043");
          this.listeners.delete(listener);
        }
      };
    }
  }

  /**
   * Get current disposal state synchronously.
   *
   * Used as getSnapshot for useSyncExternalStore.
   */
  getState(): ScopeDisposalState {
    if (stryMutAct_9fa48("2044")) {
      {
      }
    } else {
      stryCov_9fa48("2044");
      return this.state;
    }
  }

  /**
   * Emit a lifecycle event to all subscribers.
   *
   * @param event - The lifecycle event to emit
   *
   * @remarks
   * Events are emitted synchronously for React concurrent mode compatibility.
   * Listener errors are caught and swallowed to prevent disrupting disposal.
   */
  emit(event: ScopeLifecycleEvent): void {
    if (stryMutAct_9fa48("2045")) {
      {
      }
    } else {
      stryCov_9fa48("2045");
      if (
        stryMutAct_9fa48("2048")
          ? event !== "disposing"
          : stryMutAct_9fa48("2047")
            ? false
            : stryMutAct_9fa48("2046")
              ? true
              : (stryCov_9fa48("2046", "2047", "2048"),
                event === (stryMutAct_9fa48("2049") ? "" : (stryCov_9fa48("2049"), "disposing")))
      ) {
        if (stryMutAct_9fa48("2050")) {
          {
          }
        } else {
          stryCov_9fa48("2050");
          this.state = stryMutAct_9fa48("2051") ? "" : (stryCov_9fa48("2051"), "disposing");
        }
      } else if (
        stryMutAct_9fa48("2054")
          ? event !== "disposed"
          : stryMutAct_9fa48("2053")
            ? false
            : stryMutAct_9fa48("2052")
              ? true
              : (stryCov_9fa48("2052", "2053", "2054"),
                event === (stryMutAct_9fa48("2055") ? "" : (stryCov_9fa48("2055"), "disposed")))
      ) {
        if (stryMutAct_9fa48("2056")) {
          {
          }
        } else {
          stryCov_9fa48("2056");
          this.state = stryMutAct_9fa48("2057") ? "" : (stryCov_9fa48("2057"), "disposed");
        }
      }

      // Emit synchronously - critical for React useSyncExternalStore
      for (const listener of this.listeners) {
        if (stryMutAct_9fa48("2058")) {
          {
          }
        } else {
          stryCov_9fa48("2058");
          try {
            if (stryMutAct_9fa48("2059")) {
              {
              }
            } else {
              stryCov_9fa48("2059");
              listener(event);
            }
          } catch {
            // Swallow listener errors to prevent disrupting disposal
            // In production, this would be logged to an error reporter
          }
        }
      }
    }
  }

  /**
   * Clear all listeners.
   *
   * Called after disposal to prevent memory leaks.
   */
  clear(): void {
    if (stryMutAct_9fa48("2060")) {
      {
      }
    } else {
      stryCov_9fa48("2060");
      this.listeners.clear();
    }
  }
}
