/**
 * DevTools Reducer - Pure state reducer function.
 *
 * Handles all state updates in a pure, immutable manner.
 *
 * @packageDocumentation
 */

import type { DevToolsState } from "./devtools.state.js";
import { initialState } from "./devtools.state.js";
import type { DevToolsAction } from "./actions.js";

// =============================================================================
// Reducer
// =============================================================================

/**
 * Pure reducer function for DevTools state.
 */
export function devToolsReducer(
  state: DevToolsState = initialState,
  action: DevToolsAction
): DevToolsState {
  switch (action.type) {
    // Panel actions
    case "SET_ACTIVE_TAB":
      return {
        ...state,
        panel: { ...state.panel, activeTabId: action.payload },
      };

    case "TOGGLE_PANEL":
      return {
        ...state,
        panel: { ...state.panel, isOpen: !state.panel.isOpen },
      };

    case "SET_PANEL_OPEN":
      return {
        ...state,
        panel: { ...state.panel, isOpen: action.payload },
      };

    case "SET_FULLSCREEN":
      return {
        ...state,
        panel: { ...state.panel, isFullscreen: action.payload },
      };

    case "SET_PANEL_POSITION":
      return {
        ...state,
        panel: { ...state.panel, position: action.payload },
      };

    case "SET_PANEL_SIZE":
      return {
        ...state,
        panel: { ...state.panel, size: action.payload },
      };

    case "SET_DARK_MODE":
      return {
        ...state,
        panel: { ...state.panel, isDarkMode: action.payload },
      };

    // Graph actions
    case "SELECT_NODE":
      return {
        ...state,
        graph: { ...state.graph, selectedNodeId: action.payload },
      };

    case "HIGHLIGHT_NODES":
      return {
        ...state,
        graph: { ...state.graph, highlightedNodeIds: action.payload },
      };

    case "SET_ZOOM":
      return {
        ...state,
        graph: { ...state.graph, zoom: Math.max(0.1, Math.min(3, action.payload)) },
      };

    case "SET_PAN_OFFSET":
      return {
        ...state,
        graph: { ...state.graph, panOffset: action.payload },
      };

    // Timeline actions
    case "SELECT_TRACE":
      return {
        ...state,
        timeline: { ...state.timeline, selectedEntryId: action.payload },
      };

    case "TOGGLE_TRACE_EXPAND": {
      const expandedIds = state.timeline.expandedEntryIds;
      const newExpandedIds = expandedIds.includes(action.payload)
        ? expandedIds.filter(id => id !== action.payload)
        : [...expandedIds, action.payload];
      return {
        ...state,
        timeline: { ...state.timeline, expandedEntryIds: newExpandedIds },
      };
    }

    case "SET_TIMELINE_FILTER":
      return {
        ...state,
        timeline: { ...state.timeline, filterText: action.payload },
      };

    case "SET_TIMELINE_GROUPING":
      return {
        ...state,
        timeline: { ...state.timeline, grouping: action.payload },
      };

    case "SET_TIMELINE_SORT":
      return {
        ...state,
        timeline: {
          ...state.timeline,
          sortOrder: action.payload.order,
          sortDescending: action.payload.descending,
        },
      };

    case "TOGGLE_TRACING_PAUSE":
      return {
        ...state,
        timeline: { ...state.timeline, isPaused: !state.timeline.isPaused },
      };

    case "CLEAR_TRACES":
      return {
        ...state,
        timeline: {
          ...state.timeline,
          selectedEntryId: null,
          expandedEntryIds: [],
        },
      };

    // Inspector actions
    case "SELECT_SERVICE":
      return {
        ...state,
        inspector: {
          ...state.inspector,
          selectedServicePortName: action.payload,
          selectedScopeId: null,
        },
      };

    case "SELECT_SCOPE":
      return {
        ...state,
        inspector: {
          ...state.inspector,
          selectedScopeId: action.payload,
          selectedServicePortName: null,
        },
      };

    case "TOGGLE_SCOPE_EXPAND": {
      const expandedIds = state.inspector.expandedScopeIds;
      const newExpandedIds = expandedIds.includes(action.payload)
        ? expandedIds.filter(id => id !== action.payload)
        : [...expandedIds, action.payload];
      return {
        ...state,
        inspector: { ...state.inspector, expandedScopeIds: newExpandedIds },
      };
    }

    case "SET_INSPECTOR_FILTER":
      return {
        ...state,
        inspector: { ...state.inspector, filterText: action.payload },
      };

    // Data actions
    case "DATA_UPDATED":
      return {
        ...state,
        lastUpdated: Date.now(),
      };

    // Time-Travel actions
    case "CAPTURE_SNAPSHOT": {
      const newSnapshots = [...state.timeTravel.snapshots, action.payload];
      return {
        ...state,
        timeTravel: {
          ...state.timeTravel,
          snapshots: newSnapshots,
          currentIndex: newSnapshots.length - 1,
        },
      };
    }

    case "NAVIGATE_SNAPSHOT": {
      const { currentIndex, snapshots } = state.timeTravel;
      const newIndex =
        action.payload === "prev"
          ? Math.max(0, currentIndex - 1)
          : Math.min(snapshots.length - 1, currentIndex + 1);
      return {
        ...state,
        timeTravel: {
          ...state.timeTravel,
          currentIndex: newIndex,
        },
      };
    }

    case "SET_SNAPSHOT_INDEX": {
      const { snapshots } = state.timeTravel;
      const clampedIndex = Math.max(0, Math.min(snapshots.length - 1, action.payload));
      return {
        ...state,
        timeTravel: {
          ...state.timeTravel,
          currentIndex: clampedIndex,
        },
      };
    }

    // Comparison actions
    case "SET_COMPARISON_LEFT":
      return {
        ...state,
        comparison: {
          ...state.comparison,
          leftSnapshotId: action.payload,
        },
      };

    case "SET_COMPARISON_RIGHT":
      return {
        ...state,
        comparison: {
          ...state.comparison,
          rightSnapshotId: action.payload,
        },
      };

    case "TOGGLE_COMPARISON":
      return {
        ...state,
        comparison: {
          ...state.comparison,
          isEnabled: !state.comparison.isEnabled,
        },
      };

    // Container Hierarchy actions
    case "SET_ACTIVE_CONTAINER":
      return {
        ...state,
        containers: {
          ...state.containers,
          activeContainerId: action.payload,
        },
      };

    case "UPDATE_CONTAINER_HIERARCHY":
      return {
        ...state,
        containers: {
          ...state.containers,
          hierarchy: action.payload,
        },
      };

    // Sync actions
    case "SYNC_STATE":
      return {
        ...state,
        sync: {
          ...state.sync,
          isConnected: action.payload.isConnected,
          clientCount: action.payload.clientCount,
          lastSyncTimestamp: action.payload.lastSyncTimestamp,
          pendingActions: action.payload.pendingActions ?? state.sync.pendingActions,
        },
      };

    case "REMOTE_ACTION_RECEIVED": {
      // Store the remote action info
      const stateWithRemoteAction = {
        ...state,
        sync: {
          ...state.sync,
          lastRemoteAction: action.payload,
        },
      };

      // Apply the remote action if it's a valid action type
      const remoteAction = action.payload.action;
      if (remoteAction.type === "SELECT_NODE") {
        return {
          ...stateWithRemoteAction,
          graph: {
            ...stateWithRemoteAction.graph,
            selectedNodeId: remoteAction.payload as string | null,
          },
        };
      }

      return stateWithRemoteAction;
    }

    default:
      return state;
  }
}
