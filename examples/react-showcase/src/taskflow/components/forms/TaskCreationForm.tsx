/**
 * TaskCreationForm Component
 *
 * A multi-step task creation form that integrates:
 * - Form-flow state machine for workflow management
 * - React Query for task creation mutation
 * - Real-time validation feedback
 * - Progress indicator with step navigation
 *
 * States: idle, step1, step2, step3, validating, submitting, success, error
 *
 * @packageDocumentation
 */

import * as React from "react";
import { useCreateTask } from "../../data/hooks.js";
import { TaskFormProgress } from "./TaskFormProgress.js";
import { Step1BasicInfo } from "./Step1BasicInfo.js";
import { Step2Assignment } from "./Step2Assignment.js";
import { Step3DueDateLabels } from "./Step3DueDateLabels.js";
import type { TaskCreationFormProps, TaskCreationFormData, FormFlowState } from "./types.js";
import type { TaskBasicInfo, TaskAssignment, TaskDueDateLabels } from "../../types.js";

// =============================================================================
// Initial Form Data
// =============================================================================

const initialBasicInfo: TaskBasicInfo = {
  title: "",
  description: "",
  projectId: "",
  priority: "medium",
};

const initialAssignment: TaskAssignment = {
  assigneeId: null,
};

const initialDueDateLabels: TaskDueDateLabels = {
  dueDate: null,
  labels: [],
};

// =============================================================================
// Icons
// =============================================================================

function ArrowLeftIcon({ className = "w-5 h-5" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ArrowRightIcon({ className = "w-5 h-5" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function CheckIcon({ className = "w-5 h-5" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function SpinnerIcon({ className = "w-5 h-5" }: { readonly className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
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
// Component
// =============================================================================

/**
 * Multi-step task creation form with state machine integration.
 *
 * @example
 * ```tsx
 * <TaskCreationForm
 *   onSuccess={(task) => navigate(`/tasks/${task.id}`)}
 *   onCancel={() => navigate('/')}
 * />
 * ```
 */
export function TaskCreationForm({ onSuccess, onCancel, initialData }: TaskCreationFormProps) {
  // Form state
  const [formData, setFormData] = React.useState<TaskCreationFormData>(() => ({
    basicInfo: initialData?.basicInfo ?? initialBasicInfo,
    assignment: initialData?.assignment ?? initialAssignment,
    dueDateLabels: initialData?.dueDateLabels ?? initialDueDateLabels,
  }));

  // Flow state (simplified local state machine)
  const [flowState, setFlowState] = React.useState<FormFlowState>("idle");
  const [currentStep, setCurrentStep] = React.useState(1);
  const [completedSteps, setCompletedSteps] = React.useState<number[]>([]);

  // Step validation states
  const [step1Valid, setStep1Valid] = React.useState(false);
  const [step2Valid, setStep2Valid] = React.useState(true); // Optional
  const [step3Valid, setStep3Valid] = React.useState(true); // Optional

  // Error state
  const [error, setError] = React.useState<string | null>(null);

  // React Query mutation
  const createTaskMutation = useCreateTask();

  // Determine if current step is valid
  const isCurrentStepValid = React.useMemo(() => {
    switch (currentStep) {
      case 1:
        return step1Valid;
      case 2:
        return step2Valid;
      case 3:
        return step3Valid;
      default:
        return false;
    }
  }, [currentStep, step1Valid, step2Valid, step3Valid]);

  // Handle step changes with data updates
  const handleBasicInfoChange = React.useCallback((data: TaskBasicInfo) => {
    setFormData(prev => ({ ...prev, basicInfo: data }));
  }, []);

  const handleAssignmentChange = React.useCallback((data: TaskAssignment) => {
    setFormData(prev => ({ ...prev, assignment: data }));
  }, []);

  const handleDueDateLabelsChange = React.useCallback((data: TaskDueDateLabels) => {
    setFormData(prev => ({ ...prev, dueDateLabels: data }));
  }, []);

  // Navigate to next step
  const handleNext = React.useCallback(() => {
    if (!isCurrentStepValid) return;

    // Mark current step as completed
    setCompletedSteps(prev => (prev.includes(currentStep) ? prev : [...prev, currentStep]));

    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, isCurrentStepValid]);

  // Navigate to previous step
  const handleBack = React.useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Submit the form
  const handleSubmit = React.useCallback(async () => {
    setFlowState("validating");
    setError(null);

    // Validate all fields
    const isValid = step1Valid && step2Valid && step3Valid;

    if (!isValid) {
      setFlowState("error");
      setError("Please fill in all required fields");
      return;
    }

    setFlowState("submitting");

    try {
      // Create task using React Query mutation
      const task = await createTaskMutation.mutateAsync({
        title: formData.basicInfo.title,
        description: formData.basicInfo.description || undefined,
        projectId: formData.basicInfo.projectId,
        priority: formData.basicInfo.priority,
        assigneeId: formData.assignment.assigneeId,
        dueDate: formData.dueDateLabels.dueDate,
        labels: formData.dueDateLabels.labels,
      });

      setFlowState("success");
      onSuccess({ id: task.id, title: task.title });
    } catch (err) {
      setFlowState("error");
      setError(err instanceof Error ? err.message : "Failed to create task");
    }
  }, [step1Valid, step2Valid, step3Valid, formData, createTaskMutation, onSuccess]);

  // Determine if submission is in progress
  const isSubmitting = flowState === "validating" || flowState === "submitting";

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1BasicInfo
            data={formData.basicInfo}
            onChange={handleBasicInfoChange}
            onValidationChange={setStep1Valid}
            disabled={isSubmitting}
          />
        );
      case 2:
        return (
          <Step2Assignment
            data={formData.assignment}
            onChange={handleAssignmentChange}
            onValidationChange={setStep2Valid}
            disabled={isSubmitting}
          />
        );
      case 3:
        return (
          <Step3DueDateLabels
            data={formData.dueDateLabels}
            onChange={handleDueDateLabelsChange}
            onValidationChange={setStep3Valid}
            disabled={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create New Task</h1>
        <p className="mt-1 text-sm text-gray-500">Fill in the details below to create a new task</p>
      </div>

      {/* Progress indicator */}
      <div className="mb-8">
        <TaskFormProgress
          currentStep={currentStep}
          totalSteps={3}
          completedSteps={completedSteps}
        />
      </div>

      {/* Error banner */}
      {error && flowState === "error" && (
        <div
          data-testid="form-error-banner"
          className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3"
        >
          <div className="flex-shrink-0 text-red-500">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Step content */}
      <div className="min-h-[300px]">{renderStepContent()}</div>

      {/* Navigation buttons */}
      <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-between">
        <div>
          {currentStep > 1 ? (
            <button
              type="button"
              data-testid="form-back-button"
              onClick={handleBack}
              disabled={isSubmitting}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg
                text-gray-700 hover:bg-gray-100 transition-colors
                ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back
            </button>
          ) : (
            <button
              type="button"
              data-testid="form-cancel-button"
              onClick={onCancel}
              disabled={isSubmitting}
              className={`
                px-4 py-2 rounded-lg
                text-gray-700 hover:bg-gray-100 transition-colors
                ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              Cancel
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* State indicator (for debugging/demo) */}
          <span
            data-testid="form-state-indicator"
            className={`
              text-xs px-2 py-1 rounded-full
              ${flowState === "idle" ? "bg-gray-100 text-gray-600" : ""}
              ${flowState === "validating" ? "bg-yellow-100 text-yellow-700" : ""}
              ${flowState === "submitting" ? "bg-blue-100 text-blue-700" : ""}
              ${flowState === "success" ? "bg-green-100 text-green-700" : ""}
              ${flowState === "error" ? "bg-red-100 text-red-700" : ""}
            `}
          >
            {flowState}
          </span>

          {/* Next/Submit button */}
          {currentStep < 3 ? (
            <button
              type="button"
              data-testid="form-next-button"
              onClick={handleNext}
              disabled={!isCurrentStepValid || isSubmitting}
              className={`
                flex items-center gap-2 px-6 py-2 rounded-lg font-medium
                transition-all
                ${
                  isCurrentStepValid && !isSubmitting
                    ? "bg-blue-500 text-white hover:bg-blue-600"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }
              `}
            >
              Next
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              data-testid="form-submit-button"
              onClick={handleSubmit}
              disabled={!isCurrentStepValid || isSubmitting}
              className={`
                flex items-center gap-2 px-6 py-2 rounded-lg font-medium
                transition-all
                ${
                  isCurrentStepValid && !isSubmitting
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }
              `}
            >
              {isSubmitting ? (
                <>
                  <SpinnerIcon className="w-4 h-4" />
                  {flowState === "validating" ? "Validating..." : "Creating..."}
                </>
              ) : (
                <>
                  <CheckIcon className="w-4 h-4" />
                  Create Task
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
