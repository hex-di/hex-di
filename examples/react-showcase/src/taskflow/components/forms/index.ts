/**
 * Form Components Module
 *
 * Exports all task creation form-related components.
 *
 * @packageDocumentation
 */

// =============================================================================
// Progress Indicator
// =============================================================================

export { TaskFormProgress } from "./TaskFormProgress.js";

// =============================================================================
// Form Field Components
// =============================================================================

export { FormFieldValidation } from "./FormFieldValidation.js";

// =============================================================================
// Step Components
// =============================================================================

export { Step1BasicInfo } from "./Step1BasicInfo.js";
export { Step2Assignment } from "./Step2Assignment.js";
export { Step3DueDateLabels } from "./Step3DueDateLabels.js";

// =============================================================================
// Main Form Component
// =============================================================================

export { TaskCreationForm } from "./TaskCreationForm.js";

// =============================================================================
// Types
// =============================================================================

export type {
  // Validation types
  FieldValidationState,
  FormFieldValidationProps,
  FieldValidationResult,
  FieldValidationRules,
  // Progress types
  TaskFormProgressProps,
  // Step types
  Step1BasicInfoProps,
  Step2AssignmentProps,
  Step3DueDateLabelsProps,
  // Form types
  FormFlowState,
  TaskCreationFormData,
  TaskCreationFormProps,
} from "./types.js";
