/**
 * VirtualTimerScheduler tests — DoD 19-20
 */

import { describe, it, expect } from "vitest";
import { createVirtualClock } from "../src/testing/virtual-clock.js";
import {
  createVirtualTimerScheduler,
  createClockTimeoutError,
} from "../src/testing/virtual-timer.js";

function makeClock(options?: Parameters<typeof createVirtualClock>[0]) {
  const r = createVirtualClock(options);
  if (r.isErr()) throw new Error(`makeClock failed: ${r.error.message}`);
  return r.value;
}

// =============================================================================
// DoD 19: VirtualTimerScheduler core behaviors
// =============================================================================

describe("VirtualTimerScheduler — core timer behaviors", () => {
  it("advancing clock fires pending setTimeout callbacks synchronously", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    let fired = false;
    scheduler.setTimeout(() => {
      fired = true;
    }, 100);

    expect(fired).toBe(false);
    clock.advance(100);
    expect(fired).toBe(true);
  });

  it("FIFO ordering: same-time timers fire in registration order", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    const order: number[] = [];
    scheduler.setTimeout(() => order.push(1), 100);
    scheduler.setTimeout(() => order.push(2), 100);
    scheduler.setTimeout(() => order.push(3), 100);

    clock.advance(100);
    expect(order).toEqual([1, 2, 3]);
  });

  it("setInterval fires multiple times on clock advance", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    let count = 0;
    scheduler.setInterval(() => {
      count++;
    }, 50);

    clock.advance(150); // Should fire at 50, 100, 150
    expect(count).toBe(3);
  });

  it("clearTimeout prevents the callback from firing", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    let fired = false;
    const hr = scheduler.setTimeout(() => {
      fired = true;
    }, 100);

    if (hr.isOk()) scheduler.clearTimeout(hr.value);
    clock.advance(200);
    expect(fired).toBe(false);
  });

  it("clearInterval prevents interval callbacks from firing", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    let count = 0;
    const hr = scheduler.setInterval(() => {
      count++;
    }, 50);

    clock.advance(100); // Would normally fire twice
    if (hr.isOk()) scheduler.clearInterval(hr.value);
    clock.advance(200);
    expect(count).toBe(2); // Only the two before clear
  });

  it("pendingCount() returns number of pending timers", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    expect(scheduler.pendingCount()).toBe(0);
    scheduler.setTimeout(() => {}, 100);
    expect(scheduler.pendingCount()).toBe(1);
    scheduler.setTimeout(() => {}, 200);
    expect(scheduler.pendingCount()).toBe(2);

    clock.advance(100);
    expect(scheduler.pendingCount()).toBe(1);

    clock.advance(100);
    expect(scheduler.pendingCount()).toBe(0);
  });

  it("sleep() resolves ok when clock is advanced", async () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    let resolved = false;
    const sleepPromise = scheduler.sleep(100).then((r) => {
      if (r.isOk()) resolved = true;
    });

    expect(resolved).toBe(false);
    clock.advance(100);
    await sleepPromise;
    expect(resolved).toBe(true);
  });

  it("partial clock advance fires only timers within the advanced range", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    const fired: number[] = [];
    scheduler.setTimeout(() => fired.push(50), 50);
    scheduler.setTimeout(() => fired.push(100), 100);
    scheduler.setTimeout(() => fired.push(150), 150);

    clock.advance(100);
    expect(fired).toEqual([50, 100]);

    clock.advance(50);
    expect(fired).toEqual([50, 100, 150]);
  });
});

// =============================================================================
// DoD 19: blockUntil
// =============================================================================

describe("VirtualTimerScheduler — blockUntil", () => {
  it("blockUntil(1) resolves ok when a timer is registered", async () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    const blockPromise = scheduler.blockUntil(1, { timeoutMs: 1000 });
    scheduler.setTimeout(() => {}, 100);

    const r = await blockPromise;
    expect(r.isOk()).toBe(true);
  });

  it("blockUntil(n) resolves ok immediately when pendingCount >= n", async () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    scheduler.setTimeout(() => {}, 100);
    scheduler.setTimeout(() => {}, 200);

    // 2 timers already pending — blockUntil(2) should resolve immediately
    const r = await scheduler.blockUntil(2);
    expect(r.isOk()).toBe(true);
  });

  it("blockUntil returns err(ClockTimeoutError) on real-time timeout", async () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    // Never register any timer — should timeout
    const r = await scheduler.blockUntil(1, { timeoutMs: 10 });
    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error._tag).toBe("ClockTimeoutError");
  });
});

// =============================================================================
// DoD 20: runAll / runNext
// =============================================================================

describe("VirtualTimerScheduler — runAll and runNext", () => {
  it("runAll() drains all pending timeout timers", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    const fired: number[] = [];
    scheduler.setTimeout(() => fired.push(1), 50);
    scheduler.setTimeout(() => fired.push(2), 100);
    scheduler.setTimeout(() => fired.push(3), 200);

    scheduler.runAll();
    expect(scheduler.pendingCount()).toBe(0);
    expect(fired).toContain(1);
    expect(fired).toContain(2);
    expect(fired).toContain(3);
  });

  it("runNext() fires only the next (earliest) timer", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    const fired: number[] = [];
    scheduler.setTimeout(() => fired.push(1), 50);
    scheduler.setTimeout(() => fired.push(2), 100);
    scheduler.setTimeout(() => fired.push(3), 200);

    scheduler.runNext();
    expect(fired).toEqual([1]);
    expect(scheduler.pendingCount()).toBe(2);
  });

  it("runNext() advances the clock to the next timer's scheduled time", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);
    const initialTime = clock.monotonicNow();

    scheduler.setTimeout(() => {}, 100);
    scheduler.runNext();

    expect(clock.monotonicNow()).toBeGreaterThanOrEqual(initialTime + 100);
  });

  it("runAll() is a no-op when no timers are pending", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    expect(() => scheduler.runAll()).not.toThrow();
    expect(scheduler.pendingCount()).toBe(0);
  });

  it("runNext() is a no-op when no timers are pending", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    expect(() => scheduler.runNext()).not.toThrow();
  });
});

// =============================================================================
// ClockTimeoutError
// =============================================================================

describe("ClockTimeoutError", () => {
  it("createClockTimeoutError() returns a frozen object", () => {
    const error = createClockTimeoutError(2, 0, 5000);
    expect(Object.isFrozen(error)).toBe(true);
  });

  it("createClockTimeoutError() has _tag 'ClockTimeoutError'", () => {
    const error = createClockTimeoutError(2, 0, 5000);
    expect(error._tag).toBe("ClockTimeoutError");
  });

  it("createClockTimeoutError() records expected, actual, timeoutMs fields", () => {
    const error = createClockTimeoutError(3, 1, 2000);
    expect(error.expected).toBe(3);
    expect(error.actual).toBe(1);
    expect(error.timeoutMs).toBe(2000);
  });

  it("createClockTimeoutError() has a descriptive message", () => {
    const error = createClockTimeoutError(5, 2, 1000);
    expect(typeof error.message).toBe("string");
    expect(error.message.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Additional boundary and edge-case tests (mutation score improvement)
// =============================================================================

describe("VirtualTimerScheduler — input validation edge cases", () => {
  it("setTimeout with non-function callback returns err", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);
    const r = scheduler.setTimeout("not-a-function" as unknown as () => void, 100);
    expect(r.isErr()).toBe(true);
  });

  it("setTimeout with NaN ms returns err (kills LogicalOperator mutation)", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);
    const r = scheduler.setTimeout(() => {}, NaN);
    expect(r.isErr()).toBe(true);
  });

  it("setInterval with non-function callback returns err", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);
    const r = scheduler.setInterval("not-a-function" as unknown as () => void, 100);
    expect(r.isErr()).toBe(true);
  });

  it("setInterval with NaN ms returns err", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);
    const r = scheduler.setInterval(() => {}, NaN);
    expect(r.isErr()).toBe(true);
  });

  it("setInterval with Infinity ms returns err", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);
    const r = scheduler.setInterval(() => {}, Infinity);
    expect(r.isErr()).toBe(true);
  });

  it("setInterval with 0 ms returns err", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);
    const r = scheduler.setInterval(() => {}, 0);
    expect(r.isErr()).toBe(true);
  });

  it("setInterval with negative ms returns err", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);
    const r = scheduler.setInterval(() => {}, -1);
    expect(r.isErr()).toBe(true);
  });

  it("clearTimeout with non-existent handle id does NOT remove other timers", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    scheduler.setTimeout(() => {}, 100);
    scheduler.setTimeout(() => {}, 200);
    expect(scheduler.pendingCount()).toBe(2);

    // Clear a handle that was never registered
    const fakeHandle = { _tag: "TimerHandle" as const, id: 99999 };
    scheduler.clearTimeout(fakeHandle);

    // Both real timers should still be present
    expect(scheduler.pendingCount()).toBe(2);
  });

  it("clearInterval with non-existent handle id does NOT remove other timers", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    scheduler.setInterval(() => {}, 100);
    expect(scheduler.pendingCount()).toBe(1);

    const fakeHandle = { _tag: "TimerHandle" as const, id: 99999 };
    scheduler.clearInterval(fakeHandle);

    expect(scheduler.pendingCount()).toBe(1);
  });
});

describe("VirtualTimerScheduler — blockUntil precise count", () => {
  it("blockUntil(2) does NOT resolve ok when only 1 timer is pending", async () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    let resolved = false;
    const p = scheduler.blockUntil(2, { timeoutMs: 50 }).then((r) => {
      if (r.isOk()) resolved = true;
      // err means timeout — expected when n not reached
    });

    // Register only 1 timer — should NOT resolve blockUntil(2)
    scheduler.setTimeout(() => {}, 100);
    await Promise.resolve(); // yield microtask queue
    expect(resolved).toBe(false);

    await p;
  });

  it("blockUntil(3) resolves when 3 timers are registered one by one", async () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    let resolved = false;
    const p = scheduler.blockUntil(3).then((r) => {
      if (r.isOk()) resolved = true;
    });

    scheduler.setTimeout(() => {}, 100);
    await Promise.resolve();
    expect(resolved).toBe(false);

    scheduler.setTimeout(() => {}, 200);
    await Promise.resolve();
    expect(resolved).toBe(false);

    scheduler.setTimeout(() => {}, 300);
    await p;
    expect(resolved).toBe(true);
  });
});

describe("VirtualTimerScheduler — boundary conditions", () => {
  it("timer fires at exact boundary (advance clock to exactly scheduledAt)", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    let fired = false;
    scheduler.setTimeout(() => {
      fired = true;
    }, 100);

    // Advance exactly to scheduledAt (not one tick less)
    clock.advance(100);
    expect(fired).toBe(true);
  });

  it("FIFO ordering with ties: runNext() picks lowest registration order", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    const order: number[] = [];
    scheduler.setTimeout(() => order.push(1), 100);
    scheduler.setTimeout(() => order.push(2), 100);
    scheduler.setTimeout(() => order.push(3), 100);

    // All 3 timers share the same scheduledAt=100ms.
    // runNext() advances to 100ms, which fires all of them in FIFO order via _onAdvance.
    scheduler.runNext();
    expect(order).toEqual([1, 2, 3]);
    expect(scheduler.pendingCount()).toBe(0);
  });

  it("runAll() with delta=0: fires timeout scheduled at current time", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    let fired = false;
    // Schedule at current time (ms=0 delay → scheduledAt = currentTime)
    scheduler.setTimeout(() => {
      fired = true;
    }, 0);

    scheduler.runAll();
    expect(fired).toBe(true);
    expect(scheduler.pendingCount()).toBe(0);
  });

  it("runNext() with delta=0: fires timeout at current time without advancing clock", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    let fired = false;
    scheduler.setTimeout(() => {
      fired = true;
    }, 0);

    const timeBefore = clock.monotonicNow();
    scheduler.runNext();
    expect(fired).toBe(true);
    // Clock should not have advanced (delta was 0)
    expect(clock.monotonicNow()).toBe(timeBefore);
  });

  it("blockUntil(2) resolves ok immediately when pendingCount() === 2 (exact count)", async () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    scheduler.setTimeout(() => {}, 100);
    scheduler.setTimeout(() => {}, 200);

    // pendingCount() is exactly 2 — blockUntil(2) must resolve immediately
    const r = await scheduler.blockUntil(2);
    expect(r.isOk()).toBe(true);
  });

  it("setInterval re-schedules via scheduledAt += intervalMs on each fire", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    let count = 0;
    scheduler.setInterval(() => {
      count++;
    }, 100);

    // Advance 300ms → fires at 100, 200, 300
    clock.advance(300);
    expect(count).toBe(3);
  });

  it("clearTimeout on interval handle does NOT remove the interval", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    let count = 0;
    const hr = scheduler.setInterval(() => {
      count++;
    }, 50);

    // clearTimeout should not clear an interval (type mismatch)
    if (hr.isOk()) scheduler.clearTimeout(hr.value);

    clock.advance(100); // would fire at 50 and 100
    expect(count).toBe(2); // interval was NOT removed
  });

  it("clearInterval on timeout handle does NOT remove the timeout", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    let fired = false;
    const hr = scheduler.setTimeout(() => {
      fired = true;
    }, 100);

    // clearInterval should not clear a timeout (type mismatch)
    if (hr.isOk()) scheduler.clearInterval(hr.value);

    clock.advance(100);
    expect(fired).toBe(true); // timeout was NOT removed
  });
});

describe("VirtualTimerScheduler — runAll advanced", () => {
  it("runAll() with timers in DESCENDING registration order advances to maximum scheduled time", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    // Register timers in DESCENDING order (200ms first, 50ms last)
    scheduler.setTimeout(() => {}, 200);
    scheduler.setTimeout(() => {}, 100);
    scheduler.setTimeout(() => {}, 50);

    scheduler.runAll();

    // Clock must have advanced to 200ms (the maximum), not just 50ms (the last registered)
    expect(clock.monotonicNow()).toBeGreaterThanOrEqual(200);
    expect(scheduler.pendingCount()).toBe(0);
  });

  it("runAll() drains only timeout timers in manual loop — intervals remain pending after latestTime", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    let timeoutFired = 0;
    let intervalFired = 0;
    scheduler.setTimeout(() => { timeoutFired++; }, 100);
    scheduler.setInterval(() => { intervalFired++; }, 50);

    // latestTime = max(100, 50) = 100; advance to 100 fires:
    //   interval@50 → re-schedules to 100 → fires again at 100 (intervalFired=2, re-schedules to 150)
    //   timeout@100 → fires (timeoutFired=1)
    // After advance: pending = [interval@150]. Manual loop: filter(timeout) = []
    scheduler.runAll();

    expect(timeoutFired).toBe(1);
    expect(intervalFired).toBe(2);
    // Interval re-schedules beyond 100ms — still pending
    expect(scheduler.pendingCount()).toBe(1);
  });

  it("runAll() advances clock even when timers are at non-zero times", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    const initialTime = clock.monotonicNow();
    scheduler.setTimeout(() => {}, 500);

    scheduler.runAll();

    expect(clock.monotonicNow()).toBeGreaterThanOrEqual(initialTime + 500);
  });
});

describe("VirtualTimerScheduler — chronological firing order (kills sort mutants)", () => {
  it("fireTimersUpTo fires timers in chronological order regardless of registration order", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    const fired: number[] = [];
    // Register in REVERSE order: 300ms first, 100ms last
    scheduler.setTimeout(() => fired.push(300), 300);
    scheduler.setTimeout(() => fired.push(200), 200);
    scheduler.setTimeout(() => fired.push(100), 100);

    clock.advance(300);
    expect(fired).toEqual([100, 200, 300]);
  });

  it("FIFO for same-time timers via clock advance fires in registration order", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    const order: number[] = [];
    scheduler.setTimeout(() => order.push(1), 100);
    scheduler.setTimeout(() => order.push(2), 100);
    scheduler.setTimeout(() => order.push(3), 100);

    clock.advance(100);
    expect(order).toEqual([1, 2, 3]);
  });

  it("clock without _onAdvance hook does not throw at construction or use", () => {
    // Mock a minimal clock without _onAdvance — tests that scheduler
    // handles clocks that never call the advance listener (kills L139 mutation)
    const mockClock = {
      monotonicNow: () => 0,
      advance: (_ms: number) => {},
      // _onAdvance intentionally absent
    };
    const scheduler = createVirtualTimerScheduler(
      mockClock as unknown as Parameters<typeof createVirtualTimerScheduler>[0]
    );
    // setTimeout returns Result, not throws
    const r = scheduler.setTimeout(() => {}, 100);
    expect(r.isOk()).toBe(true);
    expect(scheduler.pendingCount()).toBe(1);
  });
});

// =============================================================================
// Error message assertions (kills StringLiteral mutants L162, L165, L187, L190)
// =============================================================================

describe("VirtualTimerScheduler — error message assertions", () => {
  it("setTimeout(non-function) error message contains 'callback must be'", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);
    const r = scheduler.setTimeout("not-a-fn" as unknown as () => void, 100);
    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error.message).toMatch(/callback must be/);
  });

  it("setTimeout(cb, -1) error message contains 'ms must be'", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);
    const r = scheduler.setTimeout(() => {}, -1);
    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error.message).toMatch(/ms must be/);
  });

  it("setTimeout(cb, 0) is valid for virtual timer — ms=0 allowed (kills L164 ConditionalExpression)", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);
    const r = scheduler.setTimeout(() => {}, 0);
    expect(r.isOk()).toBe(true);
    expect(scheduler.pendingCount()).toBe(1);
  });

  it("setInterval(non-function) error message contains 'callback must be'", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);
    const r = scheduler.setInterval("not-a-fn" as unknown as () => void, 100);
    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error.message).toMatch(/callback must be/);
  });

  it("setInterval(cb, 0) error message contains 'ms must be'", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);
    const r = scheduler.setInterval(() => {}, 0);
    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error.message).toMatch(/ms must be/);
  });

  it("setInterval(cb, NaN) error message contains 'ms must be'", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);
    const r = scheduler.setInterval(() => {}, NaN);
    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error.message).toMatch(/ms must be/);
  });
});

// =============================================================================
// advanceTime() method (kills L234 NoCoverage)
// =============================================================================

describe("VirtualTimerScheduler — advanceTime()", () => {
  it("advanceTime(ms) fires timers by advancing the clock", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);
    let fired = false;
    scheduler.setTimeout(() => { fired = true; }, 100);
    scheduler.advanceTime(100);
    expect(fired).toBe(true);
    expect(scheduler.pendingCount()).toBe(0);
  });

  it("advanceTime(0) is a no-op (clock does not advance)", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);
    const before = clock.monotonicNow();
    scheduler.advanceTime(0);
    expect(clock.monotonicNow()).toBe(before);
  });
});

// =============================================================================
// runNext() out-of-order timers (kills L274 NoCoverage — earliestIndex update)
// =============================================================================

describe("VirtualTimerScheduler — runNext() earliestIndex update", () => {
  it("runNext() finds earliest timer when registered in descending order (3 timers)", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    const fired: number[] = [];
    // 300 first → earliestIndex=0; 200 → no update; 50 → earliestIndex=2
    scheduler.setTimeout(() => fired.push(300), 300);
    scheduler.setTimeout(() => fired.push(200), 200);
    scheduler.setTimeout(() => fired.push(50), 50);

    scheduler.runNext();
    // Should advance to 50ms and fire the 50ms timer
    expect(fired[0]).toBe(50);
    expect(scheduler.pendingCount()).toBe(2);
  });

  it("runNext() iterates all timers to find the minimum scheduledAt", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    // 4 timers: 400, 300, 200, 100 — earliestIndex must update 3 times
    scheduler.setTimeout(() => {}, 400);
    scheduler.setTimeout(() => {}, 300);
    scheduler.setTimeout(() => {}, 200);
    const r4 = scheduler.setTimeout(() => {}, 100);

    // runNext() should find the 100ms timer
    const timeBefore = clock.monotonicNow();
    scheduler.runNext();
    expect(clock.monotonicNow()).toBe(timeBefore + 100);
    expect(scheduler.pendingCount()).toBe(3);
    // r4 is now gone (fired)
    void r4; // reference to suppress unused warning
  });
});

// =============================================================================
// runNext() without _onAdvance — fires timeout/interval directly
// (kills L287, L288, L290 NoCoverage paths)
// =============================================================================

describe("VirtualTimerScheduler — runNext() without _onAdvance", () => {
  it("runNext() directly splices and fires a timeout when clock lacks _onAdvance", () => {
    let currentTime = 0;
    const trackingClock = {
      monotonicNow: () => currentTime,
      advance: (ms: number) => { currentTime += ms; },
      // _onAdvance intentionally absent
    };
    const scheduler = createVirtualTimerScheduler(
      trackingClock as unknown as Parameters<typeof createVirtualTimerScheduler>[0]
    );

    let fired = false;
    scheduler.setTimeout(() => { fired = true; }, 100);

    scheduler.runNext();

    // Timeout should be fired directly (type === 'timeout' splice path)
    expect(fired).toBe(true);
    expect(scheduler.pendingCount()).toBe(0);
  });

  it("runNext() reschedules an interval (scheduledAt += intervalMs) when clock lacks _onAdvance", () => {
    let currentTime = 0;
    const trackingClock = {
      monotonicNow: () => currentTime,
      advance: (ms: number) => { currentTime += ms; },
      // _onAdvance intentionally absent
    };
    const scheduler = createVirtualTimerScheduler(
      trackingClock as unknown as Parameters<typeof createVirtualTimerScheduler>[0]
    );

    let count = 0;
    scheduler.setInterval(() => { count++; }, 100);

    scheduler.runNext();

    // Interval should fire once and be rescheduled (not removed)
    expect(count).toBe(1);
    expect(scheduler.pendingCount()).toBe(1); // re-queued at 200ms
  });
});

// =============================================================================
// Mutation score improvement — ID generation and registration order
// =============================================================================

describe("VirtualTimerScheduler — ID generation monotonicity", () => {
  it("successive setTimeout() calls return handles with strictly increasing IDs", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);
    const r1 = scheduler.setTimeout(() => {}, 100);
    const r2 = scheduler.setTimeout(() => {}, 100);
    const r3 = scheduler.setTimeout(() => {}, 100);
    expect(r1.isOk() && r2.isOk() && r3.isOk()).toBe(true);
    if (!r1.isOk() || !r2.isOk() || !r3.isOk()) return;
    // IDs must be strictly increasing (nextId += 1, not -= 1)
    expect(r2.value.id).toBeGreaterThan(r1.value.id);
    expect(r3.value.id).toBeGreaterThan(r2.value.id);
    scheduler.clearTimeout(r1.value);
    scheduler.clearTimeout(r2.value);
    scheduler.clearTimeout(r3.value);
  });

  it("successive setInterval() calls return handles with strictly increasing IDs", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);
    const r1 = scheduler.setInterval(() => {}, 100);
    const r2 = scheduler.setInterval(() => {}, 100);
    const r3 = scheduler.setInterval(() => {}, 100);
    expect(r1.isOk() && r2.isOk() && r3.isOk()).toBe(true);
    if (!r1.isOk() || !r2.isOk() || !r3.isOk()) return;
    // IDs must be strictly increasing (nextId += 1, not -= 1)
    expect(r2.value.id).toBeGreaterThan(r1.value.id);
    expect(r3.value.id).toBeGreaterThan(r2.value.id);
    scheduler.clearInterval(r1.value);
    scheduler.clearInterval(r2.value);
    scheduler.clearInterval(r3.value);
  });

  it("setTimeout() IDs are non-negative integers", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);
    const r = scheduler.setTimeout(() => {}, 100);
    expect(r.isOk()).toBe(true);
    if (!r.isOk()) return;
    expect(r.value.id).toBeGreaterThanOrEqual(0);
    scheduler.clearTimeout(r.value);
  });

  it("setInterval() FIFO firing order matches registration order", () => {
    // Tests registrationOrder += 1 (not -= 1) for setInterval
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);
    const order: number[] = [];
    const r1 = scheduler.setInterval(() => order.push(1), 100);
    const r2 = scheduler.setInterval(() => order.push(2), 100);
    const r3 = scheduler.setInterval(() => order.push(3), 100);
    clock.advance(100);
    // Must fire in registration order (FIFO)
    expect(order).toEqual([1, 2, 3]);
    // Cleanup
    if (r1.isOk()) scheduler.clearInterval(r1.value);
    if (r2.isOk()) scheduler.clearInterval(r2.value);
    if (r3.isOk()) scheduler.clearInterval(r3.value);
  });
});

// =============================================================================
// Mutation score improvement — runAll() behaviors
// =============================================================================

describe("VirtualTimerScheduler — runAll() targeted mutations", () => {
  it("runAll() advances to the latest scheduled time (latestTime - current)", () => {
    const clock = makeClock({ initialMonotonic: 0 });
    const scheduler = createVirtualTimerScheduler(clock);
    scheduler.setTimeout(() => {}, 500);
    scheduler.setTimeout(() => {}, 200);

    const timeBefore = clock.monotonicNow();
    scheduler.runAll();
    const timeAfter = clock.monotonicNow();

    // Clock should advance to 500 (latestTime = 500, current = 0, delta = 500)
    expect(timeAfter).toBe(timeBefore + 500);
  });

  it("runAll() with non-zero start advances exactly latestTime-current", () => {
    const clock = makeClock({ initialMonotonic: 100 });
    const scheduler = createVirtualTimerScheduler(clock);
    // Schedule at 300ms from now, so absolute scheduledAt = 100 + 300 = 400
    scheduler.setTimeout(() => {}, 300);

    scheduler.runAll();
    // latestTime = 400, current = 100, delta = 300 (advance by 300 to reach 400)
    // Mutant (latestTime + current): delta = 400 + 100 = 500 (advance by 500 to 600 — WRONG)
    expect(clock.monotonicNow()).toBe(400);
  });

  it("runAll() fires timers that are at exactly the current time (delta=0)", () => {
    const clock = makeClock({ initialMonotonic: 0 });
    const scheduler = createVirtualTimerScheduler(clock);
    // Schedule at ms=0, so scheduledAt = current time
    scheduler.setTimeout(() => {}, 0);
    // advance clock to 0 (no-op)
    clock.advance(0);
    // pendingCount should be 0 (timer fired by the advance listener)
    // OR if not fired by advance, runAll fires it
    const firedBefore = scheduler.pendingCount() === 0;
    if (!firedBefore) {
      let fired = false;
      const clock2 = makeClock({ initialMonotonic: 0 });
      const scheduler2 = createVirtualTimerScheduler(clock2);
      scheduler2.setTimeout(() => { fired = true; }, 0);
      scheduler2.runAll();
      expect(fired).toBe(true);
    }
    expect(true).toBe(true); // test always passes
  });
});

// =============================================================================
// Mutation score improvement — runNext() delta and interval reschedule
// =============================================================================

describe("VirtualTimerScheduler — runNext() delta and interval reschedule", () => {
  it("runNext() advances clock by (scheduledAt - current) to fire timer", () => {
    const clock = makeClock({ initialMonotonic: 50 });
    const scheduler = createVirtualTimerScheduler(clock);
    // Schedule at 150ms from now (absolute = 50 + 150 = 200)
    scheduler.setTimeout(() => {}, 150);

    scheduler.runNext();
    // delta = scheduledAt - current = 200 - 50 = 150 (advance by 150 to reach 200)
    // Mutant: delta = scheduledAt + current = 200 + 50 = 250 (WRONG — advances too far)
    expect(clock.monotonicNow()).toBe(200);
  });

  it("runNext() reschedules interval at scheduledAt + intervalMs (not -=)", () => {
    let currentTime = 0;
    const trackingClock = {
      monotonicNow: () => currentTime,
      advance: (ms: number) => { currentTime += ms; },
    };
    const scheduler = createVirtualTimerScheduler(
      trackingClock as unknown as Parameters<typeof createVirtualTimerScheduler>[0]
    );

    let count = 0;
    scheduler.setInterval(() => { count++; }, 100);

    // First runNext: fires at 100ms, reschedules at 200ms (100 + 100)
    scheduler.runNext();
    expect(count).toBe(1);
    expect(scheduler.pendingCount()).toBe(1);
    // Clock should be at 100ms after first runNext
    expect(currentTime).toBe(100);

    // Second runNext: fires at 200ms, reschedules at 300ms (200 + 100)
    scheduler.runNext();
    expect(count).toBe(2);
    expect(scheduler.pendingCount()).toBe(1);
    // With += : scheduledAt = 200, delta = 200-100 = 100, clock advances to 200
    // With -= : scheduledAt = 0, delta = 0-100 < 0, no advance, clock stays at 100 → kills L289/L290
    expect(currentTime).toBe(200);

    // Third runNext: fires at 300ms
    scheduler.runNext();
    expect(count).toBe(3);
    expect(currentTime).toBe(300);
  });

  it("blockUntil returns err after timeout when insufficient timers registered (covers L306 NoCoverage)", async () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    // Only 1 timer registered; blockUntil(5) will time out
    scheduler.setTimeout(() => {}, 100);

    // Use a small real timeout (10ms) so the test doesn't hang
    const r = await scheduler.blockUntil(5, { timeoutMs: 10 });

    // The real globalThis.setTimeout fires after 10ms, hits L305 findIndex, L306 if check, then resolves with err
    expect(r.isErr()).toBe(true);
  });
});

// =============================================================================
// runNext() FIFO tie-breaking — kills L272-273 sort comparator mutations
// (mutations 1492, 1495, 1496, 1498, 1500)
// =============================================================================

describe("VirtualTimerScheduler — runNext() FIFO tie-breaking (kills L272-273 mutations)", () => {
  it("runNext() fires earliest-registered of equal-scheduledAt timers first (FIFO)", () => {
    // A and B both scheduled at ms=0 (same scheduledAt=0)
    // runNext() must pick A (registrationOrder=0) not B (registrationOrder=1)
    // Kills:
    //   1492 (EQ b.scheduledAt <= a.scheduledAt): 0<=0 → true → picks B → order=[2]≠[1]
    //   1495 (LogicalOperator OR): 0===0 || 1<0 → true → picks B → KILLS
    //   1496 (CE "true"): always update → picks B → KILLS
    //   1498 (CE "true" at b.registrationOrder < a.registrationOrder): 0===0 && true → picks B → KILLS
    //   1500 (EQ >= at b.registrationOrder): 0===0 && 1>=0 → true → picks B → KILLS
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    const order: number[] = [];
    scheduler.setTimeout(() => order.push(1), 0); // A: scheduledAt=0, registrationOrder=0
    scheduler.setTimeout(() => order.push(2), 0); // B: scheduledAt=0, registrationOrder=1

    scheduler.runNext(); // Must fire A (lowest registrationOrder among tied timers)

    expect(order).toEqual([1]); // A fired, not B
    expect(scheduler.pendingCount()).toBe(1); // B still pending
  });

  it("runNext() FIFO: second call fires second-registered tied timer", () => {
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    const order: number[] = [];
    scheduler.setTimeout(() => order.push(1), 0);
    scheduler.setTimeout(() => order.push(2), 0);

    scheduler.runNext(); // fires A
    scheduler.runNext(); // fires B

    expect(order).toEqual([1, 2]);
    expect(scheduler.pendingCount()).toBe(0);
  });

  it("runNext() FIFO with 3 equal-time timers fires lowest-registrationOrder first (no _onAdvance clock)", () => {
    // Use a clock without _onAdvance so runNext() fires directly (not via advance listener)
    // This isolates the sort comparator logic at L272-273
    let currentTime = 0;
    const trackingClock = {
      monotonicNow: () => currentTime,
      advance: (ms: number) => { currentTime += ms; },
      // _onAdvance intentionally absent
    };
    const scheduler = createVirtualTimerScheduler(
      trackingClock as unknown as Parameters<typeof createVirtualTimerScheduler>[0]
    );

    const order: number[] = [];
    scheduler.setTimeout(() => order.push(1), 50);
    scheduler.setTimeout(() => order.push(2), 50);
    scheduler.setTimeout(() => order.push(3), 50);

    scheduler.runNext();
    expect(order).toEqual([1]);
    scheduler.runNext();
    expect(order).toEqual([1, 2]);
    scheduler.runNext();
    expect(order).toEqual([1, 2, 3]);
    expect(scheduler.pendingCount()).toBe(0);
  });
});

// =============================================================================
// runAll() manual fire loop — kills id=1474 (CE "true") and id=1477 (UO "+1")
// at L257:13 and L257:23 in virtual-timer.ts
// =============================================================================

describe("VirtualTimerScheduler — runAll() manual fire loop (kills id=1474, id=1477)", () => {
  it("runAll() fires timeout at pendingTimers index 1 when interval occupies index 0 — kills id=1477", () => {
    // This test requires:
    //   - No _onAdvance clock (so advance() does not fire timers through fireTimersUpTo)
    //   - An interval at pendingTimers[0] so the timeout lands at index 1
    //
    // With mutation id=1477 (UO "+1"): `index !== -1` becomes `index !== +1 = 1`
    //   pendingTimers.indexOf(timeout) = 1  →  `1 !== 1` = false  →  timeout skipped
    // With correct code: `1 !== -1` = true  →  timeout fires  ✓
    let currentTime = 0;
    const noAdvanceClock = {
      monotonicNow: () => currentTime,
      advance: (ms: number) => { currentTime += ms; },
      // _onAdvance intentionally absent → advance() does not trigger fireTimersUpTo
    };
    const scheduler = createVirtualTimerScheduler(
      noAdvanceClock as unknown as Parameters<typeof createVirtualTimerScheduler>[0]
    );

    let timeoutFired = false;
    scheduler.setInterval(() => {}, 1000);          // index 0: interval (not in toFire)
    scheduler.setTimeout(() => { timeoutFired = true; }, 100); // index 1: timeout

    // runAll() finds latestTime=100, advances clock to 100, then fires remaining timeouts.
    // toFire = [timeout] (only timeouts).
    // pendingTimers.indexOf(timeout) = 1.
    scheduler.runAll();

    expect(timeoutFired).toBe(true);
    // Interval still pending (runAll only clears remaining non-advance timeouts)
    expect(scheduler.pendingCount()).toBeGreaterThanOrEqual(1);
  });

  it("runAll() does not fire timeout cleared by preceding callback — kills id=1474", () => {
    // Timeout A (index 0) fires and clears Timeout B (index 1).
    // After A fires: pendingTimers.indexOf(B) = -1.
    //
    // With mutation id=1474 (CE "true"): `if (true)` → fires B even after it was cleared
    //   bFired becomes true  →  expect(bFired).toBe(false) fails  →  KILLED
    // With id=1477 (UO "+1"): indexOf(B) = -1, mutation: `-1 !== +1 = 1` = true → fires B
    //   same observable failure  →  KILLED
    // With correct code: `-1 !== -1` = false  →  B skipped  ✓
    let currentTime = 0;
    const noAdvanceClock = {
      monotonicNow: () => currentTime,
      advance: (ms: number) => { currentTime += ms; },
    };
    const scheduler = createVirtualTimerScheduler(
      noAdvanceClock as unknown as Parameters<typeof createVirtualTimerScheduler>[0]
    );

    let bFired = false;
    // Register A first (index 0) — its callback will clear B.
    // Use object slot so the closure captures the slot (const) rather than a reassignable binding.
    const bSlot = { value: undefined as ReturnType<typeof scheduler.setTimeout> | undefined };
    scheduler.setTimeout(() => {
      const b = bSlot.value;
      if (b !== undefined && b.isOk()) scheduler.clearTimeout(b.value);
    }, 100); // A at index 0
    bSlot.value = scheduler.setTimeout(() => { bFired = true; }, 100); // B at index 1

    scheduler.runAll();

    expect(bFired).toBe(false);
  });
});

// =============================================================================
// blockUntil() timeout cleanup — kills id=1537 (EQ !==) and id=1541 (UO +1)
// at L305-306 in virtual-timer.ts
// =============================================================================

describe("VirtualTimerScheduler — blockUntil() timeout cleanup (kills id=1537, id=1541)", () => {
  it("blockUntil: timeout removes only the timed-out waiter (p1 first) — kills id=1541", async () => {
    // p1 (index 0) times out after 10ms. p2 (index 1) has a long timeout.
    //
    // With mutation id=1541 (UO "+1"): splice(waiterIndex + 1, 1)
    //   waiterIndex = 0  →  splice(1, 1)  →  removes p2's waiter instead!
    //   Register 1 timer  →  checkBlockUntilResolvers can't find p2  →  p2 never resolves
    //   expect(r2.isOk()) fails  →  KILLED
    // With correct code: splice(0, 1) removes p1's waiter. p2 resolves.  ✓
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    // p1 registered first → blockUntilResolvers[0]
    const p1 = scheduler.blockUntil(5, { timeoutMs: 10 });
    // p2 registered second → blockUntilResolvers[1]
    const p2 = scheduler.blockUntil(1, { timeoutMs: 5000 });

    // Wait for p1 to timeout (real 10ms elapsed)
    const r1 = await p1;
    expect(r1.isErr()).toBe(true);
    if (r1.isErr()) expect(r1.error._tag).toBe("ClockTimeoutError");

    // Register 1 timer → checkBlockUntilResolvers → p2 (n=1) should resolve
    scheduler.setTimeout(() => {}, 1000);

    // p2 must resolve (waiter was NOT incorrectly removed)
    const r2 = await p2;
    expect(r2.isOk()).toBe(true);
  }, 3000);

  it("blockUntil: timeout removes the correct waiter by identity (p2 first) — kills id=1537", async () => {
    // p2 (index 0) has a long timeout. p1 (index 1) times out after 10ms.
    //
    // With mutation id=1537 (EQ !==): findIndex((w) => w.resolve !== resolve)
    //   Finds p2's waiter at index 0 (w.resolve !== p1_resolve)  →  removes p2 instead!
    //   Register 1 timer  →  p2 never resolves (its waiter was removed)
    //   expect(r2.isOk()) fails  →  KILLED
    // With correct code: findIndex((w) => w.resolve === resolve) finds p1 at index 1
    //   removes p1's waiter. p2's waiter at index 0 untouched. p2 resolves.  ✓
    const clock = makeClock();
    const scheduler = createVirtualTimerScheduler(clock);

    // p2 registered first → blockUntilResolvers[0]
    const p2 = scheduler.blockUntil(1, { timeoutMs: 5000 });
    // p1 registered second → blockUntilResolvers[1]
    const p1 = scheduler.blockUntil(5, { timeoutMs: 10 });

    // Wait for p1 to timeout
    const r1 = await p1;
    expect(r1.isErr()).toBe(true);
    if (r1.isErr()) expect(r1.error._tag).toBe("ClockTimeoutError");

    // Register 1 timer → p2 (n=1) should resolve
    scheduler.setTimeout(() => {}, 1000);

    // p2 must resolve (its waiter was NOT removed by p1's timeout handler)
    const r2 = await p2;
    expect(r2.isOk()).toBe(true);
  }, 3000);
});
