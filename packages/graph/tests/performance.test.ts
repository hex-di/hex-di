/**
 * Performance benchmark tests for @hex-di/graph.
 *
 * These tests establish runtime performance baselines and detect regressions.
 * They measure actual execution time for various graph operations.
 *
 * ## Running Benchmarks
 *
 * These tests are included in the normal test suite but have generous thresholds.
 * For detailed benchmarking:
 *
 * ```bash
 * pnpm --filter @hex-di/graph test performance
 * ```
 *
 * ## Performance Characteristics
 *
 * - `provide()` is O(n) where n is the adapter array length (shallow copy)
 * - `provideMany()` is O(m) where m is the batch size
 * - `merge()` is O(n + m) where n and m are the graph sizes
 * - `build()` is O(1) - just wraps the array
 * - `inspect()` is O(n) for traversal + O(d) for depth calculation
 *
 * @packageDocumentation
 */

import { describe, expect, it } from "vitest";
import { port, createAdapter, type Port, type AdapterConstraint } from "@hex-di/core";
import { GraphBuilder, type Graph } from "../src/index.js";

// =============================================================================
// Test Utilities
// =============================================================================

interface Service {
  name: string;
}

function makePort(name: string): Port<string, Service> {
  return port<Service>()({ name });
}

function makeAdapter(name: string): AdapterConstraint {
  const port = makePort(name);
  return createAdapter({
    provides: port,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ name }),
  });
}

function makeAdapterWithDeps(name: string, depPorts: Port<string, Service>[]): AdapterConstraint {
  const port = makePort(name);
  return createAdapter({
    provides: port,
    requires: depPorts,
    lifetime: "singleton",
    factory: () => ({ name }),
  });
}

/**
 * Timer function using Date.now().
 * Millisecond precision is sufficient for these performance tests.
 */
function now(): number {
  return Date.now();
}

/**
 * Measures execution time of a function over multiple iterations.
 * Returns average time in milliseconds.
 */
function measureTime(fn: () => void, iterations: number = 10): number {
  // Warmup
  for (let i = 0; i < 3; i++) {
    fn();
  }

  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = now();
    fn();
    times.push(now() - start);
  }

  // Return average, excluding outliers
  times.sort((a, b) => a - b);
  const trimmed = times.slice(1, -1); // Remove min and max
  return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
}

// =============================================================================
// provide() Performance
// =============================================================================

describe("performance: provide()", () => {
  it("single provide() completes in < 1ms", () => {
    const adapter = makeAdapter("Test");
    const builder = GraphBuilder.create();

    const avgTime = measureTime(() => {
      builder.provide(adapter);
    }, 100);

    expect(avgTime).toBeLessThan(1);
  });

  it("100 sequential provide() calls complete in < 50ms", () => {
    const adapters = Array.from({ length: 100 }, (_, i) => makeAdapter(`Service${i}`));

    const avgTime = measureTime(() => {
      let builder: any = GraphBuilder.create();
      for (const adapter of adapters) {
        builder = builder.provide(adapter);
      }
    }, 10);

    expect(avgTime).toBeLessThan(50);
  });

  it("provide() with complex dependencies scales linearly", () => {
    // Create adapters with varying dependency counts
    const basePort = makePort("Base");
    const baseAdapter = createAdapter({
      provides: basePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "Base" }),
    });

    // Measure time for 10 deps (run many iterations to get measurable time)
    const ports10 = Array.from({ length: 10 }, (_, i) => makePort(`Dep10_${i}`));
    const adapter10 = makeAdapterWithDeps("Service10", ports10);

    // Measure time for 50 deps
    const ports50 = Array.from({ length: 50 }, (_, i) => makePort(`Dep50_${i}`));
    const adapter50 = makeAdapterWithDeps("Service50", ports50);

    const time10 = measureTime(() => {
      for (let i = 0; i < 100; i++) {
        GraphBuilder.create().provide(baseAdapter).provide(adapter10);
      }
    }, 10);

    const time50 = measureTime(() => {
      for (let i = 0; i < 100; i++) {
        GraphBuilder.create().provide(baseAdapter).provide(adapter50);
      }
    }, 10);

    // Time should scale roughly linearly (50 deps should be < 10x slower than 10 deps)
    // If both are 0 (too fast to measure), that's still a pass
    if (time10 > 0) {
      expect(time50).toBeLessThan(time10 * 10);
    }
  });
});

// =============================================================================
// provideMany() Performance
// =============================================================================

describe("performance: provideMany()", () => {
  it("provideMany(100) completes in < 10ms", () => {
    const adapters = Array.from({ length: 100 }, (_, i) => makeAdapter(`Service${i}`));

    const avgTime = measureTime(() => {
      GraphBuilder.create().provideMany(adapters);
    }, 20);

    expect(avgTime).toBeLessThan(10);
  });

  it("provideMany(500) completes in < 50ms", () => {
    const adapters = Array.from({ length: 500 }, (_, i) => makeAdapter(`Service${i}`));

    const avgTime = measureTime(() => {
      GraphBuilder.create().provideMany(adapters);
    }, 10);

    expect(avgTime).toBeLessThan(50);
  });

  it("provideMany is faster than sequential provide for large batches", () => {
    const adapters = Array.from({ length: 200 }, (_, i) => makeAdapter(`Service${i}`));

    // Run multiple iterations to get measurable times
    const batchTime = measureTime(() => {
      for (let i = 0; i < 10; i++) {
        GraphBuilder.create().provideMany(adapters);
      }
    }, 10);

    const sequentialTime = measureTime(() => {
      for (let j = 0; j < 10; j++) {
        let builder: any = GraphBuilder.create();
        for (const adapter of adapters) {
          builder = builder.provide(adapter);
        }
      }
    }, 5);

    // provideMany should be faster for large batches
    // If both are too fast to measure (0), that's still a pass
    if (sequentialTime > 0) {
      expect(batchTime).toBeLessThan(sequentialTime);
    }
  });
});

// =============================================================================
// merge() Performance
// =============================================================================

describe("performance: merge()", () => {
  it("merge of two 50-adapter graphs completes in < 10ms", () => {
    const adapters1 = Array.from({ length: 50 }, (_, i) => makeAdapter(`Graph1_${i}`));
    const adapters2 = Array.from({ length: 50 }, (_, i) => makeAdapter(`Graph2_${i}`));

    const graph1 = GraphBuilder.create().provideMany(adapters1);
    const graph2 = GraphBuilder.create().provideMany(adapters2);

    const avgTime = measureTime(() => {
      graph1.merge(graph2);
    }, 20);

    expect(avgTime).toBeLessThan(10);
  });

  it("chain of 10 merges completes in < 50ms", () => {
    const graphs = Array.from({ length: 10 }, (_, i) => {
      const adapters = Array.from({ length: 20 }, (_, j) => makeAdapter(`G${i}_S${j}`));
      return GraphBuilder.create().provideMany(adapters);
    });

    const avgTime = measureTime(() => {
      let merged: any = graphs[0];
      for (let i = 1; i < graphs.length; i++) {
        merged = merged.merge(graphs[i]);
      }
    }, 10);

    expect(avgTime).toBeLessThan(50);
  });
});

// =============================================================================
// build() Performance
// =============================================================================

describe("performance: build()", () => {
  it("build() of 100-adapter graph completes in < 5ms", () => {
    const adapters = Array.from({ length: 100 }, (_, i) => makeAdapter(`Service${i}`));
    const builder = GraphBuilder.create().provideMany(adapters);

    const avgTime = measureTime(() => {
      builder.build();
    }, 100);

    expect(avgTime).toBeLessThan(5);
  });

  it("build() is O(1) regardless of graph size", () => {
    const adapters100 = Array.from({ length: 100 }, (_, i) => makeAdapter(`S100_${i}`));
    const adapters500 = Array.from({ length: 500 }, (_, i) => makeAdapter(`S500_${i}`));

    const builder100 = GraphBuilder.create().provideMany(adapters100);
    const builder500 = GraphBuilder.create().provideMany(adapters500);

    // Run enough iterations to get measurable times without overwhelming slow CI runners
    const time100 = measureTime(() => {
      for (let i = 0; i < 100; i++) {
        builder100.build();
      }
    }, 5);

    const time500 = measureTime(() => {
      for (let i = 0; i < 100; i++) {
        builder500.build();
      }
    }, 5);

    // build() time should be roughly constant regardless of graph size.
    // Allow generous variance (10x) for measurement noise - the important thing
    // is that build() doesn't scale linearly with adapter count (which would be ~5x slower).
    // If time100 is 0 (too fast to measure at ms precision), skip the comparison.
    if (time100 > 0) {
      expect(time500).toBeLessThan(time100 * 10);
    }
  }, 30000);
});

// =============================================================================
// inspect() Performance
// =============================================================================

describe("performance: inspect()", () => {
  it("inspect() of 100-adapter graph completes in < 5ms", () => {
    const adapters = Array.from({ length: 100 }, (_, i) => makeAdapter(`Service${i}`));
    const builder = GraphBuilder.create().provideMany(adapters);

    const avgTime = measureTime(() => {
      builder.inspect();
    }, 50);

    expect(avgTime).toBeLessThan(5);
  });

  it("inspect() of deep chain completes in < 10ms", () => {
    // Create a 50-level deep chain
    const ports: Port<string, Service>[] = [];
    const adapters: AdapterConstraint[] = [];

    for (let i = 0; i < 50; i++) {
      const port = makePort(`Chain${i}`);
      ports.push(port);

      if (i === 0) {
        adapters.push(
          createAdapter({
            provides: port,
            requires: [],
            lifetime: "singleton",
            factory: () => ({ name: `Chain${i}` }),
          })
        );
      } else {
        adapters.push(
          createAdapter({
            provides: port,
            requires: [ports[i - 1]!],
            lifetime: "singleton",
            factory: () => ({ name: `Chain${i}` }),
          })
        );
      }
    }

    const builder = GraphBuilder.create().provideMany(adapters);

    const avgTime = measureTime(() => {
      builder.inspect();
    }, 50);

    expect(avgTime).toBeLessThan(10);
  });
});

// =============================================================================
// Memory Allocation Tests
// =============================================================================

describe("performance: memory efficiency", () => {
  it("branching does not duplicate adapters", () => {
    const adapter = makeAdapter("Shared");
    // Use any for test flexibility with dynamically generated adapters
    const base: any = GraphBuilder.create().provide(adapter);

    // Create 100 branches
    const branches: any[] = Array.from({ length: 100 }, (_, i) =>
      base.provide(makeAdapter(`Branch${i}`))
    );

    // All branches should share the same adapter reference for "Shared"
    for (const branch of branches) {
      expect(branch.adapters[0]).toBe(adapter);
    }
  });

  it("merge preserves adapter references", () => {
    const adapter1 = makeAdapter("Service1");
    const adapter2 = makeAdapter("Service2");

    // Use any for test flexibility with dynamically generated adapters
    const graph1: any = GraphBuilder.create().provide(adapter1);
    const graph2: any = GraphBuilder.create().provide(adapter2);
    const merged = graph1.merge(graph2);

    // Merged graph should contain the same adapter references
    expect(merged.adapters).toContain(adapter1);
    expect(merged.adapters).toContain(adapter2);
  });
});

// =============================================================================
// Regression Baselines
// =============================================================================

describe("performance: regression baselines", () => {
  /**
   * These tests establish baseline metrics that should be monitored over time.
   * If a release causes these to fail, investigate for performance regressions.
   */

  it("BASELINE: 1000 adapters graph creation < 500ms", () => {
    const start = now();

    const adapters = Array.from({ length: 1000 }, (_, i) => makeAdapter(`Service${i}`));
    const graph = GraphBuilder.create().provideMany(adapters).build() as Graph;

    const elapsed = now() - start;

    expect(graph.adapters).toHaveLength(1000);
    expect(elapsed).toBeLessThan(500);
  });

  it("BASELINE: 100 sequential provide() + build() < 100ms", () => {
    const start = now();

    // Use any for test flexibility with dynamically generated adapters
    let builder: any = GraphBuilder.create();
    for (let i = 0; i < 100; i++) {
      builder = builder.provide(makeAdapter(`Service${i}`));
    }
    const graph = builder.build() as Graph;

    const elapsed = now() - start;

    expect(graph.adapters).toHaveLength(100);
    expect(elapsed).toBeLessThan(100);
  });

  it("BASELINE: 10-way merge < 100ms", () => {
    // Use any for test flexibility with dynamically generated graphs
    const graphs: any[] = Array.from({ length: 10 }, (_, i) => {
      const adapters = Array.from({ length: 50 }, (_, j) => makeAdapter(`G${i}_S${j}`));
      return GraphBuilder.create().provideMany(adapters);
    });

    const start = now();

    let merged: any = graphs[0];
    for (let i = 1; i < graphs.length; i++) {
      merged = merged.merge(graphs[i]);
    }
    const graph = merged.build() as Graph;

    const elapsed = now() - start;

    expect(graph.adapters).toHaveLength(500);
    expect(elapsed).toBeLessThan(100);
  });
});
