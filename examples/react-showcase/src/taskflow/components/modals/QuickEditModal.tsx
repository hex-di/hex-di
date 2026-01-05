/**
 * QuickEditModal Component
 *
 * A modal for quickly editing task properties:
 * - Title field (editable)
 * - Status dropdown
 * - Priority dropdown
 * - Assignee dropdown
 * - "Open Full View" link
 *
 * Based on wireframe: component-wireframes.md Section 3
 *
 * @packageDocumentation
 */

import * as React from "react";
import { Modal } from "./Modal.js";
import { useUsers } from "../../data/hooks.js";
import type { QuickEditModalProps, QuickEditFormData } from "./types.js";
import type { TaskStatus, TaskPriority } from "../../types.js";

// =============================================================================
// Status and Priority Options
// =============================================================================

const statusOptions: ReadonlyArray<{ readonly value: TaskStatus; readonly label: string }> = [
  { value: "todo", label: "To Do" },
  { value: "in-progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const priorityOptions: ReadonlyArray<{ readonly value: TaskPriority; readonly label: string }> = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

// =============================================================================
// Icons
// =============================================================================

function ExternalLinkIcon({ className = "w-4 h-4" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

function SpinnerIcon({ className = "w-5 h-5" }: { readonly className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// =============================================================================
// QuickEditModal Component
// =============================================================================

/**
 * Modal for quickly editing a task's basic properties.
 *
 * @example
 * ```tsx
 * <QuickEditModal
 *   isOpen={showQuickEdit}
 *   task={selectedTask}
 *   onSave={handleSave}
 *   onCancel={() => setShowQuickEdit(false)}
 *   onOpenFullView={() => navigate(`/tasks/${selectedTask.id}`)}
 * />
 * ```
 */
export function QuickEditModal({
  isOpen,
  task,
  onSave,
  onCancel,
  onOpenFullView,
  isLoading = false,
}: QuickEditModalProps) {
  // Form state
  const [title, setTitle] = React.useState(task.title);
  const [status, setStatus] = React.useState<TaskStatus>(task.status);
  const [priority, setPriority] = React.useState<TaskPriority>(task.priority);
  const [assigneeId, setAssigneeId] = React.useState<string | null>(task.assigneeId);

  // Fetch users for assignee dropdown
  const { data: users = [] } = useUsers();

  // Reset form when task changes
  React.useEffect(() => {
    setTitle(task.title);
    setStatus(task.status);
    setPriority(task.priority);
    setAssigneeId(task.assigneeId);
  }, [task]);

  // Handle form submission
  const handleSubmit = React.useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (isLoading) return;

      const formData: QuickEditFormData = {
        id: task.id,
        title: title.trim(),
        status,
        priority,
        assigneeId,
      };

      onSave(formData);
    },
    [isLoading, task.id, title, status, priority, assigneeId, onSave]
  );

  // Check if form has changes
  const hasChanges =
    title.trim() !== task.title ||
    status !== task.status ||
    priority !== task.priority ||
    assigneeId !== task.assigneeId;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Quick Edit"
      size="md"
      closeOnBackdropClick={!isLoading}
      closeOnEscape={!isLoading}
      testId="quick-edit-modal"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title Field */}
        <div>
          <label
            htmlFor="quick-edit-title"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Title
          </label>
          <input
            id="quick-edit-title"
            type="text"
            data-testid="quick-edit-title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={isLoading}
            className={`
              w-full px-3 py-2 border border-gray-300 rounded-lg
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              disabled:bg-gray-100 disabled:cursor-not-allowed
            `}
            placeholder="Task title..."
            required
          />
        </div>

        {/* Status and Priority Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Status Dropdown */}
          <div>
            <label
              htmlFor="quick-edit-status"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Status
            </label>
            <select
              id="quick-edit-status"
              data-testid="quick-edit-status"
              value={status}
              onChange={e => setStatus(e.target.value as TaskStatus)}
              disabled={isLoading}
              className={`
                w-full px-3 py-2 border border-gray-300 rounded-lg
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                disabled:bg-gray-100 disabled:cursor-not-allowed
              `}
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Dropdown */}
          <div>
            <label
              htmlFor="quick-edit-priority"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Priority
            </label>
            <select
              id="quick-edit-priority"
              data-testid="quick-edit-priority"
              value={priority}
              onChange={e => setPriority(e.target.value as TaskPriority)}
              disabled={isLoading}
              className={`
                w-full px-3 py-2 border border-gray-300 rounded-lg
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                disabled:bg-gray-100 disabled:cursor-not-allowed
              `}
            >
              {priorityOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Assignee Dropdown */}
        <div>
          <label
            htmlFor="quick-edit-assignee"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Assignee
          </label>
          <select
            id="quick-edit-assignee"
            data-testid="quick-edit-assignee"
            value={assigneeId ?? ""}
            onChange={e => setAssigneeId(e.target.value || null)}
            disabled={isLoading}
            className={`
              w-full px-3 py-2 border border-gray-300 rounded-lg
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              disabled:bg-gray-100 disabled:cursor-not-allowed
            `}
          >
            <option value="">Unassigned</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* Open Full View Link */}
        <button
          type="button"
          data-testid="quick-edit-full-view-link"
          onClick={onOpenFullView}
          disabled={isLoading}
          className={`
            flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          <ExternalLinkIcon className="w-4 h-4" />
          Open Full View
        </button>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            data-testid="quick-edit-cancel-btn"
            onClick={onCancel}
            disabled={isLoading}
            className={`
              flex-1 px-4 py-2 rounded-lg font-medium
              border border-gray-300 bg-white text-gray-700
              hover:bg-gray-50 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            Cancel
          </button>
          <button
            type="submit"
            data-testid="quick-edit-save-btn"
            disabled={isLoading || !hasChanges || !title.trim()}
            className={`
              flex-1 px-4 py-2 rounded-lg font-medium
              bg-blue-600 hover:bg-blue-700 text-white
              transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2
            `}
          >
            {isLoading && <SpinnerIcon className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
}
