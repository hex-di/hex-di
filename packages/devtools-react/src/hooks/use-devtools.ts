/**
 * useDevTools - Main hook for DevTools access.
 *
 * Provides convenient access to DevTools state and actions.
 *
 * @packageDocumentation
 */

import { useDevToolsContext } from "../context/devtools-context.js";

/**
 * Hook to access DevTools functionality.
 *
 * This is an alias for useDevToolsContext for convenience.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { state, setActiveTab, viewModels } = useDevTools();
 *
 *   return (
 *     <div>
 *       <p>Active tab: {state.panel.activeTab}</p>
 *       <button onClick={() => setActiveTab('graph')}>
 *         Go to Graph
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useDevTools() {
  return useDevToolsContext();
}
