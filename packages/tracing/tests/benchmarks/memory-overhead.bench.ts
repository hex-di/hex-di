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
  });

  bench("instrumented: Memory tracer", () => {
    const graph = createTestGraph();
    const container = createContainer({ graph, name: "Memory" });
    const tracer = createMemoryTracer();

    // Instrument with Memory tracer
    instrumentContainer(container, tracer);

    // 100k transient resolutions with periodic span clearing
    // Clear every 10k to avoid memory growth affecting results
    for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
      container.resolve(TestPort);

      if (i > 0 && i % 10_000 === 0) {
        tracer.clear();
      }
    }
  });
});

/**
 * Benchmark Results (100k transient resolutions):
 *
 * baseline: no instrumentation  61.84 Hz  (16.17ms per 100k)
 * instrumented: Memory tracer     8.81 Hz (113.53ms per 100k)
 *
 * Overhead: ~602% (7.02x slower)
 * Absolute overhead: ~97ms per 100k resolutions
 *
 * Note: PERF-02 target was < 10% overhead. Actual overhead is higher due to:
 * - Span creation and serialization for every resolution
 * - Stack operations (push/pop) for context management
 * - SpanData object allocation and storage
 * - Timestamp generation (high-resolution timing)
 *
 * This overhead is expected for in-memory tracing with full span capture.
 * For production, use:
 * - Sampling (only trace % of requests)
 * - Port filters (only trace specific services)
 * - Batch export to external systems (avoid in-memory accumulation)
 */
