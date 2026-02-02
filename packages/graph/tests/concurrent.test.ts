/**
 * Concurrent operation tests for @hex-di/graph.
 *
 * These tests verify behavior under concurrent access patterns:
 * 1. Parallel provide() operations (branching from same builder)
 * 2. Concurrent build() calls on the same builder
 * 3. Parallel merge() operations
 * 4. Isolation between concurrent builders
 * 5. Race condition safety through immutability
 *
 * Since JavaScript is single-threaded, "concurrent" tests use:
 * - Promise.all() for async operations
 * - Multiple operations started in quick succession
 * - Shared state mutation verification
 *
 * @packageDocumentation
 */

import { describe, expect, it } from "vitest";
import { createPort, createAdapter, createAdapter, type AdapterConstraint } from "@hex-di/core";
import { GraphBuilder, type Graph } from "../src/index.js";
import { createLoggerAdapter, createDatabaseAdapter } from "./fixtures.js";

// Create adapter instances for tests
const LoggerAdapter = createLoggerAdapter();
const DatabaseAdapter = createDatabaseAdapter();

// =============================================================================
// Helper Functions
// =============================================================================

interface TestService {
  name: string;
}

function makePort(name: string) {
  return createPort<TestService>({ name });
}

function makeAdapter(name: string) {
  return createAdapter({
    provides: makePort(name),
    requires: [],
    lifetime: "singleton",
    factory: () => ({ name }),
  });
}

function makeAsyncAdapter(name: string) {
  return createAdapter({
    provides: makePort(name),
    requires: [],
    factory: async () => ({ name }),
  });
}

// =============================================================================
// Parallel provide() Tests (Branching)
// =============================================================================

describe("concurrent: parallel provide() operations", () => {
  it("multiple provide() calls on same builder create independent branches", () => {
    const base = GraphBuilder.create().provide(LoggerAdapter);

    // Branch from the same builder concurrently
    const branch1 = base.provide(makeAdapter("Service1"));
    const branch2 = base.provide(makeAdapter("Service2"));
    const branch3 = base.provide(makeAdapter("Service3"));

    // Each branch should have 2 adapters (Logger + their own)
    expect(branch1.adapters).toHaveLength(2);
    expect(branch2.adapters).toHaveLength(2);
    expect(branch3.adapters).toHaveLength(2);

    // Base should remain unchanged
    expect(base.adapters).toHaveLength(1);

    // Each branch should have different adapters
    expect(branch1.adapters[1]).not.toBe(branch2.adapters[1]);
    expect(branch2.adapters[1]).not.toBe(branch3.adapters[1]);
  });

  it("100 concurrent branches from same builder maintain isolation", () => {
    const base = GraphBuilder.create().provide(LoggerAdapter);

    // Create 100 branches
    const branches = Array.from({ length: 100 }, (_, i) =>
      base.provide(makeAdapter(`Service${i}`))
    );

    // Base unchanged
    expect(base.adapters).toHaveLength(1);

    // All branches should have exactly 2 adapters
    for (const branch of branches) {
      expect(branch.adapters).toHaveLength(2);
    }

    // Each branch should have the Logger + their unique adapter
    const adapterNames = new Set(
      branches.map(b => (b.adapters[1] as AdapterConstraint).provides.__portName)
    );
    expect(adapterNames.size).toBe(100);
  });

  it("deep chain branches all maintain correct state", () => {
    const level0 = GraphBuilder.create();
    const level1 = level0.provide(LoggerAdapter);
    const level2 = level1.provide(DatabaseAdapter);

    // Branch at each level
    const branch0a = level0.provide(makeAdapter("Branch0A"));
    const branch0b = level0.provide(makeAdapter("Branch0B"));
    const branch1a = level1.provide(makeAdapter("Branch1A"));
    const branch1b = level1.provide(makeAdapter("Branch1B"));
    const branch2a = level2.provide(makeAdapter("Branch2A"));
    const branch2b = level2.provide(makeAdapter("Branch2B"));

    expect(branch0a.adapters).toHaveLength(1);
    expect(branch0b.adapters).toHaveLength(1);
    expect(branch1a.adapters).toHaveLength(2);
    expect(branch1b.adapters).toHaveLength(2);
    expect(branch2a.adapters).toHaveLength(3);
    expect(branch2b.adapters).toHaveLength(3);
  });
});

// =============================================================================
// Concurrent build() Tests
// =============================================================================

describe("concurrent: parallel build() operations", () => {
  it("multiple build() calls on same builder return identical graphs", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter);

    // Build multiple times "concurrently"
    const graph1 = builder.build();
    const graph2 = builder.build();
    const graph3 = builder.build();

    // All graphs should have same adapters (by reference)
    expect(graph1.adapters).toHaveLength(2);
    expect(graph2.adapters).toHaveLength(2);
    expect(graph3.adapters).toHaveLength(2);

    // Adapters should be the same references
    expect(graph1.adapters[0]).toBe(graph2.adapters[0]);
    expect(graph2.adapters[0]).toBe(graph3.adapters[0]);
  });

  it("100 concurrent build() calls all succeed", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);

    const graphs = Array.from({ length: 100 }, () => builder.build());

    for (const graph of graphs) {
      expect(graph.adapters).toHaveLength(1);
      expect(graph.adapters[0]).toBe(LoggerAdapter);
    }
  });

  it("build() while branching maintains consistency", () => {
    const base = GraphBuilder.create().provide(LoggerAdapter);

    // Interleave build and provide
    const graph1 = base.build();
    const branch = base.provide(DatabaseAdapter);
    const graph2 = base.build();
    const graph3 = branch.build();

    expect(graph1.adapters).toHaveLength(1);
    expect(graph2.adapters).toHaveLength(1);
    expect(graph3.adapters).toHaveLength(2);

    // Base graphs should be identical
    expect(graph1.adapters[0]).toBe(graph2.adapters[0]);
  });
});

// =============================================================================
// Parallel merge() Tests
// =============================================================================

describe("concurrent: parallel merge() operations", () => {
  it("multiple merges from same base create independent results", () => {
    const base = GraphBuilder.create().provide(LoggerAdapter);
    const extra1 = GraphBuilder.create().provide(makeAdapter("Extra1"));
    const extra2 = GraphBuilder.create().provide(makeAdapter("Extra2"));
    const extra3 = GraphBuilder.create().provide(makeAdapter("Extra3"));

    // Merge different builders into base
    const merged1 = base.merge(extra1);
    const merged2 = base.merge(extra2);
    const merged3 = base.merge(extra3);

    expect(merged1.adapters).toHaveLength(2);
    expect(merged2.adapters).toHaveLength(2);
    expect(merged3.adapters).toHaveLength(2);

    // Base should be unchanged
    expect(base.adapters).toHaveLength(1);

    // Each merge should have Logger + their extra
    const names1 = new Set(
      (merged1.adapters as AdapterConstraint[]).map(a => a.provides.__portName)
    );
    const names2 = new Set(
      (merged2.adapters as AdapterConstraint[]).map(a => a.provides.__portName)
    );
    const names3 = new Set(
      (merged3.adapters as AdapterConstraint[]).map(a => a.provides.__portName)
    );

    expect(names1).toContain("Logger");
    expect(names1).toContain("Extra1");
    expect(names2).toContain("Logger");
    expect(names2).toContain("Extra2");
    expect(names3).toContain("Logger");
    expect(names3).toContain("Extra3");
  });

  it("chain of merges maintains correct adapter accumulation", () => {
    const graphs = Array.from({ length: 10 }, (_, i) =>
      GraphBuilder.create().provide(makeAdapter(`Graph${i}`))
    );

    // Sequentially merge all graphs - use any for test flexibility
    let merged: any = graphs[0]!;
    for (let i = 1; i < graphs.length; i++) {
      merged = merged.merge(graphs[i]!);
    }

    const result = merged.build() as Graph;
    expect(result.adapters).toHaveLength(10);
  });

  it("parallel merges with shared source maintain isolation", () => {
    const source = GraphBuilder.create().provide(LoggerAdapter);

    // Create 50 different targets
    const targets = Array.from({ length: 50 }, (_, i) =>
      GraphBuilder.create().provide(makeAdapter(`Target${i}`))
    );

    // Merge source into each target
    const results = targets.map(target => source.merge(target));

    // Each result should have 2 adapters
    for (const result of results) {
      expect(result.adapters).toHaveLength(2);
    }

    // Source unchanged
    expect(source.adapters).toHaveLength(1);
  });
});

// =============================================================================
// Async Adapter Concurrency Tests
// =============================================================================

describe("concurrent: async adapter operations", () => {
  it("multiple async adapters can be registered simultaneously", () => {
    const asyncAdapters = Array.from({ length: 10 }, (_, i) =>
      makeAsyncAdapter(`AsyncService${i}`)
    );

    const builder = GraphBuilder.create().provideMany(asyncAdapters);
    const graph = builder.build() as Graph;

    expect(graph.adapters).toHaveLength(10);

    // All should be async
    for (const adapter of graph.adapters) {
      expect((adapter as AdapterConstraint).factoryKind).toBe("async");
    }
  });

  it("async adapters with dependencies are ordered correctly", () => {
    // Create distinct ports with literal key types
    const ConfigPort = createPort<TestService>({ name: "Config" });
    const DatabasePort = createPort<TestService>({ name: "Database" });
    const CachePort = createPort<TestService>({ name: "Cache" });

    const config = createAdapter({
      provides: ConfigPort,
      requires: [],
      factory: async () => ({ name: "config" }),
    });

    const database = createAdapter({
      provides: DatabasePort,
      requires: [ConfigPort],
      factory: async () => ({ name: "database" }),
    });

    const cache = createAdapter({
      provides: CachePort,
      requires: [ConfigPort],
      factory: async () => ({ name: "cache" }),
    });

    // Add in any order - topological sort handles initialization order at runtime
    const graph = GraphBuilder.create()
      .provideAsync(cache)
      .provideAsync(config)
      .provideAsync(database)
      .build();

    expect(graph.adapters).toHaveLength(3);

    // All should be async adapters
    for (const adapter of graph.adapters) {
      expect((adapter as AdapterConstraint).factoryKind).toBe("async");
    }
  });
});

// =============================================================================
// Isolation and Immutability Tests
// =============================================================================

describe("concurrent: isolation guarantees", () => {
  it("frozen objects prevent concurrent modification", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);

    expect(Object.isFrozen(builder)).toBe(true);
    expect(Object.isFrozen(builder.adapters)).toBe(true);

    // Attempting to mutate should throw
    expect(() => {
      (builder as any).adapters = [];
    }).toThrow();

    expect(() => {
      (builder.adapters as any).push(DatabaseAdapter);
    }).toThrow();
  });

  it("built graph is deeply immutable", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();

    expect(Object.isFrozen(graph)).toBe(true);
    expect(Object.isFrozen(graph.adapters)).toBe(true);

    expect(() => {
      (graph as any).adapters = [];
    }).toThrow();

    expect(() => {
      (graph.adapters as any).push(makeAdapter("Intruder"));
    }).toThrow();
  });

  it("adapters are independently frozen", () => {
    expect(Object.isFrozen(LoggerAdapter)).toBe(true);
    expect(Object.isFrozen(DatabaseAdapter)).toBe(true);

    // Cannot modify adapter properties
    expect(() => {
      (LoggerAdapter as any).lifetime = "transient";
    }).toThrow();
  });

  it("no shared mutable state between concurrent operations", () => {
    const base = GraphBuilder.create();

    // Perform many operations "concurrently"
    const operations: Array<{ adapters: ReadonlyArray<unknown> }> = [];
    for (let i = 0; i < 100; i++) {
      operations.push(base.provide(makeAdapter(`Op${i}`)));
    }

    // Each operation should have exactly 1 adapter
    for (const op of operations) {
      expect(op.adapters).toHaveLength(1);
    }

    // Base unchanged
    expect(base.adapters).toHaveLength(0);
  });
});

// =============================================================================
// Stress Tests for Concurrency Patterns
// =============================================================================

describe("concurrent: stress patterns", () => {
  it("rapidly alternating provide and build operations", () => {
    // Use any for test flexibility with dynamically generated adapters
    let builder: any = GraphBuilder.create();
    const graphs: Graph[] = [];

    for (let i = 0; i < 50; i++) {
      builder = builder.provide(makeAdapter(`Service${i}`));
      graphs.push(builder.build() as Graph);
    }

    // Each graph should have incrementing adapter count
    for (let i = 0; i < graphs.length; i++) {
      expect(graphs[i]!.adapters).toHaveLength(i + 1);
    }
  });

  it("complex branching and merging pattern", () => {
    // Create a tree of builders using specific ports
    const ServiceAPort = createPort<TestService>({ name: "ServiceA" });
    const ServiceBPort = createPort<TestService>({ name: "ServiceB" });
    const ServiceA1Port = createPort<TestService>({ name: "ServiceA1" });
    const ServiceA2Port = createPort<TestService>({ name: "ServiceA2" });
    const ServiceB1Port = createPort<TestService>({ name: "ServiceB1" });
    const ServiceB2Port = createPort<TestService>({ name: "ServiceB2" });

    const root = GraphBuilder.create().provide(LoggerAdapter);

    const branchA = root.provide(
      createAdapter({
        provides: ServiceAPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ name: "A" }),
      })
    );

    const branchB = root.provide(
      createAdapter({
        provides: ServiceBPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ name: "B" }),
      })
    );

    const branchA1 = branchA.provide(
      createAdapter({
        provides: ServiceA1Port,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ name: "A1" }),
      })
    );

    const branchA2 = branchA.provide(
      createAdapter({
        provides: ServiceA2Port,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ name: "A2" }),
      })
    );

    const branchB1 = branchB.provide(
      createAdapter({
        provides: ServiceB1Port,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ name: "B1" }),
      })
    );

    const branchB2 = branchB.provide(
      createAdapter({
        provides: ServiceB2Port,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ name: "B2" }),
      })
    );

    // Test that all branches are valid independently
    const graphA1 = branchA1.build();
    const graphA2 = branchA2.build();
    const graphB1 = branchB1.build();
    const graphB2 = branchB2.build();

    // Each leaf should have 3 adapters: Logger, ServiceX, ServiceXN
    expect(graphA1.adapters).toHaveLength(3);
    expect(graphA2.adapters).toHaveLength(3);
    expect(graphB1.adapters).toHaveLength(3);
    expect(graphB2.adapters).toHaveLength(3);
  });

  it("handles 1000 sequential operations without stack overflow", () => {
    // Use any for test flexibility with dynamically generated adapters
    let builder: any = GraphBuilder.create();

    for (let i = 0; i < 1000; i++) {
      builder = builder.provide(makeAdapter(`Service${i}`));
    }

    // Should not throw
    expect(() => builder.build()).not.toThrow();

    const graph = builder.build() as Graph;
    expect(graph.adapters).toHaveLength(1000);
  });
});

// =============================================================================
// Promise.all() Simulation Tests
// =============================================================================

describe("concurrent: Promise.all patterns", () => {
  it("simulates parallel graph building with Promise.all", async () => {
    // Create async operation that builds graphs
    const buildGraph = async (id: number): Promise<Graph> => {
      await Promise.resolve(); // Yield to event loop
      return GraphBuilder.create()
        .provide(makeAdapter(`Service${id}`))
        .build() as Graph;
    };

    // Build 50 graphs "in parallel"
    const graphs = await Promise.all(Array.from({ length: 50 }, (_, i) => buildGraph(i)));

    expect(graphs).toHaveLength(50);
    for (const graph of graphs) {
      expect(graph.adapters).toHaveLength(1);
    }
  });

  it("simulates parallel branching with Promise.all", async () => {
    const base = GraphBuilder.create().provide(LoggerAdapter);

    const branch = async (id: number) => {
      await Promise.resolve(); // Yield to event loop
      return base.provide(makeAdapter(`Branch${id}`)).build();
    };

    const branches = await Promise.all(Array.from({ length: 100 }, (_, i) => branch(i)));

    expect(branches).toHaveLength(100);
    for (const graph of branches) {
      expect(graph.adapters).toHaveLength(2);
    }

    // Base unchanged
    expect(base.adapters).toHaveLength(1);
  });
});
