/**
 * Merge result types for GraphBuilder.
 *
 * This module contains all compile-time validation types for the merge() method.
 *
 * @packageDocumentation
 */

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
  DefaultMaxDepth,
} from "../validation/index.js";
import type { IsNever } from "../common/index.js";
import type { GraphBuilder } from "../graph/builder.js";

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
