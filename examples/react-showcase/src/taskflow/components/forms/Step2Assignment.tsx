/**
 * Step2Assignment Component
 *
 * Second step of the task creation form:
 * - Assignee dropdown with team members
 * - Avatar display for selected assignee
 * - "Unassigned" option
 *
 * @packageDocumentation
 */

import * as React from "react";
import { useUsers } from "../../data/hooks.js";
import type { Step2AssignmentProps } from "./types.js";

// =============================================================================
// Avatar Component
// =============================================================================

function UserAvatar({
  avatarUrl,
  displayName,
  size = "md",
}: {
  readonly avatarUrl: string | null;
  readonly displayName: string;
  readonly size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-lg",
  };

  // Get initials from display name
  const initials = displayName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        className={`${sizeClasses[size]} rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`
        ${sizeClasses[size]} rounded-full
        bg-gradient-to-br from-blue-400 to-blue-600
        flex items-center justify-center text-white font-medium
      `}
    >
      {initials}
    </div>
  );
}

// =============================================================================
// Unassigned Icon
// =============================================================================

function UnassignedIcon({ className = "w-12 h-12" }: { readonly className?: string }) {
  return (
    <div className={`${className} rounded-full bg-gray-200 flex items-center justify-center`}>
      <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * Step 2: Assignment selection with avatar preview.
 *
 * @example
 * ```tsx
 * <Step2Assignment
 *   data={assignment}
 *   onChange={setAssignment}
 *   onValidationChange={setStep2Valid}
 * />
 * ```
 */
export function Step2Assignment({
  data,
  onChange,
  onValidationChange,
  disabled = false,
}: Step2AssignmentProps) {
  const { data: users, isLoading: usersLoading } = useUsers();

  // Find selected user
  const selectedUser = users?.find(u => u.id === data.assigneeId);

  // Step 2 is always valid (assignee is optional)
  React.useEffect(() => {
    onValidationChange(true);
  }, [onValidationChange]);

  // Handle assignee change
  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onChange({ assigneeId: value || null });
  };

  return (
    <div data-testid="form-step-2" className="space-y-6">
      {/* Section header */}
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Who should work on this task?</h3>
        <p className="text-sm text-gray-500">Assign a team member or leave it unassigned for now</p>
      </div>

      {/* Avatar preview */}
      <div className="flex justify-center">
        <div className="text-center">
          {selectedUser ? (
            <UserAvatar
              avatarUrl={selectedUser.avatarUrl}
              displayName={selectedUser.displayName}
              size="lg"
            />
          ) : (
            <UnassignedIcon className="w-16 h-16" />
          )}
          <p className="mt-2 text-sm font-medium text-gray-700">
            {selectedUser ? selectedUser.displayName : "Unassigned"}
          </p>
          {selectedUser && <p className="text-xs text-gray-500">{selectedUser.role}</p>}
        </div>
      </div>

      {/* Assignee dropdown */}
      <div className="max-w-md mx-auto">
        <label htmlFor="task-assignee" className="block text-sm font-medium text-gray-700 mb-1">
          Assignee
        </label>
        <select
          id="task-assignee"
          data-testid="form-field-assignee"
          value={data.assigneeId ?? ""}
          onChange={handleAssigneeChange}
          disabled={disabled || usersLoading}
          className={`
            w-full px-4 py-3 rounded-lg border-2 border-gray-300
            focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
            transition-colors
            ${disabled ? "bg-gray-100 text-gray-500" : "bg-white"}
          `}
        >
          <option value="">{usersLoading ? "Loading team members..." : "Unassigned"}</option>
          {users?.map(user => (
            <option key={user.id} value={user.id}>
              {user.displayName} ({user.role})
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-gray-500">
          You can change the assignee later from the task details
        </p>
      </div>

      {/* Team member grid (alternative selection UI) */}
      {users && users.length > 0 && !usersLoading && (
        <div className="mt-6">
          <p className="text-sm text-gray-500 mb-3 text-center">Or select from your team:</p>
          <div className="flex flex-wrap justify-center gap-4">
            {/* Unassigned option */}
            <button
              type="button"
              data-testid="assignee-option-unassigned"
              onClick={() => onChange({ assigneeId: null })}
              disabled={disabled}
              className={`
                flex flex-col items-center p-3 rounded-lg transition-all
                ${
                  data.assigneeId === null
                    ? "bg-blue-50 ring-2 ring-blue-500"
                    : "bg-gray-50 hover:bg-gray-100"
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              <UnassignedIcon className="w-10 h-10" />
              <span className="mt-1 text-xs font-medium text-gray-600">Unassigned</span>
            </button>

            {/* Team member options */}
            {users.slice(0, 6).map(user => (
              <button
                key={user.id}
                type="button"
                data-testid={`assignee-option-${user.id}`}
                onClick={() => onChange({ assigneeId: user.id })}
                disabled={disabled}
                className={`
                  flex flex-col items-center p-3 rounded-lg transition-all
                  ${
                    data.assigneeId === user.id
                      ? "bg-blue-50 ring-2 ring-blue-500"
                      : "bg-gray-50 hover:bg-gray-100"
                  }
                  ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                <UserAvatar avatarUrl={user.avatarUrl} displayName={user.displayName} size="sm" />
                <span className="mt-1 text-xs font-medium text-gray-600 max-w-[60px] truncate">
                  {user.displayName.split(" ")[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
