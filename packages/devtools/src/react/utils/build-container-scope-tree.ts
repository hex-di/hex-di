/**
 * Utility to build unified container/scope tree from container registry.
 *
 * Combines container hierarchy (from ContainerRegistryProvider) with each
 * container's scope tree (from createInspector) into a single hierarchical
 * structure for visualization.
 *
 * @packageDocumentation
 */

import type { ScopeTree } from "@hex-di/devtools-core";
import { createInspector } from "@hex-di/runtime";
import type { ContainerEntry } from "../context/container-registry.js";
import type { InspectableContainer } from "../types/inspectable-container.js";
import type {
  ContainerScopeTreeNode,
  ContainerNode,
  ScopeNode,
} from "../types/container-scope-tree.js";

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Inspector interface needed for tree building.
 * Only requires getScopeTree() method.
 */
interface InspectorLike {
  getScopeTree(): ScopeTree;
}

/**
 * Map of container IDs to their inspectors.
 */
type InspectorMap = ReadonlyMap<string, InspectorLike>;

// =============================================================================
// Conversion Functions
// =============================================================================

/**
 * Convert a ScopeTree node to a ScopeNode in the unified tree.
 *
 * The input ScopeTree has id="container" for the root node, which we skip.
 * Only the children (actual scopes) are converted to ScopeNode.
 *
 * @param scopeTree - The ScopeTree from inspector.getScopeTree()
 * @returns A ScopeNode with kind="scope"
 */
function convertScopeTreeToScopeNode(scopeTree: ScopeTree): ScopeNode {
  return Object.freeze({
    kind: "scope" as const,
    id: scopeTree.id,
    status: scopeTree.status,
    resolvedCount: scopeTree.resolvedCount,
    totalCount: scopeTree.totalCount,
    resolvedPorts: scopeTree.resolvedPorts,
    children: Object.freeze(scopeTree.children.map(convertScopeTreeToScopeNode)),
  });
}

/**
 * Build a ContainerNode from a ContainerEntry and its scope tree.
 *
 * @param entry - The container registry entry
 * @param scopeTree - The scope tree from the container's inspector
 * @param childContainers - Child containers to nest under this container
 * @returns A ContainerNode with scopes and child containers as children
 */
function buildContainerNode(
  entry: ContainerEntry,
  scopeTree: ScopeTree,
  childContainers: readonly ContainerScopeTreeNode[]
): ContainerNode {
  // Extract scopes from the scope tree (the root node's children)
  // The root node has id="container" and represents the container itself
  const scopeNodes: readonly ScopeNode[] = Object.freeze(
    scopeTree.children.map(convertScopeTreeToScopeNode)
  );

  // Combine scopes and child containers as children
  // Scopes first, then child containers for consistent ordering
  const children: readonly ContainerScopeTreeNode[] = Object.freeze([
    ...scopeNodes,
    ...childContainers,
  ]);

  return Object.freeze({
    kind: "container" as const,
    id: entry.id,
    label: entry.label,
    containerKind: entry.kind,
    status: scopeTree.status,
    resolvedCount: scopeTree.resolvedCount,
    totalCount: scopeTree.totalCount,
    resolvedPorts: scopeTree.resolvedPorts,
    children,
  });
}

// =============================================================================
// Tree Building
// =============================================================================

/**
 * Recursively build the container tree for a given container and its children.
 *
 * @param entry - The current container entry
 * @param allContainers - All container entries from the registry
 * @param inspectors - Map of container IDs to their inspectors
 * @returns A ContainerNode with nested children
 */
function buildContainerTreeRecursive(
  entry: ContainerEntry,
  allContainers: readonly ContainerEntry[],
  inspectors: InspectorMap
): ContainerNode | null {
  // Get inspector for this container
  const inspector = inspectors.get(entry.id);
  if (inspector === undefined) {
    // No inspector available (container may be disposed)
    return null;
  }

  // Get scope tree for this container
  let scopeTree: ScopeTree;
  try {
    scopeTree = inspector.getScopeTree();
  } catch {
    // Container may be disposed, create minimal placeholder
    scopeTree = {
      id: "container",
      status: "disposed",
      resolvedCount: 0,
      totalCount: 0,
      children: [],
      resolvedPorts: [],
    };
  }

  // Find child containers (those with parentId matching this container's id)
  const childEntries = allContainers.filter(c => c.parentId === entry.id);

  // Recursively build child container trees
  const childContainerNodes: ContainerScopeTreeNode[] = [];
  for (const childEntry of childEntries) {
    const childNode = buildContainerTreeRecursive(childEntry, allContainers, inspectors);
    if (childNode !== null) {
      childContainerNodes.push(childNode);
    }
  }

  return buildContainerNode(entry, scopeTree, childContainerNodes);
}

/**
 * Build a unified container/scope tree from the container registry.
 *
 * This is the main entry point for tree building. It:
 * 1. Finds all root containers (parentId === null)
 * 2. Recursively builds the tree including child containers
 * 3. Includes scope trees for each container
 *
 * @param containers - All container entries from the registry
 * @param inspectors - Map of container IDs to their inspectors
 * @returns Array of root ContainerNodes with nested children
 *
 * @example
 * ```typescript
 * const { containers } = useContainerList();
 * const inspectors = new Map();
 * for (const entry of containers) {
 *   inspectors.set(entry.id, createInspector(entry.container));
 * }
 * const tree = buildContainerScopeTree(containers, inspectors);
 * ```
 */
export function buildContainerScopeTree(
  containers: readonly ContainerEntry[],
  inspectors: InspectorMap
): readonly ContainerScopeTreeNode[] {
  // Find root containers (those without a parent)
  const rootContainers = containers.filter(c => c.parentId === null);

  // Build tree for each root container
  const rootNodes: ContainerScopeTreeNode[] = [];
  for (const rootEntry of rootContainers) {
    const node = buildContainerTreeRecursive(rootEntry, containers, inspectors);
    if (node !== null) {
      rootNodes.push(node);
    }
  }

  return Object.freeze(rootNodes);
}

/**
 * Create inspectors for all containers in the registry.
 *
 * Inspectors are created lazily and cached. Disposed containers
 * are handled gracefully by catching errors.
 *
 * @param containers - All container entries from the registry
 * @returns Map of container IDs to their inspectors
 *
 * @example
 * ```typescript
 * const { containers } = useContainerList();
 * const inspectors = createInspectorsForContainers(containers);
 * const tree = buildContainerScopeTree(containers, inspectors);
 * ```
 */
export function createInspectorsForContainers(
  containers: readonly ContainerEntry[]
): ReadonlyMap<string, InspectorLike> {
  const map = new Map<string, InspectorLike>();

  for (const entry of containers) {
    try {
      const inspector = createInspector(entry.container as Parameters<typeof createInspector>[0]);
      map.set(entry.id, inspector);
    } catch {
      // Container may be disposed or invalid, skip it
    }
  }

  return map;
}
