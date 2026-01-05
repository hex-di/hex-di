/**
 * Wizard Progress Component
 *
 * Displays a three-step indicator with labels (Profile, Team, Preferences).
 * Shows visual completion markers (checkmark for completed steps) and
 * highlights the current step.
 *
 * Based on wireframe: planning/visuals/component-wireframes.md Section 1
 *
 * @packageDocumentation
 */

import * as React from "react";

// =============================================================================
// Types
// =============================================================================

/**
 * Wizard step definition.
 */
export interface WizardStep {
  /** Step number (1-based) */
  readonly number: number;
  /** Step label */
  readonly label: string;
  /** Whether this step is optional */
  readonly optional?: boolean;
}

/**
 * Props for the WizardProgress component.
 */
export interface WizardProgressProps {
  /** Current step number (1-based) */
  readonly currentStep: number;
  /** Total number of steps */
  readonly steps: readonly WizardStep[];
  /** Optional CSS class name */
  readonly className?: string;
}

// =============================================================================
// Default Steps Configuration
// =============================================================================

/**
 * Default onboarding wizard steps.
 */
export const ONBOARDING_STEPS: readonly WizardStep[] = [
  { number: 1, label: "Profile" },
  { number: 2, label: "Team", optional: true },
  { number: 3, label: "Preferences" },
];

// =============================================================================
// Sub-Components
// =============================================================================

interface StepIndicatorProps {
  readonly step: WizardStep;
  readonly currentStep: number;
  readonly isLast: boolean;
}

/**
 * Individual step indicator with number/checkmark and label.
 */
function StepIndicator({ step, currentStep, isLast }: StepIndicatorProps) {
  const isCompleted = step.number < currentStep;
  const isCurrent = step.number === currentStep;
  const isPending = step.number > currentStep;

  // Determine circle styles based on state
  const circleClasses = React.useMemo(() => {
    const base =
      "w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm transition-colors duration-200";
    if (isCompleted) {
      return `${base} bg-blue-500 text-white`;
    }
    if (isCurrent) {
      return `${base} bg-blue-500 text-white ring-4 ring-blue-200`;
    }
    return `${base} bg-gray-200 text-gray-500`;
  }, [isCompleted, isCurrent]);

  // Determine connector line styles
  const lineClasses = React.useMemo(() => {
    const base = "flex-1 h-1 mx-2 transition-colors duration-200";
    if (isCompleted) {
      return `${base} bg-blue-500`;
    }
    return `${base} bg-gray-200`;
  }, [isCompleted]);

  return (
    <React.Fragment>
      <div className="flex flex-col items-center">
        {/* Step circle */}
        <div className={circleClasses} aria-current={isCurrent ? "step" : undefined}>
          {isCompleted ? (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
            step.number
          )}
        </div>

        {/* Step label */}
        <span
          className={`text-xs mt-2 font-medium transition-colors duration-200 ${
            isCurrent ? "text-blue-600" : isCompleted ? "text-gray-700" : "text-gray-400"
          }`}
        >
          {step.label}
        </span>

        {/* Optional badge */}
        {step.optional && isPending && (
          <span className="text-xs text-gray-400 mt-0.5">(optional)</span>
        )}
      </div>

      {/* Connector line (not for last step) */}
      {!isLast && <div className={lineClasses} aria-hidden="true" />}
    </React.Fragment>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Wizard progress indicator showing current step and completion status.
 *
 * @example
 * ```tsx
 * <WizardProgress currentStep={2} steps={ONBOARDING_STEPS} />
 * ```
 */
export function WizardProgress({
  currentStep,
  steps,
  className = "",
}: WizardProgressProps): React.ReactElement {
  return (
    <nav className={`flex items-center justify-center ${className}`} aria-label="Wizard progress">
      <ol className="flex items-start">
        {steps.map((step, index) => (
          <li key={step.number} className="flex items-center">
            <StepIndicator
              step={step}
              currentStep={currentStep}
              isLast={index === steps.length - 1}
            />
          </li>
        ))}
      </ol>
    </nav>
  );
}
