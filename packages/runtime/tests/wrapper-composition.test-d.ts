/**
 * Type-level tests for the Plugin Wrapper Pattern.
 *
 * These tests verify that:
 * 1. PluginWrapper correctly types the enhanced container
 * 2. pipe() accumulates plugin types through composition
 * 3. compose2/3/4/5 return reusable enhancers with correct types
 * 4. WithPlugin type helper works correctly
 * 5. Object.assign intersection pattern preserves container type
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import {
  definePlugin,
  type PluginWrapper,
  type WithPlugin,
  type EnhanceableContainer,
  createPluginWrapper,
  pipe,
  compose2,
  compose3,
  INTERNAL_ACCESS,
} from "../src/index.js";

// =============================================================================
// Test Fixtures: API Interfaces
// =============================================================================

interface InspectorAPI {
  getSnapshot(): { kind: string };
  subscribe(listener: () => void): () => void;
}

interface TracingAPI {
  getTraces(): Array<{ id: string }>;
  startSpan(name: string): { end(): void };
}

interface MetricsAPI {
  recordMetric(name: string, value: number): void;
  getStats(): { total: number };
}

// =============================================================================
// Test Fixtures: Plugin Symbols
// =============================================================================

const INSPECTOR = Symbol.for("test/inspector");
const TRACING = Symbol.for("test/tracing");
const METRICS = Symbol.for("test/metrics");

// =============================================================================
// Test Fixtures: Plugins
// =============================================================================

const InspectorPlugin = definePlugin({
  name: "inspector",
  symbol: INSPECTOR,
  requires: [] as const,
  enhancedBy: [] as const,
  createApi(): InspectorAPI {
    return {
      getSnapshot: () => ({ kind: "root" }),
      subscribe: () => () => {},
    };
  },
});

const TracingPlugin = definePlugin({
  name: "tracing",
  symbol: TRACING,
  requires: [] as const,
  enhancedBy: [] as const,
  createApi(): TracingAPI {
    return {
      getTraces: () => [],
      startSpan: name => ({ end: () => console.log(name) }),
    };
  },
});

const MetricsPlugin = definePlugin({
  name: "metrics",
  symbol: METRICS,
  requires: [] as const,
  enhancedBy: [] as const,
  createApi(): MetricsAPI {
    return {
      recordMetric: () => {},
      getStats: () => ({ total: 0 }),
    };
  },
});

// =============================================================================
// Test Fixtures: Wrappers
// =============================================================================

const withInspector = createPluginWrapper(InspectorPlugin);
const withTracing = createPluginWrapper(TracingPlugin);
const withMetrics = createPluginWrapper(MetricsPlugin);

// =============================================================================
// Mock Base Container (for type testing)
// =============================================================================

interface MockContainer extends EnhanceableContainer {
  readonly resolve: (port: unknown) => unknown;
  readonly dispose: () => Promise<void>;
}

declare const mockContainer: MockContainer;

// =============================================================================
// Tests: PluginWrapper Type
// =============================================================================

describe("PluginWrapper Type", () => {
  it("should type wrapper return as intersection", () => {
    type Result = ReturnType<typeof withInspector<MockContainer>>;

    expectTypeOf<Result>().toMatchTypeOf<MockContainer>();
    expectTypeOf<Result>().toMatchTypeOf<{
      readonly [INSPECTOR]: InspectorAPI;
    }>();
  });

  it("should preserve base container type", () => {
    const enhanced = withInspector(mockContainer);

    // Base container methods are preserved
    expectTypeOf(enhanced.resolve).toEqualTypeOf<(port: unknown) => unknown>();
    expectTypeOf(enhanced.dispose).toEqualTypeOf<() => Promise<void>>();

    // Plugin API is added
    expectTypeOf(enhanced[INSPECTOR]).toEqualTypeOf<InspectorAPI>();
  });
});

// =============================================================================
// Tests: pipe() Composition
// =============================================================================

describe("pipe() Composition", () => {
  it("should return container unchanged when no wrappers", () => {
    const result = pipe(mockContainer);
    expectTypeOf(result).toEqualTypeOf<MockContainer>();
  });

  it("should add single plugin API with one wrapper", () => {
    const result = pipe(mockContainer, withInspector);

    expectTypeOf(result[INSPECTOR]).toEqualTypeOf<InspectorAPI>();
    expectTypeOf(result.resolve).toEqualTypeOf<(port: unknown) => unknown>();
  });

  it("should accumulate plugin APIs with two wrappers", () => {
    const result = pipe(mockContainer, withInspector, withTracing);

    expectTypeOf(result[INSPECTOR]).toEqualTypeOf<InspectorAPI>();
    expectTypeOf(result[TRACING]).toEqualTypeOf<TracingAPI>();
    expectTypeOf(result.resolve).toEqualTypeOf<(port: unknown) => unknown>();
  });

  it("should accumulate plugin APIs with three wrappers", () => {
    const result = pipe(mockContainer, withInspector, withTracing, withMetrics);

    expectTypeOf(result[INSPECTOR]).toEqualTypeOf<InspectorAPI>();
    expectTypeOf(result[TRACING]).toEqualTypeOf<TracingAPI>();
    expectTypeOf(result[METRICS]).toEqualTypeOf<MetricsAPI>();
  });
});

// =============================================================================
// Tests: compose() Reusable Enhancers
// =============================================================================

describe("compose() Reusable Enhancers", () => {
  it("compose2 should create reusable two-plugin enhancer", () => {
    const withDevTools = compose2(withInspector, withTracing);

    // Apply to container
    const result = withDevTools(mockContainer);

    expectTypeOf(result[INSPECTOR]).toEqualTypeOf<InspectorAPI>();
    expectTypeOf(result[TRACING]).toEqualTypeOf<TracingAPI>();
    expectTypeOf(result.resolve).toEqualTypeOf<(port: unknown) => unknown>();
  });

  it("compose3 should create reusable three-plugin enhancer", () => {
    const withFullDevTools = compose3(withInspector, withTracing, withMetrics);

    const result = withFullDevTools(mockContainer);

    expectTypeOf(result[INSPECTOR]).toEqualTypeOf<InspectorAPI>();
    expectTypeOf(result[TRACING]).toEqualTypeOf<TracingAPI>();
    expectTypeOf(result[METRICS]).toEqualTypeOf<MetricsAPI>();
  });
});

// =============================================================================
// Tests: WithPlugin Type Helper
// =============================================================================

describe("WithPlugin Type Helper", () => {
  it("should create intersection type", () => {
    type Enhanced = WithPlugin<MockContainer, typeof INSPECTOR, InspectorAPI>;

    expectTypeOf<Enhanced>().toMatchTypeOf<MockContainer>();
    expectTypeOf<Enhanced>().toMatchTypeOf<{
      readonly [INSPECTOR]: InspectorAPI;
    }>();
  });

  it("should support nested WithPlugin", () => {
    type Step1 = WithPlugin<MockContainer, typeof INSPECTOR, InspectorAPI>;
    type Step2 = WithPlugin<Step1, typeof TRACING, TracingAPI>;

    expectTypeOf<Step2>().toMatchTypeOf<MockContainer>();
    expectTypeOf<Step2>().toMatchTypeOf<{
      readonly [INSPECTOR]: InspectorAPI;
    }>();
    expectTypeOf<Step2>().toMatchTypeOf<{ readonly [TRACING]: TracingAPI }>();
  });
});

// =============================================================================
// Tests: Type Safety
// =============================================================================

describe("Type Safety", () => {
  it("should not allow accessing non-existent plugin API", () => {
    const enhanced = pipe(mockContainer, withInspector);

    // @ts-expect-error TRACING was not added
    enhanced[TRACING];
  });

  it("should enforce EnhanceableContainer constraint", () => {
    // @ts-expect-error plain object doesn't satisfy EnhanceableContainer
    pipe({});

    // @ts-expect-error missing INTERNAL_ACCESS
    pipe({ resolve: () => {} });
  });
});
