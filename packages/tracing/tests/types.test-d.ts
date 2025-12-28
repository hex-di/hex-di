/**
 * Type-level tests for @hex-di/tracing.
 *
 * These tests verify:
 * 1. TracingPlugin type inference via wrapper pattern
 * 2. Container augmentation with TRACING symbol
 * 3. TracingAPI type safety
 */

import { describe, it, expectTypeOf } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import { createContainer, pipe } from "@hex-di/runtime";
import type { TracingAPI, TraceEntry, TraceStats, TraceFilter } from "@hex-di/devtools-core";
import { TracingPlugin, TRACING, createTracingPlugin, withTracing } from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

function createTestGraph() {
  return GraphBuilder.create().provide(LoggerAdapter).build();
}

// =============================================================================
// Type Tests
// =============================================================================

describe("TracingPlugin type inference via wrapper pattern", () => {
  it("infers TracingAPI type from container[TRACING]", () => {
    const graph = createTestGraph();
    const container = pipe(createContainer(graph), withTracing);

    const tracingAPI = container[TRACING];

    // TracingAPI methods should be properly typed
    expectTypeOf(tracingAPI.getTraces).toBeFunction();
    expectTypeOf(tracingAPI.getStats).toBeFunction();
    expectTypeOf(tracingAPI.pause).toBeFunction();
    expectTypeOf(tracingAPI.resume).toBeFunction();
    expectTypeOf(tracingAPI.clear).toBeFunction();
    expectTypeOf(tracingAPI.subscribe).toBeFunction();
    expectTypeOf(tracingAPI.isPaused).toBeFunction();
    expectTypeOf(tracingAPI.pin).toBeFunction();
    expectTypeOf(tracingAPI.unpin).toBeFunction();
  });

  it("getTraces returns readonly TraceEntry array", () => {
    const graph = createTestGraph();
    const container = pipe(createContainer(graph), withTracing);

    const traces = container[TRACING].getTraces();

    expectTypeOf(traces).toEqualTypeOf<readonly TraceEntry[]>();
  });

  it("getTraces accepts optional TraceFilter", () => {
    const graph = createTestGraph();
    const container = pipe(createContainer(graph), withTracing);

    // Without filter
    const allTraces = container[TRACING].getTraces();
    expectTypeOf(allTraces).toEqualTypeOf<readonly TraceEntry[]>();

    // With filter
    const filteredTraces = container[TRACING].getTraces({ portName: "Logger" });
    expectTypeOf(filteredTraces).toEqualTypeOf<readonly TraceEntry[]>();
  });

  it("getStats returns TraceStats", () => {
    const graph = createTestGraph();
    const container = pipe(createContainer(graph), withTracing);

    const stats = container[TRACING].getStats();

    expectTypeOf(stats).toEqualTypeOf<TraceStats>();
  });

  it("subscribe accepts callback with TraceEntry parameter", () => {
    const graph = createTestGraph();
    const container = pipe(createContainer(graph), withTracing);

    // Subscribe should accept (entry: TraceEntry) => void
    container[TRACING].subscribe(entry => {
      expectTypeOf(entry).toEqualTypeOf<TraceEntry>();
    });
  });

  it("subscribe returns unsubscribe function", () => {
    const graph = createTestGraph();
    const container = pipe(createContainer(graph), withTracing);

    const unsubscribe = container[TRACING].subscribe(() => {});

    expectTypeOf(unsubscribe).toEqualTypeOf<() => void>();
  });

  it("isPaused returns boolean", () => {
    const graph = createTestGraph();
    const container = pipe(createContainer(graph), withTracing);

    const paused = container[TRACING].isPaused();

    expectTypeOf(paused).toEqualTypeOf<boolean>();
  });

  it("pin/unpin accept string traceId", () => {
    const graph = createTestGraph();
    const container = pipe(createContainer(graph), withTracing);

    // Should accept string
    container[TRACING].pin("trace-1");
    container[TRACING].unpin("trace-1");

    // Type check - pin/unpin return void
    expectTypeOf(container[TRACING].pin).toBeFunction();
    expectTypeOf(container[TRACING].unpin).toBeFunction();
  });
});

describe("createTracingPlugin factory", () => {
  it("returns a plugin with same symbol as TracingPlugin", () => {
    const customPlugin = createTracingPlugin();

    expectTypeOf(customPlugin.symbol).toEqualTypeOf(TracingPlugin.symbol);
  });

  it("accepts optional configuration", () => {
    // No options
    const plugin1 = createTracingPlugin();

    // With partial retention policy
    const plugin2 = createTracingPlugin({
      retentionPolicy: {
        maxTraces: 500,
      },
    });

    // Both should work
    expectTypeOf(plugin1.symbol).toEqualTypeOf<typeof TRACING>();
    expectTypeOf(plugin2.symbol).toEqualTypeOf<typeof TRACING>();
  });
});

describe("TraceEntry type", () => {
  it("has all required properties", () => {
    const entry: TraceEntry = {
      id: "trace-1",
      portName: "Logger",
      lifetime: "singleton",
      startTime: 0,
      duration: 10,
      isCacheHit: false,
      parentId: null,
      childIds: [],
      scopeId: null,
      order: 1,
      isPinned: false,
    };

    expectTypeOf(entry.id).toEqualTypeOf<string>();
    expectTypeOf(entry.portName).toEqualTypeOf<string>();
    expectTypeOf(entry.lifetime).toEqualTypeOf<"singleton" | "scoped" | "transient">();
    expectTypeOf(entry.startTime).toEqualTypeOf<number>();
    expectTypeOf(entry.duration).toEqualTypeOf<number>();
    expectTypeOf(entry.isCacheHit).toEqualTypeOf<boolean>();
    expectTypeOf(entry.parentId).toEqualTypeOf<string | null>();
    expectTypeOf(entry.childIds).toEqualTypeOf<readonly string[]>();
    expectTypeOf(entry.scopeId).toEqualTypeOf<string | null>();
    expectTypeOf(entry.order).toEqualTypeOf<number>();
    expectTypeOf(entry.isPinned).toEqualTypeOf<boolean>();
  });
});

describe("TraceFilter type", () => {
  it("has all optional properties", () => {
    // Empty filter should be valid
    const filter1: TraceFilter = {};

    // Partial filter should be valid
    const filter2: TraceFilter = {
      portName: "Logger",
    };

    // Full filter should be valid
    const filter3: TraceFilter = {
      portName: "Logger",
      lifetime: "singleton",
      isCacheHit: false,
      minDuration: 0,
      maxDuration: 100,
      scopeId: null,
      isPinned: true,
    };

    expectTypeOf(filter1).toMatchTypeOf<TraceFilter>();
    expectTypeOf(filter2).toMatchTypeOf<TraceFilter>();
    expectTypeOf(filter3).toMatchTypeOf<TraceFilter>();
  });
});

describe("TraceStats type", () => {
  it("has all required properties", () => {
    const stats: TraceStats = {
      totalResolutions: 10,
      averageDuration: 25.5,
      cacheHitRate: 0.5,
      slowCount: 2,
      sessionStart: Date.now(),
      totalDuration: 255,
    };

    expectTypeOf(stats.totalResolutions).toEqualTypeOf<number>();
    expectTypeOf(stats.averageDuration).toEqualTypeOf<number>();
    expectTypeOf(stats.cacheHitRate).toEqualTypeOf<number>();
    expectTypeOf(stats.slowCount).toEqualTypeOf<number>();
    expectTypeOf(stats.sessionStart).toEqualTypeOf<number>();
    expectTypeOf(stats.totalDuration).toEqualTypeOf<number>();
  });
});
