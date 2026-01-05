/**
 * Onboarding Wizard Components Module
 *
 * Exports all components, hooks, and types for the onboarding wizard flow.
 *
 * @packageDocumentation
 */

// =============================================================================
// Components
// =============================================================================

export { WizardProgress, ONBOARDING_STEPS } from "./WizardProgress.js";
export type { WizardProgressProps, WizardStep as WizardStepConfig } from "./WizardProgress.js";

export { Step1Profile } from "./Step1Profile.js";
export type { Step1ProfileProps } from "./Step1Profile.js";

export { Step2Team } from "./Step2Team.js";
export type { Step2TeamProps } from "./Step2Team.js";

export { Step3Preferences } from "./Step3Preferences.js";
export type { Step3PreferencesProps } from "./Step3Preferences.js";

export { WizardComplete } from "./WizardComplete.js";
export type { WizardCompleteProps, QuickStartAction } from "./WizardComplete.js";

export { OnboardingWizard } from "./OnboardingWizard.js";
export type { OnboardingWizardProps, WizardStep } from "./OnboardingWizard.js";

// =============================================================================
// Hooks
// =============================================================================

export {
  useOnboardingFormData,
  DEFAULT_PROFILE,
  DEFAULT_TEAM,
  DEFAULT_PREFERENCES,
} from "./use-onboarding-form-data.js";
export type { OnboardingFormDataHook } from "./use-onboarding-form-data.js";

export { useOnboardingGuard, useNewUserGuard } from "./use-onboarding-guard.js";
export type { OnboardingGuardResult } from "./use-onboarding-guard.js";
