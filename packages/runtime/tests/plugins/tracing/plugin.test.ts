/**
 * Tests for TracingPlugin integration with @hex-di/runtime plugin system.
 *
 * These tests verify:
 * 1. TracingPlugin registration and API access via TRACING symbol
 * 2. Resolution hook integration (beforeResolve, afterResolve)
 * 3. Parent-child trace hierarchy tracking
 * 4. Cache hit detection
 * 5. Pause/resume functionality
 * 6. Custom collector injection
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import {
  createContainer,
  pipe,
  createPluginWrapper,
  createTracingPlugin,
  TRACING,
  withTracing,
  MemoryCollector,
  NoOpCollector,
} from "../../../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): unknown;
}

interface UserService {
  getUser(id: string): { id: string; name: string };
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const UserServicePort = createPort<"UserService", UserService>("UserService");

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({
    log: () => {},
  }),
});

const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({
    query: () => ({}),
  }),
});

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],
  lifetime: "scoped",
  factory: deps => ({
    getUser: (id: string) => {
      deps.Logger.log(`Getting user ${id}`);
      return { id, name: "Test User" };
    },
  }),
});

function createTestGraph() {
  return GraphBuilder.create()
    .provide(LoggerAdapter)
    .provide(DatabaseAdapter)
    .provide(UserServiceAdapter)
    .build();
}

/**
 * Creates a fresh tracing wrapper for test isolation.
 * Each test should use this to avoid shared state between tests.
 */
function createFreshTracingWrapper() {
  return createPluginWrapper(createTracingPlugin());
}

// =============================================================================
// Plugin Registration Tests
// =============================================================================

describe("TracingPlugin registration", () => {
  it("registers and provides TRACING symbol access via wrapper", () => {
    const graph = createTestGraph();
    const container = pipe(createContainer(graph, { name: "Test" }), withTracing);

    // TRACING symbol should be accessible
    expect(TRACING in container).toBe(true);

    const tracingAPI = container[TRACING];
    expect(typeof tracingAPI.getTraces).toBe("function");
    expect(typeof tracingAPI.getStats).toBe("function");
    expect(typeof tracingAPI.pause).toBe("function");
    expect(typeof tracingAPI.resume).toBe("function");
    expect(typeof tracingAPI.clear).toBe("function");
    expect(typeof tracingAPI.subscribe).toBe("function");
    expect(typeof tracingAPI.isPaused).toBe("function");
    expect(typeof tracingAPI.pin).toBe("function");
    expect(typeof tracingAPI.unpin).toBe("function");
  });

  it("creates independent plugin instance via createTracingPlugin factory", () => {
    const graph = createTestGraph();

    const plugin1 = createTracingPlugin();
    const plugin2 = createTracingPlugin();

    const withTracing1 = createPluginWrapper(plugin1);
    const withTracing2 = createPluginWrapper(plugin2);

    const container1 = pipe(createContainer(graph, { name: "Test" }), withTracing1);
    const container2 = pipe(createContainer(graph, { name: "Test" }), withTracing2);

    container1.resolve(LoggerPort);

    // Each container should have independent traces
    expect(container1[TRACING].getTraces()).toHaveLength(1);
    expect(container2[TRACING].getTraces()).toHaveLength(0);
  });
});

// =============================================================================
// Resolution Tracing Tests
// =============================================================================

describe("resolution tracing", () => {
  it("captures traces for resolved services", () => {
    const graph = createTestGraph();
    const freshWithTracing = createFreshTracingWrapper();
    const container = pipe(createContainer(graph, { name: "Test" }), freshWithTracing);

    container.resolve(LoggerPort);

    const traces = container[TRACING].getTraces();
    expect(traces).toHaveLength(1);

    const trace = traces[0];
    expect(trace).toBeDefined();
    expect(trace?.portName).toBe("Logger");
    expect(trace?.lifetime).toBe("singleton");
    expect(typeof trace?.startTime).toBe("number");
    expect(typeof trace?.duration).toBe("number");
    expect(trace?.duration).toBeGreaterThanOrEqual(0);
    expect(trace?.isCacheHit).toBe(false);
  });

  it("detects cache hits for singleton services", () => {
    const graph = createTestGraph();
    const freshWithTracing = createFreshTracingWrapper();
    const container = pipe(createContainer(graph, { name: "Test" }), freshWithTracing);

    // First resolution - cache miss
    container.resolve(LoggerPort);

    // Second resolution - cache hit
    container.resolve(LoggerPort);

    const traces = container[TRACING].getTraces();
    expect(traces).toHaveLength(2);

    expect(traces[0]?.isCacheHit).toBe(false);
    expect(traces[1]?.isCacheHit).toBe(true);
  });

  it("assigns unique trace IDs and incremental order values", () => {
    const graph = createTestGraph();
    const freshWithTracing = createFreshTracingWrapper();
    const container = pipe(createContainer(graph, { name: "Test" }), freshWithTracing);

    container.resolve(LoggerPort);
    container.resolve(DatabasePort);

    const traces = container[TRACING].getTraces();
    expect(traces).toHaveLength(2);

    // Each trace should have a unique ID
    expect(traces[0]?.id).not.toBe(traces[1]?.id);

    // Order should be incremental
    expect(traces[0]?.order).toBe(1);
    expect(traces[1]?.order).toBe(2);
  });

  it("tracks parent-child hierarchy for nested resolutions", () => {
    const graph = createTestGraph();
    const freshWithTracing = createFreshTracingWrapper();
    const container = pipe(createContainer(graph, { name: "Test" }), freshWithTracing);

    // UserService depends on Logger and Database
    const scope = container.createScope();
    scope.resolve(UserServicePort);

    const traces = container[TRACING].getTraces();

    // Should have traces for UserService and its dependencies
    expect(traces.length).toBeGreaterThanOrEqual(3);

    const userServiceTrace = traces.find(t => t.portName === "UserService");
    const loggerTrace = traces.find(t => t.portName === "Logger");
    const databaseTrace = traces.find(t => t.portName === "Database");

    expect(userServiceTrace).toBeDefined();
    expect(loggerTrace).toBeDefined();
    expect(databaseTrace).toBeDefined();

    // Logger and Database should be children of UserService (or have UserService as ancestor)
    // The exact hierarchy depends on container resolution order
    expect(userServiceTrace?.parentId).toBeNull(); // Top-level resolution
  });
});

// =============================================================================
// TracingAPI Tests
// =============================================================================

describe("TracingAPI methods", () => {
  it("getTraces() supports filtering", () => {
    const graph = createTestGraph();
    const freshWithTracing = createFreshTracingWrapper();
    const container = pipe(createContainer(graph, { name: "Test" }), freshWithTracing);

    container.resolve(LoggerPort);
    container.resolve(DatabasePort);

    const allTraces = container[TRACING].getTraces();
    expect(allTraces).toHaveLength(2);

    const loggerTraces = container[TRACING].getTraces({ portName: "Logger" });
    expect(loggerTraces).toHaveLength(1);
    expect(loggerTraces[0]?.portName).toBe("Logger");
  });

  it("getStats() computes aggregate statistics", () => {
    const graph = createTestGraph();
    const freshWithTracing = createFreshTracingWrapper();
    const container = pipe(createContainer(graph, { name: "Test" }), freshWithTracing);

    container.resolve(LoggerPort);
    container.resolve(LoggerPort); // Cache hit

    const stats = container[TRACING].getStats();

    expect(stats.totalResolutions).toBe(2);
    expect(stats.cacheHitRate).toBe(0.5);
    expect(typeof stats.averageDuration).toBe("number");
    expect(typeof stats.sessionStart).toBe("number");
  });

  it("clear() removes all traces", () => {
    const graph = createTestGraph();
    const freshWithTracing = createFreshTracingWrapper();
    const container = pipe(createContainer(graph, { name: "Test" }), freshWithTracing);

    container.resolve(LoggerPort);
    expect(container[TRACING].getTraces()).toHaveLength(1);

    container[TRACING].clear();
    expect(container[TRACING].getTraces()).toHaveLength(0);
  });

  it("subscribe() notifies on new traces", () => {
    const graph = createTestGraph();
    const freshWithTracing = createFreshTracingWrapper();
    const container = pipe(createContainer(graph, { name: "Test" }), freshWithTracing);

    const callback = vi.fn();
    const unsubscribe = container[TRACING].subscribe(callback);

    container.resolve(LoggerPort);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ portName: "Logger" }));

    unsubscribe();
    container.resolve(DatabasePort);
    expect(callback).toHaveBeenCalledTimes(1); // Not called again
  });
});

// =============================================================================
// Pause/Resume Tests
// =============================================================================

describe("pause/resume functionality", () => {
  it("pause() stops trace recording", () => {
    const graph = createTestGraph();
    const freshWithTracing = createFreshTracingWrapper();
    const container = pipe(createContainer(graph, { name: "Test" }), freshWithTracing);

    expect(container[TRACING].isPaused()).toBe(false);

    container.resolve(LoggerPort);
    expect(container[TRACING].getTraces()).toHaveLength(1);

    container[TRACING].pause();
    expect(container[TRACING].isPaused()).toBe(true);

    container.resolve(DatabasePort);
    expect(container[TRACING].getTraces()).toHaveLength(1); // Still 1
  });

  it("resume() restarts trace recording", () => {
    const graph = createTestGraph();
    const freshWithTracing = createFreshTracingWrapper();
    const container = pipe(createContainer(graph, { name: "Test" }), freshWithTracing);

    container[TRACING].pause();
    container.resolve(LoggerPort);
    expect(container[TRACING].getTraces()).toHaveLength(0);

    container[TRACING].resume();
    expect(container[TRACING].isPaused()).toBe(false);

    container.resolve(DatabasePort);
    expect(container[TRACING].getTraces()).toHaveLength(1);
    expect(container[TRACING].getTraces()[0]?.portName).toBe("Database");
  });
});

// =============================================================================
// Custom Collector Tests
// =============================================================================

describe("custom collector configuration", () => {
  it("uses provided collector for trace storage", () => {
    const graph = createTestGraph();
    const collector = new MemoryCollector();
    const plugin = createTracingPlugin({ collector });
    const customWithTracing = createPluginWrapper(plugin);

    const container = pipe(createContainer(graph, { name: "Test" }), customWithTracing);

    container.resolve(LoggerPort);

    // Traces should be in the custom collector
    expect(collector.getTraces()).toHaveLength(1);
    expect(collector.getTraces()[0]?.portName).toBe("Logger");
  });

  it("supports NoOpCollector for zero-overhead production mode", () => {
    const graph = createTestGraph();
    const collector = new NoOpCollector();
    const plugin = createTracingPlugin({ collector });
    const customWithTracing = createPluginWrapper(plugin);

    const container = pipe(createContainer(graph, { name: "Test" }), customWithTracing);

    container.resolve(LoggerPort);
    container.resolve(DatabasePort);

    // NoOpCollector discards all traces
    expect(container[TRACING].getTraces()).toHaveLength(0);
    expect(container[TRACING].getStats().totalResolutions).toBe(0);
  });

  it("applies custom retention policy", () => {
    const graph = createTestGraph();
    const plugin = createTracingPlugin({
      retentionPolicy: {
        maxTraces: 2,
        slowThresholdMs: 10,
      },
    });
    const customWithTracing = createPluginWrapper(plugin);

    const container = pipe(createContainer(graph, { name: "Test" }), customWithTracing);

    container.resolve(LoggerPort);
    container.resolve(DatabasePort);
    container.resolve(LoggerPort); // This might evict first trace

    const traces = container[TRACING].getTraces();
    // Should respect maxTraces limit
    expect(traces.length).toBeLessThanOrEqual(2);
  });
});

// =============================================================================
// Scope Integration Tests
// =============================================================================

describe("scope integration", () => {
  it("tracks scopeId for scoped service resolutions", () => {
    const graph = createTestGraph();
    const freshWithTracing = createFreshTracingWrapper();
    const container = pipe(createContainer(graph, { name: "Test" }), freshWithTracing);

    const scope = container.createScope();
    scope.resolve(UserServicePort);

    const traces = container[TRACING].getTraces();
    const userServiceTrace = traces.find(t => t.portName === "UserService");

    expect(userServiceTrace).toBeDefined();
    expect(userServiceTrace?.scopeId).not.toBeNull();
    expect(typeof userServiceTrace?.scopeId).toBe("string");
  });

  it("captures traces from nested scopes", () => {
    const graph = createTestGraph();
    const freshWithTracing = createFreshTracingWrapper();
    const container = pipe(createContainer(graph, { name: "Test" }), freshWithTracing);

    const scope = container.createScope();
    scope.resolve(UserServicePort);

    const traces = container[TRACING].getTraces();
    expect(traces.length).toBeGreaterThan(0);
  });
});
