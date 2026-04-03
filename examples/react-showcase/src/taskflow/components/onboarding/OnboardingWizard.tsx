/**
 * Onboarding Wizard Component
 *
 * Main component that orchestrates the three-step onboarding flow:
 * 1. Profile Setup
 * 2. Team Creation/Join
 * 3. Preferences
 * + Completion Screen
 *
 * Integrates with the wizard-flow state machine pattern and
 * manages data accumulation across steps.
 *
 * @packageDocumentation
 */

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { WizardProgress, ONBOARDING_STEPS } from "./WizardProgress.js";
import { Step1Profile } from "./Step1Profile.js";
import { Step2Team } from "./Step2Team.js";
import { Step3Preferences } from "./Step3Preferences.js";
import { WizardComplete } from "./WizardComplete.js";
import {
  useOnboardingFormData,
  DEFAULT_PROFILE,
  DEFAULT_TEAM,
  DEFAULT_PREFERENCES,
} from "./use-onboarding-form-data.js";
import type { OnboardingProfile, OnboardingTeam, OnboardingPreferences } from "../../types.js";
import type { UserSessionStoreInstance } from "../../stores/user-session-store.js";
import type { UIPreferencesStoreInstance } from "../../stores/ui-preferences-store.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Wizard step identifiers.
 */
export type WizardStep = 1 | 2 | 3 | "complete";

/**
 * Props for the OnboardingWizard component.
 */
export interface OnboardingWizardProps {
  /** User session store for updating profile and completion status */
  readonly userSessionStore: UserSessionStoreInstance;
  /** UI preferences store for updating theme and settings */
  readonly uiPreferencesStore?: UIPreferencesStoreInstance;
  /** Initial step (for testing) */
  readonly initialStep?: number;
  /** Callback when onboarding is complete */
  readonly onComplete?: () => void;
}

// =============================================================================
// Quick Start Navigation Helper
// =============================================================================

const QUICK_START_ROUTES: Record<string, string> = {
  "create-project": "/taskflow/projects/new",
  "add-task": "/taskflow/tasks/new",
};

// =============================================================================
// Initial Profile Builder
// =============================================================================

function buildInitialProfile(
  userState: ReturnType<UserSessionStoreInstance["getState"]>
): OnboardingProfile {
  return {
    displayName: userState.user?.displayName ?? DEFAULT_PROFILE.displayName,
    role: userState.user?.role ?? DEFAULT_PROFILE.role,
    avatarUrl: userState.user?.avatarUrl ?? DEFAULT_PROFILE.avatarUrl,
    bio: userState.user?.bio ?? DEFAULT_PROFILE.bio,
  };
}

// =============================================================================
// Back Step Helper
// =============================================================================

const BACK_STEP_MAP: Partial<Record<WizardStep, WizardStep>> = {
  2: 1,
  3: 2,
};

// =============================================================================
// Wizard Step Content
// =============================================================================

interface WizardStepContentProps {
  readonly currentStep: WizardStep;
  readonly formData: ReturnType<typeof useOnboardingFormData>;
  readonly userEmail: string | undefined;
  readonly isSubmitting: boolean;
  readonly firstName: string;
  readonly onStep1Next: (data: OnboardingProfile) => void;
  readonly onStep2Next: (data: OnboardingTeam) => void;
  readonly onBack: () => void;
  readonly onStep2Skip: () => void;
  readonly onStep3Complete: (data: OnboardingPreferences) => void;
  readonly onGoToDashboard: () => void;
  readonly onQuickStart: (actionId: string) => void;
}

function WizardStepContent({
  currentStep,
  formData,
  userEmail,
  isSubmitting,
  firstName,
  onStep1Next,
  onStep2Next,
  onBack,
  onStep2Skip,
  onStep3Complete,
  onGoToDashboard,
  onQuickStart,
}: WizardStepContentProps): React.ReactElement | null {
  if (currentStep === 1) {
    return <Step1Profile initialData={formData.profile} email={userEmail} onNext={onStep1Next} />;
  }

  if (currentStep === 2) {
    return (
      <Step2Team
        initialData={formData.team}
        userEmailDomain={userEmail?.split("@")[1]}
        onNext={onStep2Next}
        onBack={onBack}
        onSkip={onStep2Skip}
        showSkip
      />
    );
  }

  if (currentStep === 3) {
    return (
      <Step3Preferences
        initialData={formData.preferences}
        onComplete={onStep3Complete}
        onBack={onBack}
        isSubmitting={isSubmitting}
      />
    );
  }

  return (
    <WizardComplete
      userName={firstName}
      onGoToDashboard={onGoToDashboard}
      onQuickStart={onQuickStart}
    />
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Three-step onboarding wizard with progress indicator.
 *
 * Flow:
 * 1. Profile Setup (required) - Display name, role, avatar, bio
 * 2. Team Setup (optional/skippable) - Create or join team
 * 3. Preferences (required) - Theme, notifications, default view
 * 4. Completion - Success message and quick start actions
 *
 * @example
 * ```tsx
 * const userStore = createUserSessionStore();
 * const uiStore = createUIPreferencesStore();
 *
 * <OnboardingWizard
 *   userSessionStore={userStore}
 *   uiPreferencesStore={uiStore}
 *   onComplete={() => navigate('/')}
 * />
 * ```
 */
export function OnboardingWizard({
  userSessionStore,
  uiPreferencesStore,
  initialStep = 1,
  onComplete,
}: OnboardingWizardProps): React.ReactElement {
  const navigate = useNavigate();

  // Current step state
  const [currentStep, setCurrentStep] = React.useState<WizardStep>(initialStep as WizardStep);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Get initial user data from store
  const userState = userSessionStore.getState();
  const initialProfile = buildInitialProfile(userState);

  // Form data management
  const formData = useOnboardingFormData(initialProfile, DEFAULT_TEAM, DEFAULT_PREFERENCES);

  // Get user email for display
  const userEmail = userState.user?.email;

  // Step navigation handlers
  const handleStep1Next = React.useCallback(
    (data: OnboardingProfile) => {
      formData.setProfile(data);
      setCurrentStep(2);
    },
    [formData]
  );

  const handleStep2Next = React.useCallback(
    (data: OnboardingTeam) => {
      formData.setTeam(data);
      setCurrentStep(3);
    },
    [formData]
  );

  const handleStep2Skip = React.useCallback(() => {
    // Keep default team data (or clear it)
    formData.setTeam({
      ...DEFAULT_TEAM,
      mode: "create",
    });
    setCurrentStep(3);
  }, [formData]);

  const applyUIPreferences = React.useCallback(
    (data: OnboardingPreferences) => {
      if (!uiPreferencesStore) return;
      const uiState = uiPreferencesStore.getState();
      uiState.setTheme(data.theme);
      uiState.setCompactMode(data.compactMode);
    },
    [uiPreferencesStore]
  );

  const handleStep3Complete = React.useCallback(
    async (data: OnboardingPreferences) => {
      formData.setPreferences(data);
      setIsSubmitting(true);

      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Update user session store with profile data
        userSessionStore.getState().updateProfile({
          displayName: formData.profile.displayName,
          role: formData.profile.role,
          avatarUrl: formData.profile.avatarUrl,
          bio: formData.profile.bio,
        });

        applyUIPreferences(data);

        // Mark onboarding as complete (sets isNewUser to false)
        userSessionStore.getState().completeOnboarding();

        // Move to completion screen
        setCurrentStep("complete");
      } catch (error) {
        console.error("Failed to complete onboarding:", error);
        // Could show error notification here
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, userSessionStore, applyUIPreferences]
  );

  const handleBack = React.useCallback(() => {
    const previousStep = BACK_STEP_MAP[currentStep];
    if (previousStep) {
      setCurrentStep(previousStep);
    }
  }, [currentStep]);

  const handleGoToDashboard = React.useCallback(() => {
    if (onComplete) {
      onComplete();
    } else {
      void navigate("/", { replace: true });
    }
  }, [navigate, onComplete]);

  const handleQuickStart = React.useCallback(
    (actionId: string) => {
      const route = QUICK_START_ROUTES[actionId];
      if (route) {
        void navigate(route);
      } else {
        handleGoToDashboard();
      }
    },
    [navigate, handleGoToDashboard]
  );

  // Get display name for completion screen
  const displayName = formData.profile.displayName || userState.user?.displayName || "there";
  const firstName = displayName.split(" ")[0];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8">
        {/* Progress Indicator (not shown on complete screen) */}
        {currentStep !== "complete" && (
          <WizardProgress
            currentStep={typeof currentStep === "number" ? currentStep : 4}
            steps={ONBOARDING_STEPS}
            className="mb-8"
          />
        )}

        {/* Step Content */}
        <WizardStepContent
          currentStep={currentStep}
          formData={formData}
          userEmail={userEmail}
          isSubmitting={isSubmitting}
          firstName={firstName}
          onStep1Next={handleStep1Next}
          onStep2Next={handleStep2Next}
          onBack={handleBack}
          onStep2Skip={handleStep2Skip}
          onStep3Complete={data => void handleStep3Complete(data)}
          onGoToDashboard={handleGoToDashboard}
          onQuickStart={handleQuickStart}
        />
      </div>
    </div>
  );
}
