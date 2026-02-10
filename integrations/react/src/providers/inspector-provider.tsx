/**
 * InspectorProvider component for @hex-di/react.
 *
 * Provides the InspectorProvider that makes a container inspector
 * available to React components for inspection hooks.
 *
 * @packageDocumentation
 */

import type { ReactNode } from "react";
import type { InspectorAPI } from "@hex-di/core";
import { InspectorContext, type InspectorContextValue } from "../context/inspector-context.js";

// =============================================================================
// InspectorProvider Component
// =============================================================================

/**
 * Props for the InspectorProvider component.
 */
export interface InspectorProviderProps {
  /**
   * The InspectorAPI instance to provide to the React tree.
   *
   * @remarks
   * Typically obtained from `container.inspector` on a created container.
   * The provider does not manage the inspector's lifecycle.
   */
  readonly inspector: InspectorAPI;

  /**
   * React children that will have access to the inspector via hooks.
   */
  readonly children: ReactNode;
}

/**
 * Provider component that makes a container inspector available to React components.
 *
 * InspectorProvider establishes inspection context in React. All inspection hooks
 * (useInspector, useSnapshot, useScopeTree, useUnifiedSnapshot) require an
 * InspectorProvider ancestor.
 *
 * @param props - The provider props including inspector and children
 *
 * @example Basic usage
 * ```tsx
 * import { createContainer } from '@hex-di/runtime';
 * import { InspectorProvider, useSnapshot } from '@hex-di/react';
 *
 * const container = createContainer(graph);
 *
 * function App() {
 *   return (
 *     <InspectorProvider inspector={container.inspector}>
 *       <DebugPanel />
 *     </InspectorProvider>
 *   );
 * }
 *
 * function DebugPanel() {
 *   const snapshot = useSnapshot();
 *   return <pre>{JSON.stringify(snapshot, null, 2)}</pre>;
 * }
 * ```
 */
export function InspectorProvider({ inspector, children }: InspectorProviderProps): ReactNode {
  const contextValue: InspectorContextValue = {
    inspector,
  };

  return <InspectorContext.Provider value={contextValue}>{children}</InspectorContext.Provider>;
}
