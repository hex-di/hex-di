/**
 * Tests for Onboarding Wizard Flow
 *
 * These tests verify:
 * 1. Step navigation (next/back/skip)
 * 2. Route guard redirects returning users
 * 3. Wizard completion sets `isNewUser` flag
 * 4. Data accumulation across steps
 * 5. Form validation per step
 *
 * @packageDocumentation
 */

import * as React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";

// =============================================================================
// Test Setup - Mock localStorage
// =============================================================================

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    get length() {
      return Object.keys(store).length;
    },
  };
})();

vi.stubGlobal("localStorage", localStorageMock);

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Creates a mock new user (requires onboarding).
 */
function createMockNewUser() {
  return {
    id: "user-1",
    displayName: "Test User",
    email: "test@example.com",
    role: "developer" as const,
    avatarUrl: null,
    bio: null,
    isNewUser: true,
    createdAt: new Date(),
  };
}

/**
 * Creates a mock returning user (completed onboarding).
 */
function createMockReturningUser() {
  return {
    id: "user-1",
    displayName: "Test User",
    email: "test@example.com",
    role: "developer" as const,
    avatarUrl: null,
    bio: null,
    isNewUser: false,
    createdAt: new Date(),
  };
}

// =============================================================================
// Test 1: Step Navigation (Next/Back/Skip)
// =============================================================================

describe("Onboarding Wizard Flow", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Step Navigation", () => {
    it("should navigate from step 1 to step 2 with Next button", async () => {
      const { OnboardingWizard } =
        await import("../../src/taskflow/components/onboarding/index.js");
      const { createUserSessionStore } =
        await import("../../src/taskflow/stores/user-session-store.js");

      const store = createUserSessionStore();
      store.getState().login(createMockNewUser());

      render(
        <MemoryRouter initialEntries={["/onboarding"]}>
          <OnboardingWizard userSessionStore={store} />
        </MemoryRouter>
      );

      // Should show step 1 initially - check for form heading
      expect(screen.getByRole("heading", { name: /welcome to taskflow/i })).toBeInTheDocument();

      // Fill required fields for step 1
      const displayNameInput = screen.getByLabelText(/display name/i);
      await userEvent.type(displayNameInput, "John Doe");

      const roleSelect = screen.getByLabelText(/role/i);
      await userEvent.selectOptions(roleSelect, "developer");

      // Click Next
      const nextButton = screen.getByRole("button", { name: /next/i });
      await userEvent.click(nextButton);

      // Should show step 2 - check for team heading
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /join or create team/i })).toBeInTheDocument();
      });
    });

    it("should navigate back from step 2 to step 1", async () => {
      const { OnboardingWizard } =
        await import("../../src/taskflow/components/onboarding/index.js");
      const { createUserSessionStore } =
        await import("../../src/taskflow/stores/user-session-store.js");

      const store = createUserSessionStore();
      store.getState().login(createMockNewUser());

      render(
        <MemoryRouter initialEntries={["/onboarding"]}>
          <OnboardingWizard userSessionStore={store} initialStep={2} />
        </MemoryRouter>
      );

      // Should show step 2 - check for team heading
      expect(screen.getByRole("heading", { name: /join or create team/i })).toBeInTheDocument();

      // Click Back
      const backButton = screen.getByRole("button", { name: /back/i });
      await userEvent.click(backButton);

      // Should show step 1 - check for profile heading
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /welcome to taskflow/i })).toBeInTheDocument();
      });
    });

    it("should allow skipping optional steps", async () => {
      const { OnboardingWizard } =
        await import("../../src/taskflow/components/onboarding/index.js");
      const { createUserSessionStore } =
        await import("../../src/taskflow/stores/user-session-store.js");

      const store = createUserSessionStore();
      store.getState().login(createMockNewUser());

      render(
        <MemoryRouter initialEntries={["/onboarding"]}>
          <OnboardingWizard userSessionStore={store} initialStep={2} />
        </MemoryRouter>
      );

      // Should show step 2 (Team - optional)
      expect(screen.getByRole("heading", { name: /join or create team/i })).toBeInTheDocument();

      // Click Skip
      const skipButton = screen.getByRole("button", { name: /skip/i });
      await userEvent.click(skipButton);

      // Should show step 3 (Preferences) - check for heading
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /customize your experience/i })
        ).toBeInTheDocument();
      });
    });
  });

  // =============================================================================
  // Test 2: Route Guard Redirects Returning Users
  // =============================================================================

  describe("Route Guard", () => {
    it("should redirect returning users away from onboarding", async () => {
      const { useOnboardingGuard } =
        await import("../../src/taskflow/components/onboarding/use-onboarding-guard.js");
      const { createUserSessionStore } =
        await import("../../src/taskflow/stores/user-session-store.js");

      const store = createUserSessionStore();
      store.getState().login(createMockReturningUser());

      // Component to test the guard hook
      const navigationSpy = vi.fn();

      function TestGuardComponent() {
        const { shouldRedirect, redirectPath } = useOnboardingGuard(store);

        React.useEffect(() => {
          if (shouldRedirect) {
            navigationSpy(redirectPath);
          }
        }, [shouldRedirect, redirectPath]);

        return <div>Test</div>;
      }

      render(
        <MemoryRouter initialEntries={["/onboarding"]}>
          <TestGuardComponent />
        </MemoryRouter>
      );

      // Should trigger redirect to dashboard for returning users
      await waitFor(() => {
        expect(navigationSpy).toHaveBeenCalledWith("/");
      });
    });

    it("should allow new users to access onboarding", async () => {
      const { useOnboardingGuard } =
        await import("../../src/taskflow/components/onboarding/use-onboarding-guard.js");
      const { createUserSessionStore } =
        await import("../../src/taskflow/stores/user-session-store.js");

      const store = createUserSessionStore();
      store.getState().login(createMockNewUser());

      const navigationSpy = vi.fn();

      function TestGuardComponent() {
        const { shouldRedirect, redirectPath } = useOnboardingGuard(store);

        React.useEffect(() => {
          if (shouldRedirect) {
            navigationSpy(redirectPath);
          }
        }, [shouldRedirect, redirectPath]);

        return <div data-testid="guard-test">New User</div>;
      }

      render(
        <MemoryRouter initialEntries={["/onboarding"]}>
          <TestGuardComponent />
        </MemoryRouter>
      );

      // Should NOT trigger redirect for new users
      expect(screen.getByTestId("guard-test")).toBeInTheDocument();
      expect(navigationSpy).not.toHaveBeenCalled();
    });
  });

  // =============================================================================
  // Test 3: Wizard Completion Sets `isNewUser` Flag
  // =============================================================================

  describe("Wizard Completion", () => {
    it("should set isNewUser to false on completion", async () => {
      const { createUserSessionStore } =
        await import("../../src/taskflow/stores/user-session-store.js");

      const store = createUserSessionStore();
      const newUser = createMockNewUser();
      store.getState().login(newUser);

      // Initially isNewUser should be true
      expect(store.getState().user?.isNewUser).toBe(true);
      expect(store.getState().onboardingCompleted).toBe(false);

      // Complete onboarding
      store.getState().completeOnboarding();

      // isNewUser should now be false
      expect(store.getState().user?.isNewUser).toBe(false);
      expect(store.getState().onboardingCompleted).toBe(true);
    });

    it("should update profile data in user session store on completion", async () => {
      const { createUserSessionStore } =
        await import("../../src/taskflow/stores/user-session-store.js");

      const store = createUserSessionStore();
      store.getState().login(createMockNewUser());

      // Update profile
      store.getState().updateProfile({
        displayName: "Updated Name",
        role: "manager",
        bio: "Test bio",
      });

      // Verify profile was updated
      expect(store.getState().user?.displayName).toBe("Updated Name");
      expect(store.getState().user?.role).toBe("manager");
      expect(store.getState().user?.bio).toBe("Test bio");
    });
  });

  // =============================================================================
  // Test 4: Data Accumulation Across Steps
  // =============================================================================

  describe("Data Accumulation", () => {
    it("should preserve step 1 data when navigating to step 2 and back", async () => {
      const { OnboardingWizard } =
        await import("../../src/taskflow/components/onboarding/index.js");
      const { createUserSessionStore } =
        await import("../../src/taskflow/stores/user-session-store.js");

      const store = createUserSessionStore();
      store.getState().login(createMockNewUser());

      render(
        <MemoryRouter initialEntries={["/onboarding"]}>
          <OnboardingWizard userSessionStore={store} />
        </MemoryRouter>
      );

      // Fill step 1 data
      const displayNameInput = screen.getByLabelText(/display name/i);
      await userEvent.clear(displayNameInput);
      await userEvent.type(displayNameInput, "John Doe");

      const bioInput = screen.getByLabelText(/bio/i);
      await userEvent.type(bioInput, "Software developer");

      // Navigate to step 2
      const nextButton = screen.getByRole("button", { name: /next/i });
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /join or create team/i })).toBeInTheDocument();
      });

      // Navigate back to step 1
      const backButton = screen.getByRole("button", { name: /back/i });
      await userEvent.click(backButton);

      // Data should be preserved
      await waitFor(() => {
        const preservedNameInput = screen.getByLabelText(/display name/i);
        expect(preservedNameInput).toHaveValue("John Doe");

        const preservedBioInput = screen.getByLabelText(/bio/i);
        expect(preservedBioInput).toHaveValue("Software developer");
      });
    });

    it("should accumulate all form data from all steps", async () => {
      const { useOnboardingFormData } =
        await import("../../src/taskflow/components/onboarding/use-onboarding-form-data.js");
      const { act } = await import("@testing-library/react");

      // Test the hook directly with a ref to capture form data
      interface FormDataRef {
        current: ReturnType<typeof useOnboardingFormData> | null;
      }
      const formDataRef: FormDataRef = { current: null };

      function TestComponent() {
        const data = useOnboardingFormData();
        formDataRef.current = data;
        return <div data-testid="hook-test">Hook Test</div>;
      }

      render(<TestComponent />);

      // Verify initial render
      expect(screen.getByTestId("hook-test")).toBeInTheDocument();
      expect(formDataRef.current).not.toBeNull();

      // Set data using act for state updates
      await act(async () => {
        formDataRef.current!.setProfile({
          displayName: "Test User",
          role: "developer",
          avatarUrl: null,
          bio: "Test bio",
        });
      });

      await act(async () => {
        formDataRef.current!.setTeam({
          mode: "create",
          teamName: "Test Team",
          teamDescription: "A test team",
          inviteCode: null,
        });
      });

      await act(async () => {
        formDataRef.current!.setPreferences({
          theme: "dark",
          emailNotifications: true,
          pushNotifications: false,
          dailyDigest: false,
          defaultView: "board",
          compactMode: true,
        });
      });

      // Verify all data is accumulated (need to rerender to see updates)
      expect(formDataRef.current!.profile.displayName).toBe("Test User");
      expect(formDataRef.current!.team.teamName).toBe("Test Team");
      expect(formDataRef.current!.preferences.theme).toBe("dark");
    });
  });

  // =============================================================================
  // Test 5: Form Validation
  // =============================================================================

  describe("Form Validation", () => {
    it("should prevent navigation when required fields are empty", async () => {
      const { OnboardingWizard } =
        await import("../../src/taskflow/components/onboarding/index.js");
      const { createUserSessionStore } =
        await import("../../src/taskflow/stores/user-session-store.js");

      const store = createUserSessionStore();
      store.getState().login(createMockNewUser());

      render(
        <MemoryRouter initialEntries={["/onboarding"]}>
          <OnboardingWizard userSessionStore={store} />
        </MemoryRouter>
      );

      // Clear the display name (which should be prefilled)
      const displayNameInput = screen.getByLabelText(/display name/i);
      await userEvent.clear(displayNameInput);

      // Try to click Next without filling required fields
      const nextButton = screen.getByRole("button", { name: /next/i });
      await userEvent.click(nextButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/display name is required/i)).toBeInTheDocument();
      });

      // Should still be on step 1
      expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    });
  });
});
