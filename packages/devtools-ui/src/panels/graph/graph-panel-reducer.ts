/**
 * Graph panel state reducer.
 *
 * Manages all UI state for the graph panel using a pure reducer function.
 *
 * @packageDocumentation
 */

import type { GraphPanelState, GraphPanelAction, GraphFilterState } from "./types.js";
import { DEFAULT_FILTER_STATE, DEFAULT_VIEWPORT_STATE } from "./constants.js";

/**
 * Create the initial state for the graph panel.
 */
function createInitialState(overrides?: Partial<GraphPanelState>): GraphPanelState {
  return {
    selectedContainerName: undefined,
    selectedNodes: new Set(),
    hoveredNode: undefined,
    viewport: DEFAULT_VIEWPORT_STATE,
    filter: DEFAULT_FILTER_STATE,
    analysisSidebarOpen: false,
    metadataInspectorOpen: false,
    filterPanelOpen: false,
    layoutDirection: "TB",
    minimapVisible: false,
    activePreset: undefined,
    blastRadius: undefined,
    ...overrides,
  };
}

/**
 * Merge partial filter updates into the existing filter state.
 */
function mergeFilter(
  current: GraphFilterState,
  partial: Partial<GraphFilterState>
): GraphFilterState {
  return {
    searchText: partial.searchText ?? current.searchText,
    lifetimes: partial.lifetimes ?? current.lifetimes,
    origins: partial.origins ?? current.origins,
    libraryKinds: partial.libraryKinds ?? current.libraryKinds,
    category: partial.category ?? current.category,
    tags: partial.tags ?? current.tags,
    tagMode: partial.tagMode ?? current.tagMode,
    direction: partial.direction ?? current.direction,
    minErrorRate: partial.minErrorRate ?? current.minErrorRate,
    inheritanceModes: partial.inheritanceModes ?? current.inheritanceModes,
    resolutionStatus: partial.resolutionStatus ?? current.resolutionStatus,
    compoundMode: partial.compoundMode ?? current.compoundMode,
  };
}

/**
 * Pure reducer for GraphPanelState.
 */
function graphPanelReducer(state: GraphPanelState, action: GraphPanelAction): GraphPanelState {
  switch (action.type) {
    case "SELECT_NODE":
      return {
        ...state,
        selectedNodes: new Set([action.portName]),
        blastRadius: undefined,
      };

    case "TOGGLE_MULTI_SELECT": {
      const next = new Set(state.selectedNodes);
      if (next.has(action.portName)) {
        next.delete(action.portName);
      } else {
        next.add(action.portName);
      }
      return {
        ...state,
        selectedNodes: next,
      };
    }

    case "CLEAR_SELECTION":
      return {
        ...state,
        selectedNodes: new Set(),
        blastRadius: undefined,
      };

    case "SET_HOVERED":
      return { ...state, hoveredNode: action.portName };

    case "SET_VIEWPORT":
      return { ...state, viewport: action.viewport };

    case "SET_FILTER":
      return {
        ...state,
        filter: mergeFilter(state.filter, action.filter),
        activePreset: undefined,
      };

    case "RESET_FILTER":
      return {
        ...state,
        filter: DEFAULT_FILTER_STATE,
        activePreset: undefined,
      };

    case "TOGGLE_ANALYSIS":
      return { ...state, analysisSidebarOpen: !state.analysisSidebarOpen };

    case "TOGGLE_METADATA":
      return { ...state, metadataInspectorOpen: !state.metadataInspectorOpen };

    case "TOGGLE_FILTER_PANEL":
      return { ...state, filterPanelOpen: !state.filterPanelOpen };

    case "SET_LAYOUT_DIRECTION":
      return { ...state, layoutDirection: action.direction };

    case "TOGGLE_MINIMAP":
      return { ...state, minimapVisible: !state.minimapVisible };

    case "SET_CONTAINER":
      return {
        ...state,
        selectedContainerName: action.containerName,
        selectedNodes: new Set(),
        hoveredNode: undefined,
        blastRadius: undefined,
      };

    case "SET_BLAST_RADIUS":
      return { ...state, blastRadius: action.portName };

    case "SET_ACTIVE_PRESET":
      return { ...state, activePreset: action.preset };
  }
}

export { graphPanelReducer, createInitialState, mergeFilter };
