/**
 * Batch and Merge Utilities for Cycle Detection.
 *
 * This module provides type utilities for detecting cycles when adding
 * multiple adapters at once (batch operations) or merging two graphs.
 *
 * @packageDocumentation
 */

import type { IsNever } from "@hex-di/core";
import type { MalformedAdapterError } from "../captive/errors.js";
import type { DefaultMaxDepth } from "./depth.js";
import type {
  AdapterProvidesName,
  AdapterRequiresNames,
  ExtractRequiresStrings,
  AddEdge,
  GetDirectDeps,
  IsReachable,
  WouldCreateCycle,
  IsDepthExceeded,
  DepthExceededResult,
  ExtractDepthExceededPort,
} from "./detection.js";
import type { BuildCyclePath, CircularDependencyError } from "./errors.js";
import type { IsMalformedRequires } from "../adapter-extraction.js";

/**
 * Checks if adding multiple adapters would create any cycles.
 *
 * This type processes adapters sequentially, checking each one for cycles
 * against the graph that includes all previously processed adapters.
 * Returns the first cycle error found, `DepthExceededResult` if depth was
 * exceeded AND no definite cycles were detected, or `false` if no cycles.
 *
 * ## Recursion Pattern: Tail-Recursive Fold with Accumulator
 *
 * Processes the adapter tuple left-to-right, accumulating graph state.
 * **CRITICALLY**: Unlike a naive implementation that short-circuits on
 * depth exceeded, this type CONTINUES checking remaining adapters to
 * find any detectable cycles. Only returns `DepthExceededResult` at the
 * end if no definite cycles were found among any adapters.
 *
 * ### Base Cases
 * | Condition | Result | Reason |
 * |-----------|--------|--------|
 * | Empty tuple + no depth exceeded | `false` | No cycles found |
 * | Empty tuple + depth exceeded | `DepthExceededResult<TAccumulatedDepthPort>` | Inconclusive with port info |
 * | Cycle found | `CircularDependencyError` | Short-circuit with error |
 *
 * ### Recursive Case
 * When no definite cycle is found for the current adapter:
 * 1. Track if depth was exceeded in accumulator (boolean flag)
 * 2. Track which port exceeded depth (port name accumulator)
 * 3. Add the adapter's edge to the graph
 * 4. Continue checking remaining adapters
 *
 * ### Why Continue After Depth Exceeded
 *
 * Given batch [DeepAdapter (exceeds depth), CyclicAdapter (detectable cycle)]:
 * - OLD behavior: Return `DepthExceededResult` immediately after DeepAdapter
 * - NEW behavior: Continue, detect cycle in CyclicAdapter, return error
 *
 * This is more useful because it provides actionable feedback about
 * definite errors rather than inconclusive warnings.
 *
 * ### Port Provenance Tracking
 *
 * When depth is exceeded, we preserve the port name where it occurred using
 * `ExtractDepthExceededPort`. This provides actionable diagnostics:
 * - Which port's dependency chain exceeded the depth limit
 * - Helps developers understand which part of the graph needs review
 *
 * @typeParam TDepGraph - Current dependency map
 * @typeParam TAdapters - Tuple of adapters to check (processed left-to-right)
 * @typeParam TMaxDepth - Maximum allowed depth (default: DefaultMaxDepth)
 * @typeParam TAccumulatedDepthExceeded - Tracks if any adapter exceeded depth (internal)
 * @typeParam TAccumulatedDepthPort - Tracks which port exceeded depth (internal)
 *
 * @returns `false` if no cycles, `CircularDependencyError` with the first cycle found,
 *          or `DepthExceededResult<TAccumulatedDepthPort>` if depth limit was reached AND no definite cycles
 *
 * @internal
 */
export type WouldAnyCreateCycle<
  TDepGraph,
  TAdapters extends readonly unknown[],
  TMaxDepth extends number = DefaultMaxDepth,
  TAccumulatedDepthExceeded extends boolean = false,
  TAccumulatedDepthPort extends string = never,
> =
  // Base Case: Empty tuple - no more adapters to check
  TAdapters extends readonly [infer First, ...infer Rest]
    ? // SOUNDNESS: First check if the adapter's requires is malformed.
      // Use IsMalformedRequires to distinguish between:
      // - `never` (valid: empty requires array) -> proceed
      // - `MalformedAdapterError` (invalid: missing requires property) -> error
      IsMalformedRequires<AdapterRequiresNames<First>> extends true
      ? // Invalid adapter structure - return error immediately
        MalformedAdapterError<"missing-requires">
      : // Step 1: Check if current adapter would create a cycle
        WouldCreateCycle<
            TDepGraph,
            AdapterProvidesName<First>,
            ExtractRequiresStrings<AdapterRequiresNames<First>>,
            TMaxDepth
          > extends infer CycleResult
        ? // Step 2: Handle three-way result
          CycleResult extends true
          ? // Cycle found! Build error with full cycle path (short-circuit)
            CircularDependencyError<
              BuildCyclePath<
                AddEdge<
                  TDepGraph,
                  AdapterProvidesName<First>,
                  ExtractRequiresStrings<AdapterRequiresNames<First>>
                >,
                AdapterProvidesName<First>,
                ExtractRequiresStrings<AdapterRequiresNames<First>>,
                TMaxDepth
              >
            >
          : // Step 3: Check for depth exceeded
            IsDepthExceeded<CycleResult> extends true
            ? // Depth exceeded - CONTINUE checking but track in accumulator
              // This is the key fix: don't short-circuit, keep looking for definite cycles
              // Also track WHICH port exceeded depth for better diagnostics
              WouldAnyCreateCycle<
                AddEdge<
                  TDepGraph,
                  AdapterProvidesName<First>,
                  ExtractRequiresStrings<AdapterRequiresNames<First>>
                >,
                Rest,
                TMaxDepth,
                true, // Mark that depth was exceeded
                TAccumulatedDepthPort | ExtractDepthExceededPort<CycleResult> // Accumulate port name
              >
            : // No cycle and depth not exceeded - continue with remaining adapters
              WouldAnyCreateCycle<
                AddEdge<
                  TDepGraph,
                  AdapterProvidesName<First>,
                  ExtractRequiresStrings<AdapterRequiresNames<First>>
                >,
                Rest,
                TMaxDepth,
                TAccumulatedDepthExceeded, // Preserve existing accumulator state
                TAccumulatedDepthPort // Preserve existing port accumulator
              >
        : // Fallback (shouldn't happen) - continue checking
          WouldAnyCreateCycle<
            AddEdge<
              TDepGraph,
              AdapterProvidesName<First>,
              ExtractRequiresStrings<AdapterRequiresNames<First>>
            >,
            Rest,
            TMaxDepth,
            TAccumulatedDepthExceeded,
            TAccumulatedDepthPort
          >
    : // Base Case: All adapters checked, no cycles found
      // Return DepthExceededResult with port info if ANY adapter exceeded depth, otherwise false
      TAccumulatedDepthExceeded extends true
      ? DepthExceededResult<TAccumulatedDepthPort>
      : false;

/**
 * Iterates over each key in the graph and checks for cycles.
 *
 * ## Recursion Pattern: Distributive Conditional (No Explicit Recursion)
 *
 * This type uses TypeScript's distributive conditional types to iterate
 * over a union type. No explicit recursion is needed - TypeScript's
 * type system handles the iteration.
 *
 * ### How Distribution Works
 *
 * When `TKey` is a union (e.g., `"A" | "B" | "C"`):
 * ```typescript
 * CheckEachKeyForCycle<Graph, "A" | "B" | "C">
 *   // Distributes to:
 *   = CheckPortForCycle<Graph, "A"> | CheckPortForCycle<Graph, "B"> | CheckPortForCycle<Graph, "C">
 * ```
 *
 * ### Why `TKey extends string` Triggers Distribution
 *
 * The "naked" type parameter in `TKey extends string` causes distribution.
 * Without this pattern, the entire union would be checked as one type.
 *
 * ### Result Aggregation
 *
 * Since each `CheckPortForCycle` returns `CircularDependencyError`, `DepthExceededResult`,
 * or `never`, the union of results gives us:
 * - `never` if all ports pass (no cycles, all traversals completed)
 * - `CircularDependencyError` if any port has a cycle
 * - `DepthExceededResult` if any port hit depth limit (inconclusive)
 * - `CircularDependencyError | DepthExceededResult` if both occur across different ports
 *
 * @typeParam TDepGraph - The dependency graph to check
 * @typeParam TKey - Union of port names to check (distributes over this)
 * @typeParam TMaxDepth - Maximum traversal depth
 *
 * @internal
 */
type CheckEachKeyForCycle<
  TDepGraph,
  TKey extends string,
  TMaxDepth extends number = DefaultMaxDepth,
> =
  // The `TKey extends string` triggers distribution over the union
  TKey extends string ? CheckPortForCycle<TDepGraph, TKey, TMaxDepth> : never;

/**
 * Checks if a specific port creates a cycle in the dependency graph.
 *
 * ## Three-Way Result (Soundness Fix)
 *
 * `IsReachable` returns one of:
 * - `true` → Cycle detected definitively
 * - `false` → No cycle (traversal completed)
 * - `DepthExceededResult` → Inconclusive (depth limit reached)
 *
 * Previously, this type only checked for `true`, treating `DepthExceededResult`
 * as "no cycle". This was a soundness bug - when depth is exceeded, we cannot
 * conclusively determine there's no cycle, so we must propagate the uncertainty.
 *
 * @typeParam TDepGraph - The dependency map
 * @typeParam TPort - The port name to check
 * @typeParam TMaxDepth - Maximum allowed depth (default: DefaultMaxDepth)
 *
 * @returns `CircularDependencyError` if cycle found, `DepthExceededResult` if
 *          depth limit exceeded (inconclusive), or `never` if no cycle
 * @internal
 */
type CheckPortForCycle<
  TDepGraph,
  TPort extends string,
  TMaxDepth extends number = DefaultMaxDepth,
> =
  GetDirectDeps<TDepGraph, TPort> extends infer Deps
    ? IsNever<Deps> extends true
      ? never // No dependencies, no cycle possible
      : Deps extends string
        ? IsReachable<TDepGraph, Deps, TPort, never, [], TMaxDepth> extends infer ReachResult
          ? ReachResult extends true
            ? // Cycle found! Build the error with the full cycle path
              CircularDependencyError<BuildCyclePath<TDepGraph, TPort, Deps, TMaxDepth>>
            : // SOUNDNESS: Check for depth exceeded before returning never
              IsDepthExceeded<ReachResult> extends true
              ? // Depth exceeded - propagate (don't silently treat as "no cycle")
                DepthExceededResult
              : // Definitely no cycle (traversal completed successfully)
                never
          : never
        : never
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
 * ## Three-Way Result (Soundness Fix)
 *
 * Returns one of:
 * - `CircularDependencyError` → Cycle detected definitively
 * - `DepthExceededResult` → Depth limit reached (inconclusive)
 * - `never` → No cycles found (all traversals completed)
 *
 * @typeParam TDepGraph - The merged dependency map
 * @typeParam TMaxDepth - Maximum allowed depth (default: DefaultMaxDepth)
 *
 * @returns `CircularDependencyError` if cycle exists, `DepthExceededResult` if
 *          depth limit exceeded (inconclusive), or `never` if no cycles
 *
 * @internal
 */
export type DetectCycleInMergedGraph<
  TDepGraph,
  TMaxDepth extends number = DefaultMaxDepth,
> = CheckEachKeyForCycle<TDepGraph, Extract<keyof TDepGraph, string>, TMaxDepth>;
