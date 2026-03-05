/**
 * Runtime cycle detection for dependency graphs.
 *
 * This module provides runtime cycle detection as a safety net for graphs
 * that exceed the compile-time cycle detection depth limit.
 *
 * Lazy ports (created via `lazyPort()`) are resolved to their original
 * port names for cycle detection, so that cycles through lazy edges
 * are properly detected and can be classified as well-founded or ill-founded.
 *
 * @packageDocumentation
 */

import type { AdapterConstraint, Port } from "@hex-di/core";
import { isLazyPort, getOriginalPort } from "@hex-di/core";

/**
 * Resolves a required port to its original port name.
 *
 * If the port is a lazy port (created via `lazyPort()`), returns the
 * original (unwrapped) port name. Otherwise returns the port name as-is.
 *
 * @param p - A port from an adapter's requires array
 * @returns The resolved port name (without "Lazy" prefix for lazy ports)
 *
 * @internal
 */
function resolveRequiredPortName(p: Port<string, unknown>): string {
  if (isLazyPort(p)) {
    return getOriginalPort(p).__portName;
  }
  return p.__portName;
}

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
 * Lazy ports are resolved to their original port names so that cycles
 * through lazy edges are detected (they are later classified as well-founded
 * or ill-founded by the well-foundedness verifier).
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
    const requires = adapter.requires.map(r => resolveRequiredPortName(r));
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

// =============================================================================
// Multi-cycle detection using Tarjan's SCC algorithm
// =============================================================================

/**
 * Represents an adjacency structure for the graph.
 */
interface AdjacencyInfo {
  readonly adjMap: Map<string, string[]>;
  readonly portSet: Set<string>;
}

/**
 * Builds the adjacency map from adapters.
 *
 * Resolves lazy port names to their original port names so that
 * cycles through lazy edges are properly detected.
 */
function buildAdjacency(adapters: readonly AdapterConstraint[]): AdjacencyInfo {
  const adjMap = new Map<string, string[]>();
  const portSet = new Set<string>();

  for (const adapter of adapters) {
    const portName = adapter.provides.__portName;
    portSet.add(portName);
    const requires = adapter.requires
      .map(r => resolveRequiredPortName(r))
      .filter(name => name !== portName); // exclude self-deps for SCC
    adjMap.set(portName, requires);
  }

  return { adjMap, portSet };
}

/**
 * Finds all strongly connected components using Tarjan's algorithm.
 *
 * Returns SCCs with more than one node (i.e., actual cycles).
 */
function findSCCs(adjacency: AdjacencyInfo): string[][] {
  const { adjMap, portSet } = adjacency;

  let index = 0;
  const nodeIndex = new Map<string, number>();
  const nodeLowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: string[][] = [];

  function strongconnect(node: string): void {
    nodeIndex.set(node, index);
    nodeLowlink.set(node, index);
    index++;
    stack.push(node);
    onStack.add(node);

    const deps = adjMap.get(node) ?? [];
    for (const dep of deps) {
      if (!portSet.has(dep)) continue; // skip external deps

      if (!nodeIndex.has(dep)) {
        strongconnect(dep);
        const currentLow = nodeLowlink.get(node) ?? 0;
        const depLow = nodeLowlink.get(dep) ?? 0;
        nodeLowlink.set(node, Math.min(currentLow, depLow));
      } else if (onStack.has(dep)) {
        const currentLow = nodeLowlink.get(node) ?? 0;
        const depIdx = nodeIndex.get(dep) ?? 0;
        nodeLowlink.set(node, Math.min(currentLow, depIdx));
      }
    }

    const nodeIdx = nodeIndex.get(node) ?? 0;
    const nodeLow = nodeLowlink.get(node) ?? 0;
    if (nodeLow === nodeIdx) {
      const scc: string[] = [];
      let w: string | undefined;
      do {
        w = stack.pop();
        if (w !== undefined) {
          onStack.delete(w);
          scc.push(w);
        }
      } while (w !== node);

      // Only keep SCCs with > 1 node (actual cycles)
      if (scc.length > 1) {
        sccs.push(scc);
      }
    }
  }

  // Process nodes in sorted order for deterministic output
  const sortedNodes = [...portSet].sort();
  for (const node of sortedNodes) {
    if (!nodeIndex.has(node)) {
      strongconnect(node);
    }
  }

  return sccs;
}

/**
 * Extracts a minimal cycle from an SCC by finding the shortest cycle
 * starting from the lexicographically smallest node.
 */
function extractMinimalCycle(scc: string[], adjacency: AdjacencyInfo): string[] {
  const { adjMap, portSet } = adjacency;
  const sccSet = new Set(scc);

  // Sort nodes for deterministic output, start from smallest
  const sorted = [...scc].sort();

  for (const startNode of sorted) {
    // BFS to find shortest cycle back to startNode
    const queue: Array<{ node: string; path: string[] }> = [];
    const visited = new Set<string>();

    const deps = (adjMap.get(startNode) ?? []).filter(d => portSet.has(d) && sccSet.has(d));
    for (const dep of deps) {
      if (dep === startNode) {
        // Self-loop (shouldn't happen in SCC > 1, but handle it)
        return [startNode, startNode];
      }
      queue.push({ node: dep, path: [startNode, dep] });
      visited.add(dep);
    }

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;

      if (current.node === startNode) {
        return current.path;
      }

      const nextDeps = (adjMap.get(current.node) ?? []).filter(
        d => portSet.has(d) && sccSet.has(d)
      );
      for (const next of nextDeps) {
        if (next === startNode) {
          return [...current.path, startNode];
        }
        if (!visited.has(next)) {
          visited.add(next);
          queue.push({ node: next, path: [...current.path, next] });
        }
      }
    }
  }

  // Fallback: if no cycle found via BFS (shouldn't happen for SCC > 1),
  // return the SCC as a cycle
  const fallbackSorted = [...scc].sort();
  return [...fallbackSorted, fallbackSorted[0]];
}

/**
 * Detects all cycles in the adapter dependency graph using Tarjan's SCC algorithm.
 *
 * For each strongly connected component with more than one node, extracts the
 * minimal cycle. Cycles are normalized and deduplicated (same nodes in different
 * rotations are the same cycle).
 *
 * Lazy ports are resolved to their original port names so that cycles through
 * lazy edges are detected and can be classified by the well-foundedness verifier.
 *
 * @param adapters - The adapters in the graph to check
 * @returns Array of normalized cycle paths, or empty array if no cycles exist
 */
export function detectAllCyclesAtRuntime(
  adapters: readonly AdapterConstraint[]
): ReadonlyArray<ReadonlyArray<string>> {
  const adjacency = buildAdjacency(adapters);
  const sccs = findSCCs(adjacency);

  if (sccs.length === 0) {
    return [];
  }

  // Extract minimal cycle from each SCC
  const rawCycles = sccs.map(scc => extractMinimalCycle(scc, adjacency));

  // Normalize each cycle
  const normalizedCycles = rawCycles.map(cycle => normalizeCyclePath(cycle));

  // Deduplicate by canonical form (same nodes in different rotations)
  const seen = new Set<string>();
  const deduped: string[][] = [];

  for (const cycle of normalizedCycles) {
    const key = cycle.join(" -> ");
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(cycle);
    }
  }

  // Sort by first node name for deterministic output
  deduped.sort((a, b) => {
    const aFirst = a[0] ?? "";
    const bFirst = b[0] ?? "";
    return aFirst.localeCompare(bFirst);
  });

  return Object.freeze(deduped.map(c => Object.freeze(c)));
}
