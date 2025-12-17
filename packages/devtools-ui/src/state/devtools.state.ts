/**
 * DevToolsState - Central state definition for DevTools.
 *
 * Defines the complete state shape used by the reducer and selectors.
 *
 * @packageDocumentation
 */

import type {
  TabId,
  PanelPosition,
  PanelSize,
  TimelineGrouping,
  TimelineSortOrder,
  LayoutDirection,
} from "../view-models/index.js";

// =============================================================================
// State Types
// =============================================================================

/**
 * Panel state.
 */
export interface PanelState {
  readonly activeTabId: TabId;
  readonly isOpen: boolean;
  readonly isFullscreen: boolean;
  readonly position: PanelPosition;
  readonly size: PanelSize;
  readonly isDarkMode: boolean;
}

/**
 * Graph state.
 */
export interface GraphState {
  readonly selectedNodeId: string | null;
  readonly highlightedNodeIds: readonly string[];
  readonly zoom: number;
  readonly panOffset: { readonly x: number; readonly y: number };
  readonly direction: LayoutDirection;
}

/**
 * Timeline state.
 */
export interface TimelineState {
  readonly selectedEntryId: string | null;
  readonly expandedEntryIds: readonly string[];
  readonly filterText: string;
  readonly grouping: TimelineGrouping;
  readonly sortOrder: TimelineSortOrder;
  readonly sortDescending: boolean;
  readonly showOnlyCacheHits: boolean;
  readonly showOnlySlow: boolean;
  readonly slowThresholdMs: number;
  readonly isPaused: boolean;
}

/**
 * Inspector state.
 */
export interface InspectorState {
  readonly selectedServicePortName: string | null;
  readonly selectedScopeId: string | null;
  readonly filterText: string;
  readonly showDependencies: boolean;
  readonly showDependents: boolean;
  readonly expandedScopeIds: readonly string[];
}

/**
 * Complete DevTools state.
 */
export interface DevToolsState {
  readonly panel: PanelState;
  readonly graph: GraphState;
  readonly timeline: TimelineState;
  readonly inspector: InspectorState;
  readonly lastUpdated: number;
}

// =============================================================================
// Initial State
// =============================================================================

/**
 * Default initial state.
 */
export const initialState: DevToolsState = Object.freeze({
  panel: Object.freeze({
    activeTabId: "graph" as const,
    isOpen: false,
    isFullscreen: false,
    position: "bottom-right" as const,
    size: Object.freeze({ width: 400, height: 500 }),
    isDarkMode: false,
  }),
  graph: Object.freeze({
    selectedNodeId: null,
    highlightedNodeIds: Object.freeze([]),
    zoom: 1,
    panOffset: Object.freeze({ x: 0, y: 0 }),
    direction: "TB" as const,
  }),
  timeline: Object.freeze({
    selectedEntryId: null,
    expandedEntryIds: Object.freeze([]),
    filterText: "",
    grouping: "none" as const,
    sortOrder: "time" as const,
    sortDescending: false,
    showOnlyCacheHits: false,
    showOnlySlow: false,
    slowThresholdMs: 10,
    isPaused: false,
  }),
  inspector: Object.freeze({
    selectedServicePortName: null,
    selectedScopeId: null,
    filterText: "",
    showDependencies: true,
    showDependents: true,
    expandedScopeIds: Object.freeze([]),
  }),
  lastUpdated: 0,
});
