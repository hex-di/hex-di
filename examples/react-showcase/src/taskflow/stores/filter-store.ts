/**
 * Filter State Zustand Store
 *
 * Manages filter state for the task list including:
 * - Status filter (all, todo, in-progress, done)
 * - Priority filter (all, high, medium, low)
 * - Project filter (project ID or all)
 * - Pagination (page, pageSize)
 *
 * This store is intentionally not persisted to localStorage as filters
 * are typically session-specific and should reset between sessions.
 *
 * @packageDocumentation
 */

import { createStore } from "zustand/vanilla";
import type { TaskFilterState, TaskStatus, TaskPriority } from "../types.js";
import { DEFAULT_FILTERS } from "../types.js";

// =============================================================================
// State and Actions Types
// =============================================================================

/**
 * Actions available on the filter store.
 */
export interface FilterActions {
  /** Set the status filter */
  setStatus: (status: TaskStatus | "all") => void;
  /** Set the priority filter */
  setPriority: (priority: TaskPriority | "all") => void;
  /** Set the project filter */
  setProjectId: (projectId: string | "all") => void;
  /** Set the current page */
  setPage: (page: number) => void;
  /** Set the page size */
  setPageSize: (pageSize: number) => void;
  /** Set multiple filters at once */
  setFilters: (filters: Partial<TaskFilterState>) => void;
  /** Reset all filters to defaults */
  resetFilters: () => void;
}

/**
 * Combined store type for filter state.
 */
export type FilterStore = TaskFilterState & FilterActions;

// =============================================================================
// Store Creation
// =============================================================================

/**
 * Creates a vanilla Zustand store for filter state.
 *
 * This is a "vanilla" store that works without React.
 * It can be used in HexDI adapters and registered with the container.
 *
 * @example
 * ```typescript
 * const store = createFilterStore();
 *
 * // Subscribe to changes
 * store.subscribe((state) => console.log(state.status));
 *
 * // Get current state
 * console.log(store.getState().priority);
 *
 * // Update state
 * store.getState().setStatus('todo');
 * store.getState().setPriority('high');
 * ```
 */
export function createFilterStore() {
  return createStore<FilterStore>(set => ({
    ...DEFAULT_FILTERS,

    setStatus: (status: TaskStatus | "all") => {
      set({ status, page: 1 }); // Reset to page 1 when filter changes
    },

    setPriority: (priority: TaskPriority | "all") => {
      set({ priority, page: 1 }); // Reset to page 1 when filter changes
    },

    setProjectId: (projectId: string | "all") => {
      set({ projectId, page: 1 }); // Reset to page 1 when filter changes
    },

    setPage: (page: number) => {
      set({ page: Math.max(1, page) });
    },

    setPageSize: (pageSize: number) => {
      set({
        pageSize: Math.max(5, Math.min(100, pageSize)),
        page: 1, // Reset to page 1 when page size changes
      });
    },

    setFilters: (filters: Partial<TaskFilterState>) => {
      set(state => ({
        ...state,
        ...filters,
        // Reset page if any filter other than page is changed
        page: filters.page ?? (Object.keys(filters).length > 0 ? 1 : state.page),
      }));
    },

    resetFilters: () => {
      set(DEFAULT_FILTERS);
    },
  }));
}

/**
 * Type for the store instance.
 */
export type FilterStoreInstance = ReturnType<typeof createFilterStore>;
