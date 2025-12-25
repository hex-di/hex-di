/**
 * Hook for subscribing to container snapshots.
 *
 * @packageDocumentation
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { ContainerSnapshot } from "@hex-di/devtools-core";
import type { InspectorEvent } from "@hex-di/inspector";
import { useInspector } from "./use-inspector.js";

/**
 * Result of useInspectorSnapshot hook.
 */
export interface UseInspectorSnapshotResult {
  /** Current container snapshot, or null if not available */
  readonly snapshot: ContainerSnapshot | null;

  /** Whether the inspector is available */
  readonly isAvailable: boolean;

  /** Force refresh the snapshot */
  readonly refresh: () => void;
}

/**
 * Subscribe to container snapshots with RAF debouncing.
 *
 * This hook subscribes to snapshot-changed events from the InspectorPlugin
 * and automatically updates the snapshot state. Updates are debounced using
 * requestAnimationFrame to prevent excessive re-renders during rapid changes.
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
 *       <p>Container kind: {snapshot.kind}</p>
 *       <p>Disposed: {snapshot.isDisposed ? "Yes" : "No"}</p>
 *       <button onClick={refresh}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example With type narrowing for root container
 * ```typescript
 * function RootContainerInfo() {
 *   const { snapshot } = useInspectorSnapshot();
 *
 *   if (snapshot?.kind !== "root") {
 *     return null;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Initialized: {snapshot.isInitialized ? "Yes" : "No"}</p>
 *       <p>
 *         Async adapters: {snapshot.asyncAdaptersInitialized}/{snapshot.asyncAdaptersTotal}
 *       </p>
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
  const inspector = useInspector();
  const [snapshot, setSnapshot] = useState<ContainerSnapshot | null>(
    () => inspector?.getSnapshot() ?? null
  );
  const rafIdRef = useRef<number | null>(null);

  const refresh = useCallback((): void => {
    if (inspector !== null) {
      setSnapshot(inspector.getSnapshot());
    }
  }, [inspector]);

  useEffect(() => {
    if (inspector === null) {
      setSnapshot(null);
      return;
    }

    // Initial snapshot
    setSnapshot(inspector.getSnapshot());

    // Subscribe to changes
    const unsubscribe = inspector.subscribe((event: InspectorEvent) => {
      if (event.type === "snapshot-changed") {
        // Debounce with RAF to prevent excessive re-renders
        if (rafIdRef.current === null) {
          rafIdRef.current = requestAnimationFrame(() => {
            rafIdRef.current = null;
            setSnapshot(inspector.getSnapshot());
          });
        }
      }
    });

    return () => {
      unsubscribe();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [inspector]);

  return {
    snapshot,
    isAvailable: inspector !== null,
    refresh,
  };
}
