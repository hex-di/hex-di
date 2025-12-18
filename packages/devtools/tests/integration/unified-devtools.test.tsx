/**
 * Integration Tests - Task Group 5.1
 *
 * End-to-end workflow tests for the unified DevTools architecture.
 * Tests critical user flows across DOM and TUI platforms.
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import React from "react";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";

// Import from unified entry points
import { LocalDataSource } from "../../src/data-source/local-data-source.js";
import { DOMPrimitives } from "../../src/dom/primitives.js";
import { TUIPrimitives } from "../../src/tui/primitives.js";
import { PrimitivesProvider } from "../../src/hooks/primitives-context.js";
import { usePrimitives } from "../../src/hooks/use-primitives.js";
import { GraphView } from "../../src/components/GraphView.js";
import { DevToolsPanel } from "../../src/components/DevToolsPanel.js";
import { TimelineView } from "../../src/components/TimelineView.js";
import {
  GraphPresenter,
  TimelinePresenter,
  PanelPresenter,
} from "../../src/presenters/index.js";
import {
  createEmptyGraphViewModel,
  createEmptyPanelViewModel,
  createEmptyTimelineViewModel,
} from "../../src/view-models/index.js";
import type { PanelViewModel, TabId } from "../../src/view-models/index.js";
import type { PresenterDataSourceContract, ExportedGraph } from "@hex-di/devtools-core";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(msg: string): void;
}

interface UserService {
  getUser(id: string): { name: string };
}

interface ConfigService {
  get(key: string): string;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const UserServicePort = createPort<"UserService", UserService>("UserService");
const ConfigPort = createPort<"Config", ConfigService>("Config");

/**
 * Creates a test graph with multiple services and dependencies.
 */
function createTestGraph() {
  const ConfigAdapter = createAdapter({
    provides: ConfigPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ get: () => "value" }),
  });

  const LoggerAdapter = createAdapter({
    provides: LoggerPort,
    requires: [ConfigPort],
    lifetime: "singleton",
    factory: (deps) => ({ log: (msg: string) => console.log(`[${deps.Config.get("env")}] ${msg}`) }),
  });

  const UserServiceAdapter = createAdapter({
    provides: UserServicePort,
    requires: [LoggerPort, ConfigPort],
    lifetime: "scoped",
    factory: () => ({ getUser: () => ({ name: "Test" }) }),
  });

  return GraphBuilder.create()
    .provide(ConfigAdapter)
    .provide(LoggerAdapter)
    .provide(UserServiceAdapter)
    .build();
}

/**
 * Creates a mock data source for presenter testing.
 */
function createMockDataSource(
  overrides: Partial<PresenterDataSourceContract> = {}
): PresenterDataSourceContract {
  return {
    getGraph: () => ({
      nodes: [
        { id: "Config", label: "Config", lifetime: "singleton", factoryKind: "sync" },
        { id: "Logger", label: "Logger", lifetime: "singleton", factoryKind: "sync" },
        { id: "UserService", label: "UserService", lifetime: "scoped", factoryKind: "sync" },
      ],
      edges: [
        { from: "Logger", to: "Config" },
        { from: "UserService", to: "Logger" },
        { from: "UserService", to: "Config" },
      ],
    }),
    getTraces: () => [],
    getStats: () => ({
      totalResolutions: 0,
      averageDuration: 0,
      cacheHitRate: 0,
      slowCount: 0,
      totalDuration: 0,
      sessionStart: Date.now(),
    }),
    getContainerSnapshot: () => null,
    hasContainer: () => false,
    hasTracing: () => false,
    isPaused: () => false,
    pause: () => {},
    resume: () => {},
    clearTraces: () => {},
    pinTrace: () => {},
    unpinTrace: () => {},
    subscribe: () => () => {},
    ...overrides,
  };
}

// =============================================================================
// Integration Test 1: Full DOM Workflow
// LocalDataSource -> GraphPresenter -> GraphView -> DOMPrimitives
// =============================================================================

describe("Full DOM Workflow (LocalDataSource -> GraphView)", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders graph data from LocalDataSource through DOM primitives", async () => {
    // 1. Create graph and data source
    const graph = createTestGraph();
    const dataSource = new LocalDataSource(graph);

    // 2. Connect data source
    await dataSource.connect();
    expect(dataSource.state).toBe("connected");

    // 3. Get graph data
    const exportedGraph = dataSource.getGraph();
    expect(exportedGraph.nodes).toHaveLength(3);
    expect(exportedGraph.edges).toHaveLength(3);

    // 4. Create presenter and view model
    const mockDataSource = createMockDataSource({
      getGraph: () => exportedGraph,
    });
    const presenter = new GraphPresenter(mockDataSource);
    const viewModel = presenter.getViewModel();

    // 5. Verify view model transformation
    expect(viewModel.nodeCount).toBe(3);
    expect(viewModel.edgeCount).toBe(3);
    expect(viewModel.isEmpty).toBe(false);

    // 6. Render through DOM primitives
    render(
      <PrimitivesProvider primitives={DOMPrimitives}>
        <GraphView viewModel={viewModel} />
      </PrimitivesProvider>
    );

    // 7. Verify DOM rendering
    const graphContainer = screen.getByTestId("graph-view");
    expect(graphContainer).toBeTruthy();

    // Cleanup
    dataSource.disconnect();
    expect(dataSource.state).toBe("disconnected");
  });

  it("receives graph updates when data source changes", async () => {
    const graph = createTestGraph();
    const dataSource = new LocalDataSource(graph);
    await dataSource.connect();

    // Subscribe to graph updates
    const updates: number[] = [];
    const unsubscribe = dataSource.subscribeToGraph((exportedGraph) => {
      updates.push(exportedGraph.nodes.length);
    });

    // Should receive initial update
    expect(updates).toHaveLength(1);
    expect(updates[0]).toBe(3);

    // Cleanup
    unsubscribe();
    dataSource.disconnect();
  });
});

// =============================================================================
// Integration Test 2: TUI Workflow
// LocalDataSource -> GraphPresenter -> GraphView -> TUIPrimitives
// =============================================================================

describe("Full TUI Workflow (LocalDataSource -> GraphView)", () => {
  it("renders graph data from LocalDataSource through TUI primitives", async () => {
    // 1. Create graph and data source
    const graph = createTestGraph();
    const dataSource = new LocalDataSource(graph);
    await dataSource.connect();

    // 2. Get graph data
    const exportedGraph = dataSource.getGraph();

    // 3. Create presenter and view model
    const mockDataSource = createMockDataSource({
      getGraph: () => exportedGraph,
    });
    const presenter = new GraphPresenter(mockDataSource);
    const viewModel = presenter.getViewModel();

    // 4. Create TUI element (no DOM render for TUI)
    const element = (
      <PrimitivesProvider primitives={TUIPrimitives}>
        <GraphView viewModel={viewModel} />
      </PrimitivesProvider>
    );

    // 5. Verify element structure
    expect(element).toBeDefined();
    expect(element.props.primitives.rendererType).toBe("tui");

    // Cleanup
    dataSource.disconnect();
  });

  it("produces ASCII output for TUI rendering", () => {
    const mockDataSource = createMockDataSource();
    const presenter = new GraphPresenter(mockDataSource);
    const viewModel = presenter.getViewModel();

    // Use TUI primitives
    const { GraphRenderer } = TUIPrimitives;
    const element = GraphRenderer({ viewModel });

    // Should produce a box element for TUI
    expect(element).toBeDefined();
    expect(element?.type).toBe("box");

    // Verify structure contains node info
    const content = JSON.stringify(element);
    expect(content).toContain("Logger");
    expect(content).toContain("Config");
    expect(content).toContain("UserService");
  });
});

// =============================================================================
// Integration Test 3: Graph Updates When Container Changes
// =============================================================================

describe("Graph updates when container changes", () => {
  it("presenter produces updated view model when graph data changes", () => {
    let currentGraph: ExportedGraph = {
      nodes: [{ id: "ServiceA", label: "ServiceA", lifetime: "singleton", factoryKind: "sync" }],
      edges: [],
    };

    const mockDataSource = createMockDataSource({
      getGraph: () => currentGraph,
    });

    const presenter = new GraphPresenter(mockDataSource);

    // Initial state
    let vm = presenter.getViewModel();
    expect(vm.nodeCount).toBe(1);
    expect(vm.nodes.find((n) => n.id === "ServiceA")).toBeDefined();

    // Simulate graph change
    currentGraph = {
      nodes: [
        { id: "ServiceA", label: "ServiceA", lifetime: "singleton", factoryKind: "sync" },
        { id: "ServiceB", label: "ServiceB", lifetime: "scoped", factoryKind: "async" },
      ],
      edges: [{ from: "ServiceB", to: "ServiceA" }],
    };

    // Get updated view model
    vm = presenter.getViewModel();
    expect(vm.nodeCount).toBe(2);
    expect(vm.edgeCount).toBe(1);
    expect(vm.nodes.find((n) => n.id === "ServiceB")).toBeDefined();
  });

  it("LocalDataSource emits events on state changes", async () => {
    const graph = createTestGraph();
    const dataSource = new LocalDataSource(graph);

    const events: string[] = [];
    dataSource.on((event) => events.push(event.type));

    await dataSource.connect();

    // Should have received connect and graph_update events
    expect(events).toContain("connected");
    expect(events).toContain("graph_update");

    dataSource.disconnect();
    expect(events).toContain("disconnected");
  });
});

// =============================================================================
// Integration Test 4: Timeline Updates During Resolution
// =============================================================================

describe("Timeline updates during resolution", () => {
  it("TimelinePresenter transforms trace data to view model entries", () => {
    const traces = [
      {
        id: "trace-1",
        portName: "Logger",
        lifetime: "singleton" as const,
        startTime: Date.now(),
        duration: 5.5,
        isCacheHit: false,
        isPinned: false,
        parentId: null,
        childIds: [],
        scopeId: null,
        order: 1,
      },
      {
        id: "trace-2",
        portName: "UserService",
        lifetime: "scoped" as const,
        startTime: Date.now() + 10,
        duration: 12.3,
        isCacheHit: false,
        isPinned: false,
        parentId: "trace-1",
        childIds: [],
        scopeId: "scope-1",
        order: 2,
      },
    ];

    const mockDataSource = createMockDataSource({
      hasTracing: () => true,
      getTraces: () => traces,
    });

    const presenter = new TimelinePresenter(mockDataSource);
    const vm = presenter.getViewModel();

    // Verify timeline entries
    expect(vm.isEmpty).toBe(false);
    expect(vm.totalCount).toBe(2);
    expect(vm.entries).toHaveLength(2);

    // Verify entry details
    const loggerEntry = vm.entries.find((e) => e.portName === "Logger");
    expect(loggerEntry).toBeDefined();
    expect(loggerEntry?.durationFormatted).toBe("5.50ms");

    const userServiceEntry = vm.entries.find((e) => e.portName === "UserService");
    expect(userServiceEntry).toBeDefined();
    expect(userServiceEntry?.durationFormatted).toBe("12.30ms");
  });

  it("TimelineView renders entries through primitives", () => {
    const timelineVm = {
      ...createEmptyTimelineViewModel(),
      isEmpty: false,
      totalCount: 1,
      visibleCount: 1,
      entries: Object.freeze([
        {
          id: "trace-1",
          portName: "TestService",
          lifetime: "singleton" as const,
          startTime: "10:00:00.000",
          durationMs: 5,
          durationFormatted: "5.00ms",
          isCacheHit: false,
          isPinned: false,
          parentId: null,
          childIds: [],
          scopeId: null,
          order: 1,
          depth: 0,
          isExpanded: false,
          isSelected: false,
          isSlow: false,
          relativePosition: 0,
          relativeWidth: 0.1,
        },
      ]),
    };

    render(
      <PrimitivesProvider primitives={DOMPrimitives}>
        <TimelineView viewModel={timelineVm} />
      </PrimitivesProvider>
    );

    // Verify trace entry is rendered
    expect(screen.getByText("TestService")).toBeTruthy();
    expect(screen.getByText("5.00ms")).toBeTruthy();
  });
});

// =============================================================================
// Integration Test 5: Tab Switching Preserves State
// =============================================================================

describe("Tab switching preserves state", () => {
  afterEach(() => {
    cleanup();
  });

  it("PanelPresenter maintains state across tab changes", () => {
    const mockDataSource = createMockDataSource();
    const presenter = new PanelPresenter(mockDataSource);

    // Open panel and select graph tab
    presenter.open();
    presenter.setActiveTab("graph");

    let vm = presenter.getViewModel();
    expect(vm.isOpen).toBe(true);
    expect(vm.activeTabId).toBe("graph");

    // Switch to tracing tab
    presenter.setActiveTab("tracing");
    vm = presenter.getViewModel();
    expect(vm.activeTabId).toBe("tracing");
    expect(vm.isOpen).toBe(true); // Panel still open

    // Switch back to graph
    presenter.setActiveTab("graph");
    vm = presenter.getViewModel();
    expect(vm.activeTabId).toBe("graph");
    expect(vm.isOpen).toBe(true); // Panel still open
  });

  it("DevToolsPanel UI reflects tab changes", () => {
    const panelVm: PanelViewModel = {
      ...createEmptyPanelViewModel(),
      isOpen: true,
      tabs: Object.freeze([
        { id: "graph" as const, label: "Graph", icon: "graph", isActive: true, isEnabled: true, badgeCount: null, showBadge: false },
        { id: "services" as const, label: "Services", icon: "services", isActive: false, isEnabled: true, badgeCount: null, showBadge: false },
        { id: "tracing" as const, label: "Tracing", icon: "timeline", isActive: false, isEnabled: true, badgeCount: 5, showBadge: true },
        { id: "inspector" as const, label: "Inspector", icon: "inspector", isActive: false, isEnabled: true, badgeCount: null, showBadge: false },
      ]),
      activeTabId: "graph" as const,
    };

    const onTabChange = vi.fn();

    render(
      <PrimitivesProvider primitives={DOMPrimitives}>
        <DevToolsPanel viewModel={panelVm} onTabChange={onTabChange} />
      </PrimitivesProvider>
    );

    // Verify all tabs are rendered
    expect(screen.getByText("Graph")).toBeTruthy();
    expect(screen.getByText("Tracing")).toBeTruthy();

    // Click on Tracing tab
    fireEvent.click(screen.getByText("Tracing"));
    expect(onTabChange).toHaveBeenCalledWith("tracing");

    // Click on Services tab
    fireEvent.click(screen.getByText("Services"));
    expect(onTabChange).toHaveBeenCalledWith("services");
  });

  it("each tab maintains its own selection state via presenters", () => {
    // Create mock with tracing enabled for timeline presenter
    const traces = [
      {
        id: "trace-1",
        portName: "Logger",
        lifetime: "singleton" as const,
        startTime: Date.now(),
        duration: 5.5,
        isCacheHit: false,
        isPinned: false,
        parentId: null,
        childIds: [],
        scopeId: null,
        order: 1,
      },
    ];

    const mockDataSource = createMockDataSource({
      hasTracing: () => true,
      getTraces: () => traces,
    });

    const graphPresenter = new GraphPresenter(mockDataSource);
    const timelinePresenter = new TimelinePresenter(mockDataSource);

    // Select node in graph
    graphPresenter.selectNode("Logger");
    const graphVm = graphPresenter.getViewModel();
    expect(graphVm.selectedNodeId).toBe("Logger");

    // Select trace in timeline (independent)
    timelinePresenter.selectEntry("trace-1");
    const timelineVm = timelinePresenter.getViewModel();
    expect(timelineVm.selectedEntryId).toBe("trace-1");

    // Graph selection should be unchanged
    const graphVm2 = graphPresenter.getViewModel();
    expect(graphVm2.selectedNodeId).toBe("Logger");
  });
});

// =============================================================================
// Integration Test 6: Platform Switching Scenarios
// =============================================================================

describe("Platform switching scenarios", () => {
  it("same view model works with both DOM and TUI primitives", () => {
    const mockDataSource = createMockDataSource();
    const presenter = new GraphPresenter(mockDataSource);
    const viewModel = presenter.getViewModel();

    // DOM rendering
    const { unmount } = render(
      <PrimitivesProvider primitives={DOMPrimitives}>
        <GraphView viewModel={viewModel} />
      </PrimitivesProvider>
    );

    // Verify DOM structure
    expect(screen.getByTestId("graph-view")).toBeTruthy();
    unmount();

    // TUI rendering (element creation, not DOM)
    const tuiElement = (
      <PrimitivesProvider primitives={TUIPrimitives}>
        <GraphView viewModel={viewModel} />
      </PrimitivesProvider>
    );

    expect(tuiElement.props.primitives.rendererType).toBe("tui");
  });

  it("presenters are platform-agnostic", () => {
    const mockDataSource = createMockDataSource();

    // Same presenters for both platforms
    const graphPresenter = new GraphPresenter(mockDataSource);
    const timelinePresenter = new TimelinePresenter(mockDataSource);
    const panelPresenter = new PanelPresenter(mockDataSource);

    // View models are platform-agnostic
    const graphVm = graphPresenter.getViewModel();
    const timelineVm = timelinePresenter.getViewModel();
    const panelVm = panelPresenter.getViewModel();

    // All view models are frozen (immutable)
    expect(Object.isFrozen(graphVm)).toBe(true);
    expect(Object.isFrozen(timelineVm)).toBe(true);
    expect(Object.isFrozen(panelVm)).toBe(true);

    // View models can be used with any primitives
    expect(graphVm.nodeCount).toBe(3);
    expect(timelineVm.isEmpty).toBe(true);
    expect(panelVm.tabs).toHaveLength(4);
  });
});
