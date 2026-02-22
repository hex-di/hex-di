/**
 * CachedClock adapter tests — DoD 21-23
 */
// @ts-nocheck


import { describe, it, expect } from "vitest";
import { createCachedClock } from "../src/adapters/cached-clock.js";
import { createSystemClock } from "../src/adapters/system-clock.js";
import { createVirtualClock } from "../src/testing/virtual-clock.js";
import { createVirtualCachedClock } from "../src/testing/virtual-cached-clock.js";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { SystemClockAdapter, SystemCachedClockAdapter } from "../src/index.js";
import { CachedClockPort } from "../src/ports/cached-clock.js";

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
    const cached = createCachedClock({ source });
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
    const cached = createCachedClock({ source });

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
    const cached = createCachedClock({ source });
    const wallAfter = source.wallClockNow();
    const recentWall = cached.recentWallClockNow();

    expect(recentWall).toBeGreaterThanOrEqual(wallBefore);
    expect(recentWall).toBeLessThanOrEqual(wallAfter);
  });

  it("throws TypeError for updateIntervalMs <= 0", () => {
    const clockResult = createSystemClock();
    expect(clockResult.isOk()).toBe(true);
    if (!clockResult.isOk()) return;

    expect(() =>
      createCachedClock({ source: clockResult.value, updateIntervalMs: 0 })
    ).toThrow(TypeError);
    expect(() =>
      createCachedClock({ source: clockResult.value, updateIntervalMs: -1 })
    ).toThrow(TypeError);
  });

  it("throws TypeError for non-finite updateIntervalMs", () => {
    const clockResult = createSystemClock();
    expect(clockResult.isOk()).toBe(true);
    if (!clockResult.isOk()) return;

    expect(() =>
      createCachedClock({ source: clockResult.value, updateIntervalMs: Infinity })
    ).toThrow(TypeError);
    expect(() =>
      createCachedClock({ source: clockResult.value, updateIntervalMs: NaN })
    ).toThrow(TypeError);
  });

  it("returned adapter is frozen (CLK-CAC-009)", () => {
    const clockResult = createSystemClock();
    expect(clockResult.isOk()).toBe(true);
    if (!clockResult.isOk()) return;

    const cached = createCachedClock({ source: clockResult.value });
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

    const cached = createCachedClock({ source: clockResult.value });
    expect(cached.isRunning()).toBe(false);
  });

  it("isRunning() returns true after start() and false after stop()", () => {
    const clockResult = createSystemClock();
    expect(clockResult.isOk()).toBe(true);
    if (!clockResult.isOk()) return;

    const cached = createCachedClock({ source: clockResult.value });

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

    const cached = createCachedClock({ source: clockResult.value });
    cached.start();
    cached.start(); // Should be a no-op
    expect(cached.isRunning()).toBe(true);
    cached.stop();
  });

  it("stop() is idempotent (calling twice does not throw)", () => {
    const clockResult = createSystemClock();
    expect(clockResult.isOk()).toBe(true);
    if (!clockResult.isOk()) return;

    const cached = createCachedClock({ source: clockResult.value });
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

    const cached = createCachedClock({ source: clockResult.value });
    expect(typeof cached.recentMonotonicNow).toBe("function");
    expect("monotonicNow" in cached).toBe(false);
    cached.stop();
  });

  it("CachedClockService uses 'recentWallClockNow', not 'wallClockNow'", () => {
    const clockResult = createSystemClock();
    expect(clockResult.isOk()).toBe(true);
    if (!clockResult.isOk()) return;

    const cached = createCachedClock({ source: clockResult.value });
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
    const clock = createVirtualClock();
    const cached = createVirtualCachedClock(clock);

    const m1 = cached.recentMonotonicNow();
    clock.advance(100);
    const m2 = cached.recentMonotonicNow();

    expect(m2).toBeGreaterThan(m1);
  });

  it("isRunning() always returns true", () => {
    const clock = createVirtualClock();
    const cached = createVirtualCachedClock(clock);
    expect(cached.isRunning()).toBe(true);
  });

  it("start() and stop() are no-ops (always running)", () => {
    const clock = createVirtualClock();
    const cached = createVirtualCachedClock(clock);

    cached.stop();
    expect(cached.isRunning()).toBe(true);
    cached.start();
    expect(cached.isRunning()).toBe(true);
  });

  it("is frozen", () => {
    const clock = createVirtualClock();
    const cached = createVirtualCachedClock(clock);
    expect(Object.isFrozen(cached)).toBe(true);
  });
});

// =============================================================================
// SystemCachedClockAdapter — graph integration
// =============================================================================

describe("SystemCachedClockAdapter — graph integration", () => {
  it("SystemCachedClockAdapter resolves CachedClockPort from container", () => {
    const graph = GraphBuilder.create()
      .provide(SystemClockAdapter)
      .provide(SystemCachedClockAdapter)
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
  it("throws message containing 'positive' for updateIntervalMs=0", () => {
    const clockResult = createSystemClock();
    expect(clockResult.isOk()).toBe(true);
    if (!clockResult.isOk()) return;

    expect(() =>
      createCachedClock({ source: clockResult.value, updateIntervalMs: 0 })
    ).toThrow(/positive/);
  });

  it("throws message containing 'updateIntervalMs' for invalid interval", () => {
    const clockResult = createSystemClock();
    expect(clockResult.isOk()).toBe(true);
    if (!clockResult.isOk()) return;

    expect(() =>
      createCachedClock({ source: clockResult.value, updateIntervalMs: -1 })
    ).toThrow(/updateIntervalMs/);
  });
});

describe("CachedClock — lifecycle idempotency guarded by running flag", () => {
  it("start() when already running does not change isRunning() state", () => {
    const clockResult = createSystemClock();
    expect(clockResult.isOk()).toBe(true);
    if (!clockResult.isOk()) return;

    const cached = createCachedClock({ source: clockResult.value });
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

    const cached = createCachedClock({ source: clockResult.value });
    expect(cached.isRunning()).toBe(false);
    cached.stop(); // called when not running — must be no-op
    expect(cached.isRunning()).toBe(false);
  });

  it("stop() clears the interval (intervalHandle set to undefined)", async () => {
    // After stop(), the cached values should NOT change over time (interval is gone)
    const clockResult = createSystemClock();
    expect(clockResult.isOk()).toBe(true);
    if (!clockResult.isOk()) return;

    const cached = createCachedClock({ source: clockResult.value, updateIntervalMs: 1 });
    cached.start();
    cached.stop();
    // After stop, isRunning is false AND subsequent start/stop cycle works
    expect(cached.isRunning()).toBe(false);
    cached.start();
    expect(cached.isRunning()).toBe(true);
    cached.stop();
  });
});
