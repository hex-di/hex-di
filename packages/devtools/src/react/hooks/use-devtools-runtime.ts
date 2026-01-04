/**
 * useDevToolsSnapshot Hook
 *
 * Returns the full DevToolsSnapshot using useSyncExternalStore for
 * React 18 compatibility. This is the primary hook for accessing
 * DevTools state.
 *
 * @packageDocumentation
 */

import { useCallback, useSyncExternalStore } from "react";
import { useRuntimeFromStoreContext } from "../../store/index.js";
import type { DevToolsSnapshot } from "../../runtime/devtools-snapshot.js";

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook to subscribe to the full DevToolsSnapshot using useSyncExternalStore.
 *
 * Returns the complete DevToolsSnapshot containing UI, Tracing, and ContainerTree
 * machine states. Re-renders the component whenever any part of the snapshot changes.
 *
 * For selective subscriptions that only re-render when specific values change,
 * use `useDevToolsSelector()` instead.
 *
 * @returns The current DevToolsSnapshot
 * @throws Error if used outside DevToolsStoreProvider
 *
 * @example
 * ```tsx
 * function DevToolsPanel() {
 *   const snapshot = useDevToolsSnapshot();
 *
 *   return (
 *     <div>
 *       <div>UI State: {snapshot.ui.state}</div>
 *       <div>Active Tab: {snapshot.ui.context.activeTab}</div>
 *       <div>Tracing: {snapshot.tracing.state}</div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useDevToolsSnapshot(): DevToolsSnapshot {
  // Get runtime from store context (consolidated - no separate DevToolsContext)
  const runtime = useRuntimeFromStoreContext();

  // Stable getSnapshot callback
  const getSnapshot = useCallback((): DevToolsSnapshot => {
    return runtime.getSnapshot() as DevToolsSnapshot;
  }, [runtime]);

  // Server snapshot returns the same as client for now
  const getServerSnapshot = useCallback((): DevToolsSnapshot => {
    return runtime.getSnapshot() as DevToolsSnapshot;
  }, [runtime]);

  // Use useSyncExternalStore for proper concurrent rendering support
  return useSyncExternalStore(runtime.subscribe, getSnapshot, getServerSnapshot);
}

/**
 * @deprecated Use `useDevToolsSnapshot()` instead. This alias exists for backward compatibility.
 */
export const useDevToolsRuntime = useDevToolsSnapshot;
