/**
 * DevTools Actions - Action types for state management.
 *
 * Defines all possible actions that can modify DevTools state.
 * Used with the reducer for framework-agnostic state management.
 *
 * @packageDocumentation
 */

import type { TabId, PanelPosition, PanelSize, TimelineGrouping, TimelineSortOrder } from "../view-models/index.js";
import type { SnapshotSummary, ContainerHierarchy, RemoteAction } from "./devtools.state.js";

// =============================================================================
// Panel Actions
// =============================================================================

export interface SetActiveTabAction {
  readonly type: "SET_ACTIVE_TAB";
  readonly payload: TabId;
}

export interface TogglePanelAction {
  readonly type: "TOGGLE_PANEL";
}

export interface SetPanelOpenAction {
  readonly type: "SET_PANEL_OPEN";
  readonly payload: boolean;
}

export interface SetFullscreenAction {
  readonly type: "SET_FULLSCREEN";
  readonly payload: boolean;
}

export interface SetPanelPositionAction {
  readonly type: "SET_PANEL_POSITION";
  readonly payload: PanelPosition;
}

export interface SetPanelSizeAction {
  readonly type: "SET_PANEL_SIZE";
  readonly payload: PanelSize;
}

// =============================================================================
// Graph Actions
// =============================================================================

export interface SelectNodeAction {
  readonly type: "SELECT_NODE";
  readonly payload: string | null;
}

export interface HighlightNodesAction {
  readonly type: "HIGHLIGHT_NODES";
  readonly payload: readonly string[];
}

export interface SetZoomAction {
  readonly type: "SET_ZOOM";
  readonly payload: number;
}

export interface SetPanOffsetAction {
  readonly type: "SET_PAN_OFFSET";
  readonly payload: { x: number; y: number };
}

// =============================================================================
// Timeline Actions
// =============================================================================

export interface SelectTraceAction {
  readonly type: "SELECT_TRACE";
  readonly payload: string | null;
}

export interface ToggleTraceExpandAction {
  readonly type: "TOGGLE_TRACE_EXPAND";
  readonly payload: string;
}

export interface SetTimelineFilterAction {
  readonly type: "SET_TIMELINE_FILTER";
  readonly payload: string;
}

export interface SetTimelineGroupingAction {
  readonly type: "SET_TIMELINE_GROUPING";
  readonly payload: TimelineGrouping;
}

export interface SetTimelineSortAction {
  readonly type: "SET_TIMELINE_SORT";
  readonly payload: { order: TimelineSortOrder; descending: boolean };
}

export interface ToggleTracingPauseAction {
  readonly type: "TOGGLE_TRACING_PAUSE";
}

export interface ClearTracesAction {
  readonly type: "CLEAR_TRACES";
}

// =============================================================================
// Inspector Actions
// =============================================================================

export interface SelectServiceAction {
  readonly type: "SELECT_SERVICE";
  readonly payload: string | null;
}

export interface SelectScopeAction {
  readonly type: "SELECT_SCOPE";
  readonly payload: string | null;
}

export interface ToggleScopeExpandAction {
  readonly type: "TOGGLE_SCOPE_EXPAND";
  readonly payload: string;
}

export interface SetInspectorFilterAction {
  readonly type: "SET_INSPECTOR_FILTER";
  readonly payload: string;
}

// =============================================================================
// Data Actions
// =============================================================================

export interface DataUpdatedAction {
  readonly type: "DATA_UPDATED";
}

export interface SetDarkModeAction {
  readonly type: "SET_DARK_MODE";
  readonly payload: boolean;
}

// =============================================================================
// Time-Travel Actions
// =============================================================================

export interface CaptureSnapshotAction {
  readonly type: "CAPTURE_SNAPSHOT";
  readonly payload: SnapshotSummary;
}

export interface NavigateSnapshotAction {
  readonly type: "NAVIGATE_SNAPSHOT";
  readonly payload: "prev" | "next";
}

export interface SetSnapshotIndexAction {
  readonly type: "SET_SNAPSHOT_INDEX";
  readonly payload: number;
}

// =============================================================================
// Comparison Actions
// =============================================================================

export interface SetComparisonLeftAction {
  readonly type: "SET_COMPARISON_LEFT";
  readonly payload: string | null;
}

export interface SetComparisonRightAction {
  readonly type: "SET_COMPARISON_RIGHT";
  readonly payload: string | null;
}

export interface ToggleComparisonAction {
  readonly type: "TOGGLE_COMPARISON";
}

// =============================================================================
// Container Hierarchy Actions
// =============================================================================

export interface SetActiveContainerAction {
  readonly type: "SET_ACTIVE_CONTAINER";
  readonly payload: string | null;
}

export interface UpdateContainerHierarchyAction {
  readonly type: "UPDATE_CONTAINER_HIERARCHY";
  readonly payload: ContainerHierarchy;
}

// =============================================================================
// Sync Actions
// =============================================================================

export interface SyncStatePayload {
  readonly isConnected: boolean;
  readonly clientCount: number;
  readonly lastSyncTimestamp: number;
  readonly pendingActions?: number;
}

export interface SyncStateAction {
  readonly type: "SYNC_STATE";
  readonly payload: SyncStatePayload;
}

export interface RemoteActionReceivedAction {
  readonly type: "REMOTE_ACTION_RECEIVED";
  readonly payload: RemoteAction;
}

// =============================================================================
// Action Union
// =============================================================================

export type DevToolsAction =
  | SetActiveTabAction
  | TogglePanelAction
  | SetPanelOpenAction
  | SetFullscreenAction
  | SetPanelPositionAction
  | SetPanelSizeAction
  | SelectNodeAction
  | HighlightNodesAction
  | SetZoomAction
  | SetPanOffsetAction
  | SelectTraceAction
  | ToggleTraceExpandAction
  | SetTimelineFilterAction
  | SetTimelineGroupingAction
  | SetTimelineSortAction
  | ToggleTracingPauseAction
  | ClearTracesAction
  | SelectServiceAction
  | SelectScopeAction
  | ToggleScopeExpandAction
  | SetInspectorFilterAction
  | DataUpdatedAction
  | SetDarkModeAction
  | CaptureSnapshotAction
  | NavigateSnapshotAction
  | SetSnapshotIndexAction
  | SetComparisonLeftAction
  | SetComparisonRightAction
  | ToggleComparisonAction
  | SetActiveContainerAction
  | UpdateContainerHierarchyAction
  | SyncStateAction
  | RemoteActionReceivedAction;

// =============================================================================
// Action Creators
// =============================================================================

export const actions = {
  setActiveTab: (tabId: TabId): SetActiveTabAction => ({
    type: "SET_ACTIVE_TAB",
    payload: tabId,
  }),

  togglePanel: (): TogglePanelAction => ({
    type: "TOGGLE_PANEL",
  }),

  setPanelOpen: (open: boolean): SetPanelOpenAction => ({
    type: "SET_PANEL_OPEN",
    payload: open,
  }),

  setFullscreen: (fullscreen: boolean): SetFullscreenAction => ({
    type: "SET_FULLSCREEN",
    payload: fullscreen,
  }),

  setPanelPosition: (position: PanelPosition): SetPanelPositionAction => ({
    type: "SET_PANEL_POSITION",
    payload: position,
  }),

  setPanelSize: (size: PanelSize): SetPanelSizeAction => ({
    type: "SET_PANEL_SIZE",
    payload: size,
  }),

  selectNode: (nodeId: string | null): SelectNodeAction => ({
    type: "SELECT_NODE",
    payload: nodeId,
  }),

  highlightNodes: (nodeIds: readonly string[]): HighlightNodesAction => ({
    type: "HIGHLIGHT_NODES",
    payload: nodeIds,
  }),

  setZoom: (level: number): SetZoomAction => ({
    type: "SET_ZOOM",
    payload: level,
  }),

  setPanOffset: (offset: { x: number; y: number }): SetPanOffsetAction => ({
    type: "SET_PAN_OFFSET",
    payload: offset,
  }),

  selectTrace: (traceId: string | null): SelectTraceAction => ({
    type: "SELECT_TRACE",
    payload: traceId,
  }),

  toggleTraceExpand: (traceId: string): ToggleTraceExpandAction => ({
    type: "TOGGLE_TRACE_EXPAND",
    payload: traceId,
  }),

  setTimelineFilter: (filter: string): SetTimelineFilterAction => ({
    type: "SET_TIMELINE_FILTER",
    payload: filter,
  }),

  setTimelineGrouping: (grouping: TimelineGrouping): SetTimelineGroupingAction => ({
    type: "SET_TIMELINE_GROUPING",
    payload: grouping,
  }),

  selectService: (portName: string | null): SelectServiceAction => ({
    type: "SELECT_SERVICE",
    payload: portName,
  }),

  selectScope: (scopeId: string | null): SelectScopeAction => ({
    type: "SELECT_SCOPE",
    payload: scopeId,
  }),

  toggleScopeExpand: (scopeId: string): ToggleScopeExpandAction => ({
    type: "TOGGLE_SCOPE_EXPAND",
    payload: scopeId,
  }),

  setInspectorFilter: (filter: string): SetInspectorFilterAction => ({
    type: "SET_INSPECTOR_FILTER",
    payload: filter,
  }),

  setDarkMode: (enabled: boolean): SetDarkModeAction => ({
    type: "SET_DARK_MODE",
    payload: enabled,
  }),

  dataUpdated: (): DataUpdatedAction => ({
    type: "DATA_UPDATED",
  }),

  // Time-Travel actions
  captureSnapshot: (snapshot: SnapshotSummary): CaptureSnapshotAction => ({
    type: "CAPTURE_SNAPSHOT",
    payload: snapshot,
  }),

  navigateSnapshot: (direction: "prev" | "next"): NavigateSnapshotAction => ({
    type: "NAVIGATE_SNAPSHOT",
    payload: direction,
  }),

  setSnapshotIndex: (index: number): SetSnapshotIndexAction => ({
    type: "SET_SNAPSHOT_INDEX",
    payload: index,
  }),

  // Comparison actions
  setComparisonLeft: (snapshotId: string | null): SetComparisonLeftAction => ({
    type: "SET_COMPARISON_LEFT",
    payload: snapshotId,
  }),

  setComparisonRight: (snapshotId: string | null): SetComparisonRightAction => ({
    type: "SET_COMPARISON_RIGHT",
    payload: snapshotId,
  }),

  toggleComparison: (): ToggleComparisonAction => ({
    type: "TOGGLE_COMPARISON",
  }),

  // Container hierarchy actions
  setActiveContainer: (containerId: string | null): SetActiveContainerAction => ({
    type: "SET_ACTIVE_CONTAINER",
    payload: containerId,
  }),

  updateContainerHierarchy: (hierarchy: ContainerHierarchy): UpdateContainerHierarchyAction => ({
    type: "UPDATE_CONTAINER_HIERARCHY",
    payload: hierarchy,
  }),

  // Sync actions
  syncState: (payload: SyncStatePayload): SyncStateAction => ({
    type: "SYNC_STATE",
    payload,
  }),

  remoteActionReceived: (remoteAction: RemoteAction): RemoteActionReceivedAction => ({
    type: "REMOTE_ACTION_RECEIVED",
    payload: remoteAction,
  }),

  // Timeline sort
  setTimelineSort: (order: TimelineSortOrder, descending: boolean): SetTimelineSortAction => ({
    type: "SET_TIMELINE_SORT",
    payload: { order, descending },
  }),

  toggleTracingPause: (): ToggleTracingPauseAction => ({
    type: "TOGGLE_TRACING_PAUSE",
  }),

  clearTraces: (): ClearTracesAction => ({
    type: "CLEAR_TRACES",
  }),
} as const;
