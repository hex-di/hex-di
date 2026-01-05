/**
 * Hook for managing onboarding form data across steps.
 *
 * Provides state management for accumulating form data as the user
 * progresses through the onboarding wizard steps.
 *
 * @packageDocumentation
 */

import * as React from "react";
import type {
  OnboardingProfile,
  OnboardingTeam,
  OnboardingPreferences,
  OnboardingFormData,
} from "../../types.js";

// =============================================================================
// Default Values
// =============================================================================

/**
 * Default profile data.
 */
export const DEFAULT_PROFILE: OnboardingProfile = {
  displayName: "",
  role: "developer",
  avatarUrl: null,
  bio: null,
};

/**
 * Default team data.
 */
export const DEFAULT_TEAM: OnboardingTeam = {
  mode: "create",
  teamName: null,
  teamDescription: null,
  inviteCode: null,
};

/**
 * Default preferences data.
 */
export const DEFAULT_PREFERENCES: OnboardingPreferences = {
  theme: "system",
  emailNotifications: true,
  pushNotifications: true,
  dailyDigest: false,
  defaultView: "board",
  compactMode: false,
};

// =============================================================================
// Hook Return Type
// =============================================================================

/**
 * Return type for useOnboardingFormData hook.
 */
export interface OnboardingFormDataHook {
  /** Current profile data */
  readonly profile: OnboardingProfile;
  /** Current team data */
  readonly team: OnboardingTeam;
  /** Current preferences data */
  readonly preferences: OnboardingPreferences;
  /** Update profile data */
  readonly setProfile: (data: OnboardingProfile) => void;
  /** Update team data */
  readonly setTeam: (data: OnboardingTeam) => void;
  /** Update preferences data */
  readonly setPreferences: (data: OnboardingPreferences) => void;
  /** Get complete form data */
  readonly getFormData: () => OnboardingFormData;
  /** Reset all form data to defaults */
  readonly reset: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for managing onboarding form data.
 *
 * Maintains state for all three wizard steps and provides setters
 * for each step's data along with a way to get the complete form data.
 *
 * @param initialProfile - Optional initial profile data
 * @param initialTeam - Optional initial team data
 * @param initialPreferences - Optional initial preferences data
 * @returns Form data state and setters
 *
 * @example
 * ```tsx
 * function OnboardingWizard() {
 *   const formData = useOnboardingFormData();
 *
 *   const handleStep1Complete = (profile: OnboardingProfile) => {
 *     formData.setProfile(profile);
 *     goToNextStep();
 *   };
 *
 *   const handleComplete = () => {
 *     const allData = formData.getFormData();
 *     submitOnboarding(allData);
 *   };
 *
 *   return (
 *     <Step1Profile
 *       initialData={formData.profile}
 *       onNext={handleStep1Complete}
 *     />
 *   );
 * }
 * ```
 */
export function useOnboardingFormData(
  initialProfile: OnboardingProfile = DEFAULT_PROFILE,
  initialTeam: OnboardingTeam = DEFAULT_TEAM,
  initialPreferences: OnboardingPreferences = DEFAULT_PREFERENCES
): OnboardingFormDataHook {
  const [profile, setProfile] = React.useState<OnboardingProfile>(initialProfile);
  const [team, setTeam] = React.useState<OnboardingTeam>(initialTeam);
  const [preferences, setPreferences] = React.useState<OnboardingPreferences>(initialPreferences);

  const getFormData = React.useCallback((): OnboardingFormData => {
    return {
      profile,
      team,
      preferences,
    };
  }, [profile, team, preferences]);

  const reset = React.useCallback(() => {
    setProfile(DEFAULT_PROFILE);
    setTeam(DEFAULT_TEAM);
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  return {
    profile,
    team,
    preferences,
    setProfile,
    setTeam,
    setPreferences,
    getFormData,
    reset,
  };
}
