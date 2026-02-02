/**
 * Type-level tests for compile-time circular dependency detection.
 *
 * These tests verify:
 * 1. Simple A -> B -> A cycles are detected at compile time
 * 2. Longer A -> B -> C -> A cycles are detected
 * 3. Non-cyclic dependency chains pass validation
 * 4. Error messages show the cycle path
 * 5. Self-referential dependencies are detected
 * 6. The detection works with GraphBuilder.provide()
 */

import { describe, expect, expectTypeOf, it } from "vitest";
import { createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";
import {
  CircularDependencyError,
  CircularErrorMessage,
  WouldCreateCycle,
  DefaultMaxDepth,
  ValidateMaxDepth,
} from "../src/advanced.js";
import type {
  IsReachable,
  AddEdge,
  GetDirectDeps,
  AdapterProvidesName,
  AdapterRequiresNames,
  DepthExceededResult,
  IsDepthExceeded,
} from "../src/advanced.js";
import {
  LoggerPort,
  DatabasePort,
  UserServicePort,
  PortA,
  PortB,
  PortC,
  PortD,
} from "./fixtures.js";

// =============================================================================
// Helper Types for Testing
// =============================================================================

type IsCycleError<T> = T extends `ERROR[HEX002]: Circular dependency: ${string}` ? true : false;
type IsSelfDependencyError<T> = T extends `ERROR[HEX006]: Self-dependency detected. ${string}`
  ? true
  : false;

// =============================================================================
// Type Utility Tests
// =============================================================================

describe("AdapterProvidesName and AdapterRequiresNames utilities", () => {
  it("extracts provides name from adapter", () => {
    const adapter = createAdapter({
      provides: PortA,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ doA: () => {} }),
    });
    expect(adapter).toBeDefined();

    type Name = AdapterProvidesName<typeof adapter>;
    expectTypeOf<Name>().toEqualTypeOf<"A">();
  });

  it("extracts requires names from adapter with single dependency", () => {
    const adapter = createAdapter({
      provides: PortA,
      requires: [PortB],
      lifetime: "singleton",
      factory: () => ({ doA: () => {} }),
    });
    expect(adapter).toBeDefined();

    type Names = AdapterRequiresNames<typeof adapter>;
    expectTypeOf<Names>().toEqualTypeOf<"B">();
  });

  it("extracts requires names from adapter with multiple dependencies", () => {
    const adapter = createAdapter({
      provides: PortA,
      requires: [PortB, PortC],
      lifetime: "singleton",
      factory: () => ({ doA: () => {} }),
    });
    expect(adapter).toBeDefined();

    type Names = AdapterRequiresNames<typeof adapter>;
    expectTypeOf<Names>().toEqualTypeOf<"B" | "C">();
  });

  it("extracts never for adapter with no dependencies", () => {
    const adapter = createAdapter({
      provides: PortA,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ doA: () => {} }),
    });
    expect(adapter).toBeDefined();

    type Names = AdapterRequiresNames<typeof adapter>;
    expectTypeOf<Names>().toBeNever();
  });
});

describe("AddEdge utility", () => {
  it("adds edge to empty graph", () => {
    type Graph = {};
    type Result = AddEdge<Graph, "A", "B">;

    // Should be able to look up A's dependencies
    type ADeps = "A" extends keyof Result ? Result["A"] : never;
    expectTypeOf<ADeps>().toEqualTypeOf<"B">();
  });

  it("adds edge to existing graph", () => {
    type Graph = { A: "B" };
    type Result = AddEdge<Graph, "C", "A" | "B">;

    // Test that we can retrieve deps via GetDirectDeps (which handles intersection correctly)
    type ADeps = GetDirectDeps<Result, "A">;
    type CDeps = GetDirectDeps<Result, "C">;

    expectTypeOf<ADeps>().toEqualTypeOf<"B">();
    expectTypeOf<CDeps>().toEqualTypeOf<"A" | "B">();
  });
});

describe("IsReachable utility", () => {
  it("returns true when target is directly reachable", () => {
    type Graph = { A: "B" };
    type Result = IsReachable<Graph, "A", "B">;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("returns true when target is transitively reachable", () => {
    type Graph = { A: "B"; B: "C" };
    type Result = IsReachable<Graph, "A", "C">;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("returns false when target is not reachable", () => {
    type Graph = { A: "B"; C: "D" };
    type Result = IsReachable<Graph, "A", "D">;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });

  it("returns false when node has no dependencies", () => {
    type Graph = { A: never };
    type Result = IsReachable<Graph, "A", "B">;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });
});

describe("WouldCreateCycle utility", () => {
  it("returns true for simple A -> B -> A cycle", () => {
    // Graph already has A -> B
    type Graph = { A: "B" };
    // Adding B -> A would create a cycle
    type Result = WouldCreateCycle<Graph, "B", "A">;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("returns true for A -> B -> C -> A cycle", () => {
    // Graph has A -> B, B -> C
    type Graph = { A: "B"; B: "C" };
    // Adding C -> A would create a cycle
    type Result = WouldCreateCycle<Graph, "C", "A">;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("returns false for non-cyclic addition", () => {
    // Graph has A -> B
    type Graph = { A: "B" };
    // Adding C -> B is not a cycle
    type Result = WouldCreateCycle<Graph, "C", "B">;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });

  it("returns false when adapter has no dependencies", () => {
    type Graph = { A: "B" };
    // Adding C with no deps is not a cycle
    type Result = WouldCreateCycle<Graph, "C", never>;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// Simple A -> B -> A Cycle Detection Tests
// =============================================================================

describe("simple A -> B -> A cycles are detected", () => {
  it("detects cycle when B depends on A after A depends on B", () => {
    // A depends on B
    const AdapterA = createAdapter({
      provides: PortA,
      requires: [PortB],
      lifetime: "singleton",
      factory: () => ({ doA: () => {} }),
    });

    // B depends on A (creates cycle)
    const AdapterB = createAdapter({
      provides: PortB,
      requires: [PortA],
      lifetime: "singleton",
      factory: () => ({ doB: () => {} }),
    });
    expect(AdapterB).toBeDefined();

    // Adding A first, then B should detect cycle
    const builder = GraphBuilder.create().provide(AdapterA);
    expect(builder).toBeDefined();
    type ResultType = ReturnType<typeof builder.provide<typeof AdapterB>>;

    expectTypeOf<IsCycleError<ResultType>>().toEqualTypeOf<true>();
  });

  it("detects cycle regardless of registration order", () => {
    // B depends on A
    const AdapterB = createAdapter({
      provides: PortB,
      requires: [PortA],
      lifetime: "singleton",
      factory: () => ({ doB: () => {} }),
    });

    // A depends on B (creates cycle)
    const AdapterA = createAdapter({
      provides: PortA,
      requires: [PortB],
      lifetime: "singleton",
      factory: () => ({ doA: () => {} }),
    });
    expect(AdapterA).toBeDefined();

    // Adding B first, then A should also detect cycle
    const builder = GraphBuilder.create().provide(AdapterB);
    expect(builder).toBeDefined();
    type ResultType = ReturnType<typeof builder.provide<typeof AdapterA>>;

    expectTypeOf<IsCycleError<ResultType>>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Longer A -> B -> C -> A Cycle Detection Tests
// =============================================================================

describe("longer A -> B -> C -> A cycles are detected", () => {
  it("detects 3-node cycle", () => {
    // A -> B
    const AdapterA = createAdapter({
      provides: PortA,
      requires: [PortB],
      lifetime: "singleton",
      factory: () => ({ doA: () => {} }),
    });

    // B -> C
    const AdapterB = createAdapter({
      provides: PortB,
      requires: [PortC],
      lifetime: "singleton",
      factory: () => ({ doB: () => {} }),
    });

    // C -> A (completes the cycle)
    const AdapterC = createAdapter({
      provides: PortC,
      requires: [PortA],
      lifetime: "singleton",
      factory: () => ({ doC: () => {} }),
    });
    expect(AdapterC).toBeDefined();

    const builder = GraphBuilder.create().provide(AdapterA).provide(AdapterB);
    expect(builder).toBeDefined();

    type ResultType = ReturnType<typeof builder.provide<typeof AdapterC>>;
    expectTypeOf<IsCycleError<ResultType>>().toEqualTypeOf<true>();
  });

  it("detects 4-node cycle", () => {
    // A -> B
    const AdapterA = createAdapter({
      provides: PortA,
      requires: [PortB],
      lifetime: "singleton",
      factory: () => ({ doA: () => {} }),
    });

    // B -> C
    const AdapterB = createAdapter({
      provides: PortB,
      requires: [PortC],
      lifetime: "singleton",
      factory: () => ({ doB: () => {} }),
    });

    // C -> D
    const AdapterC = createAdapter({
      provides: PortC,
      requires: [PortD],
      lifetime: "singleton",
      factory: () => ({ doC: () => {} }),
    });

    // D -> A (completes the cycle)
    const AdapterD = createAdapter({
      provides: PortD,
      requires: [PortA],
      lifetime: "singleton",
      factory: () => ({ doD: () => {} }),
    });
    expect(AdapterD).toBeDefined();

    const builder = GraphBuilder.create().provide(AdapterA).provide(AdapterB).provide(AdapterC);
    expect(builder).toBeDefined();

    type ResultType = ReturnType<typeof builder.provide<typeof AdapterD>>;
    expectTypeOf<IsCycleError<ResultType>>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Non-Cyclic Dependency Chains Pass Validation Tests
// =============================================================================

describe("non-cyclic dependency chains pass validation", () => {
  it("allows linear dependency chain", () => {
    // A (no deps)
    const AdapterA = createAdapter({
      provides: PortA,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ doA: () => {} }),
    });

    // B -> A
    const AdapterB = createAdapter({
      provides: PortB,
      requires: [PortA],
      lifetime: "singleton",
      factory: () => ({ doB: () => {} }),
    });

    // C -> B
    const AdapterC = createAdapter({
      provides: PortC,
      requires: [PortB],
      lifetime: "singleton",
      factory: () => ({ doC: () => {} }),
    });

    const builder = GraphBuilder.create().provide(AdapterA).provide(AdapterB).provide(AdapterC);
    expect(builder).toBeDefined();

    // Should not be a cycle error
    expectTypeOf<IsCycleError<typeof builder>>().toEqualTypeOf<false>();
  });

  it("allows diamond dependency pattern", () => {
    // A (no deps)
    const AdapterA = createAdapter({
      provides: PortA,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ doA: () => {} }),
    });

    // B -> A
    const AdapterB = createAdapter({
      provides: PortB,
      requires: [PortA],
      lifetime: "singleton",
      factory: () => ({ doB: () => {} }),
    });

    // C -> A
    const AdapterC = createAdapter({
      provides: PortC,
      requires: [PortA],
      lifetime: "singleton",
      factory: () => ({ doC: () => {} }),
    });

    // D -> B, C (diamond pattern, not a cycle)
    const AdapterD = createAdapter({
      provides: PortD,
      requires: [PortB, PortC],
      lifetime: "singleton",
      factory: () => ({ doD: () => {} }),
    });

    const builder = GraphBuilder.create()
      .provide(AdapterA)
      .provide(AdapterB)
      .provide(AdapterC)
      .provide(AdapterD);
    expect(builder).toBeDefined();

    expectTypeOf<IsCycleError<typeof builder>>().toEqualTypeOf<false>();
  });

  it("allows multiple independent subgraphs", () => {
    // A (no deps)
    const AdapterA = createAdapter({
      provides: PortA,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ doA: () => {} }),
    });

    // B -> A
    const AdapterB = createAdapter({
      provides: PortB,
      requires: [PortA],
      lifetime: "singleton",
      factory: () => ({ doB: () => {} }),
    });

    // C (no deps) - independent subgraph
    const AdapterC = createAdapter({
      provides: PortC,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ doC: () => {} }),
    });

    // D -> C - independent subgraph
    const AdapterD = createAdapter({
      provides: PortD,
      requires: [PortC],
      lifetime: "singleton",
      factory: () => ({ doD: () => {} }),
    });

    const builder = GraphBuilder.create()
      .provide(AdapterA)
      .provide(AdapterB)
      .provide(AdapterC)
      .provide(AdapterD);
    expect(builder).toBeDefined();

    expectTypeOf<IsCycleError<typeof builder>>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// Self-Referential Dependencies Tests
// =============================================================================

describe("self-referential dependencies are detected", () => {
  it("detects A -> A self-dependency with HEX006 error", () => {
    // A depends on itself - this is now caught as a self-dependency error (HEX006)
    // rather than a circular dependency error (HEX002) because self-dependency
    // is a special case that can be detected without graph traversal.
    //
    // Note: provide() reports all errors together now.
    const AdapterA = createAdapter({
      provides: PortA,
      requires: [PortA],
      lifetime: "singleton",
      factory: () => ({ doA: () => {} }),
    });
    expect(AdapterA).toBeDefined();

    const builder = GraphBuilder.create();
    expect(builder).toBeDefined();
    type ResultType = ReturnType<typeof builder.provide<typeof AdapterA>>;
    expectTypeOf<IsSelfDependencyError<ResultType>>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Error Message Tests
// =============================================================================

describe("error messages show cycle path", () => {
  it("CircularErrorMessage returns template literal with cycle path", () => {
    // Template literal error message directly shows the cycle path
    type ErrorMessage = CircularErrorMessage<"A -> B -> A">;
    expectTypeOf<ErrorMessage>().toEqualTypeOf<"ERROR[HEX002]: Circular dependency: A -> B -> A. Fix: Break cycle by extracting shared logic, using lazy resolution, or inverting a dependency.">();
  });

  it("CircularDependencyError branded type contains cycle path", () => {
    // The branded object type is still available for advanced usage
    type Error = CircularDependencyError<"A -> B -> A">;

    type ErrorBrand = Error["__errorBrand"];
    type Message = Error["__message"];
    type Path = Error["__cyclePath"];

    expectTypeOf<ErrorBrand>().toEqualTypeOf<"CircularDependencyError">();
    expectTypeOf<Message>().toEqualTypeOf<"Circular dependency detected: A -> B -> A">();
    expectTypeOf<Path>().toEqualTypeOf<"A -> B -> A">();
  });
});

// =============================================================================
// Integration with Real Adapters Tests
// =============================================================================

describe("cycle detection works with realistic service adapters", () => {
  it("detects cycle in service layer", () => {
    // UserService depends on Database
    const UserServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [DatabasePort],
      lifetime: "singleton",
      factory: () => ({ getUser: () => Promise.resolve({ id: "1", name: "Test" }) }),
    });

    // Database depends on UserService (bad design - creates cycle)
    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [UserServicePort],
      lifetime: "singleton",
      factory: () => ({ query: () => Promise.resolve({}) }),
    });
    expect(DatabaseAdapter).toBeDefined();

    const builder = GraphBuilder.create().provide(UserServiceAdapter);
    expect(builder).toBeDefined();
    type ResultType = ReturnType<typeof builder.provide<typeof DatabaseAdapter>>;

    expectTypeOf<IsCycleError<ResultType>>().toEqualTypeOf<true>();
  });

  it("allows proper layered architecture", () => {
    // Logger (infrastructure - no deps)
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    // Database (infrastructure - depends on Logger)
    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [LoggerPort],
      lifetime: "singleton",
      factory: () => ({ query: () => Promise.resolve({}) }),
    });

    // UserService (application - depends on Logger and Database)
    const UserServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort, DatabasePort],
      lifetime: "singleton",
      factory: () => ({ getUser: () => Promise.resolve({ id: "1", name: "Test" }) }),
    });

    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter);
    expect(builder).toBeDefined();

    expectTypeOf<IsCycleError<typeof builder>>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// Merge Cross-Graph Cycle Detection Tests
// =============================================================================

describe("merge detects cross-graph circular dependencies", () => {
  it("detects cycle that spans two merged graphs (A->B in graph1, B->A in graph2)", () => {
    // Graph 1: A depends on B
    const AdapterA = createAdapter({
      provides: PortA,
      requires: [PortB],
      lifetime: "singleton",
      factory: () => ({ doA: () => {} }),
    });

    // Graph 2: B depends on A (creates cycle when merged)
    const AdapterB = createAdapter({
      provides: PortB,
      requires: [PortA],
      lifetime: "singleton",
      factory: () => ({ doB: () => {} }),
    });

    const graph1 = GraphBuilder.create().provide(AdapterA);
    const graph2 = GraphBuilder.create().provide(AdapterB);

    expect(graph1).toBeDefined();
    expect(graph2).toBeDefined();

    // When merging, should detect the cross-graph cycle
    const merged = graph1.merge(graph2);
    expectTypeOf<IsCycleError<typeof merged>>().toEqualTypeOf<true>();
  });

  it("detects longer cycle through merged graphs (A->B in graph1, B->C->A in graph2)", () => {
    // Graph 1: A depends on B
    const AdapterA = createAdapter({
      provides: PortA,
      requires: [PortB],
      lifetime: "singleton",
      factory: () => ({ doA: () => {} }),
    });

    // Graph 2: B depends on C, C depends on A (creates cycle A->B->C->A when merged)
    const AdapterB = createAdapter({
      provides: PortB,
      requires: [PortC],
      lifetime: "singleton",
      factory: () => ({ doB: () => {} }),
    });

    const AdapterC = createAdapter({
      provides: PortC,
      requires: [PortA],
      lifetime: "singleton",
      factory: () => ({ doC: () => {} }),
    });

    const graph1 = GraphBuilder.create().provide(AdapterA);
    const graph2 = GraphBuilder.create().provide(AdapterB).provide(AdapterC);

    expect(graph1).toBeDefined();
    expect(graph2).toBeDefined();

    // When merging, should detect the cross-graph cycle
    const merged = graph1.merge(graph2);
    expectTypeOf<IsCycleError<typeof merged>>().toEqualTypeOf<true>();
  });

  it("allows merge of independent graphs without cycles", () => {
    // Graph 1: A (no deps)
    const AdapterA = createAdapter({
      provides: PortA,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ doA: () => {} }),
    });

    // Graph 2: B (no deps)
    const AdapterB = createAdapter({
      provides: PortB,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ doB: () => {} }),
    });

    const graph1 = GraphBuilder.create().provide(AdapterA);
    const graph2 = GraphBuilder.create().provide(AdapterB);

    const merged = graph1.merge(graph2);
    expect(merged).toBeDefined();

    expectTypeOf<IsCycleError<typeof merged>>().toEqualTypeOf<false>();
  });

  it("allows merge when graphs have compatible linear dependencies", () => {
    // Graph 1: A (no deps)
    const AdapterA = createAdapter({
      provides: PortA,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ doA: () => {} }),
    });

    // Graph 2: B depends on A (compatible, not a cycle)
    const AdapterB = createAdapter({
      provides: PortB,
      requires: [PortA],
      lifetime: "singleton",
      factory: () => ({ doB: () => {} }),
    });

    const graph1 = GraphBuilder.create().provide(AdapterA);
    const graph2 = GraphBuilder.create().provide(AdapterB);

    const merged = graph1.merge(graph2);
    expect(merged).toBeDefined();

    expectTypeOf<IsCycleError<typeof merged>>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// WithMaxDepth Configuration Tests
// =============================================================================

describe("GraphBuilder.withMaxDepth() configuration", () => {
  it("withMaxDepth<50>() compiles and returns factory", () => {
    const factory = GraphBuilder.withMaxDepth<50>();
    expect(factory).toBeDefined();
    expect(factory.create).toBeDefined();
    expect(factory.forParent).toBeDefined();

    const builder = factory.create();
    expect(builder).toBeDefined();
  });

  it("withMaxDepth<15>() compiles for lower depth limit", () => {
    const factory = GraphBuilder.withMaxDepth<15>();
    const builder = factory.create();
    expect(builder).toBeDefined();
  });

  it("withMaxDepth<100>() compiles at maximum allowed depth", () => {
    const factory = GraphBuilder.withMaxDepth<100>();
    const builder = factory.create();
    expect(builder).toBeDefined();
  });

  it("withMaxDepth<1>() compiles at minimum allowed depth", () => {
    const factory = GraphBuilder.withMaxDepth<1>();
    const builder = factory.create();
    expect(builder).toBeDefined();
  });

  it("withMaxDepth<0>() returns error type", () => {
    type Result = ReturnType<typeof GraphBuilder.withMaxDepth<0>>;
    expectTypeOf<Result>().toEqualTypeOf<"ERROR: MaxDepth must be at least 1">();
  });

  it("custom depth builder can be used with provide()", () => {
    // A (no deps)
    const AdapterA = createAdapter({
      provides: PortA,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ doA: () => {} }),
    });

    // B -> A
    const AdapterB = createAdapter({
      provides: PortB,
      requires: [PortA],
      lifetime: "singleton",
      factory: () => ({ doB: () => {} }),
    });

    const builder = GraphBuilder.withMaxDepth<50>().create().provide(AdapterA).provide(AdapterB);

    expect(builder).toBeDefined();
    expectTypeOf<IsCycleError<typeof builder>>().toEqualTypeOf<false>();
  });

  it("custom depth builder detects cycles just like regular builder", () => {
    // A depends on B
    const AdapterA = createAdapter({
      provides: PortA,
      requires: [PortB],
      lifetime: "singleton",
      factory: () => ({ doA: () => {} }),
    });

    // B depends on A (creates cycle)
    const AdapterB = createAdapter({
      provides: PortB,
      requires: [PortA],
      lifetime: "singleton",
      factory: () => ({ doB: () => {} }),
    });
    expect(AdapterB).toBeDefined();

    const builder = GraphBuilder.withMaxDepth<50>().create().provide(AdapterA);
    expect(builder).toBeDefined();
    type ResultType = ReturnType<typeof builder.provide<typeof AdapterB>>;

    expectTypeOf<IsCycleError<ResultType>>().toEqualTypeOf<true>();
  });

  it("withMaxDepth forParent() works with parent graph", () => {
    // Create a parent graph
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const parentGraph = GraphBuilder.create().provide(LoggerAdapter).build();

    // Use withMaxDepth forParent
    const childBuilder = GraphBuilder.withMaxDepth<50>().forParent(parentGraph);
    expect(childBuilder).toBeDefined();
  });
});

// =============================================================================
// MaxDepth Type Utilities Tests
// =============================================================================

describe("MaxDepth type utilities", () => {
  it("DefaultMaxDepth is 50", () => {
    expectTypeOf<DefaultMaxDepth>().toEqualTypeOf<50>();
  });

  it("ValidateMaxDepth returns valid depths unchanged", () => {
    expectTypeOf<ValidateMaxDepth<30>>().toEqualTypeOf<30>();
    expectTypeOf<ValidateMaxDepth<50>>().toEqualTypeOf<50>();
    expectTypeOf<ValidateMaxDepth<1>>().toEqualTypeOf<1>();
    expectTypeOf<ValidateMaxDepth<100>>().toEqualTypeOf<100>();
  });

  it("ValidateMaxDepth returns error for depth 0", () => {
    expectTypeOf<ValidateMaxDepth<0>>().toEqualTypeOf<"ERROR: MaxDepth must be at least 1">();
  });
});

// =============================================================================
// DepthExceededResult Type Tests
// =============================================================================

describe("DepthExceededResult distinguishes depth exceeded from not reachable", () => {
  it("IsReachable returns false for definitely not reachable", () => {
    // Simple graph: A -> B (no path from B to C)
    type Graph = { A: "B"; B: never };
    type Result = IsReachable<Graph, "B", "C">;

    // Should be definitely false (not DepthExceededResult)
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });

  it("IsReachable returns true for definitely reachable", () => {
    // Graph: A -> B -> C, check if C is reachable from A
    type Graph = { A: "B"; B: "C" };
    type Result = IsReachable<Graph, "A", "C">;

    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("IsDepthExceeded correctly identifies DepthExceededResult", () => {
    // Use a very small maxDepth to trigger depth exceeded on a chain
    // Graph: A -> B -> C -> D -> E
    type Graph = { A: "B"; B: "C"; C: "D"; D: "E" };

    // With maxDepth=2, checking if "E" is reachable from "A" should hit depth limit
    type Result = IsReachable<Graph, "A", "E", never, [], 2>;

    // Check using IsDepthExceeded
    type WasExceeded = IsDepthExceeded<Result>;
    expectTypeOf<WasExceeded>().toEqualTypeOf<true>();
  });

  it("IsDepthExceeded returns false for definitive results", () => {
    type Graph = { A: "B" };

    // Definitive false
    type FalseResult = IsReachable<Graph, "B", "C">;
    type FalseExceeded = IsDepthExceeded<FalseResult>;
    expectTypeOf<FalseExceeded>().toEqualTypeOf<false>();

    // Definitive true
    type TrueResult = IsReachable<Graph, "A", "B">;
    type TrueExceeded = IsDepthExceeded<TrueResult>;
    expectTypeOf<TrueExceeded>().toEqualTypeOf<false>();
  });

  it("WouldCreateCycle can return DepthExceededResult for deep graphs", () => {
    // For depth exceeded, we need a deep enough chain where we're looking
    // for something that might exist but we can't traverse far enough
    // Graph: A -> B -> C -> D -> E -> A (circular)
    type DeepGraph = { A: "B"; B: "C"; C: "D"; D: "E"; E: "A" };

    // With maxDepth=1, IsReachable from A to E should hit depth limit
    // because the traversal can't go deep enough to find E
    type Result = IsReachable<DeepGraph, "A", "E", never, [], 1>;
    type MayBeExceeded = IsDepthExceeded<Result>;
    expectTypeOf<MayBeExceeded>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// GetDirectDeps Intersection Handling Tests
// =============================================================================

describe("GetDirectDeps handles intersection types correctly", () => {
  it("looks up dependencies in direct intersection type", () => {
    // Two separate graph fragments merged via intersection
    type Graph1 = { A: "B" };
    type Graph2 = { C: "D" };
    type IntersectedGraph = Graph1 & Graph2;

    // Should correctly retrieve deps from both sides of intersection
    type ADeps = GetDirectDeps<IntersectedGraph, "A">;
    type CDeps = GetDirectDeps<IntersectedGraph, "C">;

    expectTypeOf<ADeps>().toEqualTypeOf<"B">();
    expectTypeOf<CDeps>().toEqualTypeOf<"D">();
  });

  it("handles multi-level intersections from merged graphs", () => {
    // Simulates three graphs merged together
    type Graph1 = { A: "B" };
    type Graph2 = { B: "C" };
    type Graph3 = { C: "D" };
    type TripleMerged = Graph1 & Graph2 & Graph3;

    type ADeps = GetDirectDeps<TripleMerged, "A">;
    type BDeps = GetDirectDeps<TripleMerged, "B">;
    type CDeps = GetDirectDeps<TripleMerged, "C">;

    expectTypeOf<ADeps>().toEqualTypeOf<"B">();
    expectTypeOf<BDeps>().toEqualTypeOf<"C">();
    expectTypeOf<CDeps>().toEqualTypeOf<"D">();
  });

  it("detects cycles across intersection boundaries", () => {
    // Graph 1: A -> B
    // Graph 2: B -> C
    // Graph 3: C -> A (creates cycle when intersected)
    type Graph1 = { A: "B" };
    type Graph2 = { B: "C" };
    type Graph3 = { C: "A" };
    type IntersectedGraph = Graph1 & Graph2 & Graph3;

    // Cycle detection should work through the intersection
    type CanReachA = IsReachable<IntersectedGraph, "A", "A">;
    expectTypeOf<CanReachA>().toEqualTypeOf<true>();
  });

  it("returns never for non-existent keys in intersection", () => {
    type Graph1 = { A: "B" };
    type Graph2 = { C: "D" };
    type IntersectedGraph = Graph1 & Graph2;

    // Key "X" doesn't exist in either side of intersection
    type XDeps = GetDirectDeps<IntersectedGraph, "X">;
    expectTypeOf<XDeps>().toBeNever();
  });

  it("handles union dependencies in GetDirectDeps", () => {
    // Single graph where A depends on B or C (union), and both B and C have deps
    type Graph = { A: "B" | "C"; B: "D"; C: "E" };

    // GetDirectDeps correctly extracts union dependencies
    type ADeps = GetDirectDeps<Graph, "A">;
    type BDeps = GetDirectDeps<Graph, "B">;
    type CDeps = GetDirectDeps<Graph, "C">;

    expectTypeOf<ADeps>().toEqualTypeOf<"B" | "C">();
    expectTypeOf<BDeps>().toEqualTypeOf<"D">();
    expectTypeOf<CDeps>().toEqualTypeOf<"E">();
  });

  it("handles overlapping keys in intersection (same port in both graphs)", () => {
    // Both graphs define deps for port A - intersection combines them
    // Note: In TypeScript, { A: "B" } & { A: "C" } results in A having type "B" & "C"
    // which is never for string literals, so this tests the edge case
    type Graph1 = { A: "B"; B: "X" };
    type Graph2 = { A: "B"; C: "Y" }; // Same A -> B edge
    type IntersectedGraph = Graph1 & Graph2;

    // When both sides agree, lookup works normally
    type ADeps = GetDirectDeps<IntersectedGraph, "A">;
    expectTypeOf<ADeps>().toEqualTypeOf<"B">();
  });
});
