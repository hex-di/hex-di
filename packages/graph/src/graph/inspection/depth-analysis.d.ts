/**
 * Depth Analysis Utilities.
 *
 * This module provides functions for computing and analyzing
 * dependency chain depths in the graph.
 *
 * @packageDocumentation
 */
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
export declare function computeMaxChainDepth(depMap: Record<string, readonly string[]>): number;
/**
 * Generates a depth warning message if the chain depth approaches the limit.
 *
 * @param maxChainDepth - The computed maximum chain depth
 * @returns Warning message or undefined if depth is safe
 *
 * @internal
 */
export declare function generateDepthWarning(maxChainDepth: number): string | undefined;
/**
 * Checks if the depth limit is exceeded.
 *
 * @param maxChainDepth - The computed maximum chain depth
 * @returns True if depth exceeds the default maximum
 *
 * @internal
 */
export declare function isDepthLimitExceeded(maxChainDepth: number): boolean;
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
export declare function computeOrphanPorts(providedSet: Set<string>, allRequires: Set<string>): string[];
