/**
 * Tests for Tab Navigation with Plugin Architecture.
 *
 * These tests verify:
 * 1. Tabs render from plugin list via Zustand store
 * 2. Tab click dispatches selectTab action
 * 3. Active tab styling reflects store state
 * 4. Keyboard navigation (arrow keys, home, end) works correctly
 * 5. ARIA accessibility attributes are preserved
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, act, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import type { DevToolsPlugin } from "../../src/runtime/plugin-types.js";
import { DevToolsStoreProvider, useDevToolsStore } from "../../src/store/index.js";
import { TabNavigation } from "../../src/react/tab-navigation.js";
import { PluginTabContent } from "../../src/react/plugin-tab-content.js";
import type { InspectorWithSubscription } from "@hex-di/runtime";

// =============================================================================
// Mock Inspector
// =============================================================================

/**
 * Creates a mock InspectorWithSubscription for testing.
 */
function createMockInspector(): InspectorWithSubscription {
  return {
    getSnapshot: () => ({
      kind: "root" as const,
      phase: "initialized" as const,
      isInitialized: true,
      asyncAdaptersTotal: 0,
      asyncAdaptersInitialized: 0,
      singletons: [],
      scopes: {
        id: "container",
        status: "active" as const,
        children: [],
        resolvedPorts: [],
        resolvedCount: 0,
        totalCount: 0,
      },
      isDisposed: false,
      containerName: "MockContainer",
      containerId: "mock-container-id",
    }),
    getScopeTree: () => ({
      id: "container",
      status: "active" as const,
      children: [],
      resolvedPorts: [],
      resolvedCount: 0,
      totalCount: 0,
    }),
    getAdapterInfo: () => [],
    getGraphData: () => ({
      containerName: "MockContainer",
      kind: "root" as const,
      parentName: null,
      adapters: [],
    }),
    getChildContainers: () => [],
    subscribe: () => () => {},
    listPorts: () => [],
    getContainerKind: () => "root" as const,
    getPhase: () => "initialized" as const,
    isResolved: (_portName: string) => false as boolean | "scope-required",
    isDisposed: false,
  };
}

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Creates a minimal test plugin for tab navigation tests.
 */
function createTestPlugin(id: string, label: string): DevToolsPlugin {
  return {
    id,
    label,
    component: _props =>
      React.createElement("div", { "data-testid": `plugin-content-${id}` }, `Content for ${label}`),
  };
}

/**
 * Creates default test plugins for tab navigation.
 */
function createDefaultTestPlugins(): readonly DevToolsPlugin[] {
  return [
    createTestPlugin("graph", "Graph"),
    createTestPlugin("services", "Services"),
    createTestPlugin("tracing", "Tracing"),
    createTestPlugin("inspector", "Inspector"),
  ];
}

/**
 * Wrapper to render components with store provider and plugins.
 */
function renderWithProvider(
  ui: React.ReactElement,
  plugins?: readonly DevToolsPlugin[]
): ReturnType<typeof render> {
  const inspector = createMockInspector();
  const pluginsToUse = plugins ?? createDefaultTestPlugins();

  function Wrapper({ children }: { children: React.ReactNode }): React.ReactElement {
    return (
      <DevToolsStoreProvider inspector={inspector} plugins={pluginsToUse}>
        {children}
      </DevToolsStoreProvider>
    );
  }

  return render(ui, { wrapper: Wrapper });
}

/**
 * Component that captures store actions for testing.
 * Renders nothing, just provides access to store state changes.
 */
function StoreWatcher({ onActiveTabChange }: { onActiveTabChange: (tabId: string) => void }): null {
  const activeTab = useDevToolsStore(state => state.ui.activeTab);
  React.useEffect(() => {
    onActiveTabChange(activeTab);
  }, [activeTab, onActiveTabChange]);
  return null;
}

// =============================================================================
// Test Suite
// =============================================================================

describe("Tab Navigation with Plugin Architecture", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("tabs render from plugin list", () => {
    it("renders tabs for all registered plugins", () => {
      renderWithProvider(React.createElement(TabNavigation));

      // All plugin tabs should be present - using getByRole which throws if not found
      const graphTab = screen.getByRole("tab", { name: "Graph" });
      const servicesTab = screen.getByRole("tab", { name: "Services" });
      const tracingTab = screen.getByRole("tab", { name: "Tracing" });
      const inspectorTab = screen.getByRole("tab", { name: "Inspector" });

      expect(graphTab).toBeDefined();
      expect(servicesTab).toBeDefined();
      expect(tracingTab).toBeDefined();
      expect(inspectorTab).toBeDefined();
    });

    it("renders tabs in registration order", () => {
      const plugins = [
        createTestPlugin("zeta", "Zeta"),
        createTestPlugin("alpha", "Alpha"),
        createTestPlugin("beta", "Beta"),
      ];

      renderWithProvider(React.createElement(TabNavigation), plugins);

      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(3);
      expect(tabs[0].textContent).toBe("Zeta");
      expect(tabs[1].textContent).toBe("Alpha");
      expect(tabs[2].textContent).toBe("Beta");
    });

    it("renders with minimal plugin set", () => {
      const plugins = [createTestPlugin("single", "Single Plugin")];

      renderWithProvider(React.createElement(TabNavigation), plugins);

      const singleTab = screen.getByRole("tab", { name: "Single Plugin" });
      expect(singleTab).toBeDefined();
      expect(screen.getAllByRole("tab")).toHaveLength(1);
    });
  });

  describe("tab click updates store state", () => {
    it("updates store state on tab click", async () => {
      const tabChanges: string[] = [];

      renderWithProvider(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(TabNavigation),
          React.createElement(StoreWatcher, {
            onActiveTabChange: (tabId: string) => tabChanges.push(tabId),
          })
        )
      );

      // Initial state triggers the watcher
      expect(tabChanges).toContain("graph");

      // Click another tab
      const tracingTab = screen.getByRole("tab", { name: "Tracing" });
      act(() => {
        fireEvent.click(tracingTab);
      });

      // Store state should be updated (async due to queueMicrotask in store)
      await waitFor(() => {
        expect(tabChanges).toContain("tracing");
      });
    });
  });

  describe("active tab styling from store state", () => {
    it("applies active styling to currently selected tab", () => {
      renderWithProvider(React.createElement(TabNavigation));

      const graphTab = screen.getByRole("tab", { name: "Graph" });
      const servicesTab = screen.getByRole("tab", { name: "Services" });

      // First tab should be selected (aria-selected)
      expect(graphTab.getAttribute("aria-selected")).toBe("true");
      expect(servicesTab.getAttribute("aria-selected")).toBe("false");
    });

    it("updates active styling when tab is clicked", async () => {
      renderWithProvider(React.createElement(TabNavigation));

      const graphTab = screen.getByRole("tab", { name: "Graph" });
      const servicesTab = screen.getByRole("tab", { name: "Services" });

      // Initial state
      expect(graphTab.getAttribute("aria-selected")).toBe("true");
      expect(servicesTab.getAttribute("aria-selected")).toBe("false");

      // Click services tab
      act(() => {
        fireEvent.click(servicesTab);
      });

      // Styling should update (async due to queueMicrotask in store)
      await waitFor(() => {
        expect(graphTab.getAttribute("aria-selected")).toBe("false");
        expect(servicesTab.getAttribute("aria-selected")).toBe("true");
      });
    });

    it("only one tab is active at a time", () => {
      renderWithProvider(React.createElement(TabNavigation));

      const allTabs = screen.getAllByRole("tab");
      const activeTabs = allTabs.filter(tab => tab.getAttribute("aria-selected") === "true");

      expect(activeTabs).toHaveLength(1);
    });
  });

  describe("keyboard navigation", () => {
    it("navigates to next tab with ArrowRight", async () => {
      const tabChanges: string[] = [];

      renderWithProvider(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(TabNavigation),
          React.createElement(StoreWatcher, {
            onActiveTabChange: (tabId: string) => tabChanges.push(tabId),
          })
        )
      );

      const graphTab = screen.getByRole("tab", { name: "Graph" });
      graphTab.focus();

      act(() => {
        fireEvent.keyDown(graphTab, { key: "ArrowRight" });
      });

      // Should navigate to services tab (async due to queueMicrotask in store)
      await waitFor(() => {
        expect(tabChanges).toContain("services");
      });
    });

    it("navigates to previous tab with ArrowLeft", () => {
      const tabChanges: string[] = [];

      renderWithProvider(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(TabNavigation),
          React.createElement(StoreWatcher, {
            onActiveTabChange: (tabId: string) => tabChanges.push(tabId),
          })
        )
      );

      // First navigate to services
      const servicesTab = screen.getByRole("tab", { name: "Services" });
      act(() => {
        fireEvent.click(servicesTab);
      });
      servicesTab.focus();

      act(() => {
        fireEvent.keyDown(servicesTab, { key: "ArrowLeft" });
      });

      // Should navigate back to graph
      const lastChange = tabChanges[tabChanges.length - 1];
      expect(lastChange).toBe("graph");
    });

    it("navigates to first tab with Home key", () => {
      const tabChanges: string[] = [];

      renderWithProvider(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(TabNavigation),
          React.createElement(StoreWatcher, {
            onActiveTabChange: (tabId: string) => tabChanges.push(tabId),
          })
        )
      );

      // First navigate to inspector
      const inspectorTab = screen.getByRole("tab", { name: "Inspector" });
      act(() => {
        fireEvent.click(inspectorTab);
      });
      inspectorTab.focus();

      act(() => {
        fireEvent.keyDown(inspectorTab, { key: "Home" });
      });

      // Should navigate to first tab (graph)
      const lastChange = tabChanges[tabChanges.length - 1];
      expect(lastChange).toBe("graph");
    });

    it("navigates to last tab with End key", async () => {
      const tabChanges: string[] = [];

      renderWithProvider(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(TabNavigation),
          React.createElement(StoreWatcher, {
            onActiveTabChange: (tabId: string) => tabChanges.push(tabId),
          })
        )
      );

      const graphTab = screen.getByRole("tab", { name: "Graph" });
      graphTab.focus();

      act(() => {
        fireEvent.keyDown(graphTab, { key: "End" });
      });

      // Should navigate to last tab (inspector) (async due to queueMicrotask in store)
      await waitFor(() => {
        expect(tabChanges).toContain("inspector");
      });
    });

    it("wraps around on ArrowRight from last tab", () => {
      const tabChanges: string[] = [];

      renderWithProvider(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(TabNavigation),
          React.createElement(StoreWatcher, {
            onActiveTabChange: (tabId: string) => tabChanges.push(tabId),
          })
        )
      );

      // Navigate to inspector (last tab)
      const inspectorTab = screen.getByRole("tab", { name: "Inspector" });
      act(() => {
        fireEvent.click(inspectorTab);
      });
      inspectorTab.focus();

      act(() => {
        fireEvent.keyDown(inspectorTab, { key: "ArrowRight" });
      });

      // Should wrap to graph tab
      const lastChange = tabChanges[tabChanges.length - 1];
      expect(lastChange).toBe("graph");
    });

    it("wraps around on ArrowLeft from first tab", async () => {
      const tabChanges: string[] = [];

      renderWithProvider(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(TabNavigation),
          React.createElement(StoreWatcher, {
            onActiveTabChange: (tabId: string) => tabChanges.push(tabId),
          })
        )
      );

      const graphTab = screen.getByRole("tab", { name: "Graph" });
      graphTab.focus();

      act(() => {
        fireEvent.keyDown(graphTab, { key: "ArrowLeft" });
      });

      // Should wrap to inspector tab (async due to queueMicrotask in store)
      await waitFor(() => {
        expect(tabChanges).toContain("inspector");
      });
    });
  });

  describe("ARIA accessibility", () => {
    it("has correct tablist role", () => {
      renderWithProvider(React.createElement(TabNavigation));

      const tablist = screen.getByRole("tablist");
      expect(tablist).toBeDefined();
      expect(tablist.getAttribute("aria-label")).toBe("DevTools panels");
    });

    it("tabs have correct role and aria-selected", () => {
      renderWithProvider(React.createElement(TabNavigation));

      const tabs = screen.getAllByRole("tab");
      tabs.forEach(tab => {
        expect(tab.getAttribute("role")).toBe("tab");
        expect(tab.getAttribute("aria-selected")).toBeDefined();
      });
    });

    it("tabs have aria-controls pointing to tabpanel", () => {
      renderWithProvider(React.createElement(TabNavigation));

      const graphTab = screen.getByRole("tab", { name: "Graph" });
      expect(graphTab.getAttribute("aria-controls")).toBe("tabpanel-graph");
    });

    it("active tab has tabIndex 0, others have -1", () => {
      renderWithProvider(React.createElement(TabNavigation));

      const graphTab = screen.getByRole("tab", { name: "Graph" });
      const servicesTab = screen.getByRole("tab", { name: "Services" });

      expect(graphTab.getAttribute("tabindex")).toBe("0");
      expect(servicesTab.getAttribute("tabindex")).toBe("-1");
    });
  });
});

describe("PluginTabContent", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders active plugin component", () => {
    renderWithProvider(React.createElement(PluginTabContent));

    // First plugin (graph) should be rendered
    const graphContent = screen.getByTestId("plugin-content-graph");
    expect(graphContent).toBeDefined();
  });

  it("renders different plugin when tab is clicked", async () => {
    renderWithProvider(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(TabNavigation),
        React.createElement(PluginTabContent)
      )
    );

    // Initially graph is active
    expect(screen.getByTestId("plugin-content-graph")).toBeDefined();

    // Click services tab
    const servicesTab = screen.getByRole("tab", { name: "Services" });
    act(() => {
      fireEvent.click(servicesTab);
    });

    // Now services should be rendered (async due to queueMicrotask in store)
    await waitFor(() => {
      expect(screen.getByTestId("plugin-content-services")).toBeDefined();
    });
    expect(screen.queryByTestId("plugin-content-graph")).toBeNull();
  });

  it("has correct tabpanel role and aria-labelledby", () => {
    renderWithProvider(React.createElement(PluginTabContent));

    const tabpanel = screen.getByRole("tabpanel");
    expect(tabpanel.getAttribute("id")).toBe("tabpanel-graph");
    expect(tabpanel.getAttribute("aria-labelledby")).toBe("tab-graph");
  });

  it("only renders when tab is active (no hidden tabs)", () => {
    renderWithProvider(React.createElement(PluginTabContent));

    // Only the active plugin content should exist in DOM
    expect(screen.getByTestId("plugin-content-graph")).toBeDefined();
    expect(screen.queryByTestId("plugin-content-services")).toBeNull();
    expect(screen.queryByTestId("plugin-content-tracing")).toBeNull();
    expect(screen.queryByTestId("plugin-content-inspector")).toBeNull();
  });

  it("passes PluginProps to plugin component", () => {
    const receivedProps: {
      hasRuntime: boolean;
      hasState: boolean;
      hasGraph: boolean;
      hasContainers: boolean;
    } = {
      hasRuntime: false,
      hasState: false,
      hasGraph: false,
      hasContainers: false,
    };

    // Use "graph" as the id since the FSM defaults to activeTab: "graph"
    const TestPlugin: DevToolsPlugin = {
      id: "graph",
      label: "Graph",
      component: props => {
        receivedProps.hasRuntime = props.runtime !== undefined;
        receivedProps.hasState = props.state !== undefined;
        receivedProps.hasGraph = props.graph !== undefined;
        receivedProps.hasContainers = props.containers !== undefined;
        return React.createElement("div", { "data-testid": "test-plugin" }, "Test");
      },
    };

    renderWithProvider(React.createElement(PluginTabContent), [TestPlugin]);

    // Verify the plugin received all required props
    expect(receivedProps.hasRuntime).toBe(true);
    expect(receivedProps.hasState).toBe(true);
    expect(receivedProps.hasGraph).toBe(true);
    expect(receivedProps.hasContainers).toBe(true);
  });
});
