/**
 * Utility to build ExportedGraph from a container's internal state.
 *
 * This enables visualizing the dependency graph for any container
 * (root, child, lazy, scope) without requiring the original Graph object.
 *
 * @packageDocumentation
 */

import type { ExportedGraph, ExportedNode, ExportedEdge } from "@hex-di/devtools-core";
import type { InheritanceMode, ServiceOrigin } from "@hex-di/core";
import {
  INTERNAL_ACCESS,
  type InspectorAdapterInfo,
  type InspectorAPI,
  type VisualizableAdapter,
} from "@hex-di/runtime";
import type { InspectableContainer } from "../types/inspectable-container.js";

// Re-export AdapterInfo type under its canonical name for backwards compatibility
type AdapterInfo = InspectorAdapterInfo;

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

/**
 * Builds an ExportedGraph from adapter information.
 *
 * Used when container reference is unavailable (e.g., discovered child
 * containers from ContainerTreeContext). Gets adapter data from the
 * inspector's getAdapterInfo() method instead.
 *
 * @param adapterInfo - Array of adapter info from inspector.getAdapterInfo()
 * @returns A frozen ExportedGraph with nodes and edges
 *
 * @example
 * ```typescript
 * const inspector = container[INSPECTOR];
 * const graph = buildExportedGraphFromAdapterInfo(inspector.getAdapterInfo());
 * console.log(`${graph.nodes.length} services`);
 * ```
 */
export function buildExportedGraphFromAdapterInfo(
  adapterInfo: readonly AdapterInfo[]
): ExportedGraph {
  const nodes: ExportedNode[] = [];
  const edges: ExportedEdge[] = [];

  for (const info of adapterInfo) {
    nodes.push({
      id: info.portName,
      label: info.portName,
      lifetime: info.lifetime,
      factoryKind: info.factoryKind,
      origin: "own" as ServiceOrigin,
      inheritanceMode: undefined,
    });

    for (const depName of info.dependencyNames) {
      edges.push({ from: info.portName, to: depName });
    }
  }

  // Sort nodes alphabetically for deterministic output
  nodes.sort((a, b) => a.id.localeCompare(b.id));

  return Object.freeze({
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
  });
}

/**
 * Builds an ExportedGraph from VisualizableAdapter data.
 *
 * Uses the inspector's getGraphData() result which includes proper origin
 * information ("own", "inherited", or "overridden") and isOverride flag.
 *
 * @param adapters - Array of visualizable adapters from inspector.getGraphData().adapters
 * @returns A frozen ExportedGraph with nodes and edges including override state
 *
 * @example
 * ```typescript
 * const inspector = container[INSPECTOR];
 * const graphData = inspector.getGraphData();
 * const graph = buildExportedGraphFromVisualizableAdapters(graphData.adapters);
 * // Override state is preserved in nodes
 * for (const node of graph.nodes) {
 *   if (node.origin === "overridden") {
 *     console.log(`${node.id} is an override`);
 *   }
 * }
 * ```
 */
export function buildExportedGraphFromVisualizableAdapters(
  adapters: readonly VisualizableAdapter[]
): ExportedGraph {
  const nodes: ExportedNode[] = [];
  const edges: ExportedEdge[] = [];

  for (const adapter of adapters) {
    nodes.push({
      id: adapter.portName,
      label: adapter.portName,
      lifetime: adapter.lifetime,
      factoryKind: adapter.factoryKind,
      origin: adapter.origin,
      inheritanceMode: adapter.inheritanceMode,
    });

    for (const depName of adapter.dependencyNames) {
      edges.push({ from: adapter.portName, to: depName });
    }
  }

  // Sort nodes alphabetically for deterministic output
  nodes.sort((a, b) => a.id.localeCompare(b.id));

  return Object.freeze({
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
  });
}

/**
 * Builds a merged ExportedGraph for a child container using adapter info.
 *
 * Combines child's services with parent's inherited services, using
 * inspector data when container references are unavailable.
 *
 * @param childGraph - The child container's graph (from buildExportedGraphFromAdapterInfo)
 * @param parentGraph - The parent container's graph
 * @param childInspector - The child inspector to get inheritance mode config
 * @returns Merged graph with all services and correct inheritance modes
 */
export function buildMergedGraphFromAdapterInfo(
  childGraph: ExportedGraph,
  parentGraph: ExportedGraph,
  childInspector: InspectorAPI
): ExportedGraph {
  // Get inheritance modes from child inspector's snapshot
  const snapshot = childInspector.getSnapshot();

  // Get inheritance modes map (only available for child containers)
  const inheritanceModes: ReadonlyMap<string, InheritanceMode> =
    snapshot.kind === "child" ? snapshot.inheritanceModes : new Map();

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
      const inheritanceMode: InheritanceMode = inheritanceModes.get(node.id) ?? "shared";

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
