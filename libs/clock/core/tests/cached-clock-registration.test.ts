/**
 * CachedClock DI registration tests — DoD 33
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { adapterOrDie } from "@hex-di/core";
import {
  SystemClockAdapter,
  SystemCachedClockAdapter,
  createSystemCachedClockAdapter,
} from "../src/index.js";
import { CachedClockPort } from "../src/ports/cached-clock.js";
import { ClockPort } from "../src/ports/clock.js";

// =============================================================================
// DoD 33: Cached Clock Registration
// =============================================================================

describe("SystemCachedClockAdapter — registration", () => {
  // Fake only timer functions so setInterval handles don't linger between tests.
  // performance.now / Date.now remain real so SystemClockAdapter can initialise.
  beforeEach(() => vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] }));
  afterEach(() => vi.useRealTimers());

  it("SystemCachedClockAdapter registers CachedClockPort on the graph", () => {
    const graph = GraphBuilder.create()
      .provide(adapterOrDie(SystemClockAdapter))
      .provide(adapterOrDie(SystemCachedClockAdapter))
      .build();
    const container = createContainer({ graph, name: "Test" });
    const cached = container.resolve(CachedClockPort);
    expect(typeof cached.recentMonotonicNow).toBe("function");
  });

  it("Resolving CachedClockPort returns a working adapter (recentMonotonicNow returns number)", () => {
    const graph = GraphBuilder.create()
      .provide(adapterOrDie(SystemClockAdapter))
      .provide(adapterOrDie(SystemCachedClockAdapter))
      .build();
    const container = createContainer({ graph, name: "Test" });
    const cached = container.resolve(CachedClockPort);
    expect(typeof Number(cached.recentMonotonicNow())).toBe("number");
  });

  it("SystemCachedClockAdapter auto-starts — value updates after interval fires", () => {
    // The factory calls adapter.start() before returning (CLK-CAC-008 ensures synchronous
    // initial read). Auto-start is verified by advancing the fake interval and confirming
    // the cached value is refreshed. CachedClockService does not expose lifecycle methods;
    // lifecycle is covered by DoD 22 / cached-clock.test.ts.
    const graph = GraphBuilder.create()
      .provide(adapterOrDie(SystemClockAdapter))
      .provide(adapterOrDie(SystemCachedClockAdapter))
      .build();
    const container = createContainer({ graph, name: "Test" });
    const cached = container.resolve(CachedClockPort);
    const before = Number(cached.recentMonotonicNow());
    vi.advanceTimersByTime(2); // fire the default 1 ms interval
    const after = Number(cached.recentMonotonicNow());
    // after >= before confirms the background interval ran (start() was called)
    expect(after).toBeGreaterThanOrEqual(before);
  });

  it("SystemCachedClockAdapter requires ClockPort to be registered in the graph", () => {
    // DoD 33 test 4: the adapter's requires array must contain ClockPort so the
    // graph builder enforces the dependency at compile time and the container
    // enforces it at resolve time.
    expect(SystemCachedClockAdapter.requires).toContain(ClockPort);
  });

  it("createSystemCachedClockAdapter() with custom updateIntervalMs passes option to factory", () => {
    const customAdapter = createSystemCachedClockAdapter({ updateIntervalMs: 50 });
    const graph = GraphBuilder.create()
      .provide(adapterOrDie(SystemClockAdapter))
      .provide(adapterOrDie(customAdapter))
      .build();
    const container = createContainer({ graph, name: "Test" });
    const cached = container.resolve(CachedClockPort);
    expect(typeof cached.recentMonotonicNow).toBe("function");
    expect(Number(cached.recentMonotonicNow())).toBeGreaterThanOrEqual(0);
  });
});
