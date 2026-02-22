/**
 * Async combinators type-level tests — DoD 27
 */

import { describe, it, expectTypeOf } from "vitest";
import { delay, timeout, measure, retry } from "../src/async-combinators.js";
import type {
  RetryOptions,
  DelayValidationError,
  ClockTimeoutError,
} from "../src/async-combinators.js";
import type { ResultAsync as ResultAsyncType } from "@hex-di/result";
import { ResultAsync } from "@hex-di/result";
import type { TimerSchedulerService } from "../src/ports/timer-scheduler.js";
import type { ClockService } from "../src/ports/clock.js";

// =============================================================================
// DoD 27: Async Combinators — type-level
// =============================================================================

describe("delay() type signature", () => {
  it("delay return type is ResultAsync<void, DelayValidationError>", () => {
    expectTypeOf(delay).returns.toEqualTypeOf<ResultAsyncType<void, DelayValidationError>>();
  });

  it("delay accepts TimerSchedulerService and number", () => {
    expectTypeOf(delay).parameter(0).toMatchTypeOf<TimerSchedulerService>();
    expectTypeOf(delay).parameter(1).toEqualTypeOf<number>();
  });
});

describe("timeout() type signature", () => {
  it("timeout return type preserves the generic T from the operation", () => {
    const scheduler = {} as TimerSchedulerService;
    const stringOp = ResultAsync.ok("hello");
    const result = timeout(scheduler, stringOp, 1000);
    // ok("hello") → ResultAsync<string, never> → timeout yields ResultAsync<string, ClockTimeoutError | never> = ResultAsync<string, ClockTimeoutError>
    expectTypeOf(result).toEqualTypeOf<ResultAsyncType<string, ClockTimeoutError>>();
  });

  it("timeout preserves numeric generic T", () => {
    const scheduler = {} as TimerSchedulerService;
    const numOp = ResultAsync.ok(42);
    const result = timeout(scheduler, numOp, 500);
    expectTypeOf(result).toEqualTypeOf<ResultAsyncType<number, ClockTimeoutError>>();
  });

  it("timeout accepts TimerSchedulerService and number", () => {
    expectTypeOf(timeout).parameter(0).toMatchTypeOf<TimerSchedulerService>();
    expectTypeOf(timeout).parameter(2).toEqualTypeOf<number>();
  });
});

describe("measure() type signature", () => {
  it("measure return type is ResultAsync<{ readonly result: T; readonly durationMs: number }, E>", () => {
    const clock = {} as ClockService;
    const result = measure(clock, () => ResultAsync.ok("hello"));
    expectTypeOf(result).toEqualTypeOf<
      ResultAsyncType<{ readonly result: string; readonly durationMs: number }, never>
    >();
  });

  it("measure preserves numeric generic T", () => {
    const clock = {} as ClockService;
    const result = measure(clock, () => ResultAsync.ok(42));
    expectTypeOf(result).toEqualTypeOf<
      ResultAsyncType<{ readonly result: number; readonly durationMs: number }, never>
    >();
  });

  it("measure works with fn returning ResultAsync<string, E>", () => {
    const clock = {} as ClockService;
    const result = measure(clock, () => ResultAsync.ok("async-result"));
    expectTypeOf(result).toEqualTypeOf<
      ResultAsyncType<{ readonly result: string; readonly durationMs: number }, never>
    >();
  });

  it("measure accepts ClockService as first parameter", () => {
    expectTypeOf(measure).parameter(0).toMatchTypeOf<ClockService>();
  });
});

describe("retry() type signature", () => {
  it("retry return type preserves the generic T from fn", () => {
    const scheduler = {} as TimerSchedulerService;
    const result = retry(scheduler, () => ResultAsync.ok("ok"), { maxAttempts: 3, delayMs: 100 });
    expectTypeOf(result).toEqualTypeOf<ResultAsyncType<string, never>>();
  });

  it("retry preserves numeric generic T", () => {
    const scheduler = {} as TimerSchedulerService;
    const result = retry(scheduler, () => ResultAsync.ok(42), { maxAttempts: 2, delayMs: 50 });
    expectTypeOf(result).toEqualTypeOf<ResultAsyncType<number, never>>();
  });

  it("retry accepts TimerSchedulerService as first parameter", () => {
    expectTypeOf(retry).parameter(0).toMatchTypeOf<TimerSchedulerService>();
  });

  it("retry accepts RetryOptions as third parameter", () => {
    expectTypeOf(retry).parameter(2).toMatchTypeOf<RetryOptions>();
  });
});

describe("RetryOptions type structure", () => {
  it("RetryOptions has readonly maxAttempts: number", () => {
    expectTypeOf<RetryOptions>().toHaveProperty("maxAttempts").toEqualTypeOf<number>();
  });

  it("RetryOptions has readonly delayMs: number", () => {
    expectTypeOf<RetryOptions>().toHaveProperty("delayMs").toEqualTypeOf<number>();
  });

  it("RetryOptions has optional backoffMultiplier", () => {
    expectTypeOf<RetryOptions>()
      .toHaveProperty("backoffMultiplier")
      .toMatchTypeOf<number | undefined>();
  });

  it("RetryOptions has optional maxDelayMs", () => {
    expectTypeOf<RetryOptions>()
      .toHaveProperty("maxDelayMs")
      .toMatchTypeOf<number | undefined>();
  });
});
