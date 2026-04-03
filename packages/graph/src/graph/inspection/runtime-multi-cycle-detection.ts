/**
 * Multi-cycle detection using Tarjan's SCC algorithm.
 *
 * Finds all strongly connected components in the dependency graph and
 * extracts minimal cycles from each. Used when the compile-time depth
 * limit is exceeded to provide comprehensive cycle reporting.
 *
 * @packageDocumentation
 */

import type { AdapterConstraint, Port } from "@hex-di/core";
import { isLazyPort, getOriginalPort } from "@hex-di/core";
import { normalizeCyclePath } from "./cycle-path-utils.js";

/**
 * Resolves a required port to its original port name.
 *
 * If the port is a lazy port (created via `lazyPort()`), returns the
 * original (unwrapped) port name. Otherwise returns the port name as-is.
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

  function updateLowlink(node: string, dep: string): void {
    const currentLow = nodeLowlink.get(node) ?? 0;
    if (!nodeIndex.has(dep)) {
      strongconnect(dep);
      const depLow = nodeLowlink.get(dep) ?? 0;
      nodeLowlink.set(node, Math.min(currentLow, depLow));
    } else if (onStack.has(dep)) {
      const depIdx = nodeIndex.get(dep) ?? 0;
      nodeLowlink.set(node, Math.min(currentLow, depIdx));
    }
  }

  function popScc(node: string): void {
    const scc: string[] = [];
    let w: string | undefined;
    do {
      w = stack.pop();
      if (w !== undefined) {
        onStack.delete(w);
        scc.push(w);
      }
    } while (w !== node);
    if (scc.length > 1) sccs.push(scc);
  }

  function strongconnect(node: string): void {
    nodeIndex.set(node, index);
    nodeLowlink.set(node, index);
    index++;
    stack.push(node);
    onStack.add(node);

    for (const dep of adjMap.get(node) ?? []) {
      if (portSet.has(dep)) updateLowlink(node, dep);
    }

    if ((nodeLowlink.get(node) ?? 0) === (nodeIndex.get(node) ?? 0)) {
      popScc(node);
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
