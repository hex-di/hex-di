/**
 * Compile-Time Circular Dependency Detection for @hex-di/graph.
 *
 * This module provides type-level utilities for detecting circular dependencies
 * at compile time. A circular dependency occurs when a chain of adapters forms
 * a cycle (e.g., A -> B -> C -> A).
 *
 * The detection works by:
 * 1. Tracking a type-level dependency map as adapters are added
 * 2. Checking if adding a new adapter would create a cycle
 * 3. Producing readable error messages showing the cycle path
 *
 * @packageDocumentation
 */

import type { Port, InferPortName } from "@hex-di/ports";

// =============================================================================
// Adapter Name Extraction
// =============================================================================

/**
 * Extracts the port name string from an adapter's provides property.
 *
 * @typeParam A - The adapter type
 * @returns The port name as a string literal type
 *
 * @example
 * ```typescript
 * const LoggerAdapter = createAdapter({ provides: LoggerPort, ... });
 * type Name = AdapterProvidesName<typeof LoggerAdapter>; // "Logger"
 * ```
 */
export type AdapterProvidesName<A> = A extends { provides: Port<unknown, infer Name> }
  ? Name
  : never;

/**
 * Extracts all required port names from an adapter as a union.
 *
 * @typeParam A - The adapter type
 * @returns Union of required port name string literals
 *
 * @example
 * ```typescript
 * const ServiceAdapter = createAdapter({
 *   provides: ServicePort,
 *   requires: [LoggerPort, ConfigPort],
 *   ...
 * });
 * type Names = AdapterRequiresNames<typeof ServiceAdapter>; // "Logger" | "Config"
 * ```
 */
export type AdapterRequiresNames<A> = A extends { requires: readonly (infer R)[] }
  ? R extends Port<unknown, infer Name>
    ? Name
    : never
  : never;

// =============================================================================
// Dependency Map Operations
// =============================================================================

/**
 * Adds an edge to the type-level dependency map.
 *
 * The dependency map is a mapped type where keys are port names and values
 * are unions of required port names.
 *
 * @typeParam TMap - The current dependency map
 * @typeParam TProvides - The port name being provided
 * @typeParam TRequires - Union of port names required
 *
 * @example
 * ```typescript
 * type Map1 = {}; // Empty graph
 * type Map2 = AddEdge<Map1, "Logger", never>; // { Logger: never }
 * type Map3 = AddEdge<Map2, "Service", "Logger" | "Config">; // { Logger: never, Service: "Logger" | "Config" }
 * ```
 */
export type AddEdge<TMap, TProvides extends string, TRequires extends string> = TMap & {
  [K in TProvides]: TRequires;
};

/**
 * Gets the direct dependencies of a port from the dependency map.
 *
 * @typeParam TMap - The dependency map
 * @typeParam TPort - The port name to look up
 * @returns Union of required port names, or never if not found
 */
export type GetDirectDeps<TMap, TPort extends string> =
  TMap extends Record<TPort, infer Deps> ? Deps : never;

/**
 * Checks if a type is never.
 * Uses the fact that [T] extends [never] is true only when T is never.
 */
type IsNever<T> = [T] extends [never] ? true : false;

// =============================================================================
// Depth-Limited Recursion Utilities
// =============================================================================

/**
 * Maximum recursion depth for type-level graph traversal.
 * TypeScript typically allows 50-100 levels of recursion.
 * We use 30 as a safe limit that handles most real-world cycles.
 */
type MaxDepth = 30;

/**
 * Depth counter using tuple length.
 * Each recursive call adds an element to track depth.
 */
type Depth = readonly unknown[];

/**
 * Increments the depth counter by adding an element to the tuple.
 */
type IncrementDepth<D extends Depth> = [...D, unknown];

/**
 * Checks if the maximum recursion depth has been exceeded.
 */
type DepthExceeded<D extends Depth> = D["length"] extends MaxDepth ? true : false;

// =============================================================================
// Reachability Check (Core Cycle Detection)
// =============================================================================

/**
 * Checks if a target port is reachable from a source port in the dependency map.
 *
 * This is the core algorithm for cycle detection. It performs a depth-limited
 * graph traversal, checking if we can reach the target port by following
 * dependency edges.
 *
 * @typeParam TMap - The dependency graph map
 * @typeParam TFrom - Starting port name (or union of names)
 * @typeParam TTarget - Target port name we're looking for
 * @typeParam TVisited - Set of already visited ports (prevents infinite loops)
 * @typeParam TDepth - Current recursion depth counter
 *
 * @returns `true` if target is reachable, `false` otherwise
 *
 * @remarks
 * - Returns `false` if depth limit is exceeded (assumes no cycle)
 * - Returns `false` if current port was already visited
 * - Returns `true` if current port equals target
 * - Otherwise recursively checks all dependencies
 */
export type IsReachable<
  TMap,
  TFrom extends string,
  TTarget extends string,
  TVisited extends string = never,
  TDepth extends Depth = [],
> =
  // Check depth limit first
  DepthExceeded<TDepth> extends true
    ? false // Assume no cycle if depth exceeded (runtime will catch it)
    : // Handle never case explicitly (no more nodes to check)
      IsNever<TFrom> extends true
      ? false
      : // Distribute over union - check each port in TFrom
        TFrom extends string
        ? // Skip if already visited (prevents infinite loops)
          TFrom extends TVisited
          ? false
          : // Found the target - cycle detected!
            TFrom extends TTarget
            ? true
            : // Get dependencies of current port
              IsReachable_CheckDeps<TMap, TFrom, TTarget, TVisited, TDepth>
        : false;

/**
 * Helper type to check dependencies, handling the never case.
 * @internal
 */
type IsReachable_CheckDeps<
  TMap,
  TFrom extends string,
  TTarget extends string,
  TVisited extends string,
  TDepth extends Depth,
> =
  GetDirectDeps<TMap, TFrom> extends infer Deps
    ? IsNever<Deps> extends true
      ? false // No dependencies, can't reach target
      : Deps extends string
        ? IsReachable<TMap, Deps, TTarget, TVisited | TFrom, IncrementDepth<TDepth>>
        : false
    : false;

/**
 * Checks if adding a new adapter would create a circular dependency.
 *
 * A cycle exists if the port being provided can be reached by following
 * the dependency chain starting from any of the required ports.
 *
 * @typeParam TMap - The current dependency graph (before adding the new adapter)
 * @typeParam TProvides - The port name the new adapter provides
 * @typeParam TRequires - Union of port names the new adapter requires
 *
 * @returns `true` if adding this adapter would create a cycle, `false` otherwise
 *
 * @example
 * ```typescript
 * // Graph: { A: 'B', B: 'C' }
 * // Adding adapter that provides 'C' and requires 'A' would create: A -> B -> C -> A
 * type HasCycle = WouldCreateCycle<{ A: 'B', B: 'C' }, 'C', 'A'>; // true
 * ```
 */
export type WouldCreateCycle<TMap, TProvides extends string, TRequires extends string> =
  // No requirements means no cycle possible
  IsNever<TRequires> extends true
    ? false
    : // Self-reference check: if provides equals any require, it's a cycle
      TProvides extends TRequires
      ? true
      : // Check if TProvides is reachable from TRequires through existing graph
        // Note: We check the EXISTING graph, not the one with the new edge
        // because the new edge goes FROM TProvides TO TRequires, not the reverse
        IsReachable<TMap, TRequires, TProvides>;

// =============================================================================
// Cycle Path Extraction for Error Messages
// =============================================================================

/**
 * Finds and formats the cycle path for error messages.
 *
 * This type traverses the dependency graph to build a human-readable
 * string showing the cycle path (e.g., "A -> B -> C -> A").
 *
 * @typeParam TMap - The dependency graph map (with the new edge added)
 * @typeParam TFrom - Starting port name
 * @typeParam TTarget - Target port name (completes the cycle)
 * @typeParam TPath - Accumulated path string
 * @typeParam TVisited - Set of visited ports
 * @typeParam TDepth - Recursion depth counter
 */
export type FindCyclePath<
  TMap,
  TFrom extends string,
  TTarget extends string,
  TPath extends string = "",
  TVisited extends string = never,
  TDepth extends Depth = [],
> =
  DepthExceeded<TDepth> extends true
    ? "... (cycle too deep to display)"
    : TFrom extends TVisited
      ? never
      : TFrom extends TTarget
        ? TPath extends ""
          ? TTarget
          : `${TPath} -> ${TTarget}`
        : TFrom extends string
          ? GetDirectDeps<TMap, TFrom> extends infer Deps
            ? Deps extends string
              ? FindCyclePath<
                  TMap,
                  Deps,
                  TTarget,
                  TPath extends "" ? TFrom : `${TPath} -> ${TFrom}`,
                  TVisited | TFrom,
                  IncrementDepth<TDepth>
                >
              : never
            : never
          : never;

/**
 * Builds the initial cycle path starting from the provides port.
 *
 * @typeParam TMap - The dependency graph (with new edge added)
 * @typeParam TProvides - The port that completes the cycle
 * @typeParam TRequires - The first required port(s) to start traversal
 */
export type BuildCyclePath<
  TMap,
  TProvides extends string,
  TRequires extends string,
> = FindCyclePath<TMap, TRequires, TProvides, TProvides>;

// =============================================================================
// CircularDependencyError Type
// =============================================================================

/**
 * A branded error type that produces a readable compile-time error message
 * when a circular dependency is detected.
 *
 * This type is returned by the cycle detection logic when adding an adapter
 * would create a dependency cycle. The error message shows the complete
 * cycle path to help developers identify and fix the issue.
 *
 * @typeParam TCyclePath - The cycle path as a template literal string
 *
 * @returns A branded error type with:
 * - `__valid: false` - Indicates an invalid graph state
 * - `__errorBrand: 'CircularDependencyError'` - For type discrimination
 * - `__message: string` - Human-readable error message with cycle path
 * - `__cyclePath: string` - The raw cycle path
 *
 * @example
 * ```typescript
 * type Error = CircularDependencyError<"UserService -> Database -> Cache -> UserService">;
 * // {
 * //   __valid: false;
 * //   __errorBrand: 'CircularDependencyError';
 * //   __message: "Circular dependency detected: UserService -> Database -> Cache -> UserService";
 * //   __cyclePath: "UserService -> Database -> Cache -> UserService";
 * // }
 * ```
 */
export type CircularDependencyError<TCyclePath extends string> = {
  readonly __valid: false;
  readonly __errorBrand: "CircularDependencyError";
  readonly __message: `Circular dependency detected: ${TCyclePath}`;
  readonly __cyclePath: TCyclePath;
};

// =============================================================================
// Batch Merge Utilities
// =============================================================================

/**
 * Merges two dependency maps together.
 * Used when merging GraphBuilders.
 *
 * @typeParam TMap1 - First dependency map
 * @typeParam TMap2 - Second dependency map
 */
export type MergeDependencyMaps<TMap1, TMap2> = TMap1 & TMap2;

/**
 * Adds multiple edges to the dependency map from an array of adapters.
 *
 * @typeParam TMap - Current dependency map
 * @typeParam TAdapters - Readonly array of adapter types
 */
export type AddManyEdges<TMap, TAdapters extends readonly unknown[]> = TAdapters extends readonly [
  infer First,
  ...infer Rest,
]
  ? AddManyEdges<AddEdge<TMap, AdapterProvidesName<First>, AdapterRequiresNames<First>>, Rest>
  : TMap;

/**
 * Checks if adding multiple adapters would create any cycles.
 * Returns the first cycle found or false if no cycles.
 *
 * @typeParam TMap - Current dependency map
 * @typeParam TAdapters - Adapters to check
 */
export type WouldAnyCreateCycle<
  TMap,
  TAdapters extends readonly unknown[],
> = TAdapters extends readonly [infer First, ...infer Rest]
  ? WouldCreateCycle<TMap, AdapterProvidesName<First>, AdapterRequiresNames<First>> extends true
    ? CircularDependencyError<
        BuildCyclePath<
          AddEdge<TMap, AdapterProvidesName<First>, AdapterRequiresNames<First>>,
          AdapterProvidesName<First>,
          AdapterRequiresNames<First>
        >
      >
    : WouldAnyCreateCycle<
        AddEdge<TMap, AdapterProvidesName<First>, AdapterRequiresNames<First>>,
        Rest
      >
  : false;
