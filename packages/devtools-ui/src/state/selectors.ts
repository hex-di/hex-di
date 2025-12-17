/**
 * DevTools Selectors - Derived state selectors.
 *
 * Provides computed values from the state for use in presenters and views.
 *
 * @packageDocumentation
 */

import type { DevToolsState, PanelState, GraphState, TimelineState, InspectorState } from "./devtools.state.js";

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
