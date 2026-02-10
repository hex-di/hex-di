/**
 * Retry Pattern with Exponential Backoff
 *
 * Provides a helper that generates states and transitions for a retry pattern
 * with configurable max retries, initial delay, max delay, and backoff multiplier.
 *
 * @packageDocumentation
 */

import type { StateNodeAny } from "../machine/state-node.js";
import { Effect } from "../effects/constructors.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration for the retry pattern.
 */
export interface RetryPatternConfig {
  /** Maximum number of retries before giving up. */
  readonly maxRetries: number;

  /** Initial delay in milliseconds before the first retry. */
  readonly initialDelay?: number;

  /** Maximum delay in milliseconds (caps exponential growth). */
  readonly maxDelay?: number;

  /** Multiplier for exponential backoff (default: 2). */
  readonly backoffMultiplier?: number;

  /** State to transition to on success. */
  readonly successTarget: string;

  /** State to transition to when retries are exhausted. */
  readonly failureTarget: string;

  /** Event type that triggers a retry attempt. */
  readonly retryEvent: string;

  /** Event type that indicates success. */
  readonly successEvent: string;

  /** Event type that indicates failure (triggers retry logic). */
  readonly failureEvent: string;
}

/**
 * Context fields added by the retry pattern.
 */
export interface RetryContext {
  readonly retryCount: number;
  readonly retryDelay: number;
}

/**
 * The result of retryConfig: states and guards to spread into a machine.
 */
export interface RetryPatternResult {
  /** The retry-related states to spread into the machine's states record. */
  readonly states: Record<string, StateNodeAny>;

  /** Guard that checks if retry count is below max. */
  canRetry(context: RetryContext): boolean;

  /** Computes the next backoff delay. */
  computeDelay(context: RetryContext): number;

  /** Initial context values for the retry fields. */
  readonly initialContext: RetryContext;
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Generates states, transitions, and guards for a retry pattern.
 *
 * The generated states include:
 * - `retryWaiting`: Waits for the backoff delay before retrying
 *
 * The caller must include a state that handles the retryEvent and
 * transitions to `retryWaiting` on failure.
 *
 * @param config - The retry pattern configuration
 * @returns States, guards, and initial context for the retry pattern
 *
 * @example
 * ```typescript
 * const retry = retryConfig({
 *   maxRetries: 3,
 *   initialDelay: 1000,
 *   maxDelay: 10000,
 *   backoffMultiplier: 2,
 *   successTarget: 'success',
 *   failureTarget: 'failed',
 *   retryEvent: 'RETRY',
 *   successEvent: 'SUCCESS',
 *   failureEvent: 'FAILURE',
 * });
 *
 * const machine = defineMachine({
 *   id: 'fetch-with-retry',
 *   initial: 'loading',
 *   context: { ...retry.initialContext, data: null },
 *   states: {
 *     loading: {
 *       on: {
 *         SUCCESS: { target: 'success' },
 *         FAILURE: [
 *           { target: 'retryWaiting', guard: retry.canRetry },
 *           { target: 'failed' },
 *         ],
 *       },
 *     },
 *     ...retry.states,
 *     success: {},
 *     failed: {},
 *   },
 * });
 * ```
 */
export function retryConfig(config: RetryPatternConfig): RetryPatternResult {
  const {
    maxRetries,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    retryEvent,
    failureTarget,
  } = config;

  function canRetry(context: RetryContext): boolean {
    return context.retryCount < maxRetries;
  }

  function computeDelay(context: RetryContext): number {
    const delay = initialDelay * Math.pow(backoffMultiplier, context.retryCount);
    return Math.min(delay, maxDelay);
  }

  // The retryWaiting state waits for the backoff delay, then emits a retry event
  const retryWaiting: StateNodeAny = {
    entry: [Effect.delay(initialDelay)],
    on: {
      [retryEvent]: {
        target: config.successTarget,
        actions: [
          (ctx: RetryContext) => ({
            ...ctx,
            retryCount: ctx.retryCount + 1,
            retryDelay: computeDelay(ctx),
          }),
        ],
      },
      [config.failureEvent]: [
        {
          target: "retryWaiting",
          guard: canRetry,
          actions: [
            (ctx: RetryContext) => ({
              ...ctx,
              retryCount: ctx.retryCount + 1,
              retryDelay: computeDelay(ctx),
            }),
          ],
        },
        { target: failureTarget },
      ],
    },
  };

  return {
    states: {
      retryWaiting,
    },
    canRetry,
    computeDelay,
    initialContext: {
      retryCount: 0,
      retryDelay: initialDelay,
    },
  };
}
