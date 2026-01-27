/**
 * Cycle Error Types and Path Extraction.
 *
 * This module provides type utilities for:
 * - Building human-readable cycle paths when circular dependencies are detected
 * - Generating lazy port suggestions for breaking cycles
 * - Formatting compile-time error messages
 *
 * ## Example
 *
 * For cycle path "A -> B -> C -> A", the suggestions are:
 * - Use lazyPort(B) in AAdapter
 * - Use lazyPort(C) in BAdapter
 * - Use lazyPort(A) in CAdapter
 *
 * @packageDocumentation
 */
import type { Depth, DefaultMaxDepth, DepthExceeded, IncrementDepth } from "./depth.js";
import type { GetDirectDeps } from "./detection.js";
/**
 * Formats the message when cycle detection exceeds the maximum depth.
 *
 * @typeParam TPath - The accumulated path so far
 * @typeParam TFrom - The current node where depth was exceeded
 * @typeParam TMaxDepth - Maximum allowed depth
 *
 * @internal
 */
type CyclePathDepthExceeded<TPath extends string, TFrom extends string, TMaxDepth extends number = DefaultMaxDepth> = TPath extends "" ? `${TFrom} -> ... (cycle too deep to display, depth ${TMaxDepth}+)` : `${TPath} -> ${TFrom} -> ... (cycle too deep to display, depth ${TMaxDepth}+)`;
/**
 * Formats the message when the cycle target is found.
 *
 * @typeParam TPath - The accumulated path so far
 * @typeParam TTarget - The target node that completes the cycle
 *
 * @internal
 */
type CyclePathFound<TPath extends string, TTarget extends string> = TPath extends "" ? TTarget : `${TPath} -> ${TTarget}`;
/**
 * Builds the next path segment by appending a node.
 *
 * @typeParam TPath - The accumulated path so far
 * @typeParam TFrom - The node to append
 *
 * @internal
 */
type CyclePathNextSegment<TPath extends string, TFrom extends string> = TPath extends "" ? TFrom : `${TPath} -> ${TFrom}`;
/**
 * Recursively continues the cycle path search through dependencies.
 *
 * This is the "continuation" step of `FindCyclePath`. After confirming the
 * current port isn't visited or the target, we look up its dependencies and
 * recurse through them.
 *
 * ## Recursion Pattern: Infer-and-Delegate
 *
 * Uses `extends infer Deps` to capture the dependency lookup, then delegates
 * back to `FindCyclePath` with updated accumulator state.
 *
 * ### Base Cases
 * | Condition | Result | Reason |
 * |-----------|--------|--------|
 * | No dependencies | `never` | Dead end in path search |
 * | `Deps` not string | `never` | Invalid type (defensive) |
 *
 * ### Recursive Case
 * Calls `FindCyclePath` with:
 * - `Deps` as new starting points (may be union, distributes)
 * - `CyclePathNextSegment<TPath, TFrom>` - appends current port to path string
 * - `TVisited | TFrom` - marks current port as visited
 * - `IncrementDepth<TDepth>` - increments depth counter
 *
 * @typeParam TDepGraph - The dependency graph map
 * @typeParam TFrom - Current port whose dependencies to explore
 * @typeParam TTarget - The target port that completes the cycle
 * @typeParam TPath - Accumulated path string (e.g., "A -> B")
 * @typeParam TVisited - Set of visited ports (union type)
 * @typeParam TDepth - Current recursion depth
 * @typeParam TMaxDepth - Maximum allowed depth
 *
 * @internal
 */
type CyclePathRecurse<TDepGraph, TFrom extends string, TTarget extends string, TPath extends string, TVisited extends string, TDepth extends Depth, TMaxDepth extends number = DefaultMaxDepth> = GetDirectDeps<TDepGraph, TFrom> extends infer Deps ? Deps extends string ? FindCyclePath<TDepGraph, Deps, // New starting points (distributes if union)
TTarget, CyclePathNextSegment<TPath, TFrom>, // Append current port to path
// Append current port to path
TVisited | TFrom, // Mark current port as visited
IncrementDepth<TDepth>, TMaxDepth> : never : never;
/**
 * Finds and formats the cycle path for error messages.
 *
 * This type traverses the dependency graph to build a human-readable
 * string showing the cycle path (e.g., "A -> B -> C -> A").
 *
 * ## Recursion Pattern: DFS with String Accumulation
 *
 * Similar to `IsReachable` but builds a path string instead of returning boolean.
 * Uses template literal types to construct the path as it traverses.
 *
 * ### Base Cases
 * | Condition | Result | Reason |
 * |-----------|--------|--------|
 * | Depth exceeded | `"... (cycle too deep...)"` | Truncated path with warning |
 * | `TFrom` in `TVisited` | `never` | Already visited, prune this branch |
 * | `TFrom` === `TTarget` | `"path -> target"` | Found the cycle, return complete path |
 *
 * ### Recursive Case
 * Delegates to `CyclePathRecurse` which looks up dependencies and continues
 * the path search with updated accumulator state.
 *
 * ### Path Building
 * The path string is built incrementally using `CyclePathNextSegment`:
 * - Start: `""` (empty)
 * - After A: `"A"`
 * - After B: `"A -> B"`
 * - After C (target): `"A -> B -> C"`
 *
 * @typeParam TDepGraph - The dependency graph map (with the new edge added)
 * @typeParam TFrom - Starting port name (or union of names)
 * @typeParam TTarget - Target port name (completes the cycle)
 * @typeParam TPath - Accumulated path string
 * @typeParam TVisited - Set of visited ports (union type)
 * @typeParam TDepth - Recursion depth counter (tuple)
 * @typeParam TMaxDepth - Maximum allowed depth (default: DefaultMaxDepth)
 *
 * @returns The cycle path string (e.g., "A -> B -> C -> A") or `never` if no path
 *
 * @internal
 */
export type FindCyclePath<TDepGraph, TFrom extends string, TTarget extends string, TPath extends string = "", TVisited extends string = never, TDepth extends Depth = [], TMaxDepth extends number = DefaultMaxDepth> = DepthExceeded<TDepth, TMaxDepth> extends true ? CyclePathDepthExceeded<TPath, TFrom, TMaxDepth> : TFrom extends TVisited ? never : TFrom extends TTarget ? CyclePathFound<TPath, TTarget> : TFrom extends string ? CyclePathRecurse<TDepGraph, TFrom, TTarget, TPath, TVisited, TDepth, TMaxDepth> : never;
/**
 * Builds the initial cycle path starting from the provides port.
 *
 * @typeParam TDepGraph - The dependency graph (with new edge added)
 * @typeParam TProvides - The port that completes the cycle
 * @typeParam TRequires - The first required port(s) to start traversal
 * @typeParam TMaxDepth - Maximum allowed depth (default: DefaultMaxDepth)
 *
 * @internal
 */
export type BuildCyclePath<TDepGraph, TProvides extends string, TRequires extends string, TMaxDepth extends number = DefaultMaxDepth> = FindCyclePath<TDepGraph, TRequires, TProvides, TProvides, never, [], TMaxDepth>;
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
 *
 * @internal
 */
export type CircularDependencyError<TCyclePath extends string> = {
    readonly __valid: false;
    readonly __errorBrand: "CircularDependencyError";
    readonly __message: `Circular dependency detected: ${TCyclePath}`;
    readonly __cyclePath: TCyclePath;
};
/**
 * Extracts the first edge from a cycle path string.
 *
 * Given "A -> B -> C -> A", extracts "A" and "B".
 *
 * @internal
 */
type ExtractFirstEdge<TPath extends string> = TPath extends `${infer From} -> ${infer Rest}` ? Rest extends `${infer To} -> ${infer _Remaining}` ? {
    from: From;
    to: To;
    remaining: Rest;
} : Rest extends `${infer To}` ? {
    from: From;
    to: To;
    remaining: never;
} : never : never;
/**
 * Formats a single lazy suggestion for an edge.
 *
 * @example
 * ```typescript
 * type Suggestion = FormatLazySuggestion<"UserService", "Database">;
 * // "lazyPort(Database) in UserServiceAdapter"
 * ```
 *
 * @internal
 */
export type FormatLazySuggestion<TFrom extends string, TTo extends string> = `lazyPort(${TTo}) in ${TFrom}Adapter`;
/**
 * Recursively extracts all edges from a cycle path and formats lazy suggestions.
 *
 * This type parses the cycle path string ("A -> B -> C -> A") and generates
 * a comma-separated list of lazy port suggestions for breaking the cycle.
 *
 * ## Recursion Pattern: Template Literal Parsing with Accumulator
 *
 * Uses `ExtractFirstEdge` to parse the path string and accumulates
 * suggestions as it goes. This is a "fold" pattern at the type level.
 *
 * ### How Template Literal Parsing Works
 *
 * The path "A -> B -> C" is parsed as:
 * 1. `ExtractFirstEdge<"A -> B -> C">` extracts `{ from: "A", to: "B", remaining: "B -> C" }`
 * 2. Format suggestion: `"lazyPort(B) in AAdapter"`
 * 3. Recurse with remaining: `"B -> C"`
 * 4. `ExtractFirstEdge<"B -> C">` extracts `{ from: "B", to: "C", remaining: never }`
 * 5. Format suggestion: `"lazyPort(C) in BAdapter"`
 * 6. Remaining is `never`, so stop recursion
 *
 * ### Base Cases
 * | Condition | Result | Reason |
 * |-----------|--------|--------|
 * | `ExtractFirstEdge` fails | `TAcc` | No more edges to parse |
 * | `Rest` is `never` | Current suggestion | Last edge in path |
 *
 * ### Recursive Case
 * When `Rest` is a string, recurse with:
 * - `Rest` as the new path to parse
 * - Accumulated suggestions joined with ", or "
 *
 * @typeParam TPath - The cycle path string to parse
 * @typeParam TAcc - Accumulated suggestions string
 *
 * @internal
 */
type CollectSuggestions<TPath extends string, TAcc extends string = ""> = ExtractFirstEdge<TPath> extends {
    from: infer From extends string;
    to: infer To extends string;
    remaining: infer Rest;
} ? Rest extends string ? CollectSuggestions<Rest, TAcc extends "" ? FormatLazySuggestion<From, To> : `${TAcc}, or ${FormatLazySuggestion<From, To>}`> : TAcc extends "" ? FormatLazySuggestion<From, To> : `${TAcc}, or ${FormatLazySuggestion<From, To>}` : TAcc;
/**
 * Generates lazy port suggestions from a cycle path.
 *
 * Given a cycle path like "A -> B -> C -> A", produces a comma-separated
 * list of suggestions for breaking the cycle using lazy resolution.
 *
 * @typeParam TPath - The cycle path string (e.g., "A -> B -> C -> A")
 *
 * @example
 * ```typescript
 * type Suggestions = LazySuggestions<"UserService -> Database -> Cache -> UserService">;
 * // "lazyPort(Database) in UserServiceAdapter, or lazyPort(Cache) in DatabaseAdapter, or lazyPort(UserService) in CacheAdapter"
 * ```
 *
 * @internal
 */
export type LazySuggestions<TPath extends string> = CollectSuggestions<TPath>;
/**
 * Formats a complete lazy suggestion message for circular dependency errors.
 *
 * @typeParam TPath - The cycle path string
 *
 * @example
 * ```typescript
 * type Message = FormatLazySuggestionMessage<"A -> B -> C -> A">;
 * // "Use lazyPort(B) in AAdapter, or lazyPort(C) in BAdapter, or lazyPort(A) in CAdapter."
 * ```
 */
export type FormatLazySuggestionMessage<TPath extends string> = LazySuggestions<TPath> extends infer S extends string ? S extends "" ? "" : `Use ${S}.` : "";
export {};
