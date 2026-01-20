/**
 * Tests for ServicesPlugin
 *
 * These tests verify:
 * 1. Plugin renders service list
 * 2. Search/filter functionality
 * 3. View mode toggle (list/tree)
 * 4. Lifetime filter buttons
 */

import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import type { ExportedGraph } from "@hex-di/devtools-core";
import { ServicesPlugin } from "../../src/plugins/services-plugin.js";
import { ServicesPluginContent } from "../../src/plugins/services/services-content.js";
import type {
  PluginProps,
  PluginRuntimeAccess,
  PluginStateSnapshot,
} from "../../src/react/types/plugin-types.js";
import type { ContainerEntry } from "../../src/runtime/index.js";

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Create a mock state for testing.
 */
function createMockState(overrides: Partial<PluginStateSnapshot> = {}): PluginStateSnapshot {
  return {
    activeTabId: "services",
    selectedContainerIds: new Set<string>(),
    tracingEnabled: false,
    tracingPaused: false,
    tracingThreshold: 100,
    plugins: [],
    ...overrides,
  };
}

/**
 * Create a mock runtime for testing.
 */
function createMockRuntime(): PluginRuntimeAccess {
  return {
    dispatch: vi.fn(),
  };
}

/**
 * Create mock PluginProps for testing.
 */
function createMockPluginProps(overrides: Partial<PluginProps> = {}): PluginProps {
  const emptyGraph: ExportedGraph = {
    nodes: [],
    edges: [],
  };

  return {
    runtime: createMockRuntime(),
    state: createMockState(),
    graph: emptyGraph,
    containers: [],
    containerScopeTree: null,
    ...overrides,
  };
}

/**
 * Create a mock container entry for testing.
 */
function createMockContainerEntry(
  id: string,
  name: string,
  kind: "root" | "child" | "lazy" = "root"
): ContainerEntry {
  return {
    id,
    name,
    path: id,
    kind,
    state: "active",
    isSelected: false,
  };
}

/**
 * Create a mock graph with service nodes.
 */
function createMockGraphWithServices(
  services: readonly {
    readonly id: string;
    readonly lifetime: "singleton" | "scoped" | "transient";
  }[]
): ExportedGraph {
  return {
    nodes: services.map(service => ({
      id: service.id,
      label: service.id,
      lifetime: service.lifetime,
      factoryKind: "sync" as const,
      origin: "own" as const,
      inheritanceMode: undefined,
    })),
    edges: [],
  };
}

// =============================================================================
// ServicesPlugin Factory Tests
// =============================================================================

describe("ServicesPlugin", () => {
  describe("plugin factory", () => {
    it("should create a plugin with id 'services'", () => {
      const plugin = ServicesPlugin();

      expect(plugin.id).toBe("services");
    });

    it("should create a plugin with label 'Services'", () => {
      const plugin = ServicesPlugin();

      expect(plugin.label).toBe("Services");
    });

    it("should include a keyboard shortcut 's' to focus services tab", () => {
      const plugin = ServicesPlugin();

      expect(plugin.shortcuts).toBeDefined();
      expect(plugin.shortcuts).toHaveLength(1);

      const shortcut = plugin.shortcuts?.[0];
      expect(shortcut?.key).toBe("s");
      expect(shortcut?.description).toContain("services");
    });

    it("should have a component defined", () => {
      const plugin = ServicesPlugin();

      expect(plugin.component).toBeDefined();
      expect(typeof plugin.component).toBe("function");
    });

    it("should return a frozen plugin object", () => {
      const plugin = ServicesPlugin();

      expect(Object.isFrozen(plugin)).toBe(true);
    });
  });
});

// =============================================================================
// ServicesPluginContent Rendering Tests
// =============================================================================

describe("ServicesPluginContent", () => {
  afterEach(() => {
    cleanup();
  });

  describe("basic rendering", () => {
    it("should render without errors", () => {
      const props = createMockPluginProps();

      expect(() => render(<ServicesPluginContent {...props} />)).not.toThrow();
    });

    it("should render the services tab content container", () => {
      const props = createMockPluginProps();

      render(<ServicesPluginContent {...props} />);

      const container = screen.getByTestId("tab-content-services");
      expect(container).toBeDefined();
    });

    it("should not duplicate tabpanel role (provided by PluginTabContent)", () => {
      // The tabpanel role is now provided by PluginTabContent, not the individual
      // plugin content components. This prevents duplicate tabpanel roles.
      const props = createMockPluginProps();

      render(<ServicesPluginContent {...props} />);

      const container = screen.getByTestId("tab-content-services");
      // Plugin content should NOT have the tabpanel role - that's PluginTabContent's job
      expect(container.getAttribute("role")).toBeNull();
    });
  });

  describe("service list rendering", () => {
    it("should render service list when graph has nodes", () => {
      const graph = createMockGraphWithServices([
        { id: "Logger", lifetime: "singleton" },
        { id: "Database", lifetime: "scoped" },
        { id: "Cache", lifetime: "transient" },
      ]);
      const props = createMockPluginProps({ graph });

      render(<ServicesPluginContent {...props} />);

      // Should render the enhanced services view with services
      expect(screen.getByTestId("enhanced-services-view")).toBeDefined();
    });

    it("should show empty message when graph has no nodes", () => {
      const emptyGraph: ExportedGraph = {
        nodes: [],
        edges: [],
      };

      const props = createMockPluginProps({ graph: emptyGraph });

      render(<ServicesPluginContent {...props} />);

      expect(screen.getByText(/no services registered/i)).toBeDefined();
    });
  });

  describe("search functionality", () => {
    it("should render search input", () => {
      const graph = createMockGraphWithServices([
        { id: "Logger", lifetime: "singleton" },
        { id: "Database", lifetime: "scoped" },
      ]);
      const props = createMockPluginProps({ graph });

      render(<ServicesPluginContent {...props} />);

      const searchInput = screen.getByTestId("service-search");
      expect(searchInput).toBeDefined();
    });

    it("should filter services based on search query", async () => {
      const graph = createMockGraphWithServices([
        { id: "Logger", lifetime: "singleton" },
        { id: "Database", lifetime: "scoped" },
        { id: "LogAnalyzer", lifetime: "transient" },
      ]);
      const props = createMockPluginProps({ graph });

      render(<ServicesPluginContent {...props} />);

      const searchInput = screen.getByTestId("service-search");
      fireEvent.change(searchInput, { target: { value: "Log" } });

      // Verify input value was set correctly using getAttribute
      const inputElement = searchInput as HTMLInputElement;
      expect(inputElement.value).toBe("Log");

      // Wait for debounced search to apply (300ms debounce)
      await waitFor(
        () => {
          // After debounce, Database should not be visible but Logger and LogAnalyzer should be
          expect(screen.queryByTestId("enhanced-service-item-Database")).toBeNull();
        },
        { timeout: 500 }
      );

      // Verify Logger and LogAnalyzer are still present
      expect(screen.getByTestId("enhanced-service-item-Logger")).toBeDefined();
      expect(screen.getByTestId("enhanced-service-item-LogAnalyzer")).toBeDefined();
    });
  });

  describe("lifetime filter buttons", () => {
    it("should render lifetime filter buttons", () => {
      const graph = createMockGraphWithServices([{ id: "ServiceA", lifetime: "singleton" }]);
      const props = createMockPluginProps({ graph });

      render(<ServicesPluginContent {...props} />);

      // Check all lifetime filter buttons exist
      expect(screen.getByTestId("service-filter-all")).toBeDefined();
      expect(screen.getByTestId("service-filter-singleton")).toBeDefined();
      expect(screen.getByTestId("service-filter-scoped")).toBeDefined();
      expect(screen.getByTestId("service-filter-request")).toBeDefined();
    });

    it("should filter by singleton when singleton button is clicked", async () => {
      const graph = createMockGraphWithServices([
        { id: "Logger", lifetime: "singleton" },
        { id: "Database", lifetime: "scoped" },
        { id: "Cache", lifetime: "transient" },
      ]);
      const props = createMockPluginProps({ graph });

      render(<ServicesPluginContent {...props} />);

      const singletonButton = screen.getByTestId("service-filter-singleton");
      fireEvent.click(singletonButton);

      // The button should now be pressed
      expect(singletonButton.getAttribute("aria-pressed")).toBe("true");
    });

    it("should toggle filter off when clicking active filter button", () => {
      const graph = createMockGraphWithServices([{ id: "ServiceA", lifetime: "singleton" }]);
      const props = createMockPluginProps({ graph });

      render(<ServicesPluginContent {...props} />);

      const allButton = screen.getByTestId("service-filter-all");
      // All button should be active by default
      expect(allButton.getAttribute("aria-pressed")).toBe("true");

      // Click singleton to select it
      const singletonButton = screen.getByTestId("service-filter-singleton");
      fireEvent.click(singletonButton);
      expect(singletonButton.getAttribute("aria-pressed")).toBe("true");

      // Click All again to reset
      fireEvent.click(allButton);
      expect(allButton.getAttribute("aria-pressed")).toBe("true");
    });
  });

  describe("view mode toggle", () => {
    it("should render view mode toggle buttons", () => {
      const graph = createMockGraphWithServices([{ id: "ServiceA", lifetime: "singleton" }]);
      const props = createMockPluginProps({ graph });

      render(<ServicesPluginContent {...props} />);

      expect(screen.getByTestId("view-mode-list")).toBeDefined();
      expect(screen.getByTestId("view-mode-tree")).toBeDefined();
    });

    it("should default to list view mode", () => {
      const graph = createMockGraphWithServices([{ id: "ServiceA", lifetime: "singleton" }]);
      const props = createMockPluginProps({ graph });

      render(<ServicesPluginContent {...props} />);

      const listButton = screen.getByTestId("view-mode-list");
      expect(listButton.getAttribute("aria-pressed")).toBe("true");
    });

    it("should switch to tree view when tree button is clicked", () => {
      const graph = createMockGraphWithServices([{ id: "ServiceA", lifetime: "singleton" }]);
      const props = createMockPluginProps({ graph });

      render(<ServicesPluginContent {...props} />);

      const treeButton = screen.getByTestId("view-mode-tree");
      fireEvent.click(treeButton);

      expect(treeButton.getAttribute("aria-pressed")).toBe("true");
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("ServicesPlugin Integration", () => {
  afterEach(() => {
    cleanup();
  });

  it("should be usable as a DevToolsPlugin", () => {
    const plugin = ServicesPlugin();

    // Verify it satisfies the DevToolsPlugin interface
    expect(plugin).toHaveProperty("id");
    expect(plugin).toHaveProperty("label");
    expect(plugin).toHaveProperty("component");

    // Component should be renderable with PluginProps
    const Component = plugin.component;
    const props = createMockPluginProps();

    expect(() => render(<Component {...props} />)).not.toThrow();
  });

  it("should render services from graph data", () => {
    const graph = createMockGraphWithServices([
      { id: "AuthService", lifetime: "singleton" },
      { id: "UserService", lifetime: "scoped" },
      { id: "NotificationService", lifetime: "transient" },
    ]);

    const containers: ContainerEntry[] = [createMockContainerEntry("root", "Root Container")];

    const state = createMockState({
      selectedContainerIds: new Set(["root"]),
    });

    const props = createMockPluginProps({
      state,
      containers,
      graph,
    });

    render(<ServicesPluginContent {...props} />);

    // Should render the services view
    expect(screen.getByTestId("enhanced-services-view")).toBeDefined();
  });

  it("should preserve existing EnhancedServicesView functionality", () => {
    const graph = createMockGraphWithServices([
      { id: "ServiceA", lifetime: "singleton" },
      { id: "ServiceB", lifetime: "scoped" },
    ]);

    const props = createMockPluginProps({ graph });

    render(<ServicesPluginContent {...props} />);

    // Verify all key UI elements are present
    expect(screen.getByTestId("service-search")).toBeDefined();
    expect(screen.getByTestId("service-filter-all")).toBeDefined();
    expect(screen.getByTestId("view-mode-list")).toBeDefined();
    expect(screen.getByTestId("view-mode-tree")).toBeDefined();
  });
});
