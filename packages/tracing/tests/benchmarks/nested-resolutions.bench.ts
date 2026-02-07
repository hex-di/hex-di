/**
 * Nested Resolutions Benchmark
 *
 * Measures performance overhead with deep dependency chains.
 * Tests Map-based span stack vs Array for nested span contexts.
 *
 * @packageDocumentation
 */

import { bench, describe } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { instrumentContainer, createMemoryTracer, createNoopTracer } from "../../src/index.js";

/**
 * Create nested dependency chain: Level0 -> Level1 -> ... -> Level9
 */
function createNestedGraph() {
  interface Level {
    depth: number;
  }

  // Create 10 levels of nested dependencies
  const ports = Array.from({ length: 10 }, (_, i) => port<Level>()({ name: `Level${i}` }));

  const adapters = ports.map((p, i) => {
    if (i === 9) {
      // Deepest level has no dependencies
      return createAdapter({
        provides: p,
        lifetime: "transient",
        factory: (): Level => ({ depth: 9 }),
      });
    }

    // Each level depends on the next deeper level
    return createAdapter({
      provides: p,
      lifetime: "transient",
      deps: { next: ports[i + 1] },
      factory: ({ next }): Level => ({
        depth: next.depth - 1,
      }),
    });
  });

  return {
    graph: GraphBuilder.create()
      .provide(...adapters)
      .build(),
    rootPort: ports[0],
  };
}

const NESTED_ITERATIONS = 10_000; // Fewer iterations due to more expensive operations

describe("Nested Resolution Overhead", () => {
  bench("baseline: no instrumentation (10 levels deep)", () => {
    const { graph, rootPort } = createNestedGraph();
    const container = createContainer({ graph, name: "Baseline" });

    // 10k resolutions, each traversing 10-level dependency chain
    for (let i = 0; i < NESTED_ITERATIONS; i++) {
      container.resolve(rootPort);
    }
  });

  bench("instrumented: NoOp tracer (10 levels deep)", () => {
    const { graph, rootPort } = createNestedGraph();
    const container = createContainer({ graph, name: "NoOp" });
    const tracer = createNoopTracer();

    instrumentContainer(container, tracer);

    // 10k resolutions with NoOp tracer
    for (let i = 0; i < NESTED_ITERATIONS; i++) {
      container.resolve(rootPort);
    }
  });

  bench("instrumented: Memory tracer (10 levels deep)", () => {
    const { graph, rootPort } = createNestedGraph();
    const container = createContainer({ graph, name: "Memory" });
    const tracer = createMemoryTracer();

    instrumentContainer(container, tracer);

    // 10k resolutions with Memory tracer, periodic clearing
    for (let i = 0; i < NESTED_ITERATIONS; i++) {
      container.resolve(rootPort);

      if (i > 0 && i % 1_000 === 0) {
        tracer.clear();
      }
    }
  });
});

/**
 * Benchmark Results (10k resolutions, 10 levels deep):
 *
 * Expected behavior:
 * - Baseline: Linear cost in depth (O(n) for n levels)
 * - NoOp: Minimal overhead per level
 * - Memory: Map-based span stack provides O(1) push/pop
 *           Each resolution creates 10 nested spans with parent-child relationships
 *
 * Tests efficiency of:
 * - Span stack operations (Map vs Array)
 * - Parent context propagation
 * - SpanContext lookup performance
 *
 * This represents realistic application scenarios with service dependencies.
 */
