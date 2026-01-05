/**
 * Layout Components Tests
 *
 * Tests for the layout and navigation UI components including:
 * - Sidebar collapse/expand interaction
 * - Navigation item active state highlighting
 * - Responsive breakpoint behavior
 * - DevTools toggle functionality
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { createUIPreferencesStore } from "../../src/taskflow/stores/ui-preferences-store.js";
import { createUserSessionStore } from "../../src/taskflow/stores/user-session-store.js";
import type { UIPreferencesStoreInstance } from "../../src/taskflow/stores/ui-preferences-store.js";

// =============================================================================
// Test Wrapper
// =============================================================================

function createTestWrapper(initialRoute: string = "/taskflow") {
  const uiPreferencesStore = createUIPreferencesStore();
  const userSessionStore = createUserSessionStore();

  // Login a mock user for testing
  userSessionStore.getState().login({
    id: "test-user",
    displayName: "Test User",
    email: "test@example.com",
    role: "developer",
    avatarUrl: null,
    bio: null,
    isNewUser: false,
    createdAt: new Date(),
  });

  return {
    uiPreferencesStore,
    userSessionStore,
    wrapper: ({ children }: { readonly children: React.ReactNode }) => (
      <MemoryRouter initialEntries={[initialRoute]}>{children}</MemoryRouter>
    ),
  };
}

// =============================================================================
// Test 1: Sidebar collapse/expand interaction
// =============================================================================

describe("Sidebar collapse/expand interaction", () => {
  let uiPreferencesStore: UIPreferencesStoreInstance;

  beforeEach(() => {
    uiPreferencesStore = createUIPreferencesStore();
    // Reset to expanded state
    uiPreferencesStore.getState().setSidebarCollapsed(false);
  });

  afterEach(() => {
    // Reset after each test
    uiPreferencesStore.getState().reset();
  });

  it("should toggle sidebar collapsed state when toggle button is clicked", async () => {
    // Import dynamically to avoid circular dependency issues
    const { Sidebar } = await import("../../src/taskflow/components/layout/Sidebar.js");

    const { wrapper } = createTestWrapper();

    render(
      <Sidebar
        collapsed={uiPreferencesStore.getState().sidebarCollapsed}
        onToggleCollapse={() => uiPreferencesStore.getState().toggleSidebar()}
        flowState="dashboard.idle"
        containerName="root"
      />,
      { wrapper }
    );

    // Initially sidebar should be expanded
    expect(uiPreferencesStore.getState().sidebarCollapsed).toBe(false);

    // Find and click the toggle button
    const toggleButton = screen.getByRole("button", { name: /collapse sidebar/i });
    fireEvent.click(toggleButton);

    // Should now be collapsed
    expect(uiPreferencesStore.getState().sidebarCollapsed).toBe(true);

    // Click again to expand
    fireEvent.click(toggleButton);
    expect(uiPreferencesStore.getState().sidebarCollapsed).toBe(false);
  });

  it("should show icon-only navigation when collapsed", async () => {
    const { Sidebar } = await import("../../src/taskflow/components/layout/Sidebar.js");

    const { wrapper } = createTestWrapper();

    const { rerender } = render(
      <Sidebar
        collapsed={false}
        onToggleCollapse={() => {}}
        flowState="dashboard.idle"
        containerName="root"
      />,
      { wrapper }
    );

    // When expanded, should show labels with full opacity
    const dashboardLabel = screen.getByText("Dashboard");
    expect(dashboardLabel).toBeInTheDocument();
    expect(dashboardLabel).toHaveClass("opacity-100");

    // Re-render as collapsed
    rerender(
      <Sidebar
        collapsed={true}
        onToggleCollapse={() => {}}
        flowState="dashboard.idle"
        containerName="root"
      />
    );

    // When collapsed, labels should have opacity-0 class (hidden visually)
    const collapsedLabel = screen.getByText("Dashboard");
    expect(collapsedLabel).toHaveClass("opacity-0");
    expect(collapsedLabel).toHaveClass("w-0");
    expect(collapsedLabel).toHaveClass("overflow-hidden");
  });
});

// =============================================================================
// Test 2: Navigation item active state highlighting
// =============================================================================

describe("Navigation item active state highlighting", () => {
  it("should highlight the active navigation item based on current route", async () => {
    const { NavigationItem } =
      await import("../../src/taskflow/components/layout/NavigationItem.js");

    const { wrapper } = createTestWrapper("/taskflow");

    render(
      <nav>
        <NavigationItem
          to="/taskflow"
          icon="dashboard"
          label="Dashboard"
          collapsed={false}
          end={true}
        />
        <NavigationItem to="/taskflow/tasks/new" icon="plus" label="New Task" collapsed={false} />
        <NavigationItem
          to="/taskflow/settings"
          icon="settings"
          label="Settings"
          collapsed={false}
        />
      </nav>,
      { wrapper }
    );

    // The Dashboard item should have active styling
    const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
    expect(dashboardLink).toHaveClass("bg-blue-50");

    // Other items should not have active styling
    const newTaskLink = screen.getByRole("link", { name: /new task/i });
    expect(newTaskLink).not.toHaveClass("bg-blue-50");
  });

  it("should apply correct active state when navigating to different routes", async () => {
    const { NavigationItem } =
      await import("../../src/taskflow/components/layout/NavigationItem.js");

    // Start at settings route
    const { wrapper } = createTestWrapper("/taskflow/settings");

    render(
      <nav>
        <NavigationItem
          to="/taskflow"
          icon="dashboard"
          label="Dashboard"
          collapsed={false}
          end={true}
        />
        <NavigationItem
          to="/taskflow/settings"
          icon="settings"
          label="Settings"
          collapsed={false}
        />
      </nav>,
      { wrapper }
    );

    // Settings should be active
    const settingsLink = screen.getByRole("link", { name: /settings/i });
    expect(settingsLink).toHaveClass("bg-blue-50");

    // Dashboard should not be active
    const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
    expect(dashboardLink).not.toHaveClass("bg-blue-50");
  });
});

// =============================================================================
// Test 3: Responsive breakpoint behavior
// =============================================================================

describe("Responsive breakpoint behavior", () => {
  const originalMatchMedia = window.matchMedia;

  function mockMatchMedia(matches: boolean) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("should show sidebar on desktop viewport", async () => {
    // Mock desktop viewport (>= 1200px)
    mockMatchMedia(false);

    const { AppLayout } = await import("../../src/taskflow/components/layout/AppLayout.js");

    const { wrapper } = createTestWrapper();

    render(
      <AppLayout
        sidebarCollapsed={false}
        onToggleSidebar={() => {}}
        flowState="dashboard.idle"
        containerName="root"
        user={{
          id: "1",
          displayName: "Test",
          email: "test@example.com",
          role: "developer",
          avatarUrl: null,
          bio: null,
          isNewUser: false,
          createdAt: new Date(),
        }}
      >
        <div>Main Content</div>
      </AppLayout>,
      { wrapper }
    );

    // On desktop, sidebar should be visible
    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar).toBeInTheDocument();
  });
});

// =============================================================================
// Test 4: DevTools toggle functionality
// =============================================================================

describe("DevTools toggle functionality", () => {
  it("should toggle DevTools visibility when DevTools button is clicked", async () => {
    const { Sidebar } = await import("../../src/taskflow/components/layout/Sidebar.js");

    const onToggleDevTools = vi.fn();
    const { wrapper } = createTestWrapper();

    render(
      <Sidebar
        collapsed={false}
        onToggleCollapse={() => {}}
        flowState="dashboard.idle"
        containerName="root"
        onToggleDevTools={onToggleDevTools}
        devToolsOpen={false}
      />,
      { wrapper }
    );

    // Find and click the DevTools toggle button
    const devToolsButton = screen.getByRole("button", { name: /open devtools/i });
    fireEvent.click(devToolsButton);

    // Should call the toggle callback
    expect(onToggleDevTools).toHaveBeenCalledTimes(1);
  });

  it("should display current flow state in sidebar footer", async () => {
    const { Sidebar } = await import("../../src/taskflow/components/layout/Sidebar.js");

    const { wrapper } = createTestWrapper();

    render(
      <Sidebar
        collapsed={false}
        onToggleCollapse={() => {}}
        flowState="dashboard.taskList.idle"
        containerName="root > dashboard"
      />,
      { wrapper }
    );

    // Should show the flow state
    expect(screen.getByText(/dashboard\.taskList\.idle/i)).toBeInTheDocument();

    // Should show the container name
    expect(screen.getByText(/root > dashboard/i)).toBeInTheDocument();
  });
});

// =============================================================================
// Test 5: BottomNavigation component
// =============================================================================

describe("BottomNavigation component", () => {
  it("should render 5 navigation items with icons only", async () => {
    const { BottomNavigation } =
      await import("../../src/taskflow/components/layout/BottomNavigation.js");

    const { wrapper } = createTestWrapper("/taskflow");

    render(<BottomNavigation />, { wrapper });

    // Should have exactly 5 navigation items
    const navItems = screen.getAllByRole("link");
    expect(navItems).toHaveLength(5);

    // Should show active indicator on dashboard
    const dashboardItem = screen.getByTestId("bottom-nav-dashboard");
    expect(dashboardItem).toHaveClass("text-blue-600");
  });

  it("should highlight the active route in bottom navigation", async () => {
    const { BottomNavigation } =
      await import("../../src/taskflow/components/layout/BottomNavigation.js");

    // Start at settings
    const { wrapper } = createTestWrapper("/taskflow/settings");

    render(<BottomNavigation />, { wrapper });

    // Settings should be active (highlighted)
    const settingsItem = screen.getByTestId("bottom-nav-settings");
    expect(settingsItem).toHaveClass("text-blue-600");

    // Dashboard should not be active
    const dashboardItem = screen.getByTestId("bottom-nav-dashboard");
    expect(dashboardItem).not.toHaveClass("text-blue-600");
  });
});

// =============================================================================
// Test 6: Sidebar tooltip on hover (collapsed mode)
// =============================================================================

describe("Sidebar tooltip on hover", () => {
  it("should show tooltip on hover when sidebar is collapsed", async () => {
    const { NavigationItem } =
      await import("../../src/taskflow/components/layout/NavigationItem.js");

    const { wrapper } = createTestWrapper();

    render(
      <NavigationItem
        to="/taskflow"
        icon="dashboard"
        label="Dashboard"
        collapsed={true}
        end={true}
      />,
      { wrapper }
    );

    // In collapsed mode, hovering should show tooltip
    const navItem = screen.getByRole("link");
    fireEvent.mouseEnter(navItem);

    // Tooltip should appear
    await waitFor(() => {
      expect(screen.getByRole("tooltip")).toBeInTheDocument();
      expect(screen.getByRole("tooltip")).toHaveTextContent("Dashboard");
    });

    // Mouse leave should hide tooltip
    fireEvent.mouseLeave(navItem);
    await waitFor(() => {
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
  });
});
