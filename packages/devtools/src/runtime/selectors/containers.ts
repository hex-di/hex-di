/**
 * Container Selectors
 *
 * Selectors for deriving container selection state from the runtime.
 * These selectors support multi-container DevTools scenarios.
 *
 * @packageDocumentation
 */

import type { DevToolsRuntimeState } from "../types.js";
import { createSelector } from "./utils.js";

/**
 * Selects the set of selected container IDs.
 *
 * Returns the selectedContainerIds set directly from state.
 * This is the source of truth for which containers are currently
 * selected in the DevTools multi-container selector.
 *
 * @example
 * ```typescript
 * const selected = selectSelectedContainers(state);
 * console.log(`${selected.size} containers selected`);
 * ```
 *
 * @param state - Current runtime state
 * @returns ReadonlySet of selected container IDs
 */
export const selectSelectedContainers = createSelector(
  (state: DevToolsRuntimeState): ReadonlySet<string> => state.selectedContainerIds
);

/**
 * Checks if a specific container is selected.
 *
 * This is a convenience selector for checking if a single container
 * is in the selection set. Useful for conditional styling or behavior.
 *
 * @example
 * ```typescript
 * if (selectIsContainerSelected(state, containerId)) {
 *   // Container is selected, show in graph
 * }
 * ```
 *
 * @param state - Current runtime state
 * @param id - Container ID to check
 * @returns true if the container is selected
 */
export function selectIsContainerSelected(state: DevToolsRuntimeState, id: string): boolean {
  return state.selectedContainerIds.has(id);
}

/**
 * Selects the number of selected containers.
 *
 * Useful for displaying selection count or determining if
 * any containers are selected.
 *
 * @example
 * ```typescript
 * const count = selectSelectedContainerCount(state);
 * if (count === 0) {
 *   showEmptyState();
 * }
 * ```
 *
 * @param state - Current runtime state
 * @returns Number of selected containers
 */
export const selectSelectedContainerCount = createSelector(
  (state: DevToolsRuntimeState): number => state.selectedContainerIds.size
);

/**
 * Selects whether any containers are selected.
 *
 * Convenience selector for empty state checks.
 *
 * @example
 * ```typescript
 * if (!selectHasSelectedContainers(state)) {
 *   return <EmptyState />;
 * }
 * ```
 *
 * @param state - Current runtime state
 * @returns true if at least one container is selected
 */
export const selectHasSelectedContainers = createSelector(
  (state: DevToolsRuntimeState): boolean => state.selectedContainerIds.size > 0
);
