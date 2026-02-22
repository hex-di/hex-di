/**
 * Async combinators for timer and clock composition.
 *
 * @packageDocumentation
 */

import type { Result, ResultAsync as ResultAsyncType } from "@hex-di/result";
import { err, ResultAsync } from "@hex-di/result";
import type { TimerSchedulerService } from "./ports/timer-scheduler.js";
import type { ClockService } from "./ports/clock.js";

// =============================================================================
// ClockTimeoutError
// =============================================================================

/** Error returned when timeout() fires before the given operation settles. */
export interface ClockTimeoutError {
  readonly _tag: "ClockTimeoutError";
  readonly message: string;
  readonly timeoutMs: number;
}

function createClockTimeoutErrorInternal(ms: number): ClockTimeoutError {
  return Object.freeze({
    _tag: "ClockTimeoutError" as const,
    message: `Operation timed out after ${ms}ms`,
    timeoutMs: ms,
  });
}

// =============================================================================
// DelayValidationError
// =============================================================================

/** Error returned when delay() receives an invalid ms value. */
export interface DelayValidationError {
  readonly _tag: "DelayValidationError";
  readonly ms: number;
  readonly message: string;
}

function createDelayValidationError(ms: number): DelayValidationError {
  return Object.freeze({
    _tag: "DelayValidationError" as const,
    ms,
    message: `delay: ms must be a non-negative finite number, got ${ms}`,
  });
}

// =============================================================================
// delay
// =============================================================================

/**
 * Returns a ResultAsync that resolves after ms milliseconds.
 * Delegates to scheduler.sleep() — not raw setTimeout.
 * Returns err(DelayValidationError) for invalid ms values.
 */
export function delay(
  scheduler: TimerSchedulerService,
  ms: number
): ResultAsyncType<void, DelayValidationError> {
  if (!Number.isFinite(ms) || ms < 0) {
    return ResultAsync.err(createDelayValidationError(ms));
  }
  // ms is valid — scheduler.sleep(ms) will not produce a TimerValidationError
  return scheduler.sleep(ms).mapErr((_e) => createDelayValidationError(ms));
}

// =============================================================================
// timeout
// =============================================================================

/**
 * Races an operation against a timer.
 * Returns err(ClockTimeoutError) if the timer fires before the operation settles.
 * Cleans up the timer handle when the operation settles first.
 */
export function timeout<T, E>(
  scheduler: TimerSchedulerService,
  operation: ResultAsyncType<T, E>,
  ms: number
): ResultAsyncType<T, ClockTimeoutError | E> {
  return ResultAsync.fromResult(
    new Promise<Result<T, ClockTimeoutError | E>>((resolve) => {
      const handleResult = scheduler.setTimeout(() => {
        resolve(err(createClockTimeoutErrorInternal(ms)));
      }, ms);

      if (handleResult.isErr()) {
        // ms was invalid — resolve with timeout error immediately
        resolve(err(createClockTimeoutErrorInternal(ms)));
        return;
      }

      const handle = handleResult.value;

      void operation.then((result) => {
        scheduler.clearTimeout(handle);
        resolve(result);
      });
    })
  );
}

// =============================================================================
// measure
// =============================================================================

/**
 * Executes fn, measures its duration using clock.monotonicNow(), and returns both result and duration.
 * Propagates errors from fn unchanged.
 */
export function measure<T, E>(
  clock: ClockService,
  fn: () => ResultAsyncType<T, E>
): ResultAsyncType<{ readonly result: T; readonly durationMs: number }, E> {
  const start = clock.monotonicNow();
  return fn().map((result) =>
    Object.freeze({ result, durationMs: clock.monotonicNow() - start })
  );
}

// =============================================================================
// retry
// =============================================================================

/** Options for the retry combinator. */
export interface RetryOptions {
  readonly maxAttempts: number;
  readonly delayMs: number;
  readonly backoffMultiplier?: number;
  readonly maxDelayMs?: number;
}

/**
 * Retries fn up to maxAttempts times with configurable delay and exponential backoff.
 * Uses scheduler.sleep() between attempts (not raw setTimeout).
 * Returns the last err after exhausting all attempts — never throws.
 */
export function retry<T, E>(
  scheduler: TimerSchedulerService,
  fn: () => ResultAsyncType<T, E>,
  options: RetryOptions
): ResultAsyncType<T, E> {
  const { maxAttempts, delayMs, backoffMultiplier = 1, maxDelayMs = Infinity } = options;

  return ResultAsync.fromResult(
    (async (): Promise<Result<T, E>> => {
      // Always execute at least the first attempt
      let result = await fn();

      for (let attempt = 1; attempt < maxAttempts && result.isErr(); attempt++) {
        const computedDelay = Math.min(
          delayMs * Math.pow(backoffMultiplier, attempt - 1),
          maxDelayMs
        );
        // scheduler.sleep() with a valid computedDelay won't produce a TimerValidationError
        await scheduler.sleep(computedDelay);
        result = await fn();
      }

      return result;
    })()
  );
}
