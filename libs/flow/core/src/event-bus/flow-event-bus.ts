/**
 * FlowEventBus — Cross-machine Event Pub/Sub
 *
 * Provides a simple publish/subscribe mechanism that allows multiple
 * state machine runners to communicate by sharing a single event bus.
 * When one machine emits an event via `Effect.emit`, the bus delivers
 * it to all registered subscribers (typically other machine runners).
 *
 * @packageDocumentation
 */

// =============================================================================
// FlowEvent Type
// =============================================================================

/**
 * The minimal event shape routed through the bus.
 *
 * Every event must have at least a string `type` field.
 * Additional payload properties are preserved but not constrained.
 */
export interface FlowEvent {
  readonly type: string;
}

// =============================================================================
// FlowEventBus Interface
// =============================================================================

/**
 * A lightweight pub/sub bus for cross-machine event routing.
 *
 * Subscribers receive every event emitted through the bus.
 * Unsubscribing is done by calling the function returned from `subscribe`.
 * Calling `dispose` clears all subscribers and silences future emits.
 *
 * @example
 * ```typescript
 * const bus = createFlowEventBus();
 *
 * const unsubscribe = bus.subscribe(event => {
 *   console.log('received', event.type);
 * });
 *
 * bus.emit({ type: 'USER_LOGGED_IN' });
 * // logs: received USER_LOGGED_IN
 *
 * unsubscribe();
 * bus.dispose();
 * ```
 */
export interface FlowEventBus {
  /**
   * Publishes an event to all current subscribers.
   *
   * If the bus has been disposed, this is a no-op.
   *
   * @param event - The event to broadcast
   */
  emit(event: FlowEvent): void;

  /**
   * Registers a callback that will be invoked for every emitted event.
   *
   * @param callback - Function to call with each event
   * @returns An unsubscribe function that removes this callback
   */
  subscribe(callback: (event: FlowEvent) => void): () => void;

  /**
   * Disposes the bus, clearing all subscribers and preventing future emits.
   */
  dispose(): void;
}

// =============================================================================
// FlowEventBus Factory
// =============================================================================

/**
 * Creates a new FlowEventBus instance.
 *
 * The returned bus uses a `Set` internally to track subscribers, which
 * guarantees O(1) add/remove and prevents duplicate registrations of the
 * same function reference.
 *
 * @returns A fresh FlowEventBus
 *
 * @example
 * ```typescript
 * const bus = createFlowEventBus();
 *
 * // Machine A subscribes
 * bus.subscribe(event => machineA.send(event));
 *
 * // Machine B emits via the bus
 * bus.emit({ type: 'SYNC_COMPLETE' });
 * // Machine A receives SYNC_COMPLETE
 * ```
 */
export function createFlowEventBus(): FlowEventBus {
  const subscribers = new Set<(event: FlowEvent) => void>();
  let disposed = false;

  return {
    emit(event) {
      if (disposed) return;
      // Snapshot the set to avoid issues if a callback modifies subscribers
      for (const cb of Array.from(subscribers)) {
        cb(event);
      }
    },

    subscribe(callback) {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },

    dispose() {
      disposed = true;
      subscribers.clear();
    },
  };
}
