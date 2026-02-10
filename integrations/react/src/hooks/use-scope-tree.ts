/**
 * useScopeTree hook for reactive scope tree access.
 *
 * Returns the current ScopeTree and automatically re-renders
 * when the scope hierarchy changes.
 *
 * @packageDocumentation
 */

import { useSyncExternalStore } from "react";
import type { ScopeTree } from "@hex-di/core";
import { useInspector } from "./use-inspector.js";

/**
 * Hook that returns the current scope tree, re-rendering on changes.
 *
 * Uses `useSyncExternalStore` to subscribe to inspector events and
 * provide a reactive view of the scope hierarchy.
 *
 * @returns The current ScopeTree
 *
 * @throws {MissingProviderError} If called outside an InspectorProvider.
 *
 * @example Basic usage
 * ```tsx
 * function ScopeViewer() {
 *   const tree = useScopeTree();
 *   return (
 *     <div>
 *       <p>Root scope: {tree.id} ({tree.status})</p>
 *       <p>Children: {tree.children.length}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useScopeTree(): ScopeTree {
  const inspector = useInspector();

  return useSyncExternalStore(
    onStoreChange => inspector.subscribe(() => onStoreChange()),
    () => inspector.getScopeTree(),
    () => inspector.getScopeTree()
  );
}
