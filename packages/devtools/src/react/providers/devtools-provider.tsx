/**
 * DevToolsProvider
 *
 * @deprecated Use `DevToolsStoreProvider` instead. This provider only provides
 * the raw DevToolsContext without the Zustand store integration. Most hooks
 * now require `DevToolsStoreProvider` to function properly.
 *
 * This provider is kept for advanced use cases where direct FSM runtime access
 * is needed without the Zustand store layer. However, standard DevTools hooks
 * like `useDevToolsSnapshot()`, `useDevToolsSelector()`, and `useDevToolsDispatch()`
 * will NOT work with this provider alone.
 *
 * @packageDocumentation
 */

import React from "react";
import type { ReactNode, ReactElement } from "react";
import { DevToolsContext, type DevToolsFlowRuntimeLike } from "../context/devtools-context.js";

// =============================================================================
// Props Definition
// =============================================================================

/**
 * Props for the DevToolsProvider component.
 */
export interface DevToolsProviderProps {
  /**
   * The DevToolsFlowRuntime instance.
   *
   * Created using `createDevToolsFlowRuntime()` at the composition root.
   * The runtime coordinates three FlowService instances and provides
   * unified subscribe/getSnapshot/dispatch API.
   */
  readonly runtime: DevToolsFlowRuntimeLike;

  /**
   * Child components that will have access to the runtime via hooks.
   */
  readonly children?: ReactNode;
}

// =============================================================================
// Provider Component
// =============================================================================

/**
 * Provider component that makes the DevToolsFlowRuntime available to children.
 *
 * @deprecated Use `DevToolsStoreProvider` instead for standard DevTools usage.
 *
 * This provider only provides raw `DevToolsContext`. The standard DevTools hooks
 * (`useDevToolsSnapshot`, `useDevToolsSelector`, `useDevToolsDispatch`) require
 * `DevToolsStoreProvider` which includes the Zustand store integration.
 *
 * This provider is kept for advanced use cases where you need direct FSM runtime
 * access without the Zustand store layer.
 *
 * @example
 * ```tsx
 * // Recommended: Use DevToolsStoreProvider instead
 * import { DevToolsStoreProvider } from "@hex-di/devtools";
 *
 * function App() {
 *   const inspector = container[INSPECTOR];
 *   return (
 *     <DevToolsStoreProvider inspector={inspector}>
 *       <HexDiDevTools />
 *     </DevToolsStoreProvider>
 *   );
 * }
 * ```
 */
export function DevToolsProvider({ runtime, children }: DevToolsProviderProps): ReactElement {
  return <DevToolsContext.Provider value={runtime}>{children}</DevToolsContext.Provider>;
}
