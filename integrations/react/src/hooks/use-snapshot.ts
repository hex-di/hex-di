/**
 * useSnapshot hook for reactive container snapshot access.
 *
 * Returns the current ContainerSnapshot and automatically re-renders
 * when the container state changes.
 *
 * @packageDocumentation
 */

import { useSyncExternalStore } from "react";
import type { ContainerSnapshot } from "@hex-di/core";
import { useInspector } from "./use-inspector.js";

/**
 * Hook that returns the current container snapshot, re-rendering on changes.
 *
 * Uses `useSyncExternalStore` to subscribe to inspector events and
 * provide a reactive view of the container state.
 *
 * @returns The current ContainerSnapshot
 *
 * @throws {MissingProviderError} If called outside an InspectorProvider.
 *
 * @example Basic usage
 * ```tsx
 * function ContainerStatus() {
 *   const snapshot = useSnapshot();
 *   return (
 *     <div>
 *       <p>Phase: {snapshot.phase}</p>
 *       <p>Resolved: {snapshot.resolvedCount}/{snapshot.totalCount}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSnapshot(): ContainerSnapshot {
  const inspector = useInspector();

  return useSyncExternalStore(
    onStoreChange => inspector.subscribe(() => onStoreChange()),
    () => inspector.getSnapshot(),
    () => inspector.getSnapshot()
  );
}
