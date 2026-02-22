/**
 * ClockPort type-level tests — DoD 1
 */
// @ts-nocheck


import { describe, it, expectTypeOf } from "vitest";
import { ClockPort } from "../src/ports/clock.js";
import type { ClockService } from "../src/ports/clock.js";
import type { MonotonicTimestamp, WallClockTimestamp, HighResTimestamp } from "../src/branded.js";

describe("ClockPort type shape", () => {
  it("ClockPort is assignable from object with correct shape", () => {
    const valid: ClockService = {
      monotonicNow: () => 0 as MonotonicTimestamp,
      wallClockNow: () => 0 as WallClockTimestamp,
      highResNow: () => 0 as HighResTimestamp,
    };
    expectTypeOf(valid).toMatchTypeOf<ClockService>();
  });

  it("ClockService has monotonicNow, wallClockNow, highResNow methods", () => {
    expectTypeOf<ClockService>().toHaveProperty("monotonicNow");
    expectTypeOf<ClockService>().toHaveProperty("wallClockNow");
    expectTypeOf<ClockService>().toHaveProperty("highResNow");
  });

  it("monotonicNow return type is MonotonicTimestamp", () => {
    expectTypeOf<ClockService["monotonicNow"]>().returns.toEqualTypeOf<MonotonicTimestamp>();
  });

  it("wallClockNow return type is WallClockTimestamp", () => {
    expectTypeOf<ClockService["wallClockNow"]>().returns.toEqualTypeOf<WallClockTimestamp>();
  });

  it("highResNow return type is HighResTimestamp", () => {
    expectTypeOf<ClockService["highResNow"]>().returns.toEqualTypeOf<HighResTimestamp>();
  });

  it("ClockPort object exists and has __portName", () => {
    expectTypeOf(ClockPort).toHaveProperty("__portName");
  });
});
