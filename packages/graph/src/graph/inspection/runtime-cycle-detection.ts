/**
 * Runtime cycle detection for dependency graphs.
 *
 * This module provides runtime cycle detection as a safety net for graphs
 * that exceed the compile-time cycle detection depth limit.
 *
 * @packageDocumentation
 */

import type { AdapterConstraint } from "@hex-di/core";

/**
 * Normalizes a cycle path to start from the lexicographically smallest node.
 *
 * This ensures deterministic output regardless of which node the DFS happened
 * to encounter first. For example, the cycle `[B, C, A, B]` is normalized to
 * `[A, B, C, A]`.
 *
 * @param cycle - The raw cycle path ending with the repeated starting node
 * @returns The normalized cycle path starting from the smallest node
 *
 * @example
 * ```typescript
 * normalizeCyclePath(["B", "C", "A", "B"]);  // ["A", "B", "C", "A"]
 * normalizeCyclePath(["Z", "X", "Y", "Z"]);  // ["X", "Y", "Z", "X"]
 * ```
 *
 * @internal
 */
export function normalizeCyclePath(cycle: string[]): string[] {
  if (cycle.length <= 2) {
    // Self-loop [A, A] - already canonical
    return cycle;
  }

  // The cycle path is [start, ..., start], so we have (length - 1) unique nodes
  // Find the index of the lexicographically smallest node
  const nodes = cycle.slice(0, -1); // Remove the repeated end node
  let minIndex = 0;
  for (let i = 1; i < nodes.length; i++) {
    if (nodes[i] < nodes[minIndex]) {
      minIndex = i;
    }
  }

  // Rotate so the smallest node is first
  const rotated = [...nodes.slice(minIndex), ...nodes.slice(0, minIndex)];
  // Add the closing node (same as first)
  return [...rotated, rotated[0]];
}

/**
 * Detects cycles in the adapter dependency graph at runtime using DFS.
 *
 * This function serves as a safety net for graphs that exceed the compile-time
 * cycle detection depth limit (MaxDepth). When `depthLimitExceeded` is true,
 * this should be called to ensure no cycles were missed.
 *
 * ## Iteration Order Independence
 *
 * Cycle *detection* is order-independent: if a cycle exists, it will be found
 * regardless of adapter order. However, the *reported path* may vary depending
 * on which node is visited first. For example, cycle `A → B → C → A` might be
 * reported as `["A", "B", "C", "A"]` or `["B", "C", "A", "B"]`.
 *
 * @param adapters - The adapters in the graph to check
 * @returns Array of port names forming the cycle path if a cycle is found, null if clean
 *
 * @example
 * ```typescript
 * const cycle = detectCycleAtRuntime(graph.adapters);
 * if (cycle) {
 *   throw new Error(`Circular dependency detected: ${cycle.join(' -> ')}`);
 * }
 * ```
 */
export function detectCycleAtRuntime(adapters: readonly AdapterConstraint[]): string[] | null {
  // Build adjacency map: portName -> [required port names]
  const adjMap = new Map<string, string[]>();
  const portSet = new Set<string>();

  for (const adapter of adapters) {
    const portName = adapter.provides.__portName;
    portSet.add(portName);
    const requires = adapter.requires.map(r => r.__portName);
    adjMap.set(portName, requires);
  }

  // DFS to detect cycles with path tracking
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): string[] | null {
    if (inStack.has(node)) {
      // Found a cycle - extract the cycle path
      const cycleStart = path.indexOf(node);
      return [...path.slice(cycleStart), node];
    }

    if (visited.has(node)) {
      return null; // Already fully explored, no cycle from here
    }

    // Mark as being visited in current DFS path
    visited.add(node);
    inStack.add(node);
    path.push(node);

    // Visit all dependencies
    const deps = adjMap.get(node) ?? [];
    for (const dep of deps) {
      // Only check deps that are in our graph (ignore external deps)
      if (portSet.has(dep)) {
        const cycle = dfs(dep);
        if (cycle) {
          return cycle;
        }
      }
    }

    // Done with this node's path
    inStack.delete(node);
    path.pop();
    return null;
  }

  // Run DFS from each node to find any cycles
  for (const portName of portSet) {
    const cycle = dfs(portName);
    if (cycle) {
      // Normalize to canonical form for deterministic output
      return normalizeCyclePath(cycle);
    }
  }

  return null;
}
