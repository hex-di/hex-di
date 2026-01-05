/**
 * FlowCollector Strategy Pattern Interface
 *
 * This module defines the FlowCollector interface for the strategy pattern,
 * allowing different collector implementations to be swapped at runtime.
 *
 * @packageDocumentation
 */

import type { FlowTransitionEventAny, FlowTransitionFilter, FlowStats } from "./types.js";

// =============================================================================
// Subscriber Types
// =============================================================================

/**
 * Callback function type for flow transition subscription.
 *
 * Called synchronously when a new transition event is collected.
 */
export type FlowSubscriber = (event: FlowTransitionEventAny) => void;

/**
 * Function to unsubscribe from transition notifications.
 *
 * Returns void and can be called multiple times safely.
 */
export type Unsubscribe = () => void;

// =============================================================================
// FlowCollector Interface
// =============================================================================

/**
 * Strategy interface for flow transition collection.
 *
 * Implementations can vary in how they store, filter, and report transitions.
 * The strategy pattern allows swapping collectors without changing the
 * machine runner logic.
 *
 * @remarks
 * - `collect()` is called synchronously for each transition
 * - `getTransitions()` supports optional filtering with AND semantics
 * - `getStats()` computes statistics lazily on demand
 * - `subscribe()` enables real-time push notifications
 * - All returned data should be treated as immutable
 *
 * @example Implementing a custom collector
 * ```typescript
 * class LoggingCollector implements FlowCollector {
 *   collect(event: FlowTransitionEventAny): void {
 *     console.log(`${event.machineId}: ${event.prevState} -> ${event.nextState}`);
 *   }
 *
 *   getTransitions(_filter?: FlowTransitionFilter): readonly FlowTransitionEventAny[] {
 *     return [];
 *   }
 *
 *   getStats(): FlowStats {
 *     return {
 *       totalTransitions: 0,
 *       averageDuration: 0,
 *       slowCount: 0,
 *       sessionStart: Date.now(),
 *       totalDuration: 0,
 *       transitionsByMachine: {},
 *     };
 *   }
 *
 *   clear(): void {}
 *
 *   subscribe(_callback: FlowSubscriber): Unsubscribe {
 *     return () => {};
 *   }
 * }
 * ```
 */
export interface FlowCollector {
  /**
   * Collects a new transition event.
   *
   * Called synchronously during state transitions.
   * Implementations should be fast to minimize overhead.
   *
   * @param event - The transition event to collect
   */
  collect(event: FlowTransitionEventAny): void;

  /**
   * Retrieves collected transitions, optionally filtered.
   *
   * Filter criteria are ANDed together (all must match).
   * Returns a readonly array that should not be mutated.
   *
   * @param filter - Optional filter criteria
   * @returns Readonly array of matching transition events
   */
  getTransitions(filter?: FlowTransitionFilter): readonly FlowTransitionEventAny[];

  /**
   * Computes and returns aggregate statistics.
   *
   * Statistics are computed lazily on each call.
   * Returns a readonly object that should not be mutated.
   *
   * @returns Computed flow statistics
   */
  getStats(): FlowStats;

  /**
   * Clears all collected transitions.
   *
   * Does not affect subscriptions or session start time.
   */
  clear(): void;

  /**
   * Subscribes to new transition events in real-time.
   *
   * The callback is invoked synchronously when each new transition is collected.
   * Returns an unsubscribe function to stop receiving notifications.
   *
   * @param callback - Function called with each new transition event
   * @returns Unsubscribe function
   */
  subscribe(callback: FlowSubscriber): Unsubscribe;

  /**
   * Manually pins a transition to protect it from FIFO eviction.
   *
   * Optional method - collectors that don't support pinning can omit this.
   *
   * @param transitionId - ID of the transition to pin
   */
  pin?(transitionId: string): void;

  /**
   * Unpins a transition, making it eligible for FIFO eviction.
   *
   * Optional method - collectors that don't support unpinning can omit this.
   *
   * @param transitionId - ID of the transition to unpin
   */
  unpin?(transitionId: string): void;
}
