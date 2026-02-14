/**
 * Merge Functions for GraphBuilder.
 *
 * This module provides standalone functions for merging buildable graphs.
 * Pure functions return plain objects that GraphBuilder constructs from.
 *
 * ## Algebraic Properties
 *
 * - **Associativity:** `merge(merge(A, B), C) ≡ merge(A, merge(B, C))`
 * - **Identity:** Empty graph is identity element
 * - **NOT Commutative:** Adapter ordering may differ
 *
 * ## AI Navigation
 *
 * **Types Used:**
 * - `BuildableGraph`, `BuildableGraphState` from `./builder-types.js`
 *
 * **Consumed By:**
 * - `GraphBuilder.merge()` in `./builder.ts`
 * - `GraphBuilder.mergeWith()` in `./builder.ts`
 *
 * **Type-Level Validation:**
 * - `MergeResult`, `MergeWithResult` from `./types/merge-types.js`
 * - `MergeMaxDepthOption` from `./types/merge-types.js`
 *
 * @see ./builder-provide.ts - Similar pattern for provide operations
 * @packageDocumentation
 */

import type { BuildableGraph, BuildableGraphState } from "./builder-types.js";

/**
 * Options for merging graphs.
 *
 * Currently supports maxDepth resolution strategy. More options may be added
 * in future versions.
 */
export interface MergeGraphOptions {
  /**
   * How to resolve differing maxDepth values between graphs.
   *
   * - `"first"` (default): Use the first graph's maxDepth
   * - `"second"`: Use the second graph's maxDepth
   * - `"max"`: Use the larger of the two maxDepth values
   * - `"min"`: Use the smaller of the two maxDepth values
   */
  maxDepth?: "first" | "second" | "max" | "min";
}

/**
 * Merges two buildable graphs into one.
 *
 * Combines the adapters from both graphs and unions their override port names.
 * The first graph's adapters come before the second graph's adapters.
 *
 * @pure Returns new state; inputs unchanged. No side effects.
 *
 * @param first - The first graph state
 * @param second - The second graph state
 * @returns New state with combined adapters and overrides
 *
 * @example
 * ```typescript
 * const merged = mergeGraphs(infrastructureGraph, applicationGraph);
 * // merged.adapters = [...infrastructure.adapters, ...application.adapters]
 * ```
 *
 * @internal
 */
export function mergeGraphs(first: BuildableGraph, second: BuildableGraph): BuildableGraphState {
  // Merge override port names from both graphs
  const mergedOverrides = new Set([...first.overridePortNames, ...second.overridePortNames]);

  return {
    adapters: Object.freeze([...first.adapters, ...second.adapters]),
    overridePortNames: Object.freeze(mergedOverrides),
  };
}

/**
 * Merges two buildable graphs with configurable options.
 *
 * Similar to `mergeGraphs`, but allows specifying how to resolve configuration
 * conflicts when merging graphs with different settings.
 *
 * Note: At runtime, the options primarily affect type-level behavior. The maxDepth
 * is a phantom type parameter, so the runtime merge is identical regardless of
 * the maxDepth option. The option is preserved for API consistency.
 *
 * @pure Returns new state; inputs unchanged. No side effects.
 *
 * @param first - The first graph state
 * @param second - The second graph state
 * @param _options - Merge options (currently used for type-level maxDepth resolution)
 * @returns New state with combined adapters and overrides
 *
 * @example
 * ```typescript
 * const merged = mergeGraphsWithOptions(graphA, graphB, { maxDepth: 'max' });
 * ```
 *
 * @internal
 */
export function mergeGraphsWithOptions(
  first: BuildableGraph,
  second: BuildableGraph,
  _options: MergeGraphOptions
): BuildableGraphState {
  // At runtime, the options primarily affect type-level behavior
  // The actual merge is the same regardless of options
  return mergeGraphs(first, second);
}
