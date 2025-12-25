/**
 * Type-level tests for the Plugin System.
 *
 * These tests verify that:
 * 1. definePlugin correctly infers plugin types
 * 2. requires/optionallyRequires create correct dependency types
 * 3. PluginContext provides type-safe dependency access
 * 4. ValidatePluginOrder catches dependency ordering errors at compile time
 * 5. PluginAugmentedContainer adds correct plugin API types
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import {
  definePlugin,
  requires,
  optionallyRequires,
  type PluginDependency,
  type PluginContext,
  type InferPluginSymbol,
  type InferPluginApi,
  type InferPluginRequires,
  type InferPluginEnhancedBy,
  type ValidatePluginOrder,
  type PluginApiMap,
} from "../src/plugin/index.js";

// =============================================================================
// Test Fixtures: API Interfaces
// =============================================================================

interface TracingAPI {
  getTraces(): Array<{ id: string; name: string }>;
  startSpan(name: string): { end(): void };
}

interface MetricsAPI {
  recordMetric(name: string, value: number): void;
  getMetrics(): Array<{ name: string; value: number }>;
}

interface DevToolsAPI {
  openPanel(): void;
  getState(): { traces: unknown[]; metrics: unknown[] };
}

interface LoggerAPI {
  log(message: string): void;
  error(message: string): void;
}

// =============================================================================
// Test Fixtures: Plugin Symbols
// =============================================================================

const TRACING = Symbol.for("hex-di/tracing");
const METRICS = Symbol.for("hex-di/metrics");
const DEVTOOLS = Symbol.for("hex-di/devtools");
const LOGGER = Symbol.for("hex-di/logger");

// =============================================================================
// Test Fixtures: Plugins
// =============================================================================

const TracingPlugin = definePlugin({
  name: "tracing",
  symbol: TRACING,
  requires: [] as const,
  enhancedBy: [] as const,
  createApi(_context): TracingAPI {
    return {
      getTraces: () => [],
      startSpan: (name: string) => ({ end: () => console.log(`End ${name}`) }),
    };
  },
});

const MetricsPlugin = definePlugin({
  name: "metrics",
  symbol: METRICS,
  requires: [] as const,
  enhancedBy: [] as const,
  createApi(_context): MetricsAPI {
    return {
      recordMetric: (_name: string, _value: number) => {},
      getMetrics: () => [],
    };
  },
});

const LoggerPlugin = definePlugin({
  name: "logger",
  symbol: LOGGER,
  requires: [] as const,
  enhancedBy: [] as const,
  createApi(_context): LoggerAPI {
    return {
      log: (_msg: string) => {},
      error: (_msg: string) => {},
    };
  },
});

const DevToolsPlugin = definePlugin({
  name: "devtools",
  symbol: DEVTOOLS,
  requires: [
    requires<typeof TRACING, TracingAPI>({
      symbol: TRACING,
      name: "Tracing",
      reason: "DevTools visualizes traces",
    }),
    requires<typeof METRICS, MetricsAPI>({
      symbol: METRICS,
      name: "Metrics",
      reason: "DevTools displays metrics",
    }),
  ] as const,
  enhancedBy: [
    optionallyRequires<typeof LOGGER, LoggerAPI>({
      symbol: LOGGER,
      name: "Logger",
      reason: "Enhanced logging when available",
    }),
  ] as const,
  createApi(context): DevToolsAPI {
    const tracing = context.getDependency(TRACING);
    const metrics = context.getDependency(METRICS);
    const logger = context.getOptionalDependency(LOGGER);

    return {
      openPanel() {
        if (logger) logger.log("Opening panel");
        console.log("Traces:", tracing.getTraces());
      },
      getState() {
        return { traces: tracing.getTraces(), metrics: metrics.getMetrics() };
      },
    };
  },
});

// Mark plugin values as intentionally unused (only types are tested)
void TracingPlugin;
void MetricsPlugin;
void LoggerPlugin;
void DevToolsPlugin;

// =============================================================================
// Tests: Plugin Type Inference
// =============================================================================

describe("Plugin type inference", () => {
  it("should infer symbol type from plugin", () => {
    type Symbol = InferPluginSymbol<typeof TracingPlugin>;
    expectTypeOf<Symbol>().toEqualTypeOf<typeof TRACING>();
  });

  it("should infer API type from plugin", () => {
    type API = InferPluginApi<typeof TracingPlugin>;
    expectTypeOf<API>().toEqualTypeOf<TracingAPI>();
  });

  it("should infer requires from plugin", () => {
    type Requires = InferPluginRequires<typeof DevToolsPlugin>;
    expectTypeOf<Requires>().toMatchTypeOf<
      readonly [
        PluginDependency<typeof TRACING, TracingAPI, false>,
        PluginDependency<typeof METRICS, MetricsAPI, false>,
      ]
    >();
  });

  it("should infer enhancedBy from plugin", () => {
    type EnhancedBy = InferPluginEnhancedBy<typeof DevToolsPlugin>;
    expectTypeOf<EnhancedBy>().toMatchTypeOf<
      readonly [PluginDependency<typeof LOGGER, LoggerAPI, true>]
    >();
  });

  it("should infer empty requires for independent plugins", () => {
    type Requires = InferPluginRequires<typeof TracingPlugin>;
    expectTypeOf<Requires>().toEqualTypeOf<readonly []>();
  });
});

// =============================================================================
// Tests: Dependency Declaration
// =============================================================================

describe("Dependency declaration", () => {
  it("requires() should create required dependency descriptor", () => {
    const dep = requires<typeof TRACING, TracingAPI>({
      symbol: TRACING,
      name: "Tracing",
      reason: "Test reason",
    });

    expectTypeOf(dep).toMatchTypeOf<PluginDependency<typeof TRACING, TracingAPI, false>>();
    expectTypeOf(dep.optional).toEqualTypeOf<false>();
  });

  it("optionallyRequires() should create optional dependency descriptor", () => {
    const dep = optionallyRequires<typeof LOGGER, LoggerAPI>({
      symbol: LOGGER,
      name: "Logger",
      reason: "Test reason",
    });

    expectTypeOf(dep).toMatchTypeOf<PluginDependency<typeof LOGGER, LoggerAPI, true>>();
    expectTypeOf(dep.optional).toEqualTypeOf<true>();
  });
});

// =============================================================================
// Tests: PluginContext Type Safety
// =============================================================================

describe("PluginContext type safety", () => {
  it("getDependency should return correct API type for required deps", () => {
    type DevToolsRequires = InferPluginRequires<typeof DevToolsPlugin>;
    type DevToolsEnhancedBy = InferPluginEnhancedBy<typeof DevToolsPlugin>;
    type Context = PluginContext<DevToolsRequires, DevToolsEnhancedBy>;

    const _testFn = (ctx: Context) => {
      const tracing = ctx.getDependency(TRACING);
      expectTypeOf(tracing).toEqualTypeOf<TracingAPI>();

      const metrics = ctx.getDependency(METRICS);
      expectTypeOf(metrics).toEqualTypeOf<MetricsAPI>();
    };
    void _testFn;
  });

  it("getOptionalDependency should return API | undefined for optional deps", () => {
    type DevToolsRequires = InferPluginRequires<typeof DevToolsPlugin>;
    type DevToolsEnhancedBy = InferPluginEnhancedBy<typeof DevToolsPlugin>;
    type Context = PluginContext<DevToolsRequires, DevToolsEnhancedBy>;

    const _testFn = (ctx: Context) => {
      const logger = ctx.getOptionalDependency(LOGGER);
      expectTypeOf(logger).toEqualTypeOf<LoggerAPI | undefined>();
    };
    void _testFn;
  });
});

// =============================================================================
// Tests: Plugin Order Validation
// =============================================================================

describe("ValidatePluginOrder", () => {
  it("should return true for valid plugin ordering (deps before dependents)", () => {
    type Result = ValidatePluginOrder<
      readonly [typeof TracingPlugin, typeof MetricsPlugin, typeof DevToolsPlugin]
    >;

    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("should return true for plugins with no dependencies in any order", () => {
    type Result = ValidatePluginOrder<
      readonly [typeof MetricsPlugin, typeof TracingPlugin, typeof LoggerPlugin]
    >;

    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("should return true for single plugin with no dependencies", () => {
    type Result = ValidatePluginOrder<readonly [typeof TracingPlugin]>;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("should return true for empty plugin array", () => {
    type Result = ValidatePluginOrder<readonly []>;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("should return error type for invalid ordering (dependent before dependency)", () => {
    type Result = ValidatePluginOrder<readonly [typeof DevToolsPlugin, typeof TracingPlugin]>;

    // Should be a MissingPluginDependencyError, not true
    expectTypeOf<Result>().toHaveProperty("__errorBrand");
    expectTypeOf<Result>().toMatchTypeOf<{
      readonly __errorBrand: "MissingPluginDependencyError";
    }>();
  });

  it("should return error when only some dependencies are satisfied", () => {
    // DevToolsPlugin needs both TRACING and METRICS
    // Only TracingPlugin is provided before it
    type Result = ValidatePluginOrder<readonly [typeof TracingPlugin, typeof DevToolsPlugin]>;

    // Should be an error because METRICS is missing
    expectTypeOf<Result>().toHaveProperty("__errorBrand");
  });
});

// =============================================================================
// Tests: Plugin API Map
// =============================================================================

describe("PluginApiMap", () => {
  it("should map plugins to symbol -> API intersection", () => {
    type Map = PluginApiMap<readonly [typeof TracingPlugin, typeof MetricsPlugin]>;

    // Should have both plugin APIs accessible via symbols
    expectTypeOf<Map>().toHaveProperty(TRACING);
    expectTypeOf<Map>().toHaveProperty(METRICS);
  });

  it("should return empty record for empty plugin array", () => {
    type Map = PluginApiMap<readonly []>;
    // Returns Record<symbol, never> to avoid ESLint's no-empty-object-type rule
    expectTypeOf<Map>().toEqualTypeOf<Record<symbol, never>>();
  });
});

// =============================================================================
// Tests: Complex Dependency Chains
// =============================================================================

describe("Complex plugin dependency chains", () => {
  interface DebuggerAPI {
    debug(): void;
  }

  const DEBUGGER = Symbol.for("hex-di/debugger");

  const DebuggerPlugin = definePlugin({
    name: "debugger",
    symbol: DEBUGGER,
    requires: [
      requires<typeof DEVTOOLS, DevToolsAPI>({
        symbol: DEVTOOLS,
        name: "DevTools",
        reason: "Debugger uses DevTools",
      }),
      requires<typeof LOGGER, LoggerAPI>({
        symbol: LOGGER,
        name: "Logger",
        reason: "Debugger logs events",
      }),
    ] as const,
    enhancedBy: [] as const,
    createApi(context): DebuggerAPI {
      const devtools = context.getDependency(DEVTOOLS);
      const logger = context.getDependency(LOGGER);

      return {
        debug() {
          logger.log("Debug state:");
          console.log(devtools.getState());
        },
      };
    },
  });
  void DebuggerPlugin;

  it("should validate transitive dependencies", () => {
    // Full valid chain: Logger, Tracing, Metrics, DevTools, Debugger
    type Result = ValidatePluginOrder<
      readonly [
        typeof LoggerPlugin,
        typeof TracingPlugin,
        typeof MetricsPlugin,
        typeof DevToolsPlugin,
        typeof DebuggerPlugin,
      ]
    >;

    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("should reject when transitive dependency is missing", () => {
    // Missing TracingPlugin - DevToolsPlugin will fail
    type Result = ValidatePluginOrder<
      readonly [
        typeof LoggerPlugin,
        typeof MetricsPlugin,
        typeof DevToolsPlugin, // Fails here - TRACING not available
        typeof DebuggerPlugin,
      ]
    >;

    expectTypeOf<Result>().toHaveProperty("__errorBrand");
  });
});

// =============================================================================
// Tests: Plugin Type Structure
// =============================================================================

describe("Plugin type structure", () => {
  it("should have correct type for Plugin with dependencies", () => {
    type DevToolsType = typeof DevToolsPlugin;

    expectTypeOf<DevToolsType["symbol"]>().toEqualTypeOf<typeof DEVTOOLS>();
    // name is string (not literal) since definePlugin doesn't use const type parameter for name
    expectTypeOf<DevToolsType["name"]>().toEqualTypeOf<string>();

    // Verify createApi return type matches DevToolsAPI
    type CreateApiReturn = ReturnType<DevToolsType["createApi"]>;
    expectTypeOf<CreateApiReturn>().toEqualTypeOf<DevToolsAPI>();
  });

  it("should have correct type for Plugin without dependencies", () => {
    type TracingType = typeof TracingPlugin;

    expectTypeOf<TracingType["symbol"]>().toEqualTypeOf<typeof TRACING>();
    expectTypeOf<TracingType["requires"]>().toEqualTypeOf<readonly []>();
    expectTypeOf<TracingType["enhancedBy"]>().toEqualTypeOf<readonly []>();

    // Verify createApi return type matches TracingAPI
    type CreateApiReturn = ReturnType<TracingType["createApi"]>;
    expectTypeOf<CreateApiReturn>().toEqualTypeOf<TracingAPI>();
  });
});
