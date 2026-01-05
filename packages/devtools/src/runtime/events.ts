/**
 * Event Emission System for DevTools Runtime
 *
 * Provides an internal event bus for runtime events.
 * Events are emitted after state changes to notify plugins and external subscribers.
 *
 * @packageDocumentation
 */

import type { DevToolsEvent, EventListener } from "./types.js";

/**
 * Internal event emitter for DevTools runtime events.
 *
 * This is a simple pub/sub system optimized for synchronous event emission.
 * Events are emitted after state mutations complete.
 */
export interface EventEmitter {
  /**
   * Subscribe to all events.
   *
   * @param listener - Callback invoked with each event
   * @returns Unsubscribe function
   */
  subscribe(listener: EventListener): () => void;

  /**
   * Emit an event to all subscribers.
   *
   * @param event - The event to emit
   */
  emit(event: DevToolsEvent): void;
}

/**
 * Creates a new event emitter instance.
 *
 * The emitter maintains a set of listeners and notifies them synchronously
 * when events are emitted. It handles unsubscription during emission safely.
 *
 * @returns A new EventEmitter instance
 *
 * @example
 * ```typescript
 * const emitter = createEventEmitter();
 *
 * const unsubscribe = emitter.subscribe((event) => {
 *   console.log("Event received:", event);
 * });
 *
 * emitter.emit({ type: "tabChanged", tabId: "services" });
 *
 * unsubscribe();
 * ```
 */
export function createEventEmitter(): EventEmitter {
  // Use a Set for O(1) add/delete operations
  const listeners = new Set<EventListener>();

  function subscribe(listener: EventListener): () => void {
    listeners.add(listener);

    return function unsubscribe(): void {
      listeners.delete(listener);
    };
  }

  function emit(event: DevToolsEvent): void {
    // Create a snapshot of listeners to handle unsubscription during iteration
    const currentListeners = [...listeners];

    for (const listener of currentListeners) {
      // Only call if still subscribed (handles unsubscribe during emit)
      if (listeners.has(listener)) {
        listener(event);
      }
    }
  }

  return {
    subscribe,
    emit,
  };
}
