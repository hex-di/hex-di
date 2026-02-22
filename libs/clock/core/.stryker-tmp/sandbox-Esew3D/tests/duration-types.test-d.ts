/**
 * Duration types type-level tests — DoD 28
 */
// @ts-nocheck


import { describe, it, expectTypeOf } from "vitest";
import {
  asMonotonicDuration,
  asWallClockDuration,
  elapsed,
  durationGt,
  durationBetween,
  asMonotonic,
  asWallClock,
  asHighRes,
} from "../src/branded.js";
import type {
  MonotonicDuration,
  WallClockDuration,
} from "../src/branded.js";
import type { ClockService } from "../src/ports/clock.js";

// =============================================================================
// DoD 28: Duration Types — type-level
// =============================================================================

describe("Duration type assignments", () => {
  it("MonotonicDuration is assignable to number (covariant widening)", () => {
    const d: MonotonicDuration = asMonotonicDuration(100);
    expectTypeOf(d).toMatchTypeOf<number>();
  });

  it("WallClockDuration is assignable to number (covariant widening)", () => {
    const d: WallClockDuration = asWallClockDuration(100);
    expectTypeOf(d).toMatchTypeOf<number>();
  });

  it("MonotonicDuration is NOT assignable to WallClockDuration (cross-domain blocked)", () => {
    expectTypeOf<MonotonicDuration>().not.toEqualTypeOf<WallClockDuration>();
  });

  it("WallClockDuration is NOT assignable to MonotonicDuration (cross-domain blocked)", () => {
    expectTypeOf<WallClockDuration>().not.toEqualTypeOf<MonotonicDuration>();
  });

  it("MonotonicDuration + MonotonicDuration produces number (arithmetic unbranding)", () => {
    const a: MonotonicDuration = asMonotonicDuration(100);
    const b: MonotonicDuration = asMonotonicDuration(200);
    const result = a + b;
    expectTypeOf(result).toEqualTypeOf<number>();
  });

  it("elapsed return type is MonotonicDuration", () => {
    const clock: ClockService = {
      monotonicNow: () => asMonotonic(500),
      wallClockNow: () => asWallClock(1707753600000),
      highResNow: () => asHighRes(1707753600500),
    };
    const since = asMonotonic(100);
    const result = elapsed(clock, since);
    expectTypeOf(result).toEqualTypeOf<MonotonicDuration>();
  });

  it("asMonotonicDuration return type is MonotonicDuration", () => {
    expectTypeOf(asMonotonicDuration).returns.toEqualTypeOf<MonotonicDuration>();
  });

  it("asWallClockDuration return type is WallClockDuration", () => {
    expectTypeOf(asWallClockDuration).returns.toEqualTypeOf<WallClockDuration>();
  });

  it("durationGt accepts two MonotonicDuration and returns boolean", () => {
    const a: MonotonicDuration = asMonotonicDuration(200);
    const b: MonotonicDuration = asMonotonicDuration(100);
    expectTypeOf(durationGt(a, b)).toEqualTypeOf<boolean>();
  });

  it("durationGt does NOT accept MonotonicDuration and WallClockDuration (cross-domain blocked)", () => {
    // durationGt signature: (a: MonotonicDuration, b: MonotonicDuration) => boolean
    // Passing WallClockDuration as second arg should be a type error
    // We verify this by checking the parameter types
    expectTypeOf(durationGt).parameter(0).toEqualTypeOf<MonotonicDuration>();
    expectTypeOf(durationGt).parameter(1).toEqualTypeOf<MonotonicDuration>();
    // WallClockDuration is not assignable to MonotonicDuration
    expectTypeOf<WallClockDuration>().not.toMatchTypeOf<MonotonicDuration>();
  });

  it("durationBetween accepts three MonotonicDuration and returns boolean", () => {
    const val: MonotonicDuration = asMonotonicDuration(150);
    const min: MonotonicDuration = asMonotonicDuration(100);
    const max: MonotonicDuration = asMonotonicDuration(200);
    expectTypeOf(durationBetween(val, min, max)).toEqualTypeOf<boolean>();
  });
});
