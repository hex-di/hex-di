/**
 * Hook for accessing a RuntimeInspector for the selected container.
 *
 * Note: These hooks require a container discovery mechanism to be configured.
 * In the current simplified architecture, they return null/throw as no
 * container discovery is active by default.
 *
 * @packageDocumentation
 */

import type { InspectorWithSubscription } from "@hex-di/runtime";

/**
 * Access a RuntimeInspector for the currently selected container.
 *
 * Returns `InspectorWithSubscription | null` for native null checks.
 * Use `!== null` to check if a container is selected and access the inspector.
 *
 * Note: This hook requires a container discovery mechanism to be active.
 * In the current simplified architecture, it returns null as no container
 * discovery is configured by default.
 *
 * @returns InspectorWithSubscription if container is selected, null otherwise
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
export function useContainerInspector(): InspectorWithSubscription | null {
  // Container discovery has been removed in the current architecture refactor.
  // This hook returns null until container discovery is reimplemented.
  return null;
}

/**
 * Access a RuntimeInspector with guaranteed container selection.
 *
 * Throws if no container is selected. Use when you know a container
 * is always selected, such as in components that are only rendered
 * when inspection is active.
 *
 * Note: This hook requires a container discovery mechanism to be active.
 * In the current simplified architecture, it always throws as no container
 * discovery is configured by default.
 *
 * @returns ContainerInspector for the selected container
 * @throws Error if no container is selected
 */
export function useContainerInspectorStrict(): InspectorWithSubscription {
  const inspector = useContainerInspector();

  if (inspector === null) {
    throw new Error(
      "useContainerInspectorStrict requires a container to be selected. " +
        "Container discovery is not currently configured."
    );
  }

  return inspector;
}
