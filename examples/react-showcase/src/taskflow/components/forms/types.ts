/**
 * Type definitions for Task Creation Form components.
 *
 * @packageDocumentation
 */

import type { TaskBasicInfo, TaskAssignment, TaskDueDateLabels } from "../../types.js";

// =============================================================================
// Form Field Validation States
// =============================================================================

/**
 * Validation state for a form field.
 */
export type FieldValidationState = "idle" | "loading" | "success" | "warning" | "error";

/**
 * Props for the FormFieldValidation wrapper component.
 */
export interface FormFieldValidationProps {
  /** The current validation state of the field */
  readonly state: FieldValidationState;
  /** Validation message to display */
  readonly message?: string;
  /** Test ID prefix for the field */
  readonly testId?: string;
  /** Child input element */
  readonly children: React.ReactNode;
}

// =============================================================================
// Progress Component Types
// =============================================================================

/**
 * Props for the TaskFormProgress component.
 */
export interface TaskFormProgressProps {
  /** Current step (1-indexed) */
  readonly currentStep: number;
  /** Total number of steps */
  readonly totalSteps: number;
  /** Optional step labels (defaults to Basic Info, Assignment, Due Date) */
  readonly stepLabels?: readonly string[];
  /** Completed steps (for showing checkmarks) */
  readonly completedSteps?: readonly number[];
}

// =============================================================================
// Step Component Types
// =============================================================================

/**
 * Props for Step1BasicInfo component.
 */
export interface Step1BasicInfoProps {
  /** Current form data for step 1 */
  readonly data: TaskBasicInfo;
  /** Callback when any field changes */
  readonly onChange: (data: TaskBasicInfo) => void;
  /** Callback when validation state changes */
  readonly onValidationChange: (isValid: boolean) => void;
  /** Whether the form is disabled (during submission) */
  readonly disabled?: boolean;
}

/**
 * Props for Step2Assignment component.
 */
export interface Step2AssignmentProps {
  /** Current form data for step 2 */
  readonly data: TaskAssignment;
  /** Callback when any field changes */
  readonly onChange: (data: TaskAssignment) => void;
  /** Callback when validation state changes */
  readonly onValidationChange: (isValid: boolean) => void;
  /** Whether the form is disabled (during submission) */
  readonly disabled?: boolean;
}

/**
 * Props for Step3DueDateLabels component.
 */
export interface Step3DueDateLabelsProps {
  /** Current form data for step 3 */
  readonly data: TaskDueDateLabels;
  /** Callback when any field changes */
  readonly onChange: (data: TaskDueDateLabels) => void;
  /** Callback when validation state changes */
  readonly onValidationChange: (isValid: boolean) => void;
  /** Whether the form is disabled (during submission) */
  readonly disabled?: boolean;
}

// =============================================================================
// Main Form Component Types
// =============================================================================

/**
 * Form submission state (mirrors form-flow machine states).
 */
export type FormFlowState =
  | "idle"
  | "step1"
  | "step2"
  | "step3"
  | "validating"
  | "submitting"
  | "success"
  | "error";

/**
 * Complete task creation form data.
 */
export interface TaskCreationFormData {
  readonly basicInfo: TaskBasicInfo;
  readonly assignment: TaskAssignment;
  readonly dueDateLabels: TaskDueDateLabels;
}

/**
 * Props for the main TaskCreationForm component.
 */
export interface TaskCreationFormProps {
  /** Callback when task is successfully created */
  readonly onSuccess: (task: { id: string; title: string }) => void;
  /** Callback when form is cancelled */
  readonly onCancel: () => void;
  /** Initial form data (for editing) */
  readonly initialData?: Partial<TaskCreationFormData>;
}

// =============================================================================
// Validation Types
// =============================================================================

/**
 * Result of validating a single field.
 */
export interface FieldValidationResult {
  readonly isValid: boolean;
  readonly state: FieldValidationState;
  readonly message?: string;
}

/**
 * Validation rules for a field.
 */
export interface FieldValidationRules {
  readonly required?: boolean;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: RegExp;
  readonly custom?: (value: string) => FieldValidationResult | null;
}
