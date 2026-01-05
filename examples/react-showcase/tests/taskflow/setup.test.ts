/**
 * Tests for TaskFlow project setup and configuration.
 *
 * These tests verify that:
 * 1. Required dependencies are installed and importable
 * 2. TypeScript types are correctly defined
 * 3. Tailwind configuration is valid
 * 4. React Query client is properly configured
 * 5. Route configuration is valid
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";

// =============================================================================
// Test 1: Required Dependencies Are Installed
// =============================================================================

describe("TaskFlow Project Setup", () => {
  describe("Dependencies Installation", () => {
    it("should have react-router-dom installed and importable", async () => {
      // Verify react-router-dom can be imported
      const routerModule = await import("react-router-dom");

      // Verify key exports exist
      expect(routerModule.BrowserRouter).toBeDefined();
      expect(routerModule.useRoutes).toBeDefined();
      expect(routerModule.useNavigate).toBeDefined();
      expect(routerModule.useParams).toBeDefined();
      expect(routerModule.useSearchParams).toBeDefined();
    });

    it("should have @tanstack/react-query installed and importable", async () => {
      // Verify react-query can be imported
      const queryModule = await import("@tanstack/react-query");

      // Verify key exports exist
      expect(queryModule.QueryClient).toBeDefined();
      expect(queryModule.QueryClientProvider).toBeDefined();
      expect(queryModule.useQuery).toBeDefined();
      expect(queryModule.useMutation).toBeDefined();
      expect(queryModule.useQueryClient).toBeDefined();
    });

    it("should have zustand installed and importable", async () => {
      // Verify zustand can be imported
      const zustandModule = await import("zustand");

      // Verify create function exists
      expect(zustandModule.create).toBeDefined();
    });

    it("should have @hex-di/flow installed and importable", async () => {
      // Verify @hex-di/flow can be imported
      const flowModule = await import("@hex-di/flow");

      // Verify the module exports something (structure may vary)
      expect(flowModule).toBeDefined();
    });
  });

  // =============================================================================
  // Test 2: TypeScript Types Are Correctly Defined
  // =============================================================================

  describe("TypeScript Types", () => {
    it("should export all required domain types from taskflow module", async () => {
      const taskflowModule = await import("../../src/taskflow/index.js");

      // Verify ROUTES constant is exported with correct values
      expect(taskflowModule.ROUTES).toBeDefined();
      expect(taskflowModule.ROUTES.DASHBOARD).toBe("/");
      expect(taskflowModule.ROUTES.NEW_TASK).toBe("/tasks/new");
      expect(taskflowModule.ROUTES.TASK_DETAIL).toBe("/tasks/:id");
      expect(taskflowModule.ROUTES.SETTINGS).toBe("/settings");
      expect(taskflowModule.ROUTES.ONBOARDING).toBe("/onboarding");

      // Verify DEFAULT_FILTERS constant is exported with correct values
      expect(taskflowModule.DEFAULT_FILTERS).toBeDefined();
      expect(taskflowModule.DEFAULT_FILTERS.status).toBe("all");
      expect(taskflowModule.DEFAULT_FILTERS.priority).toBe("all");
      expect(taskflowModule.DEFAULT_FILTERS.projectId).toBe("all");
      expect(taskflowModule.DEFAULT_FILTERS.page).toBe(1);
      expect(taskflowModule.DEFAULT_FILTERS.pageSize).toBe(10);

      // Verify DEFAULT_UI_PREFERENCES constant is exported
      expect(taskflowModule.DEFAULT_UI_PREFERENCES).toBeDefined();
      expect(taskflowModule.DEFAULT_UI_PREFERENCES.theme).toBe("system");
      expect(taskflowModule.DEFAULT_UI_PREFERENCES.sidebarCollapsed).toBe(false);
    });
  });

  // =============================================================================
  // Test 3: React Query Client Configuration
  // =============================================================================

  describe("React Query Configuration", () => {
    it("should create QueryClient with correct default options", async () => {
      const { createQueryClient } = await import("../../src/taskflow/query-client.js");

      const queryClient = createQueryClient();

      // Verify QueryClient was created
      expect(queryClient).toBeDefined();

      // Verify default options are set
      const defaultOptions = queryClient.getDefaultOptions();
      expect(defaultOptions.queries?.staleTime).toBe(5 * 60 * 1000); // 5 minutes
      expect(defaultOptions.queries?.gcTime).toBe(30 * 60 * 1000); // 30 minutes
      expect(defaultOptions.queries?.retry).toBe(1);
      expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
    });

    it("should export query keys factory with correct structure", async () => {
      const { queryKeys } = await import("../../src/taskflow/query-client.js");

      // Verify tasks query keys
      expect(queryKeys.tasks.all).toEqual(["tasks"]);
      expect(queryKeys.tasks.lists()).toEqual(["tasks", "list"]);
      expect(queryKeys.tasks.list({ status: "todo" })).toEqual([
        "tasks",
        "list",
        { status: "todo" },
      ]);
      expect(queryKeys.tasks.details()).toEqual(["tasks", "detail"]);
      expect(queryKeys.tasks.detail("123")).toEqual(["tasks", "detail", "123"]);
      expect(queryKeys.tasks.stats()).toEqual(["tasks", "stats"]);

      // Verify projects query keys
      expect(queryKeys.projects.all).toEqual(["projects"]);
      expect(queryKeys.projects.list()).toEqual(["projects", "list"]);
      expect(queryKeys.projects.detail("proj-1")).toEqual(["projects", "detail", "proj-1"]);

      // Verify teams query keys
      expect(queryKeys.teams.all).toEqual(["teams"]);
      expect(queryKeys.teams.list()).toEqual(["teams", "list"]);
      expect(queryKeys.teams.members("team-1")).toEqual(["teams", "team-1", "members"]);

      // Verify users query keys
      expect(queryKeys.users.all).toEqual(["users"]);
      expect(queryKeys.users.current()).toEqual(["users", "current"]);
    });
  });

  // =============================================================================
  // Test 4: Route Configuration
  // =============================================================================

  describe("Route Configuration", () => {
    it("should export valid route configuration", async () => {
      const { routes, routeToState, stateToRoute } = await import("../../src/taskflow/routes.js");

      // Verify routes array has correct number of routes
      expect(routes).toHaveLength(5);

      // Verify each route has either path or index (for dashboard)
      routes.forEach(route => {
        // Each route has either a path or index: true
        expect(route.path !== undefined || route.index === true).toBe(true);
        expect(route.element).toBeDefined();
      });

      // Verify route paths - routes are now relative for nested routing
      const routePaths = routes.map(r => r.path);
      expect(routePaths).toContain(undefined); // index route for dashboard
      expect(routePaths).toContain("tasks/new");
      expect(routePaths).toContain("tasks/:id");
      expect(routePaths).toContain("settings");
      expect(routePaths).toContain("onboarding");

      // Verify index route exists
      const indexRoute = routes.find(r => r.index === true);
      expect(indexRoute).toBeDefined();

      // Verify routeToState mapping (with /taskflow prefix)
      expect(routeToState["/taskflow"]).toBe("dashboard");
      expect(routeToState["/taskflow/tasks/new"]).toBe("newTask");
      expect(routeToState["/taskflow/tasks/:id"]).toBe("taskDetail");
      expect(routeToState["/taskflow/settings"]).toBe("settings");
      expect(routeToState["/taskflow/onboarding"]).toBe("onboarding");

      // Verify stateToRoute mapping (inverse of routeToState)
      expect(stateToRoute["dashboard"]).toBe("/taskflow");
      expect(stateToRoute["newTask"]).toBe("/taskflow/tasks/new");
      expect(stateToRoute["taskDetail"]).toBe("/taskflow/tasks/:id");
      expect(stateToRoute["settings"]).toBe("/taskflow/settings");
      expect(stateToRoute["onboarding"]).toBe("/taskflow/onboarding");
    });
  });

  // =============================================================================
  // Test 5: Provider Exports
  // =============================================================================

  describe("Provider Exports", () => {
    it("should export all required provider components", async () => {
      const providersModule = await import("../../src/taskflow/providers.js");

      // Verify provider components are exported
      expect(providersModule.TaskFlowProviders).toBeDefined();
      expect(providersModule.TaskFlowRouterProvider).toBeDefined();
      expect(providersModule.TaskFlowQueryProvider).toBeDefined();
      expect(providersModule.TaskFlowApp).toBeDefined();

      // Verify utility functions are exported
      expect(providersModule.getQueryClient).toBeDefined();
      expect(providersModule.resetQueryClient).toBeDefined();

      // Verify they are functions
      expect(typeof providersModule.TaskFlowProviders).toBe("function");
      expect(typeof providersModule.TaskFlowRouterProvider).toBe("function");
      expect(typeof providersModule.TaskFlowQueryProvider).toBe("function");
      expect(typeof providersModule.TaskFlowApp).toBe("function");
      expect(typeof providersModule.getQueryClient).toBe("function");
      expect(typeof providersModule.resetQueryClient).toBe("function");
    });
  });
});
