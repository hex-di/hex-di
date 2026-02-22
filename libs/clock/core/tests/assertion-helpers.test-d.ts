/**
 * Testing assertion helpers type-level tests — DoD 31
 */

import { describe, it, expectTypeOf } from "vitest";
import {
  assertMonotonic,
  assertTimeBetween,
  assertWallClockPlausible,
  assertSequenceOrdered,
} from "../src/testing/assertions.js";
import type { ClockAssertionError } from "../src/testing/assertions.js";
import type { Result } from "@hex-di/result";
import type {
  MonotonicTimestamp,
  MonotonicDuration,
  WallClockTimestamp,
} from "../src/branded.js";

// =============================================================================
// DoD 31: Testing Assertion Helpers — type-level
// =============================================================================

describe("Assertion helper type signatures", () => {
  it("assertMonotonic accepts ReadonlyArray<MonotonicTimestamp>", () => {
    expectTypeOf(assertMonotonic).parameter(0).toMatchTypeOf<ReadonlyArray<MonotonicTimestamp>>();
  });

  it("assertMonotonic returns Result<void, ClockAssertionError>", () => {
    expectTypeOf(assertMonotonic).returns.toEqualTypeOf<Result<void, ClockAssertionError>>();
  });

  it("assertTimeBetween accepts MonotonicDuration parameters", () => {
    expectTypeOf(assertTimeBetween).parameter(0).toMatchTypeOf<MonotonicDuration>();
    expectTypeOf(assertTimeBetween).parameter(1).toMatchTypeOf<MonotonicDuration>();
    expectTypeOf(assertTimeBetween).parameter(2).toMatchTypeOf<MonotonicDuration>();
  });

  it("assertTimeBetween returns Result<void, ClockAssertionError>", () => {
    expectTypeOf(assertTimeBetween).returns.toEqualTypeOf<Result<void, ClockAssertionError>>();
  });

  it("assertWallClockPlausible accepts WallClockTimestamp", () => {
    expectTypeOf(assertWallClockPlausible).parameter(0).toMatchTypeOf<WallClockTimestamp>();
  });

  it("assertWallClockPlausible returns Result<void, ClockAssertionError>", () => {
    expectTypeOf(assertWallClockPlausible).returns.toEqualTypeOf<Result<void, ClockAssertionError>>();
  });

  it("assertSequenceOrdered accepts ReadonlyArray<number>", () => {
    expectTypeOf(assertSequenceOrdered).parameter(0).toMatchTypeOf<ReadonlyArray<number>>();
  });

  it("assertSequenceOrdered returns Result<void, ClockAssertionError>", () => {
    expectTypeOf(assertSequenceOrdered).returns.toEqualTypeOf<Result<void, ClockAssertionError>>();
  });
});
