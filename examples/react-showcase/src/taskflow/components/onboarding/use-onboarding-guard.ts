/**
 * Hook for onboarding route guard logic.
 *
 * Determines whether users should be redirected based on their
 * onboarding status. New users are allowed to access onboarding,
 * returning users are redirected to the dashboard.
 *
 * @packageDocumentation
 */

import * as React from "react";
import type { UserSessionStoreInstance } from "../../stores/user-session-store.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Return type for useOnboardingGuard hook.
 */
export interface OnboardingGuardResult {
  /** Whether the user should be redirected */
  readonly shouldRedirect: boolean;
  /** Path to redirect to (only valid if shouldRedirect is true) */
  readonly redirectPath: string;
  /** Whether the guard is still determining the redirect status */
  readonly isLoading: boolean;
  /** Whether the user is authenticated */
  readonly isAuthenticated: boolean;
  /** Whether the user is a new user */
  readonly isNewUser: boolean;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook that provides onboarding route guard logic.
 *
 * Determines whether the current user should be allowed to access
 * the onboarding route or should be redirected elsewhere.
 *
 * Guard logic:
 * - Unauthenticated users: redirect to dashboard (login would happen there)
 * - New users (isNewUser = true): allow access to onboarding
 * - Returning users (isNewUser = false): redirect to dashboard
 *
 * @param store - User session store instance
 * @returns Guard result with redirect information
 *
 * @example
 * ```tsx
 * function OnboardingPage() {
 *   const navigate = useNavigate();
 *   const store = useUserSessionStore();
 *   const { shouldRedirect, redirectPath } = useOnboardingGuard(store);
 *
 *   React.useEffect(() => {
 *     if (shouldRedirect) {
 *       navigate(redirectPath, { replace: true });
 *     }
 *   }, [shouldRedirect, redirectPath, navigate]);
 *
 *   if (shouldRedirect) {
 *     return null; // or loading spinner
 *   }
 *
 *   return <OnboardingWizard />;
 * }
 * ```
 */
export function useOnboardingGuard(store: UserSessionStoreInstance): OnboardingGuardResult {
  const [state, setState] = React.useState<OnboardingGuardResult>({
    shouldRedirect: false,
    redirectPath: "/",
    isLoading: true,
    isAuthenticated: false,
    isNewUser: false,
  });

  React.useEffect(() => {
    // Get initial state
    const currentState = store.getState();
    const isAuthenticated = currentState.isAuthenticated;
    const isNewUser = currentState.user?.isNewUser ?? false;
    const onboardingCompleted = currentState.onboardingCompleted;

    // Determine redirect logic
    let shouldRedirect = false;
    let redirectPath = "/";

    if (!isAuthenticated) {
      // Not authenticated - redirect to dashboard (login would happen there)
      shouldRedirect = true;
      redirectPath = "/";
    } else if (!isNewUser || onboardingCompleted) {
      // Returning user or already completed onboarding - redirect to dashboard
      shouldRedirect = true;
      redirectPath = "/";
    }
    // else: New user who hasn't completed onboarding - allow access

    setState({
      shouldRedirect,
      redirectPath,
      isLoading: false,
      isAuthenticated,
      isNewUser,
    });

    // Subscribe to store changes
    const unsubscribe = store.subscribe(newState => {
      const newIsAuthenticated = newState.isAuthenticated;
      const newIsNewUser = newState.user?.isNewUser ?? false;
      const newOnboardingCompleted = newState.onboardingCompleted;

      let newShouldRedirect = false;
      let newRedirectPath = "/";

      if (!newIsAuthenticated) {
        newShouldRedirect = true;
        newRedirectPath = "/";
      } else if (!newIsNewUser || newOnboardingCompleted) {
        newShouldRedirect = true;
        newRedirectPath = "/";
      }

      setState({
        shouldRedirect: newShouldRedirect,
        redirectPath: newRedirectPath,
        isLoading: false,
        isAuthenticated: newIsAuthenticated,
        isNewUser: newIsNewUser,
      });
    });

    return () => {
      unsubscribe();
    };
  }, [store]);

  return state;
}

/**
 * Hook that provides reverse onboarding guard logic.
 *
 * Determines whether new users should be redirected TO onboarding
 * when they try to access other routes.
 *
 * @param store - User session store instance
 * @returns Guard result with redirect information
 *
 * @example
 * ```tsx
 * function DashboardPage() {
 *   const navigate = useNavigate();
 *   const store = useUserSessionStore();
 *   const { shouldRedirectToOnboarding } = useNewUserGuard(store);
 *
 *   React.useEffect(() => {
 *     if (shouldRedirectToOnboarding) {
 *       navigate('/onboarding', { replace: true });
 *     }
 *   }, [shouldRedirectToOnboarding, navigate]);
 *
 *   return <Dashboard />;
 * }
 * ```
 */
export function useNewUserGuard(store: UserSessionStoreInstance): {
  readonly shouldRedirectToOnboarding: boolean;
  readonly isLoading: boolean;
} {
  const [state, setState] = React.useState({
    shouldRedirectToOnboarding: false,
    isLoading: true,
  });

  React.useEffect(() => {
    const currentState = store.getState();
    const isAuthenticated = currentState.isAuthenticated;
    const isNewUser = currentState.user?.isNewUser ?? false;
    const onboardingCompleted = currentState.onboardingCompleted;

    // New authenticated users who haven't completed onboarding should be redirected
    const shouldRedirect = isAuthenticated && isNewUser && !onboardingCompleted;

    setState({
      shouldRedirectToOnboarding: shouldRedirect,
      isLoading: false,
    });

    const unsubscribe = store.subscribe(newState => {
      const newIsAuthenticated = newState.isAuthenticated;
      const newIsNewUser = newState.user?.isNewUser ?? false;
      const newOnboardingCompleted = newState.onboardingCompleted;

      const newShouldRedirect = newIsAuthenticated && newIsNewUser && !newOnboardingCompleted;

      setState({
        shouldRedirectToOnboarding: newShouldRedirect,
        isLoading: false,
      });
    });

    return () => {
      unsubscribe();
    };
  }, [store]);

  return state;
}
