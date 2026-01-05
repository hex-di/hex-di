/**
 * Tests for Zustand stores in the TaskFlow application.
 *
 * These tests verify:
 * 1. Sidebar collapse/expand state persistence
 * 2. Theme switching (light/dark/system)
 * 3. Filter state management
 * 4. User session store (mock auth)
 * 5. HexDI integration through ports
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// =============================================================================
// Test Setup
// =============================================================================

// Mock localStorage for persistence tests
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

// Apply mock before imports to ensure stores use the mock
vi.stubGlobal("localStorage", localStorageMock);

// =============================================================================
// Test 1: UI Preferences Store - Sidebar State Persistence
// =============================================================================

describe("Zustand Stores", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("UI Preferences Store", () => {
    it("should persist sidebar collapsed state to localStorage", async () => {
      const { createUIPreferencesStore } =
        await import("../../src/taskflow/stores/ui-preferences-store.js");

      const store = createUIPreferencesStore();

      // Initial state should be not collapsed
      expect(store.getState().sidebarCollapsed).toBe(false);

      // Toggle sidebar to collapsed
      store.getState().toggleSidebar();
      expect(store.getState().sidebarCollapsed).toBe(true);

      // Verify localStorage was updated
      expect(localStorageMock.setItem).toHaveBeenCalled();

      // Verify the persisted data contains the updated state
      const lastCall = localStorageMock.setItem.mock.calls.find(
        call => call[0] === "taskflow-ui-preferences"
      );
      expect(lastCall).toBeDefined();
      const persistedData = JSON.parse(lastCall![1]);
      expect(persistedData.state.sidebarCollapsed).toBe(true);
    });

    // =========================================================================
    // Test 2: Theme Switching (light/dark/system)
    // =========================================================================

    it("should switch between light, dark, and system themes", async () => {
      const { createUIPreferencesStore } =
        await import("../../src/taskflow/stores/ui-preferences-store.js");

      const store = createUIPreferencesStore();

      // Initial state should be system
      expect(store.getState().theme).toBe("system");

      // Switch to dark theme
      store.getState().setTheme("dark");
      expect(store.getState().theme).toBe("dark");

      // Switch to light theme
      store.getState().setTheme("light");
      expect(store.getState().theme).toBe("light");

      // Switch back to system
      store.getState().setTheme("system");
      expect(store.getState().theme).toBe("system");

      // Verify persistence
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Test 3: Filter State Store
  // ===========================================================================

  describe("Filter State Store", () => {
    it("should manage filter state correctly", async () => {
      const { createFilterStore } = await import("../../src/taskflow/stores/filter-store.js");

      const store = createFilterStore();

      // Initial state should match defaults
      expect(store.getState().status).toBe("all");
      expect(store.getState().priority).toBe("all");
      expect(store.getState().projectId).toBe("all");
      expect(store.getState().page).toBe(1);
      expect(store.getState().pageSize).toBe(10);

      // Set status filter
      store.getState().setStatus("todo");
      expect(store.getState().status).toBe("todo");

      // Set priority filter
      store.getState().setPriority("high");
      expect(store.getState().priority).toBe("high");

      // Set project filter
      store.getState().setProjectId("proj-1");
      expect(store.getState().projectId).toBe("proj-1");

      // Set pagination
      store.getState().setPage(2);
      expect(store.getState().page).toBe(2);

      // Reset filters should reset everything
      store.getState().resetFilters();
      expect(store.getState().status).toBe("all");
      expect(store.getState().priority).toBe("all");
      expect(store.getState().projectId).toBe("all");
      expect(store.getState().page).toBe(1);
    });
  });

  // ===========================================================================
  // Test 4: User Session Store (Mock Auth)
  // ===========================================================================

  describe("User Session Store", () => {
    it("should manage user session and authentication state", async () => {
      const { createUserSessionStore } =
        await import("../../src/taskflow/stores/user-session-store.js");

      const store = createUserSessionStore();

      // Initial state should be unauthenticated
      expect(store.getState().isAuthenticated).toBe(false);
      expect(store.getState().user).toBe(null);

      // Login with a mock user
      const mockUser = {
        id: "user-1",
        displayName: "Test User",
        email: "test@example.com",
        role: "developer" as const,
        avatarUrl: null,
        bio: null,
        isNewUser: true,
        createdAt: new Date(),
      };

      store.getState().login(mockUser);
      expect(store.getState().isAuthenticated).toBe(true);
      expect(store.getState().user).toEqual(mockUser);
      expect(store.getState().user?.isNewUser).toBe(true);

      // Complete onboarding
      store.getState().completeOnboarding();
      expect(store.getState().user?.isNewUser).toBe(false);
      expect(store.getState().onboardingCompleted).toBe(true);

      // Logout
      store.getState().logout();
      expect(store.getState().isAuthenticated).toBe(false);
      expect(store.getState().user).toBe(null);
    });
  });

  // ===========================================================================
  // Test 5: HexDI Integration through Ports
  // ===========================================================================

  describe("HexDI Integration", () => {
    it("should expose stores through HexDI ports with correct typing", async () => {
      const { UIPreferencesStorePort, FilterStorePort, UserSessionStorePort } =
        await import("../../src/taskflow/stores/ports.js");

      const { UIPreferencesStoreAdapter, FilterStoreAdapter, UserSessionStoreAdapter } =
        await import("../../src/taskflow/stores/adapters.js");

      // Verify port names are correctly defined
      expect(UIPreferencesStorePort.__portName).toBe("UIPreferencesStore");
      expect(FilterStorePort.__portName).toBe("FilterStore");
      expect(UserSessionStorePort.__portName).toBe("UserSessionStore");

      // Verify adapters provide the correct ports
      expect(UIPreferencesStoreAdapter.provides).toBe(UIPreferencesStorePort);
      expect(FilterStoreAdapter.provides).toBe(FilterStorePort);
      expect(UserSessionStoreAdapter.provides).toBe(UserSessionStorePort);

      // Verify adapters have correct lifetime
      expect(UIPreferencesStoreAdapter.lifetime).toBe("singleton");
      expect(FilterStoreAdapter.lifetime).toBe("singleton");
      expect(UserSessionStoreAdapter.lifetime).toBe("singleton");
    });
  });
});
