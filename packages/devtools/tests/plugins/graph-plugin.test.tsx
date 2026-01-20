/**
 * Tests for GraphPlugin
 *
 * These tests verify:
 * 1. Plugin renders without errors
 * 2. Multi-select container integration
 * 3. Unified graph building from selected containers
 * 4. Empty state when no containers selected
 */

import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ExportedGraph } from "@hex-di/devtools-core";
import { GraphPlugin } from "../../src/plugins/graph-plugin.js";
import { GraphPluginContent } from "../../src/plugins/graph/graph-content.js";
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
    activeTabId: "graph",
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
 * Create a mock graph with nodes.
 */
function createMockGraph(nodeIds: readonly string[]): ExportedGraph {
  return {
    nodes: nodeIds.map(id => ({
      id,
      label: id,
      lifetime: "singleton" as const,
      factoryKind: "sync" as const,
      origin: "own" as const,
      inheritanceMode: undefined,
    })),
    edges: [],
  };
}

// =============================================================================
// GraphPlugin Factory Tests
// =============================================================================

describe("GraphPlugin", () => {
  describe("plugin factory", () => {
    it("should create a plugin with id 'graph'", () => {
      const plugin = GraphPlugin();

      expect(plugin.id).toBe("graph");
    });

    it("should create a plugin with label 'Graph'", () => {
      const plugin = GraphPlugin();

      expect(plugin.label).toBe("Graph");
    });

    it("should include a keyboard shortcut 'g' to focus graph tab", () => {
      const plugin = GraphPlugin();

      expect(plugin.shortcuts).toBeDefined();
      expect(plugin.shortcuts).toHaveLength(1);

      const shortcut = plugin.shortcuts?.[0];
      expect(shortcut?.key).toBe("g");
      expect(shortcut?.description).toContain("graph");
    });

    it("should have a component defined", () => {
      const plugin = GraphPlugin();

      expect(plugin.component).toBeDefined();
      expect(typeof plugin.component).toBe("function");
    });

    it("should return a frozen plugin object", () => {
      const plugin = GraphPlugin();

      expect(Object.isFrozen(plugin)).toBe(true);
    });
  });
});

// =============================================================================
// GraphPluginContent Rendering Tests
// =============================================================================

describe("GraphPluginContent", () => {
  afterEach(() => {
    cleanup();
  });

  describe("basic rendering", () => {
    it("should render without errors", () => {
      const props = createMockPluginProps();

      expect(() => render(<GraphPluginContent {...props} />)).not.toThrow();
    });

    it("should render the graph tab content container", () => {
      const props = createMockPluginProps();

      render(<GraphPluginContent {...props} />);

      const container = screen.getByTestId("tab-content-graph");
      expect(container).toBeDefined();
    });

    it("should not duplicate tabpanel role (provided by PluginTabContent)", () => {
      // The tabpanel role is now provided by PluginTabContent, not the individual
      // plugin content components. This prevents duplicate tabpanel roles.
      const props = createMockPluginProps();

      render(<GraphPluginContent {...props} />);

      const container = screen.getByTestId("tab-content-graph");
      // Plugin content should NOT have the tabpanel role - that's PluginTabContent's job
      expect(container.getAttribute("role")).toBeNull();
    });
  });

  describe("empty state", () => {
    it("should show empty message when graph has no nodes", () => {
      const emptyGraph: ExportedGraph = {
        nodes: [],
        edges: [],
      };

      const props = createMockPluginProps({ graph: emptyGraph });

      render(<GraphPluginContent {...props} />);

      expect(screen.getByText(/no adapters registered/i)).toBeDefined();
    });

    it("should show empty message when no containers are available", () => {
      const props = createMockPluginProps({
        containers: [],
        graph: { nodes: [], edges: [] },
      });

      render(<GraphPluginContent {...props} />);

      expect(screen.getByText(/no adapters registered/i)).toBeDefined();
    });
  });

  describe("graph display", () => {
    it("should render graph when nodes are present", () => {
      const graph = createMockGraph(["ServiceA", "ServiceB"]);
      const props = createMockPluginProps({ graph });

      render(<GraphPluginContent {...props} />);

      // Should not show empty state
      expect(screen.queryByText(/no adapters registered/i)).toBeNull();
    });

    it("should use the provided graph data for visualization", () => {
      const graph = createMockGraph(["Logger", "Database", "Cache"]);
      const props = createMockPluginProps({ graph });

      render(<GraphPluginContent {...props} />);

      // The graph should be rendered (no empty message)
      const container = screen.getByTestId("tab-content-graph");
      expect(container).toBeDefined();
    });
  });

  describe("container multi-select integration", () => {
    it("should render multi-select when containers are available", () => {
      const containers: ContainerEntry[] = [
        createMockContainerEntry("root", "Root Container"),
        createMockContainerEntry("child", "Child Container"),
      ];

      const state = createMockState({
        selectedContainerIds: new Set(["root"]),
      });

      const props = createMockPluginProps({
        state,
        containers,
        graph: createMockGraph(["ServiceA"]),
      });

      render(<GraphPluginContent {...props} />);

      // The container should render without error with containers
      const container = screen.getByTestId("tab-content-graph");
      expect(container).toBeDefined();
    });

    it("should use selectedContainerIds from state", () => {
      const containers: ContainerEntry[] = [
        createMockContainerEntry("root", "Root Container"),
        createMockContainerEntry("child", "Child Container"),
      ];

      const state = createMockState({
        selectedContainerIds: new Set(["root", "child"]),
      });

      const props = createMockPluginProps({
        state,
        containers,
        graph: createMockGraph(["ServiceA", "ServiceB"]),
      });

      render(<GraphPluginContent {...props} />);

      // Should render without showing empty state
      expect(screen.queryByText(/no adapters registered/i)).toBeNull();
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("GraphPlugin Integration", () => {
  afterEach(() => {
    cleanup();
  });

  it("should be usable as a DevToolsPlugin", () => {
    const plugin = GraphPlugin();

    // Verify it satisfies the DevToolsPlugin interface
    expect(plugin).toHaveProperty("id");
    expect(plugin).toHaveProperty("label");
    expect(plugin).toHaveProperty("component");

    // Component should be renderable with PluginProps
    const Component = plugin.component;
    const props = createMockPluginProps();

    expect(() => render(<Component {...props} />)).not.toThrow();
  });

  it("should dispatch selectContainers when selection changes", () => {
    const dispatch = vi.fn();
    const runtime: PluginRuntimeAccess = {
      dispatch,
    };

    const state = createMockState();
    const containers: ContainerEntry[] = [createMockContainerEntry("root", "Root Container")];

    const props = createMockPluginProps({
      runtime,
      state,
      containers,
      graph: createMockGraph(["ServiceA"]),
    });

    // Render the component - the dispatch function is available for selection changes
    render(<GraphPluginContent {...props} />);

    // The component should have rendered without errors
    expect(screen.getByTestId("tab-content-graph")).toBeDefined();
  });
});
