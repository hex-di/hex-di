/**
 * Branded timestamp type-level tests — DoD 17
 */

import { describe, it, expectTypeOf } from "vitest";
import {
  asMonotonic,
  asWallClock,
  asHighRes,
} from "../src/branded.js";
import type {
  MonotonicTimestamp,
  WallClockTimestamp,
  HighResTimestamp,
  MonotonicDuration,
  WallClockDuration,
} from "../src/branded.js";

describe("Branded timestamp type assignments", () => {
  it("MonotonicTimestamp is assignable to number (covariant widening)", () => {
    const t: MonotonicTimestamp = asMonotonic(0);
    expectTypeOf(t).toMatchTypeOf<number>();
  });

  it("WallClockTimestamp is assignable to number (covariant widening)", () => {
    const t: WallClockTimestamp = asWallClock(0);
    expectTypeOf(t).toMatchTypeOf<number>();
  });

  it("HighResTimestamp is assignable to number (covariant widening)", () => {
    const t: HighResTimestamp = asHighRes(0);
    expectTypeOf(t).toMatchTypeOf<number>();
  });

  it("MonotonicTimestamp + MonotonicTimestamp produces number (arithmetic unbranding)", () => {
    const a: MonotonicTimestamp = asMonotonic(1);
    const b: MonotonicTimestamp = asMonotonic(2);
    const result = a + b;
    expectTypeOf(result).toEqualTypeOf<number>();
  });

  it("MonotonicTimestamp - MonotonicTimestamp produces number (arithmetic unbranding)", () => {
    const a: MonotonicTimestamp = asMonotonic(10);
    const b: MonotonicTimestamp = asMonotonic(5);
    const result = a - b;
    expectTypeOf(result).toEqualTypeOf<number>();
  });

  it("WallClockTimestamp * number produces number (arithmetic unbranding)", () => {
    const t: WallClockTimestamp = asWallClock(1000);
    const result = t * 2;
    expectTypeOf(result).toEqualTypeOf<number>();
  });

  it("HighResTimestamp / number produces number (arithmetic unbranding)", () => {
    const t: HighResTimestamp = asHighRes(1000);
    const result = t / 2;
    expectTypeOf(result).toEqualTypeOf<number>();
  });

  it("MonotonicTimestamp is NOT assignable to WallClockTimestamp (cross-domain blocked)", () => {
    expectTypeOf<MonotonicTimestamp>().not.toEqualTypeOf<WallClockTimestamp>();
  });

  it("MonotonicTimestamp is NOT assignable to HighResTimestamp (cross-domain blocked)", () => {
    expectTypeOf<MonotonicTimestamp>().not.toEqualTypeOf<HighResTimestamp>();
  });

  it("WallClockTimestamp is NOT assignable to MonotonicTimestamp (cross-domain blocked)", () => {
    expectTypeOf<WallClockTimestamp>().not.toEqualTypeOf<MonotonicTimestamp>();
  });

  it("WallClockTimestamp is NOT assignable to HighResTimestamp (cross-domain blocked)", () => {
    expectTypeOf<WallClockTimestamp>().not.toEqualTypeOf<HighResTimestamp>();
  });

  it("HighResTimestamp is NOT assignable to MonotonicTimestamp (cross-domain blocked)", () => {
    expectTypeOf<HighResTimestamp>().not.toEqualTypeOf<MonotonicTimestamp>();
  });

  it("HighResTimestamp is NOT assignable to WallClockTimestamp (cross-domain blocked)", () => {
    expectTypeOf<HighResTimestamp>().not.toEqualTypeOf<WallClockTimestamp>();
  });

  it("asMonotonic return type is MonotonicTimestamp (not number)", () => {
    expectTypeOf(asMonotonic).returns.toEqualTypeOf<MonotonicTimestamp>();
  });

  it("asWallClock return type is WallClockTimestamp (not number)", () => {
    expectTypeOf(asWallClock).returns.toEqualTypeOf<WallClockTimestamp>();
  });

  it("asHighRes return type is HighResTimestamp (not number)", () => {
    expectTypeOf(asHighRes).returns.toEqualTypeOf<HighResTimestamp>();
  });

  it("MonotonicDuration is not assignable to WallClockDuration", () => {
    expectTypeOf<MonotonicDuration>().not.toEqualTypeOf<WallClockDuration>();
  });
});
