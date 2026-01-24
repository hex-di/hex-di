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

import type { AdapterAny } from "../adapter/index.js";
import type {
  JoinPortNames,
  UnsatisfiedDependencies,
  DefaultMaxDepth,
  ValidateMaxDepth,
} from "../validation/index.js";
import type { Graph } from "./types.js";
import type {
  AnyBuilderInternals,
  BuilderInternals,
  DefaultInternals,
  GetDepGraph,
  GetLifetimeMap,
  GetParentProvides,
  GetMaxDepth,
} from "../builder-types/internals.js";
import {
  inspectGraph,
  inspectionToJSON,
  detectCycleAtRuntime,
  type GraphInspection,
  type GraphInspectionJSON,
  type GraphSuggestion,
  type ValidationResult,
} from "./builder-inspection.js";

// Import all type-level validation types from the dedicated module
import type {
  EmptyDependencyGraph,
  EmptyLifetimeMap,
  ProvideResult,
  ProvideResultAllErrors,
  ProvideAsyncResult,
  ProvideManyResult,
  ProvideUncheckedResult,
  MergeResult,
  MergeMaxDepthOption,
  MergeWithResult,
  OverrideResult,
  PrettyBuilder,
} from "../builder-types/index.js";

// Import from split modules
import {
  GRAPH_BUILDER_BRAND,
  type __prettyViewSymbol,
  type BuildableGraphState,
} from "./builder-types.js";
import { addAdapter, addManyAdapters, addOverrideAdapter } from "./builder-provide.js";
import { mergeGraphs, mergeGraphsWithOptions, type MergeGraphOptions } from "./builder-merge.js";
import { buildGraph, buildGraphFragment, type BuiltGraph } from "./builder-build.js";

// Re-export inspection utilities
// NOTE: Visualization utilities (toDotGraph, toMermaidGraph) have been moved
// to the separate @hex-di/visualization package.
export {
  inspectGraph,
  inspectionToJSON,
  detectCycleAtRuntime,
  type GraphInspection,
  type GraphInspectionJSON,
  type GraphSuggestion,
  type ValidationResult,
};

// Re-export from builder-types
export { GRAPH_BUILDER_BRAND, type __prettyViewSymbol };

// Re-export type utilities for external use
export type {
  EmptyDependencyGraph,
  EmptyLifetimeMap,
  ProvideResult,
  ProvideResultAllErrors,
  ProvideAsyncResult,
  ProvideManyResult,
  ProvideUncheckedResult,
  MergeResult,
  MergeOptions,
  MergeMaxDepthOption,
  MergeWithResult,
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
} from "../builder-types/index.js";

// =============================================================================
// Brand Symbols (type-level only, declared in builder-types.ts)
// =============================================================================

/**
 * Unique symbol used for nominal typing of GraphBuilder types at the type level.
 *
 * This is a **phantom brand** - it exists only at the type level and has no
 * runtime representation. The `declare const` ensures TypeScript treats it
 * as a unique symbol type without generating any JavaScript code.
 */
declare const __graphBuilderBrand: unique symbol;

/**
 * Unique symbol used for the IDE tooltip helper property.
 *
 * This is exported so users can access `builder[__prettyView]` in their IDE
 * to see a simplified view of the builder's type parameters.
 *
 * @internal
 */
declare const __prettyView: unique symbol;

/**
 * Factory interface returned by `GraphBuilder.withMaxDepth<N>()`.
 *
 * Provides `create()` and `forParent()` methods that return GraphBuilders
 * with the specified maximum cycle detection depth.
 *
 * @typeParam TMaxDepth - The maximum cycle detection depth configured for this factory
 */
export interface GraphBuilderFactory<TMaxDepth extends number> {
  /**
   * Creates a new empty GraphBuilder with custom max depth.
   */
  create(): GraphBuilder<
    never,
    never,
    never,
    never,
    BuilderInternals<EmptyDependencyGraph, EmptyLifetimeMap, unknown, TMaxDepth> &
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
    BuilderInternals<EmptyDependencyGraph, EmptyLifetimeMap, TParentProvides, TMaxDepth> &
      AnyBuilderInternals
  >;
}

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
   * @internal
   */
  private readonly [GRAPH_BUILDER_BRAND] = true as const;

  // ═══════════════════════════════════════════════════════════════════════════
  // PHANTOM TYPE PROPERTIES
  // ═══════════════════════════════════════════════════════════════════════════

  /** Phantom type property tracking provided ports. @internal */
  declare readonly __provides: TProvides;

  /** Phantom type property tracking required ports. @internal */
  declare readonly __requires: TRequires;

  /** Phantom type property tracking async ports. @internal */
  declare readonly __asyncPorts: TAsyncPorts;

  /** Phantom type property for compile-time dependency graph. @internal */
  declare readonly __depGraph: GetDepGraph<TInternalState>;

  /** Phantom type property for compile-time lifetime map. @internal */
  declare readonly __lifetimeMap: GetLifetimeMap<TInternalState>;

  /** Phantom type property for compile-time override tracking. @internal */
  declare readonly __overrides: TOverrides;

  /** Phantom type property for compile-time parent graph tracking. @internal */
  declare readonly __parentProvides: GetParentProvides<TInternalState>;

  /** Phantom type property for compile-time cycle detection depth limit. @internal */
  declare readonly __maxDepth: GetMaxDepth<TInternalState>;

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC PHANTOM SHORTCUTS
  // ═══════════════════════════════════════════════════════════════════════════

  /** Phantom property exposing the provided ports union. */
  declare readonly $provides: TProvides;

  /** Phantom property exposing unsatisfied dependencies. */
  declare readonly $unsatisfied: UnsatisfiedDependencies<TProvides, TRequires>;

  /** IDE tooltip helper - shows simplified view. */
  declare readonly [__prettyView]: PrettyBuilder<this>;

  /**
   * The readonly array of registered adapters.
   */
  readonly adapters: readonly AdapterAny[];

  /**
   * The set of port names marked as overrides.
   */
  readonly overridePortNames: ReadonlySet<string>;

  /**
   * Private constructor to enforce factory method pattern.
   * @internal
   */
  private constructor(
    adapters: readonly AdapterAny[],
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
    return {
      create: () => new GraphBuilder([], new Set()),
      forParent: () => new GraphBuilder([], new Set()),
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
    BuilderInternals<EmptyDependencyGraph, EmptyLifetimeMap, TParentProvides, DefaultMaxDepth>
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
  provide<A extends AdapterAny>(
    adapter: A
  ): ProvideResultAllErrors<TProvides, TRequires, TAsyncPorts, TOverrides, TInternalState, A>;
  provide<A extends AdapterAny>(
    adapter: A
  ): GraphBuilder<unknown, unknown, unknown, unknown, AnyBuilderInternals> | string {
    const state = addAdapter(this, adapter);
    return GraphBuilder.fromState(state);
  }

  /**
   * Registers an adapter with first-error-only reporting (short-circuit).
   *
   * @pure Returns new GraphBuilder instance; original unchanged.
   */
  provideFirstError<A extends AdapterAny>(
    adapter: A
  ): ProvideResult<TProvides, TRequires, TAsyncPorts, TOverrides, TInternalState, A>;
  provideFirstError<A extends AdapterAny>(
    adapter: A
  ): GraphBuilder<unknown, unknown, unknown, unknown, AnyBuilderInternals> | string {
    const state = addAdapter(this, adapter);
    return GraphBuilder.fromState(state);
  }

  /**
   * Registers an adapter WITHOUT compile-time validation.
   *
   * @pure Returns new GraphBuilder instance; original unchanged.
   */
  provideUnchecked<A extends AdapterAny>(
    adapter: A
  ): ProvideUncheckedResult<TProvides, TRequires, TAsyncPorts, TOverrides, TInternalState, A>;
  provideUnchecked<A extends AdapterAny>(
    adapter: A
  ): GraphBuilder<unknown, unknown, unknown, unknown, AnyBuilderInternals> {
    const state = addAdapter(this, adapter);
    return GraphBuilder.fromState(state);
  }

  /**
   * Registers an async adapter with the graph.
   *
   * @pure Returns new GraphBuilder instance; original unchanged.
   */
  provideAsync<A extends AdapterAny & { readonly factoryKind: "async" }>(
    adapter: A
  ): ProvideAsyncResult<TProvides, TRequires, TAsyncPorts, TOverrides, TInternalState, A>;
  provideAsync<A extends AdapterAny & { readonly factoryKind: "async" }>(
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
  provideMany<const A extends readonly AdapterAny[]>(
    adapters: A
  ): ProvideManyResult<TProvides, TRequires, TAsyncPorts, TOverrides, TInternalState, A>;
  provideMany<A extends readonly AdapterAny[]>(adapters: A): unknown {
    const state = addManyAdapters(this, adapters);
    return GraphBuilder.fromState(state);
  }

  /**
   * Registers an adapter as an override for a parent container's adapter.
   *
   * @pure Returns new GraphBuilder instance; original unchanged.
   */
  override<A extends AdapterAny>(
    adapter: A
  ): OverrideResult<TProvides, TRequires, TAsyncPorts, TOverrides, TInternalState, A>;
  override<A extends AdapterAny>(
    adapter: A
  ): GraphBuilder<unknown, unknown, unknown, unknown, AnyBuilderInternals> | string {
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
  ): GraphBuilder<unknown, unknown, unknown, unknown, AnyBuilderInternals> | string {
    const state = mergeGraphs(this, other);
    return GraphBuilder.fromState(state);
  }

  /**
   * Merges another GraphBuilder into this one with configurable options.
   *
   * @pure Returns new GraphBuilder instance; both originals unchanged.
   */
  mergeWith<
    OProvides,
    ORequires,
    OAsyncPorts,
    OOverrides,
    OInternals extends AnyBuilderInternals,
    TMaxDepthOption extends MergeMaxDepthOption = "first",
  >(
    other: GraphBuilder<OProvides, ORequires, OAsyncPorts, OOverrides, OInternals>,
    options: { maxDepth?: TMaxDepthOption }
  ): MergeWithResult<
    TProvides,
    TRequires,
    TAsyncPorts,
    TOverrides,
    TInternalState,
    OProvides,
    ORequires,
    OAsyncPorts,
    OOverrides,
    OInternals,
    TMaxDepthOption
  >;
  mergeWith<OProvides, ORequires, OAsyncPorts, OOverrides, OInternals extends AnyBuilderInternals>(
    other: GraphBuilder<OProvides, ORequires, OAsyncPorts, OOverrides, OInternals>,
    options: MergeGraphOptions
  ): GraphBuilder<unknown, unknown, unknown, unknown, AnyBuilderInternals> | string {
    const state = mergeGraphsWithOptions(this, other, options);
    return GraphBuilder.fromState(state);
  }

  // =============================================================================
  // Inspection Methods
  // =============================================================================

  /**
   * Returns a runtime snapshot of the current graph state for debugging.
   *
   * @pure Returns new frozen inspection object; builder unchanged.
   */
  inspect(): GraphInspection {
    return inspectGraph({
      adapters: this.adapters,
      overridePortNames: this.overridePortNames,
    });
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
    : `ERROR[HEX004]: Missing adapters for ${JoinPortNames<UnsatisfiedDependencies<TProvides, TRequires>>}. Call .provide() first.`;
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
