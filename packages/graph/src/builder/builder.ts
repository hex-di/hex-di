/**
 * GraphBuilder - Immutable Fluent Builder with Compile-Time Validation.
 *
 * This module implements the core GraphBuilder class which accumulates adapters
 * and performs compile-time validation using advanced TypeScript patterns.
 *
 * ## Design Pattern: Type-State Machine
 *
 * GraphBuilder uses phantom type parameters to track state at the type level:
 * - `TProvides`: Union of all ports that have adapters
 * - `TRequires`: Union of all ports that are required by adapters
 * - `TAsyncPorts`: Union of ports with async factories
 * - `TDepGraph`: Type-level adjacency map for cycle detection
 * - `TLifetimeMap`: Type-level port→lifetime map for captive detection
 *
 * These type parameters change with each `.provide()` call, enabling
 * compile-time validation while the runtime implementation is trivial.
 *
 * ## Module Structure
 *
 * This module delegates runtime operations to focused helper modules:
 * - `builder-types.ts`: Brand symbols and structural interfaces
 * - `builder-provide.ts`: Adapter registration functions
 * - `builder-merge.ts`: Graph merge functions
 * - `builder-build.ts`: Build finalization functions
 *
 * @see ../builder-types/index.ts - Type-level validation types
 * @see ../validation/cycle-detection.ts - DFS algorithm for cycles
 * @see ../validation/captive-dependency.ts - Lifetime hierarchy checks
 * @see ../validation/errors.ts - Template literal error types
 * @packageDocumentation
 */

import type { AdapterConstraint } from "@hex-di/core";
import type {
  JoinPortNames,
  UnsatisfiedDependencies,
  DefaultMaxDepth,
  ValidateMaxDepth,
} from "../validation/index.js";
import type { Graph } from "../graph/types/graph-types.js";
import type {
  AnyBuilderInternals,
  BuilderInternals,
  DefaultInternals,
  GetDepGraph,
  GetLifetimeMap,
  GetParentProvides,
  GetMaxDepth,
  GetDepthExceededWarning,
  GetUncheckedUsed,
} from "./types/state.js";
import { inspectGraph, detectCycleAtRuntime } from "../graph/inspection/index.js";
import type {
  GraphInspection,
  GraphSummary,
  InspectOptions,
  ValidationResult,
} from "../graph/types/inspection.js";

// Import all type-level validation types from the dedicated module
import type {
  EmptyDependencyGraph,
  EmptyLifetimeMap,
  ProvideResult,
  ProvideResultAllErrors,
  ProvideManyResult,
  MergeResult,
  OverrideResult,
  PrettyBuilder,
} from "./types/index.js";

// Import brand symbols from shared symbols module
import { GRAPH_BUILDER_BRAND } from "../symbols/index.js";
import type { __graphBuilderBrand, __prettyView, __prettyViewSymbol } from "../symbols/index.js";
// Import structural types from builder-types
import type { BuildableGraphState } from "./builder-types.js";
import { addAdapter, addManyAdapters, addOverrideAdapter } from "./builder-provide.js";
import { mergeGraphs, mergeGraphsWithOptions, type MergeGraphOptions } from "./builder-merge.js";
import { buildGraph, buildGraphFragment, type BuiltGraph } from "./builder-build.js";

// NOTE: Inspection utilities (inspectGraph, inspectionToJSON, detectCycleAtRuntime)
// and their types are exported from graph/inspection/index.ts.
// Visualization utilities (toDotGraph, toMermaidGraph) are in the
// separate @hex-di/visualization package.

// Re-export from builder-types
export { GRAPH_BUILDER_BRAND };
export type { __prettyViewSymbol };

// Re-export type utilities for external use
export type {
  EmptyDependencyGraph,
  EmptyLifetimeMap,
  ProvideResult,
  ProvideResultAllErrors,
  ProvideManyResult,
  MergeResult,
  MergeOptions,
  OverrideResult,
  // Inspection types
  ValidationState,
  InspectValidation,
  SimplifiedView,
  InferBuilderProvides,
  InferBuilderUnsatisfied,
  PrettyBuilder,
  SimplifiedBuilder,
  InspectableBuilder,
  // Summary types for IDE tooltips
  BuilderSummary,
  BuilderStatus,
  IsBuilderComplete,
  BuilderProvides,
  BuilderMissing,
  // Grouped internals types
  AnyBuilderInternals,
  BuilderInternals,
  DefaultInternals,
} from "./types/index.js";

// =============================================================================
// Brand Symbols
// =============================================================================
//
// The phantom brand symbols (__graphBuilderBrand, __prettyView) are now
// imported from builder-types.ts to ensure consistency and avoid duplicate
// declarations. See builder-types.ts for their definitions.

/**
 * Factory interface returned by `GraphBuilder.withMaxDepth<N>()`.
 *
 * Provides `create()` and `forParent()` methods that return GraphBuilders
 * with the specified maximum cycle detection depth.
 *
 * @typeParam TMaxDepth - The maximum cycle detection depth configured for this factory
 * @typeParam TExtendedDepth - Whether depth-exceeded is a warning (true) or error (false)
 */
export interface GraphBuilderFactory<
  TMaxDepth extends number,
  TExtendedDepth extends boolean = false,
> {
  /**
   * Creates a new empty GraphBuilder with custom max depth.
   */
  create(): GraphBuilder<
    never,
    never,
    never,
    never,
    BuilderInternals<EmptyDependencyGraph, EmptyLifetimeMap, unknown, TMaxDepth, TExtendedDepth> &
      AnyBuilderInternals
  >;

  /**
   * Creates a new GraphBuilder for building a child graph with parent-aware validation.
   *
   * @param parent - The parent graph (used only for type inference)
   */
  forParent<TParentProvides, TParentAsync, TParentOverrides>(
    parent: Graph<TParentProvides, TParentAsync, TParentOverrides>
  ): GraphBuilder<
    never,
    never,
    never,
    never,
    BuilderInternals<
      EmptyDependencyGraph,
      EmptyLifetimeMap,
      TParentProvides,
      TMaxDepth,
      TExtendedDepth
    > &
      AnyBuilderInternals
  >;

  /**
   * Extends the depth limit for type-level cycle detection.
   *
   * When depth-exceeded occurs during type-level cycle detection, it will be
   * a WARNING instead of an ERROR.
   */
  withExtendedDepth(): GraphBuilderFactory<TMaxDepth, true>;
}

/**
 * Factory type returned by `GraphBuilder.withExtendedDepth()`.
 *
 * This is equivalent to `GraphBuilderFactory<DefaultMaxDepth, true>`.
 *
 * ## When to Use
 *
 * Use this when your dependency graph legitimately exceeds the type-level depth
 * limit and you accept that compile-time cycle detection may be incomplete.
 * Runtime validation will still catch cycles.
 *
 * ## Combining with Custom Depth
 *
 * To use both custom depth AND extended depth, chain the methods:
 * ```typescript
 * const builder = GraphBuilder.withMaxDepth<100>().withExtendedDepth().create();
 * ```
 *
 * @example
 * ```typescript
 * // Explicitly acknowledge incomplete compile-time validation
 * const builder = GraphBuilder.withExtendedDepth().create();
 * ```
 */
export type ExtendedDepthFactory = GraphBuilderFactory<DefaultMaxDepth, true>;

/**
 * An immutable builder for constructing dependency graphs with compile-time validation.
 *
 * GraphBuilder implements the **Type-State Pattern** - a technique where an object's
 * type changes with each method call, encoding the object's state in its type.
 *
 * ## Phantom Type Parameters
 *
 * The type parameters below exist only at the type level (compile time).
 * They have no runtime representation - the actual GraphBuilder class is
 * just a wrapper around a readonly array of adapters.
 *
 * ## Type Parameter Evolution Table
 *
 * This table shows how each type parameter changes when calling methods:
 *
 * | Method                | TProvides Effect           | TRequires Effect             | TAsyncPorts Effect      | TInternalState Effect                   |
 * |-----------------------|---------------------------|------------------------------|-------------------------|----------------------------------------|
 * | `create()`            | `never`                   | `never`                      | `never`                 | Empty (default)                        |
 * | `provide(adapter)`    | `\| InferProvides<A>`     | `\| InferRequires<A>`        | `\| InferAsync<A>`      | + depGraph edge, + lifetime entry      |
 * | `provideMany(adapters)`| `\| InferManyProvides<As>`| `\| InferManyRequires<As>`  | `\| InferManyAsync<As>` | + all edges, + all lifetimes           |
 * | `merge(other)`        | `\| OtherProvides`        | `\| OtherRequires`           | `\| OtherAsync`         | Merged depGraph, merged lifetimeMap    |
 * | `override(adapter)`   | unchanged                 | unchanged                    | unchanged               | + depGraph edge (replaces parent)      |
 * | `build()`             | unchanged (frozen)        | must be `never`              | unchanged (frozen)      | N/A - returns Graph, not GraphBuilder  |
 *
 * ## Type Parameter Semantics
 *
 * - **TProvides** grows monotonically with each `provide()` - represents "what the graph can provide"
 * - **TRequires** grows initially, then shrinks as dependencies are satisfied - represents "what is still needed"
 * - **TAsyncPorts** tracks ports that need async initialization (for `container.initialize()`)
 * - **TInternalState** carries the dependency graph (for cycle detection) and lifetime map (for captive detection)
 *
 * At `build()` time, `TRequires` must be `never` (all dependencies satisfied) or a compile error occurs.
 *
 * @typeParam TProvides - Union of all port types provided by adapters in this graph
 * @typeParam TRequires - Union of all port types required by adapters in this graph
 * @typeParam TAsyncPorts - Union of all async port types in this graph
 * @typeParam TOverrides - Union of port types that are overrides (not new provides)
 * @typeParam TInternalState - **Internal validation state** - Contains dependency graph, lifetime map, parent info, and max depth.
 */
export class GraphBuilder<
  TProvides = never,
  TRequires = never,
  out TAsyncPorts = never,
  out TOverrides = never,
  TInternalState extends AnyBuilderInternals = DefaultInternals,
> {
  /**
   * Type-level brand property for nominal typing.
   * @internal
   */
  declare private readonly [__graphBuilderBrand]: [
    TProvides,
    TRequires,
    TAsyncPorts,
    TOverrides,
    TInternalState,
  ];

  /**
   * Runtime brand marker for GraphBuilder instances.
   * @runtime Actual runtime value used for instanceof-like checks
   * @internal
   */
  private readonly [GRAPH_BUILDER_BRAND] = true as const;

  // ═══════════════════════════════════════════════════════════════════════════
  // PHANTOM TYPE PROPERTIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Phantom type property tracking provided ports.
   * @phantom No runtime representation - exists only at compile time
   * @internal
   */
  declare readonly __provides: TProvides;

  /**
   * Phantom type property tracking required ports.
   * @phantom No runtime representation - exists only at compile time
   * @internal
   */
  declare readonly __requires: TRequires;

  /**
   * Phantom type property tracking async ports.
   * @phantom No runtime representation - exists only at compile time
   * @internal
   */
  declare readonly __asyncPorts: TAsyncPorts;

  /**
   * Phantom type property for compile-time dependency graph.
   * @phantom No runtime representation - exists only at compile time
   * @internal
   */
  declare readonly __depGraph: GetDepGraph<TInternalState>;

  /**
   * Phantom type property for compile-time lifetime map.
   * @phantom No runtime representation - exists only at compile time
   * @internal
   */
  declare readonly __lifetimeMap: GetLifetimeMap<TInternalState>;

  /**
   * Phantom type property for compile-time override tracking.
   * @phantom No runtime representation - exists only at compile time
   * @internal
   */
  declare readonly __overrides: TOverrides;

  /**
   * Phantom type property for internal state (dep graph, lifetime map, etc.).
   * @phantom No runtime representation - exists only at compile time
   * @internal
   */
  declare readonly __internalState: TInternalState;

  /**
   * Phantom type property for compile-time parent graph tracking.
   * @phantom No runtime representation - exists only at compile time
   * @internal
   */
  declare readonly __parentProvides: GetParentProvides<TInternalState>;

  /**
   * Phantom type property for compile-time cycle detection depth limit.
   * @phantom No runtime representation - exists only at compile time
   * @internal
   */
  declare readonly __maxDepth: GetMaxDepth<TInternalState>;

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC PHANTOM SHORTCUTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Phantom property exposing the provided ports union.
   * @phantom No runtime representation - use for type extraction only
   * @example
   * ```typescript
   * type Provided = typeof myGraph.$provides; // "PortA" | "PortB"
   * ```
   */
  declare readonly $provides: TProvides;

  /**
   * Phantom property exposing unsatisfied dependencies.
   * @phantom No runtime representation - use for type extraction only
   * @example
   * ```typescript
   * type Missing = typeof myGraph.$unsatisfied; // "PortC" | "PortD"
   * ```
   */
  declare readonly $unsatisfied: UnsatisfiedDependencies<TProvides, TRequires>;

  /**
   * Phantom property exposing depth-exceeded warnings.
   *
   * When `withExtendedDepth()` is enabled and depth limit is exceeded
   * during cycle detection, this property exposes the affected port names.
   * Useful for tooling and IDE integration to detect incomplete validation.
   *
   * - Returns `never` when no depth warnings occurred
   * - Returns port name(s) when depth limit was exceeded
   *
   * @phantom No runtime representation - use for type extraction only
   * @example
   * ```typescript
   * const graph = GraphBuilder.withMaxDepth<2>()
   *   .withExtendedDepth()
   *   .create()
   *   .provide(...)
   *   .provide(...);
   *
   * type Warnings = typeof graph.$depthWarnings; // "PortName" | never
   * ```
   */
  declare readonly $depthWarnings: GetDepthExceededWarning<TInternalState>;

  /**
   * IDE tooltip helper - shows simplified view of the graph state.
   * @phantom No runtime representation - hover over in IDE for debugging
   */
  declare readonly [__prettyView]: PrettyBuilder<this>;

  /**
   * The readonly array of registered adapters.
   * @runtime Actual runtime value containing adapter configurations
   */
  readonly adapters: readonly AdapterConstraint[];

  /**
   * The set of port names marked as overrides.
   * @runtime Actual runtime value tracking which ports are overrides
   */
  readonly overridePortNames: ReadonlySet<string>;

  /**
   * Private constructor to enforce factory method pattern.
   * @internal
   */
  private constructor(
    adapters: readonly AdapterConstraint[],
    overridePortNames: ReadonlySet<string> = new Set()
  ) {
    this.adapters = Object.freeze([...adapters]);
    this.overridePortNames = overridePortNames;
    Object.freeze(this);
  }

  /**
   * Internal factory for creating new instances from state.
   * Used by methods that delegate to standalone functions.
   * @internal
   */
  private static fromState<
    TProvides,
    TRequires,
    TAsyncPorts,
    TOverrides,
    TInternals extends AnyBuilderInternals,
  >(
    state: BuildableGraphState
  ): GraphBuilder<TProvides, TRequires, TAsyncPorts, TOverrides, TInternals> {
    return new GraphBuilder(state.adapters, state.overridePortNames);
  }

  // =============================================================================
  // Static Factory Methods
  // =============================================================================

  /**
   * Creates a new empty GraphBuilder.
   *
   * @pure Returns new GraphBuilder instance; no side effects.
   */
  static create(): GraphBuilder<never, never, never, never, DefaultInternals> {
    return new GraphBuilder([], new Set());
  }

  /**
   * Creates a factory for building graphs with a custom cycle detection depth.
   *
   * @example
   * ```typescript
   * const builder = GraphBuilder.withMaxDepth<50>().create();
   * ```
   *
   * @pure Returns new factory; no side effects.
   * @typeParam TDepth - The maximum cycle detection depth (1-100)
   */
  static withMaxDepth<TDepth extends number>(): ValidateMaxDepth<TDepth> extends TDepth
    ? GraphBuilderFactory<TDepth>
    : ValidateMaxDepth<TDepth>;
  static withMaxDepth<TDepth extends number>(): GraphBuilderFactory<TDepth> | string {
    const createFactory = <TExtended extends boolean>(): GraphBuilderFactory<
      TDepth,
      TExtended
    > => ({
      create: () => new GraphBuilder([], new Set()),
      forParent: () => new GraphBuilder([], new Set()),
      withExtendedDepth: () => createFactory<true>(),
    });
    return createFactory<false>();
  }

  /**
   * Creates a factory for building graphs with extended depth mode enabled.
   *
   * When depth-exceeded occurs during type-level cycle detection, it will be
   * a WARNING instead of an ERROR. Use this when your dependency graph
   * legitimately exceeds the type-level depth limit and you accept that
   * compile-time cycle detection may be incomplete.
   *
   * @example
   * ```typescript
   * // Explicitly acknowledge incomplete compile-time validation
   * const builder = GraphBuilder.withExtendedDepth().create();
   *
   * // Can combine with custom depth (preferred order)
   * const customBuilder = GraphBuilder.withMaxDepth<100>().withExtendedDepth().create();
   * ```
   *
   * @pure Returns new factory; no side effects.
   */
  static withExtendedDepth(): ExtendedDepthFactory {
    return {
      create: () => new GraphBuilder([], new Set()),
      forParent: () => new GraphBuilder([], new Set()),
      withExtendedDepth: () => GraphBuilder.withExtendedDepth(),
    };
  }

  /**
   * Creates a new GraphBuilder for building a child graph with parent-aware validation.
   *
   * @pure Returns new GraphBuilder instance; original graph unchanged.
   * @param _parent - The parent graph (used only for type inference)
   */
  static forParent<TParentProvides, TParentAsync, TParentOverrides>(
    _parent: Graph<TParentProvides, TParentAsync, TParentOverrides>
  ): GraphBuilder<
    never,
    never,
    never,
    never,
    BuilderInternals<
      EmptyDependencyGraph,
      EmptyLifetimeMap,
      TParentProvides,
      DefaultMaxDepth,
      false
    > // DefaultMaxDepth=50
  > {
    return new GraphBuilder([], new Set());
  }

  // =============================================================================
  // Provide Methods
  // =============================================================================

  /**
   * Registers an adapter with the graph.
   *
   * Reports ALL validation errors at once for better developer experience.
   *
   * @pure Returns new GraphBuilder instance; original unchanged.
   */
  provide<A extends AdapterConstraint>(
    adapter: A
  ): ProvideResultAllErrors<TProvides, TRequires, TAsyncPorts, TOverrides, TInternalState, A>;
  provide<A extends AdapterConstraint>(
    adapter: A
  ): GraphBuilder<unknown, unknown, unknown, unknown, AnyBuilderInternals> | string {
    const state = addAdapter(this, adapter);
    return GraphBuilder.fromState(state);
  }

  /**
   * Registers multiple adapters with the graph in a batch.
   *
   * @pure Returns new GraphBuilder instance; original unchanged.
   */
  provideMany<const A extends readonly AdapterConstraint[]>(
    adapters: A
  ): ProvideManyResult<TProvides, TRequires, TAsyncPorts, TOverrides, TInternalState, A>;
  provideMany<A extends readonly AdapterConstraint[]>(adapters: A): unknown {
    const state = addManyAdapters(this, adapters);
    return GraphBuilder.fromState(state);
  }

  /**
   * Registers an adapter as an override for a parent container's adapter.
   *
   * @pure Returns new GraphBuilder instance; original unchanged.
   */
  override<A extends AdapterConstraint>(
    adapter: A
  ): OverrideResult<TProvides, TRequires, TAsyncPorts, TOverrides, TInternalState, A>;
  override<A extends AdapterConstraint>(adapter: A): unknown {
    const state = addOverrideAdapter(this, adapter);
    return GraphBuilder.fromState(state);
  }

  // =============================================================================
  // Merge Methods
  // =============================================================================

  /**
   * Merges another GraphBuilder into this one.
   *
   * @pure Returns new GraphBuilder instance; both originals unchanged.
   */
  merge<OProvides, ORequires, OAsyncPorts, OOverrides, OInternals extends AnyBuilderInternals>(
    other: GraphBuilder<OProvides, ORequires, OAsyncPorts, OOverrides, OInternals>
  ): MergeResult<
    TProvides,
    TRequires,
    TAsyncPorts,
    TOverrides,
    TInternalState,
    OProvides,
    ORequires,
    OAsyncPorts,
    OOverrides,
    OInternals
  >;
  merge<OProvides, ORequires, OAsyncPorts, OOverrides, OInternals extends AnyBuilderInternals>(
    other: GraphBuilder<OProvides, ORequires, OAsyncPorts, OOverrides, OInternals>
  ): unknown {
    const state = mergeGraphs(this, other);
    return GraphBuilder.fromState(state);
  }

  // =============================================================================
  // Inspection Methods
  // =============================================================================

  /**
   * Returns a runtime snapshot of the current graph state for debugging.
   *
   * @pure Returns new frozen inspection object; builder unchanged.
   *
   * @example Full inspection (default)
   * ```typescript
   * const inspection = builder.inspect();
   * console.log(inspection.summary);
   * ```
   *
   * @example Summary mode (lightweight, 7 fields)
   * ```typescript
   * const summary = builder.inspect({ summary: true });
   * console.log(`${summary.adapterCount} adapters, ${summary.asyncAdapterCount} async`);
   * console.log(`Valid: ${summary.isValid}`);
   * ```
   */
  inspect(options: InspectOptions & { summary: true }): GraphSummary;
  inspect(options?: InspectOptions): GraphInspection;
  inspect(options: InspectOptions = {}): GraphInspection | GraphSummary {
    return inspectGraph(
      {
        adapters: this.adapters,
        overridePortNames: this.overridePortNames,
      },
      options
    );
  }

  /**
   * Validates the graph without building/freezing it.
   *
   * @pure Returns new frozen validation result; builder unchanged.
   */
  validate(): ValidationResult {
    const inspection = this.inspect();

    const errors: string[] = [];

    if (inspection.unsatisfiedRequirements.length > 0) {
      errors.push(`Missing adapters for: ${inspection.unsatisfiedRequirements.join(", ")}`);
    }

    if (inspection.depthLimitExceeded) {
      const cycle = detectCycleAtRuntime(this.adapters);
      if (cycle) {
        errors.push(`Circular dependency: ${cycle.join(" -> ")}`);
      }
    }

    const warnings: string[] = [];

    if (inspection.depthWarning) {
      warnings.push(inspection.depthWarning);
    }

    for (const warning of inspection.disposalWarnings) {
      warnings.push(warning);
    }

    return Object.freeze({
      valid: errors.length === 0 && inspection.isComplete,
      errors: Object.freeze(errors),
      warnings: Object.freeze(warnings),
      adapterCount: inspection.adapterCount,
      provides: inspection.provides,
      unsatisfiedRequirements: inspection.unsatisfiedRequirements,
      maxChainDepth: inspection.maxChainDepth,
      suggestions: inspection.suggestions,
    });
  }

  // =============================================================================
  // Build Methods
  // =============================================================================

  /**
   * Builds the dependency graph after validating all dependencies are satisfied.
   *
   * @pure Returns new frozen Graph; original builder unchanged. May throw for deep cycles.
   * @throws {Error} At runtime if a circular dependency is detected when type-level limit exceeded.
   */
  build(): [UnsatisfiedDependencies<TProvides, TRequires>] extends [never]
    ? Graph<TProvides, TAsyncPorts, TOverrides>
    : `ERROR[HEX008]: Missing adapters for ${JoinPortNames<UnsatisfiedDependencies<TProvides, TRequires>>}. Call .provide() first.`;
  build(): BuiltGraph | string {
    return buildGraph(this);
  }

  /**
   * Builds a graph fragment for child containers.
   *
   * @pure Returns new frozen Graph; original builder unchanged. May throw for deep cycles.
   * @throws {Error} At runtime if a circular dependency is detected when type-level limit exceeded.
   */
  buildFragment(): Graph<TProvides, TAsyncPorts, TOverrides>;
  buildFragment(): BuiltGraph {
    return buildGraphFragment(this);
  }
}
