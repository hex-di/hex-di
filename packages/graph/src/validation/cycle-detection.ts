/**
 * Compile-Time Circular Dependency Detection for @hex-di/graph.
 *
 * This module provides type-level utilities for detecting circular dependencies
 * at compile time. A circular dependency occurs when a chain of adapters forms
 * a cycle (e.g., A -> B -> C -> A).
 *
 * ## Algorithm Overview
 *
 * The detection works by:
 * 1. Tracking a type-level dependency map as adapters are added
 * 2. When a new adapter is added, checking if its "provides" port is reachable
 *    from its "requires" ports through the existing graph (that would form a cycle)
 * 3. Producing readable error messages showing the cycle path
 *
 * ## Key Type-Level Programming Techniques
 *
 * - **Distributive Conditional Types**: Used to iterate over union types
 *   (e.g., checking each required port)
 * - **Depth-Limited Recursion**: TypeScript has recursion limits (~50-100),
 *   so we track depth using tuple length and bail out if too deep
 * - **Type-Level Set (Union Types)**: The "visited" set is a union type
 *   that grows with each recursive call
 * - **Phantom Type Parameters**: TDepGraph tracks graph structure without
 *   runtime representation
 *
 * ## Performance Considerations
 *
 * - MaxDepth=30 is a conservative limit; most real graphs are <15 levels deep
 * - If depth is exceeded, we assume no cycle (runtime will catch it)
 * - Union size grows linearly with graph size, keeping type computation tractable
 *
 * @see ./captive-dependency.ts - Similar algorithm for lifetime validation
 * @see ../graph/builder.ts - Uses these types in ProvideResult
 * @packageDocumentation
 */

import type { Port } from "@hex-di/ports";
import type { IsNever } from "../common";

// =============================================================================
// Adapter Name Extraction
// =============================================================================

/**
 * Extracts the **port name string** from an adapter's `provides` property.
 *
 * Returns only the string literal name (e.g., `"Logger"`), not the full Port type.
 * This is used for dependency graph tracking where we only need the name for
 * cycle detection.
 *
 * **Contrast with `InferAdapterProvides`** (in `adapter/inference.ts`):
 * - `AdapterProvidesName<A>` → `"Logger"` (string literal)
 * - `InferAdapterProvides<A>` → `Port<Logger, "Logger">` (full Port type)
 *
 * @typeParam A - The adapter type to extract from
 * @returns The port name as a string literal type, or `never` if not an adapter
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
 * Uses indexed access (`TMap[TPort]`) rather than `extends Record<TPort, infer Deps>`
 * because the Record pattern doesn't work correctly with intersection types
 * from merged graphs (e.g., `{ A: never } & { B: "A" }`).
 *
 * @typeParam TMap - The dependency map
 * @typeParam TPort - The port name to look up
 * @returns Union of required port names, or never if not found
 */
export type GetDirectDeps<TMap, TPort extends string> = TPort extends keyof TMap
  ? TMap[TPort]
  : never;

// =============================================================================
// Depth-Limited Recursion Utilities
// =============================================================================
//
// WHY DEPTH LIMITING?
//
// TypeScript's type system has a recursion limit (typically 50-100 levels).
// Exceeding it produces "Type instantiation is excessively deep and possibly
// infinite" (TS2589). We proactively limit depth to avoid this.
//
// WHY TUPLE LENGTH?
//
// TypeScript's type system cannot perform arithmetic. We simulate a counter
// using tuple length (Peano-style):
//   - Start: []          (length = 0)
//   - After 1 call: [x]  (length = 1)
//   - After 2 calls: [x, x] (length = 2)
//
// This is a common pattern in advanced TypeScript (e.g., Effect-TS, ts-toolbelt).
//
// ALTERNATIVES CONSIDERED:
//
// - Tail-call optimization: Not available in TypeScript type system
// - Iterative approach: Not possible at type level
// - Higher limit: Risks TS2589 errors on complex graphs
// - No limit: Would fail unpredictably on deep graphs
//

/**
 * Maximum recursion depth for type-level graph traversal.
 *
 * ## Why 30?
 *
 * - **TypeScript limits**: The type system has recursion limits (50-100) that
 *   vary based on type complexity. 30 provides a 2x safety margin.
 * - **Real-world graphs**: Production dependency graphs rarely exceed 15 levels.
 *   30 covers virtually all legitimate use cases.
 * - **Graceful degradation**: If exceeded, we assume no cycle. Runtime catches it.
 *
 * ## Trade-offs
 *
 * | Value | Pros | Cons |
 * |-------|------|------|
 * | Lower (10-20) | Faster type checking, no TS2589 risk | May miss deep cycles |
 * | Current (30) | Balanced: catches most cycles safely | Very deep graphs need runtime |
 * | Higher (50+) | Catches deeper cycles | Risks TS2589 on complex types |
 *
 * ## What If My Graph Is Deeper?
 *
 * If `builder.inspect().maxChainDepth` approaches or exceeds 30:
 *
 * 1. **Architectural Review**: Deep chains often indicate design issues.
 *    Consider if intermediate abstractions can flatten the hierarchy.
 *
 * 2. **Use `buildFragment()`**: Child graphs built with `buildFragment()`
 *    skip compile-time validation, deferring to runtime checks.
 *
 * 3. **Split Graphs**: Build smaller subgraphs independently, then merge
 *    them at runtime. Each subgraph validates independently.
 *
 * 4. **Runtime Monitoring**: Use `builder.inspect()` to check `maxChainDepth`
 *    at runtime. Log warnings when approaching the limit.
 *
 * ## Important Limitation
 *
 * Cycles at depth 31+ will **NOT** be detected at compile time. They pass
 * type validation but are caught at runtime when the container attempts
 * to resolve the cyclic dependency.
 *
 * ## Configurability
 *
 * This value cannot be easily changed at the consumer level because TypeScript's
 * type system evaluates types at definition time, not use time. To use a different
 * depth limit, you would need to fork the library and modify this value.
 *
 * For most use cases, the recommended approach is:
 * - Use `buildFragment()` to skip compile-time validation for deep subgraphs
 * - Let runtime validation catch any cycles
 *
 * @internal - Exported via `@hex-di/graph/internal` for advanced inspection
 */
export type MaxDepth = 30;

/**
 * Depth counter using tuple length.
 *
 * This is a type-level Peano number: the length of the tuple represents
 * the current recursion depth. We use `unknown` as the element type since
 * the actual values don't matter - only the tuple's length.
 */
type Depth = readonly unknown[];

/**
 * Increments the depth counter by spreading the existing tuple and adding an element.
 *
 * @example
 * ```typescript
 * type D0 = [];                    // length = 0
 * type D1 = IncrementDepth<D0>;    // [unknown], length = 1
 * type D2 = IncrementDepth<D1>;    // [unknown, unknown], length = 2
 * ```
 */
type IncrementDepth<D extends Depth> = [...D, unknown];

/**
 * Checks if the maximum recursion depth has been exceeded.
 *
 * Uses TypeScript's tuple `length` property which returns a literal number type.
 */
type DepthExceeded<D extends Depth> = D["length"] extends MaxDepth ? true : false;

// =============================================================================
// Reachability Check (Core Cycle Detection)
// =============================================================================
//
// ALGORITHM: Type-Level Depth-First Search (DFS)
//
// This is a classic graph reachability algorithm, implemented entirely at
// the type level. Given a graph and a starting node, we check if a target
// node is reachable by following edges.
//
// STEP-BY-STEP:
//
// 1. Check if depth exceeded → return false (bail out)
// 2. Check if TFrom is never → return false (no nodes to check)
// 3. For EACH port in TFrom (via distributive conditional):
//    a. If already visited → skip (prevents infinite loops)
//    b. If equals TTarget → return true (found it!)
//    c. Otherwise → recurse with dependencies of this port
// 4. The union of all recursive results is the final answer
//    (true if ANY path reaches target)
//
// HOW DISTRIBUTIVE CONDITIONALS ENABLE "FOR EACH":
//
// When TFrom is a union like "A" | "B", the conditional `TFrom extends string`
// distributes over the union, evaluating the branch for EACH member:
//
//   IsReachable<Map, "A" | "B", Target>
//   = IsReachable<Map, "A", Target> | IsReachable<Map, "B", Target>
//
// This is TypeScript's built-in mechanism for iteration at the type level.
//
// THE VISITED SET (Type-Level Set Using Union Types):
//
// `TVisited` is a union type that grows with each recursive call:
//   - Start: never (empty set)
//   - After visiting "A": "A"
//   - After visiting "A" and "B": "A" | "B"
//
// The check `TFrom extends TVisited` uses union subtype checking
// to determine if the current node was already visited.
//

/**
 * Checks if a target port is reachable from a source port in the dependency map.
 *
 * This is the core algorithm for cycle detection. It performs a depth-limited
 * graph traversal (DFS), checking if we can reach the target port by following
 * dependency edges.
 *
 * @typeParam TMap - The dependency graph map (Record<PortName, RequiredPortNames>)
 * @typeParam TFrom - Starting port name (or union of names to check from)
 * @typeParam TTarget - Target port name we're searching for
 * @typeParam TVisited - Type-level Set of already visited ports (union type)
 * @typeParam TDepth - Current recursion depth (tuple whose length = depth)
 *
 * @returns `true` if target is reachable from any starting port, `false` otherwise
 *
 * @remarks
 * **Algorithm behavior:**
 * - Returns `false` if depth limit exceeded (assumes no cycle; runtime catches it)
 * - Returns `false` if no more nodes to check (TFrom is never)
 * - Returns `false` if current port was already visited (prevents infinite loops)
 * - Returns `true` if current port equals target (success!)
 * - Otherwise, recursively checks all dependencies of current port
 *
 * **Distributive behavior:**
 * When TFrom is a union, the type distributes over each member. The final
 * result is `true` if ANY path reaches the target.
 */
export type IsReachable<
  TMap,
  TFrom extends string,
  TTarget extends string,
  TVisited extends string = never,
  TDepth extends Depth = [],
> =
  // Step 1: Check depth limit first (prevent TS2589)
  DepthExceeded<TDepth> extends true
    ? false // Assume no cycle if depth exceeded (runtime will catch it)
    : // Step 2: Handle never case explicitly (no more nodes to check)
      IsNever<TFrom> extends true
      ? false
      : // Step 3: Distribute over union - check each port in TFrom
        // This is where the "for each" magic happens!
        TFrom extends string
        ? // Step 3a: Skip if already visited (type-level Set membership check)
          TFrom extends TVisited
          ? false
          : // Step 3b: Found the target - cycle detected!
            TFrom extends TTarget
            ? true
            : // Step 3c: Recurse with dependencies of current port
              IsReachableCheckDeps<TMap, TFrom, TTarget, TVisited, TDepth>
        : false;

/**
 * Helper type to check dependencies, handling the never case.
 * @internal
 */
type IsReachableCheckDeps<
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
    ? TPath extends ""
      ? `${TFrom} -> ... (cycle too deep to display, depth ${MaxDepth}+)`
      : `${TPath} -> ${TFrom} -> ... (cycle too deep to display, depth ${MaxDepth}+)`
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

// =============================================================================
// Merged Graph Cycle Detection
// =============================================================================

/**
 * Helper to iterate over each key and check for cycles.
 * Uses distributive conditional to check each key individually.
 * @internal
 */
type CheckEachKeyForCycle<TMap, TKey extends string> = TKey extends string
  ? CheckPortForCycle<TMap, TKey>
  : never;

/**
 * Detects cycles in a merged dependency graph.
 *
 * When two graphs are merged, cycles can form that didn't exist in either
 * graph individually. For example:
 * - Graph A: A -> B
 * - Graph B: B -> A
 * - Merged: A -> B -> A (cycle!)
 *
 * This type iterates through all ports in the merged graph and checks if
 * any port is reachable from its own dependencies.
 *
 * @typeParam TMap - The merged dependency map
 *
 * @returns CircularDependencyError if a cycle exists, or never if no cycles
 */
export type DetectCycleInMergedGraph<TMap> = CheckEachKeyForCycle<
  TMap,
  Extract<keyof TMap, string>
>;

/**
 * Checks if a specific port creates a cycle in the dependency graph.
 *
 * @typeParam TMap - The dependency map
 * @typeParam TPort - The port name to check
 *
 * @returns CircularDependencyError if this port creates a cycle, or never otherwise
 * @internal
 */
type CheckPortForCycle<TMap, TPort extends string> =
  GetDirectDeps<TMap, TPort> extends infer Deps
    ? IsNever<Deps> extends true
      ? never // No dependencies, no cycle possible
      : Deps extends string
        ? IsReachable<TMap, Deps, TPort> extends true
          ? CircularDependencyError<BuildCyclePath<TMap, TPort, Deps>>
          : never
        : never
    : never;
