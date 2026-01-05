/**
 * Step3DueDateLabels Component
 *
 * Third step of the task creation form:
 * - Due date picker
 * - Label multi-select or tag input
 * - Attachments dropzone (optional, visual only for now)
 *
 * @packageDocumentation
 */

import * as React from "react";
import type { Step3DueDateLabelsProps } from "./types.js";

// =============================================================================
// Predefined Labels
// =============================================================================

const PREDEFINED_LABELS = [
  { value: "bug", label: "Bug", color: "bg-red-100 text-red-700 border-red-200" },
  { value: "feature", label: "Feature", color: "bg-green-100 text-green-700 border-green-200" },
  {
    value: "enhancement",
    label: "Enhancement",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  {
    value: "documentation",
    label: "Documentation",
    color: "bg-purple-100 text-purple-700 border-purple-200",
  },
  { value: "urgent", label: "Urgent", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "blocked", label: "Blocked", color: "bg-gray-100 text-gray-700 border-gray-200" },
];

// =============================================================================
// Icons
// =============================================================================

function CalendarIcon({ className = "w-5 h-5" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function TagIcon({ className = "w-5 h-5" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
      />
    </svg>
  );
}

function UploadIcon({ className = "w-8 h-8" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    </svg>
  );
}

function XIcon({ className = "w-4 h-4" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatDateForInput(date: Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

function parseInputDate(value: string): Date | null {
  if (!value) return null;
  return new Date(value);
}

// =============================================================================
// Component
// =============================================================================

/**
 * Step 3: Due date and labels selection.
 *
 * @example
 * ```tsx
 * <Step3DueDateLabels
 *   data={dueDateLabels}
 *   onChange={setDueDateLabels}
 *   onValidationChange={setStep3Valid}
 * />
 * ```
 */
export function Step3DueDateLabels({
  data,
  onChange,
  onValidationChange,
  disabled = false,
}: Step3DueDateLabelsProps) {
  const [customLabel, setCustomLabel] = React.useState("");

  // Step 3 is always valid (all fields are optional)
  React.useEffect(() => {
    onValidationChange(true);
  }, [onValidationChange]);

  // Handle due date change
  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = parseInputDate(e.target.value);
    onChange({ ...data, dueDate: date });
  };

  // Handle label toggle
  const handleLabelToggle = (labelValue: string) => {
    const currentLabels = data.labels;
    const newLabels = currentLabels.includes(labelValue)
      ? currentLabels.filter(l => l !== labelValue)
      : [...currentLabels, labelValue];
    onChange({ ...data, labels: newLabels });
  };

  // Handle custom label add
  const handleAddCustomLabel = () => {
    const trimmed = customLabel.trim().toLowerCase();
    if (trimmed && !data.labels.includes(trimmed)) {
      onChange({ ...data, labels: [...data.labels, trimmed] });
      setCustomLabel("");
    }
  };

  // Handle custom label remove
  const handleRemoveLabel = (labelValue: string) => {
    onChange({
      ...data,
      labels: data.labels.filter(l => l !== labelValue),
    });
  };

  // Handle Enter key for custom label
  const handleCustomLabelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCustomLabel();
    }
  };

  // Check if due date is in the past
  const dueDateInPast = data.dueDate && data.dueDate < new Date();

  return (
    <div data-testid="form-step-3" className="space-y-6">
      {/* Due Date Section */}
      <div>
        <label
          htmlFor="task-due-date"
          className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2"
        >
          <CalendarIcon className="w-4 h-4" />
          Due Date
        </label>
        <div className="relative">
          <input
            id="task-due-date"
            type="date"
            data-testid="form-field-due-date"
            value={formatDateForInput(data.dueDate)}
            onChange={handleDueDateChange}
            disabled={disabled}
            className={`
              w-full px-4 py-3 rounded-lg border-2
              focus:outline-none focus:ring-2 focus:ring-blue-200
              transition-colors
              ${
                dueDateInPast
                  ? "border-yellow-500 focus:border-yellow-500"
                  : "border-gray-300 focus:border-blue-500"
              }
              ${disabled ? "bg-gray-100 text-gray-500" : "bg-white"}
            `}
          />
        </div>
        {dueDateInPast && (
          <p className="mt-1 text-sm text-yellow-600">~ This date is in the past</p>
        )}
      </div>

      {/* Labels Section */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <TagIcon className="w-4 h-4" />
          Labels
        </label>

        {/* Selected labels display */}
        {data.labels.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {data.labels.map(labelValue => {
              const predefined = PREDEFINED_LABELS.find(l => l.value === labelValue);
              return (
                <span
                  key={labelValue}
                  data-testid={`selected-label-${labelValue}`}
                  className={`
                    inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border
                    ${predefined?.color ?? "bg-gray-100 text-gray-700 border-gray-200"}
                  `}
                >
                  {predefined?.label ?? labelValue}
                  <button
                    type="button"
                    onClick={() => handleRemoveLabel(labelValue)}
                    disabled={disabled}
                    className="hover:opacity-70 transition-opacity"
                    aria-label={`Remove ${labelValue} label`}
                  >
                    <XIcon className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* Predefined label buttons */}
        <div className="flex flex-wrap gap-2 mb-3">
          {PREDEFINED_LABELS.map(label => {
            const isSelected = data.labels.includes(label.value);
            return (
              <button
                key={label.value}
                type="button"
                data-testid={`label-option-${label.value}`}
                onClick={() => handleLabelToggle(label.value)}
                disabled={disabled}
                className={`
                  px-3 py-1 rounded-full text-sm border transition-all
                  ${
                    isSelected
                      ? label.color + " ring-2 ring-offset-1 ring-blue-500"
                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                  }
                  ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                {label.label}
              </button>
            );
          })}
        </div>

        {/* Custom label input */}
        <div className="flex gap-2">
          <input
            type="text"
            data-testid="form-field-custom-label"
            value={customLabel}
            onChange={e => setCustomLabel(e.target.value)}
            onKeyDown={handleCustomLabelKeyDown}
            disabled={disabled}
            placeholder="Add custom label..."
            className={`
              flex-1 px-4 py-2 rounded-lg border-2 border-gray-300 text-sm
              focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
              transition-colors
              ${disabled ? "bg-gray-100 text-gray-500" : "bg-white"}
            `}
          />
          <button
            type="button"
            data-testid="add-custom-label-btn"
            onClick={handleAddCustomLabel}
            disabled={disabled || !customLabel.trim()}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium
              transition-colors
              ${
                disabled || !customLabel.trim()
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              }
            `}
          >
            Add
          </button>
        </div>
      </div>

      {/* Attachments Section (optional, visual only) */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          Attachments (optional)
        </label>
        <div
          data-testid="attachments-dropzone"
          className={`
            border-2 border-dashed border-gray-300 rounded-lg p-8
            flex flex-col items-center justify-center
            transition-colors
            ${
              disabled
                ? "bg-gray-50 cursor-not-allowed"
                : "bg-white hover:border-blue-400 hover:bg-blue-50 cursor-pointer"
            }
          `}
        >
          <UploadIcon className="w-10 h-10 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">Drag files here or click to upload</p>
          <p className="mt-1 text-xs text-gray-400">Attachments can be added after task creation</p>
        </div>
      </div>
    </div>
  );
}
