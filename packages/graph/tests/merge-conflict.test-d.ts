/**
 * Type-level tests for merge conflict detection.
 *
 * These tests verify that merging two graphs with conflicting dependency
 * mappings produces a compile-time error instead of silently producing `never`.
 *
 * ## The Problem
 *
 * When merging `{ A: "B" } & { A: "C" }`, TypeScript intersection produces
 * `{ A: never }` because `"B" & "C"` is `never`. This can silently break
 * cycle detection because any port lookup for "A" will return `never`.
 *
 * ## The Solution
 *
 * We need `DetectMergeConflict` to catch this BEFORE cycle detection runs,
 * producing a clear HEX020 error message.
 */

import { describe, it, expectTypeOf } from "vitest";
import { GraphBuilder, createAdapter } from "../src/index.js";
import type {
  DetectMergeConflict,
  MergeConflictError,
  MergeConflictErrorMessage,
  CommonKeys,
  StringUnionEqual,
} from "../src/validation/types/index.js";
import { PortA, PortB, PortC, PortD } from "./fixtures.js";

// =============================================================================
// CommonKeys Utility Tests
// =============================================================================

describe("CommonKeys", () => {
  it("returns never for disjoint graphs", () => {
    type Graph1 = { A: "X" };
    type Graph2 = { B: "Y" };
    type Result = CommonKeys<Graph1, Graph2>;

    expectTypeOf<Result>().toBeNever();
  });

  it("returns the shared key for overlapping graphs", () => {
    type Graph1 = { A: "X"; B: "Y" };
    type Graph2 = { A: "Z"; C: "W" };
    type Result = CommonKeys<Graph1, Graph2>;

    expectTypeOf<Result>().toEqualTypeOf<"A">();
  });

  it("returns union of shared keys for multiple overlaps", () => {
    type Graph1 = { A: "X"; B: "Y"; C: "Z" };
    type Graph2 = { A: "P"; B: "Q"; D: "R" };
    type Result = CommonKeys<Graph1, Graph2>;

    expectTypeOf<Result>().toEqualTypeOf<"A" | "B">();
  });
});

// =============================================================================
// StringUnionEqual Utility Tests
// =============================================================================

describe("StringUnionEqual", () => {
  it("returns true for identical string unions", () => {
    type Result = StringUnionEqual<"A" | "B", "A" | "B">;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("returns true for single strings", () => {
    type Result = StringUnionEqual<"A", "A">;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("returns true for never equals never", () => {
    type Result = StringUnionEqual<never, never>;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("returns false for different strings", () => {
    type Result = StringUnionEqual<"A", "B">;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });

  it("returns false for subset unions", () => {
    type Result = StringUnionEqual<"A" | "B", "A">;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });

  it("returns false for superset unions", () => {
    type Result = StringUnionEqual<"A", "A" | "B">;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// DetectMergeConflict Tests
// =============================================================================

describe("DetectMergeConflict", () => {
  it("returns never for disjoint graphs (no shared ports)", () => {
    // Graph 1: A depends on nothing
    // Graph 2: B depends on nothing
    // No overlap, so no conflict possible
    type Graph1 = { A: never };
    type Graph2 = { B: never };
    type Result = DetectMergeConflict<Graph1, Graph2>;

    expectTypeOf<Result>().toBeNever();
  });

  it("returns never for compatible graphs (same deps)", () => {
    // Both graphs have port A depending on "B"
    // Same dependencies = no conflict
    type Graph1 = { A: "B" };
    type Graph2 = { A: "B" };
    type Result = DetectMergeConflict<Graph1, Graph2>;

    expectTypeOf<Result>().toBeNever();
  });

  it("returns never when both have same port with no deps", () => {
    // Both graphs have port A with no dependencies
    type Graph1 = { A: never };
    type Graph2 = { A: never };
    type Result = DetectMergeConflict<Graph1, Graph2>;

    expectTypeOf<Result>().toBeNever();
  });

  it("returns MergeConflictError for conflicting deps", () => {
    // Graph 1: A depends on "B"
    // Graph 2: A depends on "C"
    // CONFLICT! "B" & "C" would become never
    type Graph1 = { A: "B" };
    type Graph2 = { A: "C" };
    type Result = DetectMergeConflict<Graph1, Graph2>;

    expectTypeOf<Result>().toMatchTypeOf<MergeConflictError<"A", "B", "C">>();
  });

  it("returns MergeConflictError for one having deps and other not", () => {
    // Graph 1: A depends on "B"
    // Graph 2: A has no dependencies (never)
    // CONFLICT! "B" & never = never, but semantics differ
    type Graph1 = { A: "B" };
    type Graph2 = { A: never };
    type Result = DetectMergeConflict<Graph1, Graph2>;

    expectTypeOf<Result>().toMatchTypeOf<MergeConflictError<"A", "B", never>>();
  });

  it("finds first conflict among multiple shared ports", () => {
    // Both A and B are shared, but A has conflict
    type Graph1 = { A: "X"; B: "Y" };
    type Graph2 = { A: "Z"; B: "Y" };
    type Result = DetectMergeConflict<Graph1, Graph2>;

    // Should return conflict for A (or B if A is compatible - but here A conflicts)
    expectTypeOf<Result>().not.toBeNever();
  });

  it("handles complex union dependencies", () => {
    // Graph 1: A depends on "B" | "C"
    // Graph 2: A depends on "B" | "C"
    // Same union = compatible
    type Graph1 = { A: "B" | "C" };
    type Graph2 = { A: "B" | "C" };
    type Result = DetectMergeConflict<Graph1, Graph2>;

    expectTypeOf<Result>().toBeNever();
  });

  it("detects partial union overlap as conflict", () => {
    // Graph 1: A depends on "B" | "C"
    // Graph 2: A depends on "B" | "D"
    // Different unions = conflict
    type Graph1 = { A: "B" | "C" };
    type Graph2 = { A: "B" | "D" };
    type Result = DetectMergeConflict<Graph1, Graph2>;

    expectTypeOf<Result>().not.toBeNever();
  });
});

// =============================================================================
// MergeConflictErrorMessage Tests
// =============================================================================

describe("MergeConflictErrorMessage", () => {
  it("formats error with port name and both dependency sets", () => {
    type Msg = MergeConflictErrorMessage<"Logger", "Database", "Config">;

    // Verify it's a template literal string containing key info
    expectTypeOf<Msg>().toMatchTypeOf<`ERROR[HEX022]: ${string}`>();
  });

  it("handles never dependencies in message", () => {
    type Msg = MergeConflictErrorMessage<"Logger", "Database", never>;

    expectTypeOf<Msg>().toMatchTypeOf<`ERROR[HEX022]: ${string}`>();
  });

  it("handles union dependencies in message", () => {
    type Msg = MergeConflictErrorMessage<"Service", "A" | "B", "C" | "D">;

    expectTypeOf<Msg>().toMatchTypeOf<`ERROR[HEX022]: ${string}`>();
  });
});

// =============================================================================
// GraphBuilder.merge() Conflict Detection Tests
// =============================================================================

describe("GraphBuilder.merge() conflict detection", () => {
  it("produces HEX001 error when merging graphs with same port (duplicate check first)", () => {
    // Build two graphs that provide the same port
    // Note: The duplicate check runs BEFORE conflict detection in the chain,
    // so this will produce HEX001, not HEX020

    // Graph 1: Port A depends on B
    const adapterA1 = createAdapter({
      provides: PortA,
      requires: [PortB],
      lifetime: "singleton",
      factory: () => ({ doA: () => {} }),
    });

    // Graph 2: Port A depends on C (DIFFERENT from Graph 1!)
    const adapterA2 = createAdapter({
      provides: PortA,
      requires: [PortC],
      lifetime: "singleton",
      factory: () => ({ doA: () => {} }),
    });

    const graph1 = GraphBuilder.create().provide(adapterA1);
    const graph2 = GraphBuilder.create().provide(adapterA2);

    // Merge produces HEX001 because duplicate check runs first
    const merged = graph1.merge(graph2);

    // After duplicate check, this produces HEX001
    expectTypeOf(
      merged
    ).toEqualTypeOf<`ERROR[HEX001]: Duplicate adapter for 'A'. Fix: Remove one .provide() call, or use .override() for child graphs.`>();
  });

  it("allows merging disjoint graphs (no shared ports)", () => {
    const adapterA = createAdapter({
      provides: PortA,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ doA: () => {} }),
    });

    const adapterB = createAdapter({
      provides: PortB,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ doB: () => {} }),
    });

    const graph1 = GraphBuilder.create().provide(adapterA);
    const graph2 = GraphBuilder.create().provide(adapterB);

    // Disjoint graphs should merge successfully
    const merged = graph1.merge(graph2);

    // Should be a valid GraphBuilder, not an error string
    // Check it has the GraphBuilder shape (has __provides phantom)
    expectTypeOf(merged).toHaveProperty("__provides");
    expectTypeOf(merged).toHaveProperty("__requires");
  });
});
