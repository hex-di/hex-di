/**
 * User Session Zustand Store
 *
 * Manages user session state for mock authentication including:
 * - User profile (id, name, email, isNewUser)
 * - Authentication status (authenticated/unauthenticated)
 * - Onboarding completion status
 *
 * This is a mock auth implementation for the showcase.
 * In a real application, this would integrate with an actual auth provider.
 *
 * @packageDocumentation
 */

import { createStore } from "zustand/vanilla";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "../types.js";

// =============================================================================
// State Type
// =============================================================================

/**
 * Authentication status type.
 */
export type AuthStatus = "authenticated" | "unauthenticated";

/**
 * State shape for the user session store.
 */
export interface UserSessionState {
  /** Current user, null if not authenticated */
  readonly user: User | null;
  /** Authentication status */
  readonly isAuthenticated: boolean;
  /** Whether onboarding has been completed */
  readonly onboardingCompleted: boolean;
}

/**
 * Actions available on the user session store.
 */
export interface UserSessionActions {
  /** Login with a user */
  login: (user: User) => void;
  /** Logout the current user */
  logout: () => void;
  /** Update the current user's profile */
  updateProfile: (updates: Partial<Omit<User, "id" | "createdAt">>) => void;
  /** Mark onboarding as completed */
  completeOnboarding: () => void;
  /** Reset the session state */
  reset: () => void;
}

/**
 * Combined store type for user session.
 */
export type UserSessionStore = UserSessionState & UserSessionActions;

// =============================================================================
// Initial State
// =============================================================================

const initialState: UserSessionState = {
  user: null,
  isAuthenticated: false,
  onboardingCompleted: false,
};

// =============================================================================
// Store Creation
// =============================================================================

/**
 * Creates a vanilla Zustand store for user session management.
 *
 * This is a "vanilla" store that works without React.
 * It can be used in HexDI adapters and registered with the container.
 *
 * The store automatically persists to localStorage to maintain session
 * across page reloads. In production, session tokens would be validated
 * on app startup.
 *
 * @example
 * ```typescript
 * const store = createUserSessionStore();
 *
 * // Subscribe to changes
 * store.subscribe((state) => console.log(state.isAuthenticated));
 *
 * // Login
 * store.getState().login({
 *   id: 'user-1',
 *   displayName: 'John Doe',
 *   email: 'john@example.com',
 *   role: 'developer',
 *   avatarUrl: null,
 *   bio: null,
 *   isNewUser: true,
 *   createdAt: new Date(),
 * });
 *
 * // Complete onboarding
 * store.getState().completeOnboarding();
 *
 * // Logout
 * store.getState().logout();
 * ```
 */
export function createUserSessionStore() {
  return createStore<UserSessionStore>()(
    persist(
      set => ({
        ...initialState,

        login: (user: User) => {
          set({
            user,
            isAuthenticated: true,
            onboardingCompleted: !user.isNewUser,
          });
        },

        logout: () => {
          set(initialState);
        },

        updateProfile: (updates: Partial<Omit<User, "id" | "createdAt">>) => {
          set(state => {
            if (state.user === null) {
              return state;
            }
            return {
              user: {
                ...state.user,
                ...updates,
              },
            };
          });
        },

        completeOnboarding: () => {
          set(state => {
            if (state.user === null) {
              return { onboardingCompleted: true };
            }
            return {
              onboardingCompleted: true,
              user: {
                ...state.user,
                isNewUser: false,
              },
            };
          });
        },

        reset: () => {
          set(initialState);
        },
      }),
      {
        name: "taskflow-user-session",
        storage: createJSONStorage(() => localStorage),
        // Revive dates when loading from storage
        onRehydrateStorage: () => state => {
          if (state?.user?.createdAt) {
            // Date serialization handled automatically by JSON
            // but we keep this hook for potential future transformations
          }
        },
        partialize: state => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          onboardingCompleted: state.onboardingCompleted,
        }),
      }
    )
  );
}

/**
 * Type for the store instance.
 */
export type UserSessionStoreInstance = ReturnType<typeof createUserSessionStore>;
