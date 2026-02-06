/**
 * FlowMemoryCollector - In-memory transition storage with hybrid eviction policy.
 *
 * This collector stores transitions in memory and provides filtering, statistics,
 * subscription capabilities, and a configurable eviction policy.
 *
 * @packageDocumentation
 */

import type { FlowCollector, FlowSubscriber, Unsubscribe } from "./collector.js";
import type {
  FlowTransitionEventAny,
  FlowTransitionFilter,
  FlowStats,
  FlowRetentionPolicy,
} from "./types.js";
import { DEFAULT_FLOW_RETENTION_POLICY } from "./types.js";

// =============================================================================
// Internal Types
// =============================================================================

/**
 * Internal wrapper for transition events with collection timestamp.
 *
 * Used to track when each transition was collected for time-based expiry.
 */
interface StoredTransition {
  /** The transition event (may be mutated for isPinned) */
  event: FlowTransitionEventAny;
  /** Timestamp when the transition was collected (Date.now()) */
  collectedAt: number;
}

// =============================================================================
// FlowMemoryCollector Implementation
// =============================================================================

/**
 * In-memory flow collector with hybrid eviction policy.
 *
 * Stores transitions in an internal array and provides:
 * - Filter support for getTransitions() queries
 * - Lazy statistics computation
 * - Real-time subscription notifications
 * - FIFO eviction at maxTransitions limit (protects pinned)
 * - Slow transition auto-pinning (transitions >= slowThresholdMs)
 * - Pinned transition limit (maxPinnedTransitions)
 * - Time-based expiry for non-pinned transitions
 * - Manual pin/unpin API
 *
 * @remarks
 * - Transitions are stored in insertion order
 * - Filter criteria use AND semantics (all must match)
 * - Statistics are computed on demand, not cached
 * - Auto-pinning occurs during collect() for slow transitions
 * - FIFO eviction removes oldest non-pinned transitions first
 * - Pinned transitions have their own limit (oldest pinned dropped)
 * - Time expiry only affects non-pinned transitions
 *
 * @example Basic usage
 * ```typescript
 * const collector = new FlowMemoryCollector({
 *   maxTransitions: 1000,
 *   maxPinnedTransitions: 100,
 *   slowThresholdMs: 100,
 *   expiryMs: 300000,
 * });
 *
 * // Collector receives transitions from the runner
 * runner.subscribe((snapshot) => {
 *   // ...
 * });
 *
 * const transitions = collector.getTransitions({ machineId: "fetcher" });
 * const stats = collector.getStats();
 * ```
 *
 * @example Manual pinning
 * ```typescript
 * collector.pin("transition-1");    // Protect from FIFO eviction
 * collector.unpin("transition-1");  // Allow FIFO eviction again
 * ```
 */
export class FlowMemoryCollector implements FlowCollector {
  private readonly storedTransitions: StoredTransition[] = [];
  private readonly subscribers: Set<FlowSubscriber> = new Set();
  private readonly sessionStart: number;
  private readonly retentionPolicy: FlowRetentionPolicy;

  /**
   * Creates a new FlowMemoryCollector instance.
   *
   * @param retentionPolicy - Optional retention policy configuration.
   *        Missing properties use DEFAULT_FLOW_RETENTION_POLICY values.
   */
  constructor(retentionPolicy?: Partial<FlowRetentionPolicy>) {
    this.sessionStart = Date.now();
    this.retentionPolicy = {
      ...DEFAULT_FLOW_RETENTION_POLICY,
      ...retentionPolicy,
    };
  }

  /**
   * Collects a new transition event.
   *
   * Applies the following eviction policy:
   * 1. Auto-pins slow transitions (duration >= slowThresholdMs)
   * 2. Enforces maxPinnedTransitions limit (drops oldest pinned)
   * 3. Enforces maxTransitions limit (FIFO, drops oldest non-pinned first)
   * 4. Notifies all subscribers synchronously
   *
   * @param event - The transition event to collect
   */
  collect(event: FlowTransitionEventAny): void {
    const now = Date.now();

    // Apply auto-pinning for slow transitions
    const processedEvent = this.applyAutoPinning(event);

    // Store the transition with collection timestamp
    this.storedTransitions.push({
      event: processedEvent,
      collectedAt: now,
    });

    // Enforce pinned transition limit first (before FIFO to avoid over-eviction)
    this.enforcePinnedLimit();

    // Then enforce total transition limit via FIFO (excluding pinned)
    this.enforceFIFOLimit();

    // Notify all subscribers
    this.notifySubscribers(processedEvent);
  }

  /**
   * Retrieves collected transitions, optionally filtered.
   *
   * Also applies time-based expiry for non-pinned transitions before filtering.
   *
   * Filter criteria:
   * - `machineId`: Exact match
   * - `prevState`: Exact match
   * - `nextState`: Exact match
   * - `eventType`: Exact match on event.type
   * - `minDuration`: Inclusive lower bound
   * - `maxDuration`: Inclusive upper bound
   * - `isPinned`: Exact match
   *
   * All criteria are ANDed together.
   *
   * @param filter - Optional filter criteria
   * @returns Readonly array of matching transition events
   */
  getTransitions(filter?: FlowTransitionFilter): readonly FlowTransitionEventAny[] {
    // Apply time-based expiry before returning transitions
    this.applyTimeExpiry();

    const events = this.storedTransitions.map(st => st.event);

    if (!filter) {
      return [...events];
    }

    return events.filter(event => this.matchesFilter(event, filter));
  }

  /**
   * Computes and returns aggregate statistics.
   *
   * Statistics are computed lazily from the current transition buffer.
   * Uses the retention policy's slowThresholdMs for slow count.
   *
   * @returns Computed flow statistics
   */
  getStats(): FlowStats {
    // Apply time-based expiry before computing stats
    this.applyTimeExpiry();

    const totalTransitions = this.storedTransitions.length;

    if (totalTransitions === 0) {
      return {
        totalTransitions: 0,
        averageDuration: 0,
        slowCount: 0,
        sessionStart: this.sessionStart,
        totalDuration: 0,
        transitionsByMachine: {},
      };
    }

    let totalDuration = 0;
    let slowCount = 0;
    const transitionsByMachine: Record<string, number> = {};

    for (const { event } of this.storedTransitions) {
      totalDuration += event.duration;

      if (event.duration >= this.retentionPolicy.slowThresholdMs) {
        slowCount++;
      }

      const currentCount = transitionsByMachine[event.machineId];
      transitionsByMachine[event.machineId] = currentCount === undefined ? 1 : currentCount + 1;
    }

    return {
      totalTransitions,
      averageDuration: totalDuration / totalTransitions,
      slowCount,
      sessionStart: this.sessionStart,
      totalDuration,
      transitionsByMachine,
    };
  }

  /**
   * Clears all collected transitions.
   *
   * Does not affect subscriptions or session start time.
   */
  clear(): void {
    this.storedTransitions.length = 0;
  }

  /**
   * Subscribes to new transition events in real-time.
   *
   * The callback is invoked synchronously when each new transition is collected.
   * Returns an unsubscribe function to stop receiving notifications.
   *
   * @param callback - Function called with each new transition event
   * @returns Unsubscribe function
   */
  subscribe(callback: FlowSubscriber): Unsubscribe {
    this.subscribers.add(callback);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Returns the current retention policy.
   *
   * Useful for external inspection of eviction configuration.
   */
  getRetentionPolicy(): FlowRetentionPolicy {
    return this.retentionPolicy;
  }

  /**
   * Manually pins a transition to protect it from FIFO eviction.
   *
   * Pinned transitions are only subject to:
   * - maxPinnedTransitions limit (oldest pinned dropped when exceeded)
   * - Manual unpinning via unpin()
   *
   * @param transitionId - ID of the transition to pin
   */
  pin(transitionId: string): void {
    const stored = this.storedTransitions.find(st => st.event.id === transitionId);
    if (stored && !stored.event.isPinned) {
      stored.event = { ...stored.event, isPinned: true };
      // Enforce pinned limit after manual pinning
      this.enforcePinnedLimit();
    }
  }

  /**
   * Unpins a transition, making it eligible for FIFO eviction and time expiry.
   *
   * @param transitionId - ID of the transition to unpin
   */
  unpin(transitionId: string): void {
    const stored = this.storedTransitions.find(st => st.event.id === transitionId);
    if (stored && stored.event.isPinned) {
      stored.event = { ...stored.event, isPinned: false };
    }
  }

  /**
   * Applies auto-pinning for slow transitions.
   *
   * Transitions with duration >= slowThresholdMs are automatically pinned.
   *
   * @param event - Original transition event
   * @returns Event with isPinned set appropriately
   */
  private applyAutoPinning(event: FlowTransitionEventAny): FlowTransitionEventAny {
    if (event.duration >= this.retentionPolicy.slowThresholdMs) {
      return { ...event, isPinned: true };
    }
    return event;
  }

  /**
   * Enforces the maxPinnedTransitions limit.
   *
   * When the number of pinned transitions exceeds maxPinnedTransitions,
   * the oldest pinned transitions are dropped.
   */
  private enforcePinnedLimit(): void {
    const { maxPinnedTransitions } = this.retentionPolicy;

    // Find indices of all pinned transitions (in order)
    const pinnedIndices: number[] = [];
    for (let i = 0; i < this.storedTransitions.length; i++) {
      const transition = this.storedTransitions[i];
      if (transition !== undefined && transition.event.isPinned) {
        pinnedIndices.push(i);
      }
    }

    // If over limit, drop oldest pinned transitions
    const excess = pinnedIndices.length - maxPinnedTransitions;
    if (excess > 0) {
      // Remove oldest pinned transitions (lower indices = older)
      // Process in reverse order to maintain correct indices during removal
      const indicesToRemove = pinnedIndices.slice(0, excess);
      for (let i = indicesToRemove.length - 1; i >= 0; i--) {
        const indexToRemove = indicesToRemove[i];
        if (indexToRemove !== undefined) {
          this.storedTransitions.splice(indexToRemove, 1);
        }
      }
    }
  }

  /**
   * Enforces the maxTransitions limit using FIFO eviction.
   *
   * When the total number of transitions exceeds maxTransitions,
   * the oldest non-pinned transitions are dropped first.
   */
  private enforceFIFOLimit(): void {
    const { maxTransitions } = this.retentionPolicy;

    while (this.storedTransitions.length > maxTransitions) {
      // Find the oldest non-pinned transition
      const indexToRemove = this.storedTransitions.findIndex(st => !st.event.isPinned);

      if (indexToRemove === -1) {
        // All transitions are pinned, cannot evict via FIFO
        // This is handled by enforcePinnedLimit
        break;
      }

      this.storedTransitions.splice(indexToRemove, 1);
    }
  }

  /**
   * Applies time-based expiry to non-pinned transitions.
   *
   * Removes transitions that are older than expiryMs and not pinned.
   * Called during getTransitions() and getStats() to clean up expired transitions.
   */
  private applyTimeExpiry(): void {
    const now = Date.now();
    const { expiryMs } = this.retentionPolicy;

    // Remove expired non-pinned transitions
    // Iterate backwards to safely remove during iteration
    for (let i = this.storedTransitions.length - 1; i >= 0; i--) {
      const stored = this.storedTransitions[i];
      if (stored === undefined) {
        continue;
      }
      const age = now - stored.collectedAt;

      if (age > expiryMs && !stored.event.isPinned) {
        this.storedTransitions.splice(i, 1);
      }
    }
  }

  /**
   * Checks if a transition matches all filter criteria.
   *
   * @param event - Transition event to check
   * @param filter - Filter criteria
   * @returns True if transition matches all criteria
   */
  private matchesFilter(event: FlowTransitionEventAny, filter: FlowTransitionFilter): boolean {
    // Machine ID filter (exact match)
    if (filter.machineId !== undefined && event.machineId !== filter.machineId) {
      return false;
    }

    // Previous state filter (exact match)
    if (filter.prevState !== undefined && event.prevState !== filter.prevState) {
      return false;
    }

    // Next state filter (exact match)
    if (filter.nextState !== undefined && event.nextState !== filter.nextState) {
      return false;
    }

    // Event type filter (exact match)
    if (filter.eventType !== undefined && event.event.type !== filter.eventType) {
      return false;
    }

    // Min duration filter (inclusive)
    if (filter.minDuration !== undefined && event.duration < filter.minDuration) {
      return false;
    }

    // Max duration filter (inclusive)
    if (filter.maxDuration !== undefined && event.duration > filter.maxDuration) {
      return false;
    }

    // Pinned filter (exact match)
    if (filter.isPinned !== undefined && event.isPinned !== filter.isPinned) {
      return false;
    }

    return true;
  }

  /**
   * Notifies all subscribers of a new transition event.
   *
   * @param event - The new transition event
   */
  private notifySubscribers(event: FlowTransitionEventAny): void {
    for (const subscriber of this.subscribers) {
      subscriber(event);
    }
  }
}
