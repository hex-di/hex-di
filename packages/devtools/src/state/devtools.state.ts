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

import type { ContainerSnapshot } from "@hex-di/devtools-core";

// =============================================================================
// State Types
// =============================================================================

/**
 * Snapshot summary for time-travel debugging.
 */
export interface SnapshotSummary {
  readonly id: string;
  readonly timestamp: number;
  readonly label: string;
  readonly state: ContainerSnapshot;
}

/**
 * Time-travel state slice for debugging history.
 */
export interface TimeTravelState {
  readonly snapshots: readonly SnapshotSummary[];
  readonly currentIndex: number;
  readonly isEnabled: boolean;
}

/**
 * Comparison state slice for snapshot diffs.
 */
export interface ComparisonState {
  readonly leftSnapshotId: string | null;
  readonly rightSnapshotId: string | null;
  readonly isEnabled: boolean;
}

/**
 * Container node in hierarchy.
 */
export interface ContainerNode {
  readonly id: string;
  readonly name: string;
  readonly parentId: string | null;
  readonly childIds: readonly string[];
  readonly phase: "initializing" | "ready" | "disposing" | "disposed";
}

/**
 * Container hierarchy structure.
 */
export interface ContainerHierarchy {
  readonly rootId: string;
  readonly containers: { readonly [id: string]: ContainerNode };
}

/**
 * Container hierarchy state slice.
 */
export interface ContainerHierarchyState {
  readonly activeContainerId: string | null;
  readonly hierarchy: ContainerHierarchy | null;
}

/**
 * Remote action received from sync.
 */
export interface RemoteAction {
  readonly source: string;
  readonly action: { readonly type: string; readonly payload?: unknown };
  readonly timestamp: number;
}

/**
 * Sync state slice for browser/TUI coordination.
 */
export interface SyncState {
  readonly isConnected: boolean;
  readonly clientCount: number;
  readonly lastSyncTimestamp: number;
  readonly pendingActions: number;
  readonly lastRemoteAction: RemoteAction | null;
}

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
  readonly timeTravel: TimeTravelState;
  readonly comparison: ComparisonState;
  readonly containers: ContainerHierarchyState;
  readonly sync: SyncState;
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
  timeTravel: Object.freeze({
    snapshots: Object.freeze([]),
    currentIndex: -1,
    isEnabled: false,
  }),
  comparison: Object.freeze({
    leftSnapshotId: null,
    rightSnapshotId: null,
    isEnabled: false,
  }),
  containers: Object.freeze({
    activeContainerId: null,
    hierarchy: null,
  }),
  sync: Object.freeze({
    isConnected: false,
    clientCount: 0,
    lastSyncTimestamp: 0,
    pendingActions: 0,
    lastRemoteAction: null,
  }),
  lastUpdated: 0,
});
