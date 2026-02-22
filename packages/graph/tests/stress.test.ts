/**
 * Stress tests for @hex-di/graph.
 *
 * These tests verify behavior at scale:
 * 1. Large graphs with 50+ adapters
 * 2. Deep dependency chains (20+ levels)
 * 3. Complex merge scenarios
 * 4. Wide topology patterns
 *
 * Note: These are runtime stress tests. Type-level stress testing is limited
 * by TypeScript's recursion limits and is covered in type-level test files.
 *
 * @packageDocumentation
 */

import { describe, expect, it } from "vitest";
import { port, createAdapter, type Port, type AdapterConstraint } from "@hex-di/core";
import { type Graph } from "../src/index.js";
import { GraphBuilder } from "../src/index.js";

// =============================================================================
// Shared Types
// =============================================================================

interface Service {
  name: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Creates a port with a given name.
 */
function makePort(name: string): Port<string, Service> {
  return port<Service>()({ name });
}

/**
 * Creates an independent adapter (no dependencies).
 */
function makeIndependentAdapter(name: string): AdapterConstraint {
  const port = makePort(name);
  return createAdapter({
    provides: port,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ name }),
  });
}

/**
 * Creates a chain of adapters where each depends on the previous.
 * Returns array of [ports, adapters] for the chain.
 */
function makeChain(
  length: number,
  prefix: string
): {
  ports: Port<string, Service>[];
  adapters: AdapterConstraint[];
} {
  const ports: Port<string, Service>[] = [];
  const adapters: AdapterConstraint[] = [];

  for (let i = 0; i < length; i++) {
    const port = makePort(`${prefix}${i}`);
    ports.push(port);

    if (i === 0) {
      // First adapter has no dependencies
      adapters.push(
        createAdapter({
          provides: port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: `${prefix}${i}` }),
        })
      );
    } else {
      // Subsequent adapters depend on the previous one
      const prevPort = ports[i - 1]!;
      adapters.push(
        createAdapter({
          provides: port,
          requires: [prevPort],
          lifetime: "singleton",
          factory: () => ({ name: `${prefix}${i}` }),
        })
      );
    }
  }

  return { ports, adapters };
}

// =============================================================================
// Large Graph Tests (50+ adapters)
// =============================================================================

describe("stress: large graphs", () => {
  it("handles graph with 50 independent adapters", () => {
    const adapters = Array.from({ length: 50 }, (_, i) => makeIndependentAdapter(`Service${i}`));

    // Use provideMany for runtime stress testing
    const graph = GraphBuilder.create().provideMany(adapters).build() as Graph;

    expect(graph.adapters).toHaveLength(50);
    expect(graph.overridePortNames.size).toBe(0);
  });

  it("handles graph with 100 adapters via provideMany", () => {
    const adapters = Array.from({ length: 100 }, (_, i) => makeIndependentAdapter(`Service${i}`));

    const graph = GraphBuilder.create().provideMany(adapters).build() as Graph;

    expect(graph.adapters).toHaveLength(100);
  });

  it("handles merge of 5 graphs with 20 adapters each", () => {
    // Create 5 separate graphs with non-overlapping port names
    const builders = Array.from({ length: 5 }, (_, graphIndex) => {
      const adapters = Array.from({ length: 20 }, (_, adapterIndex) =>
        makeIndependentAdapter(`G${graphIndex}_S${adapterIndex}`)
      );
      return GraphBuilder.create().provideMany(adapters);
    });

    // Merge all 5 graphs - use explicit typing to avoid duplicate error types
    let merged: any = builders[0];
    for (let i = 1; i < builders.length; i++) {
      merged = merged.merge(builders[i]);
    }

    const graph = merged.build() as Graph;

    expect(graph.adapters).toHaveLength(100); // 5 * 20
    expect(graph.overridePortNames.size).toBe(0);
  });

  it("builds graph faster than naive iteration", () => {
    const adapters = Array.from({ length: 200 }, (_, i) => makeIndependentAdapter(`Service${i}`));

    const start = Date.now();
    const graph = GraphBuilder.create().provideMany(adapters).build() as Graph;
    const elapsed = Date.now() - start;

    expect(graph.adapters).toHaveLength(200);
    // Should complete in under 100ms even for 200 adapters
    expect(elapsed).toBeLessThan(100);
  });
});

// =============================================================================
// Deep Chain Tests (20+ levels)
// =============================================================================

describe("stress: deep dependency chains", () => {
  it("handles 20-level dependency chain", () => {
    const { adapters } = makeChain(20, "Chain");

    const graph = GraphBuilder.create().provideMany(adapters).build() as Graph;

    expect(graph.adapters).toHaveLength(20);
  });

  it("handles 25-level dependency chain", () => {
    const { adapters } = makeChain(25, "Deep");

    const graph = GraphBuilder.create().provideMany(adapters).build() as Graph;

    expect(graph.adapters).toHaveLength(25);
  });

  it("maintains correct ordering in deep chain", () => {
    const { adapters, ports } = makeChain(15, "Order");

    const graph = GraphBuilder.create().provideMany(adapters).build() as Graph;

    // Verify all adapters are present
    expect(graph.adapters).toHaveLength(15);

    // Verify ports are correctly linked
    for (let i = 0; i < ports.length; i++) {
      const adapter = graph.adapters.find(
        (a: AdapterConstraint) => a.provides.__portName === `Order${i}`
      );
      expect(adapter).toBeDefined();

      if (i > 0) {
        // Should have a dependency on previous port
        expect(adapter!.requires.length).toBe(1);
        expect(adapter!.requires[0]!.__portName).toBe(`Order${i - 1}`);
      } else {
        // First adapter has no dependencies
        expect(adapter!.requires.length).toBe(0);
      }
    }
  });
});

// =============================================================================
// Complex Topology Tests
// =============================================================================

describe("stress: complex topologies", () => {
  it("handles wide diamond with 10 intermediate nodes", () => {
    // Create topology:
    //       Root
    //    /|  ...  |\
    //   A B C ... J (10 intermediate nodes)
    //    \|  ...  |/
    //       Sink

    const RootPort = makePort("Root");
    const RootAdapter = createAdapter({
      provides: RootPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "Root" }),
    });

    // Create 10 intermediate nodes that depend on Root
    const intermediates = Array.from({ length: 10 }, (_, i) => {
      const port = makePort(`Intermediate${i}`);
      const adapter = createAdapter({
        provides: port,
        requires: [RootPort],
        lifetime: "singleton",
        factory: () => ({ name: `Intermediate${i}` }),
      });
      return { port, adapter };
    });

    // Create Sink that depends on all intermediates
    const SinkPort = makePort("Sink");
    const SinkAdapter = createAdapter({
      provides: SinkPort,
      requires: intermediates.map(i => i.port),
      lifetime: "singleton",
      factory: () => ({ name: "Sink" }),
    });

    // Build graph with all adapters - use separate provideMany calls to avoid type accumulation issues
    const allAdapters = [RootAdapter, ...intermediates.map(i => i.adapter), SinkAdapter];
    const graph = GraphBuilder.create().provideMany(allAdapters).build() as Graph;

    expect(graph.adapters).toHaveLength(12); // Root + 10 intermediates + Sink

    // Verify Sink has 10 dependencies
    const sink = graph.adapters.find((a: AdapterConstraint) => a.provides.__portName === "Sink");
    expect(sink?.requires.length).toBe(10);
  });

  it("handles nested diamond pattern", () => {
    // Create multiple diamonds connected in series:
    // A -> [B, C] -> D -> [E, F] -> G

    const APort = makePort("A");
    const BPort = makePort("B");
    const CPort = makePort("C");
    const DPort = makePort("D");
    const EPort = makePort("E");
    const FPort = makePort("F");
    const GPort = makePort("G");

    const adapters = [
      createAdapter({
        provides: APort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ name: "A" }),
      }),
      createAdapter({
        provides: BPort,
        requires: [APort],
        lifetime: "singleton",
        factory: () => ({ name: "B" }),
      }),
      createAdapter({
        provides: CPort,
        requires: [APort],
        lifetime: "singleton",
        factory: () => ({ name: "C" }),
      }),
      createAdapter({
        provides: DPort,
        requires: [BPort, CPort],
        lifetime: "singleton",
        factory: () => ({ name: "D" }),
      }),
      createAdapter({
        provides: EPort,
        requires: [DPort],
        lifetime: "singleton",
        factory: () => ({ name: "E" }),
      }),
      createAdapter({
        provides: FPort,
        requires: [DPort],
        lifetime: "singleton",
        factory: () => ({ name: "F" }),
      }),
      createAdapter({
        provides: GPort,
        requires: [EPort, FPort],
        lifetime: "singleton",
        factory: () => ({ name: "G" }),
      }),
    ];

    const graph = GraphBuilder.create().provideMany(adapters).build() as Graph;

    expect(graph.adapters).toHaveLength(7);

    // Verify D has 2 dependencies (B, C)
    const d = graph.adapters.find((a: AdapterConstraint) => a.provides.__portName === "D");
    expect(d?.requires.length).toBe(2);

    // Verify G has 2 dependencies (E, F)
    const g = graph.adapters.find((a: AdapterConstraint) => a.provides.__portName === "G");
    expect(g?.requires.length).toBe(2);
  });

  it("handles parallel independent chains", () => {
    // Create 5 parallel chains of length 10
    const allAdapters: AdapterConstraint[] = [];

    for (let chain = 0; chain < 5; chain++) {
      const { adapters } = makeChain(10, `Chain${chain}_`);
      allAdapters.push(...adapters);
    }

    const graph = GraphBuilder.create().provideMany(allAdapters).build() as Graph;

    expect(graph.adapters).toHaveLength(50); // 5 chains * 10 adapters
  });
});

// =============================================================================
// Mixed Lifetime Tests at Scale
// =============================================================================

describe("stress: mixed lifetimes at scale", () => {
  it("handles 30 adapters with mixed lifetimes", () => {
    const lifetimes = ["singleton", "scoped", "transient"] as const;

    const adapters = Array.from({ length: 30 }, (_, i) => {
      const port = makePort(`Service${i}`);
      return createAdapter({
        provides: port,
        requires: [],
        lifetime: lifetimes[i % 3]!,
        factory: () => ({ name: `Service${i}` }),
      });
    });

    const graph = GraphBuilder.create().provideMany(adapters).build() as Graph;

    expect(graph.adapters).toHaveLength(30);

    // Count lifetimes
    const singletons = graph.adapters.filter((a: AdapterConstraint) => a.lifetime === "singleton");
    const scoped = graph.adapters.filter((a: AdapterConstraint) => a.lifetime === "scoped");
    const transient = graph.adapters.filter((a: AdapterConstraint) => a.lifetime === "transient");

    expect(singletons).toHaveLength(10);
    expect(scoped).toHaveLength(10);
    expect(transient).toHaveLength(10);
  });
});
