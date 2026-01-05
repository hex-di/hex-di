/**
 * DashboardPage Component
 *
 * Main dashboard view for the TaskFlow application.
 *
 * Features:
 * - StatsCards displaying task counts
 * - FilterBar for filtering tasks
 * - TaskList with pagination
 * - URL query param sync for filters
 * - Integration with React Query hooks
 *
 * @packageDocumentation
 */

import { useState, useCallback, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { StatsCards } from "../components/dashboard/StatsCards.js";
import { FilterBar } from "../components/dashboard/FilterBar.js";
import { TaskList } from "../components/dashboard/TaskList.js";
import type { TaskFilterState, TaskStatus, TaskPriority, Task } from "../types.js";
import { DEFAULT_FILTERS } from "../types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Parse URL search params to filter state.
 */
function parseFiltersFromParams(searchParams: URLSearchParams): TaskFilterState {
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const projectId = searchParams.get("projectId");
  const page = searchParams.get("page");
  const pageSize = searchParams.get("pageSize");

  return {
    status: (status ?? "all") as TaskStatus | "all",
    priority: (priority ?? "all") as TaskPriority | "all",
    projectId: projectId ?? "all",
    page: page ? parseInt(page, 10) : DEFAULT_FILTERS.page,
    pageSize: pageSize ? parseInt(pageSize, 10) : DEFAULT_FILTERS.pageSize,
  };
}

/**
 * Convert filter state to URL search params.
 */
function filtersToParams(filters: TaskFilterState): Record<string, string> {
  const params: Record<string, string> = {};

  if (filters.status !== "all") params.status = filters.status;
  if (filters.priority !== "all") params.priority = filters.priority;
  if (filters.projectId !== "all") params.projectId = filters.projectId;
  if (filters.page !== DEFAULT_FILTERS.page) params.page = String(filters.page);
  if (filters.pageSize !== DEFAULT_FILTERS.pageSize) params.pageSize = String(filters.pageSize);

  return params;
}

// =============================================================================
// Icons
// =============================================================================

function PlusIcon({ className = "w-5 h-5" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

// =============================================================================
// DashboardPage Component
// =============================================================================

/**
 * Dashboard page displaying task statistics, filters, and task list.
 *
 * Syncs filter state with URL query params for shareable links.
 *
 * @example
 * ```tsx
 * // In routes.tsx:
 * {
 *   path: "/",
 *   element: <DashboardPage />,
 * }
 * ```
 */
export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Parse initial filters from URL
  const [filters, setFilters] = useState<TaskFilterState>(() =>
    parseFiltersFromParams(searchParams)
  );

  // Sync URL params when filters change
  useEffect(() => {
    const newParams = filtersToParams(filters);
    setSearchParams(newParams, { replace: true });
  }, [filters, setSearchParams]);

  // Handle filter changes
  const handleFiltersChange = useCallback((updates: Partial<TaskFilterState>) => {
    setFilters(prev => ({
      ...prev,
      ...updates,
      // Reset to page 1 when filter criteria change (not pagination)
      page:
        updates.page !== undefined
          ? updates.page
          : updates.status !== undefined ||
              updates.priority !== undefined ||
              updates.projectId !== undefined
            ? 1
            : prev.page,
    }));
  }, []);

  // Handle task click - navigate to task detail
  const handleTaskClick = useCallback(
    (task: Task) => {
      navigate(`/tasks/${task.id}`);
    },
    [navigate]
  );

  // Handle create task - navigate to new task form
  const handleCreateTask = useCallback(() => {
    navigate("/tasks/new");
  }, [navigate]);

  // Handle task edit (placeholder - would open modal in full implementation)
  const handleTaskEdit = useCallback((task: Task) => {
    // TODO: Open edit modal
    console.log("Edit task:", task.id);
  }, []);

  // Handle task archive (placeholder)
  const handleTaskArchive = useCallback((task: Task) => {
    // TODO: Confirm and archive
    console.log("Archive task:", task.id);
  }, []);

  // Handle task delete (placeholder - would open confirmation in full implementation)
  const handleTaskDelete = useCallback((task: Task) => {
    // TODO: Open delete confirmation modal
    console.log("Delete task:", task.id);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your tasks and track progress</p>
        </div>
        <button
          onClick={handleCreateTask}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <PlusIcon className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Stats Cards */}
      <StatsCards />

      {/* Filter Bar */}
      <FilterBar filters={filters} onFiltersChange={handleFiltersChange} />

      {/* Task List with Pagination */}
      <TaskList
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onTaskClick={handleTaskClick}
        onTaskEdit={handleTaskEdit}
        onTaskArchive={handleTaskArchive}
        onTaskDelete={handleTaskDelete}
        onCreateTask={handleCreateTask}
      />
    </div>
  );
}
