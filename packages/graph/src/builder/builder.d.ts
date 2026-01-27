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
import type { AdapterConstraint } from "../adapter/index.js";
import type { JoinPortNames, UnsatisfiedDependencies, DefaultMaxDepth, ValidateMaxDepth } from "../validation/index.js";
import type { Graph } from "../graph/types/graph-types.js";
import type { AnyBuilderInternals, BuilderInternals, DefaultInternals, GetDepGraph, GetLifetimeMap, GetParentProvides, GetMaxDepth, GetDepthExceededWarning, GetUncheckedUsed } from "./types/state.js";
import type { GraphInspection, ValidationResult } from "../graph/types/inspection.js";
import type { EmptyDependencyGraph, EmptyLifetimeMap, ProvideResult, ProvideResultAllErrors, ProvideAsyncResult, ProvideManyResult, ProvideUncheckedResult, MergeResult, MergeMaxDepthOption, MergeWithResult, OverrideResult, PrettyBuilder } from "./types/index.js";
import { GRAPH_BUILDER_BRAND } from "../symbols/index.js";
import type { __graphBuilderBrand, __prettyView, __prettyViewSymbol } from "../symbols/index.js";
export { GRAPH_BUILDER_BRAND };
export type { __prettyViewSymbol };
export type { EmptyDependencyGraph, EmptyLifetimeMap, ProvideResult, ProvideResultAllErrors, ProvideAsyncResult, ProvideManyResult, ProvideUncheckedResult, MergeResult, MergeOptions, MergeMaxDepthOption, MergeWithResult, OverrideResult, ValidationState, InspectValidation, SimplifiedView, InferBuilderProvides, InferBuilderUnsatisfied, PrettyBuilder, SimplifiedBuilder, InspectableBuilder, BuilderSummary, BuilderStatus, IsBuilderComplete, BuilderProvides, BuilderMissing, AnyBuilderInternals, BuilderInternals, DefaultInternals, } from "./types/index.js";
/**
 * Factory interface returned by `GraphBuilder.withMaxDepth<N>()`.
 *
 * Provides `create()` and `forParent()` methods that return GraphBuilders
 * with the specified maximum cycle detection depth.
 *
 * @typeParam TMaxDepth - The maximum cycle detection depth configured for this factory
 * @typeParam TUnsafeDepthOverride - Whether depth-exceeded is a warning (true) or error (false)
 */
export interface GraphBuilderFactory<TMaxDepth extends number, TUnsafeDepthOverride extends boolean = false> {
    /**
     * Creates a new empty GraphBuilder with custom max depth.
     */
    create(): GraphBuilder<never, never, never, never, BuilderInternals<EmptyDependencyGraph, EmptyLifetimeMap, unknown, TMaxDepth, TUnsafeDepthOverride> & AnyBuilderInternals>;
    /**
     * Creates a new GraphBuilder for building a child graph with parent-aware validation.
     *
     * @param parent - The parent graph (used only for type inference)
     */
    forParent<TParentProvides, TParentAsync, TParentOverrides>(parent: Graph<TParentProvides, TParentAsync, TParentOverrides>): GraphBuilder<never, never, never, never, BuilderInternals<EmptyDependencyGraph, EmptyLifetimeMap, TParentProvides, TMaxDepth, TUnsafeDepthOverride> & AnyBuilderInternals>;
    /**
     * Enables unsafe depth override mode on this factory.
     *
     * When depth-exceeded occurs during type-level cycle detection, it will be
     * a WARNING instead of an ERROR.
     */
    withUnsafeDepthOverride(): GraphBuilderFactory<TMaxDepth, true>;
}
/**
 * Factory type returned by `GraphBuilder.withUnsafeDepthOverride()`.
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
 * To use both custom depth AND unsafe override, chain the methods:
 * ```typescript
 * const builder = GraphBuilder.withMaxDepth<100>().withUnsafeDepthOverride().create();
 * ```
 *
 * @example
 * ```typescript
 * // Explicitly acknowledge incomplete compile-time validation
 * const builder = GraphBuilder.withUnsafeDepthOverride().create();
 * ```
 */
export type UnsafeDepthOverrideFactory = GraphBuilderFactory<DefaultMaxDepth, true>;
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
 * | `provide(adapter)`    | `\| InferProvides<A>`     | `\| InferRequires<A>`        | unchanged               | + depGraph edge, + lifetime entry      |
 * | `provideAsync(adapter)`| `\| InferProvides<A>`    | `\| InferRequires<A>`        | `\| InferProvides<A>`   | + depGraph edge, + lifetime(singleton) |
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
export declare class GraphBuilder<TProvides = never, TRequires = never, out TAsyncPorts = never, out TOverrides = never, TInternalState extends AnyBuilderInternals = DefaultInternals> {
    /**
     * Type-level brand property for nominal typing.
     * @internal
     */
    private readonly [__graphBuilderBrand];
    /**
     * Runtime brand marker for GraphBuilder instances.
     * @runtime Actual runtime value used for instanceof-like checks
     * @internal
     */
    private readonly [GRAPH_BUILDER_BRAND];
    /**
     * Phantom type property tracking provided ports.
     * @phantom No runtime representation - exists only at compile time
     * @internal
     */
    readonly __provides: TProvides;
    /**
     * Phantom type property tracking required ports.
     * @phantom No runtime representation - exists only at compile time
     * @internal
     */
    readonly __requires: TRequires;
    /**
     * Phantom type property tracking async ports.
     * @phantom No runtime representation - exists only at compile time
     * @internal
     */
    readonly __asyncPorts: TAsyncPorts;
    /**
     * Phantom type property for compile-time dependency graph.
     * @phantom No runtime representation - exists only at compile time
     * @internal
     */
    readonly __depGraph: GetDepGraph<TInternalState>;
    /**
     * Phantom type property for compile-time lifetime map.
     * @phantom No runtime representation - exists only at compile time
     * @internal
     */
    readonly __lifetimeMap: GetLifetimeMap<TInternalState>;
    /**
     * Phantom type property for compile-time override tracking.
     * @phantom No runtime representation - exists only at compile time
     * @internal
     */
    readonly __overrides: TOverrides;
    /**
     * Phantom type property for internal state (dep graph, lifetime map, etc.).
     * @phantom No runtime representation - exists only at compile time
     * @internal
     */
    readonly __internalState: TInternalState;
    /**
     * Phantom type property for compile-time parent graph tracking.
     * @phantom No runtime representation - exists only at compile time
     * @internal
     */
    readonly __parentProvides: GetParentProvides<TInternalState>;
    /**
     * Phantom type property for compile-time cycle detection depth limit.
     * @phantom No runtime representation - exists only at compile time
     * @internal
     */
    readonly __maxDepth: GetMaxDepth<TInternalState>;
    /**
     * Phantom property exposing the provided ports union.
     * @phantom No runtime representation - use for type extraction only
     * @example
     * ```typescript
     * type Provided = typeof myGraph.$provides; // "PortA" | "PortB"
     * ```
     */
    readonly $provides: TProvides;
    /**
     * Phantom property exposing unsatisfied dependencies.
     * @phantom No runtime representation - use for type extraction only
     * @example
     * ```typescript
     * type Missing = typeof myGraph.$unsatisfied; // "PortC" | "PortD"
     * ```
     */
    readonly $unsatisfied: UnsatisfiedDependencies<TProvides, TRequires>;
    /**
     * Phantom property exposing depth-exceeded warnings.
     *
     * When `withUnsafeDepthOverride()` is enabled and depth limit is exceeded
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
     *   .withUnsafeDepthOverride()
     *   .create()
     *   .provide(...)
     *   .provide(...);
     *
     * type Warnings = typeof graph.$depthWarnings; // "PortName" | never
     * ```
     */
    readonly $depthWarnings: GetDepthExceededWarning<TInternalState>;
    /**
     * Phantom property indicating whether `provideUnchecked()` was used.
     *
     * When `provideUnchecked()` is called, compile-time validation is bypassed.
     * This property tracks whether any unchecked adapters exist in the graph,
     * useful for tooling to warn about incomplete type-level guarantees.
     *
     * - Returns `false` for graphs using only `provide()`
     * - Returns `true` if `provideUnchecked()` was used anywhere
     *
     * @phantom No runtime representation - use for type extraction only
     * @example
     * ```typescript
     * const graph = GraphBuilder.create()
     *   .provide(AdapterA)
     *   .provideUnchecked(AdapterB);
     *
     * type IsUnsafe = typeof graph.$uncheckedUsed; // true
     * ```
     */
    readonly $uncheckedUsed: GetUncheckedUsed<TInternalState>;
    /**
     * IDE tooltip helper - shows simplified view of the graph state.
     * @phantom No runtime representation - hover over in IDE for debugging
     */
    readonly [__prettyView]: PrettyBuilder<this>;
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
    private constructor();
    /**
     * Internal factory for creating new instances from state.
     * Used by methods that delegate to standalone functions.
     * @internal
     */
    private static fromState;
    /**
     * Creates a new empty GraphBuilder.
     *
     * @pure Returns new GraphBuilder instance; no side effects.
     */
    static create(): GraphBuilder<never, never, never, never, DefaultInternals>;
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
    static withMaxDepth<TDepth extends number>(): ValidateMaxDepth<TDepth> extends TDepth ? GraphBuilderFactory<TDepth> : ValidateMaxDepth<TDepth>;
    /**
     * Creates a factory for building graphs with unsafe depth override enabled.
     *
     * When depth-exceeded occurs during type-level cycle detection, it will be
     * a WARNING instead of an ERROR. Use this when your dependency graph
     * legitimately exceeds the type-level depth limit and you accept that
     * compile-time cycle detection may be incomplete.
     *
     * @example
     * ```typescript
     * // Explicitly acknowledge incomplete compile-time validation
     * const builder = GraphBuilder.withUnsafeDepthOverride().create();
     *
     * // Can combine with custom depth (preferred order)
     * const customBuilder = GraphBuilder.withMaxDepth<100>().withUnsafeDepthOverride().create();
     * ```
     *
     * @pure Returns new factory; no side effects.
     */
    static withUnsafeDepthOverride(): UnsafeDepthOverrideFactory;
    /**
     * Creates a new GraphBuilder for building a child graph with parent-aware validation.
     *
     * @pure Returns new GraphBuilder instance; original graph unchanged.
     * @param _parent - The parent graph (used only for type inference)
     */
    static forParent<TParentProvides, TParentAsync, TParentOverrides>(_parent: Graph<TParentProvides, TParentAsync, TParentOverrides>): GraphBuilder<never, never, never, never, BuilderInternals<EmptyDependencyGraph, EmptyLifetimeMap, TParentProvides, DefaultMaxDepth, false>>;
    /**
     * Registers an adapter with the graph.
     *
     * Reports ALL validation errors at once for better developer experience.
     *
     * @pure Returns new GraphBuilder instance; original unchanged.
     */
    provide<A extends AdapterConstraint>(adapter: A): ProvideResultAllErrors<TProvides, TRequires, TAsyncPorts, TOverrides, TInternalState, A>;
    /**
     * Registers an adapter with first-error-only reporting (short-circuit).
     *
     * @pure Returns new GraphBuilder instance; original unchanged.
     */
    provideFirstError<A extends AdapterConstraint>(adapter: A): ProvideResult<TProvides, TRequires, TAsyncPorts, TOverrides, TInternalState, A>;
    /**
     * Registers an adapter WITHOUT compile-time validation.
     *
     * @pure Returns new GraphBuilder instance; original unchanged.
     */
    provideUnchecked<A extends AdapterConstraint>(adapter: A): ProvideUncheckedResult<TProvides, TRequires, TAsyncPorts, TOverrides, TInternalState, A>;
    /**
     * Registers an async adapter with the graph.
     *
     * @pure Returns new GraphBuilder instance; original unchanged.
     */
    provideAsync<A extends AdapterConstraint & {
        readonly factoryKind: "async";
    }>(adapter: A): ProvideAsyncResult<TProvides, TRequires, TAsyncPorts, TOverrides, TInternalState, A>;
    /**
     * Registers multiple adapters with the graph in a batch.
     *
     * @pure Returns new GraphBuilder instance; original unchanged.
     */
    provideMany<const A extends readonly AdapterConstraint[]>(adapters: A): ProvideManyResult<TProvides, TRequires, TAsyncPorts, TOverrides, TInternalState, A>;
    /**
     * Registers an adapter as an override for a parent container's adapter.
     *
     * @pure Returns new GraphBuilder instance; original unchanged.
     */
    override<A extends AdapterConstraint>(adapter: A): OverrideResult<TProvides, TRequires, TAsyncPorts, TOverrides, TInternalState, A>;
    /**
     * Merges another GraphBuilder into this one.
     *
     * @pure Returns new GraphBuilder instance; both originals unchanged.
     */
    merge<OProvides, ORequires, OAsyncPorts, OOverrides, OInternals extends AnyBuilderInternals>(other: GraphBuilder<OProvides, ORequires, OAsyncPorts, OOverrides, OInternals>): MergeResult<TProvides, TRequires, TAsyncPorts, TOverrides, TInternalState, OProvides, ORequires, OAsyncPorts, OOverrides, OInternals>;
    /**
     * Merges another GraphBuilder into this one with configurable options.
     *
     * @pure Returns new GraphBuilder instance; both originals unchanged.
     */
    mergeWith<OProvides, ORequires, OAsyncPorts, OOverrides, OInternals extends AnyBuilderInternals, TMaxDepthOption extends MergeMaxDepthOption = "max">(other: GraphBuilder<OProvides, ORequires, OAsyncPorts, OOverrides, OInternals>, options?: {
        maxDepth?: TMaxDepthOption;
    }): MergeWithResult<TProvides, TRequires, TAsyncPorts, TOverrides, TInternalState, OProvides, ORequires, OAsyncPorts, OOverrides, OInternals, TMaxDepthOption>;
    /**
     * Returns a runtime snapshot of the current graph state for debugging.
     *
     * @pure Returns new frozen inspection object; builder unchanged.
     */
    inspect(): GraphInspection;
    /**
     * Validates the graph without building/freezing it.
     *
     * @pure Returns new frozen validation result; builder unchanged.
     */
    validate(): ValidationResult;
    /**
     * Builds the dependency graph after validating all dependencies are satisfied.
     *
     * @pure Returns new frozen Graph; original builder unchanged. May throw for deep cycles.
     * @throws {Error} At runtime if a circular dependency is detected when type-level limit exceeded.
     */
    build(): [UnsatisfiedDependencies<TProvides, TRequires>] extends [never] ? Graph<TProvides, TAsyncPorts, TOverrides> : `ERROR[HEX008]: Missing adapters for ${JoinPortNames<UnsatisfiedDependencies<TProvides, TRequires>>}. Call .provide() first.`;
    /**
     * Builds a graph fragment for child containers.
     *
     * @pure Returns new frozen Graph; original builder unchanged. May throw for deep cycles.
     * @throws {Error} At runtime if a circular dependency is detected when type-level limit exceeded.
     */
    buildFragment(): Graph<TProvides, TAsyncPorts, TOverrides>;
}
