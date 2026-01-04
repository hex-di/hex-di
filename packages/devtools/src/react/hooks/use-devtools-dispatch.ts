/**
 * useDevToolsDispatch Hook
 *
 * Returns a stable dispatch function for sending events to the DevToolsFlowRuntime.
 * Uses useCallback to ensure referential stability across re-renders.
 *
 * @packageDocumentation
 */

import { useCallback } from "react";
import { useRuntimeFromStoreContext } from "../../store/index.js";
import type { DevToolsFlowEvent } from "../../runtime/devtools-snapshot.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Dispatch function type for DevTools events.
 */
export type DevToolsDispatch = (event: DevToolsFlowEvent) => void;

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook to get a stable dispatch function for the DevToolsFlowRuntime.
 *
 * Returns a memoized dispatch function that is referentially stable
 * across re-renders. Use this to dispatch DevToolsFlowEvents to the runtime.
 *
 * @returns A stable dispatch function
 * @throws Error if used outside DevToolsStoreProvider
 *
 * @example
 * ```tsx
 * function DevToolsControls() {
 *   const dispatch = useDevToolsDispatch();
 *
 *   const handleOpen = () => {
 *     dispatch({ type: 'UI.OPEN' });
 *   };
 *
 *   const handleSelectTab = (tab: string) => {
 *     dispatch({ type: 'UI.SELECT_TAB', payload: { tab } });
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleOpen}>Open DevTools</button>
 *       <button onClick={() => handleSelectTab('services')}>Services Tab</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Dispatching tracing events
 * function TracingControls() {
 *   const dispatch = useDevToolsDispatch();
 *
 *   return (
 *     <div>
 *       <button onClick={() => dispatch({ type: 'TRACING.START' })}>
 *         Start Tracing
 *       </button>
 *       <button onClick={() => dispatch({ type: 'TRACING.PAUSE' })}>
 *         Pause
 *       </button>
 *       <button onClick={() => dispatch({ type: 'TRACING.CLEAR' })}>
 *         Clear Traces
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useDevToolsDispatch(): DevToolsDispatch {
  // Get runtime from store context (consolidated - no separate DevToolsContext)
  const runtime = useRuntimeFromStoreContext();

  // Return a stable reference to the dispatch function
  // The runtime.dispatch is already stable, but we wrap it to ensure
  // consistent behavior and type-safe event handling
  const dispatch = useCallback(
    (event: DevToolsFlowEvent): void => {
      runtime.dispatch(event);
    },
    [runtime]
  );

  return dispatch;
}
