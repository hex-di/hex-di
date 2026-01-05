/**
 * Wizard Complete Component
 *
 * Displays the completion screen after onboarding:
 * - Success icon and message
 * - Quick start actions
 * - "Go to Dashboard" CTA
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
 * Quick start action definition.
 */
export interface QuickStartAction {
  /** Action identifier */
  readonly id: string;
  /** Action label */
  readonly label: string;
  /** Action icon (optional) */
  readonly icon?: React.ReactNode;
  /** Whether this action opens a tour */
  readonly isTour?: boolean;
}

/**
 * Props for the WizardComplete component.
 */
export interface WizardCompleteProps {
  /** User's display name */
  readonly userName: string;
  /** Callback when user clicks "Go to Dashboard" */
  readonly onGoToDashboard: () => void;
  /** Callback when user selects a quick start action */
  readonly onQuickStart?: (actionId: string) => void;
  /** Custom quick start actions */
  readonly quickStartActions?: readonly QuickStartAction[];
}

// =============================================================================
// Default Quick Start Actions
// =============================================================================

const DEFAULT_QUICK_START_ACTIONS: readonly QuickStartAction[] = [
  {
    id: "create-project",
    label: "Create your first project",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
        />
      </svg>
    ),
  },
  {
    id: "add-task",
    label: "Add a task",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
        />
      </svg>
    ),
  },
  {
    id: "quick-tour",
    label: "Take a quick tour",
    isTour: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
];

// =============================================================================
// Main Component
// =============================================================================

/**
 * Wizard completion screen shown after onboarding is complete.
 *
 * @example
 * ```tsx
 * <WizardComplete
 *   userName="John"
 *   onGoToDashboard={() => navigate('/')}
 *   onQuickStart={(id) => console.log('Quick start:', id)}
 * />
 * ```
 */
export function WizardComplete({
  userName,
  onGoToDashboard,
  onQuickStart,
  quickStartActions = DEFAULT_QUICK_START_ACTIONS,
}: WizardCompleteProps): React.ReactElement {
  return (
    <div className="text-center py-8">
      {/* Success Icon */}
      <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <svg
          className="w-10 h-10 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      {/* Success Message */}
      <h2 className="text-2xl font-bold text-gray-900 mb-2">You're All Set, {userName}!</h2>
      <p className="text-gray-600 mb-8">Your TaskFlow workspace is ready to go.</p>

      {/* Quick Start Actions */}
      <div className="bg-gray-50 rounded-xl p-6 mb-8 max-w-md mx-auto">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 text-left">Quick Start:</h3>
        <div className="space-y-2">
          {quickStartActions.map(action => (
            <button
              key={action.id}
              type="button"
              onClick={() => onQuickStart?.(action.id)}
              className="w-full flex items-center px-4 py-3 text-left text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              {action.icon && (
                <span className={`mr-3 ${action.isTour ? "text-blue-500" : "text-green-500"}`}>
                  {action.icon}
                </span>
              )}
              <span className="font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Primary CTA */}
      <button
        type="button"
        onClick={onGoToDashboard}
        className="px-8 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        Go to Dashboard
      </button>

      {/* Subtle animation for celebration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Confetti could be added here as a more elaborate celebration */}
      </div>
    </div>
  );
}
