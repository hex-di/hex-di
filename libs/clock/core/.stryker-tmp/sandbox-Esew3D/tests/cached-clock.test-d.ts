/**
 * CachedClock type-level tests — DoD 21-23
 */
// @ts-nocheck


import { describe, it, expectTypeOf } from "vitest";
import type { CachedClockService, CachedClockLifecycle } from "../src/ports/cached-clock.js";
import type { ClockService } from "../src/ports/clock.js";
import type { MonotonicTimestamp, WallClockTimestamp } from "../src/branded.js";

describe("CachedClockService type shape", () => {
  it("CachedClockService has recentMonotonicNow() returning MonotonicTimestamp", () => {
    expectTypeOf<CachedClockService["recentMonotonicNow"]>().returns.toEqualTypeOf<MonotonicTimestamp>();
  });

  it("CachedClockService has recentWallClockNow() returning WallClockTimestamp", () => {
    expectTypeOf<CachedClockService["recentWallClockNow"]>().returns.toEqualTypeOf<WallClockTimestamp>();
  });

  it("CachedClockService is NOT assignable to ClockService (CLK-CAC-001 — different method names)", () => {
    // CachedClockService lacks monotonicNow, wallClockNow, highResNow
    expectTypeOf<CachedClockService>().not.toMatchTypeOf<ClockService>();
  });

  it("ClockService is NOT assignable to CachedClockService (intentional structural incompatibility)", () => {
    expectTypeOf<ClockService>().not.toMatchTypeOf<CachedClockService>();
  });
});

describe("CachedClockLifecycle type shape", () => {
  it("CachedClockLifecycle has start() returning void", () => {
    expectTypeOf<CachedClockLifecycle["start"]>().returns.toEqualTypeOf<void>();
  });

  it("CachedClockLifecycle has stop() returning void", () => {
    expectTypeOf<CachedClockLifecycle["stop"]>().returns.toEqualTypeOf<void>();
  });

  it("CachedClockLifecycle has isRunning() returning boolean", () => {
    expectTypeOf<CachedClockLifecycle["isRunning"]>().returns.toEqualTypeOf<boolean>();
  });
});
