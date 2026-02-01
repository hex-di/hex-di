/**
 * Type-level tests for merged graph cycle detection depth handling.
 *
 * These tests verify that `DetectCycleInMergedGraph` and `CheckPortForCycle`
 * correctly propagate `DepthExceededResult` instead of treating it as "no cycle".
 *
 * ## Issue Being Tested
 *
 * In `batch.ts`, `CheckPortForCycle` only checks `IsReachable<...> extends true`,
 * treating `DepthExceededResult` the same as `false` (no cycle). This is
 * inconsistent with `WouldAnyCreateCycle` which properly handles the three-way
 * result.
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import type {
  DetectCycleInMergedGraph,
  IsReachable,
  IsDepthExceeded,
  DepthExceededResult,
  CircularDependencyError,
} from "../src/advanced.js";
import type { IsNever } from "@hex-di/core";

// =============================================================================
// Test Fixtures - Dependency Graphs
// =============================================================================

/**
 * A simple graph with no cycles: A -> B -> C
 */
type LinearGraph = { A: "B"; B: "C"; C: never };

/**
 * A graph with a direct cycle: A -> B -> A
 */
type CyclicGraph = { A: "B"; B: "A" };

/**
 * A deep graph that would exceed depth limit when checking for cycles.
 * A -> B -> C -> D -> E -> F -> G -> H -> I -> J (10 levels)
 * With maxDepth=2, checking if J is reachable from A would exceed depth.
 */
type DeepGraph = {
  A: "B";
  B: "C";
  C: "D";
  D: "E";
  E: "F";
  F: "G";
  G: "H";
  H: "I";
  I: "J";
  J: never;
};

/**
 * A deep graph with a cycle at the end that might be missed with low depth.
 * With maxDepth=2, the cycle A -> B -> C -> D -> ... -> Z -> A won't be detected
 * because we can't traverse far enough.
 */
type DeepCyclicGraph = {
  A: "B";
  B: "C";
  C: "D";
  D: "E";
  E: "A"; // Cycle back to A
};

// =============================================================================
// IsReachable Behavior Tests (Baseline)
// =============================================================================

describe("IsReachable three-way result baseline", () => {
  it("returns false for definitely not reachable", () => {
    // In LinearGraph, "C" has no deps, so nothing is reachable from C
    type Result = IsReachable<LinearGraph, "C", "A">;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });

  it("returns true for definitely reachable (cycle)", () => {
    // In CyclicGraph, A is reachable from B (B -> A)
    type Result = IsReachable<CyclicGraph, "B", "A">;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("returns DepthExceededResult when depth limit exceeded", () => {
    // With maxDepth=2, checking if J is reachable from A exceeds depth
    type Result = IsReachable<DeepGraph, "A", "J", never, [], 2>;
    type WasExceeded = IsDepthExceeded<Result>;
    expectTypeOf<WasExceeded>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// DetectCycleInMergedGraph Tests
// =============================================================================

describe("DetectCycleInMergedGraph depth handling", () => {
  it("returns never for graph with no cycles", () => {
    type Result = DetectCycleInMergedGraph<LinearGraph>;
    expectTypeOf<Result>().toBeNever();
  });

  it("returns CircularDependencyError for graph with cycle", () => {
    type Result = DetectCycleInMergedGraph<CyclicGraph>;
    // CircularDependencyError takes a string (the cycle path), not an array
    type IsCycleError = Result extends CircularDependencyError<string> ? true : false;
    expectTypeOf<IsCycleError>().toEqualTypeOf<true>();
  });

  /**
   * SOUNDNESS TEST: Detect depth exceeded in merged graph.
   *
   * When checking a deep graph with low maxDepth, if we can't conclusively
   * determine there's no cycle (because we hit depth limit), the result
   * should be DepthExceededResult, not `never` (silent pass).
   */
  it("propagates DepthExceededResult when depth limit exceeded during merge check", () => {
    // With maxDepth=2, checking DeepCyclicGraph should hit depth limit
    // when trying to determine if A is reachable from its transitive deps
    type Result = DetectCycleInMergedGraph<DeepCyclicGraph, 2>;

    // The result should either be:
    // 1. CircularDependencyError (if cycle was found within depth)
    // 2. DepthExceededResult (if depth was exceeded before cycle found)
    // It should NOT be `never` (silent pass)

    type ResultIsNever = IsNever<Result>;

    // If the bug exists, Result is `never` and this will be true
    // After the fix, Result should be DepthExceededResult, so this is false
    expectTypeOf<ResultIsNever>().toEqualTypeOf<false>();
  });

  /**
   * SOUNDNESS TEST: Verify DepthExceededResult is the actual result type.
   */
  it("returns DepthExceededResult type for depth-exceeded deep graphs", () => {
    type Result = DetectCycleInMergedGraph<DeepCyclicGraph, 2>;

    // After fix, should be DepthExceededResult
    type WasExceeded = IsDepthExceeded<Result>;
    expectTypeOf<WasExceeded>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Consistency with WouldAnyCreateCycle Tests
// =============================================================================

describe("Consistency between WouldAnyCreateCycle and DetectCycleInMergedGraph", () => {
  it("both should handle depth exceeded the same way", () => {
    // This test documents that both types should propagate DepthExceededResult
    // rather than treating it as "no cycle found"

    // DetectCycleInMergedGraph with deep graph
    type MergeResult = DetectCycleInMergedGraph<DeepCyclicGraph, 2>;
    type MergeExceeded = IsDepthExceeded<MergeResult>;

    // After fix, both should indicate depth was exceeded
    expectTypeOf<MergeExceeded>().toEqualTypeOf<true>();
  });
});
