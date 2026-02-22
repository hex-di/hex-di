/**
 * Nested Resolutions Benchmark
 *
 * Measures performance overhead with many transient resolutions per iteration.
 * Tests span stack operations under load.
 *
 * @packageDocumentation
 */

import { bench, describe } from "vitest";
import { createContainer } from "@hex-di/runtime";
import { instrumentContainer, createMemoryTracer, NOOP_TRACER } from "../../src/index.js";
import { createTestGraph, TestPort, BENCHMARK_ITERATIONS } from "./baseline-helper.js";

/**
 * Fewer iterations but more expensive per iteration.
 * Each iteration resolves a transient port, creating a new span every time.
 */
const ITERATIONS = BENCHMARK_ITERATIONS / 10; // 10k

describe("Nested Resolution Overhead", () => {
  bench("baseline: no instrumentation (10k transient)", () => {
    const graph = createTestGraph();
    const container = createContainer({ graph, name: "Baseline" });

    for (let i = 0; i < ITERATIONS; i++) {
      container.resolve(TestPort);
    }
  });

  bench("instrumented: NoOp tracer (10k transient)", () => {
    const graph = createTestGraph();
    const container = createContainer({ graph, name: "NoOp" });

    instrumentContainer(container, NOOP_TRACER);

    for (let i = 0; i < ITERATIONS; i++) {
      container.resolve(TestPort);
    }
  });

  bench("instrumented: Memory tracer (10k transient)", () => {
    const graph = createTestGraph();
    const container = createContainer({ graph, name: "Memory" });
    const tracer = createMemoryTracer();

    instrumentContainer(container, tracer);

    for (let i = 0; i < ITERATIONS; i++) {
      container.resolve(TestPort);

      if (i > 0 && i % 1_000 === 0) {
        tracer.clear();
      }
    }
  });
});

/**
 * Benchmark Results (10k transient resolutions):
 *
 * Tests efficiency of:
 * - Map-based span stack push/pop operations
 * - Circular buffer span collection
 * - Lazy attribute allocation
 *
 * Complement to noop-overhead.bench.ts which tests 100k iterations.
 * This benchmark focuses on Memory tracer span creation cost per resolution.
 */
