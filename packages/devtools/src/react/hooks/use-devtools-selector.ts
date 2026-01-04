/**
 * useDevToolsSelector Hook
 *
 * Subscribes to a selected slice of the DevToolsSnapshot with ref-based
 * memoization to prevent unnecessary re-renders.
 *
 * @packageDocumentation
 */

import { useCallback, useRef, useSyncExternalStore } from "react";
import { useRuntimeFromStoreContext } from "../../store/index.js";
import type { DevToolsSnapshot } from "../../runtime/devtools-snapshot.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Selector function type for DevToolsSnapshot.
 */
export type DevToolsSnapshotSelector<T> = (snapshot: DevToolsSnapshot) => T;

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook to subscribe to a selected slice of the DevToolsSnapshot.
 *
 * Uses useSyncExternalStore internally with ref-based memoization to prevent
 * re-renders when the selected value hasn't changed. The selector
 * should be stable (defined outside the component or memoized).
 *
 * @typeParam T - The return type of the selector
 * @param selector - Function that extracts a slice of the snapshot
 * @returns The selected value
 * @throws Error if used outside DevToolsStoreProvider
 *
 * @example
 * ```tsx
 * // Define selector outside component for stability
 * const selectActiveTab = (snapshot: DevToolsSnapshot) => snapshot.ui.context.activeTab;
 *
 * function TabIndicator() {
 *   const activeTab = useDevToolsSelector(selectActiveTab);
 *
 *   return <div>Active: {activeTab}</div>;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Select multiple values with an object selector
 * const selectUIInfo = (snapshot: DevToolsSnapshot) => ({
 *   isOpen: snapshot.ui.state === 'open',
 *   tab: snapshot.ui.context.activeTab,
 * });
 *
 * function UIStatus() {
 *   // Note: Object selectors create new references each time
 *   // Consider using useMemo for the selector if this is a concern
 *   const { isOpen, tab } = useDevToolsSelector(selectUIInfo);
 *
 *   return <div>{isOpen ? `Open: ${tab}` : 'Closed'}</div>;
 * }
 * ```
 */
export function useDevToolsSelector<T>(selector: DevToolsSnapshotSelector<T>): T {
  // Get runtime from store context (consolidated - no separate DevToolsContext)
  const runtime = useRuntimeFromStoreContext();

  // Cache the previous selected value for reference equality checks
  const previousValueRef = useRef<{ hasValue: false } | { hasValue: true; value: T }>({
    hasValue: false,
  });

  // Create a memoized getSnapshot that applies the selector
  // and returns a stable reference when the selected value hasn't changed
  const getSnapshot = useCallback((): T => {
    const snapshot = runtime.getSnapshot() as DevToolsSnapshot;
    const nextValue = selector(snapshot);

    // Return previous value if it's equal (using Object.is for primitives)
    // This prevents unnecessary re-renders for primitive values
    if (previousValueRef.current.hasValue && Object.is(previousValueRef.current.value, nextValue)) {
      return previousValueRef.current.value;
    }

    // Update cache and return new value
    previousValueRef.current = { hasValue: true, value: nextValue };
    return nextValue;
  }, [runtime, selector]);

  // Server snapshot uses the same selector logic
  const getServerSnapshot = useCallback((): T => {
    const snapshot = runtime.getSnapshot() as DevToolsSnapshot;
    return selector(snapshot);
  }, [runtime, selector]);

  // Bind subscribe to runtime to preserve `this` context when called by useSyncExternalStore
  return useSyncExternalStore(
    callback => runtime.subscribe(callback),
    getSnapshot,
    getServerSnapshot
  );
}
