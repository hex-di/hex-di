/**
 * Graph Plugin Utilities
 *
 * Provides utilities for building and manipulating graph data
 * from containers and plugin props.
 *
 * @packageDocumentation
 */

import type { ExportedGraph, ExportedNode, ExportedEdge } from "@hex-di/devtools-core";
import type { InheritanceMode, ServiceOrigin } from "@hex-di/plugin";
import type { Lifetime, FactoryKind } from "@hex-di/graph";
import type { ContainerEntry } from "../../runtime/plugin-types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Extended node type with container membership for unified view.
 *
 * When multiple containers are selected, each unique port appears once
 * with a list of which containers provide it.
 */
export interface UnifiedNode extends ExportedNode {
  /** All containers that provide this port */
  readonly containers: readonly string[];
}

/**
 * Extended graph type with unified nodes.
 */
export interface UnifiedGraph {
  readonly nodes: readonly UnifiedNode[];
  readonly edges: readonly ExportedEdge[];
}

/**
 * Graph node with required properties for visualization.
 * Uses the same types as DependencyGraph expects.
 */
export interface GraphNode {
  readonly id: string;
  readonly label: string;
  readonly lifetime: Lifetime;
  readonly factoryKind?: FactoryKind;
  readonly origin?: ServiceOrigin;
  readonly inheritanceMode?: InheritanceMode;
  readonly containers?: readonly string[];
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Transforms ExportedGraph nodes into GraphNode format for visualization.
 *
 * Maps the exported node properties to the format expected by DependencyGraph.
 *
 * @param exportedGraph - The graph data to transform
 * @returns Array of graph nodes ready for visualization
 *
 * @example
 * ```typescript
 * const nodes = transformNodesToGraphNodes(exportedGraph);
 * return <DependencyGraph nodes={nodes} edges={exportedGraph.edges} />;
 * ```
 */
export function transformNodesToGraphNodes(exportedGraph: ExportedGraph): readonly GraphNode[] {
  return exportedGraph.nodes.map(node => {
    // Build the graph node with proper typing
    // All properties from ExportedNode already have the correct types
    const graphNode: GraphNode = {
      id: node.id,
      label: node.label,
      lifetime: node.lifetime,
      factoryKind: node.factoryKind,
      origin: node.origin,
      inheritanceMode: node.inheritanceMode,
      // Include containers list for unified graph tooltip if present
      containers: "containers" in node ? (node.containers as readonly string[]) : undefined,
    };

    return graphNode;
  });
}

/**
 * Checks if a graph is empty (has no nodes).
 *
 * @param graph - The graph to check
 * @returns true if the graph has no nodes
 */
export function isEmptyGraph(graph: ExportedGraph): boolean {
  return graph.nodes.length === 0;
}

/**
 * Filters containers based on a set of selected IDs.
 *
 * @param containers - All available containers
 * @param selectedIds - Set of IDs to filter by
 * @returns Containers matching the selected IDs
 */
export function filterSelectedContainers(
  containers: readonly ContainerEntry[],
  selectedIds: ReadonlySet<string>
): readonly ContainerEntry[] {
  return containers.filter(c => selectedIds.has(c.id));
}

/**
 * Creates an empty frozen graph.
 *
 * @returns An empty ExportedGraph with no nodes or edges
 */
export function createEmptyGraph(): ExportedGraph {
  return Object.freeze({
    nodes: Object.freeze([]),
    edges: Object.freeze([]),
  });
}

/**
 * Merges multiple graphs into a unified graph.
 *
 * Nodes with the same ID are deduplicated, keeping the first occurrence.
 * Edges are deduplicated by from+to key.
 *
 * @param graphs - Array of graphs to merge
 * @returns Merged graph with deduplicated nodes and edges
 */
export function mergeGraphs(graphs: readonly ExportedGraph[]): ExportedGraph {
  const nodeMap = new Map<string, ExportedNode>();
  const edgeSet = new Set<string>();
  const edges: ExportedEdge[] = [];

  for (const graph of graphs) {
    for (const node of graph.nodes) {
      if (!nodeMap.has(node.id)) {
        nodeMap.set(node.id, node);
      }
    }

    for (const edge of graph.edges) {
      const key = `${edge.from}->${edge.to}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push(edge);
      }
    }
  }

  const nodes = Array.from(nodeMap.values()).sort((a, b) => a.id.localeCompare(b.id));

  return Object.freeze({
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
  });
}
