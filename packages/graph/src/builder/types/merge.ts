/**
 * Merge and Override result types for GraphBuilder.
 *
 * This module consolidates all compile-time validation types for the merge(),
 * mergeWith(), and override() methods.
 *
 * ## Architecture: Unified Validation Chain
 *
 * This module uses a single unified validation chain with pre-resolved maxDepth.
 * Instead of duplicating validation types for merge() vs mergeWith(), maxDepth
 * is computed at the entry points and passed through as TResolvedMaxDepth.
 *
 * **Why this works:** The ONLY semantic difference between merge() and mergeWith()
 * is how maxDepth is determined. All validation logic (duplicate detection,
 * cycle detection, captive validation, error messages) is identical.
 *
 * **Validation Flow:**
 *   Lifetime → Duplicate → Cycle → Captive → Success
 *
 * @packageDocumentation
 */

import type { AdapterConstraint, InferAdapterProvides } from "@hex-di/core";
import type {
  HasOverlap,
  OverlappingPorts,
  CircularDependencyError,
  MergeDependencyMaps,
  GetLifetimeLevel,
  CaptiveDependencyError,
  LifetimeName,
  MergeLifetimeMaps,
  DetectCaptiveInMergedGraph,
  FindLifetimeInconsistency,
  DetectCycleInMergedGraph,
  DuplicateErrorMessage,
  CircularErrorMessage,
  CaptiveErrorMessage,
  LifetimeInconsistencyErrorMessage,
  FilterNever,
  MultiErrorMessage,
  JoinPortNames,
  MaxNumber,
  MinNumber,
  IsDepthExceeded,
  ExtractDepthExceededPort,
  DepthLimitWarning,
  DepthLimitError,
  OverrideWithoutParentErrorMessage,
} from "../../validation/types/index.js";
import type { IsNever } from "@hex-di/core";
import type { GraphBuilder } from "../builder.js";
import type {
  AnyBuilderInternals,
  BoolOr,
  GetDepGraph,
  GetLifetimeMap,
  GetMaxDepth,
  GetParentProvides,
  GetUnsafeDepthOverride,
  UnifiedMergeInternals,
} from "./state.js";
import type { ProvideResult } from "./provide.js";

// =============================================================================
// Unified Merge Validation Chain
// =============================================================================
//
// All validation types take TResolvedMaxDepth as a final parameter, eliminating
// the need for separate *WithOptions variants.

/**
 * The success result of merging two graphs with pre-resolved maxDepth.
 * Returns a new GraphBuilder with combined types from both graphs.
 * @internal
 */
type UnifiedMergeResultSuccess<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  OProvides,
  ORequires,
  OAsyncPorts,
  OOverrides,
  OInternals extends AnyBuilderInternals,
  TResolvedMaxDepth extends number,
> = GraphBuilder<
  TProvides | OProvides,
  TRequires | ORequires,
  TAsyncPorts | OAsyncPorts,
  TOverrides | OOverrides,
  UnifiedMergeInternals<
    TInternalState,
    OInternals,
    MergeDependencyMaps<GetDepGraph<TInternalState>, GetDepGraph<OInternals>>,
    MergeLifetimeMaps<GetLifetimeMap<TInternalState>, GetLifetimeMap<OInternals>>,
    TResolvedMaxDepth
  >
>;

/**
 * Step 4: Check for captive dependencies in merged graph.
 * Returns error if a longer-lived service depends on a shorter-lived one.
 * @internal
 */
type UnifiedMergeCheckCaptive<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  OProvides,
  ORequires,
  OAsyncPorts,
  OOverrides,
  OInternals extends AnyBuilderInternals,
  TResolvedMaxDepth extends number,
> =
  DetectCaptiveInMergedGraph<
    MergeDependencyMaps<GetDepGraph<TInternalState>, GetDepGraph<OInternals>>,
    MergeLifetimeMaps<GetLifetimeMap<TInternalState>, GetLifetimeMap<OInternals>>
  > extends infer TCaptiveResult
    ? IsNever<TCaptiveResult> extends false
      ? TCaptiveResult extends CaptiveDependencyError<infer DN, infer DL, infer CP, infer CL>
        ? CaptiveErrorMessage<DN, DL, CP, CL>
        : UnifiedMergeResultSuccess<
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
            TResolvedMaxDepth
          >
      : UnifiedMergeResultSuccess<
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
          TResolvedMaxDepth
        >
    : UnifiedMergeResultSuccess<
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
        TResolvedMaxDepth
      >;

/**
 * Step 3: Check for cycles in merged graph.
 * Returns error if merging would create circular dependencies.
 * Handles depth exceeded with DepthLimitWarning or DepthLimitError.
 * @internal
 */
type UnifiedMergeCheckCycle<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  OProvides,
  ORequires,
  OAsyncPorts,
  OOverrides,
  OInternals extends AnyBuilderInternals,
  TResolvedMaxDepth extends number,
> =
  DetectCycleInMergedGraph<
    MergeDependencyMaps<GetDepGraph<TInternalState>, GetDepGraph<OInternals>>,
    TResolvedMaxDepth
  > extends infer TCycleResult
    ? IsNever<TCycleResult> extends false
      ? TCycleResult extends CircularDependencyError<infer Path>
        ? CircularErrorMessage<Path>
        : IsDepthExceeded<TCycleResult> extends true
          ? BoolOr<
              GetUnsafeDepthOverride<TInternalState>,
              GetUnsafeDepthOverride<OInternals>
            > extends true
            ? DepthLimitWarning<TResolvedMaxDepth, ExtractDepthExceededPort<TCycleResult>>
            : DepthLimitError<TResolvedMaxDepth, ExtractDepthExceededPort<TCycleResult>>
          : UnifiedMergeCheckCaptive<
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
              TResolvedMaxDepth
            >
      : UnifiedMergeCheckCaptive<
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
          TResolvedMaxDepth
        >
    : UnifiedMergeCheckCaptive<
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
        TResolvedMaxDepth
      >;

/**
 * Step 2: Check for duplicate ports.
 * Returns error if any port is provided by both graphs.
 * @internal
 */
type UnifiedMergeCheckDuplicate<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  OProvides,
  ORequires,
  OAsyncPorts,
  OOverrides,
  OInternals extends AnyBuilderInternals,
  TResolvedMaxDepth extends number,
> =
  HasOverlap<OProvides, TProvides> extends true
    ? DuplicateErrorMessage<OverlappingPorts<OProvides, TProvides>>
    : UnifiedMergeCheckCycle<
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
        TResolvedMaxDepth
      >;

/**
 * Step 1: Check for lifetime inconsistency.
 * Returns error if same port has different lifetimes in the two graphs.
 * @internal
 */
type UnifiedMergeCheckLifetime<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  OProvides,
  ORequires,
  OAsyncPorts,
  OOverrides,
  OInternals extends AnyBuilderInternals,
  TResolvedMaxDepth extends number,
> =
  FindLifetimeInconsistency<
    GetLifetimeMap<TInternalState>,
    GetLifetimeMap<OInternals>
  > extends infer TInconsistent
    ? IsNever<TInconsistent> extends false
      ? TInconsistent extends string
        ? LifetimeInconsistencyErrorMessage<
            TInconsistent,
            LifetimeName<GetLifetimeLevel<GetLifetimeMap<TInternalState>, TInconsistent>>,
            LifetimeName<GetLifetimeLevel<GetLifetimeMap<OInternals>, TInconsistent>>
          >
        : UnifiedMergeCheckDuplicate<
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
            TResolvedMaxDepth
          >
      : UnifiedMergeCheckDuplicate<
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
          TResolvedMaxDepth
        >
    : UnifiedMergeCheckDuplicate<
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
        TResolvedMaxDepth
      >;

// =============================================================================
// Public Entry Points
// =============================================================================

/**
 * The return type of `GraphBuilder.merge()` with short-circuit validation.
 *
 * Pre-resolves maxDepth as the maximum of both graphs (for symmetric behavior), then validates:
 * 1. Lifetime consistency - checks if same port has different lifetimes across graphs
 * 2. Duplicate detection - checks if any port is provided by both graphs
 * 3. Cycle detection - checks if merging creates any circular dependencies
 * 4. Captive dependency detection - checks if merging creates any lifetime violations
 *
 * ## Symmetric MaxDepth Resolution
 *
 * The default merge() now uses `max(A.maxDepth, B.maxDepth)` to ensure:
 * - `A.merge(B)` behaves identically to `B.merge(A)` for validation
 * - The merged graph preserves the most permissive validation capability
 *
 * Use `mergeWith({ maxDepth: 'first' | 'second' | 'min' })` for explicit control.
 *
 * @internal
 */
export type MergeResult<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  OProvides,
  ORequires,
  OAsyncPorts,
  OOverrides,
  OInternals extends AnyBuilderInternals,
> = UnifiedMergeCheckLifetime<
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
  MaxNumber<GetMaxDepth<TInternalState>, GetMaxDepth<OInternals>>
>;

// =============================================================================
// Multi-Error Merge Reporting
// =============================================================================

/**
 * Collects ALL merge validation errors without short-circuiting.
 * @internal
 */
export type CollectMergeErrors<
  TProvides,
  TInternalState extends AnyBuilderInternals,
  OProvides,
  OInternals extends AnyBuilderInternals,
  TResolvedMaxDepth extends number,
> = FilterNever<
  readonly [
    // Error 1: Lifetime inconsistency
    FindLifetimeInconsistency<
      GetLifetimeMap<TInternalState>,
      GetLifetimeMap<OInternals>
    > extends infer TInconsistent
      ? IsNever<TInconsistent> extends true
        ? never
        : TInconsistent extends string
          ? LifetimeInconsistencyErrorMessage<
              TInconsistent,
              LifetimeName<GetLifetimeLevel<GetLifetimeMap<TInternalState>, TInconsistent>>,
              LifetimeName<GetLifetimeLevel<GetLifetimeMap<OInternals>, TInconsistent>>
            >
          : never
      : never,
    // Error 2: Duplicate ports
    HasOverlap<OProvides, TProvides> extends true
      ? DuplicateErrorMessage<OverlappingPorts<OProvides, TProvides>>
      : never,
    // Error 3: Circular dependencies in merged graph (with depth exceeded handling)
    // CONSISTENCY: Must respect GetUnsafeDepthOverride same as short-circuit path
    DetectCycleInMergedGraph<
      MergeDependencyMaps<GetDepGraph<TInternalState>, GetDepGraph<OInternals>>,
      TResolvedMaxDepth
    > extends infer TCycleResult
      ? IsNever<TCycleResult> extends true
        ? never
        : TCycleResult extends CircularDependencyError<infer Path>
          ? CircularErrorMessage<Path>
          : IsDepthExceeded<TCycleResult> extends true
            ? // Return warning or error based on unsafeDepthOverride flag from EITHER graph
              BoolOr<
                GetUnsafeDepthOverride<TInternalState>,
                GetUnsafeDepthOverride<OInternals>
              > extends true
              ? DepthLimitWarning<TResolvedMaxDepth, ExtractDepthExceededPort<TCycleResult>>
              : DepthLimitError<TResolvedMaxDepth, ExtractDepthExceededPort<TCycleResult>>
            : never
      : never,
    // Error 4: Captive dependencies in merged graph
    DetectCaptiveInMergedGraph<
      MergeDependencyMaps<GetDepGraph<TInternalState>, GetDepGraph<OInternals>>,
      MergeLifetimeMaps<GetLifetimeMap<TInternalState>, GetLifetimeMap<OInternals>>
    > extends infer TCaptiveResult
      ? IsNever<TCaptiveResult> extends true
        ? never
        : TCaptiveResult extends CaptiveDependencyError<infer DN, infer DL, infer CP, infer CL>
          ? CaptiveErrorMessage<DN, DL, CP, CL>
          : never
      : never,
  ]
>;

/**
 * The return type of `GraphBuilder.merge()` that reports ALL validation errors.
 *
 * Uses symmetric maxDepth resolution (max of both graphs) for consistency with `MergeResult`.
 *
 * @internal
 */
export type MergeResultAllErrors<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  OProvides,
  ORequires,
  OAsyncPorts,
  OOverrides,
  OInternals extends AnyBuilderInternals,
> =
  CollectMergeErrors<
    TProvides,
    TInternalState,
    OProvides,
    OInternals,
    MaxNumber<GetMaxDepth<TInternalState>, GetMaxDepth<OInternals>>
  > extends infer Errors extends readonly string[]
    ? Errors["length"] extends 0
      ? UnifiedMergeResultSuccess<
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
          MaxNumber<GetMaxDepth<TInternalState>, GetMaxDepth<OInternals>>
        >
      : MultiErrorMessage<Errors>
    : never;

// =============================================================================
// Merge Options Types
// =============================================================================

/**
 * Options for controlling merge behavior.
 */
export interface MergeOptions {
  /**
   * How to resolve maxDepth when merging two graphs.
   *
   * - `'max'` (default): Use the larger maxDepth from either graph (symmetric)
   * - `'first'`: Use maxDepth from the first (calling) graph
   * - `'second'`: Use maxDepth from the second (argument) graph
   * - `'min'`: Use the smaller maxDepth from either graph
   */
  readonly maxDepth?: MergeMaxDepthOption;
}

/**
 * Valid options for resolving maxDepth during merge.
 */
export type MergeMaxDepthOption = "first" | "second" | "max" | "min";

/**
 * Resolves the maxDepth based on the merge option.
 *
 * Uses type-level number comparison to properly compute max/min values
 * instead of returning a union type.
 *
 * @internal
 */
export type ResolveMaxDepth<
  TFirst extends number,
  TSecond extends number,
  TOption extends MergeMaxDepthOption,
> = TOption extends "first"
  ? TFirst
  : TOption extends "second"
    ? TSecond
    : TOption extends "max"
      ? MaxNumber<TFirst, TSecond>
      : TOption extends "min"
        ? MinNumber<TFirst, TSecond>
        : TFirst;

/**
 * Computes the resolved maxDepth for merge validation with options.
 * @internal
 */
type ResolvedMergeMaxDepth<
  TInternalState extends AnyBuilderInternals,
  OInternals extends AnyBuilderInternals,
  TMaxDepthOption extends MergeMaxDepthOption,
> = ResolveMaxDepth<GetMaxDepth<TInternalState>, GetMaxDepth<OInternals>, TMaxDepthOption>;

/**
 * The return type of `GraphBuilder.mergeWith()` with configurable options.
 *
 * Pre-resolves maxDepth based on TMaxDepthOption, then validates using the
 * unified validation chain.
 */
export type MergeWithResult<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  OProvides,
  ORequires,
  OAsyncPorts,
  OOverrides,
  OInternals extends AnyBuilderInternals,
  TMaxDepthOption extends MergeMaxDepthOption = "max",
> = UnifiedMergeCheckLifetime<
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
  ResolvedMergeMaxDepth<TInternalState, OInternals, TMaxDepthOption>
>;

// =============================================================================
// Override Result Types
// =============================================================================

/**
 * Error message for override validation when port doesn't exist in parent.
 * @internal
 */
export type InvalidOverrideErrorMessage<TPortName extends string> =
  `ERROR[HEX008]: Cannot override '${TPortName}' - port not provided by parent graph. Fix: Use .provide() to add new ports, or ensure parent provides '${TPortName}'.`;

/**
 * Checks if a port name starts with a given prefix.
 * Used for fuzzy matching suggestions.
 * @internal
 */
type StartsWithPrefix<
  TName extends string,
  TPrefix extends string,
> = TName extends `${TPrefix}${string}` ? true : false;

/**
 * Finds ports whose names share a common prefix with the target name.
 * @internal
 */
type FindSimilarPorts<TTargetName extends string, TAvailablePorts> = TAvailablePorts extends {
  readonly __portName: infer N extends string;
}
  ? TTargetName extends `${infer Prefix}${string}`
    ? Prefix extends `${infer P1}${infer P2}${infer P3}${string}`
      ? StartsWithPrefix<N, `${P1}${P2}${P3}`> extends true
        ? TAvailablePorts
        : never
      : never
    : never
  : never;

/**
 * Enhanced error message for override validation that includes available parent ports.
 * @internal
 */
export type InvalidOverrideErrorWithAvailable<TPortName extends string, TAvailablePorts> =
  JoinPortNames<TAvailablePorts> extends infer TJoined extends string
    ? TJoined extends ""
      ? `ERROR[HEX008]: Cannot override '${TPortName}' - parent graph has no ports. Fix: Use .provide() to add new ports instead.`
      : JoinPortNames<FindSimilarPorts<TPortName, TAvailablePorts>> extends infer TSimilar extends
            string
        ? TSimilar extends ""
          ? `ERROR[HEX008]: Cannot override '${TPortName}' - not in parent graph. Available for override: ${TJoined}. Fix: Use .provide() to add new ports.`
          : `ERROR[HEX008]: Cannot override '${TPortName}' - not in parent graph. Did you mean '${TSimilar}'? Available for override: ${TJoined}.`
        : `ERROR[HEX008]: Cannot override '${TPortName}' - not in parent graph. Available for override: ${TJoined}. Fix: Use .provide() to add new ports.`
    : InvalidOverrideErrorMessage<TPortName>;

/**
 * Extracts port names from a union of Port types.
 * @internal
 */
type ExtractPortNamesFromUnion<T> = T extends { readonly __portName: infer N } ? N : never;

/**
 * Checks if a port name is valid for override against a parent provides union.
 */
export type IsValidOverride<TPortName extends string, TParentProvides> =
  TPortName extends ExtractPortNamesFromUnion<TParentProvides> ? true : false;

/**
 * Extracts all port names from a parent graph that can be overridden.
 */
export type OverridablePorts<TParentProvides> = ExtractPortNamesFromUnion<TParentProvides>;

/**
 * Error message for override type mismatch (HEX021).
 *
 * This error occurs when:
 * - The port NAME exists in the parent graph
 * - But the port TYPE (including service interface) doesn't match
 *
 * This is a type safety check to ensure overrides provide compatible service types.
 *
 * Note: This is a type-level-only error. Runtime errors use codes from error-parsing.ts.
 *
 * @internal
 */
export type OverrideTypeMismatchError<TPortName extends string> =
  `ERROR[HEX021]: Cannot override '${TPortName}' - service type mismatch. The override adapter must use the exact same Port instance (or a type-compatible port) as the parent.`;

/**
 * Extracts the service type from a Port union by filtering for a specific port name.
 *
 * Given `Port<Logger, "Logger"> | Port<Database, "Database">` and name "Logger",
 * returns `Logger`.
 *
 * @internal
 */
type ExtractServiceByName<TPortUnion, TName extends string> = TPortUnion extends {
  readonly __portName: TName;
}
  ? TPortUnion extends { readonly [K: symbol]: [infer TService, TName] }
    ? TService
    : never
  : never;

/**
 * Checks if an override service type is compatible with the parent's service type.
 *
 * This uses TypeScript's structural subtyping to verify that the override service
 * can be used wherever the parent service is expected.
 *
 * ## Approach: Structural Subtyping
 *
 * We check `TOverrideService extends TParentService`, which verifies:
 * 1. Override has all properties/methods that Parent has
 * 2. Override can have additional properties/methods (safe for substitution)
 * 3. Method signatures are compatible according to TypeScript's rules
 *
 * ## Behavior Summary
 *
 * | Scenario | Behavior | Rationale |
 * |----------|----------|-----------|
 * | Extended interface (more methods) | Allowed | Subtype has superset of capabilities |
 * | Fewer parameters | Allowed | JS semantics - extra args are ignored |
 * | Adding overloads | Allowed | Override can handle more cases |
 * | Missing overloads | Rejected | Override can't handle all parent cases |
 * | Generic -> Specific | Rejected* | See limitations below |
 * | Narrowed parameters | Allowed* | See limitations below |
 *
 * ## Known Limitations
 *
 * TypeScript's type system imposes certain constraints that affect this check:
 *
 * 1. **Generic methods**: A specific implementation like `find(id: string): string`
 *    does NOT extend a generic interface like `find<T>(id: string): T` because
 *    TypeScript cannot verify the specific return type satisfies all possible T.
 *    Workaround: Use the same Port instance for both parent and override.
 *
 * 2. **Bivariant method parameters**: TypeScript uses bivariance for method
 *    parameters, allowing narrowed parameter types like `log(msg: "error")` to
 *    extend `log(msg: string)`. This is technically unsound but matches TS semantics.
 *    Workaround: Rely on runtime validation or use the same Port instance.
 *
 * These limitations exist because TypeScript prioritizes practical usability over
 * strict soundness. For DI overrides, using the exact same Port instance (reference
 * equality) is the safest approach and avoids these edge cases entirely.
 *
 * @internal
 */
type IsServiceCompatible<TOverrideService, TParentService> = TOverrideService extends TParentService
  ? true
  : false;

/**
 * Checks if the override adapter's Port type is compatible with any Port in the parent.
 *
 * This is stricter than just checking port names - it ensures the service interface
 * is compatible with proper contravariance enforcement for function parameters.
 *
 * @internal
 */
type IsPortTypeCompatible<TAdapterPort, TParentProvides> = TAdapterPort extends {
  readonly __portName: infer TName extends string;
}
  ? IsServiceCompatible<
      ExtractServiceByName<TAdapterPort, TName>,
      ExtractServiceByName<TParentProvides, TName>
    >
  : false;

/**
 * Checks if a type is exactly `unknown`.
 * @internal
 */
type IsExactlyUnknown<T> = [T] extends [unknown] ? ([unknown] extends [T] ? true : false) : false;

/**
 * The return type of `GraphBuilder.override()` with parent validation.
 *
 * Returns `OverrideWithoutParentErrorMessage` (HEX009) when called on a builder
 * created with `.create()` instead of `.forParent(parentGraph)`.
 *
 * @internal
 */
export type OverrideResult<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  TAdapter extends AdapterConstraint,
> =
  // Error: override() called without forParent()
  IsExactlyUnknown<GetParentProvides<TInternalState>> extends true
    ? OverrideWithoutParentErrorMessage
    : // Phase 1: Check if port NAME exists in parent (for good error messages)
      ExtractPortNamesFromUnion<InferAdapterProvides<TAdapter>> extends ExtractPortNamesFromUnion<
          GetParentProvides<TInternalState>
        >
      ? // Phase 2: Port name exists - now check if full Port TYPE is compatible
        // This ensures service interfaces match, preventing type escape hatches
        IsPortTypeCompatible<
          InferAdapterProvides<TAdapter>,
          GetParentProvides<TInternalState>
        > extends true
        ? ProvideResult<
            TProvides,
            TRequires,
            TAsyncPorts,
            TOverrides | InferAdapterProvides<TAdapter>,
            TInternalState,
            TAdapter
          >
        : // Port name matches but type doesn't - type mismatch error (HEX021)
          OverrideTypeMismatchError<
            ExtractPortNamesFromUnion<InferAdapterProvides<TAdapter>> & string
          >
      : // Port name doesn't exist in parent - existing error (HEX008)
        InvalidOverrideErrorWithAvailable<
          ExtractPortNamesFromUnion<InferAdapterProvides<TAdapter>> & string,
          GetParentProvides<TInternalState>
        >;
