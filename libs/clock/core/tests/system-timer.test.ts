/**
 * System timer scheduler tests — DoD 18
 */

import { describe, it, expect } from "vitest";
import { createSystemTimerScheduler } from "../src/adapters/system-timer.js";
import { SystemTimerSchedulerAdapter } from "../src/index.js";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { TimerSchedulerPort } from "../src/ports/timer-scheduler.js";

// =============================================================================
// DoD 18: System Timer Scheduler
// =============================================================================

describe("SystemTimerScheduler", () => {
  it("createSystemTimerScheduler() returns a frozen object", () => {
    const scheduler = createSystemTimerScheduler();
    expect(Object.isFrozen(scheduler)).toBe(true);
  });

  it("setTimeout() returns ok(TimerHandle) with _tag 'TimerHandle'", () => {
    const scheduler = createSystemTimerScheduler();
    const r = scheduler.setTimeout(() => {}, 10000);

    expect(r.isOk()).toBe(true);
    if (!r.isOk()) return;
    expect(r.value._tag).toBe("TimerHandle");
    expect(Object.isFrozen(r.value)).toBe(true);

    // Cleanup
    scheduler.clearTimeout(r.value);
  });

  it("setTimeout() fires callback after specified delay", async () => {
    const scheduler = createSystemTimerScheduler();
    let fired = false;
    await new Promise<void>((resolve) => {
      scheduler.setTimeout(() => {
        fired = true;
        resolve();
      }, 10);
    });
    expect(fired).toBe(true);
  });

  it("setTimeout() returns err for negative ms", () => {
    const scheduler = createSystemTimerScheduler();
    expect(scheduler.setTimeout(() => {}, -1).isErr()).toBe(true);
  });

  it("setTimeout() returns err for non-function callback (kills L34 CE→false mutation)", () => {
    // L34: typeof callback !== "function" → false — never returns err for non-function callbacks
    const scheduler = createSystemTimerScheduler();
    expect(scheduler.setTimeout("not-a-function" as unknown as () => void, 100).isErr()).toBe(true);
  });

  it("setInterval() returns err for ms === 0", () => {
    const scheduler = createSystemTimerScheduler();
    expect(scheduler.setInterval(() => {}, 0).isErr()).toBe(true);
  });

  it("clearTimeout() cancels a pending timer (callback does not fire)", async () => {
    const scheduler = createSystemTimerScheduler();
    let fired = false;
    const hr = scheduler.setTimeout(() => {
      fired = true;
    }, 50);

    if (hr.isOk()) scheduler.clearTimeout(hr.value);
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    expect(fired).toBe(false);
  });

  it("sleep() resolves after specified delay", async () => {
    const scheduler = createSystemTimerScheduler();
    const start = Date.now();
    await scheduler.sleep(20);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(10);
  });

  it("clearTimeout is idempotent on already-cleared handle", () => {
    const scheduler = createSystemTimerScheduler();
    const hr = scheduler.setTimeout(() => {}, 10000);
    expect(hr.isOk()).toBe(true);
    if (!hr.isOk()) return;
    scheduler.clearTimeout(hr.value);
    expect(() => scheduler.clearTimeout(hr.value)).not.toThrow();
  });

  it("SystemTimerSchedulerAdapter provides TimerSchedulerPort (builds and resolves)", () => {
    const graph = GraphBuilder.create().provide(SystemTimerSchedulerAdapter).build();
    const container = createContainer({ graph, name: "Test" });
    const timer = container.resolve(TimerSchedulerPort);
    expect(typeof timer.setTimeout).toBe("function");
  });

  it("SystemTimerSchedulerAdapter factory creates singleton", () => {
    const graph = GraphBuilder.create().provide(SystemTimerSchedulerAdapter).build();
    const container = createContainer({ graph, name: "Test" });
    const t1 = container.resolve(TimerSchedulerPort);
    const t2 = container.resolve(TimerSchedulerPort);
    expect(t1).toBe(t2);
  });
});

// =============================================================================
// Additional coverage (mutation score improvement)
// =============================================================================

describe("SystemTimerScheduler — setInterval behaviors", () => {
  it("setInterval() fires callback at regular intervals", async () => {
    const scheduler = createSystemTimerScheduler();
    let count = 0;
    const hr = scheduler.setInterval(() => { count++; }, 10);
    await new Promise<void>((resolve) => setTimeout(resolve, 35));
    if (hr.isOk()) scheduler.clearInterval(hr.value);
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it("setInterval() returns ok(TimerHandle) with _tag 'TimerHandle'", () => {
    const scheduler = createSystemTimerScheduler();
    const hr = scheduler.setInterval(() => {}, 100);
    expect(hr.isOk()).toBe(true);
    if (!hr.isOk()) return;
    expect(hr.value._tag).toBe("TimerHandle");
    expect(Object.isFrozen(hr.value)).toBe(true);
    scheduler.clearInterval(hr.value);
  });

  it("setInterval() returns err with non-function callback", () => {
    const scheduler = createSystemTimerScheduler();
    expect(scheduler.setInterval("not-a-function" as unknown as () => void, 100).isErr()).toBe(true);
  });

  it("setInterval() returns err with NaN ms", () => {
    const scheduler = createSystemTimerScheduler();
    expect(scheduler.setInterval(() => {}, NaN).isErr()).toBe(true);
  });

  it("setInterval() returns err with Infinity ms", () => {
    const scheduler = createSystemTimerScheduler();
    expect(scheduler.setInterval(() => {}, Infinity).isErr()).toBe(true);
  });

  it("clearInterval() stops a registered interval from firing further", async () => {
    const scheduler = createSystemTimerScheduler();
    let count = 0;
    const hr = scheduler.setInterval(() => { count++; }, 10);
    expect(hr.isOk()).toBe(true);
    if (!hr.isOk()) return;

    // Immediately clear before any fires
    scheduler.clearInterval(hr.value);

    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    // Should not have fired after clear
    expect(count).toBe(0);
  });

  it("clearInterval() is idempotent on already-cleared handle", () => {
    const scheduler = createSystemTimerScheduler();
    const hr = scheduler.setInterval(() => {}, 10000);
    expect(hr.isOk()).toBe(true);
    if (!hr.isOk()) return;
    scheduler.clearInterval(hr.value);
    expect(() => scheduler.clearInterval(hr.value)).not.toThrow();
  });

  it("successive setTimeout calls return handles with different ids", () => {
    const scheduler = createSystemTimerScheduler();
    const r1 = scheduler.setTimeout(() => {}, 10000);
    const r2 = scheduler.setTimeout(() => {}, 10000);
    expect(r1.isOk() && r2.isOk()).toBe(true);
    if (!r1.isOk() || !r2.isOk()) return;
    expect(r1.value.id).not.toBe(r2.value.id);
    scheduler.clearTimeout(r1.value);
    scheduler.clearTimeout(r2.value);
  });

  it("successive setInterval calls return handles with different ids", () => {
    const scheduler = createSystemTimerScheduler();
    const r1 = scheduler.setInterval(() => {}, 10000);
    const r2 = scheduler.setInterval(() => {}, 10000);
    expect(r1.isOk() && r2.isOk()).toBe(true);
    if (!r1.isOk() || !r2.isOk()) return;
    expect(r1.value.id).not.toBe(r2.value.id);
    scheduler.clearInterval(r1.value);
    scheduler.clearInterval(r2.value);
  });

  it("successive setInterval calls: h2.id > h1.id (monotonically increasing — kills L27 nextId -= 1)", () => {
    // L27: nextId += 1 → nextId -= 1 in createHandle → IDs decrease
    const scheduler = createSystemTimerScheduler();
    const r1 = scheduler.setInterval(() => {}, 10000);
    const r2 = scheduler.setInterval(() => {}, 10000);
    expect(r1.isOk() && r2.isOk()).toBe(true);
    if (!r1.isOk() || !r2.isOk()) return;
    expect(r2.value.id).toBeGreaterThan(r1.value.id);
    scheduler.clearInterval(r1.value);
    scheduler.clearInterval(r2.value);
  });

  it("successive setTimeout calls: h2.id > h1.id (monotonically increasing — kills L47 nextId -= 1)", () => {
    // L47: nextId += 1 → nextId -= 1 in setTimeout → IDs decrease
    const scheduler = createSystemTimerScheduler();
    const r1 = scheduler.setTimeout(() => {}, 10000);
    const r2 = scheduler.setTimeout(() => {}, 10000);
    expect(r1.isOk() && r2.isOk()).toBe(true);
    if (!r1.isOk() || !r2.isOk()) return;
    expect(r2.value.id).toBeGreaterThan(r1.value.id);
    scheduler.clearTimeout(r1.value);
    scheduler.clearTimeout(r2.value);
  });
});

describe("SystemTimerScheduler — sleep validation", () => {
  it("sleep() with NaN ms returns err", async () => {
    const scheduler = createSystemTimerScheduler();
    const r = await scheduler.sleep(NaN);
    expect(r.isErr()).toBe(true);
  });

  it("sleep() with -1 ms returns err", async () => {
    const scheduler = createSystemTimerScheduler();
    const r = await scheduler.sleep(-1);
    expect(r.isErr()).toBe(true);
  });

  it("sleep() with Infinity ms returns err", async () => {
    const scheduler = createSystemTimerScheduler();
    const r = await scheduler.sleep(Infinity);
    expect(r.isErr()).toBe(true);
  });

  it("sleep() err message contains 'ms must be'", async () => {
    const scheduler = createSystemTimerScheduler();
    const r = await scheduler.sleep(-1);
    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error.message).toMatch(/ms must be/);
  });
});

describe("SystemTimerScheduler — additional coverage", () => {
  it("setTimeout(cb, 0) is valid — ms=0 is allowed", () => {
    const scheduler = createSystemTimerScheduler();
    const hr = scheduler.setTimeout(() => {}, 0);
    expect(hr.isOk()).toBe(true);
    // Cleanup
    if (hr.isOk()) scheduler.clearTimeout(hr.value);
  });

  it("sleep(0) resolves with ok — ms=0 is valid", async () => {
    const scheduler = createSystemTimerScheduler();
    const r = await scheduler.sleep(0);
    expect(r.isOk()).toBe(true);
  });

  it("clearTimeout with never-registered handle does not throw", () => {
    const scheduler = createSystemTimerScheduler();
    // id=99999 was never registered in the handleMap
    const fakeHandle = { _tag: "TimerHandle" as const, id: 99999 };
    expect(() => scheduler.clearTimeout(fakeHandle)).not.toThrow();
  });

  it("clearInterval with never-registered handle does not throw", () => {
    const scheduler = createSystemTimerScheduler();
    const fakeHandle = { _tag: "TimerHandle" as const, id: 99998 };
    expect(() => scheduler.clearInterval(fakeHandle)).not.toThrow();
  });
});

// =============================================================================
// Error message assertions (kills StringLiteral mutants L38, L54, L57)
// =============================================================================

describe("SystemTimerScheduler — error message assertions", () => {
  it("setTimeout() negative ms error message contains 'ms must be'", () => {
    const scheduler = createSystemTimerScheduler();
    const r = scheduler.setTimeout(() => {}, -1);
    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error.message).toMatch(/ms must be/);
  });

  it("setTimeout() negative ms error message contains 'non-negative'", () => {
    const scheduler = createSystemTimerScheduler();
    const r = scheduler.setTimeout(() => {}, -1);
    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error.message).toMatch(/non-negative/);
  });

  it("setTimeout() non-function callback error message contains 'callback must be' (kills id=450)", () => {
    // StringLiteral mutant (id=450): "callback must be a function" → "" — this assertion then fails → KILLED
    const scheduler = createSystemTimerScheduler();
    const r = scheduler.setTimeout("not-a-function" as unknown as () => void, 100);
    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error.message).toMatch(/callback must be/);
  });

  it("setInterval() non-function callback error message contains 'callback must be'", () => {
    const scheduler = createSystemTimerScheduler();
    const r = scheduler.setInterval("not-a-fn" as unknown as () => void, 100);
    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error.message).toMatch(/callback must be/);
  });

  it("setInterval() ms=0 error message contains 'ms must be'", () => {
    const scheduler = createSystemTimerScheduler();
    const r = scheduler.setInterval(() => {}, 0);
    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error.message).toMatch(/ms must be/);
  });

  it("setInterval() ms=0 error message contains 'positive'", () => {
    const scheduler = createSystemTimerScheduler();
    const r = scheduler.setInterval(() => {}, 0);
    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error.message).toMatch(/positive/);
  });
});
