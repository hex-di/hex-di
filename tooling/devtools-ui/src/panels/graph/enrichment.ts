/**
 * Node and edge enrichment logic.
 *
 * Transforms raw layout data and adapter information into enriched
 * graph nodes and edges with computed properties for rendering.
 *
 * @packageDocumentation
 */

import type {
  VisualizableAdapter,
  ResultStatistics,
  EnrichedGraphNode,
  EnrichedGraphEdge,
  GraphFilterState,
  LayoutNode,
  LayoutEdge,
} from "./types.js";
import type { PortInfo } from "@hex-di/graph/advanced";
import { detectLibraryKind } from "./library-detection.js";
import { matchesFilter } from "./filter-logic.js";
import { HIGH_ERROR_RATE_THRESHOLD } from "./constants.js";

/**
 * Build a map of port name to count of direct dependents.
 */
function buildDependentCounts(
  adapters: readonly VisualizableAdapter[]
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const adapter of adapters) {
    for (const depName of adapter.dependencyNames) {
      counts.set(depName, (counts.get(depName) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Enrich a layout node with computed rendering properties.
 */
function enrichNode(
  layoutNode: LayoutNode,
  stats: ResultStatistics | undefined,
  portInfo: PortInfo | undefined,
  dependentCount: number,
  isResolved: boolean,
  filter: GraphFilterState
): EnrichedGraphNode {
  const errorRate = stats?.errorRate;
  const hasHighErrorRate = errorRate !== undefined && errorRate >= HIGH_ERROR_RATE_THRESHOLD;
  const libraryKind = detectLibraryKind(layoutNode.adapter);
  const metadata = layoutNode.adapter.metadata;

  const enriched: EnrichedGraphNode = {
    adapter: layoutNode.adapter,
    x: layoutNode.x,
    y: layoutNode.y,
    width: layoutNode.width,
    height: layoutNode.height,
    isResolved,
    errorRate,
    hasHighErrorRate,
    totalCalls: stats?.totalCalls ?? 0,
    okCount: stats?.okCount ?? 0,
    errCount: stats?.errCount ?? 0,
    errorsByCode: stats?.errorsByCode ?? new Map(),
    direction: portInfo?.direction,
    category: portInfo?.category,
    tags: portInfo?.tags ?? [],
    description:
      metadata !== undefined && typeof metadata["description"] === "string"
        ? metadata["description"]
        : undefined,
    libraryKind,
    dependentCount,
    matchesFilter: false,
  };

  // Compute matchesFilter with the enriched data
  return {
    ...enriched,
    matchesFilter: matchesFilter(enriched, filter),
  };
}

/**
 * Enrich a layout edge with computed rendering properties.
 */
function enrichEdge(
  layoutEdge: LayoutEdge,
  selectedNodes: ReadonlySet<string>,
  transitiveDepthMap: ReadonlyMap<string, number>,
  adapterMap: ReadonlyMap<string, VisualizableAdapter>
): EnrichedGraphEdge {
  const isHighlighted =
    selectedNodes.has(layoutEdge.source) || selectedNodes.has(layoutEdge.target);

  const sourceDepth = transitiveDepthMap.get(layoutEdge.source);
  const targetDepth = transitiveDepthMap.get(layoutEdge.target);
  const transitiveDepth = Math.min(sourceDepth ?? Infinity, targetDepth ?? Infinity);

  const sourceAdapter = adapterMap.get(layoutEdge.source);
  const isInherited = sourceAdapter?.origin === "inherited";
  const isOverridden = sourceAdapter?.isOverride === true;

  return {
    source: layoutEdge.source,
    target: layoutEdge.target,
    points: layoutEdge.points,
    isHighlighted,
    transitiveDepth: transitiveDepth === Infinity ? -1 : transitiveDepth,
    isInherited,
    isOverridden,
  };
}

/**
 * Build a transitive depth map from selected nodes.
 *
 * Computes BFS distances from the set of selected nodes through
 * the dependency graph.
 */
function buildTransitiveDepthMap(
  selectedNodes: ReadonlySet<string>,
  dependencyMap: ReadonlyMap<string, readonly string[]>,
  dependentMap: ReadonlyMap<string, readonly string[]>
): ReadonlyMap<string, number> {
  const depths = new Map<string, number>();
  if (selectedNodes.size === 0) return depths;

  const queue: Array<{ name: string; depth: number }> = [];

  for (const portName of selectedNodes) {
    depths.set(portName, 0);
    queue.push({ name: portName, depth: 0 });
  }

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;

    // Traverse dependencies
    const deps = dependencyMap.get(current.name) ?? [];
    for (const dep of deps) {
      if (!depths.has(dep)) {
        const nextDepth = current.depth + 1;
        depths.set(dep, nextDepth);
        queue.push({ name: dep, depth: nextDepth });
      }
    }

    // Traverse dependents
    const dependents = dependentMap.get(current.name) ?? [];
    for (const dependent of dependents) {
      if (!depths.has(dependent)) {
        const nextDepth = current.depth + 1;
        depths.set(dependent, nextDepth);
        queue.push({ name: dependent, depth: nextDepth });
      }
    }
  }

  return depths;
}

/**
 * Build a reverse dependency map (port name -> list of ports that depend on it).
 */
function buildDependentMap(
  adapters: readonly VisualizableAdapter[]
): ReadonlyMap<string, readonly string[]> {
  const map = new Map<string, string[]>();
  for (const adapter of adapters) {
    for (const dep of adapter.dependencyNames) {
      const existing = map.get(dep);
      if (existing !== undefined) {
        existing.push(adapter.portName);
      } else {
        map.set(dep, [adapter.portName]);
      }
    }
  }
  return map;
}

export { enrichNode, enrichEdge, buildDependentCounts, buildTransitiveDepthMap, buildDependentMap };
