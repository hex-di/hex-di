/**
 * Memory Tracer Overhead Benchmark
 *
 * Measures performance overhead of Memory tracer instrumentation.
 * Target: < 10% overhead compared to baseline (PERF-02).
 *
 * @packageDocumentation
 */

import { bench, describe } from "vitest";
import { createContainer } from "@hex-di/runtime";
import { instrumentContainer, createMemoryTracer } from "../../src/index.js";
import { createTestGraph, TestPort, BENCHMARK_ITERATIONS } from "./baseline-helper.js";

describe("Memory Tracer Overhead", () => {
  bench("baseline: no instrumentation", () => {
    const graph = createTestGraph();
    const container = createContainer({ graph, name: "Baseline" });

    // 100k transient resolutions
    for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
      container.resolve(TestPort);
    }

    void container.dispose();
  });

  bench("instrumented: Memory tracer", () => {
    const graph = createTestGraph();
    const container = createContainer({ graph, name: "Memory" });
    const tracer = createMemoryTracer();

    // Instrument with Memory tracer
    const cleanup = instrumentContainer(container, tracer);

    // 100k transient resolutions with periodic span clearing
    // Clear every 10k to avoid memory growth affecting results
    for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
      container.resolve(TestPort);

      if (i > 0 && i % 10_000 === 0) {
        tracer.clear();
      }
    }

    // Clean up instrumentation
    cleanup();
    void container.dispose();
  });
});

/**
 * Expected Results (PERF-02):
 * - Memory tracer overhead < 10% vs baseline
 * - Includes span creation, stack operations, and storage
 * - Periodic clearing prevents memory growth from skewing results
 *
 * Example output (target):
 * baseline: no instrumentation       10,000 ops/sec
 * instrumented: Memory tracer         9,100 ops/sec  (9% overhead) ✓
 */
