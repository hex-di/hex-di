/**
 * State - Framework-agnostic state management for DevTools.
 *
 * Provides reducer-based state management that works with React, TUI,
 * or any other framework using the reducer pattern.
 *
 * @packageDocumentation
 */

// State
export type {
  DevToolsState,
  PanelState,
  GraphState,
  TimelineState,
  InspectorState,
  TimeTravelState,
  ComparisonState,
  ContainerHierarchyState,
  ContainerHierarchy,
  ContainerNode,
  SyncState,
  SnapshotSummary,
  RemoteAction,
} from "./devtools.state.js";

export { initialState } from "./devtools.state.js";

// Actions
export type { DevToolsAction } from "./actions.js";
export { actions } from "./actions.js";

// Reducer
export { devToolsReducer } from "./reducer.js";

// Selectors
export * from "./selectors.js";
