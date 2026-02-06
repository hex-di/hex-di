/**
 * Baseline helper for consistent benchmark setup.
 *
 * Provides test port, adapter, and container creation utilities
 * for performance benchmarks comparing baseline vs instrumented containers.
 *
 * @packageDocumentation
 */

import { createPort, createAdapter } from "@hex-di/core";
import { createContainer, provide } from "@hex-di/runtime";

/**
 * Simple test object interface for benchmark workload.
 */
export interface TestObject {
  id: string;
  value: number;
}

/**
 * Test port for benchmark workload - produces simple objects.
 */
export const TestPort = createPort<TestObject>("TestObject");

/**
 * Test adapter with TRANSIENT lifetime.
 * Forces factory call on every resolution for consistent workload.
 */
export const TestAdapter = createAdapter({
  port: TestPort,
  lifetime: "transient",
  factory: (): TestObject => ({
    id: "test",
    value: 42,
  }),
});

/**
 * Creates a test graph with single transient adapter.
 * Used for both baseline and instrumented benchmarks.
 */
export function createTestGraph() {
  return provide([TestAdapter]);
}

/**
 * Benchmark workload: 100k transient resolutions.
 * Transient lifetime ensures each resolution creates new instance.
 */
export const BENCHMARK_ITERATIONS = 100_000;
