/**
 * DevTools Selectors - Derived state selectors.
 *
 * Provides computed values from the state for use in presenters and views.
 *
 * @packageDocumentation
 */

import type {
  DevToolsState,
  PanelState,
  GraphState,
  TimelineState,
  InspectorState,
  TimeTravelState,
  ComparisonState,
  ContainerHierarchyState,
  SyncState,
  SnapshotSummary,
  ContainerHierarchy,
} from "./devtools.state.js";

// =============================================================================
// Basic Selectors
// =============================================================================

export const selectPanel = (state: DevToolsState): PanelState => state.panel;
export const selectGraph = (state: DevToolsState): GraphState => state.graph;
export const selectTimeline = (state: DevToolsState): TimelineState => state.timeline;
export const selectInspector = (state: DevToolsState): InspectorState => state.inspector;

// =============================================================================
// Panel Selectors
// =============================================================================

export const selectActiveTabId = (state: DevToolsState) => state.panel.activeTabId;
export const selectIsPanelOpen = (state: DevToolsState) => state.panel.isOpen;
export const selectIsFullscreen = (state: DevToolsState) => state.panel.isFullscreen;
export const selectPanelPosition = (state: DevToolsState) => state.panel.position;
export const selectPanelSize = (state: DevToolsState) => state.panel.size;
export const selectIsDarkMode = (state: DevToolsState) => state.panel.isDarkMode;

// =============================================================================
// Graph Selectors
// =============================================================================

export const selectSelectedNodeId = (state: DevToolsState) => state.graph.selectedNodeId;
export const selectHighlightedNodeIds = (state: DevToolsState) => state.graph.highlightedNodeIds;
export const selectZoom = (state: DevToolsState) => state.graph.zoom;
export const selectPanOffset = (state: DevToolsState) => state.graph.panOffset;
export const selectGraphDirection = (state: DevToolsState) => state.graph.direction;

export const selectHasNodeSelection = (state: DevToolsState) =>
  state.graph.selectedNodeId !== null;

export const selectHasHighlight = (state: DevToolsState) =>
  state.graph.highlightedNodeIds.length > 0;

// =============================================================================
// Timeline Selectors
// =============================================================================

export const selectSelectedTraceId = (state: DevToolsState) => state.timeline.selectedEntryId;
export const selectExpandedTraceIds = (state: DevToolsState) => state.timeline.expandedEntryIds;
export const selectTimelineFilter = (state: DevToolsState) => state.timeline.filterText;
export const selectTimelineGrouping = (state: DevToolsState) => state.timeline.grouping;
export const selectTimelineSortOrder = (state: DevToolsState) => state.timeline.sortOrder;
export const selectTimelineSortDescending = (state: DevToolsState) => state.timeline.sortDescending;
export const selectIsTracingPaused = (state: DevToolsState) => state.timeline.isPaused;
export const selectSlowThreshold = (state: DevToolsState) => state.timeline.slowThresholdMs;

export const selectHasTimelineFilter = (state: DevToolsState) =>
  state.timeline.filterText.length > 0;

export const selectIsTraceExpanded = (traceId: string) => (state: DevToolsState) =>
  state.timeline.expandedEntryIds.includes(traceId);

// =============================================================================
// Inspector Selectors
// =============================================================================

export const selectSelectedServicePortName = (state: DevToolsState) =>
  state.inspector.selectedServicePortName;

export const selectSelectedScopeId = (state: DevToolsState) =>
  state.inspector.selectedScopeId;

export const selectInspectorFilter = (state: DevToolsState) =>
  state.inspector.filterText;

export const selectShowDependencies = (state: DevToolsState) =>
  state.inspector.showDependencies;

export const selectShowDependents = (state: DevToolsState) =>
  state.inspector.showDependents;

export const selectExpandedScopeIds = (state: DevToolsState) =>
  state.inspector.expandedScopeIds;

export const selectHasServiceSelection = (state: DevToolsState) =>
  state.inspector.selectedServicePortName !== null;

export const selectHasScopeSelection = (state: DevToolsState) =>
  state.inspector.selectedScopeId !== null;

export const selectIsScopeExpanded = (scopeId: string) => (state: DevToolsState) =>
  state.inspector.expandedScopeIds.includes(scopeId);

// =============================================================================
// Combined Selectors
// =============================================================================

export const selectLastUpdated = (state: DevToolsState) => state.lastUpdated;

export const selectIsDevToolsActive = (state: DevToolsState) =>
  state.panel.isOpen && !state.panel.isFullscreen;

// =============================================================================
// Time-Travel Selectors
// =============================================================================

export const selectTimeTravel = (state: DevToolsState): TimeTravelState => state.timeTravel;

export const selectSnapshotHistory = (state: DevToolsState): readonly SnapshotSummary[] =>
  state.timeTravel.snapshots;

export const selectCurrentSnapshotIndex = (state: DevToolsState): number =>
  state.timeTravel.currentIndex;

export const selectCurrentSnapshot = (state: DevToolsState): SnapshotSummary | null => {
  const { snapshots, currentIndex } = state.timeTravel;
  if (currentIndex < 0 || currentIndex >= snapshots.length) {
    return null;
  }
  return snapshots[currentIndex] ?? null;
};

export const selectCanNavigateBack = (state: DevToolsState): boolean =>
  state.timeTravel.currentIndex > 0;

export const selectCanNavigateForward = (state: DevToolsState): boolean =>
  state.timeTravel.currentIndex < state.timeTravel.snapshots.length - 1;

export const selectTimeTravelEnabled = (state: DevToolsState): boolean =>
  state.timeTravel.isEnabled;

// =============================================================================
// Comparison Selectors
// =============================================================================

export const selectComparison = (state: DevToolsState): ComparisonState => state.comparison;

export const selectIsComparisonEnabled = (state: DevToolsState): boolean =>
  state.comparison.isEnabled;

export const selectComparisonLeftId = (state: DevToolsState): string | null =>
  state.comparison.leftSnapshotId;

export const selectComparisonRightId = (state: DevToolsState): string | null =>
  state.comparison.rightSnapshotId;

/**
 * Returns comparison diff info if comparison is enabled, null otherwise.
 */
export const selectComparisonDiff = (
  state: DevToolsState
): { leftSnapshotId: string | null; rightSnapshotId: string | null; isEnabled: boolean } | null => {
  if (!state.comparison.isEnabled) {
    return null;
  }
  return {
    leftSnapshotId: state.comparison.leftSnapshotId,
    rightSnapshotId: state.comparison.rightSnapshotId,
    isEnabled: state.comparison.isEnabled,
  };
};

// =============================================================================
// Container Hierarchy Selectors
// =============================================================================

export const selectContainers = (state: DevToolsState): ContainerHierarchyState =>
  state.containers;

export const selectActiveContainer = (state: DevToolsState): string | null =>
  state.containers.activeContainerId;

export const selectContainerHierarchy = (state: DevToolsState): ContainerHierarchy | null =>
  state.containers.hierarchy;

export const selectHasContainerHierarchy = (state: DevToolsState): boolean =>
  state.containers.hierarchy !== null;

// =============================================================================
// Sync Selectors
// =============================================================================

export const selectSync = (state: DevToolsState): SyncState => state.sync;

export const selectSyncStatus = (
  state: DevToolsState
): { isConnected: boolean; clientCount: number; lastSyncTimestamp: number } => ({
  isConnected: state.sync.isConnected,
  clientCount: state.sync.clientCount,
  lastSyncTimestamp: state.sync.lastSyncTimestamp,
});

export const selectIsConnected = (state: DevToolsState): boolean => state.sync.isConnected;

export const selectClientCount = (state: DevToolsState): number => state.sync.clientCount;

export const selectPendingActions = (state: DevToolsState): number => state.sync.pendingActions;

export const selectLastRemoteAction = (state: DevToolsState) => state.sync.lastRemoteAction;
