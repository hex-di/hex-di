/**
 * TaskList Component
 *
 * Displays a paginated list of TaskCard components with:
 * - Loading skeleton state
 * - Error state with retry
 * - Empty state with CTA
 * - Integrated pagination
 *
 * Uses the useTaskList hook for data fetching.
 *
 * @packageDocumentation
 */

import { useCallback } from "react";
import { useTaskList, useToggleTaskComplete } from "../../data/hooks.js";
import type { Task, TaskFilterState } from "../../types.js";
import { TaskCard, TaskCardSkeleton } from "./TaskCard.js";
import { Pagination } from "./Pagination.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the TaskList component.
 */
export interface TaskListProps {
  /** Current filter state */
  readonly filters: TaskFilterState;
  /** Callback when filters change (for pagination) */
  readonly onFiltersChange?: (filters: Partial<TaskFilterState>) => void;
  /** Callback when a task is clicked */
  readonly onTaskClick?: (task: Task) => void;
  /** Callback when edit is requested */
  readonly onTaskEdit?: (task: Task) => void;
  /** Callback when archive is requested */
  readonly onTaskArchive?: (task: Task) => void;
  /** Callback when delete is requested */
  readonly onTaskDelete?: (task: Task) => void;
  /** Callback to create a new task (for empty state CTA) */
  readonly onCreateTask?: () => void;
}

// =============================================================================
// Icons
// =============================================================================

function ClipboardIcon({ className = "w-12 h-12" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
      />
    </svg>
  );
}

function PlusIcon({ className = "w-5 h-5" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function RefreshIcon({ className = "w-5 h-5" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function TaskListSkeleton() {
  return (
    <div className="space-y-3">
      <TaskCardSkeleton />
      <TaskCardSkeleton />
      <TaskCardSkeleton />
      <TaskCardSkeleton />
      <TaskCardSkeleton />
    </div>
  );
}

// =============================================================================
// Empty State
// =============================================================================

interface EmptyStateProps {
  readonly hasFilters: boolean;
  readonly onCreateTask?: () => void;
  readonly onClearFilters?: () => void;
}

function EmptyState({ hasFilters, onCreateTask, onClearFilters }: EmptyStateProps) {
  return (
    <div
      data-testid="task-list-empty"
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      <div className="p-4 bg-gray-100 rounded-full mb-4">
        <ClipboardIcon className="w-12 h-12 text-gray-400" />
      </div>

      <h3 className="text-lg font-medium text-gray-900 mb-1">
        {hasFilters ? "No tasks found" : "No tasks yet"}
      </h3>

      <p className="text-sm text-gray-500 mb-6 max-w-sm">
        {hasFilters
          ? "Try adjusting your filters or create a new task"
          : "Create your first task to get started"}
      </p>

      <div className="flex items-center gap-3">
        {hasFilters && onClearFilters && (
          <button
            onClick={onClearFilters}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear Filters
          </button>
        )}

        {onCreateTask && (
          <button
            onClick={onCreateTask}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            <span>{hasFilters ? "Create Task" : "Create First Task"}</span>
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Error State
// =============================================================================

interface ErrorStateProps {
  readonly error: Error;
  readonly onRetry: () => void;
}

function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div
      data-testid="task-list-error"
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      <div className="p-4 bg-red-100 rounded-full mb-4">
        <svg
          className="w-12 h-12 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <h3 className="text-lg font-medium text-gray-900 mb-1">Failed to load tasks</h3>

      <p className="text-sm text-gray-500 mb-2">{error.message}</p>

      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
      >
        <RefreshIcon className="w-4 h-4" />
        <span>Try again</span>
      </button>
    </div>
  );
}

// =============================================================================
// TaskList Component
// =============================================================================

/**
 * Paginated list of task cards with loading, error, and empty states.
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const [filters, setFilters] = useState(DEFAULT_FILTERS);
 *
 *   return (
 *     <TaskList
 *       filters={filters}
 *       onFiltersChange={(updates) => setFilters(prev => ({ ...prev, ...updates }))}
 *       onTaskClick={(task) => navigate(`/tasks/${task.id}`)}
 *       onCreateTask={() => navigate('/tasks/new')}
 *     />
 *   );
 * }
 * ```
 */
export function TaskList({
  filters,
  onFiltersChange,
  onTaskClick,
  onTaskEdit,
  onTaskArchive,
  onTaskDelete,
  onCreateTask,
}: TaskListProps) {
  const { data, isLoading, error, refetch } = useTaskList({ filters });
  const toggleMutation = useToggleTaskComplete();

  const handleToggleComplete = useCallback(
    (task: Task) => {
      toggleMutation.mutate(task.id);
    },
    [toggleMutation]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      onFiltersChange?.({ page });
    },
    [onFiltersChange]
  );

  const handleClearFilters = useCallback(() => {
    onFiltersChange?.({
      status: "all",
      priority: "all",
      projectId: "all",
      page: 1,
    });
  }, [onFiltersChange]);

  // Check if any filters are active
  const hasActiveFilters =
    filters.status !== "all" || filters.priority !== "all" || filters.projectId !== "all";

  // Loading state
  if (isLoading) {
    return <TaskListSkeleton />;
  }

  // Error state
  if (error) {
    return <ErrorState error={error} onRetry={() => refetch()} />;
  }

  // Empty state
  if (!data?.tasks.length) {
    return (
      <EmptyState
        hasFilters={hasActiveFilters}
        onCreateTask={onCreateTask}
        onClearFilters={handleClearFilters}
      />
    );
  }

  // Success state
  return (
    <div data-testid="task-list" className="space-y-4">
      {/* Task Cards */}
      <div className="space-y-3">
        {data.tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={onTaskClick}
            onToggleComplete={handleToggleComplete}
            onEdit={onTaskEdit}
            onArchive={onTaskArchive}
            onDelete={onTaskDelete}
          />
        ))}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={data.page}
        totalPages={data.totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
