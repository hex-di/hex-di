/**
 * NoOpFlowCollector - Zero overhead collector for disabled tracing.
 *
 * This collector implements the FlowCollector interface with no-op methods.
 * It is designed for production environments where tracing overhead must be zero.
 *
 * @packageDocumentation
 */

import type { FlowCollector, FlowSubscriber, Unsubscribe } from "./collector.js";
import type { FlowTransitionEventAny, FlowTransitionFilter, FlowStats } from "./types.js";

// =============================================================================
// Singleton Constants
// =============================================================================

/**
 * Singleton empty array to avoid allocations.
 * Frozen to prevent accidental mutation.
 */
const EMPTY_TRANSITIONS: readonly FlowTransitionEventAny[] = Object.freeze([]);

/**
 * Singleton empty stats object to avoid allocations.
 * The sessionStart is set to 0 as there is no real session.
 */
const EMPTY_STATS: FlowStats = Object.freeze({
  totalTransitions: 0,
  averageDuration: 0,
  slowCount: 0,
  sessionStart: 0,
  totalDuration: 0,
  transitionsByMachine: Object.freeze({}),
});

/**
 * Singleton no-op unsubscribe function.
 */
const NOOP_UNSUBSCRIBE: Unsubscribe = () => {};

// =============================================================================
// NoOpFlowCollector Implementation
// =============================================================================

/**
 * Zero-overhead flow collector that discards all transitions.
 *
 * Use this collector when tracing is disabled to ensure:
 * - No memory allocation for transition storage
 * - No computation overhead for statistics
 * - No callback invocations for subscriptions
 *
 * @remarks
 * - All methods are constant-time O(1) no-ops
 * - Returns singleton frozen objects to avoid allocations
 * - Safe to use in production without performance impact
 *
 * @example Using NoOpFlowCollector for disabled tracing
 * ```typescript
 * const collector = process.env.NODE_ENV === 'production'
 *   ? new NoOpFlowCollector()
 *   : new FlowMemoryCollector();
 *
 * const runner = createMachineRunner(machine, {
 *   executor,
 *   activityManager,
 *   collector,
 * });
 * ```
 */
export class NoOpFlowCollector implements FlowCollector {
  /**
   * No-op collect - discards the transition event.
   *
   * @param _event - Transition event (ignored)
   */
  collect(_event: FlowTransitionEventAny): void {
    // Intentionally empty - zero overhead
  }

  /**
   * Returns empty array without allocation.
   *
   * @param _filter - Filter criteria (ignored)
   * @returns Singleton frozen empty array
   */
  getTransitions(_filter?: FlowTransitionFilter): readonly FlowTransitionEventAny[] {
    return EMPTY_TRANSITIONS;
  }

  /**
   * Returns zero-value stats without computation.
   *
   * @returns Singleton frozen empty stats object
   */
  getStats(): FlowStats {
    return EMPTY_STATS;
  }

  /**
   * No-op clear - nothing to clear.
   */
  clear(): void {
    // Intentionally empty - nothing to clear
  }

  /**
   * Returns no-op unsubscribe function.
   *
   * Callbacks are never invoked since transitions are never stored.
   *
   * @param _callback - Subscriber callback (ignored)
   * @returns Singleton no-op unsubscribe function
   */
  subscribe(_callback: FlowSubscriber): Unsubscribe {
    return NOOP_UNSUBSCRIBE;
  }
}

/**
 * Singleton instance of NoOpFlowCollector.
 *
 * Use this instead of creating new instances to avoid allocations.
 */
export const noopFlowCollector: FlowCollector = new NoOpFlowCollector();
