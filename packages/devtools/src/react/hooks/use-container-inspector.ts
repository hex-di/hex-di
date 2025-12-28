/**
 * Hook for accessing a RuntimeInspector for the selected container.
 *
 * Unlike the deprecated useInspector hook (which used shared InspectorAPI),
 * this hook creates a RuntimeInspector for the actual selected container,
 * enabling proper multi-container inspection.
 *
 * @packageDocumentation
 */

import { useContext, useMemo } from "react";
import { createInspector, type ContainerInspector } from "@hex-di/runtime";
import { ContainerRegistryContext } from "../context/container-registry.js";
import { Some, None, isSome, type Option } from "../types/adt.js";

/**
 * Access a RuntimeInspector for the currently selected container.
 *
 * Returns Option<ContainerInspector> for exhaustive pattern matching.
 * Use isSome() to check if a container is selected and access the inspector.
 *
 * This hook creates a fresh RuntimeInspector for the selected container
 * on each call to createInspector(). The inspector provides:
 * - snapshot(): Complete container state snapshot
 * - listPorts(): All registered port names
 * - isResolved(portName): Check if a port has been resolved
 * - getScopeTree(): Hierarchical scope structure
 *
 * @returns Option<ContainerInspector> - Some if container is selected, None otherwise
 *
 * @example Basic usage
 * ```typescript
 * import { useContainerInspector } from "@hex-di/devtools/react";
 * import { isSome } from "@hex-di/devtools/react/types/adt";
 *
 * function InspectorPanel() {
 *   const inspectorOpt = useContainerInspector();
 *
 *   if (!isSome(inspectorOpt)) {
 *     return <div>No container selected</div>;
 *   }
 *
 *   const snapshot = inspectorOpt.value.snapshot();
 *   return (
 *     <div>
 *       <h3>Singletons: {snapshot.singletons.length}</h3>
 *       <ul>
 *         {snapshot.singletons.map((s) => (
 *           <li key={s.portName}>
 *             {s.portName}: {s.isResolved ? "resolved" : "pending"}
 *           </li>
 *         ))}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example With exhaustive matching
 * ```typescript
 * function SnapshotDisplay() {
 *   const inspectorOpt = useContainerInspector();
 *
 *   // Exhaustive pattern matching
 *   switch (inspectorOpt._tag) {
 *     case "Some": {
 *       const snapshot = inspectorOpt.value.snapshot();
 *       return <pre>{JSON.stringify(snapshot, null, 2)}</pre>;
 *     }
 *     case "None":
 *       return <div>Select a container to inspect</div>;
 *   }
 * }
 * ```
 */
export function useContainerInspector(): Option<ContainerInspector> {
  const registry = useContext(ContainerRegistryContext);

  return useMemo(() => {
    if (registry === null) {
      return None;
    }

    if (!isSome(registry.selectedContainer)) {
      return None;
    }

    // Create RuntimeInspector for the actual selected container
    // This is the key fix - each container gets its own inspector
    const inspector = createInspector(registry.selectedContainer.value);
    return Some(inspector);
  }, [registry]);
}

/**
 * Access a RuntimeInspector with guaranteed container selection.
 *
 * Throws if no container is selected. Use when you know a container
 * is always selected, such as in components that are only rendered
 * when inspection is active.
 *
 * @returns ContainerInspector for the selected container
 * @throws Error if no container is selected
 *
 * @example
 * ```typescript
 * function ServiceList() {
 *   // Only rendered when a container is selected
 *   const inspector = useContainerInspectorStrict();
 *   const ports = inspector.listPorts();
 *
 *   return (
 *     <ul>
 *       {ports.map((portName) => (
 *         <li key={portName}>
 *           {portName}: {inspector.isResolved(portName) ? "resolved" : "pending"}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useContainerInspectorStrict(): ContainerInspector {
  const inspectorOpt = useContainerInspector();

  if (!isSome(inspectorOpt)) {
    throw new Error(
      "useContainerInspectorStrict requires a container to be selected. " +
        "Ensure ContainerRegistryProvider is present and a container is registered."
    );
  }

  return inspectorOpt.value;
}
