/**
 * Tests for InspectorPlugin
 *
 * These tests verify:
 * 1. Plugin renders container inspector
 * 2. Scope hierarchy tree
 * 3. Resolved services list
 * 4. Container selection from tree
 */

import React from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ExportedGraph } from "@hex-di/devtools-core";
import { InspectorTabPlugin } from "../../src/plugins/inspector-plugin.js";
import { InspectorPluginContent } from "../../src/plugins/inspector/inspector-content.js";
import type {
  PluginProps,
  PluginRuntimeAccess,
  PluginStateSnapshot,
} from "../../src/runtime/types.js";
import type { ContainerEntry } from "../../src/runtime/plugin-types.js";

// =============================================================================
// Mocks
// =============================================================================

// Mock the use-container-list hook (InspectorPluginContent no longer uses use-container-scope-tree)
vi.mock("../../src/react/hooks/use-container-list.js", () => ({
  useContainerList: vi.fn(() => ({
    containers: [],
    selectedId: { kind: "none" },
    selectContainer: vi.fn(),
    isAvailable: false,
  })),
}));

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Create a mock runtime for testing.
 */
function createMockRuntime(overrides: Partial<PluginStateSnapshot> = {}): PluginRuntimeAccess {
  const state: PluginStateSnapshot = {
    activeTabId: "inspector",
    selectedContainerIds: new Set<string>(),
    tracingEnabled: false,
    tracingPaused: false,
    tracingThreshold: 100,
    plugins: [],
    ...overrides,
  };

  return {
    dispatch: vi.fn(),
    getState: () => state,
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

  const defaultRuntime = createMockRuntime();

  return {
    runtime: defaultRuntime,
    state: defaultRuntime.getState(),
    graph: emptyGraph,
    containers: [],
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
// InspectorTabPlugin Factory Tests
// =============================================================================

describe("InspectorTabPlugin", () => {
  describe("plugin factory", () => {
    it("should create a plugin with id 'inspector'", () => {
      const plugin = InspectorTabPlugin();

      expect(plugin.id).toBe("inspector");
    });

    it("should create a plugin with label 'Inspector'", () => {
      const plugin = InspectorTabPlugin();

      expect(plugin.label).toBe("Inspector");
    });

    it("should include a keyboard shortcut 'i' to focus inspector tab", () => {
      const plugin = InspectorTabPlugin();

      expect(plugin.shortcuts).toBeDefined();
      expect(plugin.shortcuts).toHaveLength(1);

      const shortcut = plugin.shortcuts?.[0];
      expect(shortcut?.key).toBe("i");
      expect(shortcut?.description).toContain("inspector");
    });

    it("should have a component defined", () => {
      const plugin = InspectorTabPlugin();

      expect(plugin.component).toBeDefined();
      expect(typeof plugin.component).toBe("function");
    });

    it("should return a frozen plugin object", () => {
      const plugin = InspectorTabPlugin();

      expect(Object.isFrozen(plugin)).toBe(true);
    });
  });
});

// =============================================================================
// InspectorPluginContent Rendering Tests
// =============================================================================

describe("InspectorPluginContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("basic rendering", () => {
    it("should render without errors", () => {
      const props = createMockPluginProps();

      expect(() => render(<InspectorPluginContent {...props} />)).not.toThrow();
    });

    it("should render the inspector tab content container", () => {
      const props = createMockPluginProps();

      render(<InspectorPluginContent {...props} />);

      const container = screen.getByTestId("tab-content-inspector");
      expect(container).toBeDefined();
    });

    it("should not duplicate tabpanel role (provided by PluginTabContent)", () => {
      // The tabpanel role is now provided by PluginTabContent, not the individual
      // plugin content components. This prevents duplicate tabpanel roles.
      const props = createMockPluginProps();

      render(<InspectorPluginContent {...props} />);

      const container = screen.getByTestId("tab-content-inspector");
      // Plugin content should NOT have the tabpanel role - that's PluginTabContent's job
      expect(container.getAttribute("role")).toBeNull();
    });
  });

  describe("scope hierarchy tree", () => {
    it("should render scope hierarchy section", () => {
      const graph = createMockGraphWithServices([
        { id: "Logger", lifetime: "singleton" },
        { id: "Database", lifetime: "scoped" },
      ]);
      const props = createMockPluginProps({ graph });

      render(<InspectorPluginContent {...props} />);

      // Should render the scope hierarchy section header
      expect(screen.getByText(/scope hierarchy/i)).toBeDefined();
    });
  });

  describe("resolved services list", () => {
    it("should render resolved services section", () => {
      const graph = createMockGraphWithServices([
        { id: "Logger", lifetime: "singleton" },
        { id: "Database", lifetime: "scoped" },
        { id: "Cache", lifetime: "transient" },
      ]);
      const props = createMockPluginProps({ graph });

      render(<InspectorPluginContent {...props} />);

      // Should render the resolved services section
      expect(screen.getByText(/resolved services/i)).toBeDefined();
    });

    it("should render services from graph data", () => {
      const graph = createMockGraphWithServices([
        { id: "AuthService", lifetime: "singleton" },
        { id: "UserService", lifetime: "scoped" },
      ]);
      const props = createMockPluginProps({ graph });

      render(<InspectorPluginContent {...props} />);

      // Should render the resolved services view
      expect(screen.getByTestId("resolved-services")).toBeDefined();
    });
  });

  describe("container selection", () => {
    it("should render container controls when containers are available", () => {
      const containers: ContainerEntry[] = [
        createMockContainerEntry("root", "Root Container"),
        createMockContainerEntry("child", "Child Container"),
      ];
      const props = createMockPluginProps({ containers });

      render(<InspectorPluginContent {...props} />);

      // Inspector should render with container controls
      expect(screen.getByTestId("tab-content-inspector")).toBeDefined();
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("InspectorTabPlugin Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("should be usable as a DevToolsPlugin", () => {
    const plugin = InspectorTabPlugin();

    // Verify it satisfies the DevToolsPlugin interface
    expect(plugin).toHaveProperty("id");
    expect(plugin).toHaveProperty("label");
    expect(plugin).toHaveProperty("component");

    // Component should be renderable with PluginProps
    const Component = plugin.component;
    const props = createMockPluginProps();

    expect(() => render(<Component {...props} />)).not.toThrow();
  });

  it("should render inspector with graph data", () => {
    const graph = createMockGraphWithServices([
      { id: "AuthService", lifetime: "singleton" },
      { id: "UserService", lifetime: "scoped" },
      { id: "NotificationService", lifetime: "transient" },
    ]);

    const containers: ContainerEntry[] = [createMockContainerEntry("root", "Root Container")];

    const runtime = createMockRuntime({
      selectedContainerIds: new Set(["root"]),
    });

    const props = createMockPluginProps({
      runtime,
      state: runtime.getState(),
      containers,
      graph,
    });

    render(<InspectorPluginContent {...props} />);

    // Should render the inspector view
    expect(screen.getByTestId("tab-content-inspector")).toBeDefined();
    expect(screen.getByTestId("resolved-services")).toBeDefined();
  });

  it("should preserve existing container inspection functionality", () => {
    const graph = createMockGraphWithServices([
      { id: "ServiceA", lifetime: "singleton" },
      { id: "ServiceB", lifetime: "scoped" },
    ]);

    const props = createMockPluginProps({ graph });

    render(<InspectorPluginContent {...props} />);

    // Verify key UI elements are present
    expect(screen.getByText(/scope hierarchy/i)).toBeDefined();
    expect(screen.getByText(/resolved services/i)).toBeDefined();
  });
});
