/**
 * CachedClock adapter tests — DoD 21-23
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { createCachedClock } from "../src/adapters/cached-clock.js";
import { createSystemClock } from "../src/adapters/system-clock.js";
import { createVirtualClock } from "../src/testing/virtual-clock.js";
import { createVirtualCachedClock } from "../src/testing/virtual-cached-clock.js";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { adapterOrDie } from "@hex-di/core";
import { SystemClockAdapter, SystemCachedClockAdapter, createSystemCachedClockAdapter } from "../src/index.js";
import { CachedClockPort } from "../src/ports/cached-clock.js";
import type { ClockService } from "../src/ports/clock.js";
import { asMonotonic, asWallClock, asHighRes } from "../src/branded.js";

// Helper: unwrap createVirtualClock Result in test setup
function makeClock(options?: Parameters<typeof createVirtualClock>[0]) {
  const r = createVirtualClock(options);
  if (r.isErr()) throw new Error(`makeClock failed: ${r.error.message}`);
  return r.value;
}

// =============================================================================
// DoD 21: createCachedClock factory
// =============================================================================

describe("createCachedClock — factory", () => {
  it("reads source clock at construction (initial synchronous snapshot)", () => {
    const clockResult = createSystemClock();
    expect(clockResult.isOk()).toBe(true);
    if (!clockResult.isOk()) return;

    const source = clockResult.value;
    const before = source.monotonicNow();
    const cachedResult = createCachedClock({ source });
    expect(cachedResult.isOk()).toBe(true);
    if (!cachedResult.isOk()) return;
    const cached = cachedResult.value;
    const after = source.monotonicNow();
    const recent = cached.recentMonotonicNow();

    expect(recent).toBeGreaterThanOrEqual(before);
    expect(recent).toBeLessThanOrEqual(after);

    cached.stop();
  });

  it("recentMonotonicNow() returns the snapshot value before start()", () => {
    const clockResult = createSystemClock();
    expect(clockResult.isOk()).toBe(true);
    if (!clockResult.isOk()) return;

    const source = clockResult.value;
    const cachedResult = createCachedClock({ source });
    expect(cachedResult.isOk()).toBe(true);
    if (!cachedResult.isOk()) return;
    const cached = cachedResult.value;

    // Before start, value should not change spontaneously
    const v1 = cached.recentMonotonicNow();
    const v2 = cached.recentMonotonicNow();
    expect(v1).toBe(v2);
  });

  it("recentWallClockNow() returns the snapshot wall clock value", () => {
    const clockResult = createSystemClock();
    expect(clockResult.isOk()).toBe(true);
    if (!clockResult.isOk()) return;

    const source = clockResult.value;
    const wallBefore = source.wallClockNow();
    const cachedResult = createCachedClock({ source });
    expect(cachedResult.isOk()).toBe(true);
    if (!cachedResult.isOk()) return;
    const cached = cachedResult.value;
    const wallAfter = source.wallClockNow();
    const recentWall = cached.recentWallClockNow();

    expect(recentWall).toBeGreaterThanOrEqual(wallBefore);
    expect(recentWall).toBeLessThanOrEqual(wallAfter);
  });

  it("returns err for updateIntervalMs <= 0", () => {
    const clockResult = createSystemClock();
    expect(clockResult.isOk()).toBe(true);
    if (!clockResult.isOk()) return;

    expect(createCachedClock({ source: clockResult.value, updateIntervalMs: 0 }).isErr()).toBe(true);
    expect(createCachedClock({ source: clockResult.value, updateIntervalMs: -1 }).isErr()).toBe(true);
  });

  it("returns err for non-finite updateIntervalMs", () => {
    const clockResult = createSystemClock();
    expect(clockResult.isOk()).toBe(true);
    if (!clockResult.isOk()) return;

    expect(createCachedClock({ source: clockResult.value, updateIntervalMs: Infinity }).isErr()).toBe(true);
    expect(createCachedClock({ source: clockResult.value, updateIntervalMs: NaN }).isErr()).toBe(true);
  });

  it("returned adapter is frozen (CLK-CAC-009)", () => {
    const clockResult = createSystemClock();
    expect(clockResult.isOk()).toBe(true);
    if (!clockResult.isOk()) return;

    const cachedResult = createCachedClock({ source: clockResult.value });
    expect(cachedResult.isOk()).toBe(true);
    if (!cachedResult.isOk()) return;
    const cached = cachedResult.value;
    expect(Object.isFrozen(cached)).toBe(true);
    cached.stop();
  });
});

// =============================================================================
// DoD 22: Lifecycle management
// =============================================================================

describe("CachedClock — lifecycle (start/stop/isRunning)", () => {
  it("isRunning() returns false before start()", () => {
    const clockResult = createSystemClock();
    expect(clockResult.isOk()).toBe(true);
    if (!clockResult.isOk()) return;

    const cachedResult = createCachedClock({ source: clockResult.value });
    expect(cachedResult.isOk()).toBe(true);
    if (!cachedResult.isOk()) return;
    expect(cachedResult.value.isRunning()).toBe(false);
  });

  it("isRunning() returns true after start() and false after stop()", () => {
    const clockResult = createSystemClock();
    expect(clockResult.isOk()).toBe(true);
    if (!clockResult.isOk()) return;

    const cachedResult = createCachedClock({ source: clockResult.value });
    expect(cachedResult.isOk()).toBe(true);
    if (!cachedResult.isOk()) return;
    const cached = cachedResult.value;

    expect(cached.isRunning()).toBe(false);
    cached.start();
    expect(cached.isRunning()).toBe(true);
    cached.stop();
    expect(cached.isRunning()).toBe(false);
  });

  it("start() is idempotent (calling twice does not create two intervals)", () => {
    const clockResult = createSystemClock();
    expect(clockResult.isOk()).toBe(true);
    if (!clockResult.isOk()) return;

    const cachedResult = createCachedClock({ source: clockResult.value });
    expect(cachedResult.isOk()).toBe(true);
    if (!cachedResult.isOk()) return;
    const cached = cachedResult.value;
    cached.start();
    cached.start(); // Should be a no-op
    expect(cached.isRunning()).toBe(true);
    cached.stop();
  });

  it("stop() is idempotent (calling twice does not throw)", () => {
    const clockResult = createSystemClock();
    expect(clockResult.isOk()).toBe(true);
    if (!clockResult.isOk()) return;

    const cachedResult = createCachedClock({ source: clockResult.value });
    expect(cachedResult.isOk()).toBe(true);
    if (!cachedResult.isOk()) return;
    const cached = cachedResult.value;
    cached.start();
    cached.stop();
    expect(() => cached.stop()).not.toThrow();
    expect(cached.isRunning()).toBe(false);
  });
});

// =============================================================================
// DoD 23: CLK-CAC-001 — CachedClockService not assignable to ClockService
// (structural separation at runtime via different method names)
// =============================================================================

describe("CachedClock — structural separation (CLK-CAC-001)", () => {
  it("CachedClockService uses 'recentMonotonicNow', not 'monotonicNow'", () => {
    const clockResult = createSystemClock();
    expect(clockResult.isOk()).toBe(true);
    if (!clockResult.isOk()) return;

    const cachedResult = createCachedClock({ source: clockResult.value });
    expect(cachedResult.isOk()).toBe(true);
    if (!cachedResult.isOk()) return;
    const cached = cachedResult.value;
    expect(typeof cached.recentMonotonicNow).toBe("function");
    expect("monotonicNow" in cached).toBe(false);
    cached.stop();
  });

  it("CachedClockService uses 'recentWallClockNow', not 'wallClockNow'", () => {
    const clockResult = createSystemClock();
    expect(clockResult.isOk()).toBe(true);
    if (!clockResult.isOk()) return;

    const cachedResult = createCachedClock({ source: clockResult.value });
    expect(cachedResult.isOk()).toBe(true);
    if (!cachedResult.isOk()) return;
    const cached = cachedResult.value;
    expect(typeof cached.recentWallClockNow).toBe("function");
    expect("wallClockNow" in cached).toBe(false);
    cached.stop();
  });
});

// =============================================================================
// VirtualCachedClock
// =============================================================================

describe("VirtualCachedClock", () => {
  it("reads virtual clock directly (no background updater)", () => {
    const clock = makeClock();
    const cached = createVirtualCachedClock(clock);

    const m1 = cached.recentMonotonicNow();
    clock.advance(100);
    const m2 = cached.recentMonotonicNow();

    expect(m2).toBeGreaterThan(m1);
  });

  it("isRunning() always returns true", () => {
    const clock = makeClock();
    const cached = createVirtualCachedClock(clock);
    expect(cached.isRunning()).toBe(true);
  });

  it("start() and stop() are no-ops (always running)", () => {
    const clock = makeClock();
    const cached = createVirtualCachedClock(clock);

    cached.stop();
    expect(cached.isRunning()).toBe(true);
    cached.start();
    expect(cached.isRunning()).toBe(true);
  });

  it("is frozen", () => {
    const clock = makeClock();
    const cached = createVirtualCachedClock(clock);
    expect(Object.isFrozen(cached)).toBe(true);
  });

  it("recentMonotonicNow() returns exact clock value (kills ArrowFunction mutant id=1137)", () => {
    // Mutant: recentMonotonicNow: () => undefined instead of () => clock.monotonicNow()
    // → expect(undefined).toBe(42) fails → KILLED
    const clock = makeClock({ initialMonotonic: 42 });
    const cached = createVirtualCachedClock(clock);
    expect(Number(cached.recentMonotonicNow())).toBe(42);
  });

  it("recentMonotonicNow() reflects clock.advance() (confirms live delegation)", () => {
    const clock = makeClock({ initialMonotonic: 0 });
    const cached = createVirtualCachedClock(clock);
    expect(Number(cached.recentMonotonicNow())).toBe(0);
    clock.advance(100);
    expect(Number(cached.recentMonotonicNow())).toBe(100);
  });

  it("recentWallClockNow() returns exact clock wall-clock value (kills ArrowFunction mutant)", () => {
    const clock = makeClock({ initialWallClock: 1700000000000 });
    const cached = createVirtualCachedClock(clock);
    expect(Number(cached.recentWallClockNow())).toBe(1700000000000);
  });

  it("recentWallClockNow() reflects clock.advance() (confirms live delegation)", () => {
    const clock = makeClock({ initialWallClock: 1700000000000 });
    const cached = createVirtualCachedClock(clock);
    clock.advance(500);
    expect(Number(cached.recentWallClockNow())).toBe(1700000000500);
  });
});

// =============================================================================
// SystemCachedClockAdapter — graph integration
// =============================================================================

describe("SystemCachedClockAdapter — graph integration", () => {
  it("SystemCachedClockAdapter resolves CachedClockPort from container", () => {
    const graph = GraphBuilder.create()
      .provide(adapterOrDie(SystemClockAdapter))
      .provide(adapterOrDie(SystemCachedClockAdapter))
      .build();
    const container = createContainer({ graph, name: "Test" });
    const cached = container.resolve(CachedClockPort);
    expect(typeof cached.recentMonotonicNow).toBe("function");
    expect(typeof cached.recentWallClockNow).toBe("function");
  });
});

// =============================================================================
// Mutation score improvement
// =============================================================================

describe("CachedClock — error message assertions", () => {
  it("err message contains 'positive' for updateIntervalMs=0", () => {
    const clockResult = createSystemClock();
    expect(clockResult.isOk()).toBe(true);
    if (!clockResult.isOk()) return;

    const r = createCachedClock({ source: clockResult.value, updateIntervalMs: 0 });
    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error.message).toMatch(/positive/);
  });

  it("err message contains 'updateIntervalMs' for invalid interval", () => {
    const clockResult = createSystemClock();
    expect(clockResult.isOk()).toBe(true);
    if (!clockResult.isOk()) return;

    const r = createCachedClock({ source: clockResult.value, updateIntervalMs: -1 });
    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error.message).toMatch(/updateIntervalMs/);
  });
});

describe("CachedClock — lifecycle idempotency guarded by running flag", () => {
  it("start() when already running does not change isRunning() state", () => {
    const clockResult = createSystemClock();
    expect(clockResult.isOk()).toBe(true);
    if (!clockResult.isOk()) return;

    const cachedResult = createCachedClock({ source: clockResult.value });
    expect(cachedResult.isOk()).toBe(true);
    if (!cachedResult.isOk()) return;
    const cached = cachedResult.value;
    cached.start();
    expect(cached.isRunning()).toBe(true);
    cached.start(); // second call — must be no-op
    expect(cached.isRunning()).toBe(true);
    cached.stop();
    expect(cached.isRunning()).toBe(false);
  });

  it("stop() when not running does not affect isRunning()", () => {
    const clockResult = createSystemClock();
    expect(clockResult.isOk()).toBe(true);
    if (!clockResult.isOk()) return;

    const cachedResult = createCachedClock({ source: clockResult.value });
    expect(cachedResult.isOk()).toBe(true);
    if (!cachedResult.isOk()) return;
    const cached = cachedResult.value;
    expect(cached.isRunning()).toBe(false);
    cached.stop(); // called when not running — must be no-op
    expect(cached.isRunning()).toBe(false);
  });

  it("stop() clears the interval (intervalHandle set to undefined)", async () => {
    // After stop(), the cached values should NOT change over time (interval is gone)
    const clockResult = createSystemClock();
    expect(clockResult.isOk()).toBe(true);
    if (!clockResult.isOk()) return;

    const cachedResult = createCachedClock({ source: clockResult.value, updateIntervalMs: 1 });
    expect(cachedResult.isOk()).toBe(true);
    if (!cachedResult.isOk()) return;
    const cached = cachedResult.value;
    cached.start();
    cached.stop();
    // After stop, isRunning is false AND subsequent start/stop cycle works
    expect(cached.isRunning()).toBe(false);
    cached.start();
    expect(cached.isRunning()).toBe(true);
    cached.stop();
  });
});

// =============================================================================
// Interval callback execution — kills L48/L49 NoCoverage using fake timers
// =============================================================================

describe("CachedClock — interval callback updates cached values (kills L48/L49 NoCoverage)", () => {
  afterEach(() => vi.useRealTimers());

  it("interval fires and updates cachedMonotonic and cachedWallClock (kills L48/L49)", () => {
    vi.useFakeTimers();

    let monotonicValue = 1000;
    let wallValue = 1700000000000;
    const source: ClockService = {
      monotonicNow: () => asMonotonic(monotonicValue),
      wallClockNow: () => asWallClock(wallValue),
      highResNow: () => asHighRes(wallValue),
    };

    const cachedResult = createCachedClock({ source, updateIntervalMs: 10 });
    expect(cachedResult.isOk()).toBe(true);
    if (!cachedResult.isOk()) return;
    const cached = cachedResult.value;

    // Initial snapshot is captured at construction
    expect(Number(cached.recentMonotonicNow())).toBe(1000);
    expect(Number(cached.recentWallClockNow())).toBe(1700000000000);

    cached.start();

    // Update source values before interval fires
    monotonicValue = 2000;
    wallValue = 1700000001000;

    // Advance fake timers past one interval
    vi.advanceTimersByTime(10);

    // Interval callback should have fired and updated the cached values
    expect(Number(cached.recentMonotonicNow())).toBe(2000);
    expect(Number(cached.recentWallClockNow())).toBe(1700000001000);

    cached.stop();
  });

  it("stop() prevents further interval updates — clears the interval handle (kills L56-59 block mutation)", () => {
    vi.useFakeTimers();

    let monotonicValue = 1000;
    const source: ClockService = {
      monotonicNow: () => asMonotonic(monotonicValue),
      wallClockNow: () => asWallClock(1700000000000),
      highResNow: () => asHighRes(1700000000000),
    };

    const cachedResult = createCachedClock({ source, updateIntervalMs: 10 });
    expect(cachedResult.isOk()).toBe(true);
    if (!cachedResult.isOk()) return;
    const cached = cachedResult.value;
    cached.start();

    monotonicValue = 2000;
    vi.advanceTimersByTime(10);
    expect(Number(cached.recentMonotonicNow())).toBe(2000);

    cached.stop();

    // After stop, advancing time should NOT update cached value
    monotonicValue = 3000;
    vi.advanceTimersByTime(100);
    expect(Number(cached.recentMonotonicNow())).toBe(2000); // still 2000, interval cleared

    cached.start();
    expect(cached.isRunning()).toBe(true);
    cached.stop();
  });

  it("default updateIntervalMs=1 means interval fires after 1ms (kills L25 default value mutation)", () => {
    vi.useFakeTimers();

    let monotonicValue = 100;
    const source: ClockService = {
      monotonicNow: () => asMonotonic(monotonicValue),
      wallClockNow: () => asWallClock(1700000000000),
      highResNow: () => asHighRes(1700000000000),
    };

    // No updateIntervalMs — uses default of 1
    const cachedResult = createCachedClock({ source });
    expect(cachedResult.isOk()).toBe(true);
    if (!cachedResult.isOk()) return;
    const cached = cachedResult.value;
    cached.start();

    monotonicValue = 200;
    vi.advanceTimersByTime(1); // exactly 1ms — fires if default is 1, not if default is 2

    expect(Number(cached.recentMonotonicNow())).toBe(200);
    cached.stop();
  });

  it("start() twice then stop() leaves no leaked interval — value does not update after stop (kills L45 CE=false)", () => {
    vi.useFakeTimers();

    let value = 1000;
    const source: ClockService = {
      monotonicNow: () => asMonotonic(value),
      wallClockNow: () => asWallClock(1700000000000),
      highResNow: () => asHighRes(1700000000000),
    };

    const cachedResult = createCachedClock({ source, updateIntervalMs: 10 });
    expect(cachedResult.isOk()).toBe(true);
    if (!cachedResult.isOk()) return;
    const cached = cachedResult.value;
    cached.start();
    cached.start(); // second start — must be a no-op; must not create a second interval

    cached.stop(); // clears the one interval that was created

    value = 2000;
    vi.advanceTimersByTime(100); // if two intervals were created, at least one would still fire

    // Value must still be 1000 (the snapshot at construction time)
    expect(Number(cached.recentMonotonicNow())).toBe(1000);
  });
});

// =============================================================================
// createSystemCachedClockAdapter factory — kills L97 OptionalChaining
// =============================================================================

describe("createSystemCachedClockAdapter — without options resolves CachedClockPort (kills L97 OptionalChaining)", () => {
  it("createSystemCachedClockAdapter() without options resolves CachedClockPort successfully", () => {
    const graph = GraphBuilder.create()
      .provide(adapterOrDie(SystemClockAdapter))
      .provide(adapterOrDie(createSystemCachedClockAdapter()))
      .build();
    const container = createContainer({ graph, name: "Test" });
    const cached = container.resolve(CachedClockPort);
    expect(typeof cached.recentMonotonicNow).toBe("function");
    expect(typeof cached.recentWallClockNow).toBe("function");
    // Cleanup
    (cached as { stop?: () => void }).stop?.();
  });
});
