/**
 * Type-level tests for DepthExceeded distribution behavior.
 *
 * Verifies that DepthExceeded handles union types correctly and doesn't
 * produce unexpected results due to distributive conditional types.
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import type { DepthExceeded, Depth, IncrementDepth } from "../src/advanced.js";

// Test alternative: tuple-wrapped version to prevent distribution
type DepthExceededTupleWrapped<TDepthCounter extends Depth, TMaxDepth extends number> = [
  TDepthCounter["length"],
] extends [TMaxDepth]
  ? true
  : false;

// Helper to create a depth tuple of a specific length
type MakeDepth<N extends number, Acc extends Depth = []> = Acc["length"] extends N
  ? Acc
  : MakeDepth<N, IncrementDepth<Acc>>;

// =============================================================================
// Normal Operation Tests
// =============================================================================

describe("DepthExceeded normal operation", () => {
  it("returns false when depth is less than max", () => {
    type Depth5 = MakeDepth<5>;
    type Result = DepthExceeded<Depth5, 10>;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });

  it("returns true when depth equals max", () => {
    type Depth10 = MakeDepth<10>;
    type Result = DepthExceeded<Depth10, 10>;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("returns false when depth is past max (equality check by design)", () => {
    type Depth15 = MakeDepth<15>;
    type Result = DepthExceeded<Depth15, 10>;
    // DepthExceeded uses equality check (extends), not >= comparison.
    // This is correct by design: in the IsReachable algorithm, the depth counter
    // is checked BEFORE recursion, so it can only ever REACH maxDepth, never exceed it.
    // The counter goes 0, 1, ..., maxDepth, and at maxDepth it returns true and stops.
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// Union Distribution Edge Cases
// =============================================================================

describe("DepthExceeded with union TMaxDepth", () => {
  // The expert concern: what if TMaxDepth is a union?
  it("handles union TMaxDepth - depth below all", () => {
    type Depth5 = MakeDepth<5>;
    // If max is 10 | 20, depth 5 should not be exceeded
    type Result = DepthExceeded<Depth5, 10 | 20>;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });

  it("handles union TMaxDepth - depth matches first", () => {
    type Depth10 = MakeDepth<10>;
    // If max is 10 | 20, depth 10 matches first option
    // Current behavior: 10 extends (10 | 20) = true, so exceeded
    type Result = DepthExceeded<Depth10, 10 | 20>;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("handles union TMaxDepth - depth between options", () => {
    type Depth15 = MakeDepth<15>;
    // If max is 10 | 20, depth 15 doesn't match either union member
    // Result: 15 extends (10 | 20) = false
    // This is defensive/conservative for union types: depth must match exactly.
    // In practice, ValidateMaxDepth prevents union types via the public API.
    type Result = DepthExceeded<Depth15, 10 | 20>;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// Widened Number Type Edge Case
// =============================================================================

describe("DepthExceeded with widened number", () => {
  it("handles TMaxDepth = number (widened)", () => {
    type Depth10 = MakeDepth<10>;
    // If max is widened to `number`, any depth "matches"
    // Current behavior: 10 extends number = true
    type Result = DepthExceeded<Depth10, number>;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Comparison: Current vs Tuple-Wrapped
// =============================================================================

describe("Comparison: current vs tuple-wrapped behavior", () => {
  it("both return same result for exact match", () => {
    type Depth10 = MakeDepth<10>;
    type Current = DepthExceeded<Depth10, 10>;
    type Wrapped = DepthExceededTupleWrapped<Depth10, 10>;

    expectTypeOf<Current>().toEqualTypeOf<true>();
    expectTypeOf<Wrapped>().toEqualTypeOf<true>();
  });

  it("both return same result for less than max", () => {
    type Depth5 = MakeDepth<5>;
    type Current = DepthExceeded<Depth5, 10>;
    type Wrapped = DepthExceededTupleWrapped<Depth5, 10>;

    expectTypeOf<Current>().toEqualTypeOf<false>();
    expectTypeOf<Wrapped>().toEqualTypeOf<false>();
  });

  it("with union max: both versions return true when depth matches union member", () => {
    type Depth10 = MakeDepth<10>;

    // Current: 10 extends (10 | 20) = true (assignable to union member)
    type Current = DepthExceeded<Depth10, 10 | 20>;
    expectTypeOf<Current>().toEqualTypeOf<true>();

    // Wrapped: [10] extends [10 | 20] = true (tuple element assignable to union)
    // Both versions have the same behavior - tuples don't prevent this
    type Wrapped = DepthExceededTupleWrapped<Depth10, 10 | 20>;
    expectTypeOf<Wrapped>().toEqualTypeOf<true>();
  });

  it("with widened number: both return true (literal assignable to number)", () => {
    type Depth10 = MakeDepth<10>;

    // Current: 10 extends number = true
    type Current = DepthExceeded<Depth10, number>;
    expectTypeOf<Current>().toEqualTypeOf<true>();

    // Wrapped: [10] extends [number] = true (literal tuple element assignable to number)
    type Wrapped = DepthExceededTupleWrapped<Depth10, number>;
    expectTypeOf<Wrapped>().toEqualTypeOf<true>();
  });
});
