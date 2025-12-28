/**
 * Utility to build ExportedGraph from a container's internal state.
 *
 * This enables visualizing the dependency graph for any container
 * (root, child, lazy, scope) without requiring the original Graph object.
 *
 * @packageDocumentation
 */

import type { ExportedGraph, ExportedNode, ExportedEdge } from "@hex-di/devtools-core";
import { INTERNAL_ACCESS } from "@hex-di/runtime";
import type { InspectableContainer } from "../types/inspectable-container.js";

/**
 * Builds an ExportedGraph from a container's adapterMap.
 *
 * Extracts adapter information from the container's internal state
 * and constructs a graph structure suitable for visualization.
 *
 * @param container - Any container implementing InspectableContainer
 * @returns A frozen ExportedGraph with nodes and edges
 *
 * @example
 * ```typescript
 * import { buildExportedGraphFromContainer } from './utils/build-graph-from-container';
 *
 * const graph = buildExportedGraphFromContainer(container);
 * console.log(`${graph.nodes.length} services, ${graph.edges.length} dependencies`);
 * ```
 */
export function buildExportedGraphFromContainer(container: InspectableContainer): ExportedGraph {
  const state = container[INTERNAL_ACCESS]();

  const nodes: ExportedNode[] = [];
  const edges: ExportedEdge[] = [];

  for (const [, info] of state.adapterMap) {
    nodes.push({
      id: info.portName,
      label: info.portName,
      lifetime: info.lifetime,
      factoryKind: info.factoryKind,
    });

    for (const depName of info.dependencyNames) {
      edges.push({
        from: info.portName,
        to: depName,
      });
    }
  }

  // Sort nodes alphabetically for deterministic output (matching toJSON behavior)
  nodes.sort((a, b) => a.id.localeCompare(b.id));

  return Object.freeze({
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
  });
}
