/**
 * DevTools Actions - Action types for state management.
 *
 * Defines all possible actions that can modify DevTools state.
 * Used with the reducer for framework-agnostic state management.
 *
 * @packageDocumentation
 */

import type { TabId, PanelPosition, PanelSize, TimelineGrouping, TimelineSortOrder } from "../view-models/index.js";

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
  | SetDarkModeAction;

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

  setDarkMode: (enabled: boolean): SetDarkModeAction => ({
    type: "SET_DARK_MODE",
    payload: enabled,
  }),

  dataUpdated: (): DataUpdatedAction => ({
    type: "DATA_UPDATED",
  }),
} as const;
