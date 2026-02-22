/**
 * Hook wrapping the graph panel reducer with typed dispatchers.
 *
 * @packageDocumentation
 */

import { useReducer, useCallback, useMemo } from "react";
import type { GraphPanelState, GraphFilterState, GraphViewportState } from "./types.js";
import { graphPanelReducer, createInitialState } from "./graph-panel-reducer.js";

interface GraphPanelDispatch {
  selectNode(portName: string): void;
  toggleMultiSelect(portName: string): void;
  clearSelection(): void;
  setHovered(portName: string | undefined): void;
  setViewport(viewport: GraphViewportState): void;
  setFilter(filter: Partial<GraphFilterState>): void;
  resetFilter(): void;
  toggleAnalysis(): void;
  toggleMetadata(): void;
  toggleFilterPanel(): void;
  setLayoutDirection(direction: "TB" | "LR"): void;
  toggleMinimap(): void;
  setContainer(containerName: string | undefined): void;
  setBlastRadius(portName: string | undefined): void;
  setActivePreset(preset: string | undefined): void;
}

interface UseGraphPanelStateResult {
  readonly state: GraphPanelState;
  readonly dispatch: GraphPanelDispatch;
}

/**
 * Hook wrapping the graph panel reducer.
 *
 * Provides typed dispatch helpers for each action type.
 */
function useGraphPanelState(overrides?: Partial<GraphPanelState>): UseGraphPanelStateResult {
  const [state, rawDispatch] = useReducer(graphPanelReducer, overrides, init =>
    createInitialState(init)
  );

  const selectNode = useCallback(
    (portName: string) => rawDispatch({ type: "SELECT_NODE", portName }),
    []
  );

  const toggleMultiSelect = useCallback(
    (portName: string) => rawDispatch({ type: "TOGGLE_MULTI_SELECT", portName }),
    []
  );

  const clearSelection = useCallback(() => rawDispatch({ type: "CLEAR_SELECTION" }), []);

  const setHovered = useCallback(
    (portName: string | undefined) => rawDispatch({ type: "SET_HOVERED", portName }),
    []
  );

  const setViewport = useCallback(
    (viewport: GraphViewportState) => rawDispatch({ type: "SET_VIEWPORT", viewport }),
    []
  );

  const setFilter = useCallback(
    (filter: Partial<GraphFilterState>) => rawDispatch({ type: "SET_FILTER", filter }),
    []
  );

  const resetFilter = useCallback(() => rawDispatch({ type: "RESET_FILTER" }), []);

  const toggleAnalysis = useCallback(() => rawDispatch({ type: "TOGGLE_ANALYSIS" }), []);

  const toggleMetadata = useCallback(() => rawDispatch({ type: "TOGGLE_METADATA" }), []);

  const toggleFilterPanel = useCallback(() => rawDispatch({ type: "TOGGLE_FILTER_PANEL" }), []);

  const setLayoutDirection = useCallback(
    (direction: "TB" | "LR") => rawDispatch({ type: "SET_LAYOUT_DIRECTION", direction }),
    []
  );

  const toggleMinimap = useCallback(() => rawDispatch({ type: "TOGGLE_MINIMAP" }), []);

  const setContainer = useCallback(
    (containerName: string | undefined) => rawDispatch({ type: "SET_CONTAINER", containerName }),
    []
  );

  const setBlastRadius = useCallback(
    (portName: string | undefined) => rawDispatch({ type: "SET_BLAST_RADIUS", portName }),
    []
  );

  const setActivePreset = useCallback(
    (preset: string | undefined) => rawDispatch({ type: "SET_ACTIVE_PRESET", preset }),
    []
  );

  const dispatch = useMemo<GraphPanelDispatch>(
    () => ({
      selectNode,
      toggleMultiSelect,
      clearSelection,
      setHovered,
      setViewport,
      setFilter,
      resetFilter,
      toggleAnalysis,
      toggleMetadata,
      toggleFilterPanel,
      setLayoutDirection,
      toggleMinimap,
      setContainer,
      setBlastRadius,
      setActivePreset,
    }),
    [
      selectNode,
      toggleMultiSelect,
      clearSelection,
      setHovered,
      setViewport,
      setFilter,
      resetFilter,
      toggleAnalysis,
      toggleMetadata,
      toggleFilterPanel,
      setLayoutDirection,
      toggleMinimap,
      setContainer,
      setBlastRadius,
      setActivePreset,
    ]
  );

  return { state, dispatch };
}

export { useGraphPanelState };
export type { GraphPanelDispatch, UseGraphPanelStateResult };
