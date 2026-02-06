/**
 * NoOp Tracer Overhead Benchmark
 *
 * Measures performance overhead of NOOP_TRACER instrumentation.
 * Target: < 5% overhead compared to baseline (PERF-01).
 *
 * @packageDocumentation
 */

import { bench, describe } from "vitest";
import { createContainer } from "@hex-di/runtime";
import { instrumentContainer, NOOP_TRACER } from "../../src/index.js";
import { createTestGraph, TestPort, BENCHMARK_ITERATIONS } from "./baseline-helper.js";

describe("NoOp Tracer Overhead", () => {
  bench("baseline: no instrumentation", () => {
    const graph = createTestGraph();
    const container = createContainer({ graph, name: "Baseline" });

    // 100k transient resolutions
    for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
      container.resolve(TestPort);
    }

    void container.dispose();
  });

  bench("instrumented: NOOP_TRACER", () => {
    const graph = createTestGraph();
    const container = createContainer({ graph, name: "NoOp" });

    // Instrument with NoOp tracer
    const cleanup = instrumentContainer(container, NOOP_TRACER);

    // 100k transient resolutions
    for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
      container.resolve(TestPort);
    }

    // Clean up instrumentation
    cleanup();
    void container.dispose();
  });
});

/**
 * Expected Results (PERF-01):
 * - NoOp overhead < 5% vs baseline
 * - Object.freeze() singleton pattern ensures zero allocation overhead
 * - No span creation, no stack operations
 *
 * Example output (target):
 * baseline: no instrumentation    10,000 ops/sec
 * instrumented: NOOP_TRACER         9,600 ops/sec  (4% overhead) ✓
 */
