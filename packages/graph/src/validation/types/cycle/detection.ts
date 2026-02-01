/**
 * Cycle Detection Types.
 *
 * This module provides type utilities for cycle detection in dependency graphs:
 * - Adapter name extraction for building dependency edges
 * - Dependency map operations for tracking port dependencies
 * - Reachability algorithm for detecting cycles at the type level
 *
 * @packageDocumentation
 */

import type { IsNever, Prettify } from "@hex-di/core";
import type { Depth, DefaultMaxDepth, DepthExceeded, IncrementDepth } from "./depth.js";

// Re-export canonical adapter extraction types from consolidated module
export type {
  AdapterProvidesName,
  AdapterRequiresNames,
  ExtractRequiresStrings,
} from "../adapter-extraction.js";

// Import for local use in this module
import type {
  AdapterProvidesName,
  AdapterRequiresNames,
  ExtractRequiresStrings,
} from "../adapter-extraction.js";

// =============================================================================
// Depth Exceeded Result Type
// =============================================================================

/**
 * Unique symbol for DepthExceededResult branding.
 *
 * This symbol is declared but never defined, creating a truly unique
 * type-level brand that cannot be matched by any runtime object.
 *
 * @internal
 */
declare const __depthExceededBrand: unique symbol;

/**
 * Branded type indicating depth limit was reached during traversal.
 *
 * ## IMPORTANT: DepthExceededResult is NOT a cycle detection!
 *
 * This is a critical semantic distinction:
 *
 * | Result               | Meaning                            | Cycle Status      |
 * |----------------------|------------------------------------|-------------------|
 * | `true`               | Target port IS reachable           | Cycle EXISTS      |
 * | `false`              | Target port is NOT reachable       | No cycle          |
 * | `DepthExceededResult`| Analysis stopped (depth limit)     | **UNKNOWN**       |
 *
 * `DepthExceededResult` means the traversal was **cut short** before completing.
 * It does NOT indicate a cycle was found or not found - the result is inconclusive.
 *
 * ## Port Provenance (TLastPort)
 *
 * The `TLastPort` parameter tracks which port was being processed when the depth
 * limit was reached. This helps developers understand:
 * 1. Where in the dependency chain the traversal stopped
 * 2. Which port's dependencies need review
 * 3. Whether the depth is legitimate or indicates a design issue
 *
 * ## Why This Matters
 *
 * Unlike a simple `false`, this type carries semantic meaning:
 * - `false` = definitively not reachable (traversal completed, no cycle)
 * - `DepthExceededResult` = inconclusive (traversal was cut short before conclusion)
 *
 * This distinction allows the system to:
 * 1. **Skip compile-time rejection**: Don't reject code that MIGHT be valid
 * 2. **Defer to runtime**: Let runtime validation catch actual cycles
 * 3. **Provide informative messages**: Suggest increasing `maxDepth` via `withMaxDepth()`
 *
 * ## When This Occurs
 *
 * Depth limit is exceeded when the dependency chain is deeper than `maxDepth`:
 * - Default `maxDepth` is 50 (sufficient for most graphs)
 * - Deeply nested graphs may need higher limits via `GraphBuilder.withMaxDepth(100)`
 * - Very large graphs should rely on runtime validation for full cycle detection
 *
 * ## Unique Symbol Branding
 *
 * Uses a unique symbol brand to ensure no other type can accidentally match.
 * Generic branded objects like `{ __brand: "DepthExceeded" }` will NOT match.
 *
 * @typeParam TLastPort - The port being processed when depth limit was hit (default: string)
 *
 * @example
 * ```typescript
 * type Result = IsReachable<DeepGraph, "A", "Z">;
 * type IsInconclusive = IsDepthExceeded<Result>; // true if hit limit
 * type WhichPort = ExtractDepthExceededPort<Result>; // port name where limit was hit
 *
 * // Inconclusive means "we don't know", NOT "cycle detected"
 * type Example = DepthExceededResult extends true ? "cycle" : "no-cycle";
 * //   ^? Example = "no-cycle" (DepthExceededResult is a branded object, not true)
 * ```
 *
 * @internal
 */
export type DepthExceededResult<TLastPort extends string = string> = {
  readonly [__depthExceededBrand]: true;
  readonly lastPort: TLastPort;
};

/**
 * Checks if a reachability result indicates depth limit was exceeded.
 *
 * @typeParam T - The result from IsReachable
 * @returns `true` if the result is a DepthExceededResult, `false` otherwise
 *
 * @internal
 */
export type IsDepthExceeded<T> = T extends { readonly [__depthExceededBrand]: true } ? true : false;

/**
 * Extracts the port name from a DepthExceededResult.
 *
 * When depth limit is exceeded, this type extracts the `lastPort` property
 * which indicates which port was being processed when the limit was hit.
 *
 * @typeParam T - The result to extract from
 * @returns The port name if T is DepthExceededResult, `never` otherwise
 *
 * @example
 * ```typescript
 * type Result = DepthExceededResult<"DeepPort">;
 * type Port = ExtractDepthExceededPort<Result>; // "DeepPort"
 *
 * type NotExceeded = ExtractDepthExceededPort<false>; // never
 * ```
 *
 * @internal
 */
export type ExtractDepthExceededPort<T> =
  T extends DepthExceededResult<infer TPort> ? TPort : never;

// =============================================================================
// Dependency Map Operations (Shared Graph Utilities)
// =============================================================================
//
// These utilities are shared across multiple validation modules:
// - cycle/: Cycle detection uses AddEdge, GetDirectDeps, MergeDependencyMaps
// - captive/: Captive detection imports GetDirectDeps from this module
// - builder/: Init order uses GetDirectDeps for topological sorting
//
// The dependency map is the core data structure for tracking port dependencies
// at the type level. It's a mapped type { [PortName]: RequiredPortNames }.

/**
 * Adds an edge to the type-level dependency map.
 *
 * The dependency map is a mapped type where keys are port names and values
 * are unions of required port names.
 *
 * @typeParam TDepGraph - The current dependency map
 * @typeParam TProvides - The port name being provided
 * @typeParam TRequires - Union of port names required
 *
 * @example
 * ```typescript
 * type Map1 = {}; // Empty graph
 * type Map2 = AddEdge<Map1, "Logger", never>; // { Logger: never }
 * type Map3 = AddEdge<Map2, "Service", "Logger" | "Config">; // { Logger: never, Service: "Logger" | "Config" }
 * ```
 *
 * @internal
 */
export type AddEdge<TDepGraph, TProvides extends string, TRequires extends string> = Prettify<
  TDepGraph & { [K in TProvides]: TRequires }
>;

/**
 * Gets the direct dependencies of a port from the dependency map.
 *
 * Uses indexed access (`TDepGraph[TPort]`) rather than `extends Record<TPort, infer Deps>`
 * because the Record pattern doesn't work correctly with intersection types
 * from merged graphs (e.g., `{ A: never } & { B: "A" }`).
 *
 * @typeParam TDepGraph - The dependency map
 * @typeParam TPort - The port name to look up
 * @returns Union of required port names, or never if not found
 *
 * @internal
 */
export type GetDirectDeps<TDepGraph, TPort extends string> = TPort extends keyof TDepGraph
  ? TDepGraph[TPort]
  : never;

/**
 * Merges two dependency maps together.
 * Used when merging GraphBuilders.
 *
 * @typeParam TDepGraph1 - First dependency map
 * @typeParam TDepGraph2 - Second dependency map
 *
 * @internal
 */
export type MergeDependencyMaps<TDepGraph1, TDepGraph2> = Prettify<TDepGraph1 & TDepGraph2>;

/**
 * Adds multiple edges to the dependency map from an array of adapters.
 *
 * Uses `ExtractRequiresStrings` to safely handle cases where `AdapterRequiresNames`
 * returns `MalformedAdapterError` (for adapters missing the `requires` property).
 * Malformed adapters are treated as having no dependencies for graph construction.
 *
 * @typeParam TDepGraph - Current dependency map
 * @typeParam TAdapters - Readonly array of adapter types
 *
 * @internal
 */
export type AddManyEdges<
  TDepGraph,
  TAdapters extends readonly unknown[],
> = TAdapters extends readonly [infer First, ...infer Rest]
  ? AddManyEdges<
      AddEdge<
        TDepGraph,
        AdapterProvidesName<First>,
        ExtractRequiresStrings<AdapterRequiresNames<First>>
      >,
      Rest
    >
  : TDepGraph;

/**
 * Debug version of GetDirectDeps for type inspection.
 *
 * Provides detailed diagnostic information about dependency map lookups,
 * useful when debugging cycle detection issues or understanding the
 * dependency graph structure.
 *
 * @example
 * ```typescript
 * type DepGraph = { Logger: never; UserService: "Logger" | "Database" };
 * type Debug = DebugGetDirectDeps<DepGraph, "UserService">;
 * // Hover to see:
 * // {
 * //   port: "UserService";
 * //   found: true;
 * //   deps: "Logger" | "Database";
 * //   mapKeys: "Logger" | "UserService";
 * // }
 * ```
 */
export type DebugGetDirectDeps<TDepGraph, TPort extends string> = {
  /** The port being looked up */
  readonly port: TPort;
  /** Whether the port was found in the map */
  readonly found: TPort extends keyof TDepGraph ? true : false;
  /** The direct dependencies (or never if not found) */
  readonly deps: TPort extends keyof TDepGraph ? TDepGraph[TPort] : never;
  /** All ports currently in the map (for debugging) */
  readonly mapKeys: keyof TDepGraph;
};

// =============================================================================
// Reachability Algorithm
// =============================================================================

/**
 * Checks if a target port is reachable from a source port in the dependency map.
 *
 * This is the core algorithm for cycle detection. It performs a depth-limited
 * graph traversal (DFS), checking if we can reach the target port by following
 * dependency edges.
 *
 * ## State Machine Diagram
 *
 * ```
 *                            ┌─────────────────┐
 *                            │     START       │
 *                            │  IsReachable    │
 *                            └────────┬────────┘
 *                                     │
 *                                     ▼
 *                          ┌──────────────────────┐
 *                          │  Check Depth Limit   │
 *                          │  DepthExceeded<>?    │
 *                          └──────────┬───────────┘
 *                                     │
 *                    ┌────────────────┴────────────────┐
 *                    │ true                            │ false
 *                    ▼                                 ▼
 *        ┌─────────────────────┐           ┌──────────────────────┐
 *        │ TERMINAL: EXCEEDED  │           │  Check Never (TFrom) │
 *        │ DepthExceededResult │           │  IsNever<TFrom>?     │
 *        └─────────────────────┘           └──────────┬───────────┘
 *                                                     │
 *                                    ┌────────────────┴────────────────┐
 *                                    │ true                            │ false
 *                                    ▼                                 ▼
 *                        ┌─────────────────────┐           ┌──────────────────────┐
 *                        │  TERMINAL: FALSE    │           │  Distribute Over     │
 *                        │  (no more nodes)    │           │  TFrom extends string│
 *                        └─────────────────────┘           └──────────┬───────────┘
 *                                                                     │
 *                                                                     ▼
 *                                                         ┌──────────────────────┐
 *                                                         │  Check Visited Set   │
 *                                                         │  TFrom ∈ TVisited?   │
 *                                                         └──────────┬───────────┘
 *                                                                    │
 *                                                   ┌────────────────┴────────────────┐
 *                                                   │ true                            │ false
 *                                                   ▼                                 ▼
 *                                       ┌─────────────────────┐           ┌──────────────────────┐
 *                                       │  TERMINAL: FALSE    │           │  Check Target Match  │
 *                                       │  (already visited)  │           │  TFrom === TTarget?  │
 *                                       └─────────────────────┘           └──────────┬───────────┘
 *                                                                                    │
 *                                                                   ┌────────────────┴────────────────┐
 *                                                                   │ true                            │ false
 *                                                                   ▼                                 ▼
 *                                                       ┌─────────────────────┐       ┌───────────────────────┐
 *                                                       │  TERMINAL: TRUE     │       │  IsReachableCheckDeps │
 *                                                       │  (cycle found!)     │       │  (lookup & recurse)   │
 *                                                       └─────────────────────┘       └───────────┬───────────┘
 *                                                                                                 │
 *                                                                                                 ▼
 *                                                                                     ┌──────────────────────┐
 *                                                                                     │  GetDirectDeps       │
 *                                                                                     │  (lookup deps)       │
 *                                                                                     └──────────┬───────────┘
 *                                                                                                │
 *                                                                               ┌────────────────┴────────────────┐
 *                                                                               │ never (no deps)                 │ string (has deps)
 *                                                                               ▼                                 ▼
 *                                                                   ┌─────────────────────┐       ┌───────────────────────┐
 *                                                                   │  TERMINAL: FALSE    │       │  RECURSE              │
 *                                                                   │  (leaf node)        │       │  IsReachable with:    │
 *                                                                   └─────────────────────┘       │  - Deps as new TCurrent │
 *                                                                                                 │  - TVisited | TCurrent │
 *                                                                                                 │  - IncrementDepth     │
 *                                                                                                 └───────────────────────┘
 * ```
 *
 * ## Recursion Pattern: Distributive DFS with Visited Set
 *
 * Uses TypeScript's distributive conditional types to explore all paths
 * simultaneously when `TCurrent` is a union type.
 *
 * ### Base Cases
 * | Condition | Result | Reason |
 * |-----------|--------|--------|
 * | Depth exceeded | `DepthExceededResult` | Prevents TS2589, runtime catches it |
 * | `TCurrent` is `never` | `false` | No more nodes to check |
 * | `TCurrent` in `TVisited` | `false` | Already visited, prevents infinite loops |
 * | `TCurrent` === `TTarget` | `true` | Found the target! |
 *
 * ### Recursive Case
 * Delegates to `IsReachableCheckDeps` which:
 * 1. Looks up dependencies of current port
 * 2. Recurses with dependencies as new starting points
 * 3. Adds current port to visited set
 * 4. Increments depth counter
 *
 * ### Distributive Behavior
 * When `TCurrent` is a union (e.g., `"A" | "B"`), the type distributes and checks
 * each member separately. The final result is `true` if ANY path reaches target.
 *
 * ## Visited Set Bounding
 *
 * The `TVisited` union type grows as `TVisited | TCurrent` per recursion level.
 * This growth is bounded by `TMaxDepth` (default: 50), meaning the visited set
 * can contain at most 50 string literal types. TypeScript handles unions of
 * this size efficiently without performance issues.
 *
 * The depth limit serves two purposes:
 * 1. Prevents TS2589 "Type instantiation is excessively deep" errors
 * 2. Bounds the visited set size to manageable limits
 *
 * @typeParam TDepGraph - The dependency graph map (Record<PortName, RequiredPortNames>)
 * @typeParam TCurrent - Current port(s) being examined (initial call: starting points; recursion: current nodes)
 * @typeParam TTarget - Target port name we're searching for
 * @typeParam TVisited - Type-level Set of already visited ports (union type)
 * @typeParam TDepth - Current recursion depth (tuple whose length = depth)
 * @typeParam TMaxDepth - Maximum allowed depth (default: DefaultMaxDepth)
 *
 * @returns `true` if target is reachable, `false` if not reachable,
 *          or `DepthExceededResult` if depth limit was reached (inconclusive)
 *
 * ## Truth Table
 *
 * | Condition | Result | Reason |
 * |-----------|--------|--------|
 * | `TDepth` exceeds `TMaxDepth` | `DepthExceededResult<TCurrent>` | Depth limit reached (inconclusive) |
 * | `TCurrent` is `never` | `false` | No more nodes to check |
 * | `TCurrent` in `TVisited` | `false` | Already visited (prevents infinite loops) |
 * | `TCurrent` equals `TTarget` | `true` | Found target! Cycle detected |
 * | Otherwise | Recurse via `IsReachableCheckDeps` | Continue BFS traversal |
 *
 * @internal
 */
export type IsReachable<
  TDepGraph,
  TCurrent extends string,
  TTarget extends string,
  TVisited extends string = never,
  TDepth extends Depth = [],
  TMaxDepth extends number = DefaultMaxDepth, // 50 - depth limit for BFS traversal
> =
  // Step 1: Check depth limit first (prevent TS2589)
  DepthExceeded<TDepth, TMaxDepth> extends true
    ? DepthExceededResult<TCurrent> // Return branded type with port provenance
    : // Step 2: Handle never case explicitly (no more nodes to check)
      IsNever<TCurrent> extends true
      ? false
      : // Step 3: Distribute over union - check each port in TCurrent
        // This is where the "for each" magic happens!
        TCurrent extends string
        ? // Step 3a: Skip if already visited (type-level Set membership check)
          TCurrent extends TVisited
          ? false
          : // Step 3b: Found the target - cycle detected!
            TCurrent extends TTarget
            ? true
            : // Step 3c: Recurse with dependencies of current port
              IsReachableCheckDeps<TDepGraph, TCurrent, TTarget, TVisited, TDepth, TMaxDepth>
        : false;

/**
 * Helper type to check dependencies of a port during reachability traversal.
 *
 * This is the "continuation" step of the `IsReachable` algorithm. After checking
 * that the current port isn't visited or the target, we need to explore its dependencies.
 *
 * ## Recursion Pattern: Infer-and-Branch
 *
 * Uses `extends infer Deps` to capture the dependency lookup result, then branches
 * on whether dependencies exist.
 *
 * ### Base Cases
 * | Condition | Result | Reason |
 * |-----------|--------|--------|
 * | `Deps` is `never` | `false` | No dependencies means no path to target |
 * | `Deps` is not `string` | `false` | Invalid dependency type (defensive) |
 * | Lookup fails | `false` | Port not in graph |
 *
 * ### Recursive Case
 * When `Deps` is a valid string union, recurse into `IsReachable` with:
 * - `Deps` as the new TCurrent (distributes over union)
 * - `TVisited | TCurrent` to mark current port as visited (prevents infinite loops)
 * - `IncrementDepth<TDepth>` to track recursion depth (prevents TS2589)
 *
 * @typeParam TDepGraph - The dependency graph map
 * @typeParam TCurrent - The port whose dependencies to check
 * @typeParam TTarget - Target port we're searching for
 * @typeParam TVisited - Already visited ports (union type)
 * @typeParam TDepth - Current recursion depth (tuple)
 * @typeParam TMaxDepth - Maximum allowed depth
 *
 * @returns Result from recursive `IsReachable` call, or `false` for base cases
 *
 * @internal
 */
type IsReachableCheckDeps<
  TDepGraph,
  TCurrent extends string,
  TTarget extends string,
  TVisited extends string,
  TDepth extends Depth,
  TMaxDepth extends number = DefaultMaxDepth,
> =
  // Step 1: Look up dependencies of current port
  GetDirectDeps<TDepGraph, TCurrent> extends infer Deps
    ? // Step 2: Check if port has no dependencies (leaf node)
      IsNever<Deps> extends true
      ? false // No dependencies, can't reach target
      : // Step 3: Recurse through dependencies (Deps distributes if it's a union)
        Deps extends string
        ? IsReachable<
            TDepGraph,
            Deps,
            TTarget,
            TVisited | TCurrent,
            IncrementDepth<TDepth>,
            TMaxDepth
          >
        : false
    : false;

/**
 * Checks if adding a new adapter would create a circular dependency.
 *
 * A cycle exists if the port being provided can be reached by following
 * the dependency chain starting from any of the required ports.
 *
 * ## Recursion Pattern: Delegation with Early Exit
 *
 * This type doesn't recurse itself - it delegates to `IsReachable` after
 * handling two early exit conditions.
 *
 * ### Base Cases
 * | Condition | Result | Reason |
 * |-----------|--------|--------|
 * | `TRequires` is `never` | `false` | No deps means no cycle possible |
 * | `TProvides` in `TRequires` | `true` | Self-dependency is immediate cycle |
 *
 * ### Delegation Case
 * Calls `IsReachable<TDepGraph, TRequires, TProvides>` to check if following
 * the existing dependency chains from any required port leads back to the
 * port being provided.
 *
 * ## Three-Way Result (Critical Semantics)
 *
 * | Result               | Meaning                     | Action Taken by GraphBuilder   |
 * |----------------------|-----------------------------|--------------------------------|
 * | `true`               | Cycle DOES exist            | Compile error (HEX002)         |
 * | `false`              | Cycle does NOT exist        | Allow the adapter              |
 * | `DepthExceededResult`| UNKNOWN (analysis incomplete)| Allow (defer to runtime)       |
 *
 * **IMPORTANT**: `DepthExceededResult` is NOT treated as a cycle!
 * The system gives the benefit of the doubt - if we can't prove a cycle exists,
 * we allow the code to compile. Runtime validation serves as a safety net.
 *
 * This approach avoids false positives: deeply nested but valid graphs aren't rejected.
 *
 * @typeParam TDepGraph - The current dependency graph (before adding the new adapter)
 * @typeParam TProvides - The port name the new adapter provides
 * @typeParam TRequires - Union of port names the new adapter requires
 * @typeParam TMaxDepth - Maximum allowed depth (default: DefaultMaxDepth)
 *
 * @returns `true` if adding this adapter would create a cycle, `false` if no cycle,
 *          or the result from IsReachable (which may include DepthExceededResult)
 *
 * @example
 * ```typescript
 * // Graph: { A: 'B', B: 'C' }
 * // Adding adapter that provides 'C' and requires 'A' would create: A -> B -> C -> A
 * type HasCycle = WouldCreateCycle<{ A: 'B', B: 'C' }, 'C', 'A'>; // true
 * ```
 *
 * @internal
 */
export type WouldCreateCycle<
  TDepGraph,
  TProvides extends string,
  TRequires extends string,
  TMaxDepth extends number = DefaultMaxDepth,
> =
  // Base Case: No requirements means no cycle possible
  IsNever<TRequires> extends true
    ? false
    : // Delegation: Check if TProvides is reachable from TRequires through existing graph
      // Why check EXISTING graph? The new edge goes FROM TProvides TO TRequires.
      // A cycle forms if TRequires (or its transitive deps) can reach TProvides,
      // because then the new edge would complete the loop.
      // Note: Self-dependency (A requires A) is caught earlier by CheckSelfDependency
      // in provide.ts which provides a better error message (HEX006).
      IsReachable<TDepGraph, TRequires, TProvides, never, [], TMaxDepth>;

/**
 * Checks if the depth limit would be exceeded for cycle detection.
 *
 * This is a type-level check that can be used to determine if a graph
 * is approaching or exceeding the depth limit for compile-time validation.
 *
 * @typeParam TDepGraph - The dependency graph map
 * @typeParam TFrom - Starting port name to check from
 * @typeParam TDepth - Starting depth (default: empty tuple)
 * @typeParam TMaxDepth - Maximum allowed depth (default: DefaultMaxDepth)
 *
 * @returns `true` if depth limit would be exceeded, `false` otherwise
 *
 * @internal
 */
export type WouldExceedDepthLimit<
  TDepGraph,
  TFrom extends string,
  TDepth extends Depth = [],
  TMaxDepth extends number = DefaultMaxDepth,
> =
  DepthExceeded<TDepth, TMaxDepth> extends true
    ? true
    : IsNever<TFrom> extends true
      ? false
      : TFrom extends string
        ? GetDirectDeps<TDepGraph, TFrom> extends infer Deps
          ? IsNever<Deps> extends true
            ? false
            : Deps extends string
              ? WouldExceedDepthLimit<TDepGraph, Deps, IncrementDepth<TDepth>, TMaxDepth>
              : false
          : false
        : false;
