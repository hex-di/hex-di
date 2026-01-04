/**
 * useContainerScopeTree Hook
 *
 * Provides access to the unified container/scope tree for the DevTools UI.
 * Combines container hierarchy from ContainerTree machine with scope trees
 * from each container's inspector.
 *
 * @packageDocumentation
 */

import { useMemo, useCallback, useSyncExternalStore } from "react";
import { useDevToolsFlowRuntimeOptional } from "../../store/index.js";
import { buildContainerScopeTreeFromEntries } from "../utils/build-container-scope-tree.js";
import type { ContainerScopeTreeNode } from "../types/container-scope-tree.js";
import type { ContainerTreeEntry } from "@hex-di/devtools-core";

// =============================================================================
// Types
// =============================================================================

/**
 * Result type for useContainerScopeTree hook.
 */
export interface UseContainerScopeTreeResult {
  /**
   * The unified container/scope tree.
   * Empty array if no containers have been discovered.
   */
  readonly tree: readonly ContainerScopeTreeNode[];

  /**
   * Whether the container registry is available (containers discovered).
   */
  readonly isRegistryAvailable: boolean;

  /**
   * Dispatch a DISCOVER event to re-discover containers.
   */
  readonly refreshTree: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook to get the unified container/scope tree.
 *
 * Uses complete data from ContainerTreeEntry (fetched during discovery by FSM).
 * NO direct inspector access - React components are "dumb" and only consume
 * FSM-provided data.
 *
 * @returns The container/scope tree and registry status
 * @throws Error if used outside DevToolsProvider
 *
 * @example
 * ```tsx
 * function ContainerHierarchy() {
 *   const { tree, isRegistryAvailable, refreshTree } = useContainerScopeTree();
 *
 *   if (!isRegistryAvailable) {
 *     return <div>No containers discovered</div>;
 *   }
 *
 *   return (
 *     <div>
 *       <button onClick={refreshTree}>Refresh</button>
 *       <TreeView tree={tree} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useContainerScopeTree(): UseContainerScopeTreeResult {
  const result = useContainerScopeTreeOptional();

  if (result === null) {
    throw new Error(
      "useContainerScopeTree must be used within a DevToolsStoreProvider. " +
        "Wrap your component tree with <DevToolsStoreProvider inspector={inspector}>."
    );
  }

  return result;
}

// =============================================================================
// Fallback Result
// =============================================================================

/**
 * Fallback result when DevToolsProvider is not available.
 * @internal Reserved for future use in alternative fallback patterns.
 */
const _FALLBACK_RESULT: UseContainerScopeTreeResult = Object.freeze({
  tree: Object.freeze([]),
  isRegistryAvailable: false,
  refreshTree: () => {
    // No-op when not in DevToolsProvider
  },
});

// =============================================================================
// Optional Hook (Safe for standalone use)
// =============================================================================

/**
 * Empty containers array for fallback.
 */
const EMPTY_CONTAINERS: readonly ContainerTreeEntry[] = Object.freeze([]);

/**
 * Hook to get the unified container/scope tree, or null if outside DevToolsProvider.
 *
 * Uses complete data from ContainerTreeEntry (fetched during discovery by FSM).
 * NO direct inspector access - React components are "dumb" and only consume
 * FSM-provided data.
 *
 * @returns The container/scope tree and registry status, or null if no provider
 *
 * @example
 * ```tsx
 * function ContainerHierarchy() {
 *   const containerScopeTree = useContainerScopeTreeOptional();
 *
 *   // Fall back to default behavior if no DevToolsProvider
 *   const tree = containerScopeTree?.tree ?? [];
 *   const isRegistryAvailable = containerScopeTree?.isRegistryAvailable ?? false;
 *
 *   // ...
 * }
 * ```
 */
export function useContainerScopeTreeOptional(): UseContainerScopeTreeResult | null {
  // Get runtime from store context, returns null if no provider (optional version)
  const runtime = useDevToolsFlowRuntimeOptional();
  const hasRuntime = runtime !== null;

  // Get container entries using useSyncExternalStore directly (safe for no runtime)
  // ContainerTreeEntry now includes complete data (scopeTree, graphData, etc.)
  // fetched during discovery - NO inspector access needed!
  const containers = useSyncExternalStore(
    // subscribe
    useCallback(
      (callback: () => void) => {
        if (!hasRuntime) return () => {};
        return runtime.subscribe(callback);
      },
      [runtime, hasRuntime]
    ),
    // getSnapshot
    useCallback(() => {
      if (!hasRuntime) return EMPTY_CONTAINERS;
      const snapshot = runtime.getSnapshot();
      return snapshot.containerTree.context.containers;
    }, [runtime, hasRuntime]),
    // getServerSnapshot
    useCallback(() => {
      if (!hasRuntime) return EMPTY_CONTAINERS;
      const snapshot = runtime.getSnapshot();
      return snapshot.containerTree.context.containers;
    }, [runtime, hasRuntime])
  );

  // Build the unified tree directly from ContainerTreeEntry data
  // NO inspector access - data is already embedded in entries from FSM
  const tree = useMemo(() => {
    if (!hasRuntime || containers.length === 0) {
      return Object.freeze([]) as readonly ContainerScopeTreeNode[];
    }

    // Use FSM-based tree builder (no inspector needed)
    return buildContainerScopeTreeFromEntries(containers);
  }, [containers, hasRuntime]);

  // Refresh callback to dispatch DISCOVER event
  const refreshTree = useCallback(() => {
    if (hasRuntime) {
      runtime.dispatch({ type: "CONTAINER_TREE.DISCOVER" });
    }
  }, [runtime, hasRuntime]);

  // Return null if no runtime is available
  if (!hasRuntime) {
    return null;
  }

  return {
    tree,
    isRegistryAvailable: containers.length > 0,
    refreshTree,
  };
}
