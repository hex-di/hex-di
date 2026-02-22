/**
 * Testing assertion helpers type-level tests — DoD 31
 */
// @ts-nocheck


import { describe, it, expectTypeOf } from "vitest";
import {
  assertMonotonic,
  assertTimeBetween,
  assertWallClockPlausible,
  assertSequenceOrdered,
} from "../src/testing/assertions.js";
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

  it("assertMonotonic returns void", () => {
    expectTypeOf(assertMonotonic).returns.toEqualTypeOf<void>();
  });

  it("assertTimeBetween accepts MonotonicDuration parameters", () => {
    expectTypeOf(assertTimeBetween).parameter(0).toMatchTypeOf<MonotonicDuration>();
    expectTypeOf(assertTimeBetween).parameter(1).toMatchTypeOf<MonotonicDuration>();
    expectTypeOf(assertTimeBetween).parameter(2).toMatchTypeOf<MonotonicDuration>();
  });

  it("assertTimeBetween returns void", () => {
    expectTypeOf(assertTimeBetween).returns.toEqualTypeOf<void>();
  });

  it("assertWallClockPlausible accepts WallClockTimestamp", () => {
    expectTypeOf(assertWallClockPlausible).parameter(0).toMatchTypeOf<WallClockTimestamp>();
  });

  it("assertWallClockPlausible returns void", () => {
    expectTypeOf(assertWallClockPlausible).returns.toEqualTypeOf<void>();
  });

  it("assertSequenceOrdered accepts ReadonlyArray<number>", () => {
    expectTypeOf(assertSequenceOrdered).parameter(0).toMatchTypeOf<ReadonlyArray<number>>();
  });

  it("assertSequenceOrdered returns void", () => {
    expectTypeOf(assertSequenceOrdered).returns.toEqualTypeOf<void>();
  });
});
