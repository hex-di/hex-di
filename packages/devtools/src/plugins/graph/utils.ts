/**
 * Graph Plugin Utilities
 *
 * Provides utilities for building and manipulating graph data
 * from containers and plugin props.
 *
 * @packageDocumentation
 */

import type { ExportedGraph } from "@hex-di/devtools-core";
import type { InheritanceMode, ServiceOrigin, Lifetime, FactoryKind } from "@hex-di/core";
// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a value is a readonly array of strings.
 */
function isStringArray(value: unknown): value is readonly string[] {
  if (!Array.isArray(value)) return false;
  return value.every((item): item is string => typeof item === "string");
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
      containers:
        "containers" in node && isStringArray(node.containers) ? node.containers : undefined,
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
