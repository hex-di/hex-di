/**
 * Tests for shared headless components.
 *
 * These tests verify:
 * 1. DevToolsPanel renders tab navigation
 * 2. GraphView renders empty state correctly
 * 3. GraphView renders nodes and edges
 * 4. TimelineView renders trace entries
 * 5. StatsView displays statistics
 * 6. InspectorView shows service details
 * 7. Components receive view models via props
 * 8. Components emit events via callbacks
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, screen, fireEvent } from "@testing-library/react";
import React from "react";
import type { RenderPrimitives, RendererType } from "../../src/ports/render-primitives.port.js";
import { PrimitivesProvider } from "../../src/hooks/primitives-context.js";
import { DevToolsPanel } from "../../src/components/DevToolsPanel.js";
import { GraphView } from "../../src/components/GraphView.js";
import { TimelineView } from "../../src/components/TimelineView.js";
import { StatsView } from "../../src/components/StatsView.js";
import { InspectorView } from "../../src/components/InspectorView.js";
import {
  createEmptyPanelViewModel,
  createEmptyGraphViewModel,
  createEmptyTimelineViewModel,
  createEmptyStatsViewModel,
  createEmptyInspectorViewModel,
} from "../../src/view-models/index.js";
import type {
  PanelViewModel,
  GraphViewModel,
  TimelineViewModel,
  StatsViewModel,
  InspectorViewModel,
  TabId,
} from "../../src/view-models/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Creates a mock RenderPrimitives object for testing.
 * Uses real DOM elements for rendering verification.
 */
function createMockPrimitives(): RenderPrimitives<"dom"> {
  return {
    rendererType: "dom",
    Box: ({ children, onClick, "data-testid": testId, ...props }) => (
      <div data-testid={testId} onClick={onClick}>
        {children}
      </div>
    ),
    Text: ({ children, "data-testid": testId, variant, color, bold }) => (
      <span data-testid={testId} data-variant={variant} data-color={color} data-bold={bold}>
        {children}
      </span>
    ),
    Button: ({ label, onClick, disabled, "data-testid": testId }) => (
      <button data-testid={testId} onClick={onClick} disabled={disabled}>
        {label}
      </button>
    ),
    Icon: ({ name, color, size }) => <span data-icon={name} data-color={color} data-size={size} aria-hidden="true" />,
    ScrollView: ({ children }) => <div data-scrollview="true">{children}</div>,
    Divider: ({ orientation }) => <hr data-orientation={orientation} />,
    GraphRenderer: ({ viewModel, onNodeSelect }) => (
      <div
        data-testid="graph-renderer"
        data-node-count={viewModel.nodeCount}
        data-edge-count={viewModel.edgeCount}
        onClick={() => onNodeSelect?.({ nodeId: "test-node" })}
      >
        {viewModel.isEmpty ? "Empty" : `${viewModel.nodeCount} nodes`}
      </div>
    ),
    FlameGraph: ({ viewModel, onFrameSelect }) => (
      <div data-testid="flame-graph" onClick={() => onFrameSelect?.("test-frame")}>
        Flame Graph
      </div>
    ),
    TimelineScrubber: ({ snapshots, currentIndex, onNavigate }) => (
      <div data-testid="timeline-scrubber" onClick={() => onNavigate?.(0)}>
        Timeline ({snapshots.length} snapshots, current: {currentIndex})
      </div>
    ),
    DiffView: ({ viewModel }) => <div data-testid="diff-view">Diff View</div>,
    ContainerTree: ({ viewModel, onContainerSelect }) => (
      <div
        data-testid="container-tree"
        onClick={() => onContainerSelect?.("root")}
      >
        Container Tree
      </div>
    ),
    PerformanceBadge: ({ durationMs, thresholdMs, showLabel }) => (
      <span data-testid="perf-badge" data-duration={durationMs} data-threshold={thresholdMs}>
        {showLabel !== false ? `${durationMs.toFixed(2)}ms` : ''}
      </span>
    ),
    styleSystem: {
      getColor: (color) => `var(--hex-devtools-${color})`,
      colors: {
        primary: "var(--hex-devtools-primary)",
        secondary: "var(--hex-devtools-secondary)",
        success: "var(--hex-devtools-success)",
        warning: "var(--hex-devtools-warning)",
        error: "var(--hex-devtools-error)",
        muted: "var(--hex-devtools-muted)",
        foreground: "var(--hex-devtools-foreground)",
        background: "var(--hex-devtools-background)",
        border: "var(--hex-devtools-border)",
        accent: "var(--hex-devtools-accent)",
      },
    },
  };
}

/**
 * Test wrapper component that provides primitives context.
 */
function TestWrapper({ children }: { children: React.ReactNode }) {
  const primitives = createMockPrimitives();
  return (
    <PrimitivesProvider primitives={primitives}>{children}</PrimitivesProvider>
  );
}

/**
 * Creates a graph view model with test data.
 */
function createTestGraphViewModel(): GraphViewModel {
  return Object.freeze({
    nodes: Object.freeze([
      {
        id: "LoggerPort",
        label: "Logger",
        lifetime: "singleton" as const,
        factoryKind: "sync" as const,
        position: { x: 0, y: 0 },
        dimensions: { width: 100, height: 50 },
        isSelected: false,
        isHighlighted: false,
        isDimmed: false,
      },
      {
        id: "UserServicePort",
        label: "UserService",
        lifetime: "scoped" as const,
        factoryKind: "async" as const,
        position: { x: 100, y: 100 },
        dimensions: { width: 120, height: 50 },
        isSelected: false,
        isHighlighted: false,
        isDimmed: false,
      },
    ]),
    edges: Object.freeze([
      {
        id: "edge-1",
        from: "UserServicePort",
        to: "LoggerPort",
        isHighlighted: false,
        isDimmed: false,
      },
    ]),
    direction: "TB" as const,
    viewport: { width: 400, height: 300, minX: 0, minY: 0, maxX: 400, maxY: 300 },
    selectedNodeId: null,
    highlightedNodeIds: [],
    zoom: 1,
    panOffset: { x: 0, y: 0 },
    isEmpty: false,
    nodeCount: 2,
    edgeCount: 1,
  });
}

/**
 * Creates a timeline view model with test data.
 */
function createTestTimelineViewModel(): TimelineViewModel {
  return Object.freeze({
    entries: Object.freeze([
      {
        id: "trace-1",
        portName: "LoggerPort",
        lifetime: "singleton" as const,
        startTime: "10:00:00.000",
        durationMs: 5.5,
        durationFormatted: "5.50ms",
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
      {
        id: "trace-2",
        portName: "UserServicePort",
        lifetime: "scoped" as const,
        startTime: "10:00:00.010",
        durationMs: 12.3,
        durationFormatted: "12.30ms",
        isCacheHit: true,
        isPinned: false,
        parentId: null,
        childIds: [],
        scopeId: "scope-1",
        order: 2,
        depth: 0,
        isExpanded: false,
        isSelected: false,
        isSlow: true,
        relativePosition: 0.1,
        relativeWidth: 0.2,
      },
    ]),
    groups: [],
    grouping: "none" as const,
    sortOrder: "time" as const,
    sortDescending: false,
    timeRange: { startMs: 0, endMs: 100, durationMs: 100 },
    selectedEntryId: null,
    expandedEntryIds: [],
    filterText: "",
    showOnlyCacheHits: false,
    showOnlySlow: false,
    slowThresholdMs: 10,
    totalCount: 2,
    visibleCount: 2,
    isEmpty: false,
    isPaused: false,
  });
}

/**
 * Creates a stats view model with test data.
 */
function createTestStatsViewModel(): StatsViewModel {
  return Object.freeze({
    metrics: Object.freeze({
      totalResolutions: { id: "total", label: "Total", value: 100, formattedValue: "100", unit: "", trend: "up" as const, trendPercent: 10 },
      averageDuration: { id: "avg", label: "Avg Duration", value: 5.5, formattedValue: "5.5", unit: "ms", trend: "stable" as const, trendPercent: 0 },
      cacheHitRate: { id: "cache", label: "Cache Hit", value: 85, formattedValue: "85", unit: "%", trend: "up" as const, trendPercent: 5 },
      slowResolutions: { id: "slow", label: "Slow", value: 3, formattedValue: "3", unit: "", trend: "down" as const, trendPercent: -20 },
      sessionDuration: { id: "session", label: "Session", value: 3600, formattedValue: "1h", unit: "", trend: "none" as const, trendPercent: 0 },
      resolutionsPerSecond: { id: "rps", label: "Res/sec", value: 2.5, formattedValue: "2.5", unit: "", trend: "stable" as const, trendPercent: 0 },
    }),
    lifetimeBreakdown: { singleton: 50, scoped: 30, request: 20, total: 100 },
    lifetimeBreakdownFormatted: { singleton: "50%", scoped: "30%", request: "20%" },
    topServicesByCount: [],
    topServicesByDuration: [],
    slowestServices: [],
    resolutionTimeSeries: { id: "res", label: "Resolutions", points: [] },
    cacheHitTimeSeries: { id: "cache", label: "Cache", points: [] },
    memoryTracking: {
      singletonCount: 10,
      scopedCount: 5,
      activeScopeCount: 2,
      singletonPoolSize: 10,
      scopedDistribution: { min: 1, max: 3, avg: 2.5 },
      growthTrend: "stable" as const,
      estimatedMemoryBytes: 1024,
      estimatedMemoryFormatted: "1 KB",
    },
    sessionStart: "10:00:00",
    sessionDuration: "1h 0m",
    isEmpty: false,
    lastUpdated: "10:05:00",
  });
}

/**
 * Creates an inspector view model with test data.
 */
function createTestInspectorViewModel(): InspectorViewModel {
  return Object.freeze({
    target: "service" as const,
    service: Object.freeze({
      portName: "LoggerPort",
      lifetime: "singleton" as const,
      factoryKind: "sync" as const,
      isResolved: true,
      resolutionCount: 5,
      avgDurationMs: 2.5,
      avgDurationFormatted: "2.50ms",
      cacheHitCount: 4,
      cacheHitRate: 80,
      lastResolved: "10:05:00",
      totalDurationMs: 12.5,
    }),
    dependencies: Object.freeze([
      { portName: "ConfigPort", lifetime: "singleton" as const, isDirect: true, depth: 0 },
    ]),
    dependents: Object.freeze([
      { portName: "UserServicePort", lifetime: "scoped" as const, isDirect: true, depth: 0 },
      { portName: "AuthServicePort", lifetime: "scoped" as const, isDirect: true, depth: 0 },
    ]),
    scope: null,
    scopeServices: [],
    scopeTree: [],
    filterText: "",
    showDependencies: true,
    showDependents: true,
    hasData: true,
  });
}

/**
 * Creates a panel view model with test data.
 */
function createTestPanelViewModel(): PanelViewModel {
  return Object.freeze({
    tabs: Object.freeze([
      { id: "graph" as const, label: "Graph", icon: "graph" as const, isActive: true, isEnabled: true, badgeCount: null, showBadge: false },
      { id: "services" as const, label: "Services", icon: "services" as const, isActive: false, isEnabled: true, badgeCount: null, showBadge: false },
      { id: "tracing" as const, label: "Tracing", icon: "timeline" as const, isActive: false, isEnabled: true, badgeCount: 5, showBadge: true },
      { id: "inspector" as const, label: "Inspector", icon: "inspector" as const, isActive: false, isEnabled: true, badgeCount: null, showBadge: false },
    ]),
    activeTabId: "graph" as const,
    layout: Object.freeze({
      position: "bottom-right" as const,
      size: { width: 400, height: 500 },
      isFullscreen: false,
      isMinimized: false,
      isResizing: false,
    }),
    isOpen: true,
    isEnabled: true,
    connection: Object.freeze({
      status: "connected" as const,
      serverUrl: "ws://localhost:9000",
      errorMessage: null,
      latencyMs: 5,
      lastPing: "10:05:00",
    }),
    isDarkMode: false,
    appName: "TestApp",
    appVersion: "1.0.0",
    hexDIVersion: "0.1.0",
  });
}

// =============================================================================
// Test Suite
// =============================================================================

describe("Headless Components", () => {
  afterEach(() => {
    cleanup();
  });

  // ---------------------------------------------------------------------------
  // Test 1: DevToolsPanel renders tab navigation
  // ---------------------------------------------------------------------------
  describe("DevToolsPanel", () => {
    it("renders tab navigation", () => {
      const viewModel = createTestPanelViewModel();

      render(
        <TestWrapper>
          <DevToolsPanel viewModel={viewModel} />
        </TestWrapper>
      );

      // Verify all tabs are rendered
      expect(screen.getByText("Graph")).toBeDefined();
      expect(screen.getByText("Services")).toBeDefined();
      expect(screen.getByText("Tracing")).toBeDefined();
      expect(screen.getByText("Inspector")).toBeDefined();
    });

    it("calls onTabChange when tab is clicked", () => {
      const viewModel = createTestPanelViewModel();
      const onTabChange = vi.fn();

      render(
        <TestWrapper>
          <DevToolsPanel viewModel={viewModel} onTabChange={onTabChange} />
        </TestWrapper>
      );

      // Click on a tab
      fireEvent.click(screen.getByText("Tracing"));

      expect(onTabChange).toHaveBeenCalledWith("tracing");
    });
  });

  // ---------------------------------------------------------------------------
  // Test 2 & 3: GraphView renders empty state and nodes/edges
  // ---------------------------------------------------------------------------
  describe("GraphView", () => {
    it("renders empty state correctly", () => {
      const viewModel = createEmptyGraphViewModel();

      render(
        <TestWrapper>
          <GraphView viewModel={viewModel} />
        </TestWrapper>
      );

      // Verify empty state message is shown
      expect(screen.getByText(/no services/i)).toBeDefined();
    });

    it("renders nodes and edges", () => {
      const viewModel = createTestGraphViewModel();

      render(
        <TestWrapper>
          <GraphView viewModel={viewModel} />
        </TestWrapper>
      );

      // Verify graph renderer is called with correct data
      const graphRenderer = screen.getByTestId("graph-renderer");
      expect(graphRenderer.getAttribute("data-node-count")).toBe("2");
      expect(graphRenderer.getAttribute("data-edge-count")).toBe("1");
    });

    it("calls onNodeSelect when node is selected", () => {
      const viewModel = createTestGraphViewModel();
      const onNodeSelect = vi.fn();

      render(
        <TestWrapper>
          <GraphView viewModel={viewModel} onNodeSelect={onNodeSelect} />
        </TestWrapper>
      );

      // Click on graph renderer (which simulates node selection)
      fireEvent.click(screen.getByTestId("graph-renderer"));

      expect(onNodeSelect).toHaveBeenCalledWith("test-node");
    });
  });

  // ---------------------------------------------------------------------------
  // Test 4: TimelineView renders trace entries
  // ---------------------------------------------------------------------------
  describe("TimelineView", () => {
    it("renders trace entries", () => {
      const viewModel = createTestTimelineViewModel();

      render(
        <TestWrapper>
          <TimelineView viewModel={viewModel} />
        </TestWrapper>
      );

      // Verify trace entries are rendered
      expect(screen.getByText("LoggerPort")).toBeDefined();
      expect(screen.getByText("UserServicePort")).toBeDefined();
      expect(screen.getByText("5.50ms")).toBeDefined();
      expect(screen.getByText("12.30ms")).toBeDefined();
    });

    it("renders empty state when no traces", () => {
      const viewModel = createEmptyTimelineViewModel();

      render(
        <TestWrapper>
          <TimelineView viewModel={viewModel} />
        </TestWrapper>
      );

      expect(screen.getByText(/no traces/i)).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 5: StatsView displays statistics
  // ---------------------------------------------------------------------------
  describe("StatsView", () => {
    it("displays statistics", () => {
      const viewModel = createTestStatsViewModel();

      render(
        <TestWrapper>
          <StatsView viewModel={viewModel} />
        </TestWrapper>
      );

      // Verify metrics are displayed - use getAllBy for multiple matches
      expect(screen.getByText("Total")).toBeDefined();
      expect(screen.getByText("100")).toBeDefined();
      // Use exact text match to avoid matching icon name
      expect(screen.getByText("Singleton")).toBeDefined();
      expect(screen.getByText("50%")).toBeDefined();
    });

    it("renders empty state when no data", () => {
      const viewModel = createEmptyStatsViewModel();

      render(
        <TestWrapper>
          <StatsView viewModel={viewModel} />
        </TestWrapper>
      );

      expect(screen.getByText(/no data/i)).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 6: InspectorView shows service details
  // ---------------------------------------------------------------------------
  describe("InspectorView", () => {
    it("shows service details", () => {
      const viewModel = createTestInspectorViewModel();

      render(
        <TestWrapper>
          <InspectorView viewModel={viewModel} />
        </TestWrapper>
      );

      // Verify service info is displayed - use getAllBy for multiple matches
      expect(screen.getByText("LoggerPort")).toBeDefined();
      // Query for exact lifetime text in the metadata section
      const lifetimeElements = screen.getAllByText("singleton");
      expect(lifetimeElements.length).toBeGreaterThan(0);
      expect(screen.getByText("2.50ms")).toBeDefined();
    });

    it("shows dependencies and dependents", () => {
      const viewModel = createTestInspectorViewModel();

      render(
        <TestWrapper>
          <InspectorView viewModel={viewModel} />
        </TestWrapper>
      );

      // Verify dependencies and dependents are shown
      expect(screen.getByText("ConfigPort")).toBeDefined();
      expect(screen.getByText("UserServicePort")).toBeDefined();
      expect(screen.getByText("AuthServicePort")).toBeDefined();
    });

    it("renders empty state when no selection", () => {
      const viewModel = createEmptyInspectorViewModel();

      render(
        <TestWrapper>
          <InspectorView viewModel={viewModel} />
        </TestWrapper>
      );

      expect(screen.getByText(/select a service/i)).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 7: Components receive view models via props
  // ---------------------------------------------------------------------------
  describe("View Model Props", () => {
    it("components receive view models via props", () => {
      const panelVm = createTestPanelViewModel();
      const graphVm = createTestGraphViewModel();

      // Render with different view models to verify props are used
      const { rerender } = render(
        <TestWrapper>
          <DevToolsPanel viewModel={panelVm} />
        </TestWrapper>
      );

      expect(screen.getByText(panelVm.appName)).toBeDefined();

      // Rerender with updated view model
      const updatedPanelVm = {
        ...panelVm,
        appName: "UpdatedApp",
      };

      rerender(
        <TestWrapper>
          <DevToolsPanel viewModel={updatedPanelVm} />
        </TestWrapper>
      );

      expect(screen.getByText("UpdatedApp")).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 8: Components emit events via callbacks
  // ---------------------------------------------------------------------------
  describe("Event Callbacks", () => {
    it("components emit events via callbacks", () => {
      const panelVm = createTestPanelViewModel();
      const onTabChange = vi.fn();
      const onClose = vi.fn();

      render(
        <TestWrapper>
          <DevToolsPanel
            viewModel={panelVm}
            onTabChange={onTabChange}
            onClose={onClose}
          />
        </TestWrapper>
      );

      // Click tab
      fireEvent.click(screen.getByText("Services"));
      expect(onTabChange).toHaveBeenCalledWith("services");

      // Click close button if present
      const closeButton = screen.queryByTestId("close-button");
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(onClose).toHaveBeenCalled();
      }
    });

    it("timeline emits entry selection", () => {
      const viewModel = createTestTimelineViewModel();
      const onEntrySelect = vi.fn();

      render(
        <TestWrapper>
          <TimelineView viewModel={viewModel} onEntrySelect={onEntrySelect} />
        </TestWrapper>
      );

      // Click on first entry
      fireEvent.click(screen.getByText("LoggerPort"));
      expect(onEntrySelect).toHaveBeenCalledWith("trace-1");
    });
  });
});
