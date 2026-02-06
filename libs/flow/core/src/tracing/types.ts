/**
 * Flow Tracing Types
 *
 * This module defines the types for flow state machine tracing:
 * - FlowTransitionEvent: Captures a single state transition
 * - FlowTransitionFilter: Filter criteria for querying transitions
 * - FlowStats: Aggregate statistics for flow transitions
 * - FlowRetentionPolicy: Configuration for transition retention
 *
 * @packageDocumentation
 */

import type { EffectAny } from "../effects/types.js";

// =============================================================================
// Flow Transition Event
// =============================================================================

/**
 * Represents a single state machine transition event.
 *
 * Captures all information about a transition:
 * - The machine that transitioned
 * - The previous and next states
 * - The triggering event
 * - Any effects produced
 * - Timing information
 *
 * @typeParam TState - The state name type (string literal)
 * @typeParam TEvent - The event type (object with `type` property)
 *
 * @example
 * ```typescript
 * const transitionEvent: FlowTransitionEvent<"idle" | "loading", { type: "FETCH" }> = {
 *   id: "transition-1",
 *   machineId: "fetcher",
 *   prevState: "idle",
 *   event: { type: "FETCH" },
 *   nextState: "loading",
 *   effects: [Effect.invoke(...)],
 *   timestamp: 1704067200000,
 *   duration: 0.5,
 *   isPinned: false,
 * };
 * ```
 */
export interface FlowTransitionEvent<
  TState extends string = string,
  TEvent extends { readonly type: string } = { readonly type: string },
> {
  /**
   * Unique identifier for this transition event.
   */
  readonly id: string;

  /**
   * The machine's identifier (from machine.id).
   */
  readonly machineId: string;

  /**
   * The state before the transition.
   */
  readonly prevState: TState;

  /**
   * The event that triggered the transition.
   */
  readonly event: TEvent;

  /**
   * The state after the transition.
   */
  readonly nextState: TState;

  /**
   * The effects produced by this transition.
   */
  readonly effects: readonly EffectAny[];

  /**
   * Unix timestamp (milliseconds) when the transition occurred.
   */
  readonly timestamp: number;

  /**
   * Duration of the transition in milliseconds.
   * This is the time from receiving the event to completing the state update.
   */
  readonly duration: number;

  /**
   * Whether this transition is pinned (protected from eviction).
   */
  readonly isPinned: boolean;
}

/**
 * Universal constraint type for FlowTransitionEvent.
 * Allows any FlowTransitionEvent to be assigned without `any`.
 */
export type FlowTransitionEventAny = FlowTransitionEvent<string, { readonly type: string }>;

// =============================================================================
// Flow Transition Filter
// =============================================================================

/**
 * Filter criteria for querying flow transitions.
 *
 * All criteria are ANDed together (all must match).
 *
 * @example
 * ```typescript
 * // Find slow transitions for a specific machine
 * const filter: FlowTransitionFilter = {
 *   machineId: "fetcher",
 *   minDuration: 100,
 * };
 * ```
 */
export interface FlowTransitionFilter {
  /**
   * Filter by machine ID (exact match).
   */
  readonly machineId?: string;

  /**
   * Filter by previous state (exact match).
   */
  readonly prevState?: string;

  /**
   * Filter by next state (exact match).
   */
  readonly nextState?: string;

  /**
   * Filter by event type (exact match).
   */
  readonly eventType?: string;

  /**
   * Filter by minimum duration (inclusive).
   */
  readonly minDuration?: number;

  /**
   * Filter by maximum duration (inclusive).
   */
  readonly maxDuration?: number;

  /**
   * Filter by pinned status (exact match).
   */
  readonly isPinned?: boolean;
}

// =============================================================================
// Flow Stats
// =============================================================================

/**
 * Aggregate statistics for flow transitions.
 *
 * @example
 * ```typescript
 * const stats = collector.getStats();
 * console.log(`Total: ${stats.totalTransitions}, Avg: ${stats.averageDuration}ms`);
 * ```
 */
export interface FlowStats {
  /**
   * Total number of transitions recorded.
   */
  readonly totalTransitions: number;

  /**
   * Average duration of transitions in milliseconds.
   */
  readonly averageDuration: number;

  /**
   * Number of transitions exceeding the slow threshold.
   */
  readonly slowCount: number;

  /**
   * Unix timestamp (milliseconds) when the session started.
   */
  readonly sessionStart: number;

  /**
   * Total duration of all transitions combined in milliseconds.
   */
  readonly totalDuration: number;

  /**
   * Count of transitions by machine ID.
   */
  readonly transitionsByMachine: Readonly<Record<string, number>>;
}

// =============================================================================
// Flow Retention Policy
// =============================================================================

/**
 * Configuration for flow transition retention.
 *
 * Controls how transitions are stored, evicted, and auto-pinned.
 *
 * @example
 * ```typescript
 * const policy: FlowRetentionPolicy = {
 *   maxTransitions: 1000,
 *   maxPinnedTransitions: 100,
 *   slowThresholdMs: 100,
 *   expiryMs: 300000, // 5 minutes
 * };
 * ```
 */
export interface FlowRetentionPolicy {
  /**
   * Maximum number of transitions to store.
   * When exceeded, oldest non-pinned transitions are evicted.
   */
  readonly maxTransitions: number;

  /**
   * Maximum number of pinned transitions to keep.
   * When exceeded, oldest pinned transitions are evicted.
   */
  readonly maxPinnedTransitions: number;

  /**
   * Duration threshold (ms) above which transitions are auto-pinned.
   */
  readonly slowThresholdMs: number;

  /**
   * Time (ms) after which non-pinned transitions expire and are removed.
   */
  readonly expiryMs: number;
}

/**
 * Default retention policy values.
 *
 * - maxTransitions: 1000
 * - maxPinnedTransitions: 100
 * - slowThresholdMs: 100ms
 * - expiryMs: 300000ms (5 minutes)
 */
export const DEFAULT_FLOW_RETENTION_POLICY: FlowRetentionPolicy = Object.freeze({
  maxTransitions: 1000,
  maxPinnedTransitions: 100,
  slowThresholdMs: 100,
  expiryMs: 300000,
});
