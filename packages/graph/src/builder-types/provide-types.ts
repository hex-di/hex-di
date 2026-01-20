/**
 * Provide result types for GraphBuilder.
 *
 * This module contains all compile-time validation types for the provide(),
 * provideFast(), provideAsync(), and provideMany() methods.
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
  HasOverlap,
  OverlappingPorts,
  CircularDependencyError,
  WouldCreateCycle,
  AddEdge,
  AdapterProvidesName,
  AdapterRequiresNames,
  BuildCyclePath,
  AddManyEdges,
  WouldAnyCreateCycle,
  LifetimeLevel,
  AddLifetime,
  GetLifetimeLevel,
  FindAnyCaptiveDependency,
  CaptiveDependencyError,
  LifetimeName,
  AddManyLifetimes,
  WouldAnyBeCaptive,
  DuplicateErrorMessage,
  CircularErrorMessage,
  CaptiveErrorMessage,
  FilterNever,
  MultiErrorMessage,
  DefaultMaxDepth,
  HasDuplicatesInBatch,
  FindBatchDuplicate,
  BatchDuplicateErrorMessage,
  TransformLazyToOriginal,
} from "../validation/index.js";
import type { IsNever } from "../common/index.js";
import type { GraphBuilder } from "../graph/builder.js";
import type { DirectAdapterLifetime } from "./empty-state.js";

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
 * - TRequires grows by the new requirements (lazy ports transformed to original)
 * - TDepGraph adds the new edge
 * - TLifetimeMap adds the new port's lifetime
 *
 * Note: Lazy requirements (`lazyPort(X)`) are transformed to their original ports (`X`)
 * so the dependency graph tracks the actual requirements for "missing adapters" errors.
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
  TRequires | TransformLazyToOriginal<InferAdapterRequires<TAdapter>>,
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
 *    |
 *    v
 * +---------------------------+
 * | 1. CheckDuplicate        | -> DuplicateErrorMessage or continue
 * +-----------+---------------+
 *             v
 * +---------------------------+
 * | 2. CheckCycleDependency  | -> CircularErrorMessage or continue
 * +-----------+---------------+
 *             v
 * +---------------------------+
 * | 3. CheckCaptiveDependency| -> CaptiveErrorMessage or continue
 * +-----------+---------------+
 *             v
 * +---------------------------+
 * | 4. ProvideResultSuccess  | -> GraphBuilder<updated>
 * +---------------------------+
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
        // Note: Lazy requirements are transformed to original ports
        GraphBuilder<
          TProvides | InferAdapterProvides<TAdapter>,
          TRequires | TransformLazyToOriginal<InferAdapterRequires<TAdapter>>,
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
              TRequires | TransformLazyToOriginal<InferAdapterRequires<TAdapter>>,
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
                TRequires | TransformLazyToOriginal<InferAdapterRequires<TAdapter>>,
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
  // Step 0: Check for intra-batch duplicates (same port provided twice in the batch)
  HasDuplicatesInBatch<TAdapters> extends true
    ? BatchDuplicateErrorMessage<FindBatchDuplicate<TAdapters>>
    : // Step 1: Check for batch-vs-graph duplicates
      BatchHasOverlap<InferManyProvides<TAdapters>, TProvides> extends true
      ? DuplicateErrorMessage<OverlappingPorts<InferManyProvides<TAdapters>, TProvides>>
      : // Step 2: Check for circular dependencies in the batch
        WouldAnyCreateCycle<TDepGraph, TAdapters, TMaxDepth> extends CircularDependencyError<
            infer Path
          >
        ? CircularErrorMessage<Path>
        : // Step 3: Check for captive dependencies in the batch
          WouldAnyBeCaptive<TLifetimeMap, TAdapters> extends CaptiveDependencyError<
              infer DN,
              infer DL,
              infer CP,
              infer CL
            >
          ? CaptiveErrorMessage<DN, DL, CP, CL>
          : // Success: return new builder with updated types
            // Note: Lazy requirements are transformed to original ports
            GraphBuilder<
              TProvides | InferManyProvides<TAdapters>,
              TRequires | TransformLazyToOriginal<InferManyRequires<TAdapters>>,
              TAsyncPorts | InferManyAsyncPorts<TAdapters>,
              AddManyEdges<TDepGraph, TAdapters>,
              AddManyLifetimes<TLifetimeMap, TAdapters>,
              TOverrides,
              TParentProvides,
              TMaxDepth
            >;
