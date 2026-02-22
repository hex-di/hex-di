/**
 * System timer scheduler tests — DoD 18
 */
// @ts-nocheck


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

  it("setTimeout() returns a frozen TimerHandle with _tag 'TimerHandle'", () => {
    const scheduler = createSystemTimerScheduler();
    const handle = scheduler.setTimeout(() => {}, 10000);

    expect(handle._tag).toBe("TimerHandle");
    expect(Object.isFrozen(handle)).toBe(true);

    // Cleanup
    scheduler.clearTimeout(handle);
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

  it("setTimeout() throws TypeError for negative ms", () => {
    const scheduler = createSystemTimerScheduler();
    expect(() => scheduler.setTimeout(() => {}, -1)).toThrow(TypeError);
  });

  it("setInterval() throws TypeError for ms === 0", () => {
    const scheduler = createSystemTimerScheduler();
    expect(() => scheduler.setInterval(() => {}, 0)).toThrow(TypeError);
  });

  it("clearTimeout() cancels a pending timer (callback does not fire)", async () => {
    const scheduler = createSystemTimerScheduler();
    let fired = false;
    const handle = scheduler.setTimeout(() => {
      fired = true;
    }, 50);

    scheduler.clearTimeout(handle);
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
    const handle = scheduler.setTimeout(() => {}, 10000);
    scheduler.clearTimeout(handle);
    expect(() => scheduler.clearTimeout(handle)).not.toThrow();
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
    const handle = scheduler.setInterval(() => { count++; }, 10);
    await new Promise<void>((resolve) => setTimeout(resolve, 35));
    scheduler.clearInterval(handle);
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it("setInterval() returns a frozen TimerHandle with _tag 'TimerHandle'", () => {
    const scheduler = createSystemTimerScheduler();
    const handle = scheduler.setInterval(() => {}, 100);
    expect(handle._tag).toBe("TimerHandle");
    expect(Object.isFrozen(handle)).toBe(true);
    scheduler.clearInterval(handle);
  });

  it("setInterval() with non-function callback throws TypeError", () => {
    const scheduler = createSystemTimerScheduler();
    expect(() => scheduler.setInterval("not-a-function" as unknown as () => void, 100)).toThrow(TypeError);
  });

  it("setInterval() with NaN ms throws TypeError", () => {
    const scheduler = createSystemTimerScheduler();
    expect(() => scheduler.setInterval(() => {}, NaN)).toThrow(TypeError);
  });

  it("setInterval() with Infinity ms throws TypeError", () => {
    const scheduler = createSystemTimerScheduler();
    expect(() => scheduler.setInterval(() => {}, Infinity)).toThrow(TypeError);
  });

  it("clearInterval() stops a registered interval from firing further", async () => {
    const scheduler = createSystemTimerScheduler();
    let count = 0;
    const handle = scheduler.setInterval(() => { count++; }, 10);

    // Immediately clear before any fires
    scheduler.clearInterval(handle);

    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    // Should not have fired after clear
    expect(count).toBe(0);
  });

  it("clearInterval() is idempotent on already-cleared handle", () => {
    const scheduler = createSystemTimerScheduler();
    const handle = scheduler.setInterval(() => {}, 10000);
    scheduler.clearInterval(handle);
    expect(() => scheduler.clearInterval(handle)).not.toThrow();
  });

  it("successive setTimeout calls return handles with different ids", () => {
    const scheduler = createSystemTimerScheduler();
    const h1 = scheduler.setTimeout(() => {}, 10000);
    const h2 = scheduler.setTimeout(() => {}, 10000);
    expect(h1.id).not.toBe(h2.id);
    scheduler.clearTimeout(h1);
    scheduler.clearTimeout(h2);
  });

  it("successive setInterval calls return handles with different ids", () => {
    const scheduler = createSystemTimerScheduler();
    const h1 = scheduler.setInterval(() => {}, 10000);
    const h2 = scheduler.setInterval(() => {}, 10000);
    expect(h1.id).not.toBe(h2.id);
    scheduler.clearInterval(h1);
    scheduler.clearInterval(h2);
  });
});

describe("SystemTimerScheduler — sleep validation", () => {
  it("sleep() with NaN ms throws TypeError", () => {
    const scheduler = createSystemTimerScheduler();
    expect(() => scheduler.sleep(NaN)).toThrow(TypeError);
  });

  it("sleep() with -1 ms throws TypeError", () => {
    const scheduler = createSystemTimerScheduler();
    expect(() => scheduler.sleep(-1)).toThrow(TypeError);
  });

  it("sleep() with Infinity ms throws TypeError", () => {
    const scheduler = createSystemTimerScheduler();
    expect(() => scheduler.sleep(Infinity)).toThrow(TypeError);
  });

  it("sleep() throws error message containing 'ms must be'", () => {
    const scheduler = createSystemTimerScheduler();
    expect(() => scheduler.sleep(-1)).toThrow(/ms must be/);
  });
});

describe("SystemTimerScheduler — additional coverage", () => {
  it("setTimeout(cb, 0) is valid — ms=0 is allowed", () => {
    const scheduler = createSystemTimerScheduler();
    let handle: ReturnType<typeof scheduler.setTimeout> | undefined;
    expect(() => {
      handle = scheduler.setTimeout(() => {}, 0);
    }).not.toThrow();
    // Cleanup
    if (handle) scheduler.clearTimeout(handle);
  });

  it("sleep(0) resolves immediately — ms=0 is valid", async () => {
    const scheduler = createSystemTimerScheduler();
    await expect(scheduler.sleep(0)).resolves.toBeUndefined();
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
    expect(() => scheduler.setTimeout(() => {}, -1)).toThrow(/ms must be/);
  });

  it("setTimeout() negative ms error message contains 'non-negative'", () => {
    const scheduler = createSystemTimerScheduler();
    expect(() => scheduler.setTimeout(() => {}, -1)).toThrow(/non-negative/);
  });

  it("setInterval() non-function callback error message contains 'callback must be'", () => {
    const scheduler = createSystemTimerScheduler();
    expect(() => scheduler.setInterval("not-a-fn" as unknown as () => void, 100))
      .toThrow(/callback must be/);
  });

  it("setInterval() ms=0 error message contains 'ms must be'", () => {
    const scheduler = createSystemTimerScheduler();
    expect(() => scheduler.setInterval(() => {}, 0)).toThrow(/ms must be/);
  });

  it("setInterval() ms=0 error message contains 'positive'", () => {
    const scheduler = createSystemTimerScheduler();
    expect(() => scheduler.setInterval(() => {}, 0)).toThrow(/positive/);
  });
});
