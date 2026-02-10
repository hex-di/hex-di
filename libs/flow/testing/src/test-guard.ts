/**
 * Guard Testing Utility
 *
 * Provides a simple wrapper for testing guard predicates in isolation,
 * without needing a full machine or runner.
 *
 * @packageDocumentation
 */

import { ok, err, type Result } from "@hex-di/result";

// =============================================================================
// Types
// =============================================================================

/**
 * Input for testing a guard predicate.
 *
 * @typeParam TContext - The context type the guard expects
 * @typeParam TEvent - The event type the guard expects
 */
export interface TestGuardInput<TContext, TEvent> {
  /** The context to pass to the guard */
  readonly context: TContext;
  /** The event to pass to the guard */
  readonly event: TEvent;
}

/**
 * Result of testing a guard predicate.
 */
export interface TestGuardResult {
  /** Whether the guard returned true */
  readonly passed: boolean;
  /** If the guard threw, the error that was thrown */
  readonly error: unknown;
  /** Whether the guard threw an exception */
  readonly threw: boolean;
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Tests a guard predicate in isolation.
 *
 * Invokes the guard with the provided context and event, catching any
 * thrown errors. Returns a result object indicating whether the guard
 * passed, failed, or threw.
 *
 * @param guardFn - The guard predicate function to test
 * @param input - The context and event to pass to the guard
 * @returns A result indicating the guard outcome
 *
 * @example Basic guard testing
 * ```typescript
 * const canRetry = (ctx: { retryCount: number }) => ctx.retryCount < 3;
 *
 * const result = testGuard(canRetry, {
 *   context: { retryCount: 2 },
 *   event: { type: 'RETRY' },
 * });
 * expect(result.passed).toBe(true);
 * expect(result.threw).toBe(false);
 * ```
 *
 * @example Testing named guards
 * ```typescript
 * import { guard, and } from '@hex-di/flow';
 *
 * const isAdmin = guard('isAdmin', (ctx) => ctx.role === 'admin');
 * const hasPermission = guard('hasPermission', (ctx) => ctx.permissions.includes('write'));
 * const canEdit = and(isAdmin, hasPermission);
 *
 * const result = testGuard(canEdit, {
 *   context: { role: 'admin', permissions: ['read', 'write'] },
 *   event: { type: 'EDIT' },
 * });
 * expect(result.passed).toBe(true);
 * ```
 *
 * @example Testing guard that throws
 * ```typescript
 * const badGuard = () => { throw new Error('boom'); };
 *
 * const result = testGuard(badGuard, {
 *   context: {},
 *   event: { type: 'TEST' },
 * });
 * expect(result.threw).toBe(true);
 * expect(result.error).toBeInstanceOf(Error);
 * ```
 */
export function testGuard<TContext, TEvent>(
  guardFn: (context: TContext, event: TEvent) => boolean,
  input: TestGuardInput<TContext, TEvent>
): TestGuardResult {
  try {
    const passed = guardFn(input.context, input.event);
    return { passed, error: undefined, threw: false };
  } catch (error: unknown) {
    return { passed: false, error, threw: true };
  }
}

/**
 * Result-wrapping variant of {@link testGuard}.
 *
 * Returns `Ok(boolean)` when the guard executes without throwing,
 * or `Err(error)` when the guard throws an exception.
 *
 * @param guardFn - The guard predicate function to test
 * @param input - The context and event to pass to the guard
 * @returns A Result containing the boolean outcome or the thrown error
 *
 * @example
 * ```typescript
 * const result = testGuardSafe(canRetry, {
 *   context: { retryCount: 2 },
 *   event: { type: 'RETRY' },
 * });
 * // result is Ok(true) or Ok(false) or Err(error)
 * ```
 */
export function testGuardSafe<TContext, TEvent>(
  guardFn: (context: TContext, event: TEvent) => boolean,
  input: TestGuardInput<TContext, TEvent>
): Result<boolean, unknown> {
  try {
    const passed = guardFn(input.context, input.event);
    return ok(passed);
  } catch (error: unknown) {
    return err(error);
  }
}
