/**
 * Hook for accessing the list of registered containers.
 *
 * Uses Option<T> for selection state, enabling exhaustive pattern matching
 * instead of null checks.
 *
 * @packageDocumentation
 */

import { useContext, useMemo } from "react";
import { ContainerRegistryContext, type ContainerEntry } from "../context/container-registry.js";
import { None, type Option } from "../types/adt.js";

/**
 * Result of useContainerList hook.
 *
 * Uses Option<T> for selectedId to enable exhaustive pattern matching.
 */
export interface UseContainerListResult {
  /** All registered containers */
  readonly containers: readonly ContainerEntry[];

  /** Currently selected container ID (Option instead of string | null) */
  readonly selectedId: Option<string>;

  /** Select a container for inspection (accepts Option<string>) */
  readonly selectContainer: (id: Option<string>) => void;

  /** Whether the container registry is available */
  readonly isAvailable: boolean;
}

/**
 * Get all registered containers and selection state.
 *
 * Returns an empty array if ContainerRegistryProvider is not present.
 * Use the `isAvailable` flag to check if the registry is available.
 *
 * @example Container selector dropdown
 * ```typescript
 * import { useContainerList } from "@hex-di/devtools/react";
 *
 * function ContainerSelector() {
 *   const { containers, selectedId, selectContainer, isAvailable } = useContainerList();
 *
 *   if (!isAvailable) {
 *     return <div>Container registry not available</div>;
 *   }
 *
 *   return (
 *     <select
 *       value={selectedId ?? ""}
 *       onChange={(e) => selectContainer(e.target.value || null)}
 *     >
 *       <option value="">Select container...</option>
 *       {containers.map((entry) => (
 *         <option key={entry.id} value={entry.id}>
 *           {entry.label} ({entry.kind})
 *         </option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 *
 * @example Container tree view
 * ```typescript
 * function ContainerTree() {
 *   const { containers, selectedId, selectContainer } = useContainerList();
 *
 *   const rootContainers = containers.filter((c) => c.parentId === null);
 *   const childContainersMap = new Map<string, ContainerEntry[]>();
 *
 *   for (const container of containers) {
 *     if (container.parentId !== null) {
 *       const children = childContainersMap.get(container.parentId) ?? [];
 *       children.push(container);
 *       childContainersMap.set(container.parentId, children);
 *     }
 *   }
 *
 *   return (
 *     <ul>
 *       {rootContainers.map((root) => (
 *         <ContainerTreeNode
 *           key={root.id}
 *           entry={root}
 *           children={childContainersMap.get(root.id) ?? []}
 *           selectedId={selectedId}
 *           onSelect={selectContainer}
 *         />
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useContainerList(): UseContainerListResult {
  const registry = useContext(ContainerRegistryContext);

  return useMemo((): UseContainerListResult => {
    if (registry === null) {
      return {
        containers: [],
        selectedId: None,
        selectContainer: () => {},
        isAvailable: false,
      };
    }

    return {
      containers: Array.from(registry.containers.values()),
      selectedId: registry.selectedId,
      selectContainer: registry.selectContainer,
      isAvailable: true,
    };
  }, [registry]);
}
