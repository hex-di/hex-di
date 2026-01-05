/**
 * Step1BasicInfo Component
 *
 * First step of the task creation form:
 * - Title field (required, 3+ chars)
 * - Description textarea (optional)
 * - Project dropdown (required)
 * - Priority dropdown (default: Medium)
 * - Real-time validation feedback
 *
 * Based on wireframe: layout-wireframes.md Section 6.1
 *
 * @packageDocumentation
 */

import * as React from "react";
import { useProjects } from "../../data/hooks.js";
import { FormFieldValidation } from "./FormFieldValidation.js";
import type { Step1BasicInfoProps } from "./types.js";
import type { FieldValidationState } from "./types.js";
import type { TaskPriority } from "../../types.js";

// =============================================================================
// Validation Helpers
// =============================================================================

function validateTitle(value: string): { state: FieldValidationState; message?: string } {
  if (!value.trim()) {
    return { state: "error", message: "Title is required" };
  }
  if (value.length < 3) {
    return { state: "error", message: "Title must be at least 3 characters" };
  }
  if (value.length > 100) {
    return { state: "warning", message: `Title is quite long (${value.length}/100 characters)` };
  }
  return { state: "success", message: "Looks good!" };
}

function validateProject(value: string): { state: FieldValidationState; message?: string } {
  if (!value) {
    return { state: "error", message: "Please select a project" };
  }
  return { state: "success" };
}

// =============================================================================
// Priority Options
// =============================================================================

const PRIORITY_OPTIONS: readonly { readonly value: TaskPriority; readonly label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

// =============================================================================
// Component
// =============================================================================

/**
 * Step 1: Basic Information form fields.
 *
 * @example
 * ```tsx
 * <Step1BasicInfo
 *   data={basicInfo}
 *   onChange={setBasicInfo}
 *   onValidationChange={setStep1Valid}
 * />
 * ```
 */
export function Step1BasicInfo({
  data,
  onChange,
  onValidationChange,
  disabled = false,
}: Step1BasicInfoProps) {
  const { data: projects, isLoading: projectsLoading } = useProjects();

  // Field validation states
  const [titleValidation, setTitleValidation] = React.useState<{
    state: FieldValidationState;
    message?: string;
  }>({ state: "idle" });

  const [projectValidation, setProjectValidation] = React.useState<{
    state: FieldValidationState;
    message?: string;
  }>({ state: "idle" });

  // Track if fields have been touched
  const [touchedFields, setTouchedFields] = React.useState<Set<string>>(new Set());

  // Update validation and notify parent
  React.useEffect(() => {
    const titleResult = validateTitle(data.title);
    const projectResult = validateProject(data.projectId);

    // Only show validation states for touched fields
    if (touchedFields.has("title")) {
      setTitleValidation(titleResult);
    }
    if (touchedFields.has("projectId")) {
      setProjectValidation(projectResult);
    }

    // Check overall validity
    const isValid = titleResult.state !== "error" && projectResult.state !== "error";
    onValidationChange(isValid);
  }, [data.title, data.projectId, touchedFields, onValidationChange]);

  // Handle title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...data, title: e.target.value });
  };

  // Handle title blur
  const handleTitleBlur = () => {
    setTouchedFields(prev => new Set(prev).add("title"));
  };

  // Handle description change
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...data, description: e.target.value });
  };

  // Handle project change
  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTouchedFields(prev => new Set(prev).add("projectId"));
    onChange({ ...data, projectId: e.target.value });
  };

  // Handle priority change
  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...data, priority: e.target.value as TaskPriority });
  };

  return (
    <div data-testid="form-step-1" className="space-y-6">
      {/* Title field */}
      <div>
        <label htmlFor="task-title" className="block text-sm font-medium text-gray-700 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <FormFieldValidation
          state={titleValidation.state}
          message={titleValidation.message}
          testId="form-field-title"
        >
          <input
            id="task-title"
            type="text"
            data-testid="form-field-title"
            value={data.title}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            disabled={disabled}
            placeholder="Enter task title..."
            className={`
              w-full px-4 py-3 rounded-lg border-0 bg-transparent
              focus:outline-none focus:ring-0
              placeholder-gray-400
              ${disabled ? "bg-gray-100 text-gray-500" : ""}
            `}
          />
        </FormFieldValidation>
      </div>

      {/* Description field */}
      <div>
        <label htmlFor="task-description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="task-description"
          data-testid="form-field-description"
          value={data.description}
          onChange={handleDescriptionChange}
          disabled={disabled}
          placeholder="Add a description..."
          rows={4}
          className={`
            w-full px-4 py-3 rounded-lg border-2 border-gray-300
            focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
            placeholder-gray-400 transition-colors
            ${disabled ? "bg-gray-100 text-gray-500" : "bg-white"}
          `}
        />
      </div>

      {/* Project and Priority row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Project dropdown */}
        <div>
          <label htmlFor="task-project" className="block text-sm font-medium text-gray-700 mb-1">
            Project <span className="text-red-500">*</span>
          </label>
          <FormFieldValidation
            state={projectValidation.state}
            message={projectValidation.message}
            testId="form-field-project"
          >
            <select
              id="task-project"
              data-testid="form-field-project"
              value={data.projectId}
              onChange={handleProjectChange}
              disabled={disabled || projectsLoading}
              className={`
                w-full px-4 py-3 rounded-lg border-0 bg-transparent
                focus:outline-none focus:ring-0
                ${disabled ? "bg-gray-100 text-gray-500" : ""}
                ${!data.projectId ? "text-gray-400" : "text-gray-900"}
              `}
            >
              <option value="">
                {projectsLoading ? "Loading projects..." : "Select project..."}
              </option>
              {projects?.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </FormFieldValidation>
        </div>

        {/* Priority dropdown */}
        <div>
          <label htmlFor="task-priority" className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <select
            id="task-priority"
            data-testid="form-field-priority"
            value={data.priority}
            onChange={handlePriorityChange}
            disabled={disabled}
            className={`
              w-full px-4 py-3 rounded-lg border-2 border-gray-300
              focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
              transition-colors
              ${disabled ? "bg-gray-100 text-gray-500" : "bg-white"}
            `}
          >
            {PRIORITY_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
