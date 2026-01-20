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
 * ## Validation Order in ProvideResult
 *
 * When `.provide(adapter)` is called, validations run in this order:
 *
 * 1. **Duplicate Detection** (fastest, fail early)
 *    - `HasOverlap<NewPort, ExistingPorts>` → DuplicateErrorMessage
 *
 * 2. **Circular Dependency Detection**
 *    - `WouldCreateCycle<DepGraph, Provides, Requires>` → CircularErrorMessage
 *    - Uses DFS at type level (see cycle-detection.ts)
 *
 * 3. **Captive Dependency Detection**
 *    - `FindAnyCaptiveDependency<LifetimeMap, Level, Requires>` → CaptiveErrorMessage
 *    - Checks lifetime hierarchy (see captive-dependency.ts)
 *
 * 4. **Success**: Return new `GraphBuilder<...>` with updated type parameters
 *
 * ## Why Nested Conditionals (Not Unions)?
 *
 * We use nested `... extends true ? Error : (next check)` because:
 * - Each check must complete before the next runs
 * - Union return types would accept EITHER branch
 * - Nested structure preserves validation order
 *
 * ## Error Types: Template Literals
 *
 * Return types on failure are template literal strings like:
 * `"ERROR: Circular dependency: A -> B -> A"`
 *
 * This makes errors immediately visible in IDE tooltips without
 * expanding complex type structures.
 *
 * @see ./validation/cycle-detection.ts - DFS algorithm for cycles
 * @see ./validation/captive-dependency.ts - Lifetime hierarchy checks
 * @see ./validation/errors.ts - Template literal error types
 * @packageDocumentation
 */

import type {
  AdapterAny,
  InferAdapterProvides,
  InferAdapterRequires,
  InferManyProvides,
  InferManyRequires,
  InferManyAsyncPorts,
} from "../adapter";
import type {
  ExtractPortNames,
  UnsatisfiedDependencies,
  HasOverlap,
  OverlappingPorts,
  CircularDependencyError,
  WouldCreateCycle,
  AddEdge,
  AdapterProvidesName,
  AdapterRequiresNames,
  BuildCyclePath,
  MergeDependencyMaps,
  AddManyEdges,
  WouldAnyCreateCycle,
  DetectCycleInMergedGraph,
  LifetimeLevel,
  AddLifetime,
  GetLifetimeLevel,
  FindAnyCaptiveDependency,
  CaptiveDependencyError,
  LifetimeName,
  MergeLifetimeMaps,
  AddManyLifetimes,
  WouldAnyBeCaptive,
  DetectCaptiveInMergedGraph,
  FindLifetimeInconsistency,
  DuplicateErrorMessage,
  CircularErrorMessage,
  CaptiveErrorMessage,
  LifetimeInconsistencyErrorMessage,
  FilterNever,
  MultiErrorMessage,
} from "../validation";

import type { Graph } from "./types";
import type { IsNever } from "../common";
import {
  inspectGraph,
  toDotGraph,
  type GraphInspection,
  type GraphSuggestion,
  type DotGraphOptions,
} from "./builder-inspection";

// Re-export inspection utilities
export {
  inspectGraph,
  toDotGraph,
  type GraphInspection,
  type GraphSuggestion,
  type DotGraphOptions,
};

/**
 * Extracts the lifetime directly from an adapter using property access.
 * This explicitly maps each literal to avoid inference issues with unions.
 * @internal
 */
type DirectAdapterLifetime<A> = A extends { lifetime: "singleton" }
  ? "singleton"
  : A extends { lifetime: "scoped" }
    ? "scoped"
    : A extends { lifetime: "transient" }
      ? "transient"
      : "singleton";

// =============================================================================
// Brand Symbols
// =============================================================================
//
// This module uses two types of symbols following the project convention:
//
// - **`__graphBuilderBrand`** (double underscore): Type-level phantom brand
//   - Only exists at compile time for nominal typing
//   - No runtime footprint
//
// - **`GRAPH_BUILDER_BRAND`** (SCREAMING_CASE): Runtime symbol constant
//   - Actual Symbol() value used for instanceof-like checks
//   - Has runtime representation
//

/**
 * Unique symbol used for nominal typing of GraphBuilder types at the type level.
 *
 * This is a **phantom brand** - it exists only at the type level and has no
 * runtime representation. The `declare const` ensures TypeScript treats it
 * as a unique symbol type without generating any JavaScript code.
 */
declare const __graphBuilderBrand: unique symbol;

/**
 * Runtime symbol used as a property key for GraphBuilder branding.
 *
 * Unlike `__graphBuilderBrand`, this is an actual runtime value that can be
 * used to verify GraphBuilder instances. The `Symbol()` call generates a
 * globally unique value that cannot be recreated.
 *
 * @internal
 */
const GRAPH_BUILDER_BRAND = Symbol("GraphBuilder");

// =============================================================================
// ProvideResult Decomposition
// =============================================================================
//
// The validation pipeline is decomposed into focused helper types:
//
// 1. ProvideResultSuccess - Constructs the successful GraphBuilder type
// 2. CheckCaptiveDependency - Step 3: Lifetime violation check
// 3. CheckCycleDependency - Step 2: Circular dependency check
// 4. CheckDuplicate - Step 1: Duplicate port check
// 5. ProvideResult - Orchestrates the pipeline
//

/**
 * Constructs a new GraphBuilder with updated type parameters after successful validation.
 *
 * This type encapsulates the "success case" - creating a GraphBuilder with:
 * - TProvides grows by the new port
 * - TRequires grows by the new requirements
 * - TDepGraph adds the new edge
 * - TLifetimeMap adds the new port's lifetime
 *
 * @internal
 */
type ProvideResultSuccess<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  TAdapter extends AdapterAny,
  TParentProvides,
> = GraphBuilder<
  TProvides | InferAdapterProvides<TAdapter>,
  TRequires | InferAdapterRequires<TAdapter>,
  TAsyncPorts,
  AddEdge<TDepGraph, AdapterProvidesName<TAdapter>, AdapterRequiresNames<TAdapter>>,
  AddLifetime<TLifetimeMap, AdapterProvidesName<TAdapter>, DirectAdapterLifetime<TAdapter>>,
  TOverrides,
  TParentProvides
>;

/**
 * Step 3: Captive dependency check.
 *
 * Checks if any required port has a shorter lifetime than the adapter.
 * Returns CaptiveErrorMessage on failure, ProvideResultSuccess on success.
 *
 * @internal
 */
type CheckCaptiveDependency<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  TAdapter extends AdapterAny,
  TParentProvides,
> =
  FindAnyCaptiveDependency<
    TLifetimeMap,
    LifetimeLevel<DirectAdapterLifetime<TAdapter>>,
    AdapterRequiresNames<TAdapter>
  > extends infer TCaptivePort
    ? IsNever<TCaptivePort> extends true
      ? ProvideResultSuccess<
          TProvides,
          TRequires,
          TAsyncPorts,
          TDepGraph,
          TLifetimeMap,
          TOverrides,
          TAdapter,
          TParentProvides
        >
      : TCaptivePort extends string
        ? CaptiveErrorMessage<
            AdapterProvidesName<TAdapter>,
            LifetimeName<LifetimeLevel<DirectAdapterLifetime<TAdapter>>>,
            TCaptivePort,
            LifetimeName<GetLifetimeLevel<TLifetimeMap, TCaptivePort>>
          >
        : ProvideResultSuccess<
            TProvides,
            TRequires,
            TAsyncPorts,
            TDepGraph,
            TLifetimeMap,
            TOverrides,
            TAdapter,
            TParentProvides
          >
    : never;

/**
 * Step 2: Circular dependency check.
 *
 * Checks if adding this adapter would create a cycle in the dependency graph.
 * Returns CircularErrorMessage on failure, proceeds to CheckCaptiveDependency on success.
 *
 * @internal
 */
type CheckCycleDependency<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  TAdapter extends AdapterAny,
  TParentProvides,
> =
  WouldCreateCycle<
    TDepGraph,
    AdapterProvidesName<TAdapter>,
    AdapterRequiresNames<TAdapter>
  > extends true
    ? CircularErrorMessage<
        BuildCyclePath<
          AddEdge<TDepGraph, AdapterProvidesName<TAdapter>, AdapterRequiresNames<TAdapter>>,
          AdapterProvidesName<TAdapter>,
          AdapterRequiresNames<TAdapter>
        >
      >
    : CheckCaptiveDependency<
        TProvides,
        TRequires,
        TAsyncPorts,
        TDepGraph,
        TLifetimeMap,
        TOverrides,
        TAdapter,
        TParentProvides
      >;

/**
 * Step 1: Duplicate port check.
 *
 * Checks if the adapter provides a port that's already in the graph.
 * Returns DuplicateErrorMessage on failure, proceeds to CheckCycleDependency on success.
 *
 * @internal
 */
type CheckDuplicate<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  TAdapter extends AdapterAny,
  TParentProvides,
> =
  HasOverlap<InferAdapterProvides<TAdapter>, TProvides> extends true
    ? DuplicateErrorMessage<OverlappingPorts<InferAdapterProvides<TAdapter>, TProvides>>
    : CheckCycleDependency<
        TProvides,
        TRequires,
        TAsyncPorts,
        TDepGraph,
        TLifetimeMap,
        TOverrides,
        TAdapter,
        TParentProvides
      >;

/**
 * The return type of `GraphBuilder.provideFast()` with short-circuit validation.
 *
 * Implements a validation pipeline that stops at the first error:
 *
 * ```
 * Input: Adapter
 *    │
 *    ▼
 * ┌──────────────────────────┐
 * │ 1. CheckDuplicate        │ → DuplicateErrorMessage or continue
 * └────────────┬─────────────┘
 *              ▼
 * ┌──────────────────────────┐
 * │ 2. CheckCycleDependency  │ → CircularErrorMessage or continue
 * └────────────┬─────────────┘
 *              ▼
 * ┌──────────────────────────┐
 * │ 3. CheckCaptiveDependency│ → CaptiveErrorMessage or continue
 * └────────────┬─────────────┘
 *              ▼
 * ┌──────────────────────────┐
 * │ 4. ProvideResultSuccess  │ → GraphBuilder<updated>
 * └──────────────────────────┘
 * ```
 *
 * For comprehensive multi-error reporting, see `ProvideResultAllErrors`.
 *
 * @typeParam TProvides - Current union of provided ports
 * @typeParam TRequires - Current union of required ports
 * @typeParam TAsyncPorts - Current union of async ports
 * @typeParam TDepGraph - Current type-level dependency graph
 * @typeParam TLifetimeMap - Current type-level lifetime map
 * @typeParam TOverrides - Current union of override ports
 * @typeParam TAdapter - The adapter being added
 * @typeParam TParentProvides - Parent provides for forParent validation
 *
 * @internal
 */
type ProvideResult<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  TAdapter extends AdapterAny,
  TParentProvides = unknown,
> = CheckDuplicate<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  TAdapter,
  TParentProvides
>;

/**
 * Collects ALL validation errors for an adapter without short-circuiting.
 *
 * Unlike `ProvideResult` which stops at the first error, this type evaluates
 * all validations and returns a tuple of all errors found. The tuple is then
 * filtered to remove `never` values (passing checks) and formatted into a
 * multi-error message.
 *
 * This is the type used by `provide()` (the default). Use `provideFast()` if
 * you prefer short-circuit behavior for faster type checking.
 *
 * @typeParam TProvides - Current union of provided ports
 * @typeParam TRequires - Current union of required ports
 * @typeParam TDepGraph - Current type-level dependency graph
 * @typeParam TLifetimeMap - Current type-level lifetime map
 * @typeParam A - The adapter being added
 *
 * @internal
 */
type CollectAdapterErrors<TProvides, TDepGraph, TLifetimeMap, A extends AdapterAny> = FilterNever<
  readonly [
    // Error 1: Duplicate detection
    HasOverlap<InferAdapterProvides<A>, TProvides> extends true
      ? DuplicateErrorMessage<OverlappingPorts<InferAdapterProvides<A>, TProvides>>
      : never,
    // Error 2: Circular dependency detection
    WouldCreateCycle<TDepGraph, AdapterProvidesName<A>, AdapterRequiresNames<A>> extends true
      ? CircularErrorMessage<
          BuildCyclePath<
            AddEdge<TDepGraph, AdapterProvidesName<A>, AdapterRequiresNames<A>>,
            AdapterProvidesName<A>,
            AdapterRequiresNames<A>
          >
        >
      : never,
    // Error 3: Captive dependency detection
    FindAnyCaptiveDependency<
      TLifetimeMap,
      LifetimeLevel<DirectAdapterLifetime<A>>,
      AdapterRequiresNames<A>
    > extends infer CaptivePort
      ? IsNever<CaptivePort> extends true
        ? never
        : CaptivePort extends string
          ? CaptiveErrorMessage<
              AdapterProvidesName<A>,
              LifetimeName<LifetimeLevel<DirectAdapterLifetime<A>>>,
              CaptivePort,
              LifetimeName<GetLifetimeLevel<TLifetimeMap, CaptivePort>>
            >
          : never
      : never,
  ]
>;

/**
 * The return type of `GraphBuilder.provide()` that reports ALL validation errors.
 *
 * Unlike `ProvideResult` (used by `provideFast()`) which short-circuits on the
 * first error, this type evaluates all validations and returns either:
 * - A `GraphBuilder` if all validations pass
 * - A multi-error message string if any validations fail
 *
 * This enables seeing all problems at once rather than fix-and-retry cycles.
 *
 * @typeParam TProvides - Current union of provided ports
 * @typeParam TRequires - Current union of required ports
 * @typeParam TAsyncPorts - Current union of async ports
 * @typeParam TDepGraph - Current type-level dependency graph
 * @typeParam TLifetimeMap - Current type-level lifetime map
 * @typeParam TOverrides - Current union of override ports
 * @typeParam A - The adapter being added
 * @typeParam TParentProvides - Parent provides for forParent validation
 *
 * @internal
 */
type ProvideResultAllErrors<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  A extends AdapterAny,
  TParentProvides = unknown,
> =
  CollectAdapterErrors<TProvides, TDepGraph, TLifetimeMap, A> extends infer Errors extends
    readonly string[]
    ? Errors["length"] extends 0
      ? // No errors - return success (same as ProvideResult success case)
        GraphBuilder<
          TProvides | InferAdapterProvides<A>,
          TRequires | InferAdapterRequires<A>,
          TAsyncPorts,
          AddEdge<TDepGraph, AdapterProvidesName<A>, AdapterRequiresNames<A>>,
          AddLifetime<TLifetimeMap, AdapterProvidesName<A>, DirectAdapterLifetime<A>>,
          TOverrides,
          TParentProvides
        >
      : // Has errors - return multi-error message
        MultiErrorMessage<Errors>
    : never;

/**
 * The return type of `GraphBuilder.provideAsync()` with duplicate, cycle, and captive dependency detection.
 *
 * Note: Async adapters are always singletons, so captive dependency check still applies.
 *
 * @internal
 */
type ProvideAsyncResult<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  A extends AdapterAny & { readonly factoryKind: "async" },
  TParentProvides = unknown,
> =
  // First check for duplicate providers
  HasOverlap<InferAdapterProvides<A>, TProvides> extends true
    ? DuplicateErrorMessage<OverlappingPorts<InferAdapterProvides<A>, TProvides>>
    : // Then check for circular dependencies
      WouldCreateCycle<TDepGraph, AdapterProvidesName<A>, AdapterRequiresNames<A>> extends true
      ? CircularErrorMessage<
          BuildCyclePath<
            AddEdge<TDepGraph, AdapterProvidesName<A>, AdapterRequiresNames<A>>,
            AdapterProvidesName<A>,
            AdapterRequiresNames<A>
          >
        >
      : // Then check for captive dependencies (async adapters are always singleton = level 1)
        FindAnyCaptiveDependency<
            TLifetimeMap,
            1, // Async adapters are always singleton
            AdapterRequiresNames<A>
          > extends infer CaptivePort
        ? IsNever<CaptivePort> extends true
          ? // Success: return new builder with updated types
            GraphBuilder<
              TProvides | InferAdapterProvides<A>,
              TRequires | InferAdapterRequires<A>,
              TAsyncPorts | InferAdapterProvides<A>,
              AddEdge<TDepGraph, AdapterProvidesName<A>, AdapterRequiresNames<A>>,
              AddLifetime<TLifetimeMap, AdapterProvidesName<A>, "singleton">,
              TOverrides,
              TParentProvides
            >
          : CaptivePort extends string
            ? CaptiveErrorMessage<
                AdapterProvidesName<A>,
                "Singleton",
                CaptivePort,
                LifetimeName<GetLifetimeLevel<TLifetimeMap, CaptivePort>>
              >
            : // Fallback (shouldn't happen)
              GraphBuilder<
                TProvides | InferAdapterProvides<A>,
                TRequires | InferAdapterRequires<A>,
                TAsyncPorts | InferAdapterProvides<A>,
                AddEdge<TDepGraph, AdapterProvidesName<A>, AdapterRequiresNames<A>>,
                AddLifetime<TLifetimeMap, AdapterProvidesName<A>, "singleton">,
                TOverrides,
                TParentProvides
              >
        : never;

/**
 * Checks if a union of new ports overlaps with existing keys.
 * Used for batch collision detection.
 *
 * @internal
 */
type BatchHasOverlap<NewPorts, ExistingPorts> = HasOverlap<NewPorts, ExistingPorts>;

/**
 * The return type of `GraphBuilder.provideMany()` with duplicate, cycle, and captive dependency detection.
 *
 * @internal
 */
type ProvideManyResult<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  A extends readonly AdapterAny[],
  TParentProvides = unknown,
> =
  // First check for duplicate providers
  BatchHasOverlap<InferManyProvides<A>, TProvides> extends true
    ? DuplicateErrorMessage<OverlappingPorts<InferManyProvides<A>, TProvides>>
    : // Then check for circular dependencies in the batch
      WouldAnyCreateCycle<TDepGraph, A> extends CircularDependencyError<infer Path>
      ? CircularErrorMessage<Path>
      : // Then check for captive dependencies in the batch
        WouldAnyBeCaptive<TLifetimeMap, A> extends CaptiveDependencyError<
            infer DN,
            infer DL,
            infer CP,
            infer CL
          >
        ? CaptiveErrorMessage<DN, DL, CP, CL>
        : // Success: return new builder with updated types
          GraphBuilder<
            TProvides | InferManyProvides<A>,
            TRequires | InferManyRequires<A>,
            TAsyncPorts | InferManyAsyncPorts<A>,
            AddManyEdges<TDepGraph, A>,
            AddManyLifetimes<TLifetimeMap, A>,
            TOverrides,
            TParentProvides
          >;

// =============================================================================
// MergeResult Helper Types
// =============================================================================
//
// The MergeResult type performs four validations in order:
// 1. Lifetime consistency - checks if same port has different lifetimes across graphs
// 2. Duplicate detection - checks if any port is provided by both graphs
// 3. Cycle detection - checks if merging creates any circular dependencies
// 4. Captive dependency detection - checks if merging creates any lifetime violations
//
// These helpers decompose the validation chain for better readability.
//

/**
 * The success result of merging two graphs.
 * Returns a new GraphBuilder with combined types from both graphs.
 * @internal
 */
type MergeResultSuccess<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  OProvides,
  ORequires,
  OAsyncPorts,
  ODepGraph,
  OLifetimeMap,
  OOverrides,
  TParentProvides = unknown,
> = GraphBuilder<
  TProvides | OProvides,
  TRequires | ORequires,
  TAsyncPorts | OAsyncPorts,
  MergeDependencyMaps<TDepGraph, ODepGraph>,
  MergeLifetimeMaps<TLifetimeMap, OLifetimeMap>,
  TOverrides | OOverrides,
  TParentProvides
>;

/**
 * Step 4: Check for captive dependencies in merged graph.
 * Returns error if a longer-lived service depends on a shorter-lived one.
 *
 * Uses `extends infer` to capture the result, then `IsNever<X> extends false`
 * to properly handle the case where detection returns `never` (no error).
 *
 * @internal
 */
type MergeCheckCaptive<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  OProvides,
  ORequires,
  OAsyncPorts,
  ODepGraph,
  OLifetimeMap,
  OOverrides,
  TParentProvides = unknown,
> =
  DetectCaptiveInMergedGraph<
    MergeDependencyMaps<TDepGraph, ODepGraph>,
    MergeLifetimeMaps<TLifetimeMap, OLifetimeMap>
  > extends infer TCaptiveResult
    ? IsNever<TCaptiveResult> extends false
      ? TCaptiveResult extends CaptiveDependencyError<infer DN, infer DL, infer CP, infer CL>
        ? CaptiveErrorMessage<DN, DL, CP, CL>
        : MergeResultSuccess<
            TProvides,
            TRequires,
            TAsyncPorts,
            TDepGraph,
            TLifetimeMap,
            TOverrides,
            OProvides,
            ORequires,
            OAsyncPorts,
            ODepGraph,
            OLifetimeMap,
            OOverrides,
            TParentProvides
          >
      : MergeResultSuccess<
          TProvides,
          TRequires,
          TAsyncPorts,
          TDepGraph,
          TLifetimeMap,
          TOverrides,
          OProvides,
          ORequires,
          OAsyncPorts,
          ODepGraph,
          OLifetimeMap,
          OOverrides,
          TParentProvides
        >
    : MergeResultSuccess<
        TProvides,
        TRequires,
        TAsyncPorts,
        TDepGraph,
        TLifetimeMap,
        TOverrides,
        OProvides,
        ORequires,
        OAsyncPorts,
        ODepGraph,
        OLifetimeMap,
        OOverrides,
        TParentProvides
      >;

/**
 * Step 3: Check for cycles in merged graph.
 * Returns error if merging would create circular dependencies.
 *
 * Uses `extends infer` to capture the result, then `IsNever<X> extends false`
 * to properly handle the case where detection returns `never` (no cycle).
 *
 * @internal
 */
type MergeCheckCycle<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  OProvides,
  ORequires,
  OAsyncPorts,
  ODepGraph,
  OLifetimeMap,
  OOverrides,
  TParentProvides = unknown,
> =
  DetectCycleInMergedGraph<MergeDependencyMaps<TDepGraph, ODepGraph>> extends infer TCycleResult
    ? IsNever<TCycleResult> extends false
      ? TCycleResult extends CircularDependencyError<infer Path>
        ? CircularErrorMessage<Path>
        : MergeCheckCaptive<
            TProvides,
            TRequires,
            TAsyncPorts,
            TDepGraph,
            TLifetimeMap,
            TOverrides,
            OProvides,
            ORequires,
            OAsyncPorts,
            ODepGraph,
            OLifetimeMap,
            OOverrides,
            TParentProvides
          >
      : MergeCheckCaptive<
          TProvides,
          TRequires,
          TAsyncPorts,
          TDepGraph,
          TLifetimeMap,
          TOverrides,
          OProvides,
          ORequires,
          OAsyncPorts,
          ODepGraph,
          OLifetimeMap,
          OOverrides,
          TParentProvides
        >
    : MergeCheckCaptive<
        TProvides,
        TRequires,
        TAsyncPorts,
        TDepGraph,
        TLifetimeMap,
        TOverrides,
        OProvides,
        ORequires,
        OAsyncPorts,
        ODepGraph,
        OLifetimeMap,
        OOverrides,
        TParentProvides
      >;

/**
 * Step 2: Check for duplicate ports.
 * Returns error if any port is provided by both graphs.
 * @internal
 */
type MergeCheckDuplicate<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  OProvides,
  ORequires,
  OAsyncPorts,
  ODepGraph,
  OLifetimeMap,
  OOverrides,
  TParentProvides = unknown,
> =
  HasOverlap<OProvides, TProvides> extends true
    ? DuplicateErrorMessage<OverlappingPorts<OProvides, TProvides>>
    : MergeCheckCycle<
        TProvides,
        TRequires,
        TAsyncPorts,
        TDepGraph,
        TLifetimeMap,
        TOverrides,
        OProvides,
        ORequires,
        OAsyncPorts,
        ODepGraph,
        OLifetimeMap,
        OOverrides,
        TParentProvides
      >;

/**
 * Step 1: Check for lifetime inconsistency.
 * Returns error if same port has different lifetimes in the two graphs.
 *
 * Uses `extends infer` to capture the result, then `IsNever<X> extends false`
 * to properly handle the case where detection returns `never` (no inconsistency).
 *
 * @internal
 */
type MergeCheckLifetime<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  OProvides,
  ORequires,
  OAsyncPorts,
  ODepGraph,
  OLifetimeMap,
  OOverrides,
  TParentProvides = unknown,
> =
  FindLifetimeInconsistency<TLifetimeMap, OLifetimeMap> extends infer TInconsistent
    ? IsNever<TInconsistent> extends false
      ? TInconsistent extends string
        ? LifetimeInconsistencyErrorMessage<
            TInconsistent,
            LifetimeName<GetLifetimeLevel<TLifetimeMap, TInconsistent>>,
            LifetimeName<GetLifetimeLevel<OLifetimeMap, TInconsistent>>
          >
        : MergeCheckDuplicate<
            TProvides,
            TRequires,
            TAsyncPorts,
            TDepGraph,
            TLifetimeMap,
            TOverrides,
            OProvides,
            ORequires,
            OAsyncPorts,
            ODepGraph,
            OLifetimeMap,
            OOverrides,
            TParentProvides
          >
      : MergeCheckDuplicate<
          TProvides,
          TRequires,
          TAsyncPorts,
          TDepGraph,
          TLifetimeMap,
          TOverrides,
          OProvides,
          ORequires,
          OAsyncPorts,
          ODepGraph,
          OLifetimeMap,
          OOverrides,
          TParentProvides
        >
    : MergeCheckDuplicate<
        TProvides,
        TRequires,
        TAsyncPorts,
        TDepGraph,
        TLifetimeMap,
        TOverrides,
        OProvides,
        ORequires,
        OAsyncPorts,
        ODepGraph,
        OLifetimeMap,
        OOverrides,
        TParentProvides
      >;

/**
 * The return type of `GraphBuilder.merge()` with validation.
 *
 * Performs four validations in order:
 * 1. Lifetime consistency - checks if same port has different lifetimes across graphs
 * 2. Duplicate detection - checks if any port is provided by both graphs
 * 3. Cycle detection - checks if merging creates any circular dependencies
 * 4. Captive dependency detection - checks if merging creates any lifetime violations
 *
 * @internal
 */
type MergeResult<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  OProvides,
  ORequires,
  OAsyncPorts,
  ODepGraph,
  OLifetimeMap,
  OOverrides,
  TParentProvides = unknown,
> = MergeCheckLifetime<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  OProvides,
  ORequires,
  OAsyncPorts,
  ODepGraph,
  OLifetimeMap,
  OOverrides,
  TParentProvides
>;

// =============================================================================
// Override Validation Types
// =============================================================================

/**
 * Error message for override validation when port doesn't exist in parent.
 *
 * @typeParam TPortName - The port name that was attempted to be overridden
 * @internal
 */
type InvalidOverrideErrorMessage<TPortName extends string> =
  `ERROR: Cannot override '${TPortName}' - port not provided by parent graph. Fix: Use .provide() to add new ports, or ensure parent provides '${TPortName}'.`;

/**
 * Extracts port names from a union of Port types.
 * Used for parent provides validation.
 * @internal
 */
type ExtractPortNamesFromUnion<T> = T extends { readonly __portName: infer N } ? N : never;

/**
 * Checks if a type is exactly `unknown`.
 *
 * Uses bidirectional assignability check: T is unknown iff
 * [T] extends [unknown] AND [unknown] extends [T].
 *
 * @internal
 */
type IsExactlyUnknown<T> = [T] extends [unknown] ? ([unknown] extends [T] ? true : false) : false;

/**
 * The return type of `GraphBuilder.override()` with parent validation.
 *
 * When TParentProvides is `unknown` (no parent specified), this behaves like
 * the standard ProvideResult but tracks the adapter as an override.
 *
 * When TParentProvides is a Port union (parent specified via forParent()),
 * this validates that the adapter's port exists in the parent before allowing
 * the override.
 *
 * @internal
 */
type OverrideResult<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  TParentProvides,
  A extends AdapterAny,
  TParentProvidesToPass = unknown,
> =
  // If no parent specified (TParentProvides is exactly unknown), allow any override
  IsExactlyUnknown<TParentProvides> extends true
    ? ProvideResult<
        TProvides,
        TRequires,
        TAsyncPorts,
        TDepGraph,
        TLifetimeMap,
        TOverrides | InferAdapterProvides<A>,
        A,
        TParentProvidesToPass
      >
    : // Parent specified - validate that the adapter's port exists in parent
      ExtractPortNamesFromUnion<
          InferAdapterProvides<A>
        > extends ExtractPortNamesFromUnion<TParentProvides>
      ? ProvideResult<
          TProvides,
          TRequires,
          TAsyncPorts,
          TDepGraph,
          TLifetimeMap,
          TOverrides | InferAdapterProvides<A>,
          A,
          TParentProvides
        >
      : InvalidOverrideErrorMessage<ExtractPortNamesFromUnion<InferAdapterProvides<A>> & string>;

/**
 * Type representing an empty dependency graph map.
 * Used as the initial state for compile-time cycle detection.
 *
 * IMPORTANT: Must be `{}` not `Record<string, never>`.
 * Using `Record<string, never>` causes index signature pollution when
 * intersected with specific properties. For example:
 * `Record<string, never> & { A: "B" }` makes `["A"]` return `never & "B"` = `never`.
 *
 * @internal
 */
type EmptyDependencyGraph = {};

/**
 * Type representing an empty lifetime map.
 * Used as the initial state for compile-time captive dependency detection.
 *
 * IMPORTANT: Must be `{}` not `Record<string, never>`.
 * See EmptyDependencyGraph for explanation.
 *
 * @internal
 */
type EmptyLifetimeMap = {};

// =============================================================================
// Validation Inspection Types
// =============================================================================

/**
 * Detailed validation state for a GraphBuilder.
 *
 * This type exposes intermediate validation information that is normally
 * hidden behind the single-error-message pattern. Useful for:
 * - Debugging complex graph configurations
 * - Understanding which validations pass vs fail
 * - Building custom validation tooling
 *
 * @example
 * ```typescript
 * const builder = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .provide(UserServiceAdapter);
 *
 * // Check validation state at type level
 * type State = InspectValidation<typeof builder>;
 * // {
 * //   hasDuplicates: false,
 * //   hasCycles: false,
 * //   hasCaptiveDeps: false,
 * //   unsatisfiedDeps: DatabasePort  // Missing!
 * // }
 * ```
 */
export type ValidationState<TProvides, TRequires, TDepGraph, TLifetimeMap> = {
  /** True if any port would have multiple adapters */
  readonly hasDuplicates: false; // Already checked at provide() time
  /** True if the dependency graph contains cycles */
  readonly hasCycles: false; // Already checked at provide() time
  /** True if any adapter captures a shorter-lived dependency */
  readonly hasCaptiveDeps: false; // Already checked at provide() time
  /** Ports that are required but not provided (never if all satisfied) */
  readonly unsatisfiedDeps: UnsatisfiedDependencies<TProvides, TRequires>;
  /** Current dependency graph for debugging */
  readonly depGraph: TDepGraph;
  /** Current lifetime map for debugging */
  readonly lifetimeMap: TLifetimeMap;
};

/**
 * Extracts validation state from a GraphBuilder for debugging purposes.
 *
 * Since GraphBuilder's provide() method already validates duplicates, cycles,
 * and captive dependencies at each call, those checks will always be false
 * for a successfully constructed builder. The primary use is inspecting
 * unsatisfied dependencies before calling build().
 *
 * @example
 * ```typescript
 * const builder = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .provide(UserServiceAdapter); // Requires Database, Logger
 *
 * type State = InspectValidation<typeof builder>;
 * // State.unsatisfiedDeps = DatabasePort (missing!)
 * ```
 */
export type InspectValidation<B> =
  B extends GraphBuilder<
    infer TProvides,
    infer TRequires,
    infer _TAsyncPorts,
    infer TDepGraph,
    infer TLifetimeMap,
    infer _TOverrides
  >
    ? ValidationState<TProvides, TRequires, TDepGraph, TLifetimeMap>
    : never;

// =============================================================================
// Simplified Type Utilities
// =============================================================================
//
// These types provide cleaner IDE tooltips by hiding internal phantom type
// parameters (TDepGraph, TLifetimeMap, etc.) that are implementation details.
//

/**
 * Extracts a simplified view of a GraphBuilder for inspection.
 *
 * This type hides internal phantom types (TDepGraph, TLifetimeMap, etc.) and
 * exposes only the information users typically care about:
 * - What ports are provided
 * - What dependencies are still unsatisfied
 * - Which ports have async factories
 * - Which ports are marked as overrides
 *
 * Use this for cleaner IDE tooltips when inspecting complex graphs.
 *
 * @example
 * ```typescript
 * const builder = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .provide(DatabaseAdapter);
 *
 * // Instead of seeing: GraphBuilder<LoggerPort | DatabasePort, CachePort, never, { Logger: never, Database: "Logger" }, ...>
 * // You see:
 * type View = SimplifiedView<typeof builder>;
 * // {
 * //   provides: LoggerPort | DatabasePort;
 * //   unsatisfied: CachePort;
 * //   asyncPorts: never;
 * //   overrides: never;
 * // }
 * ```
 */
export type SimplifiedView<B> =
  B extends GraphBuilder<
    infer TProvides,
    infer TRequires,
    infer TAsync,
    infer _TDepGraph,
    infer _TLifetimeMap,
    infer TOverrides,
    infer _TParentProvides
  >
    ? {
        readonly provides: TProvides;
        readonly unsatisfied: UnsatisfiedDependencies<TProvides, TRequires>;
        readonly asyncPorts: TAsync;
        readonly overrides: TOverrides;
      }
    : never;

/**
 * Extracts the `TProvides` type parameter from a GraphBuilder.
 *
 * Returns the union of all port types that have adapters registered.
 *
 * @example
 * ```typescript
 * const builder = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .provide(DatabaseAdapter);
 *
 * type Provided = InferBuilderProvides<typeof builder>;
 * // LoggerPort | DatabasePort
 * ```
 */
export type InferBuilderProvides<B> =
  B extends GraphBuilder<
    infer TProvides,
    infer _TRequires,
    infer _TAsync,
    infer _TDepGraph,
    infer _TLifetimeMap,
    infer _TOverrides,
    infer _TParentProvides
  >
    ? TProvides
    : never;

/**
 * Extracts the unsatisfied dependencies from a GraphBuilder.
 *
 * Returns the union of port types that are required by adapters but not
 * yet provided. Returns `never` when all dependencies are satisfied.
 *
 * @example
 * ```typescript
 * const builder = GraphBuilder.create()
 *   .provide(UserServiceAdapter); // Requires Logger, Database
 *
 * type Missing = InferBuilderUnsatisfied<typeof builder>;
 * // LoggerPort | DatabasePort
 *
 * const complete = builder
 *   .provide(LoggerAdapter)
 *   .provide(DatabaseAdapter);
 *
 * type MissingNow = InferBuilderUnsatisfied<typeof complete>;
 * // never (all satisfied)
 * ```
 */
export type InferBuilderUnsatisfied<B> =
  B extends GraphBuilder<
    infer TProvides,
    infer TRequires,
    infer _TAsync,
    infer _TDepGraph,
    infer _TLifetimeMap,
    infer _TOverrides,
    infer _TParentProvides
  >
    ? UnsatisfiedDependencies<TProvides, TRequires>
    : never;

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
 * ```typescript
 * // Type-level state is rich:
 * GraphBuilder<
 *   LoggerPort | DatabasePort,  // TProvides: what we have
 *   CachePort,                  // TRequires: what we still need
 *   never,                      // TAsyncPorts: none
 *   { Logger: never, Database: "Logger" },  // TDepGraph
 *   { Logger: 1, Database: 2 }              // TLifetimeMap
 * >
 *
 * // Runtime state is simple:
 * { adapters: [LoggerAdapter, DatabaseAdapter] }
 * ```
 *
 * ## Immutability
 *
 * Each `.provide()` call returns a NEW GraphBuilder instance with updated
 * type parameters. The original instance is not modified. This enables
 * "branching" - creating specialized graphs from a common base.
 *
 * ## Child Graphs with override()
 *
 * The `override()` method marks an adapter as replacing a parent's adapter:
 *
 * ```typescript
 * const childGraph = GraphBuilder.create()
 *   .override(MockLoggerAdapter)  // Replaces parent's Logger
 *   .provide(CacheAdapter)        // Adds new Cache port
 *   .build();
 * ```
 *
 * @typeParam TProvides - Union of all port types provided by adapters in this graph
 * @typeParam TRequires - Union of all port types required by adapters in this graph
 * @typeParam TAsyncPorts - Union of all async port types in this graph
 * @typeParam TDepGraph - **Internal** - Type-level dependency map for cycle detection. Ignore in IDE tooltips.
 * @typeParam TLifetimeMap - **Internal** - Type-level lifetime map for captive detection. Ignore in IDE tooltips.
 * @typeParam TOverrides - Union of port types that are overrides (not new provides)
 *
 * **Note on IDE Tooltips**: When hovering over a GraphBuilder variable, you may see
 * internal type parameters like `TDepGraph` and `TLifetimeMap`. These are used for
 * compile-time validation and can be safely ignored. Focus on `TProvides` (what ports
 * are available) and `TAsyncPorts` (which require async initialization).
 *
 * @example Creating a root graph
 * ```typescript
 * const graph = GraphBuilder.create()
 *   .provide(LoggerAdapter)    // Type changes to include Logger
 *   .provide(DatabaseAdapter)  // Type changes to include Database
 *   .build();                  // Validates all requirements met
 * ```
 *
 * @example Creating a child graph with overrides
 * ```typescript
 * const childGraph = GraphBuilder.create()
 *   .override(MockLoggerAdapter)  // Override parent's Logger
 *   .provide(CacheAdapter)        // Add new Cache port
 *   .build();
 * ```
 */
export class GraphBuilder<
  TProvides = never,
  TRequires = never,
  out TAsyncPorts = never,
  TDepGraph = EmptyDependencyGraph,
  TLifetimeMap = EmptyLifetimeMap,
  out TOverrides = never,
  TParentProvides = unknown,
> {
  /**
   * Type-level brand property for nominal typing.
   *
   * The `unique symbol` key ensures this type cannot be confused with
   * structurally similar objects. The tuple value carries all phantom
   * type parameters for type inference.
   *
   * @internal
   */
  declare private readonly [__graphBuilderBrand]: [
    TProvides,
    TRequires,
    TAsyncPorts,
    TDepGraph,
    TLifetimeMap,
    TOverrides,
    TParentProvides,
  ];

  /**
   * Runtime brand marker for GraphBuilder instances.
   * @internal
   */
  private readonly [GRAPH_BUILDER_BRAND] = true as const;

  // ═══════════════════════════════════════════════════════════════════════════
  // PHANTOM TYPE PROPERTIES
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // These properties are declared with `declare` which means they exist ONLY
  // at the type level - there is no runtime code generated for them.
  //
  // WHY PHANTOM TYPES?
  //
  // They enable TypeScript to infer the current state of the builder from
  // method return types, without any runtime overhead. When you hover over
  // a builder in your IDE, you can see exactly what ports are provided,
  // required, etc.
  //

  /**
   * Phantom type property tracking provided ports.
   *
   * As adapters are added, this grows: `never` → `LoggerPort` → `LoggerPort | DatabasePort`
   *
   * @internal
   */
  declare readonly __provides: TProvides;

  /**
   * Phantom type property tracking required ports.
   *
   * As adapters are added, this accumulates all their dependencies.
   * On `.build()`, we check that `TRequires ⊆ TProvides`.
   *
   * @internal
   */
  declare readonly __requires: TRequires;

  /**
   * Phantom type property tracking async ports.
   *
   * Ports with async factories require special handling at runtime
   * (must call `container.initialize()` before sync resolution).
   *
   * @internal
   */
  declare readonly __asyncPorts: TAsyncPorts;

  /**
   * Phantom type property for compile-time dependency graph.
   *
   * Structure: `{ [PortName]: RequiredPortNames }`
   * - Used for circular dependency detection via DFS at type level
   * - Each entry maps a port to its direct dependencies
   *
   * @example
   * ```typescript
   * // If Database depends on Logger:
   * { Logger: never, Database: "Logger" }
   * ```
   *
   * @internal
   */
  declare readonly __depGraph: TDepGraph;

  /**
   * Phantom type property for compile-time lifetime map.
   *
   * Structure: `{ [PortName]: 1 | 2 | 3 }`
   * - 1 = Singleton, 2 = Scoped, 3 = Transient
   * - Used for captive dependency detection
   *
   * @example
   * ```typescript
   * // Logger is singleton, Database is scoped:
   * { Logger: 1, Database: 2 }
   * ```
   *
   * @internal
   */
  declare readonly __lifetimeMap: TLifetimeMap;

  /**
   * Phantom type property for compile-time override tracking.
   *
   * Tracks which ports are marked as overrides (via `.override()`)
   * vs new provides (via `.provide()`).
   *
   * @internal
   */
  declare readonly __overrides: TOverrides;

  /**
   * Phantom type property for compile-time parent graph tracking.
   *
   * When using `forParent()`, this tracks what ports the parent provides,
   * enabling compile-time validation that `override()` calls only target
   * ports that actually exist in the parent.
   *
   * When `unknown` (the default), no parent validation is performed.
   *
   * @internal
   */
  declare readonly __parentProvides: TParentProvides;

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC PHANTOM SHORTCUTS
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // These properties provide convenient access to commonly-needed type information
  // without requiring the user to use utility types like InferBuilderProvides.
  //
  // Access via: typeof builder.$provides, typeof builder.$unsatisfied
  //

  /**
   * Phantom property exposing the provided ports union.
   *
   * Use `typeof builder.$provides` to get the union of all provided ports
   * without needing the `InferBuilderProvides` utility type.
   *
   * @example
   * ```typescript
   * const builder = GraphBuilder.create()
   *   .provide(LoggerAdapter)
   *   .provide(DatabaseAdapter);
   *
   * type Provided = typeof builder.$provides;
   * // LoggerPort | DatabasePort
   * ```
   */
  declare readonly $provides: TProvides;

  /**
   * Phantom property exposing unsatisfied dependencies.
   *
   * Use `typeof builder.$unsatisfied` to get the union of ports that are
   * required but not yet provided. Returns `never` when complete.
   *
   * @example
   * ```typescript
   * const builder = GraphBuilder.create()
   *   .provide(UserServiceAdapter); // Requires Logger
   *
   * type Missing = typeof builder.$unsatisfied;
   * // LoggerPort
   * ```
   */
  declare readonly $unsatisfied: UnsatisfiedDependencies<TProvides, TRequires>;

  /**
   * The readonly array of registered adapters.
   * Uses AdapterAny for structural compatibility with all adapter types.
   */
  readonly adapters: readonly AdapterAny[];

  /**
   * The set of port names marked as overrides.
   * Used at runtime to distinguish overrides from extensions.
   */
  readonly overridePortNames: ReadonlySet<string>;

  /**
   * Private constructor to enforce factory method pattern.
   * Uses AdapterAny for structural compatibility with all adapter types.
   * @internal
   */
  private constructor(
    adapters: readonly AdapterAny[],
    overridePortNames: ReadonlySet<string> = new Set()
  ) {
    // Freeze the adapters array for deep immutability
    this.adapters = Object.freeze([...adapters]);
    this.overridePortNames = overridePortNames;
    Object.freeze(this);
  }

  /**
   * Creates a new empty GraphBuilder.
   */
  static create(): GraphBuilder<
    never,
    never,
    never,
    EmptyDependencyGraph,
    EmptyLifetimeMap,
    never,
    unknown
  > {
    return new GraphBuilder([], new Set());
  }

  /**
   * Creates a new GraphBuilder for building a child graph with parent-aware validation.
   *
   * Use this when creating child containers where you want compile-time validation
   * that `override()` calls target ports that actually exist in the parent graph.
   *
   * Without `forParent()`, `override()` allows overriding any port (validation
   * happens at runtime when the child container is created).
   *
   * With `forParent()`, `override()` validates at compile-time that the port
   * exists in the parent, catching errors earlier.
   *
   * @example Compile-time override validation
   * ```typescript
   * const parentGraph = GraphBuilder.create()
   *   .provide(LoggerAdapter)
   *   .provide(DatabaseAdapter)
   *   .build();
   *
   * // With forParent - compile-time validation
   * const childBuilder = GraphBuilder.forParent(parentGraph)
   *   .override(MockLoggerAdapter)    // OK - Logger exists in parent
   *   .override(MockCacheAdapter);    // ERROR - Cache not in parent!
   *   // Type error: "ERROR: Cannot override 'Cache' - port not provided by parent graph..."
   *
   * // Without forParent - runtime validation only
   * const childBuilder2 = GraphBuilder.create()
   *   .override(MockLoggerAdapter)    // OK at compile time
   *   .override(MockCacheAdapter);    // OK at compile time (error at runtime)
   * ```
   *
   * @param _parent - The parent graph (used only for type inference)
   * @returns A new GraphBuilder with parent-aware override validation
   */
  static forParent<TParentProvides, TParentAsync, TParentOverrides>(
    _parent: Graph<TParentProvides, TParentAsync, TParentOverrides>
  ): GraphBuilder<
    never,
    never,
    never,
    EmptyDependencyGraph,
    EmptyLifetimeMap,
    never,
    TParentProvides
  > {
    // The parent parameter is only used for type inference.
    // At runtime, we just create an empty builder.
    return new GraphBuilder([], new Set());
  }

  /**
   * Registers an adapter with the graph.
   *
   * Performs compile-time validation for:
   * - Duplicate detection (same port provided twice)
   * - Circular dependency detection (A → B → C → A)
   * - Captive dependency detection (singleton depending on scoped)
   *
   * Reports ALL validation errors at once, not just the first one.
   * This provides better developer experience by showing the full picture
   * of what's wrong with a graph configuration.
   *
   * @example Single adapter
   * ```typescript
   * const builder = GraphBuilder.create()
   *   .provide(LoggerAdapter)
   *   .provide(DatabaseAdapter);
   * ```
   *
   * @example Multiple errors shown at once
   * ```typescript
   * // If an adapter has multiple issues, all are reported:
   * // "Multiple validation errors:
   * //   1. ERROR: Duplicate adapter for 'Logger'...
   * //   2. ERROR: Circular dependency: A -> B -> A..."
   * ```
   *
   * @see provideFast - For single-error short-circuit behavior (faster compilation)
   */
  provide<A extends AdapterAny>(
    adapter: A
  ): ProvideResultAllErrors<
    TProvides,
    TRequires,
    TAsyncPorts,
    TDepGraph,
    TLifetimeMap,
    TOverrides,
    A,
    TParentProvides
  > {
    // Runtime: create new GraphBuilder with the adapter added.
    // The conditional return type handles both success (GraphBuilder) and
    // error (template literal string) cases at the type level.
    // Cast through unknown because the return type can be either GraphBuilder or string.
    return new GraphBuilder(
      [...this.adapters, adapter],
      this.overridePortNames
    ) as unknown as ProvideResultAllErrors<
      TProvides,
      TRequires,
      TAsyncPorts,
      TDepGraph,
      TLifetimeMap,
      TOverrides,
      A,
      TParentProvides
    >;
  }

  /**
   * Registers an adapter with short-circuit error reporting.
   *
   * Unlike `provide()` which reports all errors at once, `provideFast()`
   * stops at the first validation error. This results in slightly faster
   * type checking but requires fix-and-retry cycles for multiple errors.
   *
   * ## When to Use
   *
   * - **Large graphs**: When compile-time performance matters
   * - **Simple fixes**: When you expect only one error at a time
   * - **Iterative development**: When you prefer fixing one issue at a time
   *
   * ## Trade-offs
   *
   * | Aspect | provide() | provideFast() |
   * |--------|-----------|---------------|
   * | Errors | All at once | One at a time |
   * | Speed | Evaluates all checks | Short-circuits on first error |
   * | Use case | Default, debugging | Performance-critical type checking |
   *
   * @example
   * ```typescript
   * const builder = GraphBuilder.create()
   *   .provideFast(LoggerAdapter)
   *   .provideFast(DatabaseAdapter);
   * ```
   */
  provideFast<A extends AdapterAny>(
    adapter: A
  ): ProvideResult<TProvides, TRequires, TAsyncPorts, TDepGraph, TLifetimeMap, TOverrides, A> {
    return new GraphBuilder([...this.adapters, adapter], this.overridePortNames) as ProvideResult<
      TProvides,
      TRequires,
      TAsyncPorts,
      TDepGraph,
      TLifetimeMap,
      TOverrides,
      A
    >;
  }

  /**
   * Registers an async adapter with the graph.
   * Performs compile-time duplicate, circular, and captive dependency detection.
   */
  provideAsync<A extends AdapterAny & { readonly factoryKind: "async" }>(
    adapter: A
  ): ProvideAsyncResult<TProvides, TRequires, TAsyncPorts, TDepGraph, TLifetimeMap, TOverrides, A> {
    return new GraphBuilder(
      [...this.adapters, adapter],
      this.overridePortNames
    ) as ProvideAsyncResult<
      TProvides,
      TRequires,
      TAsyncPorts,
      TDepGraph,
      TLifetimeMap,
      TOverrides,
      A
    >;
  }

  /**
   * Registers multiple adapters with the graph in a batch.
   * Performs compile-time duplicate, circular, and captive dependency detection.
   */
  provideMany<const A extends readonly AdapterAny[]>(
    adapters: A
  ): ProvideManyResult<TProvides, TRequires, TAsyncPorts, TDepGraph, TLifetimeMap, TOverrides, A> {
    return new GraphBuilder(
      [...this.adapters, ...adapters],
      this.overridePortNames
    ) as ProvideManyResult<
      TProvides,
      TRequires,
      TAsyncPorts,
      TDepGraph,
      TLifetimeMap,
      TOverrides,
      A
    >;
  }

  /**
   * Registers an adapter as an override for a parent container's adapter.
   *
   * Use this when building a child graph to replace a parent's adapter.
   * Overrides are like `provide()` but marked for replacement rather than extension.
   *
   * ## Compile-Time Validation
   *
   * When using `GraphBuilder.forParent(parentGraph)`, this method validates
   * at compile-time that the port exists in the parent. If you use
   * `GraphBuilder.create()` without a parent, validation happens at runtime.
   *
   * @example With compile-time validation (recommended)
   * ```typescript
   * const parentGraph = GraphBuilder.create()
   *   .provide(LoggerAdapter)
   *   .build();
   *
   * // Compile-time validation enabled
   * const childBuilder = GraphBuilder.forParent(parentGraph)
   *   .override(MockLoggerAdapter)  // OK - Logger exists in parent
   *   .override(MockCacheAdapter);  // ERROR - Cache not in parent!
   * ```
   *
   * @example Without compile-time validation (runtime validation only)
   * ```typescript
   * // No parent specified - validation at runtime
   * const childFragment = GraphBuilder.create()
   *   .override(MockLoggerAdapter)  // OK at compile time
   *   .provide(CacheAdapter)
   *   .buildFragment();
   * ```
   *
   * @param adapter - The adapter to mark as an override
   * @returns A new GraphBuilder with the adapter marked as override
   */
  override<A extends AdapterAny>(
    adapter: A
  ): OverrideResult<
    TProvides,
    TRequires,
    TAsyncPorts,
    TDepGraph,
    TLifetimeMap,
    TOverrides,
    TParentProvides,
    A
  > {
    // Add to overridePortNames set
    const newOverrides = new Set(this.overridePortNames);
    newOverrides.add(adapter.provides.__portName);

    return new GraphBuilder([...this.adapters, adapter], newOverrides) as OverrideResult<
      TProvides,
      TRequires,
      TAsyncPorts,
      TDepGraph,
      TLifetimeMap,
      TOverrides,
      TParentProvides,
      A
    >;
  }

  /**
   * Merges another GraphBuilder into this one.
   *
   * Performs compile-time validation for:
   * 1. Duplicate ports - fails if any port is provided by both graphs
   * 2. Circular dependencies - detects cycles that form when graphs are combined
   * 3. Captive dependencies - detects lifetime violations in the merged graph
   */
  merge<OProvides, ORequires, OAsyncPorts, ODepGraph, OLifetimeMap, OOverrides>(
    other: GraphBuilder<OProvides, ORequires, OAsyncPorts, ODepGraph, OLifetimeMap, OOverrides>
  ): MergeResult<
    TProvides,
    TRequires,
    TAsyncPorts,
    TDepGraph,
    TLifetimeMap,
    TOverrides,
    OProvides,
    ORequires,
    OAsyncPorts,
    ODepGraph,
    OLifetimeMap,
    OOverrides
  > {
    // Merge override port names from both builders
    const mergedOverrides = new Set([...this.overridePortNames, ...other.overridePortNames]);

    return new GraphBuilder([...this.adapters, ...other.adapters], mergedOverrides) as MergeResult<
      TProvides,
      TRequires,
      TAsyncPorts,
      TDepGraph,
      TLifetimeMap,
      TOverrides,
      OProvides,
      ORequires,
      OAsyncPorts,
      ODepGraph,
      OLifetimeMap,
      OOverrides
    >;
  }

  /**
   * Returns a runtime snapshot of the current graph state for debugging.
   *
   * This method provides visibility into the graph's structure at runtime,
   * complementing the compile-time validation. Use it to:
   *
   * - Debug complex graph configurations
   * - Understand dependency relationships
   * - Check if the graph approaches the MaxDepth limit (30)
   * - Verify which requirements are still unsatisfied
   *
   * @returns A frozen object with graph metadata and a human-readable summary
   *
   * @example Basic usage
   * ```typescript
   * const builder = GraphBuilder.create()
   *   .provide(LoggerAdapter)
   *   .provide(DatabaseAdapter);
   *
   * const info = builder.inspect();
   * console.log(info.summary);
   * // "Graph(2 adapters, 0 unsatisfied): Logger (singleton), Database (scoped)"
   * ```
   *
   * @example Checking depth before build
   * ```typescript
   * const builder = createComplexGraph();
   * const info = builder.inspect();
   *
   * if (info.maxChainDepth > 25) {
   *   console.warn(
   *     `Deep dependency chain (${info.maxChainDepth}). ` +
   *     `Consider splitting into subgraphs or using buildFragment().`
   *   );
   * }
   * ```
   */
  inspect(): GraphInspection {
    // Delegate to inspectGraph, treating the builder state as a graph-like structure
    return inspectGraph({
      adapters: this.adapters,
      overridePortNames: this.overridePortNames,
    });
  }

  /**
   * Builds the dependency graph after validating all dependencies are satisfied.
   *
   * @remarks
   * If dependencies are missing, the return type becomes a template literal error
   * message instead of a Graph. This produces clear compile-time errors when you
   * try to use the result.
   *
   * @example
   * ```typescript
   * // When Logger is missing, return type is:
   * // "ERROR: Missing adapters for Logger. Call .provide() first."
   * //
   * // Trying to use this result produces:
   * // Type '"ERROR: Missing adapters for Logger..."' is not assignable to type 'Graph<...>'
   * ```
   */
  build(): [UnsatisfiedDependencies<TProvides, TRequires>] extends [never]
    ? Graph<TProvides, TAsyncPorts, TOverrides>
    : `ERROR: Missing adapters for ${ExtractPortNames<UnsatisfiedDependencies<TProvides, TRequires>>}. Call .provide() first.` {
    // Phantom type properties (__provides, __asyncPorts, __overrides) exist only at compile-time.
    // The runtime object needs the adapters array and overridePortNames set.
    // The conditional return type is only for compile-time validation.
    // At runtime, this always returns a Graph (even if incomplete - that's a type-level error).
    return Object.freeze({
      adapters: this.adapters,
      overridePortNames: this.overridePortNames,
    }) as [UnsatisfiedDependencies<TProvides, TRequires>] extends [never]
      ? Graph<TProvides, TAsyncPorts, TOverrides>
      : `ERROR: Missing adapters for ${ExtractPortNames<UnsatisfiedDependencies<TProvides, TRequires>>}. Call .provide() first.`;
  }

  /**
   * Builds a graph fragment for child containers.
   *
   * Unlike `build()`, this method does NOT validate that all dependencies are
   * satisfied internally. Child graphs can have adapters that require ports
   * provided by the parent container.
   *
   * @remarks
   * Use this when creating child graphs where dependencies will be satisfied
   * by the parent container at runtime.
   *
   * @example
   * ```typescript
   * // ConfigAdapter requires LoggerPort which parent provides
   * const ConfigAdapter = createAdapter({
   *   provides: ConfigPort,
   *   requires: [LoggerPort],  // Will come from parent
   *   factory: deps => ({ getValue: () => deps.Logger.log('config') })
   * });
   *
   * // Use buildFragment() when dependencies come from parent
   * const childGraph = GraphBuilder.create()
   *   .provide(ConfigAdapter)
   *   .buildFragment();  // No error about missing Logger
   *
   * const child = container.createChild(childGraph);
   * ```
   */
  buildFragment(): Graph<TProvides, TAsyncPorts, TOverrides> {
    return Object.freeze({
      adapters: this.adapters,
      overridePortNames: this.overridePortNames,
    }) as Graph<TProvides, TAsyncPorts, TOverrides>;
  }
}
