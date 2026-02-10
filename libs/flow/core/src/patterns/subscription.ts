/**
 * Subscription Activity Pattern
 *
 * Wraps an external event source subscription in an Activity. The activity
 * resolves a subscribe function, routes emitted events to the machine via
 * EventSink, and automatically cleans up when cancelled via AbortSignal.
 *
 * @packageDocumentation
 */

import type { EventSink, Activity } from "../activities/types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * A function that subscribes to an event source and returns an unsubscribe function.
 *
 * @typeParam TEvent - The event type emitted by the source
 */
export type SubscribeFn<TEvent extends { readonly type: string }> = (
  callback: (event: TEvent) => void
) => () => void;

/**
 * Configuration for creating a subscription activity.
 */
export interface SubscriptionActivityConfig<TEvent extends { readonly type: string }> {
  /**
   * The subscribe function that connects to the event source.
   * It receives a callback and returns an unsubscribe function.
   */
  readonly subscribe: SubscribeFn<TEvent>;
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Creates an Activity that subscribes to an external event source and
 * routes events to the machine via EventSink.
 *
 * The subscription is automatically cleaned up when the AbortSignal is
 * triggered (parent state exit).
 *
 * @param config - The subscription configuration
 * @returns An Activity that wraps the subscription
 *
 * @example
 * ```typescript
 * const wsActivity = createSubscriptionActivity({
 *   subscribe: (callback) => {
 *     const ws = new WebSocket('ws://example.com');
 *     ws.onmessage = (msg) => callback({ type: 'MESSAGE', payload: msg.data });
 *     return () => ws.close();
 *   },
 * });
 * ```
 */
export function createSubscriptionActivity<TEvent extends { readonly type: string }>(
  config: SubscriptionActivityConfig<TEvent>
): Activity<void, void> {
  return {
    async execute(_input: void, sink: EventSink, signal: AbortSignal): Promise<void> {
      if (signal.aborted) {
        return;
      }

      // Subscribe and route events
      const unsubscribe = config.subscribe(event => {
        if (!signal.aborted) {
          sink.emit(event);
        }
      });

      // Wait for abort signal
      await new Promise<void>(resolve => {
        const onAbort = () => {
          signal.removeEventListener("abort", onAbort);
          resolve();
        };
        signal.addEventListener("abort", onAbort);
        if (signal.aborted) {
          signal.removeEventListener("abort", onAbort);
          resolve();
        }
      });

      // Cleanup subscription
      unsubscribe();
    },
  };
}
