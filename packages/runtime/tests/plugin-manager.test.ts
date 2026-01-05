/**
 * Runtime tests for the Plugin System.
 *
 * These tests verify:
 * 1. Plugin wrapper creation and application
 * 2. Plugin API access via symbols
 * 3. Hook installation and composition via wrappers
 * 4. Plugin disposal
 * 5. Multiple plugin composition via pipe
 * 6. PluginManager direct usage (for advanced scenarios)
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
  createPluginWrapper,
  pipe,
  INTERNAL_ACCESS,
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
// Plugin Wrapper Tests
// =============================================================================

describe("Plugin Wrappers", () => {
  it("should create and apply a plugin wrapper", () => {
    const initCalled = vi.fn();

    const TracingPlugin = definePlugin({
      name: "tracing",
      symbol: TRACING,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(): TracingAPI {
        initCalled();
        const traces: string[] = [];
        return {
          getTraces: () => traces,
          addTrace: trace => traces.push(trace),
        };
      },
    });

    const withTracing = createPluginWrapper(TracingPlugin);
    const container = pipe(createContainer(createTestGraph(), { name: "Test" }), withTracing);

    expect(initCalled).toHaveBeenCalledTimes(1);
    expect(container[TRACING]).toBeDefined();
    expect(container[TRACING].getTraces()).toEqual([]);
  });

  it("should allow multiple wrappers via pipe", () => {
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

    const withTracing = createPluginWrapper(TracingPlugin);
    const withMetrics = createPluginWrapper(MetricsPlugin);

    const container = pipe(
      createContainer(createTestGraph(), { name: "Test" }),
      withTracing,
      withMetrics
    );

    // Wrappers are applied in pipe order
    expect(initOrder).toEqual(["tracing", "metrics"]);
    expect(container[TRACING]).toBeDefined();
    expect(container[METRICS]).toBeDefined();
  });

  it("should preserve container type through wrapper chain", () => {
    const TracingPlugin = definePlugin({
      name: "tracing",
      symbol: TRACING,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(): TracingAPI {
        return { getTraces: () => [], addTrace: () => {} };
      },
    });

    const withTracing = createPluginWrapper(TracingPlugin);
    const container = pipe(createContainer(createTestGraph(), { name: "Test" }), withTracing);

    // Container should still have resolve method
    const service = container.resolve(TestPort);
    expect(service.value).toBe(42);
  });

  it("should allow accessing one plugin's API from another after applying wrappers", () => {
    const TracingPlugin = definePlugin({
      name: "tracing",
      symbol: TRACING,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(): TracingAPI {
        const traces: string[] = [];
        return {
          getTraces: () => traces,
          addTrace: trace => traces.push(trace),
        };
      },
    });

    const withTracing = createPluginWrapper(TracingPlugin);
    const container = pipe(createContainer(createTestGraph(), { name: "Test" }), withTracing);

    // After applying wrapper, we can access the API
    container[TRACING].addTrace("test-trace");
    expect(container[TRACING].getTraces()).toEqual(["test-trace"]);
  });
});

// =============================================================================
// Hook Installation via Wrappers
// =============================================================================

describe("Hook Installation via Wrappers", () => {
  it("should install hooks from plugin definition", () => {
    const beforeResolveCalls: string[] = [];
    const afterResolveCalls: string[] = [];

    const TracingPlugin = definePlugin({
      name: "tracing",
      symbol: TRACING,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(): TracingAPI {
        return { getTraces: () => [], addTrace: () => {} };
      },
      hooks: {
        beforeResolve: ctx => {
          beforeResolveCalls.push(ctx.portName);
        },
        afterResolve: ctx => {
          afterResolveCalls.push(ctx.portName);
        },
      },
    });

    const withTracing = createPluginWrapper(TracingPlugin);
    const container = pipe(createContainer(createTestGraph(), { name: "Test" }), withTracing);

    container.resolve(TestPort);

    expect(beforeResolveCalls).toEqual(["Test"]);
    expect(afterResolveCalls).toEqual(["Test"]);
  });

  it("should compose hooks from multiple plugins in order", () => {
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
        beforeResolve: () => {
          hookOrder.push("tracing-before");
        },
        afterResolve: () => {
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
        beforeResolve: () => {
          hookOrder.push("metrics-before");
        },
        afterResolve: () => {
          hookOrder.push("metrics-after");
        },
      },
    });

    const withTracing = createPluginWrapper(TracingPlugin);
    const withMetrics = createPluginWrapper(MetricsPlugin);

    const container = pipe(
      createContainer(createTestGraph(), { name: "Test" }),
      withTracing,
      withMetrics
    );

    container.resolve(TestPort);

    // beforeResolve in order, afterResolve in reverse (middleware pattern)
    expect(hookOrder).toEqual([
      "tracing-before",
      "metrics-before",
      "metrics-after",
      "tracing-after",
    ]);
  });

  it("should combine wrapper hooks with container options hooks", () => {
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
        beforeResolve: () => {
          hookOrder.push("plugin-before");
        },
        afterResolve: () => {
          hookOrder.push("plugin-after");
        },
      },
    });

    const withTracing = createPluginWrapper(TracingPlugin);

    // Container with hooks option
    const container = pipe(
      createContainer(
        createTestGraph(),
        { name: "Test" },
        {
          hooks: {
            beforeResolve: () => hookOrder.push("options-before"),
            afterResolve: () => hookOrder.push("options-after"),
          },
        }
      ),
      withTracing
    );

    container.resolve(TestPort);

    // Options hooks run first (added first), then plugin hooks
    expect(hookOrder).toEqual(["options-before", "plugin-before", "plugin-after", "options-after"]);
  });
});

// =============================================================================
// Plugin Disposal Tests
// =============================================================================

describe("Plugin Disposal via Wrappers", () => {
  it("should call onDispose callback when container is disposed", async () => {
    const disposeOrder: string[] = [];

    const TracingPlugin = definePlugin({
      name: "tracing",
      symbol: TRACING,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(context): TracingAPI {
        context.onDispose(() => {
          disposeOrder.push("tracing-disposed");
        });
        return { getTraces: () => [], addTrace: () => {} };
      },
    });

    const withTracing = createPluginWrapper(TracingPlugin);
    const container = pipe(createContainer(createTestGraph(), { name: "Test" }), withTracing);

    await container.dispose();

    expect(disposeOrder).toEqual(["tracing-disposed"]);
  });

  it("should dispose plugins in reverse order (LIFO)", async () => {
    const disposeOrder: string[] = [];

    const TracingPlugin = definePlugin({
      name: "tracing",
      symbol: TRACING,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(context): TracingAPI {
        context.onDispose(() => {
          disposeOrder.push("tracing");
        });
        return { getTraces: () => [], addTrace: () => {} };
      },
    });

    const MetricsPlugin = definePlugin({
      name: "metrics",
      symbol: METRICS,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(context): MetricsAPI {
        context.onDispose(() => {
          disposeOrder.push("metrics");
        });
        return { getMetrics: () => [], recordMetric: () => {} };
      },
    });

    const withTracing = createPluginWrapper(TracingPlugin);
    const withMetrics = createPluginWrapper(MetricsPlugin);

    const container = pipe(
      createContainer(createTestGraph(), { name: "Test" }),
      withTracing,
      withMetrics
    );

    await container.dispose();

    // Dispose in reverse order of application
    expect(disposeOrder).toEqual(["metrics", "tracing"]);
  });
});

// =============================================================================
// PluginManager Direct Usage Tests
// =============================================================================

describe("PluginManager Direct Usage", () => {
  it("should initialize plugins and provide getSymbolApis", () => {
    const TracingPlugin = definePlugin({
      name: "tracing",
      symbol: TRACING,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(): TracingAPI {
        return { getTraces: () => [], addTrace: () => {} };
      },
    });

    const manager = new PluginManager();
    const container = createContainer(createTestGraph(), { name: "Test" });
    const accessible = { [INTERNAL_ACCESS]: container[INTERNAL_ACCESS] };

    manager.initialize([TracingPlugin], accessible);

    const apis = manager.getSymbolApis();
    expect(apis.size).toBe(1);
    expect(apis.has(TRACING)).toBe(true);
  });

  it("should sort plugins by dependencies", () => {
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

    const manager = new PluginManager();
    const container = createContainer(createTestGraph(), { name: "Test" });
    const accessible = { [INTERNAL_ACCESS]: container[INTERNAL_ACCESS] };

    // Pass in wrong order - manager should sort
    manager.initialize([MetricsPlugin, TracingPlugin], accessible);

    expect(initOrder).toEqual(["tracing", "metrics"]);
  });

  it("should throw PluginDependencyMissingError for missing dependencies", () => {
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

    const manager = new PluginManager();
    const container = createContainer(createTestGraph(), { name: "Test" });
    const accessible = { [INTERNAL_ACCESS]: container[INTERNAL_ACCESS] };

    expect(() => {
      manager.initialize([MetricsPlugin], accessible);
    }).toThrow(PluginDependencyMissingError);
  });

  it("should throw PluginCircularDependencyError for circular dependencies", () => {
    // Define symbols first for use in type annotations
    const PLUGIN_A_SYM = Symbol.for("test/plugin-a");
    const PLUGIN_B_SYM = Symbol.for("test/plugin-b");

    type EmptyApi = object;

    const PluginA = definePlugin({
      name: "plugin-a",
      symbol: PLUGIN_A_SYM,
      requires: [
        requires<typeof PLUGIN_B_SYM, EmptyApi>({
          symbol: PLUGIN_B_SYM,
          name: "PluginB",
          reason: "A depends on B",
        }),
      ] as const,
      enhancedBy: [] as const,
      createApi() {
        return {};
      },
    });

    const PluginB = definePlugin({
      name: "plugin-b",
      symbol: PLUGIN_B_SYM,
      requires: [
        requires<typeof PLUGIN_A_SYM, EmptyApi>({
          symbol: PLUGIN_A_SYM,
          name: "PluginA",
          reason: "B depends on A",
        }),
      ] as const,
      enhancedBy: [] as const,
      createApi() {
        return {};
      },
    });

    const manager = new PluginManager();
    const container = createContainer(createTestGraph(), { name: "Test" });
    const accessible = { [INTERNAL_ACCESS]: container[INTERNAL_ACCESS] };

    expect(() => {
      manager.initialize([PluginA, PluginB], accessible);
    }).toThrow(PluginCircularDependencyError);
  });

  it("should throw PluginInitializationError if createApi throws", () => {
    const BrokenPlugin = definePlugin({
      name: "broken",
      symbol: Symbol.for("test/broken"),
      requires: [] as const,
      enhancedBy: [] as const,
      createApi() {
        throw new Error("Plugin initialization failed");
      },
    });

    const manager = new PluginManager();
    const container = createContainer(createTestGraph(), { name: "Test" });
    const accessible = { [INTERNAL_ACCESS]: container[INTERNAL_ACCESS] };

    expect(() => {
      manager.initialize([BrokenPlugin], accessible);
    }).toThrow(PluginInitializationError);
  });
});

// =============================================================================
// Context Access Tests
// =============================================================================

describe("Plugin Context in Wrappers", () => {
  it("should provide hasPlugin that checks container", () => {
    let hasPluginResult = false;

    const TracingPlugin = definePlugin({
      name: "tracing",
      symbol: TRACING,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(): TracingAPI {
        return { getTraces: () => [], addTrace: () => {} };
      },
    });

    const MetricsPlugin = definePlugin({
      name: "metrics",
      symbol: METRICS,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(context): MetricsAPI {
        // In wrapper pattern, hasPlugin checks if symbol exists on container
        hasPluginResult = context.hasPlugin(TRACING);
        return { getMetrics: () => [], recordMetric: () => {} };
      },
    });

    const withTracing = createPluginWrapper(TracingPlugin);
    const withMetrics = createPluginWrapper(MetricsPlugin);

    // Apply tracing first, then metrics
    pipe(createContainer(createTestGraph(), { name: "Test" }), withTracing, withMetrics);

    expect(hasPluginResult).toBe(true);
  });
});

// =============================================================================
// Scope Event Tests
// =============================================================================

describe("Scope Events via Wrappers", () => {
  it("should provide scope event handlers via context", () => {
    const scopeCreatedCalls: string[] = [];
    const scopeDisposedCalls: string[] = [];

    const TracingPlugin = definePlugin({
      name: "tracing",
      symbol: TRACING,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(context): TracingAPI {
        context.scopeEvents.onScopeCreated(info => {
          scopeCreatedCalls.push(info.id);
        });
        context.scopeEvents.onScopeDisposed(info => {
          scopeDisposedCalls.push(info.id);
        });
        return { getTraces: () => [], addTrace: () => {} };
      },
    });

    const withTracing = createPluginWrapper(TracingPlugin);
    const container = pipe(createContainer(createTestGraph(), { name: "Test" }), withTracing);

    // Note: In wrapper pattern, scope events may not be automatically fired
    // because the wrapper is applied to the container, not the scope.
    // This test documents the expected behavior - scope events are available
    // via the context but may need manual triggering or additional setup.
    expect(typeof container[TRACING]).toBe("object");
  });
});

// =============================================================================
// Container Internal Access Tests
// =============================================================================

describe("Container Internal Access", () => {
  it("should provide access to container internals via context.getContainer", () => {
    let containerAccessible = false;

    const TracingPlugin = definePlugin({
      name: "tracing",
      symbol: TRACING,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(context): TracingAPI {
        const container = context.getContainer();
        containerAccessible = INTERNAL_ACCESS in container;
        return { getTraces: () => [], addTrace: () => {} };
      },
    });

    const withTracing = createPluginWrapper(TracingPlugin);
    pipe(createContainer(createTestGraph(), { name: "Test" }), withTracing);

    expect(containerAccessible).toBe(true);
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe("Edge Cases", () => {
  it("should handle empty wrapper chain", () => {
    const container = createContainer(createTestGraph(), { name: "Test" });
    const service = container.resolve(TestPort);
    expect(service.value).toBe(42);
  });

  it("should handle plugin with no hooks", () => {
    const TracingPlugin = definePlugin({
      name: "tracing",
      symbol: TRACING,
      requires: [] as const,
      enhancedBy: [] as const,
      createApi(): TracingAPI {
        return { getTraces: () => [], addTrace: () => {} };
      },
      // No hooks property
    });

    const withTracing = createPluginWrapper(TracingPlugin);
    const container = pipe(createContainer(createTestGraph(), { name: "Test" }), withTracing);

    // Should work without errors
    container.resolve(TestPort);
    expect(container[TRACING]).toBeDefined();
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

    const withTracing = createPluginWrapper(TracingPlugin);
    const container = pipe(createContainer(createTestGraph(), { name: "Test" }), withTracing);

    // API should be frozen
    expect(Object.isFrozen(container[TRACING])).toBe(true);
  });
});
