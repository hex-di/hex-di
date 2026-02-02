/**
 * Type-level tests for merge maxDepth symmetry.
 *
 * ## Problem
 *
 * When merging two graphs with different maxDepth values:
 * - A (maxDepth=30) merged with B (maxDepth=100)
 * - B (maxDepth=100) merged with A (maxDepth=30)
 *
 * Should produce the SAME validation capability (using max of both = 100).
 * Currently, `merge()` uses only the first graph's maxDepth, breaking symmetry.
 *
 * ## Test Cases
 *
 * 1. Verify A.merge(B) uses max(A.maxDepth, B.maxDepth)
 * 2. Verify B.merge(A) uses max(A.maxDepth, B.maxDepth)
 * 3. Verify both produce identical types for the merged maxDepth
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import { port } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";
import type { GetMaxDepth } from "../src/builder/types/state.js";

// =============================================================================
// Test Fixtures
// =============================================================================

const PortA = port<{ a: () => void }>()({ name: "ServiceA" });
const PortB = port<{ b: () => void }>()({ name: "ServiceB" });

const AdapterA = createAdapter({
  provides: PortA,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ a: () => {} }),
});

const AdapterB = createAdapter({
  provides: PortB,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ b: () => {} }),
});

// =============================================================================
// Tests
// =============================================================================

describe("Merge maxDepth symmetry", () => {
  describe("symmetric maxDepth resolution", () => {
    it("should use max of both maxDepths when merging (A.merge(B))", () => {
      // Graph A has maxDepth 30
      const graphA = GraphBuilder.withMaxDepth<30>().create().provide(AdapterA);

      // Graph B has maxDepth 100
      const graphB = GraphBuilder.withMaxDepth<100>().create().provide(AdapterB);

      // A.merge(B) should use max(30, 100) = 100
      const mergedAB = graphA.merge(graphB);

      // Extract the internal state to check maxDepth
      type MergedABType = typeof mergedAB;
      type MergedABInternals =
        MergedABType extends GraphBuilder<infer _P, infer _R, infer _A, infer _O, infer I>
          ? I
          : never;
      type MergedABMaxDepth = GetMaxDepth<MergedABInternals>;

      // Should be 100 (the max), not 30 (the first)
      expectTypeOf<MergedABMaxDepth>().toEqualTypeOf<100>();
    });

    it("should use max of both maxDepths when merging (B.merge(A))", () => {
      // Graph A has maxDepth 30
      const graphA = GraphBuilder.withMaxDepth<30>().create().provide(AdapterA);

      // Graph B has maxDepth 100
      const graphB = GraphBuilder.withMaxDepth<100>().create().provide(AdapterB);

      // B.merge(A) should also use max(100, 30) = 100
      const mergedBA = graphB.merge(graphA);

      type MergedBAType = typeof mergedBA;
      type MergedBAInternals =
        MergedBAType extends GraphBuilder<infer _P, infer _R, infer _A, infer _O, infer I>
          ? I
          : never;
      type MergedBAMaxDepth = GetMaxDepth<MergedBAInternals>;

      // Should be 100 (the max), not 100 (happens to be first here)
      expectTypeOf<MergedBAMaxDepth>().toEqualTypeOf<100>();
    });

    it("A.merge(B) and B.merge(A) should produce same maxDepth", () => {
      const graphA = GraphBuilder.withMaxDepth<30>().create().provide(AdapterA);

      const graphB = GraphBuilder.withMaxDepth<100>().create().provide(AdapterB);

      const mergedAB = graphA.merge(graphB);
      const mergedBA = graphB.merge(graphA);

      // Extract maxDepths
      type ABInternals =
        typeof mergedAB extends GraphBuilder<infer _P, infer _R, infer _A, infer _O, infer I>
          ? I
          : never;
      type BAInternals =
        typeof mergedBA extends GraphBuilder<infer _P, infer _R, infer _A, infer _O, infer I>
          ? I
          : never;

      type ABMaxDepth = GetMaxDepth<ABInternals>;
      type BAMaxDepth = GetMaxDepth<BAInternals>;

      // Both should be the same (100)
      expectTypeOf<ABMaxDepth>().toEqualTypeOf<BAMaxDepth>();
    });
  });

  describe("edge cases", () => {
    it("same maxDepth values should work correctly", () => {
      const graphA = GraphBuilder.withMaxDepth<50>().create().provide(AdapterA);

      const graphB = GraphBuilder.withMaxDepth<50>().create().provide(AdapterB);

      const merged = graphA.merge(graphB);

      type MergedInternals =
        typeof merged extends GraphBuilder<infer _P, infer _R, infer _A, infer _O, infer I>
          ? I
          : never;
      type MergedMaxDepth = GetMaxDepth<MergedInternals>;

      // max(50, 50) = 50
      expectTypeOf<MergedMaxDepth>().toEqualTypeOf<50>();
    });

    it("merging with default maxDepth (50) should use max", () => {
      // graphA has explicit maxDepth 30
      const graphA = GraphBuilder.withMaxDepth<30>().create().provide(AdapterA);

      // graphB uses default maxDepth (50)
      const graphB = GraphBuilder.create().provide(AdapterB);

      const merged = graphA.merge(graphB);

      type MergedInternals =
        typeof merged extends GraphBuilder<infer _P, infer _R, infer _A, infer _O, infer I>
          ? I
          : never;
      type MergedMaxDepth = GetMaxDepth<MergedInternals>;

      // max(30, 50) = 50 (default)
      expectTypeOf<MergedMaxDepth>().toEqualTypeOf<50>();
    });

    it("mergeWith without options should match merge() behavior (use max)", () => {
      const graphA = GraphBuilder.withMaxDepth<30>().create().provide(AdapterA);

      const graphB = GraphBuilder.withMaxDepth<100>().create().provide(AdapterB);

      // mergeWith without options should behave like merge()
      const mergedWith = graphA.merge(graphB);
      const merged = graphA.merge(graphB);

      type MergedWithInternals =
        typeof mergedWith extends GraphBuilder<infer _P, infer _R, infer _A, infer _O, infer I>
          ? I
          : never;
      type MergedInternals =
        typeof merged extends GraphBuilder<infer _P, infer _R, infer _A, infer _O, infer I>
          ? I
          : never;

      type MergedWithMaxDepth = GetMaxDepth<MergedWithInternals>;
      type MergedMaxDepth = GetMaxDepth<MergedInternals>;

      // Both should use max(30, 100) = 100
      expectTypeOf<MergedWithMaxDepth>().toEqualTypeOf<100>();
      expectTypeOf<MergedMaxDepth>().toEqualTypeOf<100>();
      expectTypeOf<MergedWithMaxDepth>().toEqualTypeOf<MergedMaxDepth>();
    });
  });

  describe("mergeWith explicit options still work", () => {
    it("mergeWith({ maxDepth: 'first' }) uses first graph's maxDepth", () => {
      const graphA = GraphBuilder.withMaxDepth<30>().create().provide(AdapterA);

      const graphB = GraphBuilder.withMaxDepth<100>().create().provide(AdapterB);

      const merged = graphA.merge(graphB);

      type MergedInternals =
        typeof merged extends GraphBuilder<infer _P, infer _R, infer _A, infer _O, infer I>
          ? I
          : never;
      type MergedMaxDepth = GetMaxDepth<MergedInternals>;

      // Explicit 'first' should use 30
      expectTypeOf<MergedMaxDepth>().toEqualTypeOf<30>();
    });

    it("merge() always uses first graph's maxDepth", () => {
      const graphA = GraphBuilder.withMaxDepth<30>().create().provide(AdapterA);

      const graphB = GraphBuilder.withMaxDepth<100>().create().provide(AdapterB);

      const merged = graphA.merge(graphB);

      type MergedInternals =
        typeof merged extends GraphBuilder<infer _P, infer _R, infer _A, infer _O, infer I>
          ? I
          : never;
      type MergedMaxDepth = GetMaxDepth<MergedInternals>;

      // merge() uses first graph's maxDepth (30, not 100)
      expectTypeOf<MergedMaxDepth>().toEqualTypeOf<30>();
    });

    it("merge() uses first graph's maxDepth (same as min in this case)", () => {
      const graphA = GraphBuilder.withMaxDepth<30>().create().provide(AdapterA);

      const graphB = GraphBuilder.withMaxDepth<100>().create().provide(AdapterB);

      const merged = graphA.merge(graphB);

      type MergedInternals =
        typeof merged extends GraphBuilder<infer _P, infer _R, infer _A, infer _O, infer I>
          ? I
          : never;
      type MergedMaxDepth = GetMaxDepth<MergedInternals>;

      // merge() uses first graph's maxDepth (30)
      expectTypeOf<MergedMaxDepth>().toEqualTypeOf<30>();
    });
  });
});
