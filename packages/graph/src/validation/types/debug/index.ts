/**
 * Debug Types for Validation Pipeline Inspection.
 *
 * These types help developers debug type-level validation by exposing
 * intermediate results in an inspectable format. Hover over a debug type
 * in your IDE to see the validation state at that point.
 *
 * ## Usage
 *
 * ```typescript
 * import type { DebugWouldCreateCycle } from "@hex-di/graph/internal";
 *
 * // Hover to see cycle detection details
 * type Debug = DebugWouldCreateCycle<MyGraph, "NewPort", "ExistingPort">;
 * ```
 *
 * @packageDocumentation
 */

import type { Prettify, IsNever } from "@hex-di/core";
import type {
  WouldCreateCycle,
  IsReachable,
  IsDepthExceeded,
  ExtractDepthExceededPort,
  GetDirectDeps,
  WouldExceedDepthLimit,
  DefaultMaxDepth,
} from "../cycle/index.js";
import type { GetLifetimeLevel, IsCaptiveDependency, LifetimeName } from "../captive/index.js";
import type { HasOverlap } from "../dependency-satisfaction.js";

// =============================================================================
// DebugWouldCreateCycle
// =============================================================================

/**
 * Debug view of cycle detection for a proposed new adapter.
 *
 * Shows whether adding an adapter that provides `TNewPort` and requires
 * `TRequires` would create a circular dependency in the graph.
 *
 * @typeParam TDepGraph - The current dependency graph
 * @typeParam TNewPort - The port name the new adapter would provide
 * @typeParam TRequires - Union of port names the new adapter would require
 * @typeParam TMaxDepth - Maximum traversal depth (default: 50)
 *
 * @example
 * ```typescript
 * type Graph = { A: "B"; B: "C"; };
 * type Debug = DebugWouldCreateCycle<Graph, "C", "A">;
 * // Hover shows:
 * // {
 * //   wouldCycle: true;
 * //   newPort: "C";
 * //   requires: "A";
 * //   existingDeps: "B";  // What A depends on
 * // }
 * ```
 */
export type DebugWouldCreateCycle<
  TDepGraph,
  TNewPort extends string,
  TRequires extends string,
  TMaxDepth extends number = DefaultMaxDepth,
> = Prettify<{
  /** Whether adding this adapter would create a cycle */
  readonly wouldCycle: WouldCreateCycle<TDepGraph, TNewPort, TRequires, TMaxDepth> extends true
    ? true
    : WouldCreateCycle<TDepGraph, TNewPort, TRequires, TMaxDepth> extends false
      ? false
      : IsDepthExceeded<WouldCreateCycle<TDepGraph, TNewPort, TRequires, TMaxDepth>> extends true
        ? "inconclusive (depth exceeded)"
        : false;
  /** The port being provided by the new adapter */
  readonly newPort: TNewPort;
  /** The ports required by the new adapter */
  readonly requires: TRequires;
  /** Direct dependencies of the first required port (for context) */
  readonly existingDepsOfFirstRequired: IsNever<TRequires> extends true
    ? "no requirements"
    : GetDirectDeps<TDepGraph, TRequires>;
  /** Raw result from WouldCreateCycle for advanced debugging */
  readonly rawResult: WouldCreateCycle<TDepGraph, TNewPort, TRequires, TMaxDepth>;
}>;

// =============================================================================
// DebugIsReachable
// =============================================================================

/**
 * Debug view of graph reachability checking.
 *
 * Shows whether a target port is reachable from a source port by
 * following dependency edges in the graph.
 *
 * @typeParam TDepGraph - The dependency graph
 * @typeParam TFrom - Starting port(s)
 * @typeParam TTo - Target port to reach
 * @typeParam TMaxDepth - Maximum traversal depth (default: 50)
 *
 * @example
 * ```typescript
 * type Graph = { A: "B"; B: "C"; C: never };
 * type Debug = DebugIsReachable<Graph, "A", "C">;
 * // Hover shows:
 * // {
 * //   isReachable: true;
 * //   from: "A";
 * //   to: "C";
 * //   directDeps: "B";
 * // }
 * ```
 */
export type DebugIsReachable<
  TDepGraph,
  TFrom extends string,
  TTo extends string,
  TMaxDepth extends number = DefaultMaxDepth,
> = Prettify<{
  /** Whether the target port is reachable from the source */
  readonly isReachable: IsReachable<TDepGraph, TFrom, TTo, never, [], TMaxDepth> extends true
    ? true
    : IsReachable<TDepGraph, TFrom, TTo, never, [], TMaxDepth> extends false
      ? false
      : IsDepthExceeded<IsReachable<TDepGraph, TFrom, TTo, never, [], TMaxDepth>> extends true
        ? "inconclusive (depth exceeded)"
        : false;
  /** The starting port(s) */
  readonly from: TFrom;
  /** The target port */
  readonly to: TTo;
  /** Direct dependencies of the starting port */
  readonly directDeps: IsNever<TFrom> extends true ? never : GetDirectDeps<TDepGraph, TFrom>;
  /** Raw result from IsReachable for advanced debugging */
  readonly rawResult: IsReachable<TDepGraph, TFrom, TTo, never, [], TMaxDepth>;
}>;

// =============================================================================
// DebugDepthExceeded
// =============================================================================

/**
 * Debug view of depth limit checking.
 *
 * Shows whether graph traversal would exceed the depth limit,
 * which port was being processed when the limit was hit, and
 * what the configured limit was.
 *
 * @typeParam TDepGraph - The dependency graph
 * @typeParam TStartPort - Starting port for traversal
 * @typeParam TMaxDepth - Maximum allowed depth (default: 50)
 *
 * @example
 * ```typescript
 * type Graph = { A: "B"; B: "C"; C: "D"; };
 * type Debug = DebugDepthExceeded<Graph, "A", 2>;
 * // Hover shows:
 * // {
 * //   exceeded: true;
 * //   maxDepth: 2;
 * //   startPort: "A";
 * //   lastPort: "C";  // Where traversal stopped
 * // }
 * ```
 */
export type DebugDepthExceeded<
  TDepGraph,
  TStartPort extends string,
  TMaxDepth extends number = DefaultMaxDepth,
> = Prettify<{
  /** Whether the depth limit would be exceeded */
  readonly exceeded: WouldExceedDepthLimit<TDepGraph, TStartPort, [], TMaxDepth>;
  /** The configured maximum depth */
  readonly maxDepth: TMaxDepth;
  /** The port where traversal started */
  readonly startPort: TStartPort;
  /** The port being processed when depth limit was hit (if exceeded) */
  readonly lastPort: WouldExceedDepthLimit<TDepGraph, TStartPort, [], TMaxDepth> extends true
    ? ExtractLastPortFromTraversal<TDepGraph, TStartPort, TMaxDepth>
    : undefined;
}>;

/**
 * Helper to extract the last port from a depth-exceeded traversal.
 * @internal
 */
type ExtractLastPortFromTraversal<TDepGraph, TStartPort extends string, TMaxDepth extends number> =
  // Use IsReachable to a non-existent port to force full traversal
  // then extract the last port from the DepthExceededResult
  IsReachable<TDepGraph, TStartPort, "__never_exists__", never, [], TMaxDepth> extends infer Result
    ? IsDepthExceeded<Result> extends true
      ? ExtractDepthExceededPort<Result>
      : TStartPort // If not exceeded, return start port
    : TStartPort;

// =============================================================================
// DebugValidationPipeline
// =============================================================================

/**
 * Debug view of the complete validation pipeline for a proposed adapter.
 *
 * Shows the result of each validation stage (duplicate, cycle, captive)
 * so you can see exactly where validation would fail.
 *
 * @typeParam TDepGraph - Current dependency graph
 * @typeParam TLifetimeMap - Current lifetime map
 * @typeParam TNewPort - Port being provided
 * @typeParam TRequires - Ports being required
 * @typeParam TLifetimeLevel - Lifetime level of new adapter (1=singleton, 2=scoped, 3=transient)
 * @typeParam TExistingProvides - Ports already provided (for duplicate checking)
 *
 * @example
 * ```typescript
 * type Debug = DebugValidationPipeline<
 *   { A: "B" },           // dep graph
 *   { A: 1; B: 2 },       // lifetime map
 *   "C",                  // new port
 *   "A" | "B",            // requires
 *   1,                    // singleton
 *   "A" | "B"             // existing provides
 * >;
 * // Hover shows all validation stages and their results
 * ```
 */
export type DebugValidationPipeline<
  TDepGraph,
  TLifetimeMap,
  TNewPort extends string,
  TRequires extends string,
  TLifetimeLevel extends number,
  TExistingProvides = keyof TDepGraph,
> = Prettify<{
  /** Step 1: Duplicate port check */
  readonly duplicateCheck: {
    // Use tuple-wrapping to prevent distribution over union
    readonly isDuplicate: [TExistingProvides] extends [string]
      ? HasOverlap<TNewPort, TExistingProvides>
      : false;
    readonly existingPorts: TExistingProvides;
    readonly newPort: TNewPort;
  };
  /** Step 2: Cycle detection */
  readonly cycleCheck: {
    readonly wouldCycle: WouldCreateCycle<TDepGraph, TNewPort, TRequires> extends true
      ? true
      : WouldCreateCycle<TDepGraph, TNewPort, TRequires> extends false
        ? false
        : "inconclusive";
    readonly rawResult: WouldCreateCycle<TDepGraph, TNewPort, TRequires>;
  };
  /** Step 3: Captive dependency check */
  readonly captiveCheck: {
    readonly hasCaptive: CheckAnyCaptive<TLifetimeMap, TLifetimeLevel, TRequires>;
    readonly adapterLifetimeLevel: TLifetimeLevel;
    readonly adapterLifetimeName: LifetimeName<TLifetimeLevel>;
  };
  /** Summary: Would validation pass? */
  readonly wouldPass: DebugValidationWouldPass<
    TDepGraph,
    TLifetimeMap,
    TNewPort,
    TRequires,
    TLifetimeLevel,
    TExistingProvides
  >;
}>;

/**
 * Check if any required port would create a captive dependency.
 * @internal
 */
type CheckAnyCaptive<TLifetimeMap, TDependentLevel extends number, TRequires extends string> =
  IsNever<TRequires> extends true
    ? false
    : TRequires extends string
      ? CheckSingleCaptive<TLifetimeMap, TDependentLevel, TRequires> extends true
        ? true
        : false
      : false;

/**
 * Check if a single required port would create a captive dependency.
 * @internal
 */
type CheckSingleCaptive<
  TLifetimeMap,
  TDependentLevel extends number,
  TRequiredPort extends string,
> =
  GetLifetimeLevel<TLifetimeMap, TRequiredPort> extends infer RequiredLevel
    ? IsNever<RequiredLevel> extends true
      ? false // Not in map yet (forward reference)
      : RequiredLevel extends number
        ? IsCaptiveDependency<TDependentLevel, RequiredLevel>
        : false
    : false;

/**
 * Determine if the full validation pipeline would pass.
 * @internal
 */
type DebugValidationWouldPass<
  TDepGraph,
  TLifetimeMap,
  TNewPort extends string,
  TRequires extends string,
  TLifetimeLevel extends number,
  TExistingProvides,
> =
  // Check duplicate first (use tuple-wrapping to prevent distribution)
  [TExistingProvides] extends [string]
    ? HasOverlap<TNewPort, TExistingProvides> extends true
      ? false
      : // Check cycle
        WouldCreateCycle<TDepGraph, TNewPort, TRequires> extends true
        ? false
        : // Check captive
          CheckAnyCaptive<TLifetimeMap, TLifetimeLevel, TRequires> extends true
          ? false
          : true
    : // No existing provides to check against
      WouldCreateCycle<TDepGraph, TNewPort, TRequires> extends true
      ? false
      : CheckAnyCaptive<TLifetimeMap, TLifetimeLevel, TRequires> extends true
        ? false
        : true;
