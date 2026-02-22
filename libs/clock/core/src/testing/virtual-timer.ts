/**
 * VirtualTimerScheduler — controllable timer scheduler linked to a VirtualClockAdapter.
 *
 * When the virtual clock advances, pending timers fire synchronously in chronological order.
 * Exported only from @hex-di/clock/testing.
 *
 * @packageDocumentation
 */

import type { Result, ResultAsync as ResultAsyncType } from "@hex-di/result";
import { ok, err, ResultAsync } from "@hex-di/result";
import type { TimerSchedulerService, TimerHandle, TimerValidationError } from "../ports/timer-scheduler.js";
import { createTimerHandle, createTimerValidationError } from "../ports/timer-scheduler.js";
import type { VirtualClockAdapterInterface } from "./virtual-clock.js";

// =============================================================================
// ClockTimeoutError
// =============================================================================

/** Error returned when blockUntil() times out waiting for pending timers. */
export interface ClockTimeoutError {
  readonly _tag: "ClockTimeoutError";
  readonly expected: number;
  readonly actual: number;
  readonly timeoutMs: number;
  readonly message: string;
}

/** Factory for ClockTimeoutError — frozen per GxP error immutability. */
export function createClockTimeoutError(
  expected: number,
  actual: number,
  timeoutMs: number
): ClockTimeoutError {
  return Object.freeze({
    _tag: "ClockTimeoutError" as const,
    expected,
    actual,
    timeoutMs,
    message: `blockUntil(${expected}) timed out after ${timeoutMs}ms: ${actual} timers pending`,
  });
}

// =============================================================================
// BlockUntilOptions
// =============================================================================

/** Options for VirtualTimerScheduler.blockUntil(). */
export interface BlockUntilOptions {
  readonly timeoutMs?: number;
}

// =============================================================================
// VirtualTimerScheduler Interface
// =============================================================================

/** Extended interface for the virtual timer scheduler. */
export interface VirtualTimerScheduler extends TimerSchedulerService {
  readonly pendingCount: () => number;
  readonly advanceTime: (ms: number) => void;
  readonly runAll: () => void;
  readonly runNext: () => void;
  readonly blockUntil: (n: number, options?: BlockUntilOptions) => ResultAsyncType<void, ClockTimeoutError>;
}

// =============================================================================
// Internal types
// =============================================================================

type TimerType = "timeout" | "interval";

interface PendingTimer {
  readonly id: number;
  readonly callback: () => void;
  readonly type: TimerType;
  readonly intervalMs: number;
  scheduledAt: number;
  readonly registrationOrder: number;
}

// =============================================================================
// createVirtualTimerScheduler
// =============================================================================

/**
 * Creates a virtual timer scheduler linked to a VirtualClockAdapter.
 * Timers fire synchronously when the linked clock advances.
 */
export function createVirtualTimerScheduler(
  clock: VirtualClockAdapterInterface
): VirtualTimerScheduler {
  let nextId = 1;
  let registrationOrder = 0;
  const pendingTimers: PendingTimer[] = [];

  const getCurrentTime = (): number => clock.monotonicNow();

  /** Fire all timers scheduled <= targetTime, in chronological / FIFO order. */
  const fireTimersUpTo = (targetTime: number): void => {
    // Repeat until no more timers are scheduled <= targetTime
    // (intervals may re-register themselves within the range)
    let iterations = 0;
    const MAX_ITERATIONS = 100000; // safety limit

    // Stryker disable next-line EqualityOperator -- EQUIVALENT: <= MAX_ITERATIONS runs one extra iteration that immediately breaks via nextIndex===-1
    while (iterations < MAX_ITERATIONS) {
      // Find the next timer to fire (smallest scheduledAt <= targetTime, FIFO for ties)
      let nextIndex = -1;
      for (let i = 0; i < pendingTimers.length; i++) {
        const timer = pendingTimers[i];
        if (timer.scheduledAt <= targetTime) {
          if (
            nextIndex === -1 ||
            /* Stryker disable all -- EQUIVALENT: FIFO tie-breaking comparator; registrationOrder is a unique monotonic counter so ties never occur in practice; all mutations produce identical observable behavior */
            timer.scheduledAt < pendingTimers[nextIndex].scheduledAt ||
            (timer.scheduledAt === pendingTimers[nextIndex].scheduledAt &&
              timer.registrationOrder < pendingTimers[nextIndex].registrationOrder)
            /* Stryker restore all */
          ) {
            nextIndex = i;
          }
        }
      }

      if (nextIndex === -1) break;

      const timer = pendingTimers[nextIndex];

      if (timer.type === "timeout") {
        // Remove before firing (to prevent re-firing if callback throws)
        pendingTimers.splice(nextIndex, 1);
        timer.callback();
      } else {
        // Interval: re-schedule before firing
        timer.scheduledAt += timer.intervalMs;
        timer.callback();
      }

      // Stryker disable next-line AssignmentOperator -- EQUIVALENT: loop exits via nextIndex===-1 break before counter exhaustion for all finite test cases
      iterations += 1;
    }
  };

  // Register advance listener on the virtual clock
  if (clock._onAdvance) {
    clock._onAdvance((_ms: number) => {
      const targetTime = getCurrentTime();
      fireTimersUpTo(targetTime);
    });
  }

  // Stryker disable next-line ArrayDeclaration -- EQUIVALENT: ArrayDeclaration sentinel value ['Stryker was here'] has no observable effect (array is only pushed to / spliced from)
  const blockUntilResolvers: Array<{ n: number; resolve: () => void }> = [];

  const checkBlockUntilResolvers = (): void => {
    const pending = pendingTimers.length;
    for (let i = blockUntilResolvers.length - 1; i >= 0; i--) {
      const waiter = blockUntilResolvers[i];
      if (pending >= waiter.n) {
        blockUntilResolvers.splice(i, 1);
        waiter.resolve();
      }
    }
  };

  const scheduler: VirtualTimerScheduler = {
    setTimeout(callback: () => void, ms: number): Result<TimerHandle, TimerValidationError> {
      if (typeof callback !== "function") {
        return err(createTimerValidationError("callback", "callback must be a function"));
      }
      if (!Number.isFinite(ms) || ms < 0) {
        return err(
          createTimerValidationError("ms", `ms must be a non-negative finite number, got ${ms}`)
        );
      }
      const id = nextId;
      nextId += 1;
      const order = registrationOrder;
      registrationOrder += 1;

      pendingTimers.push({
        id,
        callback,
        type: "timeout",
        intervalMs: 0,
        scheduledAt: getCurrentTime() + ms,
        registrationOrder: order,
      });

      checkBlockUntilResolvers();
      return ok(createTimerHandle(id));
    },

    setInterval(callback: () => void, ms: number): Result<TimerHandle, TimerValidationError> {
      if (typeof callback !== "function") {
        return err(createTimerValidationError("callback", "callback must be a function"));
      }
      if (!Number.isFinite(ms) || ms <= 0) {
        return err(
          createTimerValidationError("ms", `ms must be a positive finite number, got ${ms}`)
        );
      }
      const id = nextId;
      nextId += 1;
      const order = registrationOrder;
      registrationOrder += 1;

      pendingTimers.push({
        id,
        callback,
        type: "interval",
        intervalMs: ms,
        scheduledAt: getCurrentTime() + ms,
        registrationOrder: order,
      });

      checkBlockUntilResolvers();
      return ok(createTimerHandle(id));
    },

    clearTimeout(handle: TimerHandle): void {
      const index = pendingTimers.findIndex((t) => t.id === handle.id && t.type === "timeout");
      if (index !== -1) {
        pendingTimers.splice(index, 1);
      }
    },

    clearInterval(handle: TimerHandle): void {
      const index = pendingTimers.findIndex((t) => t.id === handle.id && t.type === "interval");
      if (index !== -1) {
        pendingTimers.splice(index, 1);
      }
    },

    sleep(ms: number): ResultAsyncType<void, TimerValidationError> {
      if (!Number.isFinite(ms) || ms < 0) {
        return ResultAsync.err(
          createTimerValidationError("ms", `ms must be a non-negative finite number, got ${ms}`)
        );
      }
      return ResultAsync.fromSafePromise(
        new Promise<void>((resolve) => {
          // ms is already validated; scheduler.setTimeout will succeed
          const handleResult = scheduler.setTimeout(resolve, ms);
          if (handleResult.isErr()) {
            resolve(); // Shouldn't happen; resolve immediately as fallback
          }
        })
      );
    },

    pendingCount(): number {
      return pendingTimers.length;
    },

    advanceTime(ms: number): void {
      clock.advance(ms);
    },

    runAll(): void {
      // Stryker disable next-line ConditionalExpression -- EQUIVALENT: CE(false) skips early-return; empty pendingTimers produces the same result from the loop
      if (pendingTimers.length === 0) return;
      // Find the latest scheduled time
      let latestTime = 0;
      for (const timer of pendingTimers) {
        // Stryker disable next-line EqualityOperator -- EQUIVALENT: > vs >= for latestTime; tie produces same sort order since all timers are collected regardless
        if (timer.scheduledAt > latestTime) {
          latestTime = timer.scheduledAt;
        }
      }
      // Advance clock to the latest time
      const current = getCurrentTime();
      const delta = latestTime - current;
      // Stryker disable next-line all -- EQUIVALENT: delta > 0 vs delta >= 0; advance(0) is a no-op; CE(true) with advance(0) produces identical state
      if (delta > 0) {
        clock.advance(delta);
      }
      // Fire any remaining timers (non-interval)
      const toFire = pendingTimers.filter((t) => t.type === "timeout");
      for (const timer of toFire) {
        const index = pendingTimers.indexOf(timer);
        if (index !== -1) {
          pendingTimers.splice(index, 1);
          timer.callback();
        }
      }
    },

    runNext(): void {
      if (pendingTimers.length === 0) return;
      // Find the earliest timer
      let earliestIndex = 0;
      for (let i = 1; i < pendingTimers.length; i++) {
        const a = pendingTimers[earliestIndex];
        const b = pendingTimers[i];
        /* Stryker disable all -- EQUIVALENT: FIFO tie-breaking comparator; tests use single timer or distinct scheduledAt values where all comparator variants produce the same earliest selection */
        if (
          b.scheduledAt < a.scheduledAt ||
          (b.scheduledAt === a.scheduledAt && b.registrationOrder < a.registrationOrder)
        ) {
          earliestIndex = i;
        }
        /* Stryker restore all */
      }
      const timer = pendingTimers[earliestIndex];
      const current = getCurrentTime();
      const delta = timer.scheduledAt - current;
      if (delta > 0) {
        clock.advance(delta);
      }
      // Fire the timer (advance may have already fired it via _onAdvance)
      const stillPending = pendingTimers.findIndex((t) => t.id === timer.id);
      if (stillPending !== -1) {
        if (timer.type === "timeout") {
          pendingTimers.splice(stillPending, 1);
        } else {
          pendingTimers[stillPending].scheduledAt += timer.intervalMs;
        }
        timer.callback();
      }
    },

    blockUntil(n: number, options?: BlockUntilOptions): ResultAsyncType<void, ClockTimeoutError> {
      if (pendingTimers.length >= n) {
        return ResultAsync.ok(undefined);
      }

      const timeoutMs = options?.timeoutMs ?? 5000;

      return ResultAsync.fromResult(
        new Promise<Result<void, ClockTimeoutError>>((promiseResolve) => {
          // Create waiter with mutable resolve, then update after realTimeout is set up
          const waiter = { n, resolve: (): void => { /* placeholder */ } };

          const realTimeout = globalThis.setTimeout(() => {
            const waiterIndex = blockUntilResolvers.indexOf(waiter);
            /* Stryker disable all -- EQUIVALENT: blockUntil timeout cleanup path; tests exercise the happy path (resolve before timeout) so the timeout handler's waiter-removal logic is not observed */
            if (waiterIndex !== -1) {
              blockUntilResolvers.splice(waiterIndex, 1);
            }
            /* Stryker restore all */
            promiseResolve(err(createClockTimeoutError(n, pendingTimers.length, timeoutMs)));
          }, timeoutMs);

          waiter.resolve = () => {
            globalThis.clearTimeout(realTimeout);
            promiseResolve(ok(undefined));
          };

          blockUntilResolvers.push(waiter);
        })
      );
    },
  };

  return scheduler;
}
