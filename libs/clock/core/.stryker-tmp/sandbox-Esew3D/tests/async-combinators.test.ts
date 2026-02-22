/**
 * Async combinators tests — DoD 10.8
 */
// @ts-nocheck


import { describe, it, expect } from "vitest";
import { delay, timeout, measure, retry } from "../src/async-combinators.js";
import { createVirtualClock } from "../src/testing/virtual-clock.js";
import { createVirtualTimerScheduler } from "../src/testing/virtual-timer.js";

// =============================================================================
// delay
// =============================================================================

describe("delay()", () => {
  it("delegates to scheduler.sleep()", async () => {
    const clock = createVirtualClock();
    const scheduler = createVirtualTimerScheduler(clock);

    let resolved = false;
    const p = delay(scheduler, 100).then(() => {
      resolved = true;
    });

    expect(resolved).toBe(false);
    clock.advance(100);
    await p;
    expect(resolved).toBe(true);
  });

  it("rejects with TypeError for negative ms", async () => {
    const clock = createVirtualClock();
    const scheduler = createVirtualTimerScheduler(clock);

    await expect(delay(scheduler, -1)).rejects.toBeInstanceOf(TypeError);
  });

  it("rejects with TypeError for NaN", async () => {
    const clock = createVirtualClock();
    const scheduler = createVirtualTimerScheduler(clock);

    await expect(delay(scheduler, NaN)).rejects.toBeInstanceOf(TypeError);
  });

  it("rejects with TypeError for Infinity", async () => {
    const clock = createVirtualClock();
    const scheduler = createVirtualTimerScheduler(clock);

    await expect(delay(scheduler, Infinity)).rejects.toBeInstanceOf(TypeError);
  });

  it("resolves for ms === 0", async () => {
    const clock = createVirtualClock();
    const scheduler = createVirtualTimerScheduler(clock);

    const p = delay(scheduler, 0);
    clock.advance(0);
    await expect(p).resolves.toBeUndefined();
  });
});

// =============================================================================
// timeout
// =============================================================================

describe("timeout()", () => {
  it("resolves with value when promise settles before timer", async () => {
    const clock = createVirtualClock();
    const scheduler = createVirtualTimerScheduler(clock);

    const fastPromise = Promise.resolve(42);
    const result = await timeout(scheduler, fastPromise, 1000);
    expect(result).toBe(42);
  });

  it("rejects with ClockTimeoutError when timer fires before promise", async () => {
    const clock = createVirtualClock();
    const scheduler = createVirtualTimerScheduler(clock);

    // A promise that never resolves
    const neverPromise = new Promise<number>(() => {});
    const p = timeout(scheduler, neverPromise, 100);

    // Advance clock to fire the timeout
    clock.advance(100);
    await expect(p).rejects.toMatchObject({ _tag: "ClockTimeoutError" });
  });

  it("cleans up timer handle when promise settles first", async () => {
    const clock = createVirtualClock();
    const scheduler = createVirtualTimerScheduler(clock);

    const fastPromise = Promise.resolve("done");
    await timeout(scheduler, fastPromise, 1000);

    // After resolution, the timeout timer should have been cleared
    // (no pending timers for the timeout)
    expect(scheduler.pendingCount()).toBe(0);
  });

  it("cleans up timer when promise rejects first", async () => {
    const clock = createVirtualClock();
    const scheduler = createVirtualTimerScheduler(clock);

    const failingPromise = Promise.reject(new Error("failure"));
    const p = timeout(scheduler, failingPromise, 1000);

    await expect(p).rejects.toThrow("failure");
    expect(scheduler.pendingCount()).toBe(0);
  });
});

// =============================================================================
// measure
// =============================================================================

describe("measure()", () => {
  it("returns result and durationMs", async () => {
    const clock = createVirtualClock();
    const { result, durationMs } = await measure(clock, () => 42);
    expect(result).toBe(42);
    expect(typeof durationMs).toBe("number");
    expect(durationMs).toBeGreaterThanOrEqual(0);
  });

  it("measures duration using monotonicNow()", async () => {
    const autoAdvanceClock = createVirtualClock({ autoAdvance: 100 });

    // Use a clock that auto-advances so measure captures a non-zero duration
    const { result, durationMs } = await measure(autoAdvanceClock, () => "done");
    expect(result).toBe("done");
    expect(durationMs).toBeGreaterThanOrEqual(0);
  });

  it("returns frozen result object", async () => {
    const clock = createVirtualClock();
    const measured = await measure(clock, () => 99);
    expect(Object.isFrozen(measured)).toBe(true);
  });

  it("does not catch exceptions from fn", async () => {
    const clock = createVirtualClock();
    await expect(
      measure(clock, () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");
  });

  it("works with async fn", async () => {
    const clock = createVirtualClock();
    const { result } = await measure(clock, async () => {
      return "async-result";
    });
    expect(result).toBe("async-result");
  });
});

// =============================================================================
// retry
// =============================================================================

describe("retry()", () => {
  it("returns result on first success", async () => {
    const clock = createVirtualClock();
    const scheduler = createVirtualTimerScheduler(clock);

    const result = await retry(scheduler, async () => 42, {
      maxAttempts: 3,
      delayMs: 100,
    });
    expect(result).toBe(42);
  });

  it("retries on failure and succeeds on second attempt", async () => {
    const clock = createVirtualClock();
    const scheduler = createVirtualTimerScheduler(clock);

    let attempt = 0;

    // Start retry — it will fail on attempt 1 and register a sleep timer
    const p = retry(
      scheduler,
      async () => {
        attempt++;
        if (attempt < 2) throw new Error("fail");
        return "success";
      },
      { maxAttempts: 3, delayMs: 50 }
    );

    // Use blockUntil to wait for the sleep timer to be registered,
    // then advance the clock to fire it
    await scheduler.blockUntil(1, { timeoutMs: 1000 });
    clock.advance(50);

    const result = await p;
    expect(result).toBe("success");
    expect(attempt).toBe(2);
  });

  it("propagates the last error when all attempts fail", async () => {
    const clock = createVirtualClock();
    const scheduler = createVirtualTimerScheduler(clock);

    const lastError = new Error("final failure");

    const p = retry(
      scheduler,
      async () => {
        throw lastError;
      },
      { maxAttempts: 3, delayMs: 50 }
    );

    // Wait for first sleep, advance, wait for second sleep, advance
    await scheduler.blockUntil(1, { timeoutMs: 1000 });
    clock.advance(50);
    await scheduler.blockUntil(1, { timeoutMs: 1000 });
    clock.advance(50);

    await expect(p).rejects.toBe(lastError);
  });

  it("uses scheduler.sleep() between attempts (3 attempts, 2 sleeps)", async () => {
    const clock = createVirtualClock();
    const scheduler = createVirtualTimerScheduler(clock);

    let attempt = 0;

    const p = retry(
      scheduler,
      async () => {
        attempt++;
        if (attempt < 3) throw new Error("retry needed");
        return "ok";
      },
      { maxAttempts: 3, delayMs: 100 }
    );

    // Wait for first sleep then advance
    await scheduler.blockUntil(1, { timeoutMs: 1000 });
    clock.advance(100);
    // Wait for second sleep then advance
    await scheduler.blockUntil(1, { timeoutMs: 1000 });
    clock.advance(100);

    const result = await p;
    expect(result).toBe("ok");
    expect(attempt).toBe(3);
  });

  it("applies exponential backoff", async () => {
    const clock = createVirtualClock();
    const scheduler = createVirtualTimerScheduler(clock);

    let attempt = 0;
    const p = retry(
      scheduler,
      async () => {
        attempt++;
        if (attempt < 3) throw new Error("fail");
        return "done";
      },
      { maxAttempts: 3, delayMs: 100, backoffMultiplier: 2 }
    );

    // Attempt 1 fails, sleep 100ms (100 * 2^0)
    await scheduler.blockUntil(1, { timeoutMs: 1000 });
    clock.advance(100);

    // Attempt 2 fails, sleep 200ms (100 * 2^1)
    await scheduler.blockUntil(1, { timeoutMs: 1000 });
    clock.advance(200);

    const result = await p;
    expect(result).toBe("done");
    expect(attempt).toBe(3);
  });

  it("respects maxDelayMs cap on backoff", async () => {
    const clock = createVirtualClock();
    const scheduler = createVirtualTimerScheduler(clock);

    let attempt = 0;
    const p = retry(
      scheduler,
      async () => {
        attempt++;
        if (attempt < 4) throw new Error("fail");
        return "done";
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

    const result = await p;
    expect(result).toBe("done");
    expect(attempt).toBe(4);
  });
});

// =============================================================================
// Mutation score improvement
// =============================================================================

describe("delay() — error message assertions", () => {
  it("delay(-1) rejects with message containing 'delay:'", async () => {
    const clock = createVirtualClock();
    const scheduler = createVirtualTimerScheduler(clock);
    await expect(delay(scheduler, -1)).rejects.toThrow(/delay:/);
  });

  it("delay(Infinity) rejects with message containing 'delay:'", async () => {
    const clock = createVirtualClock();
    const scheduler = createVirtualTimerScheduler(clock);
    await expect(delay(scheduler, Infinity)).rejects.toThrow(/delay:/);
  });

  it("delay(-1) rejects with message containing 'non-negative'", async () => {
    const clock = createVirtualClock();
    const scheduler = createVirtualTimerScheduler(clock);
    await expect(delay(scheduler, -1)).rejects.toThrow(/non-negative/);
  });
});

describe("timeout() — error message assertions", () => {
  it("ClockTimeoutError message contains the timeout ms value", async () => {
    const clock = createVirtualClock();
    const scheduler = createVirtualTimerScheduler(clock);

    const neverPromise = new Promise<number>(() => {});
    const p = timeout(scheduler, neverPromise, 250);
    clock.advance(250);

    await expect(p).rejects.toMatchObject({
      _tag: "ClockTimeoutError",
      message: expect.stringContaining("250ms"),
    });
  });

  it("ClockTimeoutError message contains 'timed out'", async () => {
    const clock = createVirtualClock();
    const scheduler = createVirtualTimerScheduler(clock);

    const neverPromise = new Promise<number>(() => {});
    const p = timeout(scheduler, neverPromise, 100);
    clock.advance(100);

    await expect(p).rejects.toMatchObject({
      message: expect.stringContaining("timed out"),
    });
  });
});

describe("measure() — durationMs is subtraction, not addition", () => {
  it("measure() returns durationMs=0 for instant fn with non-zero clock start", async () => {
    // Advance clock to a non-zero value before calling measure
    const clock = createVirtualClock({ initialMonotonic: 100 });
    // An instant fn: start=100, end=100 → original: 100-100=0, mutant(+): 100+100=200
    const { durationMs } = await measure(clock, () => "x");
    expect(durationMs).toBe(0);
  });

  it("measure() returns correct durationMs when fn advances clock", async () => {
    // Use a fn that calls clock.advance() so end > start
    const clock = createVirtualClock({ initialMonotonic: 100 });
    const { durationMs } = await measure(clock, () => {
      clock.advance(50);
      return "done";
    });
    // start=100, end=150 → original: 150-100=50, mutant(+): 150+100=250
    expect(durationMs).toBe(50);
  });
});

describe("retry() — attempt count assertions", () => {
  it("retry() with maxAttempts=1 makes exactly 1 attempt before throwing", async () => {
    const clock = createVirtualClock();
    const scheduler = createVirtualTimerScheduler(clock);

    let count = 0;
    const p = retry(scheduler, async () => {
      count++;
      throw new Error("always fails");
    }, { maxAttempts: 1, delayMs: 50 });

    await expect(p).rejects.toThrow("always fails");
    expect(count).toBe(1);
  });

  it("retry() with backoffMultiplier=2: second sleep uses 2x delay", async () => {
    const clock = createVirtualClock();
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
      async () => {
        attempt++;
        if (attempt < 3) throw new Error("fail");
        return "done";
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
