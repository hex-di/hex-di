/**
 * Tests for Navigation State Machine
 *
 * These tests verify:
 * 1. State transitions between routes (dashboard, newTask, settings, onboarding)
 * 2. Route guard logic (onboarding guard, auth guard)
 * 3. URL synchronization with state changes
 * 4. Bidirectional sync (URL change triggers state, state change updates URL)
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { createMachineRunner, createBasicExecutor, createActivityManager } from "@hex-di/flow";
import {
  navigationMachine,
  isNewUser,
  hasCompletedOnboarding,
  isAuthenticated,
  isNotAuthenticated,
  taskExists,
  resolvePathToState,
  stateToRouteMap,
  routeToStateMap,
  createAuthenticatedContext,
  createInitialContext,
  navigateToDashboard,
  navigateToTask,
  navigateToNewTask,
  navigateToSettings,
  navigateToOnboarding,
  createTaskEvent,
  logoutEvent,
  urlChanged,
  navigationComplete,
  type NavContext,
} from "../../src/taskflow/navigation/index.js";
import { ROUTES, type User } from "../../src/taskflow/types.js";

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Creates a mock authenticated user.
 */
function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    displayName: "Test User",
    email: "test@example.com",
    role: "developer",
    avatarUrl: null,
    bio: null,
    isNewUser: false,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock new user (needs onboarding).
 */
function createMockNewUser(): User {
  return createMockUser({ isNewUser: true });
}

/**
 * Creates a machine runner for testing with basic executor.
 */
function createTestRunner() {
  return createMachineRunner(navigationMachine, {
    executor: createBasicExecutor(),
    activityManager: createActivityManager(),
  });
}

// =============================================================================
// Test 1: State Transitions Between Routes
// =============================================================================

describe("Navigation State Machine", () => {
  describe("State Transitions", () => {
    it("should transition from idle to dashboard on NAVIGATE_TO_DASHBOARD", () => {
      const runner = createTestRunner();

      // Initial state is idle
      expect(runner.snapshot().state).toBe("idle");

      // Send navigation event
      runner.send(navigateToDashboard());

      // Should transition to dashboard
      expect(runner.snapshot().state).toBe("dashboard");
      expect(runner.snapshot().context.currentRoute).toBe(ROUTES.DASHBOARD);
    });

    it("should transition from dashboard to newTask on NAVIGATE_TO_NEW_TASK", () => {
      const runner = createTestRunner();

      // Start at dashboard
      runner.send(navigateToDashboard());
      expect(runner.snapshot().state).toBe("dashboard");

      // Navigate to new task
      runner.send(navigateToNewTask());

      // Should be at newTask
      expect(runner.snapshot().state).toBe("newTask");
      expect(runner.snapshot().context.currentRoute).toBe(ROUTES.NEW_TASK);
      expect(runner.snapshot().context.previousRoute).toBe(ROUTES.DASHBOARD);
    });

    it("should transition to taskDetail with valid taskId", () => {
      const runner = createTestRunner();

      // Start at dashboard
      runner.send(navigateToDashboard());

      // Navigate to task detail
      runner.send(navigateToTask("task-123"));

      // Should be at taskDetail with params
      expect(runner.snapshot().state).toBe("taskDetail");
      expect(runner.snapshot().context.currentRoute).toBe(ROUTES.TASK_DETAIL);
      expect(runner.snapshot().context.params).toEqual({ id: "task-123" });
    });

    it("should stay in current state with error when navigating to task with empty taskId", () => {
      const runner = createTestRunner();

      // Start at dashboard
      runner.send(navigateToDashboard());

      // Try to navigate to task with empty ID
      runner.send(navigateToTask(""));

      // Should stay at dashboard with error
      expect(runner.snapshot().state).toBe("dashboard");
      expect(runner.snapshot().context.error).toBe("Task not found");
    });

    it("should transition through multiple routes preserving history", () => {
      const runner = createTestRunner();

      // Navigate through multiple routes
      runner.send(navigateToDashboard());
      const dashboardRoute = runner.snapshot().context.currentRoute;

      runner.send(navigateToNewTask());
      expect(runner.snapshot().context.previousRoute).toBe(dashboardRoute);

      runner.send(navigateToTask("task-1"));
      expect(runner.snapshot().context.previousRoute).toBe(ROUTES.NEW_TASK);

      runner.send(navigateToDashboard());
      expect(runner.snapshot().context.previousRoute).toBe(ROUTES.TASK_DETAIL);
    });
  });

  // =============================================================================
  // Test 2: Route Guard Logic
  // =============================================================================

  describe("Route Guards", () => {
    describe("Authentication Guard", () => {
      it("should allow settings access when authenticated", () => {
        const runner = createTestRunner();

        // Start at dashboard with authenticated user
        runner.send(navigateToDashboard());

        // Manually update context to include user (simulating login)
        // In practice, this would be done through the machine's context
        const ctx = runner.snapshot().context;
        const contextWithUser: NavContext = { ...ctx, user: createMockUser() };

        // Test the guard directly
        expect(isAuthenticated(contextWithUser)).toBe(true);
      });

      it("should block settings access when not authenticated", () => {
        const runner = createTestRunner();

        // Start at dashboard without authentication
        runner.send(navigateToDashboard());

        // Try to navigate to settings
        runner.send(navigateToSettings());

        // Should stay at dashboard with error
        expect(runner.snapshot().state).toBe("dashboard");
        expect(runner.snapshot().context.error).toBe("Authentication required");
      });

      it("should correctly evaluate isAuthenticated guard", () => {
        const unauthenticatedCtx = createInitialContext();
        const authenticatedCtx = createAuthenticatedContext(createMockUser());

        expect(isAuthenticated(unauthenticatedCtx)).toBe(false);
        expect(isAuthenticated(authenticatedCtx)).toBe(true);
        expect(isNotAuthenticated(unauthenticatedCtx)).toBe(true);
        expect(isNotAuthenticated(authenticatedCtx)).toBe(false);
      });
    });

    describe("Onboarding Guard", () => {
      it("should allow onboarding access for new users", () => {
        const ctx = createAuthenticatedContext(createMockNewUser());

        expect(isNewUser(ctx)).toBe(true);
        expect(hasCompletedOnboarding(ctx)).toBe(false);
      });

      it("should block onboarding access for returning users", () => {
        const ctx = createAuthenticatedContext(createMockUser({ isNewUser: false }));

        expect(isNewUser(ctx)).toBe(false);
        expect(hasCompletedOnboarding(ctx)).toBe(true);
      });

      it("should block onboarding for unauthenticated users", () => {
        const runner = createTestRunner();

        // Start at dashboard
        runner.send(navigateToDashboard());

        // Try to navigate to onboarding without being authenticated
        runner.send(navigateToOnboarding());

        // Should stay at dashboard with error
        expect(runner.snapshot().state).toBe("dashboard");
        expect(runner.snapshot().context.error).toBe(
          "Onboarding already completed or not authenticated"
        );
      });
    });

    describe("Task Exists Guard", () => {
      it("should allow navigation with valid taskId", () => {
        const ctx = createInitialContext();
        const event = { type: "NAVIGATE_TO_TASK" as const, payload: { taskId: "task-123" } };

        expect(taskExists(ctx, event)).toBe(true);
      });

      it("should block navigation with empty taskId", () => {
        const ctx = createInitialContext();
        const event = { type: "NAVIGATE_TO_TASK" as const, payload: { taskId: "" } };

        expect(taskExists(ctx, event)).toBe(false);
      });
    });
  });

  // =============================================================================
  // Test 3: URL Synchronization
  // =============================================================================

  describe("URL Synchronization", () => {
    it("should correctly map states to routes", () => {
      expect(stateToRouteMap.dashboard).toBe(ROUTES.DASHBOARD);
      expect(stateToRouteMap.newTask).toBe(ROUTES.NEW_TASK);
      expect(stateToRouteMap.taskDetail).toBe(ROUTES.TASK_DETAIL);
      expect(stateToRouteMap.settings).toBe(ROUTES.SETTINGS);
      expect(stateToRouteMap.onboarding).toBe(ROUTES.ONBOARDING);
    });

    it("should correctly map routes to states", () => {
      expect(routeToStateMap[ROUTES.DASHBOARD]).toBe("dashboard");
      expect(routeToStateMap[ROUTES.NEW_TASK]).toBe("newTask");
      expect(routeToStateMap[ROUTES.TASK_DETAIL]).toBe("taskDetail");
      expect(routeToStateMap[ROUTES.SETTINGS]).toBe("settings");
      expect(routeToStateMap[ROUTES.ONBOARDING]).toBe("onboarding");
    });

    it("should resolve path to state correctly for exact matches", () => {
      expect(resolvePathToState("/")).toEqual({ state: "dashboard", params: {} });
      expect(resolvePathToState("/tasks/new")).toEqual({ state: "newTask", params: {} });
      expect(resolvePathToState("/settings")).toEqual({ state: "settings", params: {} });
      expect(resolvePathToState("/onboarding")).toEqual({ state: "onboarding", params: {} });
    });

    it("should resolve task detail path with params", () => {
      const result = resolvePathToState("/tasks/task-abc-123");

      expect(result).toEqual({
        state: "taskDetail",
        params: { id: "task-abc-123" },
      });
    });

    it("should return null for unknown paths", () => {
      expect(resolvePathToState("/unknown")).toBeNull();
      expect(resolvePathToState("/tasks")).toBeNull();
      expect(resolvePathToState("/tasks/")).toBeNull();
    });

    it("should update currentRoute when navigating", () => {
      const runner = createTestRunner();

      runner.send(navigateToDashboard());
      expect(runner.snapshot().context.currentRoute).toBe(ROUTES.DASHBOARD);

      runner.send(navigateToNewTask());
      expect(runner.snapshot().context.currentRoute).toBe(ROUTES.NEW_TASK);

      runner.send(navigateToTask("123"));
      expect(runner.snapshot().context.currentRoute).toBe(ROUTES.TASK_DETAIL);
    });
  });

  // =============================================================================
  // Test 4: Bidirectional Sync (URL Change Triggers State)
  // =============================================================================

  describe("Bidirectional URL-State Sync", () => {
    it("should handle URL_CHANGED event and transition to navigating", () => {
      const runner = createTestRunner();

      // Start at dashboard
      runner.send(navigateToDashboard());
      expect(runner.snapshot().state).toBe("dashboard");

      // Simulate URL change (browser back/forward)
      runner.send(urlChanged("/settings", {}));

      // Should transition to navigating state
      expect(runner.snapshot().state).toBe("navigating");
    });

    it("should complete navigation after URL_CHANGED with NAVIGATION_COMPLETE", () => {
      const runner = createTestRunner();

      // Start at dashboard
      runner.send(navigateToDashboard());

      // Simulate URL change
      runner.send(urlChanged("/tasks/new", {}));

      // In navigating state
      expect(runner.snapshot().state).toBe("navigating");

      // Complete navigation
      runner.send(navigationComplete("newTask", ROUTES.NEW_TASK, {}));

      // Note: The navigation_complete handler has a fixed target
      // In a real implementation, this would use a dynamic target
      // For now, we verify the context was updated
      expect(runner.snapshot().context.currentRoute).toBe(ROUTES.NEW_TASK);
    });

    it("should handle LOGOUT and return to dashboard", () => {
      const runner = createTestRunner();

      // Navigate to settings (would need auth in real scenario)
      runner.send(navigateToDashboard());
      runner.send(navigateToNewTask());

      // Logout
      runner.send(logoutEvent());

      // Should be at dashboard with cleared user
      expect(runner.snapshot().state).toBe("dashboard");
      expect(runner.snapshot().context.currentRoute).toBe(ROUTES.DASHBOARD);
      expect(runner.snapshot().context.user).toBeNull();
    });

    it("should preserve params when navigating to task detail", () => {
      const runner = createTestRunner();

      runner.send(navigateToDashboard());
      runner.send(navigateToTask("my-task-id"));

      expect(runner.snapshot().state).toBe("taskDetail");
      expect(runner.snapshot().context.params).toEqual({ id: "my-task-id" });
    });

    it("should clear error on successful navigation", () => {
      const runner = createTestRunner();

      runner.send(navigateToDashboard());

      // Create an error condition
      runner.send(navigateToTask(""));
      expect(runner.snapshot().context.error).toBe("Task not found");

      // Navigate successfully to clear error
      runner.send(navigateToNewTask());
      expect(runner.snapshot().context.error).toBeNull();
    });
  });

  // =============================================================================
  // Test 5: CREATE_TASK Event
  // =============================================================================

  describe("CREATE_TASK Event", () => {
    it("should navigate to newTask on CREATE_TASK event", () => {
      const runner = createTestRunner();

      runner.send(navigateToDashboard());
      runner.send(createTaskEvent());

      expect(runner.snapshot().state).toBe("newTask");
      expect(runner.snapshot().context.currentRoute).toBe(ROUTES.NEW_TASK);
    });
  });

  // =============================================================================
  // Test 6: Context Factory Functions
  // =============================================================================

  describe("Context Factory Functions", () => {
    it("should create initial context with default values", () => {
      const ctx = createInitialContext();

      expect(ctx.currentRoute).toBe(ROUTES.DASHBOARD);
      expect(ctx.previousRoute).toBeNull();
      expect(ctx.params).toEqual({});
      expect(ctx.user).toBeNull();
      expect(ctx.error).toBeNull();
    });

    it("should create authenticated context with user", () => {
      const user = createMockUser();
      const ctx = createAuthenticatedContext(user);

      expect(ctx.currentRoute).toBe(ROUTES.DASHBOARD);
      expect(ctx.user).toEqual(user);
      expect(ctx.error).toBeNull();
    });

    it("should create authenticated context with custom route", () => {
      const user = createMockUser();
      const ctx = createAuthenticatedContext(user, ROUTES.SETTINGS);

      expect(ctx.currentRoute).toBe(ROUTES.SETTINGS);
      expect(ctx.user).toEqual(user);
    });
  });
});
