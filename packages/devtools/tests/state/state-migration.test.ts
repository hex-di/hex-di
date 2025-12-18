/**
 * State Migration Tests - Task Group 3.1
 *
 * Tests for migrated state management, view models, and presenters.
 * Verifies that state management works correctly in the unified devtools package.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";

// Import state management from new location
import {
  devToolsReducer,
  initialState,
  actions,
  selectActiveTabId,
  selectSelectedNodeId,
  selectTimelineFilter,
  selectInspectorFilter,
} from "../../src/state/index.js";

// Import view models from new location
import {
  createEmptyGraphViewModel,
  createEmptyTimelineViewModel,
  createEmptyStatsViewModel,
  createEmptyInspectorViewModel,
  createEmptyPanelViewModel,
} from "../../src/view-models/index.js";

// Import presenters from new location
import {
  GraphPresenter,
  TimelinePresenter,
  StatsPresenter,
  InspectorPresenter,
  PanelPresenter,
} from "../../src/presenters/index.js";

import type { PresenterDataSourceContract, ExportedGraph } from "@hex-di/devtools-core";

// =============================================================================
// Mock Data Source
// =============================================================================

function createMockDataSource(overrides: Partial<PresenterDataSourceContract> = {}): PresenterDataSourceContract {
  return {
    getGraph: () => ({
      nodes: [
        { id: "ServiceA", label: "ServiceA", lifetime: "singleton", factoryKind: "sync" },
        { id: "ServiceB", label: "ServiceB", lifetime: "scoped", factoryKind: "async" },
      ],
      edges: [{ from: "ServiceA", to: "ServiceB" }],
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
// Test 1: Reducer handles all action types
// =============================================================================

describe("devToolsReducer handles all action types", () => {
  it("handles panel actions", () => {
    // SET_ACTIVE_TAB
    let state = devToolsReducer(initialState, actions.setActiveTab("tracing"));
    expect(state.panel.activeTabId).toBe("tracing");

    // TOGGLE_PANEL
    state = devToolsReducer(initialState, actions.togglePanel());
    expect(state.panel.isOpen).toBe(true);

    // SET_PANEL_OPEN
    state = devToolsReducer(initialState, actions.setPanelOpen(true));
    expect(state.panel.isOpen).toBe(true);

    // SET_FULLSCREEN
    state = devToolsReducer(initialState, actions.setFullscreen(true));
    expect(state.panel.isFullscreen).toBe(true);

    // SET_PANEL_POSITION
    state = devToolsReducer(initialState, actions.setPanelPosition("top-left"));
    expect(state.panel.position).toBe("top-left");

    // SET_DARK_MODE
    state = devToolsReducer(initialState, actions.setDarkMode(true));
    expect(state.panel.isDarkMode).toBe(true);
  });

  it("handles graph actions", () => {
    // SELECT_NODE
    let state = devToolsReducer(initialState, actions.selectNode("ServiceA"));
    expect(state.graph.selectedNodeId).toBe("ServiceA");

    // HIGHLIGHT_NODES
    state = devToolsReducer(initialState, actions.highlightNodes(["ServiceA", "ServiceB"]));
    expect(state.graph.highlightedNodeIds).toEqual(["ServiceA", "ServiceB"]);

    // SET_ZOOM - clamps between 0.1 and 3
    state = devToolsReducer(initialState, actions.setZoom(2.5));
    expect(state.graph.zoom).toBe(2.5);

    state = devToolsReducer(initialState, actions.setZoom(5));
    expect(state.graph.zoom).toBe(3);
  });

  it("handles timeline actions", () => {
    // SELECT_TRACE
    let state = devToolsReducer(initialState, actions.selectTrace("trace-1"));
    expect(state.timeline.selectedEntryId).toBe("trace-1");

    // SET_TIMELINE_FILTER
    state = devToolsReducer(initialState, actions.setTimelineFilter("Logger"));
    expect(state.timeline.filterText).toBe("Logger");

    // SET_TIMELINE_GROUPING
    state = devToolsReducer(initialState, actions.setTimelineGrouping("port"));
    expect(state.timeline.grouping).toBe("port");

    // DATA_UPDATED
    state = devToolsReducer(initialState, actions.dataUpdated());
    expect(state.lastUpdated).toBeGreaterThan(0);
  });

  it("handles inspector actions", () => {
    // SELECT_SERVICE
    let state = devToolsReducer(initialState, actions.selectService("UserService"));
    expect(state.inspector.selectedServicePortName).toBe("UserService");

    // SELECT_SCOPE
    state = devToolsReducer(initialState, actions.selectScope("scope-1"));
    expect(state.inspector.selectedScopeId).toBe("scope-1");
  });
});

// =============================================================================
// Test 2: Selectors return correct derived state
// =============================================================================

describe("selectors return correct derived state", () => {
  it("selectActiveTabId returns correct tab", () => {
    const state = devToolsReducer(initialState, actions.setActiveTab("inspector"));
    expect(selectActiveTabId(state)).toBe("inspector");
  });

  it("selectSelectedNodeId returns correct node", () => {
    const state = devToolsReducer(initialState, actions.selectNode("TestNode"));
    expect(selectSelectedNodeId(state)).toBe("TestNode");
  });

  it("selectTimelineFilter returns correct filter", () => {
    const state = devToolsReducer(initialState, actions.setTimelineFilter("search-term"));
    expect(selectTimelineFilter(state)).toBe("search-term");
  });

  it("selectInspectorFilter returns correct filter", () => {
    // Inspector filter is set via SET_INSPECTOR_FILTER action
    const state = devToolsReducer(initialState, {
      type: "SET_INSPECTOR_FILTER",
      payload: "filter-text",
    });
    expect(selectInspectorFilter(state)).toBe("filter-text");
  });
});

// =============================================================================
// Test 3: View model factories create frozen objects
// =============================================================================

describe("view model factories create frozen objects", () => {
  it("createEmptyGraphViewModel returns frozen object", () => {
    const vm = createEmptyGraphViewModel();
    expect(Object.isFrozen(vm)).toBe(true);
    expect(Object.isFrozen(vm.nodes)).toBe(true);
    expect(Object.isFrozen(vm.edges)).toBe(true);
    expect(Object.isFrozen(vm.viewport)).toBe(true);
    expect(Object.isFrozen(vm.panOffset)).toBe(true);
  });

  it("createEmptyTimelineViewModel returns frozen object", () => {
    const vm = createEmptyTimelineViewModel();
    expect(Object.isFrozen(vm)).toBe(true);
    expect(Object.isFrozen(vm.entries)).toBe(true);
    expect(Object.isFrozen(vm.groups)).toBe(true);
    expect(Object.isFrozen(vm.timeRange)).toBe(true);
  });

  it("createEmptyStatsViewModel returns frozen object", () => {
    const vm = createEmptyStatsViewModel();
    expect(Object.isFrozen(vm)).toBe(true);
    expect(Object.isFrozen(vm.metrics)).toBe(true);
    expect(Object.isFrozen(vm.lifetimeBreakdown)).toBe(true);
    expect(Object.isFrozen(vm.topServicesByCount)).toBe(true);
  });

  it("createEmptyInspectorViewModel returns frozen object", () => {
    const vm = createEmptyInspectorViewModel();
    expect(Object.isFrozen(vm)).toBe(true);
    expect(Object.isFrozen(vm.dependencies)).toBe(true);
    expect(Object.isFrozen(vm.dependents)).toBe(true);
    expect(Object.isFrozen(vm.scopeTree)).toBe(true);
  });

  it("createEmptyPanelViewModel returns frozen object", () => {
    const vm = createEmptyPanelViewModel();
    expect(Object.isFrozen(vm)).toBe(true);
    expect(Object.isFrozen(vm.tabs)).toBe(true);
    expect(Object.isFrozen(vm.layout)).toBe(true);
    expect(Object.isFrozen(vm.connection)).toBe(true);
  });
});

// =============================================================================
// Test 4: Presenter transforms work correctly
// =============================================================================

describe("presenter transforms work correctly", () => {
  it("GraphPresenter transforms graph data to view model", () => {
    const dataSource = createMockDataSource();
    const presenter = new GraphPresenter(dataSource);

    const vm = presenter.getViewModel();

    expect(vm.nodes).toHaveLength(2);
    expect(vm.edges).toHaveLength(1);
    expect(vm.isEmpty).toBe(false);
    expect(vm.nodeCount).toBe(2);
    expect(vm.edgeCount).toBe(1);

    // Check node transformation
    const nodeA = vm.nodes.find(n => n.id === "ServiceA");
    expect(nodeA).toBeDefined();
    expect(nodeA?.label).toBe("ServiceA");
    expect(nodeA?.lifetime).toBe("singleton");
    expect(nodeA?.factoryKind).toBe("sync");
  });

  it("TimelinePresenter transforms trace data to view model", () => {
    const dataSource = createMockDataSource({
      hasTracing: () => true,
      getTraces: () => [
        {
          id: "trace-1",
          portName: "TestService",
          lifetime: "singleton",
          startTime: Date.now(),
          duration: 5.5,
          isCacheHit: false,
          isPinned: false,
          parentId: null,
          childIds: [],
          scopeId: null,
          order: 1,
        },
      ],
    });
    const presenter = new TimelinePresenter(dataSource);

    const vm = presenter.getViewModel();

    expect(vm.isEmpty).toBe(false);
    expect(vm.totalCount).toBe(1);
    expect(vm.entries).toHaveLength(1);
    const firstEntry = vm.entries[0];
    expect(firstEntry).toBeDefined();
    expect(firstEntry!.portName).toBe("TestService");
    expect(firstEntry!.durationFormatted).toBe("5.50ms");
  });

  it("StatsPresenter transforms stats data to view model", () => {
    const dataSource = createMockDataSource({
      hasTracing: () => true,
      getTraces: () => [
        {
          id: "trace-1",
          portName: "TestService",
          lifetime: "singleton",
          startTime: Date.now(),
          duration: 10,
          isCacheHit: false,
          isPinned: false,
          parentId: null,
          childIds: [],
          scopeId: null,
          order: 1,
        },
        {
          id: "trace-2",
          portName: "TestService",
          lifetime: "singleton",
          startTime: Date.now(),
          duration: 5,
          isCacheHit: true,
          isPinned: false,
          parentId: null,
          childIds: [],
          scopeId: null,
          order: 2,
        },
      ],
      getStats: () => ({
        totalResolutions: 2,
        averageDuration: 7.5,
        cacheHitRate: 0.5,
        slowCount: 1,
        totalDuration: 15,
        sessionStart: Date.now() - 60000,
      }),
    });
    const presenter = new StatsPresenter(dataSource);

    const vm = presenter.getViewModel();

    expect(vm.isEmpty).toBe(false);
    expect(vm.metrics.totalResolutions.value).toBe(2);
    expect(vm.lifetimeBreakdown.singleton).toBe(2);
    expect(vm.topServicesByCount).toHaveLength(1);
    const topService = vm.topServicesByCount[0];
    expect(topService).toBeDefined();
    expect(topService!.portName).toBe("TestService");
  });

  it("PanelPresenter transforms panel state to view model", () => {
    const dataSource = createMockDataSource();
    const presenter = new PanelPresenter(dataSource);

    presenter.open();
    presenter.setActiveTab("tracing");

    const vm = presenter.getViewModel();

    expect(vm.isOpen).toBe(true);
    expect(vm.activeTabId).toBe("tracing");
    expect(vm.tabs).toHaveLength(4);
    expect(vm.tabs.find(t => t.id === "tracing")?.isActive).toBe(true);
  });

  it("InspectorPresenter transforms service info to view model", () => {
    const dataSource = createMockDataSource({
      hasContainer: () => true,
      hasTracing: () => true,
      getTraces: () => [
        {
          id: "trace-1",
          portName: "ServiceA",
          lifetime: "singleton",
          startTime: Date.now(),
          duration: 5,
          isCacheHit: false,
          isPinned: false,
          parentId: null,
          childIds: [],
          scopeId: null,
          order: 1,
        },
      ],
    });
    const presenter = new InspectorPresenter(dataSource);

    presenter.selectService("ServiceA");
    const vm = presenter.getViewModel();

    expect(vm.target).toBe("service");
    expect(vm.service).toBeDefined();
    expect(vm.service?.portName).toBe("ServiceA");
    expect(vm.service?.lifetime).toBe("singleton");
    expect(vm.dependencies).toHaveLength(1);
  });
});
