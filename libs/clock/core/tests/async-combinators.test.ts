/**
 * Async combinators tests — DoD 10.8
 */

import { describe, it, expect } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { delay, timeout, measure, retry } from "../src/async-combinators.js";
import { createVirtualClock } from "../src/testing/virtual-clock.js";
import { createVirtualTimerScheduler } from "../src/testing/virtual-timer.js";

function makeClock(options?: Parameters<typeof createVirtualClock>[0]) {
  const r = createVirtualClock(options);
  if (r.isErr()) throw new Error(`makeClock failed: ${r.error.message}`);
  return r.value;
}

// =============================================================================
// delay
// =============================================================================

describe("delay()", () => {
  it("delegates to scheduler.sleep()", async () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    let resolved = false;
    const p = delay(scheduler, 100).then((r) => {
      if (r.isOk()) resolved = true;
    });

    expect(resolved).toBe(false);
    clock.advance(100);
    await p;
    expect(resolved).toBe(true);
  });

  it("returns err for negative ms", async () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);
    const r = await delay(scheduler, -1);
    expect(r.isErr()).toBe(true);
  });

  it("returns err for NaN", async () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);
    const r = await delay(scheduler, NaN);
    expect(r.isErr()).toBe(true);
  });

  it("returns err for Infinity", async () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);
    const r = await delay(scheduler, Infinity);
    expect(r.isErr()).toBe(true);
  });

  it("resolves ok for ms === 0", async () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);
    const p = delay(scheduler, 0);
    clock.advance(0);
    const r = await p;
    expect(r.isOk()).toBe(true);
  });
});

// =============================================================================
// timeout
// =============================================================================

describe("timeout()", () => {
  it("resolves with ok(value) when operation settles before timer", async () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    const fastOp = ResultAsync.ok(42);
    const r = await timeout(scheduler, fastOp, 1000);
    expect(r.isOk()).toBe(true);
    if (r.isOk()) expect(r.value).toBe(42);
  });

  it("returns err(ClockTimeoutError) when timer fires before operation", async () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    // A ResultAsync that never resolves
    const neverOp = ResultAsync.fromSafePromise(new Promise<number>(() => {}));
    const p = timeout(scheduler, neverOp, 100);

    // Advance clock to fire the timeout
    clock.advance(100);
    const r = await p;
    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error._tag).toBe("ClockTimeoutError");
  });

  it("cleans up timer handle when operation settles first", async () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    const fastOp = ResultAsync.ok("done");
    await timeout(scheduler, fastOp, 1000);

    // After resolution, the timeout timer should have been cleared
    expect(scheduler.pendingCount()).toBe(0);
  });

  it("cleans up timer when operation returns err first", async () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    const failOp = ResultAsync.err(new Error("failure"));
    const r = await timeout(scheduler, failOp, 1000);

    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error.message).toBe("failure");
    expect(scheduler.pendingCount()).toBe(0);
  });
});

// =============================================================================
// measure
// =============================================================================

describe("measure()", () => {
  it("returns ok({result, durationMs})", async () => {
    const clock = makeClock();
    const r = await measure(clock, () => ResultAsync.ok(42));
    expect(r.isOk()).toBe(true);
    if (r.isOk()) {
      expect(r.value.result).toBe(42);
      expect(typeof r.value.durationMs).toBe("number");
      expect(r.value.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("measures duration using monotonicNow()", async () => {
    const autoAdvanceClock = makeClock({ autoAdvance: 100 });

    const r = await measure(autoAdvanceClock, () => ResultAsync.ok("done"));
    expect(r.isOk()).toBe(true);
    if (r.isOk()) {
      expect(r.value.result).toBe("done");
      expect(r.value.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("returns ok with frozen result object", async () => {
    const clock = makeClock();
    const r = await measure(clock, () => ResultAsync.ok(99));
    expect(r.isOk()).toBe(true);
    if (r.isOk()) expect(Object.isFrozen(r.value)).toBe(true);
  });

  it("propagates err from fn", async () => {
    const clock = makeClock();
    const error = new Error("boom");
    const r = await measure(clock, () => ResultAsync.err(error));
    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error).toBe(error);
  });

  it("works with fn returning ok", async () => {
    const clock = makeClock();
    const r = await measure(clock, () => ResultAsync.ok("async-result"));
    expect(r.isOk()).toBe(true);
    if (r.isOk()) expect(r.value.result).toBe("async-result");
  });
});

// =============================================================================
// retry
// =============================================================================

describe("retry()", () => {
  it("returns ok on first success", async () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    const r = await retry(scheduler, () => ResultAsync.ok(42), {
      maxAttempts: 3,
      delayMs: 100,
    });
    expect(r.isOk()).toBe(true);
    if (r.isOk()) expect(r.value).toBe(42);
  });

  it("retries on failure and succeeds on second attempt", async () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    let attempt = 0;

    const p = retry(
      scheduler,
      () => {
        attempt++;
        if (attempt < 2) return ResultAsync.err(new Error("fail"));
        return ResultAsync.ok("success");
      },
      { maxAttempts: 3, delayMs: 50 }
    );

    // Wait for the sleep timer to be registered, then advance the clock to fire it
    await scheduler.blockUntil(1, { timeoutMs: 1000 });
    clock.advance(50);

    const r = await p;
    expect(r.isOk()).toBe(true);
    if (r.isOk()) expect(r.value).toBe("success");
    expect(attempt).toBe(2);
  });

  it("propagates the last err when all attempts fail", async () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    const lastError = new Error("final failure");

    const p = retry(
      scheduler,
      () => ResultAsync.err(lastError),
      { maxAttempts: 3, delayMs: 50 }
    );

    // Wait for first sleep, advance, wait for second sleep, advance
    await scheduler.blockUntil(1, { timeoutMs: 1000 });
    clock.advance(50);
    await scheduler.blockUntil(1, { timeoutMs: 1000 });
    clock.advance(50);

    const r = await p;
    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error).toBe(lastError);
  });

  it("uses scheduler.sleep() between attempts (3 attempts, 2 sleeps)", async () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    let attempt = 0;

    const p = retry(
      scheduler,
      () => {
        attempt++;
        if (attempt < 3) return ResultAsync.err(new Error("retry needed"));
        return ResultAsync.ok("ok");
      },
      { maxAttempts: 3, delayMs: 100 }
    );

    // Wait for first sleep then advance
    await scheduler.blockUntil(1, { timeoutMs: 1000 });
    clock.advance(100);
    // Wait for second sleep then advance
    await scheduler.blockUntil(1, { timeoutMs: 1000 });
    clock.advance(100);

    const r = await p;
    expect(r.isOk()).toBe(true);
    if (r.isOk()) expect(r.value).toBe("ok");
    expect(attempt).toBe(3);
  });

  it("applies exponential backoff", async () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    let attempt = 0;
    const p = retry(
      scheduler,
      () => {
        attempt++;
        if (attempt < 3) return ResultAsync.err(new Error("fail"));
        return ResultAsync.ok("done");
      },
      { maxAttempts: 3, delayMs: 100, backoffMultiplier: 2 }
    );

    // Attempt 1 fails, sleep 100ms (100 * 2^0)
    await scheduler.blockUntil(1, { timeoutMs: 1000 });
    clock.advance(100);

    // Attempt 2 fails, sleep 200ms (100 * 2^1)
    await scheduler.blockUntil(1, { timeoutMs: 1000 });
    clock.advance(200);

    const r = await p;
    expect(r.isOk()).toBe(true);
    if (r.isOk()) expect(r.value).toBe("done");
    expect(attempt).toBe(3);
  });

  it("respects maxDelayMs cap on backoff", async () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    let attempt = 0;
    const p = retry(
      scheduler,
      () => {
        attempt++;
        if (attempt < 4) return ResultAsync.err(new Error("fail"));
        return ResultAsync.ok("done");
      },
      { maxAttempts: 4, delayMs: 100, backoffMultiplier: 10, maxDelayMs: 150 }
    );

    // Attempt 1 fails, sleep min(100*1, 150) = 100ms
    await scheduler.blockUntil(1, { timeoutMs: 1000 });
    clock.advance(100);

    // Attempt 2 fails, sleep min(100*10, 150) = 150ms
    await scheduler.blockUntil(1, { timeoutMs: 1000 });
    clock.advance(150);

    // Attempt 3 fails, sleep min(100*100, 150) = 150ms
    await scheduler.blockUntil(1, { timeoutMs: 1000 });
    clock.advance(150);

    const r = await p;
    expect(r.isOk()).toBe(true);
    if (r.isOk()) expect(r.value).toBe("done");
    expect(attempt).toBe(4);
  });
});

// =============================================================================
// Mutation score improvement
// =============================================================================

describe("delay() — error message assertions", () => {
  it("delay(-1) err message contains 'delay:'", async () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);
    const r = await delay(scheduler, -1);
    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error.message).toMatch(/delay:/);
  });

  it("delay(Infinity) err message contains 'delay:'", async () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);
    const r = await delay(scheduler, Infinity);
    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error.message).toMatch(/delay:/);
  });

  it("delay(-1) err message contains 'non-negative'", async () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);
    const r = await delay(scheduler, -1);
    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error.message).toMatch(/non-negative/);
  });
});

describe("timeout() — error message assertions", () => {
  it("ClockTimeoutError message contains the timeout ms value", async () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    const neverOp = ResultAsync.fromSafePromise(new Promise<number>(() => {}));
    const p = timeout(scheduler, neverOp, 250);
    clock.advance(250);

    const r = await p;
    expect(r.isErr()).toBe(true);
    if (r.isErr()) {
      expect(r.error._tag).toBe("ClockTimeoutError");
      expect(r.error.message).toContain("250ms");
    }
  });

  it("ClockTimeoutError message contains 'timed out'", async () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    const neverOp = ResultAsync.fromSafePromise(new Promise<number>(() => {}));
    const p = timeout(scheduler, neverOp, 100);
    clock.advance(100);

    const r = await p;
    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error.message).toContain("timed out");
  });
});

describe("measure() — durationMs is subtraction, not addition", () => {
  it("measure() returns durationMs=0 for instant fn with non-zero clock start", async () => {
    // Advance clock to a non-zero value before calling measure
    const clock = makeClock({ initialMonotonic: 100 });
    // An instant fn: start=100, end=100 → original: 100-100=0, mutant(+): 100+100=200
    const r = await measure(clock, () => ResultAsync.ok("x"));
    expect(r.isOk()).toBe(true);
    if (r.isOk()) expect(r.value.durationMs).toBe(0);
  });

  it("measure() returns correct durationMs when fn advances clock", async () => {
    const clock = makeClock({ initialMonotonic: 100 });
    const r = await measure(clock, () => {
      clock.advance(50);
      return ResultAsync.ok("done");
    });
    // start=100, end=150 → original: 150-100=50, mutant(+): 150+100=250
    expect(r.isOk()).toBe(true);
    if (r.isOk()) expect(r.value.durationMs).toBe(50);
  });
});

describe("retry() — attempt count assertions", () => {
  it("retry() with maxAttempts=1 makes exactly 1 attempt before returning err", async () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    let count = 0;
    const r = await retry(
      scheduler,
      () => {
        count++;
        return ResultAsync.err(new Error("always fails"));
      },
      { maxAttempts: 1, delayMs: 50 }
    );

    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error.message).toBe("always fails");
    expect(count).toBe(1);
  });

  it("retry() with backoffMultiplier=2: second sleep uses 2x delay", async () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    const delays: number[] = [];
    let attempt = 0;

    // Override sleep to track actual delay values
    const originalSleep = scheduler.sleep.bind(scheduler);
    const trackingScheduler = {
      ...scheduler,
      sleep(ms: number) {
        delays.push(ms);
        return originalSleep(ms);
      },
    };

    const p = retry(
      trackingScheduler,
      () => {
        attempt++;
        if (attempt < 3) return ResultAsync.err(new Error("fail"));
        return ResultAsync.ok("done");
      },
      { maxAttempts: 3, delayMs: 100, backoffMultiplier: 2 }
    );

    // First sleep: 100 * 2^0 = 100
    await scheduler.blockUntil(1, { timeoutMs: 1000 });
    clock.advance(100);
    // Second sleep: 100 * 2^1 = 200
    await scheduler.blockUntil(1, { timeoutMs: 1000 });
    clock.advance(200);

    await p;
    expect(delays[0]).toBe(100);
    expect(delays[1]).toBe(200);
  });
});
