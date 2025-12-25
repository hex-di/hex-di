/**
 * Runtime tests for the Plugin Manager.
 *
 * These tests verify:
 * 1. Plugin initialization order (topological sort based on dependencies)
 * 2. Plugin disposal order (LIFO - reverse of initialization)
 * 3. Hook composition (beforeResolve in order, afterResolve in reverse)
 * 4. Plugin context dependency injection
 * 5. Scope event emission to plugins
 * 6. Error handling for missing/circular dependencies
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPort, type Port } from "@hex-di/ports";
import { createAdapter, GraphBuilder } from "@hex-di/graph";
import {
  createContainer,
  definePlugin,
  requires,
  optionallyRequires,
  PluginManager,
  PluginDependencyMissingError,
  PluginCircularDependencyError,
  PluginInitializationError,
} from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface TracingAPI {
  getTraces(): string[];
  addTrace(trace: string): void;
}

interface MetricsAPI {
  getMetrics(): number[];
  recordMetric(value: number): void;
}

interface LoggerAPI {
  getLogs(): string[];
  log(message: string): void;
}

interface DevToolsAPI {
  getState(): { traces: string[]; metrics: number[] };
}

const TRACING = Symbol.for("test/tracing");
const METRICS = Symbol.for("test/metrics");
const LOGGER = Symbol.for("test/logger");
const DEVTOOLS = Symbol.for("test/devtools");

// Test port and adapter for container creation
interface TestService {
  value: number;
}
const TestPort = createPort<"Test", TestService>("Test");

const TestAdapter = createAdapter({
  provides: TestPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ value: 42 }),
});

function createTestGraph() {
  return GraphBuilder.create().provide(TestAdapter).build();
}

// =============================================================================
// Plugin Initialization Tests
// =============================================================================

describe("Plugin Initialization", () => {
  it("should initialize plugins with no dependencies", () => {
    const initOrder: string[] = [];

    const TracingPlugin = definePlugin({
      name: "tracing",
      symbol: TRACING,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(): TracingAPI {
        initOrder.push("tracing");
        const traces: string[] = [];
        return {
          getTraces: () => traces,
          addTrace: trace => traces.push(trace),
        };
      },
    });

    const container = createContainer(createTestGraph(), {
      plugins: [TracingPlugin],
    });

    expect(initOrder).toEqual(["tracing"]);
    expect(container[TRACING]).toBeDefined();
    expect(container[TRACING].getTraces()).toEqual([]);
  });

  it("should initialize plugins in dependency order", () => {
    const initOrder: string[] = [];

    const TracingPlugin = definePlugin({
      name: "tracing",
      symbol: TRACING,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(): TracingAPI {
        initOrder.push("tracing");
        return { getTraces: () => [], addTrace: () => {} };
      },
    });

    const MetricsPlugin = definePlugin({
      name: "metrics",
      symbol: METRICS,
      requires: [
        requires<typeof TRACING, TracingAPI>({
          symbol: TRACING,
          name: "Tracing",
          reason: "Metrics depends on tracing",
        }),
      ] as const,
      enhancedBy: [] as const,
      createApi(context): MetricsAPI {
        initOrder.push("metrics");
        // Verify dependency is available
        const tracing = context.getDependency(TRACING);
        expect(tracing).toBeDefined();
        return { getMetrics: () => [], recordMetric: () => {} };
      },
    });

    createContainer(createTestGraph(), {
      plugins: [TracingPlugin, MetricsPlugin],
    });

    expect(initOrder).toEqual(["tracing", "metrics"]);
  });

  it("should topologically sort plugins regardless of array order", () => {
    const initOrder: string[] = [];

    const TracingPlugin = definePlugin({
      name: "tracing",
      symbol: TRACING,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(): TracingAPI {
        initOrder.push("tracing");
        return { getTraces: () => [], addTrace: () => {} };
      },
    });

    const MetricsPlugin = definePlugin({
      name: "metrics",
      symbol: METRICS,
      requires: [
        requires<typeof TRACING, TracingAPI>({
          symbol: TRACING,
          name: "Tracing",
          reason: "Metrics depends on tracing",
        }),
      ] as const,
      enhancedBy: [] as const,
      createApi(): MetricsAPI {
        initOrder.push("metrics");
        return { getMetrics: () => [], recordMetric: () => {} };
      },
    });

    // Note: MetricsPlugin comes first in array but depends on TracingPlugin
    createContainer(createTestGraph(), {
      plugins: [MetricsPlugin, TracingPlugin],
    });

    // Topological sort should ensure tracing initializes first
    expect(initOrder).toEqual(["tracing", "metrics"]);
  });

  it("should handle complex dependency chains", () => {
    const initOrder: string[] = [];

    const TracingPlugin = definePlugin({
      name: "tracing",
      symbol: TRACING,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(): TracingAPI {
        initOrder.push("tracing");
        return { getTraces: () => [], addTrace: () => {} };
      },
    });

    const MetricsPlugin = definePlugin({
      name: "metrics",
      symbol: METRICS,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(): MetricsAPI {
        initOrder.push("metrics");
        return { getMetrics: () => [], recordMetric: () => {} };
      },
    });

    const DevToolsPlugin = definePlugin({
      name: "devtools",
      symbol: DEVTOOLS,
      requires: [
        requires<typeof TRACING, TracingAPI>({
          symbol: TRACING,
          name: "Tracing",
          reason: "DevTools needs tracing",
        }),
        requires<typeof METRICS, MetricsAPI>({
          symbol: METRICS,
          name: "Metrics",
          reason: "DevTools needs metrics",
        }),
      ] as const,
      enhancedBy: [] as const,
      createApi(context): DevToolsAPI {
        initOrder.push("devtools");
        const tracing = context.getDependency(TRACING);
        const metrics = context.getDependency(METRICS);
        return {
          getState: () => ({
            traces: tracing.getTraces(),
            metrics: metrics.getMetrics(),
          }),
        };
      },
    });

    // DevTools first in array but should init last
    createContainer(createTestGraph(), {
      plugins: [DevToolsPlugin, TracingPlugin, MetricsPlugin],
    });

    // DevTools must come after both Tracing and Metrics
    expect(initOrder.indexOf("devtools")).toBeGreaterThan(initOrder.indexOf("tracing"));
    expect(initOrder.indexOf("devtools")).toBeGreaterThan(initOrder.indexOf("metrics"));
  });
});

// =============================================================================
// Plugin Context Tests
// =============================================================================

describe("Plugin Context", () => {
  it("should provide access to required dependencies via getDependency", () => {
    const traces: string[] = [];

    const TracingPlugin = definePlugin({
      name: "tracing",
      symbol: TRACING,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(): TracingAPI {
        return {
          getTraces: () => traces,
          addTrace: t => traces.push(t),
        };
      },
    });

    const MetricsPlugin = definePlugin({
      name: "metrics",
      symbol: METRICS,
      requires: [
        requires<typeof TRACING, TracingAPI>({
          symbol: TRACING,
          name: "Tracing",
          reason: "Metrics logs to tracing",
        }),
      ] as const,
      enhancedBy: [] as const,
      createApi(context): MetricsAPI {
        const tracing = context.getDependency(TRACING);
        return {
          getMetrics: () => [],
          recordMetric: v => tracing.addTrace(`metric:${v}`),
        };
      },
    });

    const container = createContainer(createTestGraph(), {
      plugins: [TracingPlugin, MetricsPlugin],
    });

    container[METRICS].recordMetric(100);
    expect(traces).toEqual(["metric:100"]);
  });

  it("should provide access to optional dependencies via getOptionalDependency", () => {
    let loggerUsed = false;

    const LoggerPlugin = definePlugin({
      name: "logger",
      symbol: LOGGER,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(): LoggerAPI {
        return { getLogs: () => [], log: () => {} };
      },
    });

    const TracingPlugin = definePlugin({
      name: "tracing",
      symbol: TRACING,
      requires: [] as const,
      enhancedBy: [
        optionallyRequires<typeof LOGGER, LoggerAPI>({
          symbol: LOGGER,
          name: "Logger",
          reason: "Enhanced logging when available",
        }),
      ] as const,
      createApi(context): TracingAPI {
        const logger = context.getOptionalDependency(LOGGER);
        if (logger) loggerUsed = true;
        return { getTraces: () => [], addTrace: () => {} };
      },
    });

    createContainer(createTestGraph(), {
      plugins: [LoggerPlugin, TracingPlugin],
    });

    expect(loggerUsed).toBe(true);
  });

  it("should return undefined for missing optional dependencies", () => {
    let loggerValue: LoggerAPI | undefined = { getLogs: () => [], log: () => {} };

    const TracingPlugin = definePlugin({
      name: "tracing",
      symbol: TRACING,
      requires: [] as const,
      enhancedBy: [
        optionallyRequires<typeof LOGGER, LoggerAPI>({
          symbol: LOGGER,
          name: "Logger",
          reason: "Enhanced logging when available",
        }),
      ] as const,
      createApi(context): TracingAPI {
        loggerValue = context.getOptionalDependency(LOGGER);
        return { getTraces: () => [], addTrace: () => {} };
      },
    });

    // Logger plugin NOT registered
    createContainer(createTestGraph(), {
      plugins: [TracingPlugin],
    });

    expect(loggerValue).toBeUndefined();
  });

  it("should report hasPlugin correctly", () => {
    let hasLogger = false;
    let hasMetrics = false;

    const LoggerPlugin = definePlugin({
      name: "logger",
      symbol: LOGGER,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(): LoggerAPI {
        return { getLogs: () => [], log: () => {} };
      },
    });

    const TracingPlugin = definePlugin({
      name: "tracing",
      symbol: TRACING,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(context): TracingAPI {
        hasLogger = context.hasPlugin(LOGGER);
        hasMetrics = context.hasPlugin(METRICS);
        return { getTraces: () => [], addTrace: () => {} };
      },
    });

    createContainer(createTestGraph(), {
      plugins: [LoggerPlugin, TracingPlugin],
    });

    expect(hasLogger).toBe(true);
    expect(hasMetrics).toBe(false);
  });
});

// =============================================================================
// Plugin Disposal Tests
// =============================================================================

describe("Plugin Disposal", () => {
  it("should dispose plugins in reverse initialization order (LIFO)", async () => {
    const disposeOrder: string[] = [];

    const TracingPlugin = definePlugin({
      name: "tracing",
      symbol: TRACING,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(): TracingAPI {
        return { getTraces: () => [], addTrace: () => {} };
      },
      dispose() {
        disposeOrder.push("tracing");
      },
    });

    const MetricsPlugin = definePlugin({
      name: "metrics",
      symbol: METRICS,
      requires: [
        requires<typeof TRACING, TracingAPI>({
          symbol: TRACING,
          name: "Tracing",
          reason: "Metrics depends on tracing",
        }),
      ] as const,
      enhancedBy: [] as const,
      createApi(): MetricsAPI {
        return { getMetrics: () => [], recordMetric: () => {} };
      },
      dispose() {
        disposeOrder.push("metrics");
      },
    });

    const container = createContainer(createTestGraph(), {
      plugins: [TracingPlugin, MetricsPlugin],
    });

    await container.dispose();

    // Metrics was initialized after Tracing, so disposed first
    expect(disposeOrder).toEqual(["metrics", "tracing"]);
  });

  it("should handle async dispose functions", async () => {
    const disposeOrder: string[] = [];

    const TracingPlugin = definePlugin({
      name: "tracing",
      symbol: TRACING,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(): TracingAPI {
        return { getTraces: () => [], addTrace: () => {} };
      },
      async dispose() {
        await new Promise(r => setTimeout(r, 10));
        disposeOrder.push("tracing");
      },
    });

    const container = createContainer(createTestGraph(), {
      plugins: [TracingPlugin],
    });

    await container.dispose();

    expect(disposeOrder).toEqual(["tracing"]);
  });

  it("should call onDispose callbacks registered via context", async () => {
    const cleanupOrder: string[] = [];

    const TracingPlugin = definePlugin({
      name: "tracing",
      symbol: TRACING,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(context): TracingAPI {
        context.onDispose(() => {
          cleanupOrder.push("tracing-cleanup-1");
        });
        context.onDispose(() => {
          cleanupOrder.push("tracing-cleanup-2");
        });
        return { getTraces: () => [], addTrace: () => {} };
      },
    });

    const container = createContainer(createTestGraph(), {
      plugins: [TracingPlugin],
    });

    await container.dispose();

    // Both callbacks should be called (order may be LIFO)
    expect(cleanupOrder).toContain("tracing-cleanup-1");
    expect(cleanupOrder).toContain("tracing-cleanup-2");
  });
});

// =============================================================================
// Hook Composition Tests
// =============================================================================

describe("Hook Composition", () => {
  it("should call beforeResolve hooks in registration order", () => {
    const hookOrder: string[] = [];

    const TracingPlugin = definePlugin({
      name: "tracing",
      symbol: TRACING,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(): TracingAPI {
        return { getTraces: () => [], addTrace: () => {} };
      },
      hooks: {
        beforeResolve() {
          hookOrder.push("tracing-before");
        },
      },
    });

    const MetricsPlugin = definePlugin({
      name: "metrics",
      symbol: METRICS,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(): MetricsAPI {
        return { getMetrics: () => [], recordMetric: () => {} };
      },
      hooks: {
        beforeResolve() {
          hookOrder.push("metrics-before");
        },
      },
    });

    const container = createContainer(createTestGraph(), {
      plugins: [TracingPlugin, MetricsPlugin],
    });

    container.resolve(TestPort);

    expect(hookOrder).toEqual(["tracing-before", "metrics-before"]);
  });

  it("should call afterResolve hooks in reverse order (middleware pattern)", () => {
    const hookOrder: string[] = [];

    const TracingPlugin = definePlugin({
      name: "tracing",
      symbol: TRACING,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(): TracingAPI {
        return { getTraces: () => [], addTrace: () => {} };
      },
      hooks: {
        afterResolve() {
          hookOrder.push("tracing-after");
        },
      },
    });

    const MetricsPlugin = definePlugin({
      name: "metrics",
      symbol: METRICS,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(): MetricsAPI {
        return { getMetrics: () => [], recordMetric: () => {} };
      },
      hooks: {
        afterResolve() {
          hookOrder.push("metrics-after");
        },
      },
    });

    const container = createContainer(createTestGraph(), {
      plugins: [TracingPlugin, MetricsPlugin],
    });

    container.resolve(TestPort);

    // Reverse order for afterResolve
    expect(hookOrder).toEqual(["metrics-after", "tracing-after"]);
  });

  it("should receive correct context in hooks", () => {
    let capturedContext: { portName: string; lifetime: string } | null = null;

    const TracingPlugin = definePlugin({
      name: "tracing",
      symbol: TRACING,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(): TracingAPI {
        return { getTraces: () => [], addTrace: () => {} };
      },
      hooks: {
        beforeResolve(ctx) {
          capturedContext = { portName: ctx.portName, lifetime: ctx.lifetime };
        },
      },
    });

    const container = createContainer(createTestGraph(), {
      plugins: [TracingPlugin],
    });

    container.resolve(TestPort);

    expect(capturedContext).toEqual({
      portName: "Test",
      lifetime: "singleton",
    });
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe("Plugin Error Handling", () => {
  it("should throw PluginDependencyMissingError for missing required dependencies", () => {
    const MetricsPlugin = definePlugin({
      name: "metrics",
      symbol: METRICS,
      requires: [
        requires<typeof TRACING, TracingAPI>({
          symbol: TRACING,
          name: "Tracing",
          reason: "Metrics depends on tracing",
        }),
      ] as const,
      enhancedBy: [] as const,
      createApi(): MetricsAPI {
        return { getMetrics: () => [], recordMetric: () => {} };
      },
    });

    // TracingPlugin NOT registered
    expect(() =>
      createContainer(createTestGraph(), {
        plugins: [MetricsPlugin],
      })
    ).toThrow(PluginDependencyMissingError);
  });

  it("should throw PluginCircularDependencyError for circular dependencies", () => {
    // Create a circular dependency: A -> B -> A
    const PLUGIN_A = Symbol.for("test/plugin-a");
    const PLUGIN_B = Symbol.for("test/plugin-b");

    interface PluginAAPI {
      doA(): void;
    }
    interface PluginBAPI {
      doB(): void;
    }

    const PluginA = definePlugin({
      name: "plugin-a",
      symbol: PLUGIN_A,
      requires: [
        requires<typeof PLUGIN_B, PluginBAPI>({
          symbol: PLUGIN_B,
          name: "PluginB",
          reason: "A depends on B",
        }),
      ] as const,
      enhancedBy: [] as const,
      createApi(): PluginAAPI {
        return { doA: () => {} };
      },
    });

    const PluginB = definePlugin({
      name: "plugin-b",
      symbol: PLUGIN_B,
      requires: [
        requires<typeof PLUGIN_A, PluginAAPI>({
          symbol: PLUGIN_A,
          name: "PluginA",
          reason: "B depends on A",
        }),
      ] as const,
      enhancedBy: [] as const,
      createApi(): PluginBAPI {
        return { doB: () => {} };
      },
    });

    expect(() =>
      createContainer(createTestGraph(), {
        plugins: [PluginA, PluginB],
      })
    ).toThrow(PluginCircularDependencyError);
  });

  it("should throw PluginInitializationError if createApi throws", () => {
    const BrokenPlugin = definePlugin({
      name: "broken",
      symbol: Symbol.for("test/broken"),
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(): never {
        throw new Error("Initialization failed");
      },
    });

    expect(() =>
      createContainer(createTestGraph(), {
        plugins: [BrokenPlugin],
      })
    ).toThrow(PluginInitializationError);
  });

  it("should include plugin name in error context", () => {
    const BrokenPlugin = definePlugin({
      name: "my-broken-plugin",
      symbol: Symbol.for("test/broken"),
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(): never {
        throw new Error("Oops");
      },
    });

    try {
      createContainer(createTestGraph(), {
        plugins: [BrokenPlugin],
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(PluginInitializationError);
      expect((error as PluginInitializationError).pluginName).toBe("my-broken-plugin");
    }
  });
});

// =============================================================================
// Plugin API Access Tests
// =============================================================================

describe("Plugin API Access", () => {
  it("should expose plugin APIs on container via symbols", () => {
    const TracingPlugin = definePlugin({
      name: "tracing",
      symbol: TRACING,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(): TracingAPI {
        const traces: string[] = [];
        return {
          getTraces: () => [...traces],
          addTrace: t => traces.push(t),
        };
      },
    });

    const container = createContainer(createTestGraph(), {
      plugins: [TracingPlugin],
    });

    // Access via symbol
    const tracing = container[TRACING];
    expect(tracing).toBeDefined();

    tracing.addTrace("test");
    expect(tracing.getTraces()).toEqual(["test"]);
  });

  it("should freeze plugin APIs", () => {
    const TracingPlugin = definePlugin({
      name: "tracing",
      symbol: TRACING,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(): TracingAPI {
        return { getTraces: () => [], addTrace: () => {} };
      },
    });

    const container = createContainer(createTestGraph(), {
      plugins: [TracingPlugin],
    });

    const tracing = container[TRACING];

    // Attempting to modify should fail on frozen objects
    expect(() => {
      // Object.assign throws TypeError on frozen objects in strict mode
      Object.assign(tracing, { newProp: "value" });
    }).toThrow();
  });
});

// =============================================================================
// Zero Plugin Tests
// =============================================================================

describe("Container without plugins", () => {
  it("should work normally when no plugins are provided", () => {
    const container = createContainer(createTestGraph());

    const service = container.resolve(TestPort);
    expect(service.value).toBe(42);
  });

  it("should work normally with empty plugins array", () => {
    const container = createContainer(createTestGraph(), {
      plugins: [],
    });

    const service = container.resolve(TestPort);
    expect(service.value).toBe(42);
  });
});
