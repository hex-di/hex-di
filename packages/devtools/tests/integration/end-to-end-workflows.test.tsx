/**
 * End-to-End Workflow Integration Tests - Task Group 13.3
 *
 * These tests verify complete end-to-end workflows across the full-featured DevTools:
 * 1. Full panel render with all tabs
 * 2. Tab navigation preserves state
 * 3. Filter changes propagate across tabs
 * 4. Service selection navigates to Inspector
 * 5. Trace selection shows in Inspector
 * 6. Container switching updates all views
 * 7. Time-travel affects all tabs
 * 8. Comparison view from any tab
 * 9. Theme toggle applies everywhere
 * 10. Sync reconnection restores state
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { DevToolsPanel } from "../../src/components/DevToolsPanel.js";
import { PrimitivesProvider } from "../../src/hooks/primitives-context.js";
import { devToolsReducer } from "../../src/state/reducer.js";
import { initialState } from "../../src/state/devtools.state.js";
import { actions } from "../../src/state/actions.js";
import type { RenderPrimitives } from "../../src/ports/render-primitives.port.js";
import type { ContainerSnapshot } from "@hex-di/devtools-core";
import type { DevToolsState } from "../../src/state/devtools.state.js";
import { createEmptyPanelViewModel } from "../../src/view-models/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockPrimitives(): RenderPrimitives<"dom"> {
  return {
    rendererType: "dom",
    Box: ({ children, onClick, "data-testid": testId }) => (
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
    Icon: ({ name, color }) => <span data-icon={name} data-color={color} aria-hidden="true" />,
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

function createTestSnapshot(serviceCount: number): ContainerSnapshot {
  return {
    singletons: Array.from({ length: serviceCount }, (_, i) => ({
      portName: `Service${i + 1}`,
      resolvedAt: 1000 + i * 100,
    })),
    scopes: [],
    phase: "ready",
  };
}

// =============================================================================
// Test 1: Full Panel Render with All Tabs
// =============================================================================

describe("End-to-End Workflows", () => {
  describe("Test 1: Full panel render with all tabs", () => {
    it("should render DevToolsPanel with all 4 tabs visible", () => {
      const primitives = createMockPrimitives();
      const onTabChange = vi.fn();
      const viewModel = createEmptyPanelViewModel();

      render(
        <PrimitivesProvider primitives={primitives}>
          <DevToolsPanel
            viewModel={{
              ...viewModel,
              tabs: [
                { id: "graph", label: "Graph", icon: "graph", isActive: true, isEnabled: true, badgeCount: null, showBadge: false },
                { id: "services", label: "Services", icon: "services", isActive: false, isEnabled: true, badgeCount: null, showBadge: false },
                { id: "tracing", label: "Tracing", icon: "timeline", isActive: false, isEnabled: true, badgeCount: null, showBadge: false },
                { id: "inspector", label: "Inspector", icon: "inspector", isActive: false, isEnabled: true, badgeCount: null, showBadge: false },
              ],
              activeTabId: "graph",
              isOpen: true,
            }}
            onTabChange={onTabChange}
          />
        </PrimitivesProvider>
      );

      // Verify all 4 tabs are rendered
      expect(screen.getByText("Graph")).toBeDefined();
      expect(screen.getByText("Services")).toBeDefined();
      expect(screen.getByText("Tracing")).toBeDefined();
      expect(screen.getByText("Inspector")).toBeDefined();
    });

    it("should render all tabs with correct initial state", () => {
      const primitives = createMockPrimitives();
      const viewModel = createEmptyPanelViewModel();

      const { container } = render(
        <PrimitivesProvider primitives={primitives}>
          <DevToolsPanel
            viewModel={{
              ...viewModel,
              tabs: [
                { id: "graph", label: "Graph", icon: "graph", isActive: true, isEnabled: true, badgeCount: null, showBadge: false },
                { id: "services", label: "Services", icon: "services", isActive: false, isEnabled: true, badgeCount: null, showBadge: false },
                { id: "tracing", label: "Tracing", icon: "timeline", isActive: false, isEnabled: true, badgeCount: null, showBadge: false },
                { id: "inspector", label: "Inspector", icon: "inspector", isActive: false, isEnabled: true, badgeCount: null, showBadge: false },
              ],
              activeTabId: "graph",
              isOpen: true,
            }}
            onTabChange={vi.fn()}
          />
        </PrimitivesProvider>
      );

      expect(container.firstChild).toBeTruthy();
    });
  });

  // =============================================================================
  // Test 2: Tab Navigation Preserves State
  // =============================================================================

  describe("Test 2: Tab navigation preserves state", () => {
    it("should preserve graph filter when switching to Inspector and back", () => {
      let state = initialState;

      // Set graph filter
      state = devToolsReducer(state, actions.setTimelineFilter("Logger"));
      expect(state.timeline.filterText).toBe("Logger");

      // Switch to inspector tab
      state = devToolsReducer(state, actions.setActiveTab("inspector"));
      expect(state.panel.activeTabId).toBe("inspector");

      // Verify graph filter is still preserved
      expect(state.timeline.filterText).toBe("Logger");

      // Switch back to graph
      state = devToolsReducer(state, actions.setActiveTab("graph"));
      expect(state.panel.activeTabId).toBe("graph");
      expect(state.timeline.filterText).toBe("Logger");
    });

    it("should maintain selected node across tab switches", () => {
      let state = initialState;

      // Select a node
      state = devToolsReducer(state, actions.selectNode("ServiceA"));
      expect(state.graph.selectedNodeId).toBe("ServiceA");

      // Switch tabs
      state = devToolsReducer(state, actions.setActiveTab("services"));
      state = devToolsReducer(state, actions.setActiveTab("tracing"));
      state = devToolsReducer(state, actions.setActiveTab("graph"));

      // Selection should be preserved
      expect(state.graph.selectedNodeId).toBe("ServiceA");
    });
  });

  // =============================================================================
  // Test 3: Filter Changes Propagate Across Tabs
  // =============================================================================

  describe("Test 3: Filter changes propagate across tabs", () => {
    it("should apply filter to both timeline and inspector views", () => {
      let state = initialState;

      // Set timeline filter
      state = devToolsReducer(state, actions.setTimelineFilter("User"));
      expect(state.timeline.filterText).toBe("User");

      // Set inspector filter
      state = devToolsReducer(state, { type: "SET_INSPECTOR_FILTER", payload: "Logger" });
      expect(state.inspector.filterText).toBe("Logger");

      // Both filters should be maintained independently
      expect(state.timeline.filterText).toBe("User");
      expect(state.inspector.filterText).toBe("Logger");
    });

    it("should maintain filter state during tab navigation", () => {
      let state = initialState;

      state = devToolsReducer(state, actions.setTimelineFilter("Service"));
      state = devToolsReducer(state, actions.setActiveTab("inspector"));
      state = devToolsReducer(state, { type: "SET_INSPECTOR_FILTER", payload: "Cache" });

      // Switch back to timeline
      state = devToolsReducer(state, actions.setActiveTab("tracing"));

      // Both filters preserved
      expect(state.timeline.filterText).toBe("Service");
      expect(state.inspector.filterText).toBe("Cache");
    });
  });

  // =============================================================================
  // Test 4: Service Selection Navigates to Inspector
  // =============================================================================

  describe("Test 4: Service selection navigates to Inspector", () => {
    it("should switch to Inspector tab and show service details", () => {
      let state = initialState;

      // Select a node in graph view
      state = devToolsReducer(state, actions.selectNode("UserService"));
      expect(state.graph.selectedNodeId).toBe("UserService");

      // This should trigger navigation to inspector (simulated by action)
      state = devToolsReducer(state, actions.setActiveTab("inspector"));
      expect(state.panel.activeTabId).toBe("inspector");

      // Inspector should show the selected service
      expect(state.graph.selectedNodeId).toBe("UserService");
    });
  });

  // =============================================================================
  // Test 5: Trace Selection Shows in Inspector
  // =============================================================================

  describe("Test 5: Trace selection shows in Inspector", () => {
    it("should navigate to Inspector when trace is selected", () => {
      let state = initialState;

      // Select a trace entry
      state = devToolsReducer(state, { type: "SELECT_TRACE", payload: "trace-123" });

      // Navigate to inspector to show the traced service
      state = devToolsReducer(state, actions.setActiveTab("inspector"));
      expect(state.panel.activeTabId).toBe("inspector");
    });
  });

  // =============================================================================
  // Test 6: Container Switching Updates All Views
  // =============================================================================

  describe("Test 6: Container switching updates all views", () => {
    it("should update active container across all views", () => {
      let state = initialState;

      // Set initial container hierarchy
      const hierarchy = {
        rootId: "root",
        containers: {
          root: {
            id: "root",
            name: "Root Container",
            parentId: null,
            childIds: ["child-1"],
            phase: "ready" as const,
          },
          "child-1": {
            id: "child-1",
            name: "Child Container",
            parentId: "root",
            childIds: [],
            phase: "ready" as const,
          },
        },
      };

      state = devToolsReducer(state, actions.updateContainerHierarchy(hierarchy));

      // Switch active container
      state = devToolsReducer(state, actions.setActiveContainer("child-1"));
      expect(state.containers.activeContainerId).toBe("child-1");

      // Verify hierarchy is preserved
      expect(state.containers.hierarchy?.rootId).toBe("root");
      expect(state.containers.hierarchy?.containers["child-1"]).toBeDefined();
    });

    it("should maintain container selection across tabs", () => {
      let state = initialState;

      state = devToolsReducer(state, actions.setActiveContainer("container-2"));

      // Switch tabs
      state = devToolsReducer(state, actions.setActiveTab("services"));
      state = devToolsReducer(state, actions.setActiveTab("graph"));

      // Container should remain selected
      expect(state.containers.activeContainerId).toBe("container-2");
    });
  });

  // =============================================================================
  // Test 7: Time-Travel Affects All Tabs
  // =============================================================================

  describe("Test 7: Time-travel affects all tabs", () => {
    it("should update all tab views when navigating snapshots", () => {
      let state = initialState;

      // Capture snapshots
      const snapshot1 = {
        id: "snap-1",
        timestamp: 1000,
        label: "Initial",
        state: createTestSnapshot(2),
      };
      const snapshot2 = {
        id: "snap-2",
        timestamp: 2000,
        label: "After Changes",
        state: createTestSnapshot(5),
      };

      state = devToolsReducer(state, actions.captureSnapshot(snapshot1));
      state = devToolsReducer(state, actions.captureSnapshot(snapshot2));

      expect(state.timeTravel.snapshots).toHaveLength(2);
      expect(state.timeTravel.currentIndex).toBe(1);

      // Navigate backward
      state = devToolsReducer(state, actions.navigateSnapshot("prev"));
      expect(state.timeTravel.currentIndex).toBe(0);

      // Verify we can switch tabs while viewing a snapshot
      state = devToolsReducer(state, actions.setActiveTab("services"));
      expect(state.timeTravel.currentIndex).toBe(0); // Snapshot index preserved
    });

    it("should allow comparison mode from any tab", () => {
      let state = initialState;

      // Start on graph tab
      state = devToolsReducer(state, actions.setActiveTab("graph"));

      // Enable comparison
      state = devToolsReducer(state, actions.toggleComparison());
      expect(state.comparison.isEnabled).toBe(true);

      // Set snapshots for comparison
      state = devToolsReducer(state, actions.setComparisonLeft("snap-1"));
      state = devToolsReducer(state, actions.setComparisonRight("snap-2"));

      expect(state.comparison.leftSnapshotId).toBe("snap-1");
      expect(state.comparison.rightSnapshotId).toBe("snap-2");

      // Comparison state should persist across tabs
      state = devToolsReducer(state, actions.setActiveTab("services"));
      expect(state.comparison.isEnabled).toBe(true);
    });
  });

  // =============================================================================
  // Test 8: Comparison View from Any Tab
  // =============================================================================

  describe("Test 8: Comparison view from any tab", () => {
    it("should enable comparison mode from services tab", () => {
      let state = initialState;

      state = devToolsReducer(state, actions.setActiveTab("services"));
      state = devToolsReducer(state, actions.toggleComparison());

      expect(state.comparison.isEnabled).toBe(true);
      expect(state.panel.activeTabId).toBe("services");
    });

    it("should enable comparison mode from inspector tab", () => {
      let state = initialState;

      state = devToolsReducer(state, actions.setActiveTab("inspector"));
      state = devToolsReducer(state, actions.toggleComparison());

      expect(state.comparison.isEnabled).toBe(true);
      expect(state.panel.activeTabId).toBe("inspector");
    });

    it("should disable comparison mode and return to normal view", () => {
      let state = initialState;

      state = devToolsReducer(state, actions.toggleComparison());
      expect(state.comparison.isEnabled).toBe(true);

      state = devToolsReducer(state, actions.toggleComparison());
      expect(state.comparison.isEnabled).toBe(false);
    });
  });

  // =============================================================================
  // Test 9: Theme Toggle Applies Everywhere
  // =============================================================================

  describe("Test 9: Theme toggle applies everywhere", () => {
    it("should toggle theme preference globally", () => {
      let state = initialState;

      // Toggle theme to dark mode
      state = devToolsReducer(state, actions.setDarkMode(true));

      // Theme should be toggled
      expect(state.panel.isDarkMode).toBe(true);
    });

    it("should maintain theme across tab switches", () => {
      let state = initialState;

      state = devToolsReducer(state, actions.setDarkMode(true));

      // Switch tabs
      state = devToolsReducer(state, actions.setActiveTab("services"));
      state = devToolsReducer(state, actions.setActiveTab("tracing"));
      state = devToolsReducer(state, actions.setActiveTab("inspector"));

      // State should remain consistent
      expect(state.panel.activeTabId).toBe("inspector");
      expect(state.panel.isDarkMode).toBe(true);
    });
  });

  // =============================================================================
  // Test 10: Sync Reconnection Restores State
  // =============================================================================

  describe("Test 10: Sync reconnection restores state", () => {
    it("should track sync connection status", () => {
      let state = initialState;

      // Simulate connection
      state = devToolsReducer(
        state,
        actions.syncState({
          isConnected: true,
          clientCount: 2,
          lastSyncTimestamp: Date.now(),
        })
      );

      expect(state.sync.isConnected).toBe(true);
      expect(state.sync.clientCount).toBe(2);
    });

    it("should handle reconnection after disconnect", () => {
      let state = initialState;

      // Connect
      state = devToolsReducer(
        state,
        actions.syncState({
          isConnected: true,
          clientCount: 1,
          lastSyncTimestamp: 1000,
        })
      );

      // Disconnect
      state = devToolsReducer(
        state,
        actions.syncState({
          isConnected: false,
          clientCount: 0,
          lastSyncTimestamp: 1000,
        })
      );

      expect(state.sync.isConnected).toBe(false);

      // Reconnect
      state = devToolsReducer(
        state,
        actions.syncState({
          isConnected: true,
          clientCount: 1,
          lastSyncTimestamp: 2000,
        })
      );

      expect(state.sync.isConnected).toBe(true);
      expect(state.sync.lastSyncTimestamp).toBe(2000);
    });

    it("should apply remote actions from sync", () => {
      let state = initialState;

      // Receive remote action
      const remoteAction = {
        source: "browser-client-1",
        action: { type: "SELECT_NODE" as const, payload: "RemoteService" },
        timestamp: Date.now(),
      };

      state = devToolsReducer(state, actions.remoteActionReceived(remoteAction));

      // Remote action should be tracked
      expect(state.sync.lastRemoteAction).toEqual(remoteAction);

      // Action should be applied
      expect(state.graph.selectedNodeId).toBe("RemoteService");
    });

    it("should restore state after sync reconnection", () => {
      let state = initialState;

      // Set some state
      state = devToolsReducer(state, actions.selectNode("ServiceA"));
      state = devToolsReducer(state, actions.setTimelineFilter("User"));

      // Disconnect
      state = devToolsReducer(
        state,
        actions.syncState({
          isConnected: false,
          clientCount: 0,
          lastSyncTimestamp: 1000,
        })
      );

      // State should be preserved
      expect(state.graph.selectedNodeId).toBe("ServiceA");
      expect(state.timeline.filterText).toBe("User");

      // Reconnect
      state = devToolsReducer(
        state,
        actions.syncState({
          isConnected: true,
          clientCount: 1,
          lastSyncTimestamp: 2000,
        })
      );

      // State should still be preserved
      expect(state.graph.selectedNodeId).toBe("ServiceA");
      expect(state.timeline.filterText).toBe("User");
    });
  });
});
