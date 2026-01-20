/**
 * Tests for DevTools Runtime Selectors
 *
 * These tests verify:
 * 1. selectActivePlugin() returns the currently active plugin
 * 2. selectPluginById() returns plugin or undefined
 * 3. selectTabList() returns ordered tab configs for rendering
 * 4. Selectors are memoized (same input = same output reference)
 * 5. Container selectors work correctly
 * 6. Tracing selectors work correctly
 */

import { describe, it, expect } from "vitest";
import type { DevToolsRuntimeState } from "../../src/runtime/types.js";
import type { DevToolsPlugin, PluginProps } from "../../src/react/types/plugin-types.js";
import {
  createSelector,
  selectPlugins,
  selectActivePlugin,
  selectPluginById,
  selectTabList,
  selectSelectedContainers,
  selectIsContainerSelected,
  selectTracingState,
  selectIsTracingActive,
} from "../../src/runtime/selectors/index.js";

// =============================================================================
// Mock Plugin Factory
// =============================================================================

function createMockPlugin(id: string, label?: string): DevToolsPlugin {
  const MockComponent = (_props: PluginProps) => null;

  return {
    id,
    label: label ?? id.charAt(0).toUpperCase() + id.slice(1),
    component: MockComponent,
  };
}

// =============================================================================
// State Factory
// =============================================================================

function createMockState(overrides: Partial<DevToolsRuntimeState> = {}): DevToolsRuntimeState {
  const defaultPlugins = [
    createMockPlugin("graph", "Graph"),
    createMockPlugin("services", "Services"),
    createMockPlugin("tracing", "Tracing"),
  ];

  return {
    activeTabId: "graph",
    selectedContainerIds: new Set<string>(),
    tracingEnabled: true,
    tracingPaused: false,
    tracingThreshold: 100,
    plugins: defaultPlugins,
    ...overrides,
  };
}

// =============================================================================
// createSelector Memoization Tests
// =============================================================================

describe("createSelector", () => {
  it("should memoize results based on input reference", () => {
    const computeFn = (state: DevToolsRuntimeState) => ({
      count: state.plugins.length,
    });

    const selector = createSelector(computeFn);
    const state = createMockState();

    const result1 = selector(state);
    const result2 = selector(state);

    // Same input reference should return same output reference
    expect(result1).toBe(result2);
  });

  it("should recompute when input reference changes", () => {
    const computeFn = (state: DevToolsRuntimeState) => ({
      count: state.plugins.length,
    });

    const selector = createSelector(computeFn);
    const state1 = createMockState();
    const state2 = createMockState();

    const result1 = selector(state1);
    const result2 = selector(state2);

    // Different input references should produce different output references
    expect(result1).not.toBe(result2);
    // But values should be equal
    expect(result1).toEqual(result2);
  });

  it("should use single-entry cache (recomputes when state changes)", () => {
    // This test verifies the single-entry cache behavior.
    // The selector only caches the last state/result pair, which is optimal
    // for useSyncExternalStore where state references are stable until mutation.
    let computeCount = 0;
    const computeFn = (state: DevToolsRuntimeState) => {
      computeCount++;
      return { activeTabId: state.activeTabId };
    };

    const selector = createSelector(computeFn);
    const state1 = createMockState({ activeTabId: "graph" });
    const state2 = createMockState({ activeTabId: "services" });

    // First call computes
    selector(state1);
    expect(computeCount).toBe(1);

    // Same state uses cache
    selector(state1);
    expect(computeCount).toBe(1);

    // Different state recomputes
    selector(state2);
    expect(computeCount).toBe(2);

    // Switching back recomputes (single-entry cache was replaced)
    selector(state1);
    expect(computeCount).toBe(3);

    // But calling with same state again uses cache
    selector(state1);
    expect(computeCount).toBe(3);
  });
});

// =============================================================================
// Plugin Selector Tests
// =============================================================================

describe("selectPlugins", () => {
  it("should return all registered plugins", () => {
    const state = createMockState();

    const plugins = selectPlugins(state);

    expect(plugins).toHaveLength(3);
    expect(plugins[0].id).toBe("graph");
    expect(plugins[1].id).toBe("services");
    expect(plugins[2].id).toBe("tracing");
  });

  it("should return same reference for same state", () => {
    const state = createMockState();

    const plugins1 = selectPlugins(state);
    const plugins2 = selectPlugins(state);

    expect(plugins1).toBe(plugins2);
  });
});

describe("selectActivePlugin", () => {
  it("should return the currently active plugin", () => {
    const state = createMockState({ activeTabId: "services" });

    const activePlugin = selectActivePlugin(state);

    expect(activePlugin).toBeDefined();
    expect(activePlugin?.id).toBe("services");
    expect(activePlugin?.label).toBe("Services");
  });

  it("should return undefined when activeTabId does not match any plugin", () => {
    const state = createMockState({ activeTabId: "nonexistent" });

    const activePlugin = selectActivePlugin(state);

    expect(activePlugin).toBeUndefined();
  });

  it("should be memoized - same state returns same reference", () => {
    const state = createMockState({ activeTabId: "graph" });

    const plugin1 = selectActivePlugin(state);
    const plugin2 = selectActivePlugin(state);

    expect(plugin1).toBe(plugin2);
  });

  it("should return different reference when state changes", () => {
    const state1 = createMockState({ activeTabId: "graph" });
    const state2 = createMockState({ activeTabId: "services" });

    const plugin1 = selectActivePlugin(state1);
    const plugin2 = selectActivePlugin(state2);

    expect(plugin1).not.toBe(plugin2);
    expect(plugin1?.id).toBe("graph");
    expect(plugin2?.id).toBe("services");
  });
});

describe("selectPluginById", () => {
  it("should return plugin when id matches", () => {
    const state = createMockState();

    const plugin = selectPluginById(state, "tracing");

    expect(plugin).toBeDefined();
    expect(plugin?.id).toBe("tracing");
    expect(plugin?.label).toBe("Tracing");
  });

  it("should return undefined when id does not match", () => {
    const state = createMockState();

    const plugin = selectPluginById(state, "unknown");

    expect(plugin).toBeUndefined();
  });

  it("should work for first plugin", () => {
    const state = createMockState();

    const plugin = selectPluginById(state, "graph");

    expect(plugin?.id).toBe("graph");
  });

  it("should work for last plugin", () => {
    const state = createMockState();

    const plugin = selectPluginById(state, "tracing");

    expect(plugin?.id).toBe("tracing");
  });
});

describe("selectTabList", () => {
  it("should return ordered tab configs for rendering", () => {
    const plugins = [
      createMockPlugin("graph", "Graph View"),
      createMockPlugin("services", "Services"),
      createMockPlugin("inspector", "Inspector"),
    ];
    const state = createMockState({ plugins });

    const tabList = selectTabList(state);

    expect(tabList).toHaveLength(3);
    expect(tabList[0]).toEqual({ id: "graph", label: "Graph View" });
    expect(tabList[1]).toEqual({ id: "services", label: "Services" });
    expect(tabList[2]).toEqual({ id: "inspector", label: "Inspector" });
  });

  it("should preserve registration order", () => {
    const plugins = [
      createMockPlugin("z-last", "Z Last"),
      createMockPlugin("a-first", "A First"),
      createMockPlugin("m-middle", "M Middle"),
    ];
    const state = createMockState({ plugins });

    const tabList = selectTabList(state);

    // Order should match registration, not alphabetical
    expect(tabList[0].id).toBe("z-last");
    expect(tabList[1].id).toBe("a-first");
    expect(tabList[2].id).toBe("m-middle");
  });

  it("should be memoized - same state returns same reference", () => {
    const state = createMockState();

    const tabList1 = selectTabList(state);
    const tabList2 = selectTabList(state);

    expect(tabList1).toBe(tabList2);
  });

  it("should include icon property when plugin has icon", () => {
    const iconElement = { type: "svg", props: {} };
    const plugins = [
      {
        ...createMockPlugin("graph"),
        icon: iconElement,
      } as DevToolsPlugin,
    ];
    const state = createMockState({ plugins });

    const tabList = selectTabList(state);

    expect(tabList[0].icon).toBe(iconElement);
  });
});

// =============================================================================
// Container Selector Tests
// =============================================================================

describe("selectSelectedContainers", () => {
  it("should return selected container ids", () => {
    const state = createMockState({
      selectedContainerIds: new Set(["container-1", "container-2"]),
    });

    const selected = selectSelectedContainers(state);

    expect(selected.size).toBe(2);
    expect(selected.has("container-1")).toBe(true);
    expect(selected.has("container-2")).toBe(true);
  });

  it("should return empty set when no containers selected", () => {
    const state = createMockState({
      selectedContainerIds: new Set(),
    });

    const selected = selectSelectedContainers(state);

    expect(selected.size).toBe(0);
  });

  it("should return same reference for same state", () => {
    const state = createMockState({
      selectedContainerIds: new Set(["c1"]),
    });

    const selected1 = selectSelectedContainers(state);
    const selected2 = selectSelectedContainers(state);

    expect(selected1).toBe(selected2);
  });
});

describe("selectIsContainerSelected", () => {
  it("should return true when container is selected", () => {
    const state = createMockState({
      selectedContainerIds: new Set(["container-1", "container-2"]),
    });

    expect(selectIsContainerSelected(state, "container-1")).toBe(true);
    expect(selectIsContainerSelected(state, "container-2")).toBe(true);
  });

  it("should return false when container is not selected", () => {
    const state = createMockState({
      selectedContainerIds: new Set(["container-1"]),
    });

    expect(selectIsContainerSelected(state, "container-2")).toBe(false);
    expect(selectIsContainerSelected(state, "unknown")).toBe(false);
  });

  it("should return false when no containers selected", () => {
    const state = createMockState({
      selectedContainerIds: new Set(),
    });

    expect(selectIsContainerSelected(state, "any")).toBe(false);
  });
});

// =============================================================================
// Tracing Selector Tests
// =============================================================================

describe("selectTracingState", () => {
  it("should return tracing state object", () => {
    const state = createMockState({
      tracingEnabled: true,
      tracingPaused: false,
      tracingThreshold: 100,
    });

    const tracingState = selectTracingState(state);

    expect(tracingState).toEqual({
      enabled: true,
      paused: false,
      threshold: 100,
    });
  });

  it("should reflect paused state", () => {
    const state = createMockState({
      tracingEnabled: true,
      tracingPaused: true,
      tracingThreshold: 250,
    });

    const tracingState = selectTracingState(state);

    expect(tracingState).toEqual({
      enabled: true,
      paused: true,
      threshold: 250,
    });
  });

  it("should be memoized - same state returns same reference", () => {
    const state = createMockState();

    const tracingState1 = selectTracingState(state);
    const tracingState2 = selectTracingState(state);

    expect(tracingState1).toBe(tracingState2);
  });

  it("should return different reference when state changes", () => {
    const state1 = createMockState({ tracingPaused: false });
    const state2 = createMockState({ tracingPaused: true });

    const tracingState1 = selectTracingState(state1);
    const tracingState2 = selectTracingState(state2);

    expect(tracingState1).not.toBe(tracingState2);
  });
});

describe("selectIsTracingActive", () => {
  it("should return true when enabled and not paused", () => {
    const state = createMockState({
      tracingEnabled: true,
      tracingPaused: false,
    });

    expect(selectIsTracingActive(state)).toBe(true);
  });

  it("should return false when disabled", () => {
    const state = createMockState({
      tracingEnabled: false,
      tracingPaused: false,
    });

    expect(selectIsTracingActive(state)).toBe(false);
  });

  it("should return false when paused", () => {
    const state = createMockState({
      tracingEnabled: true,
      tracingPaused: true,
    });

    expect(selectIsTracingActive(state)).toBe(false);
  });

  it("should return false when both disabled and paused", () => {
    const state = createMockState({
      tracingEnabled: false,
      tracingPaused: true,
    });

    expect(selectIsTracingActive(state)).toBe(false);
  });
});

// =============================================================================
// Selector Composition Tests
// =============================================================================

describe("selector composition", () => {
  it("should allow composing selectors for complex queries", () => {
    // Test that selectors can work together
    const state = createMockState({
      activeTabId: "services",
      selectedContainerIds: new Set(["c1", "c2"]),
      tracingEnabled: true,
      tracingPaused: false,
    });

    const activePlugin = selectActivePlugin(state);
    const isTracingActive = selectIsTracingActive(state);
    const selectedContainers = selectSelectedContainers(state);

    expect(activePlugin?.id).toBe("services");
    expect(isTracingActive).toBe(true);
    expect(selectedContainers.size).toBe(2);
  });
});
