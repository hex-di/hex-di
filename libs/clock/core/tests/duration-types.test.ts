/**
 * Duration types tests — DoD 28
 */

import { describe, it, expect } from "vitest";
import {
  asMonotonicDuration,
  asWallClockDuration,
  elapsed,
  durationGt,
  durationLt,
  durationBetween,
  asMonotonic,
  asWallClock,
  asHighRes,
} from "../src/branded.js";
import type { ClockService } from "../src/ports/clock.js";

// =============================================================================
// DoD 28: Duration Types
// =============================================================================

describe("asMonotonicDuration()", () => {
  it("asMonotonicDuration(42) returns 42 (identity at runtime)", () => {
    expect(asMonotonicDuration(42)).toBe(42);
  });

  it("asMonotonicDuration(0) returns 0 (boundary)", () => {
    expect(asMonotonicDuration(0)).toBe(0);
  });

  it("asMonotonicDuration(Number.MAX_SAFE_INTEGER) returns Number.MAX_SAFE_INTEGER", () => {
    expect(asMonotonicDuration(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("asMonotonicDuration is identity at runtime (any number)", () => {
    const value = 123456.789;
    expect(asMonotonicDuration(value)).toBe(value);
  });
});

describe("asWallClockDuration()", () => {
  it("asWallClockDuration(42) returns 42 (identity at runtime)", () => {
    expect(asWallClockDuration(42)).toBe(42);
  });

  it("asWallClockDuration(Number.MAX_SAFE_INTEGER) returns Number.MAX_SAFE_INTEGER", () => {
    expect(asWallClockDuration(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("asWallClockDuration is identity at runtime", () => {
    expect(asWallClockDuration(0)).toBe(0);
  });

  it("asWallClockDuration supports negative values (NTP backward correction)", () => {
    expect(asWallClockDuration(-100)).toBe(-100);
  });
});

describe("elapsed()", () => {
  it("elapsed() returns 0 when clock.monotonicNow() equals since", () => {
    const clock: ClockService = {
      monotonicNow: () => asMonotonic(500),
      wallClockNow: () => asWallClock(1707753600000),
      highResNow: () => asHighRes(1707753600500),
    };
    const since = asMonotonic(500);
    expect(elapsed(clock, since)).toBe(0);
  });

  it("elapsed() returns positive duration when clock is ahead of since", () => {
    const clock: ClockService = {
      monotonicNow: () => asMonotonic(600),
      wallClockNow: () => asWallClock(1707753600000),
      highResNow: () => asHighRes(1707753600600),
    };
    const since = asMonotonic(500);
    expect(elapsed(clock, since)).toBe(100);
  });

  it("elapsed() uses clock.monotonicNow() not wallClockNow()", () => {
    let wallClockCalled = false;
    let monotonicCalled = false;

    const clock: ClockService = {
      monotonicNow: () => {
        monotonicCalled = true;
        return asMonotonic(500);
      },
      wallClockNow: () => {
        wallClockCalled = true;
        return asWallClock(1707753600000);
      },
      highResNow: () => asHighRes(1707753600500),
    };

    elapsed(clock, asMonotonic(100));

    expect(monotonicCalled).toBe(true);
    expect(wallClockCalled).toBe(false);
  });

  it("elapsed() returns non-negative value when clock is ahead (CLK-DUR-001)", () => {
    const clock: ClockService = {
      monotonicNow: () => asMonotonic(1000),
      wallClockNow: () => asWallClock(1707753600000),
      highResNow: () => asHighRes(1707753601000),
    };
    const since = asMonotonic(100);
    const duration = elapsed(clock, since);
    expect(duration).toBeGreaterThanOrEqual(0);
  });

  it("elapsed() computes exact difference: clock.monotonicNow() - since", () => {
    const clock: ClockService = {
      monotonicNow: () => asMonotonic(750),
      wallClockNow: () => asWallClock(1707753600000),
      highResNow: () => asHighRes(1707753600750),
    };
    const since = asMonotonic(250);
    expect(elapsed(clock, since)).toBe(500);
  });
});

describe("durationGt()", () => {
  it("durationGt(200, 100) returns true when a > b", () => {
    const a = asMonotonicDuration(200);
    const b = asMonotonicDuration(100);
    expect(durationGt(a, b)).toBe(true);
  });

  it("durationGt(100, 200) returns false when a < b", () => {
    const a = asMonotonicDuration(100);
    const b = asMonotonicDuration(200);
    expect(durationGt(a, b)).toBe(false);
  });

  it("durationGt(100, 100) returns false when a === b", () => {
    const a = asMonotonicDuration(100);
    const b = asMonotonicDuration(100);
    expect(durationGt(a, b)).toBe(false);
  });
});

describe("durationLt()", () => {
  it("durationLt(100, 200) returns true when a < b", () => {
    const a = asMonotonicDuration(100);
    const b = asMonotonicDuration(200);
    expect(durationLt(a, b)).toBe(true);
  });

  it("durationLt(200, 100) returns false when a > b", () => {
    const a = asMonotonicDuration(200);
    const b = asMonotonicDuration(100);
    expect(durationLt(a, b)).toBe(false);
  });

  it("durationLt(100, 100) returns false when a === b", () => {
    const a = asMonotonicDuration(100);
    const b = asMonotonicDuration(100);
    expect(durationLt(a, b)).toBe(false);
  });
});

describe("durationBetween()", () => {
  it("durationBetween(150, 100, 200) returns true when within bounds", () => {
    const val = asMonotonicDuration(150);
    const min = asMonotonicDuration(100);
    const max = asMonotonicDuration(200);
    expect(durationBetween(val, min, max)).toBe(true);
  });

  it("durationBetween() is inclusive on min boundary", () => {
    const val = asMonotonicDuration(100);
    const min = asMonotonicDuration(100);
    const max = asMonotonicDuration(200);
    expect(durationBetween(val, min, max)).toBe(true);
  });

  it("durationBetween() is inclusive on max boundary", () => {
    const val = asMonotonicDuration(200);
    const min = asMonotonicDuration(100);
    const max = asMonotonicDuration(200);
    expect(durationBetween(val, min, max)).toBe(true);
  });

  it("durationBetween() returns false when value is below range", () => {
    const val = asMonotonicDuration(50);
    const min = asMonotonicDuration(100);
    const max = asMonotonicDuration(200);
    expect(durationBetween(val, min, max)).toBe(false);
  });

  it("durationBetween() returns false when value is above range", () => {
    const val = asMonotonicDuration(250);
    const min = asMonotonicDuration(100);
    const max = asMonotonicDuration(200);
    expect(durationBetween(val, min, max)).toBe(false);
  });
});
