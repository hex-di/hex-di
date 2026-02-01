/**
 * Hook for getting container snapshots.
 *
 * ## Architecture Note
 *
 * This hook directly accesses `inspector.getSnapshot()` rather than going through
 * the FSM state layer. This is intentional because:
 *
 * 1. **Inspectors are the source of truth** for their own container state
 * 2. **FSM tracks discovery state**, not container internals
 * 3. **Direct access avoids unnecessary indirection** and synchronization
 *
 * The FSM (ContainerTree machine) tracks which containers exist and their
 * discovery/subscription status. The inspector holds the live container state
 * (singletons, phase, etc.). These are complementary, not duplicative.
 *
 * @packageDocumentation
 */

import { useMemo, useCallback } from "react";
import { useContainerInspector } from "./use-container-inspector.js";

/**
 * Runtime snapshot from InspectorAPI.
 *
 * This is the raw snapshot type from @hex-di/runtime inspector API,
 * not the typed ContainerSnapshot from @hex-di/devtools-core.
 */
type RuntimeSnapshot = ReturnType<import("@hex-di/runtime").InspectorAPI["getSnapshot"]>;

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
  const inspector = useContainerInspector();

  const snapshot = useMemo((): RuntimeSnapshot | null => {
    if (inspector === null) {
      return null;
    }
    return inspector.getSnapshot();
  }, [inspector]);

  /**
   * Refresh callback - intentionally a no-op.
   *
   * The snapshot is derived from the inspector on each render, so there's no
   * separate "stale" state that needs refreshing. This callback exists for:
   * 1. API symmetry with other hooks that may need explicit refresh
   * 2. Forward compatibility if refresh behavior is added later
   * 3. Consumer code that wants to express "refresh intent" for readability
   *
   * Calling refresh() will not cause a re-render - use component state or
   * inspector subscription changes for that purpose.
   */
  const refresh = useCallback((): void => {
    // Intentional no-op - see JSDoc above
  }, []);

  return {
    snapshot,
    isAvailable: inspector !== null,
    refresh,
  };
}
