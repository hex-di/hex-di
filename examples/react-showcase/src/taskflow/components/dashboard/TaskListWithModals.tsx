/**
 * TaskListWithModals Component
 *
 * A connected TaskList component that integrates modal flows:
 * - Delete task triggers confirmation modal
 * - Archive task triggers confirmation modal
 * - Edit button triggers quick edit modal
 * - Mutation success triggers notification modal
 *
 * @packageDocumentation
 */

import * as React from "react";
import { TaskList } from "./TaskList.js";
import { useModal, QuickEditModal } from "../modals/index.js";
import { useDeleteTask, useUpdateTask } from "../../data/hooks.js";
import type { Task, TaskFilterState } from "../../types.js";
import type { QuickEditFormData } from "../modals/types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the TaskListWithModals component.
 */
export interface TaskListWithModalsProps {
  /** Current filter state */
  readonly filters: TaskFilterState;
  /** Callback when filters change (for pagination) */
  readonly onFiltersChange?: (filters: Partial<TaskFilterState>) => void;
  /** Callback when a task is clicked (for navigation) */
  readonly onTaskClick?: (task: Task) => void;
  /** Callback to navigate to task detail (for quick edit full view) */
  readonly onNavigateToTask?: (taskId: string) => void;
  /** Callback to create a new task (for empty state CTA) */
  readonly onCreateTask?: () => void;
}

// =============================================================================
// TaskListWithModals Component
// =============================================================================

/**
 * TaskList with integrated modal flows for task actions.
 *
 * Automatically handles:
 * - Delete confirmation with notification on success
 * - Archive confirmation with notification on success
 * - Quick edit modal with notification on success
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const [filters, setFilters] = useState(DEFAULT_FILTERS);
 *   const navigate = useNavigate();
 *
 *   return (
 *     <ModalProvider>
 *       <TaskListWithModals
 *         filters={filters}
 *         onFiltersChange={(updates) => setFilters(prev => ({ ...prev, ...updates }))}
 *         onTaskClick={(task) => navigate(`/tasks/${task.id}`)}
 *         onNavigateToTask={(id) => navigate(`/tasks/${id}`)}
 *         onCreateTask={() => navigate('/tasks/new')}
 *       />
 *     </ModalProvider>
 *   );
 * }
 * ```
 */
export function TaskListWithModals({
  filters,
  onFiltersChange,
  onTaskClick,
  onNavigateToTask,
  onCreateTask,
}: TaskListWithModalsProps) {
  const { openConfirmation, showNotification } = useModal();
  const deleteMutation = useDeleteTask();
  const updateMutation = useUpdateTask();

  // Local state for quick edit modal
  const [quickEditTask, setQuickEditTask] = React.useState<Task | null>(null);

  // Handle delete task with confirmation modal
  const handleDeleteTask = React.useCallback(
    (task: Task) => {
      openConfirmation({
        title: "Delete Task",
        message: "Are you sure you want to delete this task?",
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
        variant: "danger",
        itemPreview: {
          name: task.title,
          description: task.dueDate ? `Due: ${task.dueDate.toLocaleDateString()}` : undefined,
        },
        onConfirm: () => {
          deleteMutation.mutate(task.id, {
            onSuccess: () => {
              showNotification({
                title: "Task Deleted",
                message: `"${task.title}" has been deleted successfully.`,
                variant: "success",
                autoDismissMs: 5000,
              });
            },
            onError: error => {
              showNotification({
                title: "Delete Failed",
                message: error.message,
                variant: "error",
              });
            },
          });
        },
        onCancel: () => {},
      });
    },
    [openConfirmation, deleteMutation, showNotification]
  );

  // Handle archive task with confirmation modal
  const handleArchiveTask = React.useCallback(
    (task: Task) => {
      openConfirmation({
        title: "Archive Task",
        message:
          "Archive this task? It will be hidden from the main view but can be restored later.",
        confirmLabel: "Archive",
        cancelLabel: "Cancel",
        variant: "warning",
        itemPreview: {
          name: task.title,
          description: `Status: ${task.status} | Priority: ${task.priority}`,
        },
        onConfirm: () => {
          // For now, we'll simulate archiving by updating the task
          // In a real app, there would be an archive-specific mutation
          updateMutation.mutate(
            {
              id: task.id,
              status: "done", // Simulate archiving
            },
            {
              onSuccess: () => {
                showNotification({
                  title: "Task Archived",
                  message: `"${task.title}" has been archived.`,
                  variant: "success",
                  autoDismissMs: 5000,
                  undoAction: () => {
                    // Restore the original status
                    updateMutation.mutate({
                      id: task.id,
                      status: task.status,
                    });
                  },
                });
              },
              onError: error => {
                showNotification({
                  title: "Archive Failed",
                  message: error.message,
                  variant: "error",
                });
              },
            }
          );
        },
        onCancel: () => {},
      });
    },
    [openConfirmation, updateMutation, showNotification]
  );

  // Handle edit task - open quick edit modal
  const handleEditTask = React.useCallback((task: Task) => {
    setQuickEditTask(task);
  }, []);

  // Handle quick edit save
  const handleQuickEditSave = React.useCallback(
    (data: QuickEditFormData) => {
      updateMutation.mutate(
        {
          id: data.id,
          title: data.title,
          status: data.status,
          priority: data.priority,
          assigneeId: data.assigneeId,
        },
        {
          onSuccess: updatedTask => {
            setQuickEditTask(null);
            showNotification({
              title: "Task Updated",
              message: `"${updatedTask.title}" has been updated.`,
              variant: "success",
              autoDismissMs: 3000,
            });
          },
          onError: error => {
            showNotification({
              title: "Update Failed",
              message: error.message,
              variant: "error",
            });
          },
        }
      );
    },
    [updateMutation, showNotification]
  );

  // Handle quick edit cancel
  const handleQuickEditCancel = React.useCallback(() => {
    setQuickEditTask(null);
  }, []);

  // Handle open full view from quick edit
  const handleOpenFullView = React.useCallback(() => {
    if (quickEditTask && onNavigateToTask) {
      setQuickEditTask(null);
      onNavigateToTask(quickEditTask.id);
    }
  }, [quickEditTask, onNavigateToTask]);

  return (
    <>
      <TaskList
        filters={filters}
        onFiltersChange={onFiltersChange}
        onTaskClick={onTaskClick}
        onTaskEdit={handleEditTask}
        onTaskArchive={handleArchiveTask}
        onTaskDelete={handleDeleteTask}
        onCreateTask={onCreateTask}
      />

      {/* Quick Edit Modal */}
      {quickEditTask && (
        <QuickEditModal
          isOpen={true}
          task={quickEditTask}
          onSave={handleQuickEditSave}
          onCancel={handleQuickEditCancel}
          onOpenFullView={handleOpenFullView}
          isLoading={updateMutation.isPending}
        />
      )}
    </>
  );
}
