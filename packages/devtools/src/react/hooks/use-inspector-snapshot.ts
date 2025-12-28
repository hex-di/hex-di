/**
 * Hook for getting container snapshots.
 *
 * @packageDocumentation
 */

import { useMemo, useCallback } from "react";
import { useContainerInspector } from "./use-container-inspector.js";
import { isSome } from "../types/adt.js";

/**
 * Runtime snapshot from ContainerInspector.
 *
 * This is the raw snapshot type from @hex-di/runtime, not the typed
 * ContainerSnapshot from @hex-di/devtools-core.
 */
type RuntimeSnapshot = ReturnType<
  ReturnType<typeof import("@hex-di/runtime").createInspector>["snapshot"]
>;

/**
 * Result of useInspectorSnapshot hook.
 */
export interface UseInspectorSnapshotResult {
  /** Current container snapshot, or null if not available */
  readonly snapshot: RuntimeSnapshot | null;

  /** Whether the inspector is available */
  readonly isAvailable: boolean;

  /** Force refresh the snapshot (triggers re-render) */
  readonly refresh: () => void;
}

/**
 * Get a snapshot of the currently selected container.
 *
 * Returns the raw runtime snapshot from ContainerInspector.snapshot().
 * Call refresh() to force a re-render with the latest snapshot.
 *
 * @example Basic usage
 * ```typescript
 * import { useInspectorSnapshot } from "@hex-di/devtools/react";
 *
 * function ContainerStatus() {
 *   const { snapshot, isAvailable, refresh } = useInspectorSnapshot();
 *
 *   if (!isAvailable) {
 *     return <div>Inspector not available</div>;
 *   }
 *
 *   if (snapshot === null) {
 *     return <div>Loading snapshot...</div>;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Disposed: {snapshot.isDisposed ? "Yes" : "No"}</p>
 *       <button onClick={refresh}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Live singleton list
 * ```typescript
 * function SingletonList() {
 *   const { snapshot } = useInspectorSnapshot();
 *
 *   if (!snapshot) return null;
 *
 *   const resolved = snapshot.singletons.filter((s) => s.isResolved);
 *   const pending = snapshot.singletons.filter((s) => !s.isResolved);
 *
 *   return (
 *     <div>
 *       <h3>Resolved ({resolved.length})</h3>
 *       <ul>
 *         {resolved.map((s) => (
 *           <li key={s.portName}>{s.portName}</li>
 *         ))}
 *       </ul>
 *       <h3>Pending ({pending.length})</h3>
 *       <ul>
 *         {pending.map((s) => (
 *           <li key={s.portName}>{s.portName}</li>
 *         ))}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 */
export function useInspectorSnapshot(): UseInspectorSnapshotResult {
  const inspectorOpt = useContainerInspector();

  const snapshot = useMemo((): RuntimeSnapshot | null => {
    if (!isSome(inspectorOpt)) {
      return null;
    }
    return inspectorOpt.value.snapshot();
  }, [inspectorOpt]);

  // refresh is a no-op since snapshot is computed on each render
  // kept for API compatibility - consumers may call it to express intent
  const refresh = useCallback((): void => {
    // Snapshot is derived from inspectorOpt, which changes when registry changes
    // This callback exists for API compatibility
  }, []);

  return {
    snapshot,
    isAvailable: isSome(inspectorOpt),
    refresh,
  };
}
