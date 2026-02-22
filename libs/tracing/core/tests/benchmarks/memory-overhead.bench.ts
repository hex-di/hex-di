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
 * After Plan 31-04 object pooling:
 * baseline: no instrumentation  62.98 Hz  (15.88ms per 100k)
 * instrumented: Memory tracer    6.79 Hz (147.30ms per 100k)
 *
 * Overhead: ~828% (9.28x slower)
 * Absolute overhead: ~131ms per 100k resolutions
 *
 * After Plan 31-02 optimizations:
 * baseline: no instrumentation  62.92 Hz  (15.89ms per 100k)
 * instrumented: Memory tracer    9.77 Hz (102.36ms per 100k)
 * Overhead: ~544% (6.44x slower)
 *
 * Pre-optimization (Plan 31-01):
 * baseline: no instrumentation  61.84 Hz  (16.17ms per 100k)
 * instrumented: Memory tracer    8.81 Hz (113.53ms per 100k)
 * Overhead: ~602% (7.02x slower)
 *
 * Improvements from Plan 31-02:
 * - ID generation: crypto.getRandomValues with hex lookup table (10x faster)
 * - Lazy allocation: attributes and events only allocated when used
 * - Map-based span stack: O(1) push/pop instead of Array operations
 * - Circular buffer: eliminates Array.shift() O(n) overhead
 * Result: Reduced overhead from 602% to 544%
 *
 * Plan 31-04 object pooling result:
 * - Object pooling INCREASED overhead from 544% to 828%
 * - In this benchmark, pooling adds overhead rather than reducing it
 * - Short-lived spans don't benefit from pooling (modern JS engines optimize well)
 * - init() + reset() overhead > constructor allocation cost
 * - Pooling may benefit longer-lived spans or high-concurrency scenarios
 *
 * Note: Target was < 300% overhead. This was not achieved due to fundamental costs:
 * - Span creation and serialization for every resolution
 * - Stack operations (push/pop) for context management
 * - SpanData object allocation and storage
 * - Timestamp generation (high-resolution timing)
 * - ID generation (even optimized crypto-based approach has cost)
 *
 * This overhead is expected for in-memory tracing with full span capture.
 * For production, use:
 * - Sampling (only trace % of requests)
 * - Port filters (only trace specific services)
 * - Batch export to external systems (avoid in-memory accumulation)
 */
