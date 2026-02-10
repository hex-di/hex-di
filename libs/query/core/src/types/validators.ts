/**
 * Compile-time validators for query dependency graphs and mutation effects.
 *
 * These types produce human-readable error messages at compile time when
 * invalid configurations are detected.
 *
 * @packageDocumentation
 */

// =============================================================================
// Minimal structural type for port name extraction
// =============================================================================

/**
 * Minimal structural type for any object that has a `__portName` property.
 * Used instead of `AnyQueryPort` to avoid variance issues with contravariant
 * type parameters (e.g. TParams in QueryFetcher).
 */
type NamedPort = { readonly __portName: string };

// =============================================================================
// ValidateQueryDependencies
// =============================================================================

/**
 * Validates that a query port's dependsOn array does not create circular deps.
 * Checks that the port itself is not in its dependency chain.
 *
 * Returns `true` if valid, or an error string literal if invalid.
 */
export type ValidateQueryDependencies<
  TPortName extends string,
  TDependsOn extends ReadonlyArray<NamedPort>,
> = [ExtractPortNames<TDependsOn>] extends [never]
  ? true
  : TPortName extends ExtractPortNames<TDependsOn>
    ? `Error: Query port '${TPortName}' has a circular dependency on itself.`
    : true;

// =============================================================================
// FindMissingPorts
// =============================================================================

/**
 * Given a set of dependency port names and available port names,
 * returns the missing port names or `never` if all are available.
 */
export type FindMissingPorts<
  TDependsOn extends ReadonlyArray<NamedPort>,
  TAvailable extends string,
> = Exclude<ExtractPortNames<TDependsOn>, TAvailable>;

// =============================================================================
// ValidateMutationEffects
// =============================================================================

/**
 * Validates that mutation effects (invalidates/removes) reference
 * ports that exist in the available set.
 *
 * Returns `true` if valid, or an error string literal if invalid.
 */
export type ValidateMutationEffects<
  TEffects extends {
    readonly invalidates?: ReadonlyArray<NamedPort>;
    readonly removes?: ReadonlyArray<NamedPort>;
  },
  TAvailable extends string,
> =
  ValidateEffectList<ExtractInvalidateNames<TEffects>, TAvailable, "invalidates"> extends true
    ? ValidateEffectList<ExtractRemoveNames<TEffects>, TAvailable, "removes">
    : ValidateEffectList<ExtractInvalidateNames<TEffects>, TAvailable, "invalidates">;

// =============================================================================
// ValidateQueryAdapterLifetime
// =============================================================================

/**
 * Validates that an adapter's lifetime is not shorter than its dependencies'.
 * A singleton adapter must not depend on a scoped or transient adapter.
 *
 * Lifetime hierarchy: singleton > scoped > transient
 */
export type ValidateQueryAdapterLifetime<
  TAdapterLifetime extends "singleton" | "scoped" | "transient",
  TDepLifetimes extends ReadonlyArray<"singleton" | "scoped" | "transient">,
> = TAdapterLifetime extends "singleton"
  ? HasNonSingleton<TDepLifetimes> extends true
    ? `Error: Singleton adapter cannot depend on scoped or transient dependencies (captive dependency).`
    : true
  : TAdapterLifetime extends "scoped"
    ? HasTransient<TDepLifetimes> extends true
      ? `Error: Scoped adapter cannot depend on transient dependencies (captive dependency).`
      : true
    : true;

// =============================================================================
// Internal Helpers
// =============================================================================

/** Extract port names from a ReadonlyArray of named ports */
type ExtractPortNames<TPorts extends ReadonlyArray<NamedPort>> = TPorts extends readonly []
  ? never
  : TPorts[number]["__portName"];

/** Extract invalidation target names from mutation effects */
type ExtractInvalidateNames<TEffects> = TEffects extends {
  readonly invalidates: readonly [NamedPort, ...ReadonlyArray<NamedPort>];
}
  ? TEffects["invalidates"][number]["__portName"]
  : never;

/** Extract removal target names from mutation effects */
type ExtractRemoveNames<TEffects> = TEffects extends {
  readonly removes: readonly [NamedPort, ...ReadonlyArray<NamedPort>];
}
  ? TEffects["removes"][number]["__portName"]
  : never;

/** Validate an effect list against available ports */
type ValidateEffectList<
  TEffectNames extends string,
  TAvailable extends string,
  TEffectType extends string,
> = [Exclude<TEffectNames, TAvailable>] extends [never]
  ? true
  : `Error: Mutation ${TEffectType} references unknown ports: ${Exclude<TEffectNames, TAvailable>}`;

/** Check if any lifetime in the array is non-singleton */
type HasNonSingleton<T extends ReadonlyArray<string>> =
  T extends ReadonlyArray<infer U>
    ? "scoped" extends U
      ? true
      : "transient" extends U
        ? true
        : false
    : false;

/** Check if any lifetime in the array is transient */
type HasTransient<T extends ReadonlyArray<string>> =
  T extends ReadonlyArray<infer U> ? ("transient" extends U ? true : false) : false;

// =============================================================================
// Type-Level Graph Reachability (Transitive Cycle Detection)
// =============================================================================

/**
 * A type-level adjacency map. Maps node names to their neighbor names.
 * Example: `{ A: "B" | "C"; B: "D"; C: never; D: never }`
 */
export type AdjacencyMap = Record<string, string>;

/**
 * Adds a directed edge from TFrom to TTo in the graph.
 * Merges the new neighbor into the existing neighbor union for TFrom.
 */
export type AddEdge<
  TGraph extends AdjacencyMap,
  TFrom extends string,
  TTo extends string,
> = TGraph & { readonly [K in TFrom]: K extends keyof TGraph ? TGraph[K] | TTo : TTo };

/**
 * Checks if TTo is reachable from TFrom in TGraph.
 *
 * Uses a visited set (TVisited) to prevent infinite recursion on cycles.
 * Returns `true` if reachable, `false` otherwise.
 */
export type IsReachable<
  TGraph extends AdjacencyMap,
  TFrom extends string,
  TTo extends string,
  TVisited extends string = never,
> = TFrom extends TVisited
  ? false
  : TFrom extends keyof TGraph
    ? TTo extends TGraph[TFrom]
      ? true
      : IsReachableViaNeighbors<TGraph, TGraph[TFrom], TTo, TVisited | TFrom>
    : false;

/**
 * Distributes IsReachable over a union of neighbor nodes.
 * Returns `true` if any neighbor can reach TTo.
 *
 * Uses `true extends X ? true : ...` to short-circuit when distribution
 * produces `true` for any branch (union distributes, then we check if
 * `true` is in the resulting union).
 */
export type IsReachableViaNeighbors<
  TGraph extends AdjacencyMap,
  TNeighbors extends string,
  TTo extends string,
  TVisited extends string,
> = [TNeighbors] extends [never]
  ? false
  : true extends (
        TNeighbors extends infer N extends string ? IsReachable<TGraph, N, TTo, TVisited> : never
      )
    ? true
    : false;
