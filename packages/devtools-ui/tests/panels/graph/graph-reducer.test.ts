/**
 * Tests for graph panel reducer.
 */

import { describe, it, expect } from "vitest";
import {
  graphPanelReducer,
  createInitialState,
  mergeFilter,
} from "../../../src/panels/graph/graph-panel-reducer.js";
import {
  DEFAULT_FILTER_STATE,
  DEFAULT_VIEWPORT_STATE,
} from "../../../src/panels/graph/constants.js";

describe("createInitialState", () => {
  it("returns default state", () => {
    const state = createInitialState();
    expect(state.selectedContainerName).toBeUndefined();
    expect(state.selectedNodes.size).toBe(0);
    expect(state.hoveredNode).toBeUndefined();
    expect(state.viewport).toEqual(DEFAULT_VIEWPORT_STATE);
    expect(state.analysisSidebarOpen).toBe(false);
    expect(state.metadataInspectorOpen).toBe(false);
    expect(state.filterPanelOpen).toBe(false);
    expect(state.layoutDirection).toBe("TB");
    expect(state.minimapVisible).toBe(false);
    expect(state.activePreset).toBeUndefined();
    expect(state.blastRadius).toBeUndefined();
  });

  it("accepts overrides", () => {
    const state = createInitialState({ layoutDirection: "LR", minimapVisible: true });
    expect(state.layoutDirection).toBe("LR");
    expect(state.minimapVisible).toBe(true);
  });
});

describe("graphPanelReducer", () => {
  it("SELECT_NODE sets single selection and clears blast radius", () => {
    const state = createInitialState({ blastRadius: "A" });
    const next = graphPanelReducer(state, { type: "SELECT_NODE", portName: "B" });
    expect(next.selectedNodes).toEqual(new Set(["B"]));
    expect(next.blastRadius).toBeUndefined();
  });

  it("TOGGLE_MULTI_SELECT adds node", () => {
    const state = createInitialState();
    const s1 = graphPanelReducer(state, { type: "SELECT_NODE", portName: "A" });
    const s2 = graphPanelReducer(s1, { type: "TOGGLE_MULTI_SELECT", portName: "B" });
    expect(s2.selectedNodes.has("A")).toBe(true);
    expect(s2.selectedNodes.has("B")).toBe(true);
  });

  it("TOGGLE_MULTI_SELECT removes node if already selected", () => {
    const state = createInitialState({ selectedNodes: new Set(["A", "B"]) });
    const next = graphPanelReducer(state, { type: "TOGGLE_MULTI_SELECT", portName: "A" });
    expect(next.selectedNodes.has("A")).toBe(false);
    expect(next.selectedNodes.has("B")).toBe(true);
  });

  it("CLEAR_SELECTION empties selection and clears blast radius", () => {
    const state = createInitialState({ selectedNodes: new Set(["A"]), blastRadius: "A" });
    const next = graphPanelReducer(state, { type: "CLEAR_SELECTION" });
    expect(next.selectedNodes.size).toBe(0);
    expect(next.blastRadius).toBeUndefined();
  });

  it("SET_HOVERED sets hovered node", () => {
    const state = createInitialState();
    const next = graphPanelReducer(state, { type: "SET_HOVERED", portName: "A" });
    expect(next.hoveredNode).toBe("A");
  });

  it("SET_HOVERED can clear hovered node", () => {
    const state = createInitialState({ hoveredNode: "A" });
    const next = graphPanelReducer(state, { type: "SET_HOVERED", portName: undefined });
    expect(next.hoveredNode).toBeUndefined();
  });

  it("SET_VIEWPORT updates viewport", () => {
    const state = createInitialState();
    const viewport = { panX: 10, panY: 20, zoom: 2 };
    const next = graphPanelReducer(state, { type: "SET_VIEWPORT", viewport });
    expect(next.viewport).toEqual(viewport);
  });

  it("SET_FILTER merges filter and clears active preset", () => {
    const state = createInitialState({ activePreset: "my-preset" });
    const next = graphPanelReducer(state, {
      type: "SET_FILTER",
      filter: { searchText: "test" },
    });
    expect(next.filter.searchText).toBe("test");
    expect(next.activePreset).toBeUndefined();
  });

  it("RESET_FILTER restores default filter", () => {
    const state = createInitialState();
    const s1 = graphPanelReducer(state, {
      type: "SET_FILTER",
      filter: { searchText: "test" },
    });
    const s2 = graphPanelReducer(s1, { type: "RESET_FILTER" });
    expect(s2.filter).toEqual(DEFAULT_FILTER_STATE);
    expect(s2.activePreset).toBeUndefined();
  });

  it("TOGGLE_ANALYSIS toggles sidebar", () => {
    const state = createInitialState();
    const s1 = graphPanelReducer(state, { type: "TOGGLE_ANALYSIS" });
    expect(s1.analysisSidebarOpen).toBe(true);
    const s2 = graphPanelReducer(s1, { type: "TOGGLE_ANALYSIS" });
    expect(s2.analysisSidebarOpen).toBe(false);
  });

  it("TOGGLE_METADATA toggles inspector", () => {
    const state = createInitialState();
    const next = graphPanelReducer(state, { type: "TOGGLE_METADATA" });
    expect(next.metadataInspectorOpen).toBe(true);
  });

  it("TOGGLE_FILTER_PANEL toggles filter panel", () => {
    const state = createInitialState();
    const next = graphPanelReducer(state, { type: "TOGGLE_FILTER_PANEL" });
    expect(next.filterPanelOpen).toBe(true);
  });

  it("SET_LAYOUT_DIRECTION changes direction", () => {
    const state = createInitialState();
    const next = graphPanelReducer(state, { type: "SET_LAYOUT_DIRECTION", direction: "LR" });
    expect(next.layoutDirection).toBe("LR");
  });

  it("TOGGLE_MINIMAP toggles minimap", () => {
    const state = createInitialState();
    const s1 = graphPanelReducer(state, { type: "TOGGLE_MINIMAP" });
    expect(s1.minimapVisible).toBe(true);
    const s2 = graphPanelReducer(s1, { type: "TOGGLE_MINIMAP" });
    expect(s2.minimapVisible).toBe(false);
  });

  it("SET_CONTAINER changes container and resets selection", () => {
    const state = createInitialState({
      selectedNodes: new Set(["A"]),
      hoveredNode: "A",
      blastRadius: "A",
    });
    const next = graphPanelReducer(state, { type: "SET_CONTAINER", containerName: "Child" });
    expect(next.selectedContainerName).toBe("Child");
    expect(next.selectedNodes.size).toBe(0);
    expect(next.hoveredNode).toBeUndefined();
    expect(next.blastRadius).toBeUndefined();
  });

  it("SET_BLAST_RADIUS sets blast radius", () => {
    const state = createInitialState();
    const next = graphPanelReducer(state, { type: "SET_BLAST_RADIUS", portName: "Logger" });
    expect(next.blastRadius).toBe("Logger");
  });

  it("SET_ACTIVE_PRESET sets preset name", () => {
    const state = createInitialState();
    const next = graphPanelReducer(state, { type: "SET_ACTIVE_PRESET", preset: "my-preset" });
    expect(next.activePreset).toBe("my-preset");
  });
});

describe("mergeFilter", () => {
  it("merges partial update into current filter", () => {
    const result = mergeFilter(DEFAULT_FILTER_STATE, { searchText: "test" });
    expect(result.searchText).toBe("test");
    expect(result.lifetimes).toBe(DEFAULT_FILTER_STATE.lifetimes);
  });

  it("preserves unspecified fields", () => {
    const current = { ...DEFAULT_FILTER_STATE, direction: "inbound" as const };
    const result = mergeFilter(current, { searchText: "test" });
    expect(result.direction).toBe("inbound");
  });
});
