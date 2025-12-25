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

// =============================================================================
// Types
// =============================================================================

/**
 * Scope lifecycle event types.
 *
 * - `'disposing'`: Emitted synchronously at the start of dispose()
 * - `'disposed'`: Emitted after async disposal completes
 */
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
  private state: ScopeDisposalState = "active";

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
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get current disposal state synchronously.
   *
   * Used as getSnapshot for useSyncExternalStore.
   */
  getState(): ScopeDisposalState {
    return this.state;
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
    if (event === "disposing") {
      this.state = "disposing";
    } else if (event === "disposed") {
      this.state = "disposed";
    }

    // Emit synchronously - critical for React useSyncExternalStore
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Swallow listener errors to prevent disrupting disposal
        // In production, this would be logged to an error reporter
      }
    }
  }

  /**
   * Clear all listeners.
   *
   * Called after disposal to prevent memory leaks.
   */
  clear(): void {
    this.listeners.clear();
  }
}
