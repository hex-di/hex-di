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
import { createPort } from "@hex-di/ports";
import {
  GraphBuilder,
  createAdapter,
  CircularDependencyError,
  CircularErrorMessage,
  WouldCreateCycle,
  IsReachable,
  AddEdge,
  GetDirectDeps,
  AdapterProvidesName,
  AdapterRequiresNames,
} from "../src/index.js";

// =============================================================================
// Test Service Interfaces
// =============================================================================

interface ServiceA {
  doA(): void;
}

interface ServiceB {
  doB(): void;
}

interface ServiceC {
  doC(): void;
}

interface ServiceD {
  doD(): void;
}

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): Promise<unknown>;
}

interface UserService {
  getUser(id: string): Promise<{ id: string; name: string }>;
}

// =============================================================================
// Test Port Tokens
// =============================================================================

const PortA = createPort<"A", ServiceA>("A");
const PortB = createPort<"B", ServiceB>("B");
const PortC = createPort<"C", ServiceC>("C");
const PortD = createPort<"D", ServiceD>("D");
const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const UserServicePort = createPort<"UserService", UserService>("UserService");

// =============================================================================
// Helper Types for Testing
// =============================================================================

type IsCycleError<T> = T extends `ERROR: Circular dependency: ${string}` ? true : false;

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
  it("detects A -> A self-cycle", () => {
    // A depends on itself
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
    expectTypeOf<IsCycleError<ResultType>>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Error Message Tests
// =============================================================================

describe("error messages show cycle path", () => {
  it("CircularErrorMessage returns template literal with cycle path", () => {
    // Template literal error message directly shows the cycle path
    type ErrorMessage = CircularErrorMessage<"A -> B -> A">;
    expectTypeOf<ErrorMessage>().toEqualTypeOf<"ERROR: Circular dependency: A -> B -> A">();
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
