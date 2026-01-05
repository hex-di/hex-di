/**
 * TaskCard Component
 *
 * Displays a single task in the task list with:
 * - Checkbox for completion toggle
 * - Title and metadata (project, due date, assignee)
 * - Priority indicator
 * - Action buttons on hover (edit, archive, delete)
 *
 * States:
 * - Default: Normal display
 * - Hover: Shows action buttons
 * - Selected: Highlighted border
 * - Completed: Strikethrough title, grayed appearance
 *
 * @packageDocumentation
 */

import { useState, useCallback } from "react";
import type { Task } from "../../types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the TaskCard component.
 */
export interface TaskCardProps {
  /** The task to display */
  readonly task: Task;
  /** Callback when task is clicked */
  readonly onClick?: (task: Task) => void;
  /** Callback when checkbox is toggled */
  readonly onToggleComplete?: (task: Task) => void;
  /** Callback when edit is clicked */
  readonly onEdit?: (task: Task) => void;
  /** Callback when archive is clicked */
  readonly onArchive?: (task: Task) => void;
  /** Callback when delete is clicked */
  readonly onDelete?: (task: Task) => void;
  /** Whether the card is selected */
  readonly isSelected?: boolean;
}

// =============================================================================
// Icons
// =============================================================================

function CheckIcon({ className = "w-4 h-4" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function PencilIcon({ className = "w-4 h-4" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

function ArchiveIcon({ className = "w-4 h-4" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
      />
    </svg>
  );
}

function TrashIcon({ className = "w-4 h-4" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

// =============================================================================
// Priority Badge
// =============================================================================

const priorityStyles = {
  high: {
    bg: "bg-red-100",
    text: "text-red-700",
    label: "High",
    icon: "!",
  },
  medium: {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    label: "Medium",
    icon: "~",
  },
  low: {
    bg: "bg-gray-100",
    text: "text-gray-600",
    label: "Low",
    icon: "-",
  },
} as const;

function PriorityBadge({ priority }: { readonly priority: Task["priority"] }) {
  const styles = priorityStyles[priority];

  return (
    <span
      data-testid="task-card-priority"
      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${styles.bg} ${styles.text}`}
    >
      <span className="mr-1">[{styles.icon}]</span>
      {styles.label}
    </span>
  );
}

// =============================================================================
// Date Formatter
// =============================================================================

function formatDueDate(date: Date | null): string {
  if (!date) return "";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffTime = dueDay.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
  if (diffDays <= 7) return `In ${diffDays} days`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getDueDateColor(date: Date | null, status: Task["status"]): string {
  if (!date || status === "done") return "text-gray-500";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dueDay < today) return "text-red-600";
  if (dueDay.getTime() === today.getTime()) return "text-orange-600";
  return "text-gray-500";
}

// =============================================================================
// TaskCard Skeleton
// =============================================================================

export function TaskCardSkeleton() {
  return (
    <div
      data-testid="task-card-skeleton"
      className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg animate-pulse"
    >
      <div className="w-5 h-5 bg-gray-200 rounded" />
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
      <div className="w-16 h-6 bg-gray-200 rounded" />
    </div>
  );
}

// =============================================================================
// TaskCard Component
// =============================================================================

/**
 * Card component for displaying a single task.
 *
 * @example
 * ```tsx
 * <TaskCard
 *   task={task}
 *   onClick={(t) => navigate(`/tasks/${t.id}`)}
 *   onToggleComplete={(t) => toggleMutation.mutate(t.id)}
 *   onEdit={(t) => openEditModal(t)}
 *   onDelete={(t) => openDeleteConfirmation(t)}
 * />
 * ```
 */
export function TaskCard({
  task,
  onClick,
  onToggleComplete,
  onEdit,
  onArchive,
  onDelete,
  isSelected = false,
}: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const isCompleted = task.status === "done";

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // Prevent navigation when clicking on action buttons or checkbox
      if ((e.target as HTMLElement).closest("button")) return;
      onClick?.(task);
    },
    [onClick, task]
  );

  const handleCheckboxClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleComplete?.(task);
    },
    [onToggleComplete, task]
  );

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onEdit?.(task);
    },
    [onEdit, task]
  );

  const handleArchive = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onArchive?.(task);
    },
    [onArchive, task]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete?.(task);
    },
    [onDelete, task]
  );

  return (
    <div
      data-testid={`task-card-${task.id}`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        flex items-start gap-3 p-4 bg-white border rounded-lg cursor-pointer transition-all
        ${isSelected ? "border-blue-500 ring-2 ring-blue-500/20" : "border-gray-200"}
        ${isCompleted ? "completed bg-gray-50" : "hover:shadow-md hover:border-gray-300"}
      `}
    >
      {/* Checkbox */}
      <button
        onClick={handleCheckboxClick}
        className={`
          flex-shrink-0 w-5 h-5 mt-0.5 rounded border-2 transition-colors
          ${
            isCompleted
              ? "bg-green-500 border-green-500 text-white"
              : "border-gray-300 hover:border-blue-500"
          }
        `}
        aria-label={isCompleted ? "Mark as incomplete" : "Mark as complete"}
      >
        {isCompleted && <CheckIcon className="w-4 h-4" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3
          className={`
            text-sm font-medium truncate
            ${isCompleted ? "text-gray-500 line-through" : "text-gray-900"}
          `}
        >
          {task.title}
        </h3>

        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
          {/* Project (placeholder - would need to resolve from ID) */}
          <span className="text-gray-500">
            Project: {task.projectId.replace("proj-", "").toUpperCase()}
          </span>

          {/* Separator */}
          <span className="text-gray-300">|</span>

          {/* Due date */}
          {task.dueDate && (
            <>
              <span className={getDueDateColor(task.dueDate, task.status)}>
                Due: {formatDueDate(task.dueDate)}
              </span>
              <span className="text-gray-300">|</span>
            </>
          )}

          {/* Assignee (placeholder) */}
          {task.assigneeId && (
            <span className="text-gray-500">@{task.assigneeId.replace("user-", "User")}</span>
          )}
        </div>
      </div>

      {/* Priority Badge */}
      <div className="flex-shrink-0">
        <PriorityBadge priority={task.priority} />
      </div>

      {/* Action Buttons (shown on hover) */}
      <div
        data-testid="task-actions"
        className={`
          flex items-center gap-1 transition-opacity
          ${isHovered ? "opacity-100" : "opacity-0"}
        `}
      >
        <button
          onClick={handleEdit}
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          aria-label="Edit task"
        >
          <PencilIcon className="w-4 h-4" />
        </button>
        <button
          onClick={handleArchive}
          className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
          aria-label="Archive task"
        >
          <ArchiveIcon className="w-4 h-4" />
        </button>
        <button
          onClick={handleDelete}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          aria-label="Delete task"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
