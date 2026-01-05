/**
 * TaskFormProgress Component
 *
 * A progress indicator for multi-step forms showing:
 * - Step indicators (1, 2, 3)
 * - Current step highlight
 * - Completion percentage bar
 * - Breadcrumb-style labels
 *
 * Based on wireframe: layout-wireframes.md Section 6.3
 *
 * @packageDocumentation
 */

import * as React from "react";
import type { TaskFormProgressProps } from "./types.js";

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_STEP_LABELS = ["Basic Info", "Assignment", "Due Date"];

// =============================================================================
// Icons
// =============================================================================

function CheckIcon({ className = "w-4 h-4" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * Progress indicator for multi-step task creation form.
 *
 * @example
 * ```tsx
 * <TaskFormProgress
 *   currentStep={2}
 *   totalSteps={3}
 *   completedSteps={[1]}
 * />
 * ```
 */
export function TaskFormProgress({
  currentStep,
  totalSteps,
  stepLabels = DEFAULT_STEP_LABELS,
  completedSteps = [],
}: TaskFormProgressProps) {
  // Calculate progress percentage
  const progressPercentage = Math.round((currentStep / totalSteps) * 100);

  // Create step array for mapping
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className="w-full" data-testid="task-form-progress">
      {/* Step indicators */}
      <div className="flex items-center justify-between mb-2">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step);
          const isCurrent = step === currentStep;

          return (
            <React.Fragment key={step}>
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  data-testid={`progress-step-${step}`}
                  data-current={isCurrent.toString()}
                  data-completed={isCompleted.toString()}
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    text-sm font-semibold transition-all duration-300
                    ${
                      isCompleted
                        ? "bg-blue-500 text-white"
                        : isCurrent
                          ? "bg-blue-500 text-white ring-4 ring-blue-200"
                          : "bg-gray-200 text-gray-500"
                    }
                  `}
                >
                  {isCompleted ? <CheckIcon /> : step}
                </div>

                {/* Step label */}
                <span
                  className={`
                    mt-2 text-xs font-medium text-center
                    ${isCurrent ? "text-blue-600" : isCompleted ? "text-gray-700" : "text-gray-400"}
                  `}
                >
                  {stepLabels[index] ?? `Step ${step}`}
                </span>
              </div>

              {/* Connector line between steps */}
              {index < steps.length - 1 && (
                <div
                  className={`
                    flex-1 h-1 mx-4 rounded-full transition-colors duration-300
                    ${
                      index < currentStep - 1 || completedSteps.includes(step + 1)
                        ? "bg-blue-500"
                        : "bg-gray-200"
                    }
                  `}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>
            Step {currentStep} of {totalSteps}
          </span>
          <span>{progressPercentage}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            data-testid="progress-bar"
            data-progress={progressPercentage.toString()}
            className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Breadcrumb-style path (optional visual) */}
      <div className="mt-3 flex items-center justify-center text-sm text-gray-500">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step);
          const isCurrent = step === currentStep;
          const label = stepLabels[index] ?? `Step ${step}`;

          return (
            <React.Fragment key={step}>
              <span
                className={`
                  ${isCurrent ? "text-blue-600 font-medium" : ""}
                  ${isCompleted ? "text-gray-700" : ""}
                `}
              >
                {label}
              </span>
              {index < steps.length - 1 && <span className="mx-2 text-gray-300">{">"}</span>}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
