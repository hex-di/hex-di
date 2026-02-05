/**
 * Comprehensive tests for TracingAPI in @hex-di/runtime.
 *
 * These tests verify:
 * - Trace collection via enableTracing() and trace() functions
 * - Filter coverage (7 dimensions: portName, lifetime, isCacheHit, minDuration, maxDuration, scopeId, isPinned)
 * - Combined filters with AND logic
 * - Overhead measurement (disabled vs enabled tracing)
 * - Cross-scope tracing across parent->child boundaries
 * - Real-time subscriptions and unsubscribe
 * - Stats computation and accuracy
 * - Trace lifecycle management (pin/unpin/clear/pause/resume)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { port, createAdapter, MemoryCollector } from "@hex-di/core";
import type { TraceEntry } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer, trace, enableTracing } from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface FastService {
  name: string;
}

interface SlowService {
  name: string;
}

interface VariableService {
  id: number;
}

interface ScopedService {
  scopeId: string;
}

const FastPort = port<FastService>()({ name: "FastService" });
const SlowPort = port<SlowService>()({ name: "SlowService" });
const VariablePort = port<VariableService>()({ name: "VariableService" });
const ScopedPort = port<ScopedService>()({ name: "ScopedService" });

// Adapter with negligible duration (< 1ms)
const FastAdapter = createAdapter({
  provides: FastPort,
  requires: [],
  lifetime: "singleton",
  factory: () => {
    // Simulate minimal work
    const start = Date.now();
    while (Date.now() - start < 0.1) {
      // Busy wait for < 1ms
    }
    return { name: "fast" };
  },
});

// Adapter with intentional delay (synchronous busy-wait to simulate work)
const SlowAdapter = createAdapter({
  provides: SlowPort,
  requires: [],
  lifetime: "singleton",
  factory: () => {
    // Simulate slow work with busy-wait
    const start = Date.now();
    while (Date.now() - start < 50) {
      // Busy wait for 50ms
    }
    return { name: "slow" };
  },
});

// Counter for variable durations
let transientCounter = 0;

// Adapter with variable duration (synchronous)
const VariableAdapter = createAdapter({
  provides: VariablePort,
  requires: [],
  lifetime: "transient",
  factory: () => {
    // Simulate variable work time (1-20ms)
    const delay = Math.floor(Math.random() * 20) + 1;
    const start = Date.now();
    while (Date.now() - start < delay) {
      // Busy wait
    }
    return { id: ++transientCounter };
  },
});

// Scoped adapter
const ScopedAdapter = createAdapter({
  provides: ScopedPort,
  requires: [],
  lifetime: "scoped",
  factory: () => ({ scopeId: "scoped-instance" }),
});

function createTestGraph() {
  return GraphBuilder.create()
    .provide(FastAdapter)
    .provide(SlowAdapter)
    .provide(VariableAdapter)
    .provide(ScopedAdapter)
    .build();
}

// =============================================================================
// Filter Tests (7 dimensions) - Using trace() function
// =============================================================================

describe("TracingAPI - Filter Coverage (using trace())", () => {
  beforeEach(() => {
    transientCounter = 0;
  });

  it("filters by portName (partial match, case-insensitive)", () => {
    const graph = createTestGraph();
    const container = createContainer({ graph, name: "Test" });

    const { traces } = trace(container, () => {
      container.resolve(FastPort);
      container.resolve(SlowPort);
      container.resolve(VariablePort);
    });

    expect(traces.length).toBe(3);

    // Test partial match filtering (case-insensitive)
    const fastTraces = traces.filter(t => t.portName.toLowerCase().includes("fast"));
    expect(fastTraces.length).toBe(1);
    expect(fastTraces[0]?.portName).toBe("FastService");

    const slowTraces = traces.filter(t => t.portName.toLowerCase().includes("slow"));
    expect(slowTraces.length).toBe(1);
    expect(slowTraces[0]?.portName).toBe("SlowService");
  });

  it("filters by lifetime (singleton/transient/scoped)", () => {
    const graph = createTestGraph();
    const container = createContainer({ graph, name: "Test" });

    const { traces } = trace(container, () => {
      container.resolve(FastPort); // singleton
      container.resolve(SlowPort); // singleton
      container.resolve(VariablePort); // transient
      container.resolve(VariablePort); // transient (2nd instance)

      // Scoped services must be resolved from a scope
      const scope = container.createScope();
      scope.resolve(ScopedPort); // scoped
    });

    // Filter by lifetime
    const singletonTraces = traces.filter(t => t.lifetime === "singleton");
    expect(singletonTraces.length).toBe(2);

    const transientTraces = traces.filter(t => t.lifetime === "transient");
    expect(transientTraces.length).toBe(2);

    const scopedTraces = traces.filter(t => t.lifetime === "scoped");
    expect(scopedTraces.length).toBe(1);
  });

  it("filters by isCacheHit (true/false)", () => {
    const graph = createTestGraph();
    const container = createContainer({ graph, name: "Test" });

    const { traces } = trace(container, () => {
      // First resolution - not cached
      container.resolve(FastPort);
      container.resolve(SlowPort);

      // Second resolution - cached (singleton)
      container.resolve(FastPort);
      container.resolve(SlowPort);
    });

    expect(traces.length).toBe(4);

    const nonCachedTraces = traces.filter(t => !t.isCacheHit);
    expect(nonCachedTraces.length).toBe(2);

    const cachedTraces = traces.filter(t => t.isCacheHit);
    expect(cachedTraces.length).toBe(2);
  });

  it("filters by minDuration (inclusive threshold)", () => {
    const graph = createTestGraph();
    const container = createContainer({ graph, name: "Test" });

    const { traces } = trace(container, () => {
      container.resolve(FastPort); // < 1ms
      container.resolve(SlowPort); // ~50ms
    });

    // Filter for traces >= 40ms
    const slowTraces = traces.filter(t => t.duration >= 40);
    expect(slowTraces.length).toBe(1);
    expect(slowTraces[0]?.portName).toBe("SlowService");
    expect(slowTraces[0]?.duration).toBeGreaterThanOrEqual(40);
  });

  it("filters by maxDuration (inclusive threshold)", () => {
    const graph = createTestGraph();
    const container = createContainer({ graph, name: "Test" });

    const { traces } = trace(container, () => {
      container.resolve(FastPort); // < 1ms
      container.resolve(SlowPort); // ~50ms
    });

    // Filter for traces <= 10ms
    const fastTraces = traces.filter(t => t.duration <= 10);
    expect(fastTraces.length).toBe(1);
    expect(fastTraces[0]?.portName).toBe("FastService");
  });

  it("filters by scopeId (specific scope or null for root)", () => {
    const graph = createTestGraph();
    const container = createContainer({ graph, name: "Root" });

    const { traces } = trace(container, () => {
      // Resolve at container level (scopeId should be null)
      container.resolve(FastPort);

      // Create scope and resolve
      const scope = container.createScope("test-scope");
      scope.resolve(ScopedPort);
    });

    // Filter by null (root container resolutions)
    const rootTraces = traces.filter(t => t.scopeId === null);
    expect(rootTraces.length).toBeGreaterThanOrEqual(1);
    expect(rootTraces.every(t => t.scopeId === null)).toBe(true);

    // Filter by non-null (scoped resolutions)
    const scopedTraces = traces.filter(t => t.scopeId !== null);
    expect(scopedTraces.length).toBe(1);
    expect(scopedTraces[0]?.portName).toBe("ScopedService");
  });

  it("filters by isPinned (manually pinned traces)", () => {
    const collector = new MemoryCollector();

    // Manually collect traces
    const trace1 = {
      id: "trace-1",
      portName: "FastService",
      lifetime: "singleton" as const,
      startTime: Date.now(),
      duration: 1,
      isCacheHit: false,
      parentId: null,
      childIds: [],
      scopeId: null,
      order: 1,
      isPinned: false,
    };

    const trace2 = {
      id: "trace-2",
      portName: "SlowService",
      lifetime: "singleton" as const,
      startTime: Date.now(),
      duration: 50,
      isCacheHit: false,
      parentId: null,
      childIds: [],
      scopeId: null,
      order: 2,
      isPinned: false,
    };

    collector.collect(trace1);
    collector.collect(trace2);

    // Initially no pinned traces
    let unpinnedTraces = collector.getTraces({ isPinned: false });
    expect(unpinnedTraces.length).toBe(2);

    let pinnedTraces = collector.getTraces({ isPinned: true });
    expect(pinnedTraces.length).toBe(0);

    // Pin one trace
    collector.pin("trace-1");

    // Now filter by pinned status
    pinnedTraces = collector.getTraces({ isPinned: true });
    expect(pinnedTraces.length).toBe(1);
    expect(pinnedTraces[0]?.id).toBe("trace-1");

    unpinnedTraces = collector.getTraces({ isPinned: false });
    expect(unpinnedTraces.length).toBe(1);
  });
});

// =============================================================================
// Combined Filter Tests - Using MemoryCollector
// =============================================================================

describe("TracingAPI - Combined Filters", () => {
  it("combines multiple filter dimensions (AND logic)", () => {
    const collector = new MemoryCollector();

    // Add traces with different characteristics
    collector.collect({
      id: "t1",
      portName: "FastService",
      lifetime: "singleton",
      startTime: Date.now(),
      duration: 1,
      isCacheHit: false,
      parentId: null,
      childIds: [],
      scopeId: null,
      order: 1,
      isPinned: false,
    });

    collector.collect({
      id: "t2",
      portName: "SlowService",
      lifetime: "singleton",
      startTime: Date.now(),
      duration: 50,
      isCacheHit: false,
      parentId: null,
      childIds: [],
      scopeId: null,
      order: 2,
      isPinned: false,
    });

    collector.collect({
      id: "t3",
      portName: "VariableService",
      lifetime: "transient",
      startTime: Date.now(),
      duration: 15,
      isCacheHit: false,
      parentId: null,
      childIds: [],
      scopeId: null,
      order: 3,
      isPinned: false,
    });

    // Combine filters: singleton AND minDuration >= 40ms
    const slowSingletons = collector.getTraces({
      lifetime: "singleton",
      minDuration: 40,
    });

    expect(slowSingletons.length).toBe(1);
    expect(slowSingletons[0]?.portName).toBe("SlowService");
  });

  it("combines 3+ filter dimensions", () => {
    const collector = new MemoryCollector();

    collector.collect({
      id: "t1",
      portName: "FastService",
      lifetime: "singleton",
      startTime: Date.now(),
      duration: 0.5,
      isCacheHit: false,
      parentId: null,
      childIds: [],
      scopeId: null,
      order: 1,
      isPinned: false,
    });

    collector.collect({
      id: "t2",
      portName: "FastService",
      lifetime: "singleton",
      startTime: Date.now(),
      duration: 0.2,
      isCacheHit: true, // Cache hit
      parentId: null,
      childIds: [],
      scopeId: null,
      order: 2,
      isPinned: false,
    });

    collector.collect({
      id: "t3",
      portName: "SlowService",
      lifetime: "singleton",
      startTime: Date.now(),
      duration: 50,
      isCacheHit: true,
      parentId: null,
      childIds: [],
      scopeId: null,
      order: 3,
      isPinned: false,
    });

    // Complex filter: singleton AND cache hit AND maxDuration <= 10ms
    const complexFilter = collector.getTraces({
      lifetime: "singleton",
      isCacheHit: true,
      maxDuration: 10,
    });

    expect(complexFilter.length).toBe(1);
    expect(complexFilter[0]?.portName).toBe("FastService");
    expect(complexFilter[0]?.isCacheHit).toBe(true);
  });
});

// =============================================================================
// Overhead Test
// =============================================================================

describe("TracingAPI - Overhead Measurement", () => {
  beforeEach(() => {
    transientCounter = 0;
  });

  it("measures negligible overhead when tracing is disabled", () => {
    const graph = createTestGraph();
    const container = createContainer({ graph, name: "Test" });

    // Warmup
    container.resolve(VariablePort);

    // Measure WITHOUT tracing
    const noTracingStart = Date.now();
    for (let i = 0; i < 100; i++) {
      container.resolve(VariablePort);
    }
    const noTracingDuration = Date.now() - noTracingStart;

    // Measure WITH tracing
    const disableTracing = enableTracing(container);
    const tracingStart = Date.now();
    for (let i = 0; i < 100; i++) {
      container.resolve(VariablePort);
    }
    const tracingDuration = Date.now() - tracingStart;
    disableTracing();

    // Overhead should be minimal (< 20% difference)
    const overhead = Math.abs(tracingDuration - noTracingDuration) / noTracingDuration;
    expect(overhead).toBeLessThan(0.2); // Less than 20% overhead
  });
});

// =============================================================================
// Cross-Scope Tracing Tests
// =============================================================================

describe("TracingAPI - Cross-Scope Tracing", () => {
  it("captures traces across parent->child resolution chain", () => {
    const ParentPort = port<{ value: string }>()({ name: "ParentService" });
    const ChildPort = port<{ parent: { value: string } }>()({ name: "ChildService" });

    const ParentAdapter = createAdapter({
      provides: ParentPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ value: "parent" }),
    });

    const ChildAdapter = createAdapter({
      provides: ChildPort,
      requires: [ParentPort],
      lifetime: "singleton",
      factory: deps => ({ parent: deps.ParentService }),
    });

    const graph = GraphBuilder.create().provide(ParentAdapter).provide(ChildAdapter).build();
    const container = createContainer({ graph, name: "Root" });

    const { traces } = trace(container, () => {
      // Resolve child (should trigger parent resolution)
      container.resolve(ChildPort);
    });

    expect(traces.length).toBe(2);

    // Find parent and child traces
    const parentTrace = traces.find(t => t.portName === "ParentService");
    const childTrace = traces.find(t => t.portName === "ChildService");

    expect(parentTrace).toBeDefined();
    expect(childTrace).toBeDefined();

    // Verify parent was resolved first (lower order)
    expect(parentTrace?.order).toBeLessThan(childTrace?.order ?? 0);
  });

  it("traces captured from parent and child containers separately", () => {
    const graph = createTestGraph();
    const container = createContainer({ graph, name: "RootContainer" });

    const childGraph = GraphBuilder.create().provide(FastAdapter).build();
    const child = container.createChild(childGraph, { name: "ChildContainer" });

    // Trace parent resolution
    const { traces: parentTraces } = trace(container, () => {
      container.resolve(FastPort);
    });

    // Trace child resolution
    const { traces: childTraces } = trace(child, () => {
      child.resolve(FastPort);
    });

    expect(parentTraces.length).toBe(1);
    expect(childTraces.length).toBe(1);

    // Different trace IDs
    expect(parentTraces[0]?.id).not.toBe(childTraces[0]?.id);
  });
});

// =============================================================================
// Subscription Tests
// =============================================================================

describe("TracingAPI - Subscriptions", () => {
  it("receives real-time trace updates via enableTracing callback", () => {
    const graph = createTestGraph();
    const container = createContainer({ graph, name: "Test" });

    const receivedTraces: TraceEntry[] = [];

    // Enable tracing with callback
    const disableTracing = enableTracing(container, entry => {
      receivedTraces.push(entry);
    });

    // Resolve services
    container.resolve(FastPort);
    container.resolve(SlowPort);

    // Verify callback received traces
    expect(receivedTraces.length).toBe(2);
    expect(receivedTraces[0]?.portName).toBe("FastService");
    expect(receivedTraces[1]?.portName).toBe("SlowService");

    disableTracing();
  });

  it("disableTracing() stops trace delivery", () => {
    const graph = createTestGraph();
    const container = createContainer({ graph, name: "Test" });

    const receivedTraces: TraceEntry[] = [];

    const disableTracing = enableTracing(container, entry => {
      receivedTraces.push(entry);
    });

    // Resolve one service
    container.resolve(FastPort);
    expect(receivedTraces.length).toBe(1);

    // Disable tracing
    disableTracing();

    // Resolve another service
    container.resolve(SlowPort);

    // Should still have only 1 trace
    expect(receivedTraces.length).toBe(1);
  });

  it("MemoryCollector subscribe() provides real-time updates", () => {
    const collector = new MemoryCollector();
    const receivedTraces: TraceEntry[] = [];

    const unsubscribe = collector.subscribe(entry => {
      receivedTraces.push(entry);
    });

    collector.collect({
      id: "t1",
      portName: "FastService",
      lifetime: "singleton",
      startTime: Date.now(),
      duration: 1,
      isCacheHit: false,
      parentId: null,
      childIds: [],
      scopeId: null,
      order: 1,
      isPinned: false,
    });

    expect(receivedTraces.length).toBe(1);

    unsubscribe();

    collector.collect({
      id: "t2",
      portName: "SlowService",
      lifetime: "singleton",
      startTime: Date.now(),
      duration: 50,
      isCacheHit: false,
      parentId: null,
      childIds: [],
      scopeId: null,
      order: 2,
      isPinned: false,
    });

    // Should still have only 1 trace (unsubscribed)
    expect(receivedTraces.length).toBe(1);
  });
});

// =============================================================================
// Stats Computation Tests
// =============================================================================

describe("TracingAPI - Stats Computation", () => {
  it("returns accurate aggregate metrics", () => {
    const collector = new MemoryCollector();

    collector.collect({
      id: "t1",
      portName: "FastService",
      lifetime: "singleton",
      startTime: Date.now(),
      duration: 2,
      isCacheHit: false,
      parentId: null,
      childIds: [],
      scopeId: null,
      order: 1,
      isPinned: false,
    });

    collector.collect({
      id: "t2",
      portName: "SlowService",
      lifetime: "singleton",
      startTime: Date.now(),
      duration: 50,
      isCacheHit: false,
      parentId: null,
      childIds: [],
      scopeId: null,
      order: 2,
      isPinned: false,
    });

    collector.collect({
      id: "t3",
      portName: "FastService",
      lifetime: "singleton",
      startTime: Date.now(),
      duration: 0.5,
      isCacheHit: true,
      parentId: null,
      childIds: [],
      scopeId: null,
      order: 3,
      isPinned: false,
    });

    collector.collect({
      id: "t4",
      portName: "SlowService",
      lifetime: "singleton",
      startTime: Date.now(),
      duration: 0.3,
      isCacheHit: true,
      parentId: null,
      childIds: [],
      scopeId: null,
      order: 4,
      isPinned: false,
    });

    const stats = collector.getStats();

    // Total resolutions
    expect(stats.totalResolutions).toBe(4);

    // Cache hit rate should be 50% (2 out of 4)
    expect(stats.cacheHitRate).toBeCloseTo(0.5, 1);

    // Average duration
    const expectedAvg = (2 + 50 + 0.5 + 0.3) / 4;
    expect(stats.averageDuration).toBeCloseTo(expectedAvg, 1);

    // Total duration
    const expectedTotal = 2 + 50 + 0.5 + 0.3;
    expect(stats.totalDuration).toBeCloseTo(expectedTotal, 1);

    // Session start should be a valid timestamp
    expect(stats.sessionStart).toBeGreaterThan(0);
  });

  it("updates stats as new traces are added", () => {
    const collector = new MemoryCollector();

    // Initial stats (no traces)
    let stats = collector.getStats();
    expect(stats.totalResolutions).toBe(0);
    expect(stats.averageDuration).toBe(0);
    expect(stats.cacheHitRate).toBe(0);

    // Add one trace
    collector.collect({
      id: "t1",
      portName: "FastService",
      lifetime: "singleton",
      startTime: Date.now(),
      duration: 5,
      isCacheHit: false,
      parentId: null,
      childIds: [],
      scopeId: null,
      order: 1,
      isPinned: false,
    });

    stats = collector.getStats();
    expect(stats.totalResolutions).toBe(1);
    expect(stats.averageDuration).toBeCloseTo(5, 1);
    expect(stats.cacheHitRate).toBe(0);

    // Add another trace
    collector.collect({
      id: "t2",
      portName: "SlowService",
      lifetime: "singleton",
      startTime: Date.now(),
      duration: 15,
      isCacheHit: false,
      parentId: null,
      childIds: [],
      scopeId: null,
      order: 2,
      isPinned: false,
    });

    stats = collector.getStats();
    expect(stats.totalResolutions).toBe(2);
    expect(stats.averageDuration).toBeCloseTo(10, 1);

    // Add cache hit
    collector.collect({
      id: "t3",
      portName: "FastService",
      lifetime: "singleton",
      startTime: Date.now(),
      duration: 0.2,
      isCacheHit: true,
      parentId: null,
      childIds: [],
      scopeId: null,
      order: 3,
      isPinned: false,
    });

    stats = collector.getStats();
    expect(stats.totalResolutions).toBe(3);
    expect(stats.cacheHitRate).toBeCloseTo(1 / 3, 2);
  });
});

// =============================================================================
// Trace Lifecycle Management Tests
// =============================================================================

describe("TracingAPI - Trace Lifecycle Management", () => {
  it("pin() protects traces from eviction", () => {
    const collector = new MemoryCollector({ maxTraces: 2 });

    collector.collect({
      id: "t1",
      portName: "Service1",
      lifetime: "singleton",
      startTime: Date.now(),
      duration: 1,
      isCacheHit: false,
      parentId: null,
      childIds: [],
      scopeId: null,
      order: 1,
      isPinned: false,
    });

    // Pin the first trace
    collector.pin("t1");

    collector.collect({
      id: "t2",
      portName: "Service2",
      lifetime: "singleton",
      startTime: Date.now(),
      duration: 1,
      isCacheHit: false,
      parentId: null,
      childIds: [],
      scopeId: null,
      order: 2,
      isPinned: false,
    });

    collector.collect({
      id: "t3",
      portName: "Service3",
      lifetime: "singleton",
      startTime: Date.now(),
      duration: 1,
      isCacheHit: false,
      parentId: null,
      childIds: [],
      scopeId: null,
      order: 3,
      isPinned: false,
    });

    const traces = collector.getTraces();
    // Pinned trace should still exist, unpinned oldest evicted
    expect(traces.some(t => t.id === "t1")).toBe(true);
    expect(traces.length).toBe(2);
  });

  it("unpin() makes traces eligible for eviction", () => {
    const collector = new MemoryCollector({ maxTraces: 2 });

    collector.collect({
      id: "t1",
      portName: "Service1",
      lifetime: "singleton",
      startTime: Date.now(),
      duration: 1,
      isCacheHit: false,
      parentId: null,
      childIds: [],
      scopeId: null,
      order: 1,
      isPinned: false,
    });

    collector.pin("t1");
    collector.unpin("t1"); // Make eligible for eviction again

    collector.collect({
      id: "t2",
      portName: "Service2",
      lifetime: "singleton",
      startTime: Date.now(),
      duration: 1,
      isCacheHit: false,
      parentId: null,
      childIds: [],
      scopeId: null,
      order: 2,
      isPinned: false,
    });

    collector.collect({
      id: "t3",
      portName: "Service3",
      lifetime: "singleton",
      startTime: Date.now(),
      duration: 1,
      isCacheHit: false,
      parentId: null,
      childIds: [],
      scopeId: null,
      order: 3,
      isPinned: false,
    });

    const traces = collector.getTraces();
    // After unpin, t1 can be evicted (FIFO)
    expect(traces.length).toBe(2);
    expect(traces.some(t => t.id === "t2")).toBe(true);
    expect(traces.some(t => t.id === "t3")).toBe(true);
  });

  it("clear() removes all traces", () => {
    const collector = new MemoryCollector();

    collector.collect({
      id: "t1",
      portName: "Service1",
      lifetime: "singleton",
      startTime: Date.now(),
      duration: 1,
      isCacheHit: false,
      parentId: null,
      childIds: [],
      scopeId: null,
      order: 1,
      isPinned: false,
    });

    collector.collect({
      id: "t2",
      portName: "Service2",
      lifetime: "singleton",
      startTime: Date.now(),
      duration: 1,
      isCacheHit: false,
      parentId: null,
      childIds: [],
      scopeId: null,
      order: 2,
      isPinned: false,
    });

    expect(collector.getTraces().length).toBe(2);

    collector.clear();

    expect(collector.getTraces().length).toBe(0);
  });
});

// =============================================================================
// Standalone Tracing Functions Tests
// =============================================================================

describe("TracingAPI - Standalone Functions", () => {
  it("trace() captures resolution within callback", () => {
    const graph = createTestGraph();
    const container = createContainer({ graph, name: "Test" });

    const { result, traces } = trace(container, () => {
      container.resolve(FastPort);
      container.resolve(SlowPort);
      return "completed";
    });

    expect(result).toBe("completed");
    expect(traces.length).toBe(2);
    expect(traces[0]?.portName).toBe("FastService");
    expect(traces[1]?.portName).toBe("SlowService");
  });

  it("enableTracing() returns functional unsubscribe", () => {
    const graph = createTestGraph();
    const container = createContainer({ graph, name: "Test" });

    const receivedTraces: TraceEntry[] = [];

    const disableTracing = enableTracing(container, entry => {
      receivedTraces.push(entry);
    });

    container.resolve(FastPort);
    expect(receivedTraces.length).toBe(1);

    disableTracing();

    container.resolve(SlowPort);
    expect(receivedTraces.length).toBe(1); // Still 1, not 2
  });

  it("standalone functions work with any container", () => {
    const graph = createTestGraph();
    const container1 = createContainer({ graph, name: "Container1" });
    const container2 = createContainer({ graph, name: "Container2" });

    const { traces: traces1 } = trace(container1, () => {
      container1.resolve(FastPort);
    });

    const { traces: traces2 } = trace(container2, () => {
      container2.resolve(SlowPort);
    });

    expect(traces1.length).toBe(1);
    expect(traces1[0]?.portName).toBe("FastService");

    expect(traces2.length).toBe(1);
    expect(traces2[0]?.portName).toBe("SlowService");
  });
});
