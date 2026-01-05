/**
 * Plugin Props Derivation Utilities
 *
 * Provides utility functions for deriving container entries and graphs
 * from DevToolsRuntimeSnapshot. These utilities are used internally
 * by the devtools runtime and can be used for testing.
 *
 * @packageDocumentation
 */

import type { ExportedGraph, ExportedNode, ExportedEdge } from "@hex-di/devtools-core";
import type { ContainerKind } from "@hex-di/plugin";
import type { DevToolsRuntimeSnapshot } from "./types.js";
import type { ContainerEntry } from "./plugin-types.js";
import type { ContainerNode } from "./types.js";

// Re-export ContainerEntry for convenience
export type { ContainerEntry } from "./plugin-types.js";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Maps ContainerKind to ContainerEntry kind.
 * Scope containers are mapped to "child" since they are conceptually child containers.
 */
function toContainerEntryKind(kind: ContainerKind): "root" | "child" | "lazy" {
  if (kind === "scope") {
    // Scope containers are treated as child containers for UI purposes
    return "child";
  }
  return kind;
}

// =============================================================================
// Container Entry Derivation
// =============================================================================

/**
 * Derives ContainerEntry array from a runtime snapshot.
 *
 * Transforms the container tree nodes into view-model entries
 * with formatted paths and selection state.
 *
 * @param snapshot - Runtime snapshot containing container tree and UI state
 * @returns Array of ContainerEntry objects
 */
export function deriveContainerEntries(
  snapshot: DevToolsRuntimeSnapshot
): readonly ContainerEntry[] {
  const { containerTree, containerStates, uiState } = snapshot;
  const selectedSet = new Set(uiState.selectedContainerIds);

  return containerTree.map((node): ContainerEntry => {
    const state = containerStates.get(node.containerId) ?? "pending";

    return {
      id: node.containerId,
      name: node.containerName,
      path: node.path.join("/"),
      kind: toContainerEntryKind(node.kind),
      state,
      isSelected: selectedSet.has(node.containerId),
    };
  });
}

// =============================================================================
// Graph Derivation
// =============================================================================

/**
 * Derives a unified ExportedGraph from selected container nodes.
 *
 * Merges graph data from all selected containers, handling:
 * - Node deduplication (first occurrence wins)
 * - Edge aggregation from all containers
 * - Origin and inheritanceMode preservation
 *
 * @param selectedContainers - Container nodes to derive graph from
 * @returns Merged ExportedGraph
 */
export function deriveGraphFromContainers(
  selectedContainers: readonly ContainerNode[]
): ExportedGraph {
  if (selectedContainers.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodeMap = new Map<string, ExportedNode>();
  const edges: ExportedEdge[] = [];
  const edgeSet = new Set<string>();

  for (const container of selectedContainers) {
    const graphData = container.inspector.getGraphData();

    for (const adapter of graphData.adapters) {
      // Add node if not already present (first occurrence wins)
      if (!nodeMap.has(adapter.portName)) {
        const node: ExportedNode = {
          id: adapter.portName,
          label: adapter.portName,
          lifetime: adapter.lifetime,
          factoryKind: adapter.factoryKind,
          origin: adapter.origin,
          inheritanceMode: adapter.inheritanceMode,
        };
        nodeMap.set(adapter.portName, node);
      }

      // Add edges for dependencies
      for (const depName of adapter.dependencyNames) {
        const edgeKey = `${adapter.portName}->${depName}`;
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          edges.push({
            from: adapter.portName,
            to: depName,
          });
        }
      }
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges,
  };
}

/**
 * Derives the graph for selected containers in the snapshot.
 *
 * Filters the container tree to only selected containers and
 * derives a merged graph from them.
 *
 * @param snapshot - Runtime snapshot with container tree and UI state
 * @returns ExportedGraph for selected containers
 */
export function deriveGraphFromSnapshot(snapshot: DevToolsRuntimeSnapshot): ExportedGraph {
  const { containerTree, uiState } = snapshot;
  const selectedSet = new Set(uiState.selectedContainerIds);

  // Filter to selected containers
  const selectedContainers = containerTree.filter(node => selectedSet.has(node.containerId));

  return deriveGraphFromContainers(selectedContainers);
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a container entry is selected.
 */
export function isSelectedContainer(entry: ContainerEntry): boolean {
  return entry.isSelected;
}

/**
 * Type guard to check if a container entry is in active state.
 */
export function isActiveContainer(entry: ContainerEntry): boolean {
  return entry.state === "active";
}

/**
 * Filters container entries to only selected ones.
 */
export function getSelectedContainers(
  containers: readonly ContainerEntry[]
): readonly ContainerEntry[] {
  return containers.filter(isSelectedContainer);
}

/**
 * Filters container entries to only active ones.
 */
export function getActiveContainers(
  containers: readonly ContainerEntry[]
): readonly ContainerEntry[] {
  return containers.filter(isActiveContainer);
}
