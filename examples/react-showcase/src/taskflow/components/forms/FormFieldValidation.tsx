/**
 * FormFieldValidation Component
 *
 * A wrapper component that provides visual validation feedback for form fields:
 * - Error state: red border, error message
 * - Warning state: yellow border, warning message
 * - Success state: green border, checkmark
 * - Loading state: spinner icon
 *
 * Based on wireframe: component-wireframes.md Section 2
 *
 * @packageDocumentation
 */

import type { FormFieldValidationProps, FieldValidationState } from "./types.js";

// =============================================================================
// State Styling Configuration
// =============================================================================

const stateConfig: Record<
  FieldValidationState,
  {
    borderColor: string;
    textColor: string;
    bgColor: string;
  }
> = {
  idle: {
    borderColor: "border-gray-300",
    textColor: "text-gray-500",
    bgColor: "bg-white",
  },
  loading: {
    borderColor: "border-gray-300",
    textColor: "text-gray-500",
    bgColor: "bg-white",
  },
  success: {
    borderColor: "border-green-500",
    textColor: "text-green-600",
    bgColor: "bg-green-50",
  },
  warning: {
    borderColor: "border-yellow-500",
    textColor: "text-yellow-600",
    bgColor: "bg-yellow-50",
  },
  error: {
    borderColor: "border-red-500",
    textColor: "text-red-600",
    bgColor: "bg-red-50",
  },
};

// =============================================================================
// Icons
// =============================================================================

function CheckIcon({ className = "w-5 h-5" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function WarningIcon({ className = "w-5 h-5" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function ErrorIcon({ className = "w-5 h-5" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
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
 * Wrapper component that provides visual validation feedback for form fields.
 *
 * @example
 * ```tsx
 * <FormFieldValidation
 *   state="error"
 *   message="Title is required"
 *   testId="title-field"
 * >
 *   <input type="text" value={title} onChange={handleChange} />
 * </FormFieldValidation>
 * ```
 */
export function FormFieldValidation({
  state,
  message,
  testId = "form-field",
  children,
}: FormFieldValidationProps) {
  const config = stateConfig[state];

  const renderIcon = () => {
    switch (state) {
      case "success":
        return (
          <span data-testid={`${testId}-icon`} className="text-green-500">
            <CheckIcon />
          </span>
        );
      case "warning":
        return (
          <span data-testid={`${testId}-icon`} className="text-yellow-500">
            <WarningIcon />
          </span>
        );
      case "error":
        return (
          <span data-testid={`${testId}-icon`} className="text-red-500">
            <ErrorIcon />
          </span>
        );
      case "loading":
        return (
          <span data-testid={`${testId}-spinner`} className="text-gray-500">
            <SpinnerIcon />
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative">
      {/* Input container with border styling */}
      <div
        data-testid={`${testId}-container`}
        className={`
          relative flex items-center rounded-lg border-2 transition-colors
          ${config.borderColor}
          ${state !== "idle" && state !== "loading" ? config.bgColor : ""}
        `}
      >
        {/* Children (input element) */}
        <div className="flex-1">{children}</div>

        {/* Status icon */}
        {state !== "idle" && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{renderIcon()}</div>
        )}
      </div>

      {/* Validation message */}
      {message && state !== "idle" && (
        <p data-testid={`${testId}-message`} className={`mt-1 text-sm ${config.textColor}`}>
          {state === "error" && "^ "}
          {state === "warning" && "~ "}
          {message}
        </p>
      )}
    </div>
  );
}
