/**
 * Transition Testing Utility
 *
 * Tests a specific state transition purely without creating a full
 * machine runner. Uses the interpreter's `transitionSafe` function
 * to compute the transition result as a Result type.
 *
 * @packageDocumentation
 */

import { type MachineAny, transitionSafe, type TransitionResult } from "@hex-di/flow";
import type { Result } from "@hex-di/result";
import type { TransitionError } from "@hex-di/flow";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for testing a transition.
 */
export interface TestTransitionOptions {
  /**
   * Override the context for this transition test.
   * If not provided, the machine's initial context is used.
   */
  readonly context?: unknown;
}

/**
 * Result of testing a transition, with convenient accessor properties.
 */
export interface TestTransitionResult {
  /** The raw Result from transitionSafe */
  readonly result: Result<TransitionResult, TransitionError>;

  /** Whether the transition succeeded (Result is Ok) */
  readonly ok: boolean;

  /** The transition result if ok, undefined otherwise */
  readonly value: TransitionResult | undefined;

  /** The error if not ok, undefined otherwise */
  readonly error: TransitionError | undefined;

  /** Whether a transition actually occurred (target state changed) */
  readonly transitioned: boolean;

  /** The new state name after transition, or undefined if no transition or error */
  readonly target: string | undefined;

  /** The new context after transition, or undefined if no change or error */
  readonly newContext: unknown;

  /** The effects produced by the transition */
  readonly effects: ReadonlyArray<{ readonly _tag: string }>;
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Tests a state transition purely without creating a runner.
 *
 * Uses the interpreter's `transitionSafe` to compute what would happen
 * if a given event is sent to a machine in a given state. Returns a
 * rich result object for easy assertions.
 *
 * @param machine - The machine definition to test against
 * @param state - The current state name to transition from
 * @param event - The event to send
 * @param options - Optional context override
 * @returns A TestTransitionResult with the transition outcome
 *
 * @example Basic transition test
 * ```typescript
 * const result = testTransition(machine, 'idle', { type: 'FETCH' });
 * expect(result.transitioned).toBe(true);
 * expect(result.target).toBe('loading');
 * ```
 *
 * @example Testing with context override
 * ```typescript
 * const result = testTransition(
 *   machine,
 *   'error',
 *   { type: 'RETRY' },
 *   { context: { retryCount: 5 } }
 * );
 * // Guard blocks retry when retryCount >= 3
 * expect(result.transitioned).toBe(false);
 * ```
 *
 * @example Testing effects
 * ```typescript
 * const result = testTransition(machine, 'idle', { type: 'START' });
 * expect(result.effects).toHaveLength(2);
 * expect(result.effects[0]._tag).toBe('Invoke');
 * ```
 *
 * @example Testing guard that throws
 * ```typescript
 * const result = testTransition(machine, 'broken', { type: 'GO' });
 * expect(result.ok).toBe(false);
 * expect(result.error?._tag).toBe('GuardThrew');
 * ```
 */
export function testTransition(
  machine: MachineAny,
  state: string,
  event: { readonly type: string },
  options?: TestTransitionOptions
): TestTransitionResult {
  const context = options?.context !== undefined ? options.context : machine.context;
  const result = transitionSafe(state, context, event, machine);

  if (result._tag === "Ok") {
    const value = result.value;
    return {
      result,
      ok: true,
      value,
      error: undefined,
      transitioned: value.transitioned,
      target: value.newState,
      newContext: value.newContext,
      effects: value.effects,
    };
  }

  return {
    result,
    ok: false,
    value: undefined,
    error: result.error,
    transitioned: false,
    target: undefined,
    newContext: undefined,
    effects: [],
  };
}
