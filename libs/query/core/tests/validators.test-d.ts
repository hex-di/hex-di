/**
 * Type-level tests for IsReachable, AddEdge, and graph reachability.
 */

import { expectTypeOf, describe, it } from "vitest";
import type { AddEdge, IsReachable } from "../src/index.js";

// =============================================================================
// AddEdge
// =============================================================================

describe("AddEdge", () => {
  it("adds an edge to an empty graph", () => {
    type Graph = AddEdge<Record<string, never>, "A", "B">;
    expectTypeOf<Graph["A"]>().toEqualTypeOf<"B">();
  });
});

// =============================================================================
// IsReachable
// =============================================================================

describe("IsReachable", () => {
  it("detects direct reachability (A→B)", () => {
    // A → B
    type Graph = { readonly A: "B" };
    type Result = IsReachable<Graph, "A", "B">;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("detects transitive reachability (A→B→C→D)", () => {
    type Graph = {
      readonly A: "B";
      readonly B: "C";
      readonly C: "D";
    };
    type Result = IsReachable<Graph, "A", "D">;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("detects cycle (A→B→C→A)", () => {
    type Graph = {
      readonly A: "B";
      readonly B: "C";
      readonly C: "A";
    };
    // A can reach itself through the cycle
    type Result = IsReachable<Graph, "A", "A">;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("returns false for unreachable nodes", () => {
    type Graph = {
      readonly A: "B";
      readonly C: "D";
    };
    // A cannot reach D (no edge from B to anything)
    type Result = IsReachable<Graph, "A", "D">;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });

  it("returns false for empty graph", () => {
    type Graph = Record<string, never>;
    type Result = IsReachable<Graph, "A", "B">;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });

  it("handles branching graph (A→B, A→C, C→D)", () => {
    type Graph = {
      readonly A: "B" | "C";
      readonly C: "D";
    };
    type ReachD = IsReachable<Graph, "A", "D">;
    expectTypeOf<ReachD>().toEqualTypeOf<true>();

    type ReachB = IsReachable<Graph, "A", "B">;
    expectTypeOf<ReachB>().toEqualTypeOf<true>();
  });

  it("does not infinitely recurse on self-cycle", () => {
    type Graph = {
      readonly A: "A";
    };
    // A → A: A is reachable from A directly
    type Result = IsReachable<Graph, "A", "A">;
    expectTypeOf<Result>().toEqualTypeOf<true>();

    // But B is not reachable from A (only self-loop)
    type NotReachable = IsReachable<Graph, "A", "B">;
    expectTypeOf<NotReachable>().toEqualTypeOf<false>();
  });
});
