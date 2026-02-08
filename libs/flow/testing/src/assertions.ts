/**
 * Flow Assertion Helpers
 *
 * Fluent assertion helpers for machine state and transitions.
 *
 * @packageDocumentation
 */

import { expect } from "vitest";
import type { MachineSnapshot } from "@hex-di/flow";

// =============================================================================
// expectFlowState
// =============================================================================

/** Fluent assertion API for machine runner state */
export interface FlowStateAssertions<TState extends string, TContext> {
  /** Assert machine is in the specified state */
  toBeInState(name: TState): void;
  /** Assert machine context matches partial object */
  toHaveContext(partial: Partial<TContext>): void;
  /** Assert machine has no running activities */
  toHaveNoActivities(): void;
  /** Assert machine has the specified number of activities */
  toHaveActivityCount(count: number): void;
}

/**
 * Creates fluent assertions for a machine runner's current state.
 *
 * @example
 * ```typescript
 * expectFlowState(runner).toBeInState('loading');
 * expectFlowState(runner).toHaveContext({ count: 5 });
 * ```
 */
export function expectFlowState<TState extends string, TContext>(runner: {
  snapshot(): MachineSnapshot<TState, TContext>;
  state(): TState;
  context(): TContext;
}): FlowStateAssertions<TState, TContext> {
  return {
    toBeInState(name: TState): void {
      expect(runner.state()).toBe(name);
    },
    toHaveContext(partial: Partial<TContext>): void {
      expect(runner.context()).toMatchObject(partial as Record<string, unknown>);
    },
    toHaveNoActivities(): void {
      expect(runner.snapshot().activities).toHaveLength(0);
    },
    toHaveActivityCount(count: number): void {
      expect(runner.snapshot().activities).toHaveLength(count);
    },
  };
}

// =============================================================================
// expectEvents / expectEventTypes
// =============================================================================

/**
 * Asserts that an event sequence matches expected partial matchers.
 *
 * @example
 * ```typescript
 * expectEvents(recorder.events, [
 *   { type: 'FETCH' },
 *   { type: 'SUCCESS', payload: expect.any(Object) },
 * ]);
 * ```
 */
export function expectEvents(
  events: ReadonlyArray<{ readonly type: string }>,
  expected: ReadonlyArray<Record<string, unknown>>
): void {
  expect(events).toHaveLength(expected.length);
  for (let i = 0; i < expected.length; i++) {
    expect(events[i]).toMatchObject(expected[i]);
  }
}

/**
 * Asserts that the event type sequence matches expected types.
 *
 * @example
 * ```typescript
 * expectEventTypes(recorder.events, ['FETCH', 'SUCCESS']);
 * ```
 */
export function expectEventTypes(
  events: ReadonlyArray<{ readonly type: string }>,
  types: ReadonlyArray<string>
): void {
  const eventTypes = events.map(e => e.type);
  expect(eventTypes).toEqual(types);
}

// =============================================================================
// expectSnapshot
// =============================================================================

/** Fluent assertion API for machine snapshots */
export interface SnapshotAssertions<TState extends string, TContext> {
  /** Assert snapshot state name */
  toBeInState(name: TState): void;
  /** Assert snapshot context matches partial */
  toHaveContext(partial: Partial<TContext>): void;
}

/**
 * Creates fluent assertions for a machine snapshot.
 *
 * @example
 * ```typescript
 * expectSnapshot(snapshot).toBeInState('idle');
 * ```
 */
export function expectSnapshot<TState extends string, TContext>(
  snapshot: MachineSnapshot<TState, TContext>
): SnapshotAssertions<TState, TContext> {
  return {
    toBeInState(name: TState): void {
      expect(snapshot.state).toBe(name);
    },
    toHaveContext(partial: Partial<TContext>): void {
      expect(snapshot.context).toMatchObject(partial as Record<string, unknown>);
    },
  };
}
