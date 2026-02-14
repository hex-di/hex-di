/**
 * Layout cache to avoid redundant dagre computations.
 *
 * Cache key is derived from adapter count, sorted port names hash,
 * and layout direction.
 *
 * @packageDocumentation
 */

import type { ContainerGraphData } from "@hex-di/core";
import type { GraphLayout } from "./types.js";
import { computeGraphLayout } from "./layout-engine.js";

interface LayoutCacheEntry {
  readonly key: string;
  readonly layout: GraphLayout;
}

interface LayoutCache {
  get(graphData: ContainerGraphData, direction: "TB" | "LR"): GraphLayout;
  invalidate(): void;
  readonly size: number;
}

/**
 * Generate a cache key from graph data and direction.
 */
function computeCacheKey(graphData: ContainerGraphData, direction: "TB" | "LR"): string {
  const portNames = graphData.adapters.map(a => a.portName).sort();
  const depsHash = graphData.adapters
    .map(a => `${a.portName}:${a.dependencyNames.join(",")}`)
    .sort()
    .join("|");
  return `${graphData.adapters.length}:${direction}:${portNames.join(",")}:${depsHash}`;
}

/**
 * Create a layout cache with a single-entry strategy.
 *
 * The cache stores the most recent layout computation. If the graph data
 * or direction changes, the cache is invalidated and recomputed.
 */
function createLayoutCache(): LayoutCache {
  let cached: LayoutCacheEntry | undefined;

  return {
    get(graphData: ContainerGraphData, direction: "TB" | "LR"): GraphLayout {
      const key = computeCacheKey(graphData, direction);
      if (cached !== undefined && cached.key === key) {
        return cached.layout;
      }
      const layout = computeGraphLayout(graphData, direction);
      cached = { key, layout };
      return layout;
    },
    invalidate(): void {
      cached = undefined;
    },
    get size(): number {
      return cached !== undefined ? 1 : 0;
    },
  };
}

export { createLayoutCache, computeCacheKey };
export type { LayoutCache };
