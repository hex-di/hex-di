/**
 * Type-Level Initialization Order (Topological Sort).
 *
 * Computes a type-level topological ordering of the dependency graph using
 * Kahn's algorithm (source-removal). This enables compile-time verification
 * that the initialization order respects all dependency edges.
 *
 * Bounded to a recursion depth of 50 to avoid TS2589 errors. For graphs
 * exceeding this depth, the type gracefully degrades to `string[]`.
 *
 * @packageDocumentation
 */

import type { GetDirectDeps } from "./cycle/detection.js";

// =============================================================================
// Helper Types
// =============================================================================

/**
 * @internal
 */
type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

/**
 * @internal
 */
type LastOfUnion<U> =
  UnionToIntersection<U extends unknown ? () => U : never> extends () => infer Last ? Last : never;

/**
 * Converts a string union to a tuple.
 * @internal
 */
type UnionToTuple<U, TAcc extends readonly string[] = []> = [U] extends [never]
  ? TAcc
  : LastOfUnion<U> extends infer Last extends string
    ? UnionToTuple<Exclude<U, Last>, [...TAcc, Last]>
    : TAcc;

// =============================================================================
// Source Finding (Kahn's Algorithm Step)
// =============================================================================

/**
 * Finds all source nodes: ports whose deps are all already processed.
 * @internal
 */
type FindSources<
  TDepGraph,
  TProvides extends string,
  TProcessed extends string,
> = TProvides extends infer P extends string
  ? P extends TProcessed
    ? never
    : [Exclude<Extract<GetDirectDeps<TDepGraph, P>, string>, TProcessed>] extends [never]
      ? P
      : never
  : never;

// =============================================================================
// Topological Sort (Kahn's Algorithm)
// =============================================================================

/**
 * Type-level topological sort producing initialization order.
 * Uses source-removal (Kahn's algorithm) bounded to 50 iterations.
 *
 * @internal
 */
type TopologicalSortImpl<
  TDepGraph,
  TProvides extends string,
  TProcessed extends string = never,
  TResult extends readonly string[] = [],
  TCounter extends readonly unknown[] = [],
> = TCounter["length"] extends 50
  ? string[]
  : [Exclude<TProvides, TProcessed>] extends [never]
    ? TResult
    : FindSources<TDepGraph, TProvides, TProcessed> extends infer TSources extends string
      ? [TSources] extends [never]
        ? string[] // cycle or stuck
        : UnionToTuple<TSources> extends infer TSourceTuple extends readonly string[]
          ? TopologicalSortImpl<
              TDepGraph,
              TProvides,
              TProcessed | TSources,
              readonly [...TResult, ...TSourceTuple],
              [...TCounter, unknown]
            >
          : string[]
      : string[];

// =============================================================================
// Public API
// =============================================================================

/**
 * Computes the type-level initialization order (topological sort) of a graph.
 *
 * Given a GraphBuilder, produces an ordered tuple of port names representing
 * the initialization sequence. Ports with no dependencies appear first;
 * ports that depend on others appear after their dependencies.
 *
 * For small graphs (up to ~50 ports), this produces an exact ordered tuple.
 * For larger graphs, it gracefully degrades to `string[]`.
 *
 * @typeParam TBuilder - A GraphBuilder instance
 *
 * @example
 * ```typescript
 * const builder = GraphBuilder.create()
 *   .provide(configAdapter)
 *   .provide(dbAdapter)
 *   .provide(userAdapter);
 *
 * // Type-level initialization order
 * type Order = InitializationOrder<typeof builder>;
 * // ["Config", "Database", "UserService"]
 * ```
 */
export type InitializationOrder<TBuilder> = TBuilder extends {
  __internalState: infer TInternals;
}
  ? TInternals extends { depGraph: infer TDepGraph }
    ? Extract<keyof TDepGraph, string> extends infer TNames extends string
      ? TopologicalSortImpl<TDepGraph, TNames>
      : readonly string[]
    : readonly string[]
  : readonly string[];
