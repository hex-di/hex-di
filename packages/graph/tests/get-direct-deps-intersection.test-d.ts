/**
 * Test: GetDirectDeps Intersection Type Distribution
 *
 * Verifies that GetDirectDeps works correctly when TDepGraph is an
 * intersection type from merged graphs.
 *
 * The concern: When TDepGraph is `{ A: never } & { B: "A" }`, does
 * indexed access `TDepGraph[TPort]` distribute correctly over the intersection?
 *
 * @packageDocumentation
 */

import { describe, it, expectTypeOf } from "vitest";
import type {
  GetDirectDeps,
  MergeDependencyMaps,
} from "../src/validation/types/cycle/detection.js";

// =============================================================================
// Test Scenarios
// =============================================================================

// Graph 1: Logger has no dependencies
type Graph1 = {
  Logger: never;
};

// Graph 2: UserService depends on Logger
type Graph2 = {
  UserService: "Logger";
};

// Graph 3: Database has no dependencies
type Graph3 = {
  Database: never;
};

// Graph 4: Repository depends on Logger and Database
type Graph4 = {
  Repository: "Logger" | "Database";
};

// Overlapping key scenario (same key in both graphs)
type GraphA = {
  SharedPort: "Dep1";
};

type GraphB = {
  SharedPort: "Dep2"; // Same key, different deps
};

// =============================================================================
// Intersection Type Tests (Raw)
// =============================================================================

describe("GetDirectDeps with raw intersection types", () => {
  describe("simple intersection: { A: never } & { B: string }", () => {
    type RawIntersection = Graph1 & Graph2;

    it("correctly accesses keys from first graph", () => {
      // Logger from Graph1
      type Result = GetDirectDeps<RawIntersection, "Logger">;
      expectTypeOf<Result>().toEqualTypeOf<never>();
    });

    it("correctly accesses keys from second graph", () => {
      // UserService from Graph2
      type Result = GetDirectDeps<RawIntersection, "UserService">;
      expectTypeOf<Result>().toEqualTypeOf<"Logger">();
    });

    it("correctly handles missing keys", () => {
      type Result = GetDirectDeps<RawIntersection, "NotFound">;
      expectTypeOf<Result>().toEqualTypeOf<never>();
    });
  });

  describe("multi-graph intersection: A & B & C & D", () => {
    type MultiIntersection = Graph1 & Graph2 & Graph3 & Graph4;

    it("correctly accesses Logger from Graph1", () => {
      type Result = GetDirectDeps<MultiIntersection, "Logger">;
      expectTypeOf<Result>().toEqualTypeOf<never>();
    });

    it("correctly accesses UserService from Graph2", () => {
      type Result = GetDirectDeps<MultiIntersection, "UserService">;
      expectTypeOf<Result>().toEqualTypeOf<"Logger">();
    });

    it("correctly accesses Database from Graph3", () => {
      type Result = GetDirectDeps<MultiIntersection, "Database">;
      expectTypeOf<Result>().toEqualTypeOf<never>();
    });

    it("correctly accesses Repository from Graph4", () => {
      type Result = GetDirectDeps<MultiIntersection, "Repository">;
      expectTypeOf<Result>().toEqualTypeOf<"Logger" | "Database">();
    });
  });

  describe("overlapping keys intersection", () => {
    type OverlappingIntersection = GraphA & GraphB;

    it("intersects values for overlapping keys", () => {
      // When same key exists in both, values are intersected
      // "Dep1" & "Dep2" = never (no common string)
      type Result = GetDirectDeps<OverlappingIntersection, "SharedPort">;
      expectTypeOf<Result>().toEqualTypeOf<never>();
    });
  });
});

// =============================================================================
// Prettified Intersection Tests (MergeDependencyMaps)
// =============================================================================

describe("GetDirectDeps with MergeDependencyMaps (Prettify)", () => {
  describe("simple merge: Graph1 & Graph2", () => {
    type MergedGraph = MergeDependencyMaps<Graph1, Graph2>;

    it("correctly accesses keys from first graph", () => {
      type Result = GetDirectDeps<MergedGraph, "Logger">;
      expectTypeOf<Result>().toEqualTypeOf<never>();
    });

    it("correctly accesses keys from second graph", () => {
      type Result = GetDirectDeps<MergedGraph, "UserService">;
      expectTypeOf<Result>().toEqualTypeOf<"Logger">();
    });

    it("merged type has correct keyof", () => {
      type Keys = keyof MergedGraph;
      expectTypeOf<Keys>().toEqualTypeOf<"Logger" | "UserService">();
    });

    it("merged type is flattened (not intersection)", () => {
      // Prettify should flatten the intersection into a single object type
      type Expected = { Logger: never; UserService: "Logger" };
      expectTypeOf<MergedGraph>().toEqualTypeOf<Expected>();
    });
  });

  describe("chained merges: ((G1 & G2) & G3) & G4", () => {
    type Merged12 = MergeDependencyMaps<Graph1, Graph2>;
    type Merged123 = MergeDependencyMaps<Merged12, Graph3>;
    type Merged1234 = MergeDependencyMaps<Merged123, Graph4>;

    it("correctly accesses all ports", () => {
      expectTypeOf<GetDirectDeps<Merged1234, "Logger">>().toEqualTypeOf<never>();
      expectTypeOf<GetDirectDeps<Merged1234, "UserService">>().toEqualTypeOf<"Logger">();
      expectTypeOf<GetDirectDeps<Merged1234, "Database">>().toEqualTypeOf<never>();
      expectTypeOf<GetDirectDeps<Merged1234, "Repository">>().toEqualTypeOf<
        "Logger" | "Database"
      >();
    });

    it("has all expected keys", () => {
      type Keys = keyof Merged1234;
      expectTypeOf<Keys>().toEqualTypeOf<"Logger" | "UserService" | "Database" | "Repository">();
    });
  });

  describe("overlapping keys with MergeDependencyMaps", () => {
    type MergedOverlapping = MergeDependencyMaps<GraphA, GraphB>;

    it("intersects values for overlapping keys (same as raw)", () => {
      // Prettify preserves the intersection semantics for values
      type Result = GetDirectDeps<MergedOverlapping, "SharedPort">;
      expectTypeOf<Result>().toEqualTypeOf<never>();
    });
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe("edge cases for intersection distribution", () => {
  describe("empty graph intersection", () => {
    type EmptyGraph = Record<never, never>;
    type MergedWithEmpty = MergeDependencyMaps<Graph1, EmptyGraph>;

    it("merging with empty preserves original", () => {
      type Result = GetDirectDeps<MergedWithEmpty, "Logger">;
      expectTypeOf<Result>().toEqualTypeOf<never>();
    });
  });

  describe("union types in dependency values", () => {
    type GraphWithUnion = {
      ServiceA: "Dep1" | "Dep2";
      ServiceB: "Dep3";
    };

    type MergedWithUnion = MergeDependencyMaps<Graph1, GraphWithUnion>;

    it("preserves union types in values", () => {
      type Result = GetDirectDeps<MergedWithUnion, "ServiceA">;
      expectTypeOf<Result>().toEqualTypeOf<"Dep1" | "Dep2">();
    });
  });

  describe("deeply nested merges", () => {
    // Simulate 5 sequential merges
    type G1 = { A: never };
    type G2 = { B: "A" };
    type G3 = { C: "B" };
    type G4 = { D: "C" };
    type G5 = { E: "D" };

    type M1 = MergeDependencyMaps<G1, G2>;
    type M2 = MergeDependencyMaps<M1, G3>;
    type M3 = MergeDependencyMaps<M2, G4>;
    type M4 = MergeDependencyMaps<M3, G5>;

    it("correctly resolves all ports after deep merging", () => {
      expectTypeOf<GetDirectDeps<M4, "A">>().toEqualTypeOf<never>();
      expectTypeOf<GetDirectDeps<M4, "B">>().toEqualTypeOf<"A">();
      expectTypeOf<GetDirectDeps<M4, "C">>().toEqualTypeOf<"B">();
      expectTypeOf<GetDirectDeps<M4, "D">>().toEqualTypeOf<"C">();
      expectTypeOf<GetDirectDeps<M4, "E">>().toEqualTypeOf<"D">();
    });
  });

  describe("large intersection scenario", () => {
    // Simulate merging 10 adapters (realistic enterprise scenario)
    type Ports = {
      Logger: never;
      Config: never;
      Database: "Config";
      Cache: "Config";
      UserRepo: "Database";
      ProductRepo: "Database" | "Cache";
      AuthService: "UserRepo" | "Logger";
      CartService: "ProductRepo" | "Logger";
      OrderService: "UserRepo" | "ProductRepo" | "Logger";
      PaymentService: "OrderService" | "AuthService";
    };

    // Split into smaller graphs and merge (simulating multiple provide/merge calls)
    type Part1 = { Logger: never; Config: never };
    type Part2 = { Database: "Config"; Cache: "Config" };
    type Part3 = { UserRepo: "Database"; ProductRepo: "Database" | "Cache" };
    type Part4 = {
      AuthService: "UserRepo" | "Logger";
      CartService: "ProductRepo" | "Logger";
    };
    type Part5 = {
      OrderService: "UserRepo" | "ProductRepo" | "Logger";
      PaymentService: "OrderService" | "AuthService";
    };

    type Merged = MergeDependencyMaps<
      MergeDependencyMaps<MergeDependencyMaps<MergeDependencyMaps<Part1, Part2>, Part3>, Part4>,
      Part5
    >;

    it("merged graph matches original full graph", () => {
      // Verify all port lookups work correctly
      expectTypeOf<GetDirectDeps<Merged, "Logger">>().toEqualTypeOf<never>();
      expectTypeOf<GetDirectDeps<Merged, "Config">>().toEqualTypeOf<never>();
      expectTypeOf<GetDirectDeps<Merged, "Database">>().toEqualTypeOf<"Config">();
      expectTypeOf<GetDirectDeps<Merged, "Cache">>().toEqualTypeOf<"Config">();
      expectTypeOf<GetDirectDeps<Merged, "UserRepo">>().toEqualTypeOf<"Database">();
      expectTypeOf<GetDirectDeps<Merged, "ProductRepo">>().toEqualTypeOf<"Database" | "Cache">();
      expectTypeOf<GetDirectDeps<Merged, "AuthService">>().toEqualTypeOf<"UserRepo" | "Logger">();
      expectTypeOf<GetDirectDeps<Merged, "CartService">>().toEqualTypeOf<
        "ProductRepo" | "Logger"
      >();
      expectTypeOf<GetDirectDeps<Merged, "OrderService">>().toEqualTypeOf<
        "UserRepo" | "ProductRepo" | "Logger"
      >();
      expectTypeOf<GetDirectDeps<Merged, "PaymentService">>().toEqualTypeOf<
        "OrderService" | "AuthService"
      >();
    });

    it("merged graph has same keyof as original", () => {
      type MergedKeys = keyof Merged;
      type OriginalKeys = keyof Ports;
      expectTypeOf<MergedKeys>().toEqualTypeOf<OriginalKeys>();
    });
  });
});

// =============================================================================
// Conclusion
// =============================================================================

describe("conclusion: intersection type distribution is handled correctly", () => {
  it("MergeDependencyMaps uses Prettify which flattens intersections", () => {
    // Prettify<A & B> produces { [K in keyof (A & B)]: (A & B)[K] }
    // This mapped type iterates over all keys and preserves values correctly
    type Merged = MergeDependencyMaps<Graph1, Graph2>;
    type Expected = { Logger: never; UserService: "Logger" };
    expectTypeOf<Merged>().toEqualTypeOf<Expected>();
  });

  it("GetDirectDeps works correctly on Prettified merged graphs", () => {
    type Merged = MergeDependencyMaps<Graph1, Graph2>;
    // Both access patterns work correctly
    expectTypeOf<GetDirectDeps<Merged, "Logger">>().toEqualTypeOf<never>();
    expectTypeOf<GetDirectDeps<Merged, "UserService">>().toEqualTypeOf<"Logger">();
  });

  it("raw intersection types also work (TypeScript handles them correctly)", () => {
    // Even without Prettify, TypeScript's indexed access works on intersections
    type RawIntersection = Graph1 & Graph2;
    expectTypeOf<GetDirectDeps<RawIntersection, "Logger">>().toEqualTypeOf<never>();
    expectTypeOf<GetDirectDeps<RawIntersection, "UserService">>().toEqualTypeOf<"Logger">();
  });
});
