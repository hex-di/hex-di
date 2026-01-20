/**
 * Runtime inspection utilities for dependency graphs.
 *
 * This module provides runtime inspection capabilities for built graphs,
 * complementing the compile-time validation performed by GraphBuilder.
 *
 * @packageDocumentation
 */

import type { AdapterAny } from "../adapter";

/**
 * Structural type for graph-like objects that can be inspected.
 *
 * This type captures only the runtime-necessary fields for inspection,
 * allowing both Graph and GraphBuilder to be inspected without requiring
 * phantom type properties.
 *
 * @internal
 */
interface InspectableGraph {
  readonly adapters: readonly AdapterAny[];
  readonly overridePortNames: ReadonlySet<string>;
}

/**
 * Threshold for depth warning. When maxChainDepth reaches this value,
 * a warning is generated to alert users that compile-time detection limits
 * are approaching.
 *
 * @internal
 */
const DEPTH_WARNING_THRESHOLD = 25;

/**
 * Runtime inspection result for debugging.
 *
 * Call `builder.inspect()` to get a snapshot of the current graph state,
 * including adapter count, provided ports, unsatisfied requirements, and
 * dependency structure.
 *
 * @example
 * ```typescript
 * const builder = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .provide(DatabaseAdapter);
 *
 * const inspection = builder.inspect();
 * console.log(inspection.summary);
 * // "Graph(2 adapters, 0 unsatisfied): Logger (singleton), Database (scoped)"
 *
 * if (inspection.maxChainDepth > 25) {
 *   console.warn('Deep dependency chain detected, consider restructuring');
 * }
 * ```
 */
export interface GraphInspection {
  /** Number of adapters registered in this builder */
  readonly adapterCount: number;
  /** List of provided ports with their lifetimes (e.g., "Logger (singleton)") */
  readonly provides: readonly string[];
  /** Port names that are required but not yet provided */
  readonly unsatisfiedRequirements: readonly string[];
  /** Map of port name to its direct dependency port names */
  readonly dependencyMap: Readonly<Record<string, readonly string[]>>;
  /** Port names marked as overrides for parent containers */
  readonly overrides: readonly string[];
  /**
   * Maximum dependency chain depth in the current graph.
   *
   * If this approaches 30, type-level cycle detection may not reach all paths.
   * Consider restructuring or using `buildFragment()` for deep subgraphs.
   */
  readonly maxChainDepth: number;
  /**
   * Warning message when maxChainDepth approaches the compile-time limit.
   *
   * Present when maxChainDepth >= 25 (the warning threshold).
   * When this warning appears, consider:
   * - Restructuring the dependency graph to reduce depth
   * - Using `buildFragment()` for deep subgraphs
   * - Splitting into smaller, independent graphs
   */
  readonly depthWarning?: string;
  /** Human-readable summary of the graph state */
  readonly summary: string;
  /** True if all requirements are satisfied (ready to build) */
  readonly isComplete: boolean;
}

/**
 * Computes the maximum dependency chain depth in a dependency map.
 *
 * Uses memoized DFS to find the longest path through the dependency graph.
 * This helps users understand if their graph is approaching the type-level
 * MaxDepth limit (30) for cycle detection.
 *
 * @param depMap - Map of port name to its dependency port names
 * @returns The length of the longest dependency chain (0 for empty graph)
 *
 * @internal
 */
function computeMaxChainDepth(depMap: Record<string, readonly string[]>): number {
  const memo = new Map<string, number>();

  function dfs(port: string, visited: Set<string>): number {
    if (visited.has(port)) return 0; // Cycle detected - don't infinite loop
    const cached = memo.get(port);
    if (cached !== undefined) return cached;

    visited.add(port);
    const deps = depMap[port] ?? [];
    let maxDepth = 0;
    for (const dep of deps) {
      maxDepth = Math.max(maxDepth, 1 + dfs(dep, visited));
    }
    visited.delete(port);
    memo.set(port, maxDepth);
    return maxDepth;
  }

  let max = 0;
  for (const port of Object.keys(depMap)) {
    max = Math.max(max, dfs(port, new Set()));
  }
  return max;
}

/**
 * Inspects a built Graph and returns detailed runtime information.
 *
 * This is the companion function to `GraphBuilder.inspect()` for use with
 * already-built graphs. Use this when you need to analyze a graph after
 * calling `build()`.
 *
 * @example Basic usage
 * ```typescript
 * const graph = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .provide(DatabaseAdapter)
 *   .build();
 *
 * const info = inspectGraph(graph);
 * console.log(info.summary);
 * // "Graph(2 adapters, 0 unsatisfied): Logger (singleton), Database (scoped)"
 * ```
 *
 * @example Checking graph before runtime
 * ```typescript
 * const graph = buildApplicationGraph();
 * const info = inspectGraph(graph);
 *
 * if (info.maxChainDepth > 25) {
 *   console.warn(
 *     `Deep dependency chain (${info.maxChainDepth}). ` +
 *     `Consider splitting into subgraphs.`
 *   );
 * }
 *
 * // Proceed to create runtime container
 * const container = createContainer(graph);
 * ```
 *
 * @param graph - The built graph to inspect (or any graph-like object with adapters and overridePortNames)
 * @returns A frozen GraphInspection object with all inspection data
 */
export function inspectGraph(graph: InspectableGraph): GraphInspection {
  const provides: string[] = [];
  const allRequires = new Set<string>();
  const providedSet = new Set<string>();
  const dependencyMap: Record<string, string[]> = {};

  for (const adapter of graph.adapters) {
    const portName = adapter.provides.__portName;
    const lifetime = adapter.lifetime;
    provides.push(`${portName} (${lifetime})`);
    providedSet.add(portName);

    const requires: string[] = [];
    for (const req of adapter.requires) {
      requires.push(req.__portName);
      allRequires.add(req.__portName);
    }
    dependencyMap[portName] = requires;
  }

  const unsatisfiedRequirements = [...allRequires].filter(r => !providedSet.has(r));
  const overrides = [...graph.overridePortNames];
  const maxChainDepth = computeMaxChainDepth(dependencyMap);

  const providedNames = [...providedSet].join(", ");
  const missingPart =
    unsatisfiedRequirements.length > 0 ? `. Missing: ${unsatisfiedRequirements.join(", ")}` : "";

  // Generate depth warning if approaching compile-time limit
  const depthWarning =
    maxChainDepth >= DEPTH_WARNING_THRESHOLD
      ? `Warning: Dependency chain depth (${maxChainDepth}) approaches compile-time limit (30). Deep cycles may not be detected at compile time.`
      : undefined;

  return Object.freeze({
    adapterCount: graph.adapters.length,
    provides,
    unsatisfiedRequirements,
    dependencyMap,
    overrides,
    maxChainDepth,
    depthWarning,
    isComplete: unsatisfiedRequirements.length === 0,
    summary: `Graph(${graph.adapters.length} adapters, ${unsatisfiedRequirements.length} unsatisfied): ${providedNames}${missingPart}`,
  });
}
