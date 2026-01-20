/**
 * Grouped internal type parameters for GraphBuilder.
 *
 * This module contains types that group the internal phantom type parameters
 * used by GraphBuilder. Grouping reduces the number of visible type parameters
 * from 8 to 5, improving IDE tooltip readability.
 *
 * ## Parameter Groups
 *
 * **User-facing parameters** (remain as separate type params):
 * - `TProvides` - Union of provided port types
 * - `TRequires` - Union of required port types
 * - `TAsyncPorts` - Union of async port types
 * - `TOverrides` - Union of override port types
 *
 * **Internal parameters** (grouped into BuilderInternals):
 * - `depGraph` - Type-level dependency map for cycle detection
 * - `lifetimeMap` - Type-level lifetime map for captive detection
 * - `parentProvides` - Parent graph's provided ports
 * - `maxDepth` - Maximum cycle detection depth
 *
 * @packageDocumentation
 */

import type { DefaultMaxDepth } from "../validation/index.js";
import type { EmptyDependencyGraph, EmptyLifetimeMap } from "./empty-state.js";

// =============================================================================
// Grouped Internal Parameters
// =============================================================================

/**
 * Groups internal phantom type parameters for GraphBuilder.
 *
 * This type encapsulates the 4 internal parameters that users typically don't
 * need to see in IDE tooltips. By grouping them, the GraphBuilder signature
 * becomes cleaner:
 *
 * **Before** (8 parameters):
 * ```typescript
 * GraphBuilder<TProvides, TRequires, TAsyncPorts, TDepGraph, TLifetimeMap, TOverrides, TParentProvides, TMaxDepth>
 * ```
 *
 * **After** (5 parameters):
 * ```typescript
 * GraphBuilder<TProvides, TRequires, TAsyncPorts, TOverrides, TInternals>
 * ```
 *
 * @typeParam TDepGraph - Type-level dependency map for cycle detection
 * @typeParam TLifetimeMap - Type-level lifetime map for captive detection
 * @typeParam TParentProvides - Parent graph's provided ports (unknown if no parent)
 * @typeParam TMaxDepth - Maximum cycle detection depth
 */
export interface BuilderInternals<
  TDepGraph = EmptyDependencyGraph,
  TLifetimeMap = EmptyLifetimeMap,
  TParentProvides = unknown,
  TMaxDepth extends number = DefaultMaxDepth,
> {
  /** Type-level dependency map for cycle detection */
  readonly depGraph: TDepGraph;
  /** Type-level lifetime map for captive detection */
  readonly lifetimeMap: TLifetimeMap;
  /** Parent graph's provided ports (unknown if no parent) */
  readonly parentProvides: TParentProvides;
  /** Maximum cycle detection depth */
  readonly maxDepth: TMaxDepth;
}

/**
 * Default internals for a new empty GraphBuilder.
 */
export type DefaultInternals = BuilderInternals<
  EmptyDependencyGraph,
  EmptyLifetimeMap,
  unknown,
  DefaultMaxDepth
>;

// =============================================================================
// Extraction Utilities
// =============================================================================

/**
 * Extracts the dependency graph from BuilderInternals.
 */
export type GetDepGraph<T> =
  T extends BuilderInternals<
    infer TDepGraph,
    infer _TLifetimeMap,
    infer _TParentProvides,
    infer _TMaxDepth
  >
    ? TDepGraph
    : never;

/**
 * Extracts the lifetime map from BuilderInternals.
 */
export type GetLifetimeMap<T> =
  T extends BuilderInternals<
    infer _TDepGraph,
    infer TLifetimeMap,
    infer _TParentProvides,
    infer _TMaxDepth
  >
    ? TLifetimeMap
    : never;

/**
 * Extracts the parent provides from BuilderInternals.
 */
export type GetParentProvides<T> =
  T extends BuilderInternals<
    infer _TDepGraph,
    infer _TLifetimeMap,
    infer TParentProvides,
    infer _TMaxDepth
  >
    ? TParentProvides
    : never;

/**
 * Extracts the max depth from BuilderInternals.
 */
export type GetMaxDepth<T> =
  T extends BuilderInternals<
    infer _TDepGraph,
    infer _TLifetimeMap,
    infer _TParentProvides,
    infer TMaxDepth
  >
    ? TMaxDepth
    : never;

/**
 * Creates a new BuilderInternals with an updated dependency graph.
 */
export type WithDepGraph<T, TNewDepGraph> =
  T extends BuilderInternals<
    infer _TDepGraph,
    infer TLifetimeMap,
    infer TParentProvides,
    infer TMaxDepth
  >
    ? BuilderInternals<TNewDepGraph, TLifetimeMap, TParentProvides, TMaxDepth>
    : never;

/**
 * Creates a new BuilderInternals with an updated lifetime map.
 */
export type WithLifetimeMap<T, TNewLifetimeMap> =
  T extends BuilderInternals<
    infer TDepGraph,
    infer _TLifetimeMap,
    infer TParentProvides,
    infer TMaxDepth
  >
    ? BuilderInternals<TDepGraph, TNewLifetimeMap, TParentProvides, TMaxDepth>
    : never;

/**
 * Creates a new BuilderInternals with updated dependency graph and lifetime map.
 */
export type WithDepGraphAndLifetimeMap<T, TNewDepGraph, TNewLifetimeMap> =
  T extends BuilderInternals<
    infer _TDepGraph,
    infer _TLifetimeMap,
    infer TParentProvides,
    infer TMaxDepth
  >
    ? BuilderInternals<TNewDepGraph, TNewLifetimeMap, TParentProvides, TMaxDepth>
    : never;

/**
 * Creates a new BuilderInternals with a specified parent provides.
 */
export type WithParentProvides<T, TNewParentProvides> =
  T extends BuilderInternals<
    infer TDepGraph,
    infer TLifetimeMap,
    infer _TParentProvides,
    infer TMaxDepth
  >
    ? BuilderInternals<TDepGraph, TLifetimeMap, TNewParentProvides, TMaxDepth>
    : never;

/**
 * Creates a new BuilderInternals with a specified max depth.
 */
export type WithMaxDepth<T, TNewMaxDepth extends number> =
  T extends BuilderInternals<
    infer TDepGraph,
    infer TLifetimeMap,
    infer TParentProvides,
    infer _TMaxDepth
  >
    ? BuilderInternals<TDepGraph, TLifetimeMap, TParentProvides, TNewMaxDepth>
    : never;

// =============================================================================
// Merge Utilities
// =============================================================================

/**
 * Merges two BuilderInternals during graph merge.
 *
 * The merged result:
 * - Combines dependency graphs
 * - Combines lifetime maps
 * - Preserves parent provides from the first internals
 * - Uses the max depth from the first internals
 */
export type MergeInternals<T1, _T2, TMergedDepGraph, TMergedLifetimeMap> =
  T1 extends BuilderInternals<
    infer _TDepGraph1,
    infer _TLifetimeMap1,
    infer TParentProvides,
    infer TMaxDepth
  >
    ? BuilderInternals<TMergedDepGraph, TMergedLifetimeMap, TParentProvides, TMaxDepth>
    : never;
