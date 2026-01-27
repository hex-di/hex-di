/**
 * Depth Analysis Utilities.
 *
 * This module provides functions for computing and analyzing
 * dependency chain depths in the graph.
 *
 * @packageDocumentation
 */

import { INSPECTION_CONFIG } from "./complexity.js";

/**
 * Computes the maximum dependency chain depth in a dependency map.
 *
 * Uses memoized DFS to find the longest path through the dependency graph.
 * This helps users understand if their graph is approaching the type-level
 * MaxDepth limit (30) for cycle detection.
 *
 * ## Iteration Order Independence
 *
 * This function is **order-independent**: the result is the same regardless of
 * the order ports appear in `depMap`. The memoization ensures each port is
 * visited exactly once, and the maximum is computed across all starting points.
 *
 * @pure Same inputs always produce the same output. No side effects.
 *
 * @param depMap - Map of port name to its dependency port names
 * @returns The length of the longest dependency chain (0 for empty graph)
 *
 * @internal
 */
export function computeMaxChainDepth(depMap: Record<string, readonly string[]>): number {
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
 * Generates a depth warning message if the chain depth approaches the limit.
 *
 * @param maxChainDepth - The computed maximum chain depth
 * @returns Warning message or undefined if depth is safe
 *
 * @internal
 */
export function generateDepthWarning(maxChainDepth: number): string | undefined {
  if (maxChainDepth >= INSPECTION_CONFIG.DEPTH_WARNING_THRESHOLD) {
    return (
      `Warning: Dependency chain depth (${maxChainDepth}) approaches compile-time limit (${INSPECTION_CONFIG.DEFAULT_MAX_DEPTH}). ` +
      `Use GraphBuilder.withMaxDepth<N>() for deeper graphs (up to 100), or deep cycles may not be detected at compile time.`
    );
  }
  return undefined;
}

/**
 * Checks if the depth limit is exceeded.
 *
 * @param maxChainDepth - The computed maximum chain depth
 * @returns True if depth exceeds the default maximum
 *
 * @internal
 */
export function isDepthLimitExceeded(maxChainDepth: number): boolean {
  return maxChainDepth > INSPECTION_CONFIG.DEFAULT_MAX_DEPTH;
}

/**
 * Computes orphan ports - ports that are provided but never required by others.
 *
 * ## Iteration Order Independence
 *
 * The *set* of orphan ports is order-independent. The *array order* depends on
 * Set iteration order (insertion order in modern JS engines). For deterministic
 * ordering, sort the result or compare as sets.
 *
 * @pure Same inputs always produce the same output. No side effects.
 *
 * @param providedSet - Set of all provided port names
 * @param allRequires - Set of all required port names
 * @returns Array of orphan port names (alphabetically sorted for determinism)
 *
 * @internal
 */
export function computeOrphanPorts(providedSet: Set<string>, allRequires: Set<string>): string[] {
  return [...providedSet].filter(p => !allRequires.has(p)).sort();
}
