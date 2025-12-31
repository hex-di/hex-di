/**
 * Utility to build ExportedGraph from a container's internal state.
 *
 * This enables visualizing the dependency graph for any container
 * (root, child, lazy, scope) without requiring the original Graph object.
 *
 * @packageDocumentation
 */

import type {
  ExportedGraph,
  ExportedNode,
  ExportedEdge,
  InheritanceMode,
  ServiceOrigin,
} from "@hex-di/devtools-core";
import { INTERNAL_ACCESS } from "@hex-di/runtime";
import type { InspectableContainer } from "../types/inspectable-container.js";

/**
 * Builds an ExportedGraph from a container's adapterMap.
 *
 * Extracts adapter information from the container's internal state
 * and constructs a graph structure suitable for visualization.
 * For child containers, includes per-service inheritance mode.
 *
 * @param container - Any container implementing InspectableContainer
 * @returns A frozen ExportedGraph with nodes (including per-service inheritance modes) and edges
 *
 * @example
 * ```typescript
 * import { buildExportedGraphFromContainer } from './utils/build-graph-from-container';
 *
 * const graph = buildExportedGraphFromContainer(container);
 * console.log(`${graph.nodes.length} services, ${graph.edges.length} dependencies`);
 * // For child containers, each inherited node has its inheritanceMode
 * for (const node of graph.nodes) {
 *   if (node.inheritanceMode) {
 *     console.log(`${node.id}: ${node.inheritanceMode}`);
 *   }
 * }
 * ```
 */
export function buildExportedGraphFromContainer(container: InspectableContainer): ExportedGraph {
  const state = container[INTERNAL_ACCESS]();

  // Note: Child containers only contain LOCAL adapters (overrides/extensions)
  // in their adapterMap. Inherited services live in the parent's adapterMap.
  // The merging logic in container-inspector.tsx handles combining parent's
  // services (inherited) with child's services (own) when displaying.
  // Here we simply mark all services from THIS container as "own".

  const nodes: ExportedNode[] = [];
  const edges: ExportedEdge[] = [];

  for (const [, info] of state.adapterMap) {
    // All services in this container's adapterMap are locally defined ("own").
    // For root containers, these are the actual services.
    // For child containers, these are overrides/extensions only.
    // The inheritance mode is handled by the merging logic, not here.
    const origin: ServiceOrigin = "own";
    const inheritanceMode: InheritanceMode | undefined = undefined;

    nodes.push({
      id: info.portName,
      label: info.portName,
      lifetime: info.lifetime,
      factoryKind: info.factoryKind,
      origin,
      inheritanceMode,
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

/**
 * Builds a merged ExportedGraph for a child container, combining:
 * - Parent's services (inherited) with inheritance mode badges
 * - Child's local services (own) without inheritance badges
 *
 * This ensures all services are visible when viewing a child container,
 * with correct badge display based on whether the service is inherited or owned.
 *
 * @param childGraph - The child container's graph (local overrides only)
 * @param parentContainer - The parent container to get inherited services from
 * @param childContainer - The child container to get inheritance mode config
 * @returns Merged graph with all services and correct inheritance modes
 */
export function buildMergedGraphForChild(
  childGraph: ExportedGraph,
  parentContainer: InspectableContainer,
  childContainer: InspectableContainer
): ExportedGraph {
  const childState = childContainer[INTERNAL_ACCESS]();
  const parentGraph = buildExportedGraphFromContainer(parentContainer);

  // Get set of ports that are locally defined in child (overrides)
  const localPorts = new Set(childGraph.nodes.map(n => n.id));

  const mergedNodes: ExportedNode[] = [];
  const mergedEdges: ExportedEdge[] = [];

  // Add child's local services (own) - NO inheritance badge
  for (const node of childGraph.nodes) {
    mergedNodes.push({
      ...node,
      origin: "own",
      inheritanceMode: undefined,
    });
  }

  // Add parent's services that aren't overridden (inherited) - WITH inheritance badge
  for (const node of parentGraph.nodes) {
    if (!localPorts.has(node.id)) {
      // Get the actual inheritance mode from child's config
      // Default to "shared" if not explicitly configured
      const inheritanceMode: InheritanceMode =
        childState.inheritanceModes?.get(node.id) ?? "shared";

      mergedNodes.push({
        ...node,
        origin: "inherited",
        inheritanceMode,
      });
    }
  }

  // Merge edges (use all from both, dedup by from+to)
  const edgeSet = new Set<string>();
  for (const edge of [...childGraph.edges, ...parentGraph.edges]) {
    const key = `${edge.from}->${edge.to}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      mergedEdges.push(edge);
    }
  }

  // Sort nodes alphabetically for deterministic output
  mergedNodes.sort((a, b) => a.id.localeCompare(b.id));

  return Object.freeze({
    nodes: Object.freeze(mergedNodes),
    edges: Object.freeze(mergedEdges),
  });
}
