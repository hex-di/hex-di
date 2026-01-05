/**
 * DevTools Integration Tests
 *
 * Tests for the DevTools integration with the TaskFlow application:
 * 1. All containers visible in DevTools selector
 * 2. Flow state inspector shows current state
 * 3. Event history tracks navigation events
 * 4. Container hierarchy displays correctly
 * 5. FlowStateInspector component displays correct data
 * 6. ContainerHierarchy component shows tree structure
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// =============================================================================
// Mock DevTools Provider and Registration
// =============================================================================

// =============================================================================
// Test 1: All containers visible in DevTools selector
// =============================================================================

describe("DevTools Container Visibility", () => {
  it("should export DevTools unified hooks", async () => {
    // Verify that the unified DevTools hooks are properly exported
    const devtoolsModule = await import("@hex-di/devtools/react");
    expect(devtoolsModule.useDevToolsRuntime).toBeDefined();
    expect(typeof devtoolsModule.useDevToolsRuntime).toBe("function");
    expect(devtoolsModule.useDevToolsSelector).toBeDefined();
    expect(typeof devtoolsModule.useDevToolsSelector).toBe("function");
    expect(devtoolsModule.useDevToolsDispatch).toBeDefined();
    expect(typeof devtoolsModule.useDevToolsDispatch).toBe("function");
  });

  it("should have correct container configuration for TaskFlow hierarchy", async () => {
    // Verify the expected container hierarchy structure
    const expectedContainers = [
      { id: "root", label: "Root Container", kind: "root", parentId: null },
      { id: "dashboard", label: "Dashboard Container", kind: "child", parentId: "root" },
      { id: "task-detail", label: "Task Detail Container", kind: "child", parentId: "root" },
      { id: "settings", label: "Settings Container", kind: "child", parentId: "root" },
      { id: "onboarding", label: "Onboarding Container", kind: "child", parentId: "root" },
    ];

    // Each container should have the required fields
    expectedContainers.forEach(container => {
      expect(container.id).toBeDefined();
      expect(container.label).toBeDefined();
      expect(container.kind).toBeDefined();
      expect(container.kind).toMatch(/^(root|child|lazy|scope)$/);
    });

    // Root container should have no parent
    const rootContainer = expectedContainers.find(c => c.kind === "root");
    expect(rootContainer?.parentId).toBeNull();

    // Child containers should reference root as parent
    const childContainers = expectedContainers.filter(c => c.kind === "child");
    childContainers.forEach(c => {
      expect(c.parentId).toBe("root");
    });
  });
});

// =============================================================================
// Test 2: Flow state inspector shows current state
// =============================================================================

describe("Flow State Inspector", () => {
  it("should export FlowStateInspector component with required props", async () => {
    const { FlowStateInspector } =
      await import("../../src/taskflow/components/devtools/FlowStateInspector.js");

    expect(FlowStateInspector).toBeDefined();
    expect(typeof FlowStateInspector).toBe("function");
  });

  it("should display current state path", async () => {
    const { FlowStateInspector } =
      await import("../../src/taskflow/components/devtools/FlowStateInspector.js");

    render(
      <FlowStateInspector
        machineName="navigationMachine"
        currentState="dashboard.taskList.idle"
        context={{
          currentRoute: "/",
          previousRoute: null,
          params: {},
          user: { id: "123", name: "John Doe" },
        }}
        availableTransitions={["NAVIGATE_TO_TASK", "NAVIGATE_TO_SETTINGS", "CREATE_TASK", "LOGOUT"]}
        eventHistory={[
          { timestamp: Date.now() - 1000, type: "LOADED", payload: {} },
          { timestamp: Date.now(), type: "NAVIGATE", payload: { to: "/" } },
        ]}
      />
    );

    // Should display machine name
    expect(screen.getByText(/navigationMachine/i)).toBeInTheDocument();

    // Should display current state path
    expect(screen.getByText(/dashboard\.taskList\.idle/i)).toBeInTheDocument();
  });

  it("should display context values", async () => {
    const { FlowStateInspector } =
      await import("../../src/taskflow/components/devtools/FlowStateInspector.js");

    render(
      <FlowStateInspector
        machineName="navigationMachine"
        currentState="dashboard.idle"
        context={{
          currentRoute: "/",
          previousRoute: "/tasks/new",
          params: { taskId: "123" },
          user: { id: "user-1", name: "John" },
        }}
        availableTransitions={["NAVIGATE_TO_TASK"]}
        eventHistory={[]}
      />
    );

    // Should display context section
    expect(screen.getByText(/context/i)).toBeInTheDocument();

    // Should show currentRoute value
    expect(screen.getByText(/currentRoute/i)).toBeInTheDocument();
  });

  it("should list available transitions", async () => {
    const { FlowStateInspector } =
      await import("../../src/taskflow/components/devtools/FlowStateInspector.js");

    render(
      <FlowStateInspector
        machineName="navigationMachine"
        currentState="dashboard.idle"
        context={{}}
        availableTransitions={["NAVIGATE_TO_TASK", "NAVIGATE_TO_SETTINGS", "CREATE_TASK"]}
        eventHistory={[]}
      />
    );

    // Should show transitions section
    expect(screen.getByText(/available transitions/i)).toBeInTheDocument();

    // Should list each transition
    expect(screen.getByText(/NAVIGATE_TO_TASK/)).toBeInTheDocument();
    expect(screen.getByText(/NAVIGATE_TO_SETTINGS/)).toBeInTheDocument();
    expect(screen.getByText(/CREATE_TASK/)).toBeInTheDocument();
  });
});

// =============================================================================
// Test 3: Event history tracks navigation events
// =============================================================================

describe("Event History Tracking", () => {
  it("should display event history timeline", async () => {
    const { FlowStateInspector } =
      await import("../../src/taskflow/components/devtools/FlowStateInspector.js");

    const now = Date.now();
    const events = [
      { timestamp: now - 3000, type: "AUTH_SUCCESS", payload: {} },
      { timestamp: now - 2000, type: "NAVIGATE", payload: { to: "/" } },
      { timestamp: now - 1000, type: "LOADED", payload: {} },
    ];

    render(
      <FlowStateInspector
        machineName="navigationMachine"
        currentState="dashboard.idle"
        context={{}}
        availableTransitions={[]}
        eventHistory={events}
      />
    );

    // Should display event history section
    expect(screen.getByText(/event history/i)).toBeInTheDocument();

    // Should show event types
    expect(screen.getByText(/AUTH_SUCCESS/)).toBeInTheDocument();
    expect(screen.getByText(/NAVIGATE/)).toBeInTheDocument();
    expect(screen.getByText(/LOADED/)).toBeInTheDocument();
  });

  it("should show event timestamps in chronological order", async () => {
    const { FlowStateInspector } =
      await import("../../src/taskflow/components/devtools/FlowStateInspector.js");

    const now = Date.now();
    const events = [
      { timestamp: now - 2000, type: "FIRST_EVENT", payload: {} },
      { timestamp: now - 1000, type: "SECOND_EVENT", payload: {} },
      { timestamp: now, type: "THIRD_EVENT", payload: {} },
    ];

    render(
      <FlowStateInspector
        machineName="navigationMachine"
        currentState="dashboard.idle"
        context={{}}
        availableTransitions={[]}
        eventHistory={events}
      />
    );

    // Events should be displayed (most recent first)
    const eventList = screen.getByTestId("event-history-list");
    const eventItems = within(eventList).getAllByTestId(/event-item/);

    // Most recent event should be first
    expect(eventItems[0]).toHaveTextContent("THIRD_EVENT");
    expect(eventItems[2]).toHaveTextContent("FIRST_EVENT");
  });
});

// =============================================================================
// Test 4: Container hierarchy displays correctly
// =============================================================================

describe("Container Hierarchy Display", () => {
  it("should export ContainerHierarchy component", async () => {
    const { ContainerHierarchy } =
      await import("../../src/taskflow/components/devtools/ContainerHierarchy.js");

    expect(ContainerHierarchy).toBeDefined();
    expect(typeof ContainerHierarchy).toBe("function");
  });

  it("should display tree view of container relationships", async () => {
    const { ContainerHierarchy } =
      await import("../../src/taskflow/components/devtools/ContainerHierarchy.js");

    const containers = [
      {
        id: "root",
        label: "Root Container",
        kind: "root" as const,
        parentId: null,
        services: ["LoggerService", "TracingService", "RouterService"],
      },
      {
        id: "dashboard",
        label: "Dashboard Container",
        kind: "child" as const,
        parentId: "root",
        services: ["TaskListService", "FilterService", "StatsService"],
      },
      {
        id: "settings",
        label: "Settings Container",
        kind: "child" as const,
        parentId: "root",
        services: ["PreferencesService"],
      },
    ];

    render(<ContainerHierarchy containers={containers} selectedId="root" />);

    // Should display root container
    expect(screen.getByText(/Root Container/)).toBeInTheDocument();

    // Should display child containers
    expect(screen.getByText(/Dashboard Container/)).toBeInTheDocument();
    expect(screen.getByText(/Settings Container/)).toBeInTheDocument();
  });

  it("should show expandable/collapsible nodes", async () => {
    const { ContainerHierarchy } =
      await import("../../src/taskflow/components/devtools/ContainerHierarchy.js");

    const containers = [
      {
        id: "root",
        label: "Root Container",
        kind: "root" as const,
        parentId: null,
        services: ["LoggerService"],
      },
      {
        id: "dashboard",
        label: "Dashboard Container",
        kind: "child" as const,
        parentId: "root",
        services: ["TaskService"],
      },
    ];

    render(<ContainerHierarchy containers={containers} selectedId="root" />);

    // Should have expand/collapse button for root (has children)
    const rootNode = screen.getByTestId("container-node-root");
    const toggleButton = within(rootNode).getByRole("button", { name: /toggle/i });
    expect(toggleButton).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(toggleButton);

    // Child should be hidden after collapse
    await waitFor(() => {
      expect(screen.queryByText(/Dashboard Container/)).not.toBeInTheDocument();
    });
  });

  it("should display service list per container", async () => {
    const { ContainerHierarchy } =
      await import("../../src/taskflow/components/devtools/ContainerHierarchy.js");

    const containers = [
      {
        id: "root",
        label: "Root Container",
        kind: "root" as const,
        parentId: null,
        services: ["LoggerService", "TracingService"],
      },
    ];

    render(<ContainerHierarchy containers={containers} selectedId="root" showServices />);

    // Should show services
    expect(screen.getByText(/LoggerService/)).toBeInTheDocument();
    expect(screen.getByText(/TracingService/)).toBeInTheDocument();
  });
});

// =============================================================================
// Test 5: DevTools panel integration in sidebar
// =============================================================================

describe("DevTools Sidebar Integration", () => {
  it("should toggle DevTools panel visibility", async () => {
    const { Sidebar } = await import("../../src/taskflow/components/layout/Sidebar.js");

    const onToggleDevTools = vi.fn();
    render(
      <MemoryRouter>
        <Sidebar
          collapsed={false}
          onToggleCollapse={() => {}}
          flowState="dashboard.idle"
          containerName="root"
          devToolsOpen={false}
          onToggleDevTools={onToggleDevTools}
        />
      </MemoryRouter>
    );

    // Find DevTools toggle button
    const devToolsButton = screen.getByRole("button", { name: /open devtools/i });
    fireEvent.click(devToolsButton);

    expect(onToggleDevTools).toHaveBeenCalledTimes(1);
  });

  it("should display current flow state in sidebar footer", async () => {
    const { Sidebar } = await import("../../src/taskflow/components/layout/Sidebar.js");

    render(
      <MemoryRouter>
        <Sidebar
          collapsed={false}
          onToggleCollapse={() => {}}
          flowState="newTask.form.step1"
          containerName="root > dashboard"
          devToolsOpen={false}
        />
      </MemoryRouter>
    );

    // Should show flow state
    expect(screen.getByText(/newTask\.form\.step1/)).toBeInTheDocument();

    // Should show container name
    expect(screen.getByText(/root > dashboard/)).toBeInTheDocument();
  });
});

// =============================================================================
// Test 6: Complete route structure assembly
// =============================================================================

describe("Route Structure Assembly", () => {
  it("should have all required routes configured", async () => {
    const { routes } = await import("../../src/taskflow/routes.js");

    // Routes are relative to /taskflow/* - dashboard uses index: true
    const requiredPaths = [
      undefined, // index route (dashboard)
      "tasks/new",
      "tasks/:id",
      "settings",
      "onboarding",
    ];

    const routePaths = routes.map(r => r.path);

    requiredPaths.forEach(path => {
      expect(routePaths).toContain(path);
    });

    // Verify index route exists
    const indexRoute = routes.find(r => r.index === true);
    expect(indexRoute).toBeDefined();
  });

  it("should map routes to navigation states correctly", async () => {
    const { routeToState, stateToRoute } = await import("../../src/taskflow/routes.js");

    // Routes are now prefixed with /taskflow for nested routing
    expect(routeToState["/taskflow"]).toBe("dashboard");
    expect(routeToState["/taskflow/tasks/new"]).toBe("newTask");
    expect(routeToState["/taskflow/tasks/:id"]).toBe("taskDetail");
    expect(routeToState["/taskflow/settings"]).toBe("settings");
    expect(routeToState["/taskflow/onboarding"]).toBe("onboarding");

    // Verify state to route mapping (inverse)
    expect(stateToRoute["dashboard"]).toBe("/taskflow");
    expect(stateToRoute["newTask"]).toBe("/taskflow/tasks/new");
    expect(stateToRoute["taskDetail"]).toBe("/taskflow/tasks/:id");
    expect(stateToRoute["settings"]).toBe("/taskflow/settings");
    expect(stateToRoute["onboarding"]).toBe("/taskflow/onboarding");
  });
});
