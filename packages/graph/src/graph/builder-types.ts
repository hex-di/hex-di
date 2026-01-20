/**
 * Type-level validation types for GraphBuilder.
 *
 * This module contains all compile-time validation types used by the GraphBuilder
 * class. Separating these from the class implementation improves maintainability
 * and reduces the cognitive load when working with the GraphBuilder class itself.
 *
 * ## Module Organization
 *
 * Types are grouped by the operation they support:
 * - **Provide Types**: ProvideResult, CollectAdapterErrors, ProvideResultAllErrors
 * - **Merge Types**: MergeResult, MergeCheckLifetime, MergeCheckDuplicate, etc.
 * - **Override Types**: OverrideResult, InvalidOverrideErrorMessage
 * - **Inspection Types**: ValidationState, InspectValidation, SimplifiedView
 *
 * @packageDocumentation
 */

import type {
  AdapterAny,
  InferAdapterProvides,
  InferAdapterRequires,
  InferManyProvides,
  InferManyRequires,
  InferManyAsyncPorts,
} from "../adapter/index.js";
import type {
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
  DetectCycleInMergedGraph,
  DuplicateErrorMessage,
  CircularErrorMessage,
  CaptiveErrorMessage,
  LifetimeInconsistencyErrorMessage,
  FilterNever,
  MultiErrorMessage,
  DefaultMaxDepth,
} from "../validation/index.js";
import type { IsNever } from "../common/index.js";
import type { GraphBuilder } from "./builder.js";

// =============================================================================
// Empty State Types
// =============================================================================

/**
 * Type representing an empty dependency graph map.
 * Used as the initial state for compile-time cycle detection.
 *
 * IMPORTANT: Must be `{}` not `Record<string, never>`.
 * Using `Record<string, never>` causes index signature pollution when
 * intersected with specific properties. For example:
 * `Record<string, never> & { A: "B" }` makes `["A"]` return `never & "B"` = `never`.
 */
export type EmptyDependencyGraph = {};

/**
 * Type representing an empty lifetime map.
 * Used as the initial state for compile-time captive dependency detection.
 *
 * IMPORTANT: Must be `{}` not `Record<string, never>`.
 * See EmptyDependencyGraph for explanation.
 */
export type EmptyLifetimeMap = {};

// =============================================================================
// Adapter Lifetime Extraction
// =============================================================================

/**
 * Extracts the lifetime directly from an adapter using property access.
 * This explicitly maps each literal to avoid inference issues with unions.
 * @internal
 */
export type DirectAdapterLifetime<TAdapter> = TAdapter extends { lifetime: "singleton" }
  ? "singleton"
  : TAdapter extends { lifetime: "scoped" }
    ? "scoped"
    : TAdapter extends { lifetime: "transient" }
      ? "transient"
      : "singleton";

// =============================================================================
// Provide Result Types
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
export type ProvideResultSuccess<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  TAdapter extends AdapterAny,
  TParentProvides,
  TMaxDepth extends number = DefaultMaxDepth,
> = GraphBuilder<
  TProvides | InferAdapterProvides<TAdapter>,
  TRequires | InferAdapterRequires<TAdapter>,
  TAsyncPorts,
  AddEdge<TDepGraph, AdapterProvidesName<TAdapter>, AdapterRequiresNames<TAdapter>>,
  AddLifetime<TLifetimeMap, AdapterProvidesName<TAdapter>, DirectAdapterLifetime<TAdapter>>,
  TOverrides,
  TParentProvides,
  TMaxDepth
>;

/**
 * Step 3: Captive dependency check.
 *
 * Checks if any required port has a shorter lifetime than the adapter.
 * Returns CaptiveErrorMessage on failure, ProvideResultSuccess on success.
 *
 * @internal
 */
export type CheckCaptiveDependency<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  TAdapter extends AdapterAny,
  TParentProvides,
  TMaxDepth extends number = DefaultMaxDepth,
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
          TParentProvides,
          TMaxDepth
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
            TParentProvides,
            TMaxDepth
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
export type CheckCycleDependency<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  TAdapter extends AdapterAny,
  TParentProvides,
  TMaxDepth extends number = DefaultMaxDepth,
> =
  WouldCreateCycle<
    TDepGraph,
    AdapterProvidesName<TAdapter>,
    AdapterRequiresNames<TAdapter>,
    TMaxDepth
  > extends true
    ? CircularErrorMessage<
        BuildCyclePath<
          AddEdge<TDepGraph, AdapterProvidesName<TAdapter>, AdapterRequiresNames<TAdapter>>,
          AdapterProvidesName<TAdapter>,
          AdapterRequiresNames<TAdapter>,
          TMaxDepth
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
        TParentProvides,
        TMaxDepth
      >;

/**
 * Step 1: Duplicate port check.
 *
 * Checks if the adapter provides a port that's already in the graph.
 * Returns DuplicateErrorMessage on failure, proceeds to CheckCycleDependency on success.
 *
 * @internal
 */
export type CheckDuplicate<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  TAdapter extends AdapterAny,
  TParentProvides,
  TMaxDepth extends number = DefaultMaxDepth,
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
        TParentProvides,
        TMaxDepth
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
 * @typeParam TMaxDepth - Maximum cycle detection depth (default: DefaultMaxDepth)
 *
 * @internal
 */
export type ProvideResult<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  TAdapter extends AdapterAny,
  TParentProvides = unknown,
  TMaxDepth extends number = DefaultMaxDepth,
> = CheckDuplicate<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  TAdapter,
  TParentProvides,
  TMaxDepth
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
 * @typeParam TDepGraph - Current type-level dependency graph
 * @typeParam TLifetimeMap - Current type-level lifetime map
 * @typeParam TAdapter - The adapter being added
 * @typeParam TMaxDepth - Maximum cycle detection depth (default: DefaultMaxDepth)
 *
 * @internal
 */
export type CollectAdapterErrors<
  TProvides,
  TDepGraph,
  TLifetimeMap,
  TAdapter extends AdapterAny,
  TMaxDepth extends number = DefaultMaxDepth,
> = FilterNever<
  readonly [
    // Error 1: Duplicate detection
    HasOverlap<InferAdapterProvides<TAdapter>, TProvides> extends true
      ? DuplicateErrorMessage<OverlappingPorts<InferAdapterProvides<TAdapter>, TProvides>>
      : never,
    // Error 2: Circular dependency detection
    WouldCreateCycle<
      TDepGraph,
      AdapterProvidesName<TAdapter>,
      AdapterRequiresNames<TAdapter>,
      TMaxDepth
    > extends true
      ? CircularErrorMessage<
          BuildCyclePath<
            AddEdge<TDepGraph, AdapterProvidesName<TAdapter>, AdapterRequiresNames<TAdapter>>,
            AdapterProvidesName<TAdapter>,
            AdapterRequiresNames<TAdapter>,
            TMaxDepth
          >
        >
      : never,
    // Error 3: Captive dependency detection
    FindAnyCaptiveDependency<
      TLifetimeMap,
      LifetimeLevel<DirectAdapterLifetime<TAdapter>>,
      AdapterRequiresNames<TAdapter>
    > extends infer CaptivePort
      ? IsNever<CaptivePort> extends true
        ? never
        : CaptivePort extends string
          ? CaptiveErrorMessage<
              AdapterProvidesName<TAdapter>,
              LifetimeName<LifetimeLevel<DirectAdapterLifetime<TAdapter>>>,
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
 * @typeParam TAdapter - The adapter being added
 * @typeParam TParentProvides - Parent provides for forParent validation
 * @typeParam TMaxDepth - Maximum cycle detection depth (default: DefaultMaxDepth)
 *
 * @internal
 */
export type ProvideResultAllErrors<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  TAdapter extends AdapterAny,
  TParentProvides = unknown,
  TMaxDepth extends number = DefaultMaxDepth,
> =
  CollectAdapterErrors<
    TProvides,
    TDepGraph,
    TLifetimeMap,
    TAdapter,
    TMaxDepth
  > extends infer Errors extends readonly string[]
    ? Errors["length"] extends 0
      ? // No errors - return success (same as ProvideResult success case)
        GraphBuilder<
          TProvides | InferAdapterProvides<TAdapter>,
          TRequires | InferAdapterRequires<TAdapter>,
          TAsyncPorts,
          AddEdge<TDepGraph, AdapterProvidesName<TAdapter>, AdapterRequiresNames<TAdapter>>,
          AddLifetime<TLifetimeMap, AdapterProvidesName<TAdapter>, DirectAdapterLifetime<TAdapter>>,
          TOverrides,
          TParentProvides,
          TMaxDepth
        >
      : // Has errors - return multi-error message
        MultiErrorMessage<Errors>
    : never;

// =============================================================================
// Provide Async Result Types
// =============================================================================

/**
 * The return type of `GraphBuilder.provideAsync()` with duplicate, cycle, and captive dependency detection.
 *
 * Note: Async adapters are always singletons, so captive dependency check still applies.
 *
 * @internal
 */
export type ProvideAsyncResult<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  TAdapter extends AdapterAny & { readonly factoryKind: "async" },
  TParentProvides = unknown,
  TMaxDepth extends number = DefaultMaxDepth,
> =
  // First check for duplicate providers
  HasOverlap<InferAdapterProvides<TAdapter>, TProvides> extends true
    ? DuplicateErrorMessage<OverlappingPorts<InferAdapterProvides<TAdapter>, TProvides>>
    : // Then check for circular dependencies
      WouldCreateCycle<
          TDepGraph,
          AdapterProvidesName<TAdapter>,
          AdapterRequiresNames<TAdapter>,
          TMaxDepth
        > extends true
      ? CircularErrorMessage<
          BuildCyclePath<
            AddEdge<TDepGraph, AdapterProvidesName<TAdapter>, AdapterRequiresNames<TAdapter>>,
            AdapterProvidesName<TAdapter>,
            AdapterRequiresNames<TAdapter>,
            TMaxDepth
          >
        >
      : // Then check for captive dependencies (async adapters are always singleton = level 1)
        FindAnyCaptiveDependency<
            TLifetimeMap,
            1, // Async adapters are always singleton
            AdapterRequiresNames<TAdapter>
          > extends infer CaptivePort
        ? IsNever<CaptivePort> extends true
          ? // Success: return new builder with updated types
            GraphBuilder<
              TProvides | InferAdapterProvides<TAdapter>,
              TRequires | InferAdapterRequires<TAdapter>,
              TAsyncPorts | InferAdapterProvides<TAdapter>,
              AddEdge<TDepGraph, AdapterProvidesName<TAdapter>, AdapterRequiresNames<TAdapter>>,
              AddLifetime<TLifetimeMap, AdapterProvidesName<TAdapter>, "singleton">,
              TOverrides,
              TParentProvides,
              TMaxDepth
            >
          : CaptivePort extends string
            ? CaptiveErrorMessage<
                AdapterProvidesName<TAdapter>,
                "Singleton",
                CaptivePort,
                LifetimeName<GetLifetimeLevel<TLifetimeMap, CaptivePort>>
              >
            : // Fallback (shouldn't happen)
              GraphBuilder<
                TProvides | InferAdapterProvides<TAdapter>,
                TRequires | InferAdapterRequires<TAdapter>,
                TAsyncPorts | InferAdapterProvides<TAdapter>,
                AddEdge<TDepGraph, AdapterProvidesName<TAdapter>, AdapterRequiresNames<TAdapter>>,
                AddLifetime<TLifetimeMap, AdapterProvidesName<TAdapter>, "singleton">,
                TOverrides,
                TParentProvides,
                TMaxDepth
              >
        : never;

// =============================================================================
// Provide Many Result Types
// =============================================================================

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
export type ProvideManyResult<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  TAdapters extends readonly AdapterAny[],
  TParentProvides = unknown,
  TMaxDepth extends number = DefaultMaxDepth,
> =
  // First check for duplicate providers
  BatchHasOverlap<InferManyProvides<TAdapters>, TProvides> extends true
    ? DuplicateErrorMessage<OverlappingPorts<InferManyProvides<TAdapters>, TProvides>>
    : // Then check for circular dependencies in the batch
      WouldAnyCreateCycle<TDepGraph, TAdapters, TMaxDepth> extends CircularDependencyError<
          infer Path
        >
      ? CircularErrorMessage<Path>
      : // Then check for captive dependencies in the batch
        WouldAnyBeCaptive<TLifetimeMap, TAdapters> extends CaptiveDependencyError<
            infer DN,
            infer DL,
            infer CP,
            infer CL
          >
        ? CaptiveErrorMessage<DN, DL, CP, CL>
        : // Success: return new builder with updated types
          GraphBuilder<
            TProvides | InferManyProvides<TAdapters>,
            TRequires | InferManyRequires<TAdapters>,
            TAsyncPorts | InferManyAsyncPorts<TAdapters>,
            AddManyEdges<TDepGraph, TAdapters>,
            AddManyLifetimes<TLifetimeMap, TAdapters>,
            TOverrides,
            TParentProvides,
            TMaxDepth
          >;

// =============================================================================
// Merge Result Types
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
  TMaxDepth extends number = DefaultMaxDepth,
> = GraphBuilder<
  TProvides | OProvides,
  TRequires | ORequires,
  TAsyncPorts | OAsyncPorts,
  MergeDependencyMaps<TDepGraph, ODepGraph>,
  MergeLifetimeMaps<TLifetimeMap, OLifetimeMap>,
  TOverrides | OOverrides,
  TParentProvides,
  TMaxDepth
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
  TMaxDepth extends number = DefaultMaxDepth,
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
            TParentProvides,
            TMaxDepth
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
          TParentProvides,
          TMaxDepth
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
        TParentProvides,
        TMaxDepth
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
  TMaxDepth extends number = DefaultMaxDepth,
> =
  DetectCycleInMergedGraph<
    MergeDependencyMaps<TDepGraph, ODepGraph>,
    TMaxDepth
  > extends infer TCycleResult
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
            TParentProvides,
            TMaxDepth
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
          TParentProvides,
          TMaxDepth
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
        TParentProvides,
        TMaxDepth
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
  TMaxDepth extends number = DefaultMaxDepth,
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
        TParentProvides,
        TMaxDepth
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
  TMaxDepth extends number = DefaultMaxDepth,
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
            TParentProvides,
            TMaxDepth
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
          TParentProvides,
          TMaxDepth
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
        TParentProvides,
        TMaxDepth
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
export type MergeResult<
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
  TMaxDepth extends number = DefaultMaxDepth,
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
  TParentProvides,
  TMaxDepth
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
export type InvalidOverrideErrorMessage<TPortName extends string> =
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
export type OverrideResult<
  TProvides,
  TRequires,
  TAsyncPorts,
  TDepGraph,
  TLifetimeMap,
  TOverrides,
  TParentProvides,
  TAdapter extends AdapterAny,
  TParentProvidesToPass = unknown,
  TMaxDepth extends number = DefaultMaxDepth,
> =
  // If no parent specified (TParentProvides is exactly unknown), allow any override
  IsExactlyUnknown<TParentProvides> extends true
    ? ProvideResult<
        TProvides,
        TRequires,
        TAsyncPorts,
        TDepGraph,
        TLifetimeMap,
        TOverrides | InferAdapterProvides<TAdapter>,
        TAdapter,
        TParentProvidesToPass,
        TMaxDepth
      >
    : // Parent specified - validate that the adapter's port exists in parent
      ExtractPortNamesFromUnion<
          InferAdapterProvides<TAdapter>
        > extends ExtractPortNamesFromUnion<TParentProvides>
      ? ProvideResult<
          TProvides,
          TRequires,
          TAsyncPorts,
          TDepGraph,
          TLifetimeMap,
          TOverrides | InferAdapterProvides<TAdapter>,
          TAdapter,
          TParentProvides,
          TMaxDepth
        >
      : InvalidOverrideErrorMessage<
          ExtractPortNamesFromUnion<InferAdapterProvides<TAdapter>> & string
        >;

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
