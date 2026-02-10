/**
 * useUnifiedSnapshot hook for reactive unified snapshot access.
 *
 * Returns the current UnifiedSnapshot (container + library state) and
 * automatically re-renders when any tracked state changes.
 *
 * @packageDocumentation
 */

import { useSyncExternalStore } from "react";
import type { UnifiedSnapshot } from "@hex-di/core";
import { useInspector } from "./use-inspector.js";

/**
 * Hook that returns the current unified snapshot, re-rendering on changes.
 *
 * The unified snapshot combines the container snapshot with all
 * registered library inspector snapshots, providing a single view
 * of the entire system state.
 *
 * Uses `useSyncExternalStore` to subscribe to inspector events.
 *
 * @returns The current UnifiedSnapshot
 *
 * @throws {MissingProviderError} If called outside an InspectorProvider.
 *
 * @example Basic usage
 * ```tsx
 * function SystemOverview() {
 *   const unified = useUnifiedSnapshot();
 *   return (
 *     <div>
 *       <p>Timestamp: {unified.timestamp}</p>
 *       <p>Libraries: {unified.registeredLibraries.join(', ')}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useUnifiedSnapshot(): UnifiedSnapshot {
  const inspector = useInspector();

  return useSyncExternalStore(
    onStoreChange => inspector.subscribe(() => onStoreChange()),
    () => inspector.getUnifiedSnapshot(),
    () => inspector.getUnifiedSnapshot()
  );
}
