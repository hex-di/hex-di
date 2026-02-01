/**
 * Merged Graph Captive Dependency Detection.
 *
 * This module provides type utilities for detecting captive dependencies
 * and lifetime inconsistencies when merging two graphs.
 *
 * @packageDocumentation
 */

import type { IsNever } from "@hex-di/core";
// GetDirectDeps is a shared graph utility defined in cycle/detection.ts
// It's used here for traversing the dependency graph during captive detection
import type { GetDirectDeps } from "../cycle/detection.js";
import type { LifetimeName } from "./lifetime-level.js";
import type { GetLifetimeLevel } from "./lifetime-map.js";
import type { FindAnyCaptiveDependency } from "./detection.js";
import type { CaptiveDependencyError } from "./errors.js";

/**
 * Builds the CaptiveDependencyError for a detected captive dependency.
 *
 * @typeParam TLifetimeMap - The lifetime map
 * @typeParam TPort - The port that has the captive dependency
 * @typeParam TLevel - The port's lifetime level
 * @typeParam TCaptive - The captured port name
 *
 * @internal
 */
type BuildCaptiveError<
  TLifetimeMap,
  TPort extends string,
  TLevel extends number,
  TCaptive extends string,
> = CaptiveDependencyError<
  TPort,
  LifetimeName<TLevel>,
  TCaptive,
  LifetimeName<GetLifetimeLevel<TLifetimeMap, TCaptive>>
>;

/**
 * Checks dependencies for captive issues after lifetime level is known.
 *
 * @typeParam TDepGraph - The dependency graph
 * @typeParam TLifetimeMap - The lifetime map
 * @typeParam TPort - The port to check
 * @typeParam TLevel - The port's lifetime level
 *
 * @internal
 */
type CheckDepsForCaptive<TDepGraph, TLifetimeMap, TPort extends string, TLevel extends number> =
  GetDirectDeps<TDepGraph, TPort> extends infer Deps
    ? IsNever<Deps> extends true
      ? never // No dependencies, no captive possible
      : Deps extends string
        ? FindAnyCaptiveDependency<TLifetimeMap, TLevel, Deps> extends infer Captive
          ? IsNever<Captive> extends true
            ? never
            : Captive extends string
              ? BuildCaptiveError<TLifetimeMap, TPort, TLevel, Captive>
              : never
          : never
        : never
    : never;

/**
 * Checks if a specific port has a captive dependency in the merged graph.
 *
 * @typeParam TDepGraph - The merged dependency map
 * @typeParam TLifetimeMap - The merged lifetime map
 * @typeParam TPort - The port name to check
 *
 * @returns CaptiveDependencyError if this port has a captive dep, or never otherwise
 * @internal
 */
type CheckPortForCaptive<TDepGraph, TLifetimeMap, TPort extends string> =
  GetLifetimeLevel<TLifetimeMap, TPort> extends infer Level
    ? Level extends number
      ? CheckDepsForCaptive<TDepGraph, TLifetimeMap, TPort, Level>
      : never
    : never;

/**
 * Iterates over each key in the lifetime map and checks for captive dependencies.
 *
 * ## Recursion Pattern: Distributive Conditional (No Explicit Recursion)
 *
 * This type follows the same pattern as `CheckEachKeyForCycle` in the cycle
 * detection module. TypeScript's distributive conditional types handle the
 * iteration automatically.
 *
 * ### How Distribution Works
 *
 * When `TKey` is a union (e.g., `"A" | "B" | "C"`):
 * ```typescript
 * CheckEachKeyForCaptive<DepGraph, LifetimeMap, "A" | "B" | "C">
 *   // Distributes to:
 *   = CheckPortForCaptive<DepGraph, LifetimeMap, "A">
 *   | CheckPortForCaptive<DepGraph, LifetimeMap, "B">
 *   | CheckPortForCaptive<DepGraph, LifetimeMap, "C">
 * ```
 *
 * ### Result Aggregation
 *
 * Since `CheckPortForCaptive` returns either `CaptiveDependencyError` or `never`:
 * - If all ports pass: `never`
 * - If any port has captive dep: `CaptiveDependencyError<...>`
 *
 * @typeParam TDepGraph - The dependency graph for looking up port dependencies
 * @typeParam TLifetimeMap - The lifetime map for lifetime level comparisons
 * @typeParam TKey - Union of port names to check (distributes over this)
 *
 * @see CheckEachKeyForCycle - Identical pattern in cycle detection
 *
 * @internal
 */
type CheckEachKeyForCaptive<TDepGraph, TLifetimeMap, TKey extends string> =
  // The `TKey extends string` triggers distribution over the union
  TKey extends string ? CheckPortForCaptive<TDepGraph, TLifetimeMap, TKey> : never;

/**
 * Detects captive dependencies in a merged graph.
 *
 * When two graphs are merged, captive dependencies can form that didn't exist
 * in either graph individually. For example:
 * - Graph A: Singleton A (no deps)
 * - Graph B: Singleton B depends on Scoped C
 * - If graph A depends on B later (through merge composition), captive deps
 *   might emerge that weren't validated.
 *
 * This type iterates through all ports in the merged graph and checks for
 * captive dependencies using the merged lifetime map and dependency graph.
 *
 * @typeParam TDepGraph - The merged dependency map
 * @typeParam TLifetimeMap - The merged lifetime map
 *
 * @returns CaptiveDependencyError if a captive dep exists, or never if none
 *
 * @internal
 */
export type DetectCaptiveInMergedGraph<TDepGraph, TLifetimeMap> = CheckEachKeyForCaptive<
  TDepGraph,
  TLifetimeMap,
  Extract<keyof TLifetimeMap, string>
>;

// =============================================================================
// Lifetime Inconsistency Detection
// =============================================================================

/**
 * Checks each key for lifetime inconsistency between two lifetime maps.
 *
 * This type detects when the same port is provided with different lifetimes
 * in two graphs being merged (e.g., singleton in Graph A, scoped in Graph B).
 *
 * ## Recursion Pattern: Distributive Conditional with Nested Inference
 *
 * Uses distribution over `TKey` union combined with nested `extends infer`
 * to look up and compare lifetime levels from both maps.
 *
 * ### How the Comparison Works
 *
 * For each key in the union:
 * 1. Look up `LevelA` from `TMapA` using `GetLifetimeLevel`
 * 2. Look up `LevelB` from `TMapB` using `GetLifetimeLevel`
 * 3. If either is `never` (port not in that map), skip it
 * 4. If `LevelA === LevelB`, no inconsistency → return `never`
 * 5. If `LevelA !== LevelB`, inconsistency found → return `TKey`
 *
 * ### Base Cases (within each distributed check)
 * | Condition | Result | Reason |
 * |-----------|--------|--------|
 * | `LevelA` is `never` | `never` | Port not in Map A |
 * | `LevelB` is `never` | `never` | Port not in Map B |
 * | `LevelA === LevelB` | `never` | Same lifetime, consistent |
 * | `LevelA !== LevelB` | `TKey` | Inconsistent lifetimes |
 *
 * ### Why Nested `extends infer`?
 *
 * The pattern `GetLifetimeLevel<...> extends infer Level` captures the result
 * of the lookup in a new type variable. This allows us to:
 * 1. Check if the result is `never` (port not found)
 * 2. Use the result in subsequent comparisons
 *
 * @typeParam TMapA - First lifetime map
 * @typeParam TMapB - Second lifetime map
 * @typeParam TKey - Union of port names to check (distributes)
 *
 * @internal
 */
type CheckEachKeyForInconsistency<TMapA, TMapB, TKey extends string> =
  // Step 1: Distribute over the union of keys
  TKey extends string
    ? // Step 2: Look up lifetime level in Map A
      GetLifetimeLevel<TMapA, TKey> extends infer LevelA
      ? // Step 3: Look up lifetime level in Map B
        GetLifetimeLevel<TMapB, TKey> extends infer LevelB
        ? // Step 4: Check if port exists in both maps
          IsNever<LevelA> extends true
          ? never // Port not in Map A, skip
          : IsNever<LevelB> extends true
            ? never // Port not in Map B, skip
            : // Step 5: Compare lifetime levels
              LevelA extends LevelB
              ? never // Same lifetime, no inconsistency
              : TKey // Different lifetimes, return port name as error
        : never
      : never
    : never;

/**
 * Finds ports that exist in both lifetime maps with different lifetime levels.
 *
 * This detects when the same port is provided with different lifetimes
 * across two graphs being merged (e.g., singleton in Graph A, scoped in Graph B).
 *
 * @typeParam TMapA - First lifetime map
 * @typeParam TMapB - Second lifetime map
 *
 * @returns The first inconsistent port name, or never if all consistent
 */
export type FindLifetimeInconsistency<TMapA, TMapB> = CheckEachKeyForInconsistency<
  TMapA,
  TMapB,
  Extract<keyof TMapA & keyof TMapB, string>
>;
