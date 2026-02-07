/**
 * Cached Resolutions Benchmark
 *
 * Measures performance overhead when resolving singleton (cached) ports.
 * Tests the common case where containers cache resolved instances.
 *
 * @packageDocumentation
 */

import { bench, describe } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { instrumentContainer, createMemoryTracer, createNoopTracer } from "../../src/index.js";

/**
 * Simple test object for cached resolution workload.
 */
interface CachedObject {
  id: string;
  value: number;
}

/**
 * Singleton port - creates instance once and caches it.
 */
const CachedPort = port<CachedObject>()({ name: "CachedObject" });

/**
 * Singleton adapter - factory called once, then cached.
 */
const CachedAdapter = createAdapter({
  provides: CachedPort,
  lifetime: "singleton",
  factory: (): CachedObject => ({
    id: "cached",
    value: 100,
  }),
});

/**
 * Test graph with singleton adapter.
 */
function createCachedGraph() {
  return GraphBuilder.create().provide(CachedAdapter).build();
}

const CACHED_ITERATIONS = 100_000;

describe("Cached Resolution Overhead", () => {
  bench("baseline: no instrumentation (singleton)", () => {
    const graph = createCachedGraph();
    const container = createContainer({ graph, name: "Baseline" });

    // 100k resolutions, but factory only called once (singleton)
    for (let i = 0; i < CACHED_ITERATIONS; i++) {
      container.resolve(CachedPort);
    }
  });

  bench("instrumented: NoOp tracer (singleton)", () => {
    const graph = createCachedGraph();
    const container = createContainer({ graph, name: "NoOp" });
    const tracer = createNoopTracer();

    instrumentContainer(container, tracer);

    // 100k resolutions with NoOp tracer
    for (let i = 0; i < CACHED_ITERATIONS; i++) {
      container.resolve(CachedPort);
    }
  });

  bench("instrumented: Memory tracer (singleton)", () => {
    const graph = createCachedGraph();
    const container = createContainer({ graph, name: "Memory" });
    const tracer = createMemoryTracer();

    instrumentContainer(container, tracer);

    // 100k resolutions with Memory tracer
    for (let i = 0; i < CACHED_ITERATIONS; i++) {
      container.resolve(CachedPort);
    }

    // Only first resolution creates span, rest are cache hits
    const spans = tracer.getCollectedSpans();
    if (spans.length !== 1) {
      throw new Error(`Expected 1 span, got ${spans.length}`);
    }
  });
});

/**
 * Benchmark Results (100k singleton resolutions):
 *
 * Expected behavior:
 * - Baseline: Very fast, just cache lookups
 * - NoOp: Minimal overhead, early bailout skips span creation
 * - Memory: Only first resolution creates span, overhead negligible
 *
 * This represents the best-case scenario for tracing overhead.
 * Real applications have mix of singleton and transient services.
 */
