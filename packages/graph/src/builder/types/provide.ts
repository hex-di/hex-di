/**
 * Provide result types for GraphBuilder.
 *
 * This module consolidates all compile-time validation types for the provide(),
 * provideFirstError(), provideAsync(), and provideMany() methods.
 *
 * ## Validation Pipeline Order
 *
 * Each provide operation runs validations in this order:
 * 1. **Duplicate Check** (O(1)): Fastest check, prevents confusing downstream errors
 * 2. **Cycle Check** (O(depth)): Requires no duplicates; must check before captive
 * 3. **Captive Check** (O(requires)): Requires acyclic graph for lifetime analysis
 *
 * ## Type-Level Complexity Rating
 *
 * | Type                      | Depth | Performance Impact |
 * |---------------------------|-------|-------------------|
 * | `ProvideResult`           | ~4    | Low               |
 * | `ProvideResultAllErrors`  | ~4    | Medium            |
 * | `ProvideManyResult`       | ~5    | High (batch)      |
 *
 * @packageDocumentation
 */

import type {
  AdapterConstraint,
  InferAdapterProvides,
  InferAdapterRequires,
  InferManyProvides,
  InferManyRequires,
  InferManyAsyncPorts,
} from "@hex-di/core";
import type {
  HasOverlap,
  OverlappingPorts,
  WouldCreateCycle,
  AddEdge,
  AdapterProvidesName,
  AdapterRequiresNames,
  BuildCyclePath,
  LifetimeLevel,
  AddLifetime,
  GetLifetimeLevel,
  FindAnyCaptiveDependency,
  FindReverseCaptiveDependency,
  LifetimeName,
  DuplicateErrorMessage,
  CircularErrorMessage,
  CaptiveErrorMessage,
  ReverseCaptiveErrorMessage,
  SelfDependencyErrorMessage,
  TransformLazyToOriginal,
  TransformLazyPortNamesToOriginal,
  CircularDependencyError,
  AddManyEdges,
  WouldAnyCreateCycle,
  AddManyLifetimes,
  WouldAnyBeCaptive,
  WouldAnyCreateReverseCaptive,
  HasDuplicatesInBatch,
  FindBatchDuplicate,
  BatchDuplicateErrorMessage,
  FilterNever,
  MultiErrorMessage,
  SINGLETON_LEVEL,
  HasSelfDependency,
  HasSelfDependencyInBatch,
  FindSelfDependencyPort,
  IsDepthExceeded,
  ExtractDepthExceededPort,
  DepthLimitError,
  HandleForwardCaptiveResult,
  HandleReverseCaptiveResult,
} from "../../validation/types/index.js";
import type { IsNever } from "@hex-di/core";
import type { GraphBuilderSignature } from "./builder-signature.js";
import type {
  DirectAdapterLifetime,
  AnyBuilderInternals,
  GetDepGraph,
  GetLifetimeMap,
  GetMaxDepth,
  GetExtendedDepth,
  WithDepGraphAndLifetimeMap,
  WithDepGraphLifetimeAndWarning,
  WithUncheckedUsed,
} from "./state.js";

// =============================================================================
// Sync Provide Result Types
// =============================================================================

/**
 * Constructs a new GraphBuilder with updated type parameters after successful validation.
 *
 * This type encapsulates the "success case" - creating a GraphBuilder with:
 * - TProvides grows by the new port
 * - TRequires grows by the new requirements (lazy ports transformed to original)
 * - TInternalState updated with new dep graph edge and lifetime entry
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
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  TAdapter extends AdapterConstraint,
> = GraphBuilderSignature<
  TProvides | InferAdapterProvides<TAdapter>,
  TRequires | TransformLazyToOriginal<InferAdapterRequires<TAdapter>>,
  TAsyncPorts,
  TOverrides,
  WithDepGraphAndLifetimeMap<
    TInternalState,
    AddEdge<
      GetDepGraph<TInternalState>,
      AdapterProvidesName<TAdapter>,
      AdapterRequiresNames<TAdapter>
    >,
    AddLifetime<
      GetLifetimeMap<TInternalState>,
      AdapterProvidesName<TAdapter>,
      DirectAdapterLifetime<TAdapter>
    >
  >
>;

/**
 * Constructs a new GraphBuilder with updated type parameters AND a depth-exceeded warning.
 *
 * This is used when depth limit was exceeded but `withUnsafeDepthOverride()` was enabled,
 * allowing validation to proceed while recording the warning for tooling to detect.
 *
 * @internal
 */
export type ProvideResultSuccessWithDepthWarning<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  TAdapter extends AdapterConstraint,
  TWarningPort extends string,
> = GraphBuilderSignature<
  TProvides | InferAdapterProvides<TAdapter>,
  TRequires | TransformLazyToOriginal<InferAdapterRequires<TAdapter>>,
  TAsyncPorts,
  TOverrides,
  WithDepGraphLifetimeAndWarning<
    TInternalState,
    AddEdge<
      GetDepGraph<TInternalState>,
      AdapterProvidesName<TAdapter>,
      AdapterRequiresNames<TAdapter>
    >,
    AddLifetime<
      GetLifetimeMap<TInternalState>,
      AdapterProvidesName<TAdapter>,
      DirectAdapterLifetime<TAdapter>
    >,
    TWarningPort
  >
>;

/**
 * Step 4: Reverse captive dependency check.
 *
 * Checks if any EXISTING adapter with a longer lifetime already requires the
 * port being provided by this adapter (which has a shorter lifetime).
 *
 * This catches the case where adapters are registered in "requirements-first" order:
 * 1. Singleton A is registered requiring Port B (forward reference, not yet validated)
 * 2. Scoped B is registered providing Port B → ERROR: A would capture B
 *
 * @internal
 */
export type CheckReverseCaptiveDependency<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  TAdapter extends AdapterConstraint,
> =
  FindReverseCaptiveDependency<
    GetDepGraph<TInternalState>,
    GetLifetimeMap<TInternalState>,
    AdapterProvidesName<TAdapter>,
    LifetimeLevel<DirectAdapterLifetime<TAdapter>>
  > extends infer TReverseCaptivePort
    ? IsNever<TReverseCaptivePort> extends true
      ? ProvideResultSuccess<
          TProvides,
          TRequires,
          TAsyncPorts,
          TOverrides,
          TInternalState,
          TAdapter
        >
      : TReverseCaptivePort extends string
        ? ReverseCaptiveErrorMessage<
            TReverseCaptivePort,
            LifetimeName<GetLifetimeLevel<GetLifetimeMap<TInternalState>, TReverseCaptivePort>>,
            AdapterProvidesName<TAdapter>,
            LifetimeName<LifetimeLevel<DirectAdapterLifetime<TAdapter>>>
          >
        : ProvideResultSuccess<
            TProvides,
            TRequires,
            TAsyncPorts,
            TOverrides,
            TInternalState,
            TAdapter
          >
    : never;

/**
 * Step 3: Forward captive dependency check.
 *
 * WHY THIRD: Requires acyclic graph for valid lifetime analysis (O(requires)).
 *
 * Checks if any required port has a shorter lifetime than the adapter.
 * Returns CaptiveErrorMessage on failure, proceeds to CheckReverseCaptiveDependency on success.
 *
 * @internal
 */
export type CheckCaptiveDependency<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  TAdapter extends AdapterConstraint,
> =
  FindAnyCaptiveDependency<
    GetLifetimeMap<TInternalState>,
    LifetimeLevel<DirectAdapterLifetime<TAdapter>>,
    TransformLazyPortNamesToOriginal<AdapterRequiresNames<TAdapter>>
  > extends infer TCaptivePort
    ? IsNever<TCaptivePort> extends true
      ? CheckReverseCaptiveDependency<
          TProvides,
          TRequires,
          TAsyncPorts,
          TOverrides,
          TInternalState,
          TAdapter
        >
      : TCaptivePort extends string
        ? CaptiveErrorMessage<
            AdapterProvidesName<TAdapter>,
            LifetimeName<LifetimeLevel<DirectAdapterLifetime<TAdapter>>>,
            TCaptivePort,
            LifetimeName<GetLifetimeLevel<GetLifetimeMap<TInternalState>, TCaptivePort>>
          >
        : CheckReverseCaptiveDependency<
            TProvides,
            TRequires,
            TAsyncPorts,
            TOverrides,
            TInternalState,
            TAdapter
          >
    : never;

/**
 * Step 3 variant: Forward captive dependency check WITH depth warning recording.
 *
 * This is identical to CheckCaptiveDependency but passes through to
 * CheckReverseCaptiveDependencyWithWarning which eventually records
 * the depth-exceeded warning in the builder's internal state.
 *
 * @internal
 */
type CheckCaptiveDependencyWithWarning<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  TAdapter extends AdapterConstraint,
  TWarningPort extends string,
> =
  FindAnyCaptiveDependency<
    GetLifetimeMap<TInternalState>,
    LifetimeLevel<DirectAdapterLifetime<TAdapter>>,
    TransformLazyPortNamesToOriginal<AdapterRequiresNames<TAdapter>>
  > extends infer TCaptivePort
    ? IsNever<TCaptivePort> extends true
      ? CheckReverseCaptiveDependencyWithWarning<
          TProvides,
          TRequires,
          TAsyncPorts,
          TOverrides,
          TInternalState,
          TAdapter,
          TWarningPort
        >
      : TCaptivePort extends string
        ? CaptiveErrorMessage<
            AdapterProvidesName<TAdapter>,
            LifetimeName<LifetimeLevel<DirectAdapterLifetime<TAdapter>>>,
            TCaptivePort,
            LifetimeName<GetLifetimeLevel<GetLifetimeMap<TInternalState>, TCaptivePort>>
          >
        : CheckReverseCaptiveDependencyWithWarning<
            TProvides,
            TRequires,
            TAsyncPorts,
            TOverrides,
            TInternalState,
            TAdapter,
            TWarningPort
          >
    : never;

/**
 * Step 4 variant: Reverse captive dependency check WITH depth warning recording.
 *
 * This is identical to CheckReverseCaptiveDependency but uses
 * ProvideResultSuccessWithDepthWarning on success, recording the
 * depth-exceeded warning in the builder's internal state.
 *
 * @internal
 */
type CheckReverseCaptiveDependencyWithWarning<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  TAdapter extends AdapterConstraint,
  TWarningPort extends string,
> =
  FindReverseCaptiveDependency<
    GetDepGraph<TInternalState>,
    GetLifetimeMap<TInternalState>,
    AdapterProvidesName<TAdapter>,
    LifetimeLevel<DirectAdapterLifetime<TAdapter>>
  > extends infer TReverseCaptivePort
    ? IsNever<TReverseCaptivePort> extends true
      ? ProvideResultSuccessWithDepthWarning<
          TProvides,
          TRequires,
          TAsyncPorts,
          TOverrides,
          TInternalState,
          TAdapter,
          TWarningPort
        >
      : TReverseCaptivePort extends string
        ? ReverseCaptiveErrorMessage<
            TReverseCaptivePort,
            LifetimeName<GetLifetimeLevel<GetLifetimeMap<TInternalState>, TReverseCaptivePort>>,
            AdapterProvidesName<TAdapter>,
            LifetimeName<LifetimeLevel<DirectAdapterLifetime<TAdapter>>>
          >
        : ProvideResultSuccessWithDepthWarning<
            TProvides,
            TRequires,
            TAsyncPorts,
            TOverrides,
            TInternalState,
            TAdapter,
            TWarningPort
          >
    : never;

/**
 * Step 2: Circular dependency check.
 *
 * WHY SECOND: Requires no duplicates; must check before captive (O(depth)).
 *
 * Checks if adding this adapter would create a cycle in the dependency graph.
 * Returns CircularErrorMessage on failure, DepthLimitError/DepthLimitWarning if
 * depth exceeded, or proceeds to CheckCaptiveDependency on success.
 *
 * ## Three-Way Result Handling
 *
 * `WouldCreateCycle` returns one of:
 * - `true` → Cycle detected definitively
 * - `false` → No cycle (traversal completed)
 * - `DepthExceededResult` → Inconclusive (depth limit reached)
 *
 * ## Depth-Exceeded Behavior (Soundness Fix)
 *
 * By default, depth-exceeded returns an ERROR because incomplete cycle detection
 * breaks the guarantee "if types say valid, it is valid". Users who want to
 * proceed with incomplete validation can use `GraphBuilder.withUnsafeDepthOverride()`
 * to convert this error to a warning.
 *
 * @internal
 */
export type CheckCycleDependency<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  TAdapter extends AdapterConstraint,
> =
  WouldCreateCycle<
    GetDepGraph<TInternalState>,
    AdapterProvidesName<TAdapter>,
    AdapterRequiresNames<TAdapter>,
    GetMaxDepth<TInternalState>
  > extends infer TCycleResult
    ? TCycleResult extends true
      ? CircularErrorMessage<
          BuildCyclePath<
            AddEdge<
              GetDepGraph<TInternalState>,
              AdapterProvidesName<TAdapter>,
              AdapterRequiresNames<TAdapter>
            >,
            AdapterProvidesName<TAdapter>,
            AdapterRequiresNames<TAdapter>,
            GetMaxDepth<TInternalState>
          >
        >
      : IsDepthExceeded<TCycleResult> extends true
        ? GetExtendedDepth<TInternalState> extends true
          ? // With unsafe override: proceed with validation BUT record the warning
            // The user has acknowledged incomplete cycle detection via withUnsafeDepthOverride()
            // The warning is tracked in internal state so tooling can detect it
            CheckCaptiveDependencyWithWarning<
              TProvides,
              TRequires,
              TAsyncPorts,
              TOverrides,
              TInternalState,
              TAdapter,
              ExtractDepthExceededPort<TCycleResult>
            >
          : DepthLimitError<GetMaxDepth<TInternalState>, ExtractDepthExceededPort<TCycleResult>>
        : CheckCaptiveDependency<
            TProvides,
            TRequires,
            TAsyncPorts,
            TOverrides,
            TInternalState,
            TAdapter
          >
    : CheckCaptiveDependency<
        TProvides,
        TRequires,
        TAsyncPorts,
        TOverrides,
        TInternalState,
        TAdapter
      >;

/**
 * Step 1.5: Self-dependency check.
 *
 * WHY EARLY: O(1) check that produces a clearer error message than cycle detection.
 *
 * Checks if the adapter requires its own port (self-dependency).
 * Returns SelfDependencyErrorMessage on failure, proceeds to CheckCycleDependency on success.
 *
 * This is separate from cycle detection because:
 * 1. Self-dependency doesn't require graph traversal to detect
 * 2. The error message can be more specific and actionable
 * 3. It runs in O(1) time rather than O(depth)
 *
 * @internal
 */
type CheckSelfDependency<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  TAdapter extends AdapterConstraint,
> =
  HasSelfDependency<TAdapter> extends true
    ? SelfDependencyErrorMessage<AdapterProvidesName<TAdapter>>
    : CheckCycleDependency<TProvides, TRequires, TAsyncPorts, TOverrides, TInternalState, TAdapter>;

/**
 * Step 1: Duplicate port check.
 *
 * WHY FIRST: O(1) check that prevents confusing downstream errors.
 *
 * Checks if the adapter provides a port that's already in the graph.
 * Returns DuplicateErrorMessage on failure, proceeds to CheckSelfDependency on success.
 *
 * @internal
 */
export type CheckDuplicate<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  TAdapter extends AdapterConstraint,
> =
  HasOverlap<InferAdapterProvides<TAdapter>, TProvides> extends true
    ? DuplicateErrorMessage<OverlappingPorts<InferAdapterProvides<TAdapter>, TProvides>>
    : CheckSelfDependency<TProvides, TRequires, TAsyncPorts, TOverrides, TInternalState, TAdapter>;

/**
 * The return type of `GraphBuilder.provideFirstError()` with short-circuit validation.
 *
 * ## TYPE FLOW
 *
 * ```
 * Input: Adapter
 *    |
 *    v
 * +-----------------------------+
 * | 1. CheckDuplicate          | -> DuplicateErrorMessage or continue
 * +-----------+-----------------+
 *             v
 * +-----------------------------+
 * | 1.5. CheckSelfDependency   | -> SelfDependencyErrorMessage or continue
 * +-----------+-----------------+
 *             v
 * +-----------------------------+
 * | 2. CheckCycleDependency    | -> CircularErrorMessage or continue
 * +-----------+-----------------+
 *             v
 * +-----------------------------+
 * | 3. CheckCaptiveDependency  | -> CaptiveErrorMessage or continue
 * +-----------+-----------------+
 *             v
 * +-----------------------------+
 * | 4. ProvideResultSuccess    | -> GraphBuilderSignature<updated>
 * +-----------------------------+
 * ```
 *
 * For comprehensive multi-error reporting, see `ProvideResultAllErrors`.
 *
 * @internal
 */
export type ProvideResult<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  TAdapter extends AdapterConstraint,
> = CheckDuplicate<TProvides, TRequires, TAsyncPorts, TOverrides, TInternalState, TAdapter>;

/**
 * Success-only result type for provideUnchecked().
 * Skips all compile-time validation for faster type-checking.
 *
 * WARNING: Cycles and captive dependencies will NOT be detected at compile time.
 * The build() method still performs runtime cycle detection as a safety net.
 *
 * @internal
 */
export type ProvideUncheckedResult<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  TAdapter extends AdapterConstraint,
> = GraphBuilderSignature<
  TProvides | InferAdapterProvides<TAdapter>,
  TRequires | TransformLazyToOriginal<InferAdapterRequires<TAdapter>>,
  | TAsyncPorts
  | (TAdapter extends { factoryKind: "async" } ? InferAdapterProvides<TAdapter> : never),
  TOverrides,
  // Set uncheckedUsed=true to track that provideUnchecked() was used
  WithUncheckedUsed<
    WithDepGraphAndLifetimeMap<
      TInternalState,
      AddEdge<
        GetDepGraph<TInternalState>,
        AdapterProvidesName<TAdapter>,
        AdapterRequiresNames<TAdapter>
      >,
      AddLifetime<
        GetLifetimeMap<TInternalState>,
        AdapterProvidesName<TAdapter>,
        DirectAdapterLifetime<TAdapter>
      >
    >
  >
>;

// =============================================================================
// Multi-Error Collection Types
// =============================================================================

/**
 * Collects ALL validation errors for an adapter without short-circuiting.
 *
 * Unlike `ProvideResult` which stops at the first error, this type evaluates
 * all validations and returns a tuple of all errors found. The tuple is then
 * filtered to remove `never` values (passing checks) and formatted into a
 * multi-error message.
 *
 * This is the type used by `provide()` (the default). Use `provideFirstError()` if
 * you prefer short-circuit behavior for faster type checking.
 *
 * @internal
 */
export type CollectAdapterErrors<
  TProvides,
  TInternalState extends AnyBuilderInternals,
  TAdapter extends AdapterConstraint,
> = FilterNever<
  readonly [
    // Error 1: Duplicate detection
    HasOverlap<InferAdapterProvides<TAdapter>, TProvides> extends true
      ? DuplicateErrorMessage<OverlappingPorts<InferAdapterProvides<TAdapter>, TProvides>>
      : never,
    // Error 1.5: Self-dependency detection
    HasSelfDependency<TAdapter> extends true
      ? SelfDependencyErrorMessage<AdapterProvidesName<TAdapter>>
      : never,
    // Error 2: Circular dependency detection (with depth exceeded handling)
    WouldCreateCycle<
      GetDepGraph<TInternalState>,
      AdapterProvidesName<TAdapter>,
      AdapterRequiresNames<TAdapter>,
      GetMaxDepth<TInternalState>
    > extends infer TCycleResult
      ? TCycleResult extends true
        ? CircularErrorMessage<
            BuildCyclePath<
              AddEdge<
                GetDepGraph<TInternalState>,
                AdapterProvidesName<TAdapter>,
                AdapterRequiresNames<TAdapter>
              >,
              AdapterProvidesName<TAdapter>,
              AdapterRequiresNames<TAdapter>,
              GetMaxDepth<TInternalState>
            >
          >
        : IsDepthExceeded<TCycleResult> extends true
          ? GetExtendedDepth<TInternalState> extends true
            ? // With unsafe override: don't add to error tuple (warning is implicit)
              // The user has acknowledged incomplete validation via withUnsafeDepthOverride()
              never
            : DepthLimitError<GetMaxDepth<TInternalState>, ExtractDepthExceededPort<TCycleResult>>
          : never
      : never,
    // Error 3: Forward captive dependency detection
    // Note: TransformLazyPortNamesToOriginal handles lazy ports (e.g., "LazyTransientService" -> "TransientService")
    // so the captive check can find the correct lifetime in the map
    FindAnyCaptiveDependency<
      GetLifetimeMap<TInternalState>,
      LifetimeLevel<DirectAdapterLifetime<TAdapter>>,
      TransformLazyPortNamesToOriginal<AdapterRequiresNames<TAdapter>>
    > extends infer CaptivePort
      ? IsNever<CaptivePort> extends true
        ? never
        : CaptivePort extends string
          ? CaptiveErrorMessage<
              AdapterProvidesName<TAdapter>,
              LifetimeName<LifetimeLevel<DirectAdapterLifetime<TAdapter>>>,
              CaptivePort,
              LifetimeName<GetLifetimeLevel<GetLifetimeMap<TInternalState>, CaptivePort>>
            >
          : never
      : never,
    // Error 4: Reverse captive dependency detection
    FindReverseCaptiveDependency<
      GetDepGraph<TInternalState>,
      GetLifetimeMap<TInternalState>,
      AdapterProvidesName<TAdapter>,
      LifetimeLevel<DirectAdapterLifetime<TAdapter>>
    > extends infer ReverseCaptivePort
      ? IsNever<ReverseCaptivePort> extends true
        ? never
        : ReverseCaptivePort extends string
          ? ReverseCaptiveErrorMessage<
              ReverseCaptivePort,
              LifetimeName<GetLifetimeLevel<GetLifetimeMap<TInternalState>, ReverseCaptivePort>>,
              AdapterProvidesName<TAdapter>,
              LifetimeName<LifetimeLevel<DirectAdapterLifetime<TAdapter>>>
            >
          : never
      : never,
  ]
>;

/**
 * The return type of `GraphBuilder.provide()` that reports ALL validation errors.
 *
 * Unlike `ProvideResult` (used by `provideFirstError()`) which short-circuits on the
 * first error, this type evaluates all validations and returns either:
 * - A `GraphBuilder` if all validations pass
 * - A multi-error message string if any validations fail
 *
 * This enables seeing all problems at once rather than fix-and-retry cycles.
 *
 * @internal
 */
export type ProvideResultAllErrors<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  TAdapter extends AdapterConstraint,
> =
  CollectAdapterErrors<TProvides, TInternalState, TAdapter> extends infer Errors extends
    readonly string[]
    ? Errors["length"] extends 0
      ? // No errors - return success (same as ProvideResult success case)
        ProvideResultSuccess<
          TProvides,
          TRequires,
          TAsyncPorts,
          TOverrides,
          TInternalState,
          TAdapter
        >
      : // Has errors - return multi-error message
        MultiErrorMessage<Errors>
    : never;

// =============================================================================
// Async Provide Result Types
// =============================================================================

/**
 * Constructs a new GraphBuilder with updated type parameters after successful async adapter validation.
 *
 * Unlike sync adapters, async adapters:
 * - Always have lifetime "singleton" (level 1)
 * - Are added to TAsyncPorts union for tracking
 *
 * @internal
 */
type ProvideAsyncResultSuccess<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  TAdapter extends AdapterConstraint & { readonly factoryKind: "async" },
> = GraphBuilderSignature<
  TProvides | InferAdapterProvides<TAdapter>,
  TRequires | TransformLazyToOriginal<InferAdapterRequires<TAdapter>>,
  TAsyncPorts | InferAdapterProvides<TAdapter>,
  TOverrides,
  WithDepGraphAndLifetimeMap<
    TInternalState,
    AddEdge<
      GetDepGraph<TInternalState>,
      AdapterProvidesName<TAdapter>,
      AdapterRequiresNames<TAdapter>
    >,
    AddLifetime<GetLifetimeMap<TInternalState>, AdapterProvidesName<TAdapter>, "singleton">
  >
>;

/**
 * Constructs a new GraphBuilder with updated type parameters AND depth warning for async adapters.
 *
 * @internal
 */
type ProvideAsyncResultSuccessWithDepthWarning<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  TAdapter extends AdapterConstraint & { readonly factoryKind: "async" },
  TWarningPort extends string,
> = GraphBuilderSignature<
  TProvides | InferAdapterProvides<TAdapter>,
  TRequires | TransformLazyToOriginal<InferAdapterRequires<TAdapter>>,
  TAsyncPorts | InferAdapterProvides<TAdapter>,
  TOverrides,
  WithDepGraphLifetimeAndWarning<
    TInternalState,
    AddEdge<
      GetDepGraph<TInternalState>,
      AdapterProvidesName<TAdapter>,
      AdapterRequiresNames<TAdapter>
    >,
    AddLifetime<GetLifetimeMap<TInternalState>, AdapterProvidesName<TAdapter>, "singleton">,
    TWarningPort
  >
>;

/**
 * Step 3: Captive dependency check for async adapters.
 *
 * Async adapters are always singletons (level 1), so this checks if any required
 * port has a shorter lifetime (scoped=2 or transient=3).
 *
 * @internal
 */
type CheckAsyncCaptiveDependency<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  TAdapter extends AdapterConstraint & { readonly factoryKind: "async" },
> =
  FindAnyCaptiveDependency<
    GetLifetimeMap<TInternalState>,
    SINGLETON_LEVEL, // Async adapters are always singleton
    TransformLazyPortNamesToOriginal<AdapterRequiresNames<TAdapter>>
  > extends infer TCaptivePort
    ? IsNever<TCaptivePort> extends true
      ? ProvideAsyncResultSuccess<
          TProvides,
          TRequires,
          TAsyncPorts,
          TOverrides,
          TInternalState,
          TAdapter
        >
      : TCaptivePort extends string
        ? CaptiveErrorMessage<
            AdapterProvidesName<TAdapter>,
            "Singleton",
            TCaptivePort,
            LifetimeName<GetLifetimeLevel<GetLifetimeMap<TInternalState>, TCaptivePort>>
          >
        : ProvideAsyncResultSuccess<
            TProvides,
            TRequires,
            TAsyncPorts,
            TOverrides,
            TInternalState,
            TAdapter
          >
    : never;

/**
 * Step 3 variant: Captive dependency check for async adapters WITH depth warning.
 *
 * @internal
 */
type CheckAsyncCaptiveDependencyWithWarning<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  TAdapter extends AdapterConstraint & { readonly factoryKind: "async" },
  TWarningPort extends string,
> =
  FindAnyCaptiveDependency<
    GetLifetimeMap<TInternalState>,
    SINGLETON_LEVEL, // Async adapters are always singleton
    TransformLazyPortNamesToOriginal<AdapterRequiresNames<TAdapter>>
  > extends infer TCaptivePort
    ? IsNever<TCaptivePort> extends true
      ? ProvideAsyncResultSuccessWithDepthWarning<
          TProvides,
          TRequires,
          TAsyncPorts,
          TOverrides,
          TInternalState,
          TAdapter,
          TWarningPort
        >
      : TCaptivePort extends string
        ? CaptiveErrorMessage<
            AdapterProvidesName<TAdapter>,
            "Singleton",
            TCaptivePort,
            LifetimeName<GetLifetimeLevel<GetLifetimeMap<TInternalState>, TCaptivePort>>
          >
        : ProvideAsyncResultSuccessWithDepthWarning<
            TProvides,
            TRequires,
            TAsyncPorts,
            TOverrides,
            TInternalState,
            TAdapter,
            TWarningPort
          >
    : never;

/**
 * Step 2: Circular dependency check for async adapters.
 *
 * Uses three-way result handling like `CheckCycleDependency`.
 *
 * @internal
 */
type CheckAsyncCycleDependency<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  TAdapter extends AdapterConstraint & { readonly factoryKind: "async" },
> =
  WouldCreateCycle<
    GetDepGraph<TInternalState>,
    AdapterProvidesName<TAdapter>,
    AdapterRequiresNames<TAdapter>,
    GetMaxDepth<TInternalState>
  > extends infer TCycleResult
    ? TCycleResult extends true
      ? CircularErrorMessage<
          BuildCyclePath<
            AddEdge<
              GetDepGraph<TInternalState>,
              AdapterProvidesName<TAdapter>,
              AdapterRequiresNames<TAdapter>
            >,
            AdapterProvidesName<TAdapter>,
            AdapterRequiresNames<TAdapter>,
            GetMaxDepth<TInternalState>
          >
        >
      : IsDepthExceeded<TCycleResult> extends true
        ? GetExtendedDepth<TInternalState> extends true
          ? // With unsafe override: proceed with validation BUT record the warning
            CheckAsyncCaptiveDependencyWithWarning<
              TProvides,
              TRequires,
              TAsyncPorts,
              TOverrides,
              TInternalState,
              TAdapter,
              ExtractDepthExceededPort<TCycleResult>
            >
          : DepthLimitError<GetMaxDepth<TInternalState>, ExtractDepthExceededPort<TCycleResult>>
        : CheckAsyncCaptiveDependency<
            TProvides,
            TRequires,
            TAsyncPorts,
            TOverrides,
            TInternalState,
            TAdapter
          >
    : CheckAsyncCaptiveDependency<
        TProvides,
        TRequires,
        TAsyncPorts,
        TOverrides,
        TInternalState,
        TAdapter
      >;

/**
 * Step 1: Duplicate port check for async adapters.
 *
 * @internal
 */
type CheckAsyncDuplicate<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  TAdapter extends AdapterConstraint & { readonly factoryKind: "async" },
> =
  HasOverlap<InferAdapterProvides<TAdapter>, TProvides> extends true
    ? DuplicateErrorMessage<OverlappingPorts<InferAdapterProvides<TAdapter>, TProvides>>
    : CheckAsyncCycleDependency<
        TProvides,
        TRequires,
        TAsyncPorts,
        TOverrides,
        TInternalState,
        TAdapter
      >;

/**
 * The return type of `GraphBuilder.provideAsync()` with short-circuit validation.
 *
 * Note: Async adapters are always singletons.
 * Note: Initialization order is determined automatically at runtime via topological sort.
 *
 * @internal
 */
export type ProvideAsyncResult<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  TAdapter extends AdapterConstraint & { readonly factoryKind: "async" },
> = CheckAsyncDuplicate<TProvides, TRequires, TAsyncPorts, TOverrides, TInternalState, TAdapter>;

// =============================================================================
// Batch Provide Result Types
// =============================================================================

/**
 * Checks if a union of new ports overlaps with existing keys.
 * Used for batch collision detection.
 *
 * @internal
 */
type BatchHasOverlap<NewPorts, ExistingPorts> = HasOverlap<NewPorts, ExistingPorts>;

/**
 * Step 3+4: Captive dependency checks for batch operations.
 *
 * This helper type encapsulates the captive and reverse-captive validation
 * logic, allowing it to be reused from multiple branches in ProvideManyResult
 * (both the normal path and the depth-exceeded-with-unsafe-override path).
 *
 * ## Validation Steps
 *
 * 1. **Forward captive**: Checks if batch adapters capture shorter-lifetime ports
 * 2. **Reverse captive**: Checks if existing adapters would capture batch ports
 *
 * Both checks handle MalformedAdapterError separately from captive errors
 * because `never extends CaptiveDependencyError<...>` is always true.
 *
 * @internal
 */
type CheckBatchCaptiveDependencies<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  TAdapters extends readonly AdapterConstraint[],
> =
  // Step 3: Check for forward captive dependencies in the batch
  // Uses HandleForwardCaptiveResult helper which checks MalformedAdapterError FIRST
  // (required because `never extends CaptiveDependencyError<...>` is always true)
  HandleForwardCaptiveResult<
    WouldAnyBeCaptive<GetLifetimeMap<TInternalState>, TAdapters>,
    // Step 4: Check for REVERSE captive dependencies
    // This catches when EXISTING adapters in the graph would capture batch adapters.
    // Example: Singleton A (already in graph) requires PortB -> batch adds Scoped PortB
    HandleReverseCaptiveResult<
      WouldAnyCreateReverseCaptive<
        GetDepGraph<TInternalState>,
        GetLifetimeMap<TInternalState>,
        TAdapters
      >,
      // Success: return new builder with updated types
      // Note: Lazy requirements are transformed to original ports
      GraphBuilderSignature<
        TProvides | InferManyProvides<TAdapters>,
        TRequires | TransformLazyToOriginal<InferManyRequires<TAdapters>>,
        TAsyncPorts | InferManyAsyncPorts<TAdapters>,
        TOverrides,
        WithDepGraphAndLifetimeMap<
          TInternalState,
          AddManyEdges<GetDepGraph<TInternalState>, TAdapters>,
          AddManyLifetimes<GetLifetimeMap<TInternalState>, TAdapters>
        >
      >
    >
  >;

/**
 * The return type of `GraphBuilder.provideMany()` with duplicate, cycle, and captive dependency detection.
 *
 * @internal
 */
export type ProvideManyResult<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  TAdapters extends readonly AdapterConstraint[],
> =
  // Step 0: Check for intra-batch duplicates (same port provided twice in the batch)
  HasDuplicatesInBatch<TAdapters> extends true
    ? BatchDuplicateErrorMessage<FindBatchDuplicate<TAdapters>>
    : // Step 1: Check for batch-vs-graph duplicates
      BatchHasOverlap<InferManyProvides<TAdapters>, TProvides> extends true
      ? DuplicateErrorMessage<OverlappingPorts<InferManyProvides<TAdapters>, TProvides>>
      : // Step 1.5: Check for self-dependencies in the batch
        // This catches self-dependency with specific HEX006 error before generic HEX002 cycle error
        HasSelfDependencyInBatch<TAdapters> extends true
        ? SelfDependencyErrorMessage<FindSelfDependencyPort<TAdapters>>
        : // Step 2: Check for circular dependencies in the batch
          // Uses three-way result handling like CheckCycleDependency for single adapters
          WouldAnyCreateCycle<
              GetDepGraph<TInternalState>,
              TAdapters,
              GetMaxDepth<TInternalState>
            > extends infer TCycleResult
          ? TCycleResult extends CircularDependencyError<infer Path>
            ? CircularErrorMessage<Path>
            : IsDepthExceeded<TCycleResult> extends true
              ? GetExtendedDepth<TInternalState> extends true
                ? // With unsafe override: proceed with captive validation
                  // The user has acknowledged incomplete cycle detection via withUnsafeDepthOverride()
                  CheckBatchCaptiveDependencies<
                    TProvides,
                    TRequires,
                    TAsyncPorts,
                    TOverrides,
                    TInternalState,
                    TAdapters
                  >
                : DepthLimitError<
                    GetMaxDepth<TInternalState>,
                    ExtractDepthExceededPort<TCycleResult>
                  >
              : // No cycle, no depth exceeded: proceed with captive validation
                CheckBatchCaptiveDependencies<
                  TProvides,
                  TRequires,
                  TAsyncPorts,
                  TOverrides,
                  TInternalState,
                  TAdapters
                >
          : // Fallback: proceed with captive validation
            CheckBatchCaptiveDependencies<
              TProvides,
              TRequires,
              TAsyncPorts,
              TOverrides,
              TInternalState,
              TAdapters
            >;

// =============================================================================
// Batch Multi-Error Collection Types
// =============================================================================

/**
 * Collects ALL validation errors from a batch of adapters without short-circuiting.
 *
 * Unlike `ProvideManyResult` which stops at the first error, this type evaluates
 * all validations and returns a tuple of all errors found. The tuple is then
 * used by `ProvideManyResultAllErrors` to either return success or a multi-error.
 *
 * ## Validation Checks (all run in parallel)
 *
 * 1. **Intra-batch duplicates**: Same port provided twice within the batch
 * 2. **Batch-vs-graph duplicates**: Batch port already exists in the graph
 * 3. **Self-dependencies**: Adapter requires its own port
 * 4. **Cycles**: Batch would create circular dependencies
 * 5. **Captive dependencies**: Shorter-lifetime port captured by longer-lifetime
 * 6. **Reverse captive**: Existing longer-lifetime adapter requires new shorter-lifetime port
 *
 * @typeParam TProvides - Currently provided ports in the graph
 * @typeParam TInternalState - Builder internal state
 * @typeParam TAdapters - Tuple of adapters to validate
 *
 * @returns A tuple of error message strings (empty if no errors)
 *
 * @internal
 */
export type CollectBatchErrors<
  TProvides,
  TInternalState extends AnyBuilderInternals,
  TAdapters extends readonly AdapterConstraint[],
> = FilterNever<
  readonly [
    // Error 1: Intra-batch duplicates (same port twice in batch)
    HasDuplicatesInBatch<TAdapters> extends true
      ? BatchDuplicateErrorMessage<FindBatchDuplicate<TAdapters>>
      : never,
    // Error 2: Batch-vs-graph duplicates (port already in graph)
    BatchHasOverlap<InferManyProvides<TAdapters>, TProvides> extends true
      ? DuplicateErrorMessage<OverlappingPorts<InferManyProvides<TAdapters>, TProvides>>
      : never,
    // Error 3: Self-dependencies in the batch
    HasSelfDependencyInBatch<TAdapters> extends true
      ? SelfDependencyErrorMessage<FindSelfDependencyPort<TAdapters>>
      : never,
    // Error 4: Circular dependencies created by the batch
    // Uses infer to evaluate WouldAnyCreateCycle once, then checks both cycle and depth-exceeded
    WouldAnyCreateCycle<
      GetDepGraph<TInternalState>,
      TAdapters,
      GetMaxDepth<TInternalState>
    > extends infer CycleResult
      ? CycleResult extends CircularDependencyError<infer Path>
        ? CircularErrorMessage<Path>
        : // Check for depth exceeded using IsDepthExceeded (not string brand)
          IsDepthExceeded<CycleResult> extends true
          ? GetExtendedDepth<TInternalState> extends true
            ? never // User acknowledged incomplete validation
            : DepthLimitError<GetMaxDepth<TInternalState>, ExtractDepthExceededPort<CycleResult>>
          : never
      : never,
    // Error 5: Forward captive dependencies in the batch
    // Uses HandleForwardCaptiveResult helper which checks MalformedAdapterError FIRST
    HandleForwardCaptiveResult<WouldAnyBeCaptive<GetLifetimeMap<TInternalState>, TAdapters>, never>,
    // Error 6: Reverse captive dependencies (existing adapters would capture batch)
    // Uses HandleReverseCaptiveResult helper which checks MalformedAdapterError FIRST
    HandleReverseCaptiveResult<
      WouldAnyCreateReverseCaptive<
        GetDepGraph<TInternalState>,
        GetLifetimeMap<TInternalState>,
        TAdapters
      >,
      never
    >,
  ]
>;

/**
 * The return type of `GraphBuilder.provideManyAllErrors()` that reports ALL validation errors.
 *
 * Unlike `ProvideManyResult` which short-circuits on the first error, this type
 * evaluates all validations and returns either:
 * - A `GraphBuilder` if all validations pass
 * - A multi-error message string if any validations fail
 *
 * This enables seeing all problems at once rather than fix-and-retry cycles,
 * which is especially valuable for batch operations where multiple independent
 * errors may exist.
 *
 * @typeParam TProvides - Currently provided ports in the graph
 * @typeParam TRequires - Currently required ports
 * @typeParam TAsyncPorts - Async ports that need initialization
 * @typeParam TOverrides - Override configuration
 * @typeParam TInternalState - Builder internal state
 * @typeParam TAdapters - Tuple of adapters to add
 *
 * @returns `GraphBuilder` on success, or error message string on failure
 *
 * @internal
 */
export type ProvideManyResultAllErrors<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  TAdapters extends readonly AdapterConstraint[],
> =
  CollectBatchErrors<TProvides, TInternalState, TAdapters> extends infer Errors extends
    readonly string[]
    ? Errors["length"] extends 0
      ? // No errors - return success (same result as ProvideManyResult success case)
        GraphBuilderSignature<
          TProvides | InferManyProvides<TAdapters>,
          TRequires | TransformLazyToOriginal<InferManyRequires<TAdapters>>,
          TAsyncPorts | InferManyAsyncPorts<TAdapters>,
          TOverrides,
          WithDepGraphAndLifetimeMap<
            TInternalState,
            AddManyEdges<GetDepGraph<TInternalState>, TAdapters>,
            AddManyLifetimes<GetLifetimeMap<TInternalState>, TAdapters>
          >
        >
      : // Has errors - return multi-error message
        MultiErrorMessage<Errors>
    : never;
