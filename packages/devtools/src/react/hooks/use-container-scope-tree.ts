/**
 * Hook for building unified container/scope tree.
 *
 * Combines data from ContainerRegistryProvider with each container's
 * scope tree to build a unified hierarchical view.
 *
 * @packageDocumentation
 */

import { useState, useCallback, useEffect } from "react";
import { useContainerList } from "./use-container-list.js";
import {
  buildContainerScopeTree,
  createInspectorsForContainers,
} from "../utils/build-container-scope-tree.js";
import type { ContainerScopeTreeNode } from "../types/container-scope-tree.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of the useContainerScopeTree hook.
 */
export interface UseContainerScopeTreeResult {
  /**
   * The unified container/scope tree.
   *
   * Root-level nodes are root containers. Each container node
   * may contain both scope children and child container children.
   */
  readonly tree: readonly ContainerScopeTreeNode[];

  /**
   * Whether the container registry is available.
   *
   * False if ContainerRegistryProvider is not present in the tree.
   */
  readonly isAvailable: boolean;

  /**
   * Force refresh the tree data.
   *
   * Call this to rebuild the tree with fresh scope data from all containers.
   * Useful for manual refresh buttons or after known state changes.
   */
  readonly refresh: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Build a unified container/scope tree from all registered containers.
 *
 * This hook combines:
 * 1. Container hierarchy from ContainerRegistryProvider (via useContainerList)
 * 2. Scope trees from each container (via createInspector().getScopeTree())
 *
 * The resulting tree shows containers nested according to their parentId
 * relationships, with each container's scopes shown as children.
 *
 * @returns The unified tree, availability status, and refresh function
 *
 * @example Basic usage
 * ```typescript
 * function ScopeHierarchyView() {
 *   const { tree, isAvailable, refresh } = useContainerScopeTree();
 *
 *   if (!isAvailable) {
 *     return <div>Container registry not available</div>;
 *   }
 *
 *   return (
 *     <div>
 *       <button onClick={refresh}>Refresh</button>
 *       <TreeView nodes={tree} />
 *     </div>
 *   );
 * }
 * ```
 *
 * @example With auto-refresh
 * ```typescript
 * function AutoRefreshingHierarchy() {
 *   const { tree, refresh } = useContainerScopeTree();
 *
 *   useEffect(() => {
 *     const interval = setInterval(refresh, 1000);
 *     return () => clearInterval(interval);
 *   }, [refresh]);
 *
 *   return <TreeView nodes={tree} />;
 * }
 * ```
 */
export function useContainerScopeTree(): UseContainerScopeTreeResult {
  const { containers, isAvailable } = useContainerList();

  // State-based tree: updated via refresh(), not memoization
  // This ensures fresh data when scopes are created/disposed
  const [tree, setTree] = useState<readonly ContainerScopeTreeNode[]>(Object.freeze([]));

  // Rebuild tree from all containers with fresh inspector data
  const refresh = useCallback(() => {
    if (!isAvailable || containers.length === 0) {
      setTree(Object.freeze([]));
      return;
    }
    const inspectors = createInspectorsForContainers(containers);
    const newTree = buildContainerScopeTree(containers, inspectors);
    setTree(newTree);
  }, [containers, isAvailable]);

  // Initial refresh + delayed refresh to catch scope creation timing
  useEffect(() => {
    refresh();
    const timer = setTimeout(refresh, 100);
    return () => clearTimeout(timer);
  }, [refresh]);

  return { tree, isAvailable, refresh };
}
