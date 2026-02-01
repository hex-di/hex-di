/**
 * Hook for accessing a RuntimeInspector for the selected container.
 *
 * These hooks integrate with the DevToolsFlowRuntime to provide access
 * to container inspectors based on the current UI selection state.
 *
 * @packageDocumentation
 */

import type { InspectorAPI } from "@hex-di/core";
import { useDevToolsStore, useDevToolsFlowRuntimeOptional } from "../../store/index.js";

/**
 * Access a RuntimeInspector for the currently selected container.
 *
 * Returns `InspectorAPI | null` for native null checks.
 * Use `!== null` to check if a container is selected and access the inspector.
 *
 * This hook integrates with the DevToolsFlowRuntime to:
 * 1. Get the first selected container ID from UI state
 * 2. Look up the corresponding inspector via `runtime.getInspector()`
 *
 * @returns InspectorAPI if container is selected, null otherwise
 *
 * @example Basic usage
 * ```typescript
 * import { useContainerInspector } from "@hex-di/devtools/react";
 *
 * function InspectorPanel() {
 *   const inspector = useContainerInspector();
 *
 *   if (inspector === null) {
 *     return <div>No container selected</div>;
 *   }
 *
 *   const snapshot = inspector.getSnapshot();
 *   return (
 *     <div>
 *       <h3>{snapshot.containerName}</h3>
 *     </div>
 *   );
 * }
 * ```
 */
export function useContainerInspector(): InspectorAPI | null {
  const selectedIds = useDevToolsStore(state => state.ui.selectedIds);
  const runtime = useDevToolsFlowRuntimeOptional();

  // Get first selected container ID
  const firstSelectedId =
    selectedIds.size > 0 ? (selectedIds.values().next().value as string) : null;

  if (firstSelectedId === null || runtime === null) {
    return null;
  }

  return runtime.getInspector(firstSelectedId);
}

/**
 * Access a RuntimeInspector with guaranteed container selection.
 *
 * Throws if no container is selected or runtime is not available.
 * Use when you know a container is always selected, such as in
 * components that are only rendered when inspection is active.
 *
 * @returns ContainerInspector for the selected container
 * @throws Error if no container is selected or runtime unavailable
 */
export function useContainerInspectorStrict(): InspectorAPI {
  const inspector = useContainerInspector();

  if (inspector === null) {
    throw new Error(
      "useContainerInspectorStrict requires a container to be selected. " +
        "Ensure a container is selected in the DevTools UI and the runtime is available."
    );
  }

  return inspector;
}
