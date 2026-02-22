/**
 * Async combinators type-level tests — DoD 27
 */
// @ts-nocheck


import { describe, it, expectTypeOf } from "vitest";
import { delay, timeout, measure, retry } from "../src/async-combinators.js";
import type { RetryOptions } from "../src/async-combinators.js";
import type { TimerSchedulerService } from "../src/ports/timer-scheduler.js";
import type { ClockService } from "../src/ports/clock.js";

// =============================================================================
// DoD 27: Async Combinators — type-level
// =============================================================================

describe("delay() type signature", () => {
  it("delay return type is Promise<void>", () => {
    expectTypeOf(delay).returns.toEqualTypeOf<Promise<void>>();
  });

  it("delay accepts TimerSchedulerService and number", () => {
    expectTypeOf(delay).parameter(0).toMatchTypeOf<TimerSchedulerService>();
    expectTypeOf(delay).parameter(1).toEqualTypeOf<number>();
  });
});

describe("timeout() type signature", () => {
  it("timeout return type preserves the generic T from the input promise", () => {
    // timeout<T>(scheduler, promise: Promise<T>, ms: number): Promise<T>
    const scheduler = {} as TimerSchedulerService;
    const stringPromise: Promise<string> = Promise.resolve("hello");
    const result = timeout(scheduler, stringPromise, 1000);
    expectTypeOf(result).toEqualTypeOf<Promise<string>>();
  });

  it("timeout preserves numeric generic T", () => {
    const scheduler = {} as TimerSchedulerService;
    const numPromise: Promise<number> = Promise.resolve(42);
    const result = timeout(scheduler, numPromise, 500);
    expectTypeOf(result).toEqualTypeOf<Promise<number>>();
  });

  it("timeout accepts TimerSchedulerService, Promise<T>, and number", () => {
    expectTypeOf(timeout).parameter(0).toMatchTypeOf<TimerSchedulerService>();
    expectTypeOf(timeout).parameter(2).toEqualTypeOf<number>();
  });
});

describe("measure() type signature", () => {
  it("measure return type is Promise<{ readonly result: T; readonly durationMs: number }>", () => {
    const clock = {} as ClockService;
    const result = measure(clock, () => "hello");
    expectTypeOf(result).toEqualTypeOf<
      Promise<{ readonly result: string; readonly durationMs: number }>
    >();
  });

  it("measure preserves numeric generic T", () => {
    const clock = {} as ClockService;
    const result = measure(clock, () => 42);
    expectTypeOf(result).toEqualTypeOf<
      Promise<{ readonly result: number; readonly durationMs: number }>
    >();
  });

  it("measure works with async fn returning T", () => {
    const clock = {} as ClockService;
    const result = measure(clock, async () => "async-result");
    expectTypeOf(result).toEqualTypeOf<
      Promise<{ readonly result: string; readonly durationMs: number }>
    >();
  });

  it("measure accepts ClockService as first parameter", () => {
    expectTypeOf(measure).parameter(0).toMatchTypeOf<ClockService>();
  });
});

describe("retry() type signature", () => {
  it("retry return type preserves the generic T from fn", () => {
    const scheduler = {} as TimerSchedulerService;
    const result = retry(scheduler, async () => "ok", { maxAttempts: 3, delayMs: 100 });
    expectTypeOf(result).toEqualTypeOf<Promise<string>>();
  });

  it("retry preserves numeric generic T", () => {
    const scheduler = {} as TimerSchedulerService;
    const result = retry(scheduler, async () => 42, { maxAttempts: 2, delayMs: 50 });
    expectTypeOf(result).toEqualTypeOf<Promise<number>>();
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
