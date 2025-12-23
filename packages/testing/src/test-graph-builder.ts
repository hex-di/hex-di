/**
 * TestGraphBuilder - Immutable builder for creating test graphs with adapter overrides.
 *
 * This module provides the TestGraphBuilder class which wraps a production Graph
 * and allows adapters to be overridden for testing purposes. It follows the same
 * immutability pattern as GraphBuilder from @hex-di/graph.
 *
 * @packageDocumentation
 */

import type { Port, InferPortName } from "@hex-di/ports";
import type { Graph, Adapter, Lifetime } from "@hex-di/graph";

// =============================================================================
// Brand Symbol
// =============================================================================

/**
 * Unique symbol used for nominal typing of TestGraphBuilder types at the type level.
 *
 * This symbol is declared but never assigned a runtime value.
 * It exists purely at the type level to enable nominal typing.
 *
 * @internal
 */
declare const __testGraphBuilderBrand: unique symbol;

/**
 * Runtime symbol used as a property key for TestGraphBuilder branding.
 * This ensures TestGraphBuilder instances are structurally distinct.
 *
 * @internal
 */
const TEST_GRAPH_BUILDER_BRAND = Symbol("TestGraphBuilder");

// =============================================================================
// Type Utilities
// =============================================================================

/**
 * Extracts the port name from an Adapter type.
 *
 * @internal
 */
type _AdapterPortName<
  A extends Adapter<Port<unknown, string>, Port<unknown, string> | never, Lifetime>,
> =
  A extends Adapter<infer P, infer _R, infer _L>
    ? P extends Port<unknown, string>
      ? InferPortName<P>
      : never
    : never;

/**
 * Type constraint for override adapters - must provide a port that exists in TProvides.
 *
 * @internal
 */
type _ValidOverrideAdapter<
  TProvides extends Port<unknown, string>,
  A extends Adapter<Port<unknown, string>, Port<unknown, string> | never, Lifetime>,
> = A extends Adapter<infer P, infer _R, infer _L> ? (P extends TProvides ? A : never) : never;

// =============================================================================
// TestGraphBuilder Class
// =============================================================================

/**
 * An immutable builder for creating test graphs with adapter overrides.
 *
 * TestGraphBuilder wraps a production Graph and allows specific adapters to be
 * replaced with test doubles (mocks, stubs, spies) while preserving the rest
 * of the graph structure. Each `.override()` call returns a NEW builder instance,
 * following the same immutability pattern as GraphBuilder.
 *
 * @typeParam TProvides - Union of Port types provided by the original graph
 * @typeParam TAsyncPorts - Union of Port types that have async factories
 *
 * @remarks
 * - TestGraphBuilder instances are immutable - each `override()` returns a new instance
 * - Use the static `TestGraphBuilder.from(graph)` method to create builders
 * - The constructor is private to enforce the factory pattern
 * - Override adapters replace original adapters by matching on port name
 *
 * @example Basic usage
 * ```typescript
 * import { TestGraphBuilder } from '@hex-di/testing';
 * import { createAdapter } from '@hex-di/graph';
 * import { productionGraph } from '../src/graph';
 * import { LoggerPort } from '../src/ports';
 *
 * // Create a mock adapter
 * const mockLoggerAdapter = createAdapter({
 *   provides: LoggerPort,
 *   requires: [],
 *   lifetime: 'transient',
 *   factory: () => ({ log: vi.fn() }),
 * });
 *
 * // Create test graph with mock
 * const testGraph = TestGraphBuilder.from(productionGraph)
 *   .override(mockLoggerAdapter)
 *   .build();
 * ```
 *
 * @example Multiple overrides
 * ```typescript
 * const testGraph = TestGraphBuilder.from(productionGraph)
 *   .override(mockLoggerAdapter)
 *   .override(mockDatabaseAdapter)
 *   .override(mockCacheAdapter)
 *   .build();
 * ```
 *
 * @see {@link Graph} - The graph type from @hex-di/graph
 * @see {@link InferTestGraphProvides} - Type utility to extract TProvides from TestGraphBuilder
 */
export class TestGraphBuilder<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> | never = never,
> {
  /**
   * Type-level brand property for nominal typing.
   * Ensures TestGraphBuilder types with different type parameters are distinct.
   *
   * @internal
   */
  declare private readonly [__testGraphBuilderBrand]: [TProvides, TAsyncPorts];

  /**
   * Runtime brand marker for TestGraphBuilder instances.
   *
   * @internal
   */
  private readonly [TEST_GRAPH_BUILDER_BRAND] = true as const;

  /**
   * The original graph being wrapped.
   *
   * @internal
   */
  private readonly originalGraph: Graph<TProvides, TAsyncPorts>;

  /**
   * Map of port names to override adapters.
   * Uses a ReadonlyMap for immutability.
   *
   * @internal
   */
  private readonly overrides: ReadonlyMap<
    string,
    Adapter<Port<unknown, string>, Port<unknown, string> | never, Lifetime>
  >;

  /**
   * Private constructor to enforce factory method pattern.
   *
   * Use `TestGraphBuilder.from(graph)` to create new builder instances.
   *
   * @param originalGraph - The original graph to wrap
   * @param overrides - Map of port names to override adapters
   *
   * @internal
   */
  private constructor(
    originalGraph: Graph<TProvides, TAsyncPorts>,
    overrides: ReadonlyMap<
      string,
      Adapter<Port<unknown, string>, Port<unknown, string> | never, Lifetime>
    >
  ) {
    this.originalGraph = originalGraph;
    this.overrides = overrides;
    Object.freeze(this);
  }

  /**
   * Creates a new TestGraphBuilder from an existing Graph.
   *
   * This is the entry point for creating test graphs with overrides.
   * The returned builder wraps the original graph and allows adapters
   * to be selectively replaced.
   *
   * @typeParam T - The TProvides type of the input graph
   * @typeParam TAsync - The TAsyncPorts type of the input graph
   *
   * @param graph - The built Graph to wrap (typically a production graph)
   *
   * @returns A new frozen TestGraphBuilder instance
   *
   * @example
   * ```typescript
   * const testBuilder = TestGraphBuilder.from(productionGraph);
   * ```
   */
  static from<
    T extends Port<unknown, string>,
    TAsync extends Port<unknown, string> | never = never,
  >(graph: Graph<T, TAsync>): TestGraphBuilder<T, TAsync> {
    return new TestGraphBuilder(graph, new Map());
  }

  /**
   * Creates a new builder with the specified adapter override.
   *
   * This method is immutable - it returns a NEW TestGraphBuilder instance
   * with the override added. The original builder remains unchanged.
   *
   * When `.build()` is called, the override adapter will replace any
   * existing adapter that provides the same port.
   *
   * @typeParam A - The adapter type being used as override
   *
   * @param adapter - The adapter to use as an override
   *
   * @returns A new TestGraphBuilder with the override registered
   *
   * @remarks
   * - If the same port is overridden multiple times, the last override wins
   * - Override adapters can have different lifetimes than the originals
   * - Override adapters can have different or no dependencies
   *
   * @example Single override
   * ```typescript
   * const withMockLogger = testBuilder.override(mockLoggerAdapter);
   * ```
   *
   * @example Chained overrides
   * ```typescript
   * const testGraph = testBuilder
   *   .override(mockLoggerAdapter)
   *   .override(mockDatabaseAdapter)
   *   .build();
   * ```
   */
  override<A extends Adapter<TProvides, Port<unknown, string> | never, Lifetime>>(
    adapter: A
  ): TestGraphBuilder<TProvides, TAsyncPorts> {
    // Extract port name from the adapter's provides property
    const portName = adapter.provides.__portName;

    // Create new map with the override
    const newOverrides = new Map(this.overrides);
    newOverrides.set(portName, adapter);

    return new TestGraphBuilder(this.originalGraph, newOverrides);
  }

  /**
   * Builds the test graph with all overrides applied.
   *
   * Creates a new Graph where original adapters are replaced by their
   * overrides (if any). Adapters without overrides are preserved unchanged.
   *
   * @returns A frozen Graph with overridden adapters
   *
   * @remarks
   * - The returned graph is frozen for immutability
   * - Can be called multiple times on the same builder
   * - The returned graph is compatible with `createContainer()`
   *
   * @example
   * ```typescript
   * const testGraph = testBuilder
   *   .override(mockLoggerAdapter)
   *   .build();
   *
   * const container = createContainer(testGraph);
   * ```
   */
  build(): Graph<TProvides, TAsyncPorts> {
    // Build the adapters array by applying overrides
    const adapters = this.originalGraph.adapters.map(adapter => {
      const portName = adapter.provides.__portName;
      const override = this.overrides.get(portName);
      return override ?? adapter;
    });

    // Omit __provides entirely - it's a phantom type property that only exists at the type level.
    // With exactOptionalPropertyTypes, we cannot set it to undefined.
    return Object.freeze({
      adapters: Object.freeze(adapters),
    }) as Graph<TProvides, TAsyncPorts>;
  }
}

// =============================================================================
// Type Inference Utilities
// =============================================================================

/**
 * Extracts the TProvides type parameter from a TestGraphBuilder type.
 *
 * This utility type is useful when you need to infer what ports a
 * TestGraphBuilder can provide, for example when creating utility
 * functions that work with TestGraphBuilder instances.
 *
 * @typeParam T - The TestGraphBuilder type to extract from
 *
 * @returns The TProvides union type, or `never` if T is not a TestGraphBuilder
 *
 * @example
 * ```typescript
 * const testBuilder = TestGraphBuilder.from(productionGraph);
 *
 * type Provided = InferTestGraphProvides<typeof testBuilder>;
 * // typeof LoggerPort | typeof DatabasePort | typeof UserServicePort
 * ```
 */
export type InferTestGraphProvides<T> =
  T extends TestGraphBuilder<infer TProvides, infer _TAsyncPorts> ? TProvides : never;

/**
 * Extracts the TAsyncPorts type parameter from a TestGraphBuilder type.
 *
 * This utility type is useful when you need to infer which ports have
 * async factories in a TestGraphBuilder.
 *
 * @typeParam T - The TestGraphBuilder type to extract from
 *
 * @returns The TAsyncPorts union type, or `never` if T is not a TestGraphBuilder
 *
 * @example
 * ```typescript
 * const testBuilder = TestGraphBuilder.from(productionGraph);
 *
 * type AsyncPorts = InferTestGraphAsyncPorts<typeof testBuilder>;
 * // typeof ConfigPort | typeof DatabasePort (if they have async factories)
 * ```
 */
export type InferTestGraphAsyncPorts<T> =
  T extends TestGraphBuilder<infer _TProvides, infer TAsyncPorts> ? TAsyncPorts : never;
