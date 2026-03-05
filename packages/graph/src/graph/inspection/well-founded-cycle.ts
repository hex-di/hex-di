/**
 * Well-founded cycle detection and verification.
 *
 * A cycle is well-founded if removing all lazy edges from it eliminates
 * the cycle. This means every cycle must contain at least one lazy edge,
 * and the eager-only subgraph (within the cycle) must be acyclic.
 *
 * @see spec/packages/graph/behaviors/08-well-founded-cycles.md — BEH-GR-08-002
 * @packageDocumentation
 */

import type { AdapterConstraint, Port } from "@hex-di/core";
import { isLazyPort, getOriginalPort } from "@hex-di/core";

// =============================================================================
// Types
// =============================================================================

/**
 * Represents a lazy edge in the dependency graph.
 */
export interface LazyEdge {
  readonly from: string;
  readonly to: string;
}

/**
 * Result of well-foundedness verification for a single cycle.
 */
export interface WellFoundednessCheck {
  readonly _tag: "WellFounded" | "IllFounded";
  readonly cycle: ReadonlyArray<string>;
  readonly lazyEdges: ReadonlyArray<LazyEdge>;
  readonly reason?: string;
}

// =============================================================================
// Lazy Edge Extraction
// =============================================================================

/**
 * Extracts all lazy edges from the adapter registrations.
 *
 * Scans each adapter's `requires` array for lazy ports and returns
 * a set of edge keys (`"from->to"`) and a list of lazy edge descriptors.
 *
 * @param adapters - The adapters in the graph
 * @returns Set of lazy edge keys and array of lazy edge descriptors
 */
export function extractLazyEdges(adapters: readonly AdapterConstraint[]): {
  readonly edgeKeys: ReadonlySet<string>;
  readonly edges: ReadonlyArray<LazyEdge>;
} {
  const edgeKeys = new Set<string>();
  const edges: LazyEdge[] = [];

  for (const adapter of adapters) {
    const fromPort = adapter.provides.__portName;

    for (const req of adapter.requires) {
      if (isLazyPort(req)) {
        const originalPort = getOriginalPort(req);
        const toPort = originalPort.__portName;
        const key = `${fromPort}->${toPort}`;
        if (!edgeKeys.has(key)) {
          edgeKeys.add(key);
          edges.push(Object.freeze({ from: fromPort, to: toPort }));
        }
      }
    }
  }

  return Object.freeze({ edgeKeys: edgeKeys, edges: Object.freeze(edges) });
}

/**
 * Resolves the original port name from a port that may be lazy.
 *
 * If the port is a lazy port, returns the unwrapped original port name.
 * Otherwise, returns the port name as-is.
 */
export function resolveOriginalPortName(p: Port<string, unknown>): string {
  if (isLazyPort(p)) {
    return getOriginalPort(p).__portName;
  }
  return p.__portName;
}

// =============================================================================
// Well-Foundedness Verification
// =============================================================================

/**
 * Verifies whether a detected cycle is well-founded.
 *
 * A cycle is well-founded if and only if removing all lazy edges from
 * the cycle eliminates it. The algorithm:
 *
 * 1. Identify which edges in the cycle are lazy
 * 2. If no lazy edges exist in the cycle, it is ill-founded
 * 3. If all edges are lazy, the cycle is trivially well-founded
 * 4. Remove lazy edges and check if the remaining eager edges still
 *    form a cycle among the cycle's nodes. If acyclic, well-founded.
 *
 * @param cycle - Array of port names forming the cycle (last element equals first)
 * @param lazyEdgeKeys - Set of lazy edge keys in format `"from->to"`
 * @returns A WellFoundednessCheck result
 */
export function verifyWellFoundedness(
  cycle: ReadonlyArray<string>,
  lazyEdgeKeys: ReadonlySet<string>
): WellFoundednessCheck {
  if (cycle.length < 2) {
    return Object.freeze({
      _tag: "IllFounded",
      cycle,
      lazyEdges: [],
      reason: "Degenerate cycle (fewer than 2 nodes)",
    });
  }

  // Identify lazy edges within this cycle
  const lazyEdgesInCycle: LazyEdge[] = [];
  const eagerEdges: Array<{ from: string; to: string }> = [];
  const nodes = cycle.slice(0, -1); // Remove closing node

  for (let i = 0; i < nodes.length; i++) {
    const from = nodes[i];
    const to = nodes[(i + 1) % nodes.length];
    const edgeKey = `${from}->${to}`;

    if (lazyEdgeKeys.has(edgeKey)) {
      lazyEdgesInCycle.push(Object.freeze({ from, to }));
    } else {
      eagerEdges.push({ from, to });
    }
  }

  // Check 1: No lazy edges => ill-founded
  if (lazyEdgesInCycle.length === 0) {
    return Object.freeze({
      _tag: "IllFounded",
      cycle,
      lazyEdges: [],
      reason: "No lazy edges in cycle",
    });
  }

  // Check 2: If all edges are lazy, the cycle is trivially well-founded
  if (eagerEdges.length === 0) {
    return Object.freeze({
      _tag: "WellFounded",
      cycle,
      lazyEdges: Object.freeze(lazyEdgesInCycle),
    });
  }

  // Check 3: Does the eager-only subgraph still contain a cycle?
  // If removing lazy edges leaves no cycle, the cycle is well-founded.
  const eagerCycleExists = hasEagerCycle(eagerEdges, nodes);

  if (eagerCycleExists) {
    return Object.freeze({
      _tag: "IllFounded",
      cycle,
      lazyEdges: Object.freeze(lazyEdgesInCycle),
      reason: "Eager subgraph still contains a cycle after removing lazy edges",
    });
  }

  return Object.freeze({
    _tag: "WellFounded",
    cycle,
    lazyEdges: Object.freeze(lazyEdgesInCycle),
  });
}

/**
 * Checks whether the eager-only edges form a cycle among the given nodes.
 *
 * Uses DFS on the subgraph restricted to the cycle's nodes and eager edges.
 */
function hasEagerCycle(
  eagerEdges: ReadonlyArray<{ from: string; to: string }>,
  nodes: ReadonlyArray<string>
): boolean {
  const nodeSet = new Set(nodes);
  const adjMap = new Map<string, string[]>();

  for (const node of nodes) {
    adjMap.set(node, []);
  }

  for (const edge of eagerEdges) {
    if (nodeSet.has(edge.from) && nodeSet.has(edge.to)) {
      const deps = adjMap.get(edge.from);
      if (deps) {
        deps.push(edge.to);
      }
    }
  }

  // DFS cycle detection
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(node: string): boolean {
    if (inStack.has(node)) return true;
    if (visited.has(node)) return false;

    visited.add(node);
    inStack.add(node);

    const deps = adjMap.get(node) ?? [];
    for (const dep of deps) {
      if (dfs(dep)) return true;
    }

    inStack.delete(node);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node)) {
      if (dfs(node)) return true;
    }
  }

  return false;
}

// =============================================================================
// Batch Verification
// =============================================================================

/**
 * Classifies all detected cycles as well-founded or ill-founded.
 *
 * @param cycles - Array of cycle paths (each ending with the repeated first node)
 * @param adapters - The adapters in the graph
 * @returns Array of WellFoundednessCheck results, one per cycle
 */
export function classifyAllCycles(
  cycles: ReadonlyArray<ReadonlyArray<string>>,
  adapters: readonly AdapterConstraint[]
): ReadonlyArray<WellFoundednessCheck> {
  const { edgeKeys } = extractLazyEdges(adapters);

  return Object.freeze(cycles.map(cycle => verifyWellFoundedness(cycle, edgeKeys)));
}
