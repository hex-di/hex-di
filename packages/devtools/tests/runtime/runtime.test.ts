/**
 * Tests for DevTools Runtime Implementation
 *
 * These tests verify:
 * 1. createDevToolsRuntime() factory creates runtime with plugins
 * 2. dispatch(command) updates state correctly
 * 3. subscribe() notifies listeners on state change
 * 4. getState() returns current immutable state
 * 5. Plugin id collision throws error at creation
 * 6. getSnapshot() returns state for useSyncExternalStore
 * 7. subscribeToEvents() receives events after state changes
 * 8. Event emission matches command dispatched
 */

import { describe, it, expect, vi } from "vitest";
import type { DevToolsPlugin, DevToolsEvent, PluginProps } from "../../src/runtime/types.js";
import { createDevToolsRuntime } from "../../src/runtime/create-runtime.js";

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
// Factory Tests
// =============================================================================

describe("createDevToolsRuntime", () => {
  describe("factory creation", () => {
    it("should create runtime with plugins", () => {
      const plugins = [createMockPlugin("graph"), createMockPlugin("services")];

      const runtime = createDevToolsRuntime({ plugins });

      expect(runtime).toBeDefined();
      expect(runtime.getState).toBeDefined();
      expect(runtime.dispatch).toBeDefined();
      expect(runtime.subscribe).toBeDefined();
      expect(runtime.subscribeToEvents).toBeDefined();
    });

    it("should initialize with first plugin as active tab", () => {
      const plugins = [
        createMockPlugin("services"),
        createMockPlugin("graph"),
        createMockPlugin("tracing"),
      ];

      const runtime = createDevToolsRuntime({ plugins });
      const state = runtime.getState();

      expect(state.activeTabId).toBe("services");
    });

    it("should use initialTabId when provided", () => {
      const plugins = [
        createMockPlugin("graph"),
        createMockPlugin("services"),
        createMockPlugin("tracing"),
      ];

      const runtime = createDevToolsRuntime({
        plugins,
        initialTabId: "tracing",
      });
      const state = runtime.getState();

      expect(state.activeTabId).toBe("tracing");
    });

    it("should initialize with default tracing state", () => {
      const plugins = [createMockPlugin("test")];

      const runtime = createDevToolsRuntime({ plugins });
      const state = runtime.getState();

      expect(state.tracingEnabled).toBe(true);
      expect(state.tracingPaused).toBe(false);
      expect(state.tracingThreshold).toBe(100);
    });

    it("should use custom tracing configuration when provided", () => {
      const plugins = [createMockPlugin("test")];

      const runtime = createDevToolsRuntime({
        plugins,
        tracingEnabled: false,
        tracingThreshold: 250,
      });
      const state = runtime.getState();

      expect(state.tracingEnabled).toBe(false);
      expect(state.tracingThreshold).toBe(250);
    });

    it("should use initial container selection when provided", () => {
      const plugins = [createMockPlugin("test")];
      const initialContainerIds = new Set(["container-1", "container-2"]);

      const runtime = createDevToolsRuntime({
        plugins,
        initialContainerIds,
      });
      const state = runtime.getState();

      expect(state.selectedContainerIds.size).toBe(2);
      expect(state.selectedContainerIds.has("container-1")).toBe(true);
      expect(state.selectedContainerIds.has("container-2")).toBe(true);
    });
  });

  describe("plugin id validation", () => {
    it("should throw error when plugins have duplicate ids", () => {
      const plugins = [
        createMockPlugin("graph"),
        createMockPlugin("graph"), // duplicate
        createMockPlugin("services"),
      ];

      expect(() => createDevToolsRuntime({ plugins })).toThrow(/duplicate plugin id/i);
    });

    it("should throw error when plugins array is empty", () => {
      expect(() => createDevToolsRuntime({ plugins: [] })).toThrow(/at least one plugin/i);
    });

    it("should accept plugins with unique ids", () => {
      const plugins = [
        createMockPlugin("alpha"),
        createMockPlugin("beta"),
        createMockPlugin("gamma"),
      ];

      expect(() => createDevToolsRuntime({ plugins })).not.toThrow();
    });
  });
});

// =============================================================================
// State Management Tests
// =============================================================================

describe("DevToolsRuntime state management", () => {
  describe("getState()", () => {
    it("should return current immutable state", () => {
      const plugins = [createMockPlugin("graph"), createMockPlugin("services")];
      const runtime = createDevToolsRuntime({ plugins });

      const state = runtime.getState();

      expect(state.activeTabId).toBe("graph");
      expect(state.plugins).toHaveLength(2);
      expect(Object.isFrozen(state.plugins)).toBe(true);
    });

    it("should return same reference until state changes", () => {
      const plugins = [createMockPlugin("test")];
      const runtime = createDevToolsRuntime({ plugins });

      const state1 = runtime.getState();
      const state2 = runtime.getState();

      expect(state1).toBe(state2);
    });

    it("should return new reference after state changes", () => {
      const plugins = [createMockPlugin("graph"), createMockPlugin("services")];
      const runtime = createDevToolsRuntime({ plugins });

      const state1 = runtime.getState();
      runtime.dispatch({ type: "selectTab", tabId: "services" });
      const state2 = runtime.getState();

      expect(state1).not.toBe(state2);
      expect(state1.activeTabId).toBe("graph");
      expect(state2.activeTabId).toBe("services");
    });
  });

  describe("getSnapshot()", () => {
    it("should return same reference as getState()", () => {
      const plugins = [createMockPlugin("test")];
      const runtime = createDevToolsRuntime({ plugins });

      const state = runtime.getState();
      const snapshot = runtime.getSnapshot();

      expect(state).toBe(snapshot);
    });

    it("should work correctly with useSyncExternalStore pattern", () => {
      const plugins = [createMockPlugin("graph"), createMockPlugin("services")];
      const runtime = createDevToolsRuntime({ plugins });

      // Simulate useSyncExternalStore pattern
      const subscribe = runtime.subscribe;
      const getSnapshot = runtime.getSnapshot;

      let currentSnapshot = getSnapshot();
      expect(currentSnapshot.activeTabId).toBe("graph");

      // Simulate re-render after state change
      runtime.dispatch({ type: "selectTab", tabId: "services" });
      currentSnapshot = getSnapshot();
      expect(currentSnapshot.activeTabId).toBe("services");

      // Verify subscribe returns unsubscribe function
      const listener = vi.fn();
      const unsubscribe = subscribe(listener);
      expect(typeof unsubscribe).toBe("function");
    });
  });

  describe("getServerSnapshot()", () => {
    it("should return stable state for SSR", () => {
      const plugins = [createMockPlugin("test")];
      const runtime = createDevToolsRuntime({ plugins });

      const serverSnapshot = runtime.getServerSnapshot();

      expect(serverSnapshot).toBeDefined();
      expect(serverSnapshot.activeTabId).toBe("test");
    });
  });
});

// =============================================================================
// Command Dispatch Tests
// =============================================================================

describe("DevToolsRuntime dispatch", () => {
  describe("selectTab command", () => {
    it("should update activeTabId", () => {
      const plugins = [
        createMockPlugin("graph"),
        createMockPlugin("services"),
        createMockPlugin("tracing"),
      ];
      const runtime = createDevToolsRuntime({ plugins });

      runtime.dispatch({ type: "selectTab", tabId: "services" });

      expect(runtime.getState().activeTabId).toBe("services");
    });

    it("should not change state when selecting already active tab", () => {
      const plugins = [createMockPlugin("graph"), createMockPlugin("services")];
      const runtime = createDevToolsRuntime({ plugins });

      const stateBefore = runtime.getState();
      runtime.dispatch({ type: "selectTab", tabId: "graph" });
      const stateAfter = runtime.getState();

      expect(stateBefore).toBe(stateAfter);
    });
  });

  describe("selectContainers command", () => {
    it("should update selectedContainerIds", () => {
      const plugins = [createMockPlugin("test")];
      const runtime = createDevToolsRuntime({ plugins });

      runtime.dispatch({
        type: "selectContainers",
        ids: new Set(["container-a", "container-b"]),
      });

      const state = runtime.getState();
      expect(state.selectedContainerIds.size).toBe(2);
      expect(state.selectedContainerIds.has("container-a")).toBe(true);
      expect(state.selectedContainerIds.has("container-b")).toBe(true);
    });

    it("should replace existing selection", () => {
      const plugins = [createMockPlugin("test")];
      const runtime = createDevToolsRuntime({
        plugins,
        initialContainerIds: new Set(["old-1", "old-2"]),
      });

      runtime.dispatch({
        type: "selectContainers",
        ids: new Set(["new-1"]),
      });

      const state = runtime.getState();
      expect(state.selectedContainerIds.size).toBe(1);
      expect(state.selectedContainerIds.has("new-1")).toBe(true);
      expect(state.selectedContainerIds.has("old-1")).toBe(false);
    });
  });

  describe("tracing commands", () => {
    it("should toggle tracing enabled state", () => {
      const plugins = [createMockPlugin("test")];
      const runtime = createDevToolsRuntime({ plugins, tracingEnabled: true });

      runtime.dispatch({ type: "toggleTracing" });
      expect(runtime.getState().tracingEnabled).toBe(false);

      runtime.dispatch({ type: "toggleTracing" });
      expect(runtime.getState().tracingEnabled).toBe(true);
    });

    it("should pause tracing", () => {
      const plugins = [createMockPlugin("test")];
      const runtime = createDevToolsRuntime({ plugins });

      runtime.dispatch({ type: "pauseTracing" });

      expect(runtime.getState().tracingPaused).toBe(true);
    });

    it("should resume tracing", () => {
      const plugins = [createMockPlugin("test")];
      const runtime = createDevToolsRuntime({ plugins });

      runtime.dispatch({ type: "pauseTracing" });
      runtime.dispatch({ type: "resumeTracing" });

      expect(runtime.getState().tracingPaused).toBe(false);
    });

    it("should set threshold", () => {
      const plugins = [createMockPlugin("test")];
      const runtime = createDevToolsRuntime({ plugins });

      runtime.dispatch({ type: "setThreshold", value: 500 });

      expect(runtime.getState().tracingThreshold).toBe(500);
    });
  });

  describe("clearTraces command", () => {
    it("should dispatch clearTraces without error", () => {
      const plugins = [createMockPlugin("test")];
      const runtime = createDevToolsRuntime({ plugins });

      // clearTraces doesn't modify state directly, it emits an event
      // that external systems can listen to
      expect(() => {
        runtime.dispatch({ type: "clearTraces" });
      }).not.toThrow();
    });
  });
});

// =============================================================================
// Subscription Tests
// =============================================================================

describe("DevToolsRuntime subscriptions", () => {
  describe("subscribe()", () => {
    it("should notify listeners on state change", () => {
      const plugins = [createMockPlugin("graph"), createMockPlugin("services")];
      const runtime = createDevToolsRuntime({ plugins });

      const listener = vi.fn();
      runtime.subscribe(listener);

      runtime.dispatch({ type: "selectTab", tabId: "services" });

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should not notify listeners when state does not change", () => {
      const plugins = [createMockPlugin("graph"), createMockPlugin("services")];
      const runtime = createDevToolsRuntime({ plugins });

      const listener = vi.fn();
      runtime.subscribe(listener);

      // Selecting already active tab should not trigger notification
      runtime.dispatch({ type: "selectTab", tabId: "graph" });

      expect(listener).not.toHaveBeenCalled();
    });

    it("should notify multiple listeners", () => {
      const plugins = [createMockPlugin("graph"), createMockPlugin("services")];
      const runtime = createDevToolsRuntime({ plugins });

      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      runtime.subscribe(listener1);
      runtime.subscribe(listener2);
      runtime.subscribe(listener3);

      runtime.dispatch({ type: "selectTab", tabId: "services" });

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(1);
    });

    it("should return unsubscribe function", () => {
      const plugins = [createMockPlugin("graph"), createMockPlugin("services")];
      const runtime = createDevToolsRuntime({ plugins });

      const listener = vi.fn();
      const unsubscribe = runtime.subscribe(listener);

      unsubscribe();
      runtime.dispatch({ type: "selectTab", tabId: "services" });

      expect(listener).not.toHaveBeenCalled();
    });

    it("should handle unsubscribe during notification", () => {
      const plugins = [createMockPlugin("graph"), createMockPlugin("services")];
      const runtime = createDevToolsRuntime({ plugins });

      const listener2 = vi.fn();
      // Use an object to hold the unsubscribe function so it can be accessed
      // from within the listener closure
      const holder: { unsubscribe?: () => void } = {};

      const listener1 = vi.fn(() => {
        if (holder.unsubscribe) {
          holder.unsubscribe();
        }
      });

      holder.unsubscribe = runtime.subscribe(listener1);
      runtime.subscribe(listener2);

      runtime.dispatch({ type: "selectTab", tabId: "services" });

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe("subscribeToEvents()", () => {
    it("should receive tabChanged event on tab selection", () => {
      const plugins = [createMockPlugin("graph"), createMockPlugin("services")];
      const runtime = createDevToolsRuntime({ plugins });

      const eventListener = vi.fn();
      runtime.subscribeToEvents(eventListener);

      runtime.dispatch({ type: "selectTab", tabId: "services" });

      expect(eventListener).toHaveBeenCalledWith({
        type: "tabChanged",
        tabId: "services",
      } satisfies DevToolsEvent);
    });

    it("should receive containersSelected event on container selection", () => {
      const plugins = [createMockPlugin("test")];
      const runtime = createDevToolsRuntime({ plugins });

      const eventListener = vi.fn();
      runtime.subscribeToEvents(eventListener);

      const newIds = new Set(["c1", "c2"]);
      runtime.dispatch({ type: "selectContainers", ids: newIds });

      expect(eventListener).toHaveBeenCalledWith({
        type: "containersSelected",
        ids: newIds,
      } satisfies DevToolsEvent);
    });

    it("should receive tracingStateChanged event on tracing toggle", () => {
      const plugins = [createMockPlugin("test")];
      const runtime = createDevToolsRuntime({ plugins, tracingEnabled: true });

      const eventListener = vi.fn();
      runtime.subscribeToEvents(eventListener);

      runtime.dispatch({ type: "toggleTracing" });

      expect(eventListener).toHaveBeenCalledWith({
        type: "tracingStateChanged",
        enabled: false,
        paused: false,
      } satisfies DevToolsEvent);
    });

    it("should receive tracingStateChanged event on pause/resume", () => {
      const plugins = [createMockPlugin("test")];
      const runtime = createDevToolsRuntime({ plugins });

      const eventListener = vi.fn();
      runtime.subscribeToEvents(eventListener);

      runtime.dispatch({ type: "pauseTracing" });

      expect(eventListener).toHaveBeenCalledWith({
        type: "tracingStateChanged",
        enabled: true,
        paused: true,
      } satisfies DevToolsEvent);

      runtime.dispatch({ type: "resumeTracing" });

      expect(eventListener).toHaveBeenLastCalledWith({
        type: "tracingStateChanged",
        enabled: true,
        paused: false,
      } satisfies DevToolsEvent);
    });

    it("should receive tracesCleared event", () => {
      const plugins = [createMockPlugin("test")];
      const runtime = createDevToolsRuntime({ plugins });

      const eventListener = vi.fn();
      runtime.subscribeToEvents(eventListener);

      runtime.dispatch({ type: "clearTraces" });

      expect(eventListener).toHaveBeenCalledWith({
        type: "tracesCleared",
      } satisfies DevToolsEvent);
    });

    it("should return unsubscribe function for events", () => {
      const plugins = [createMockPlugin("graph"), createMockPlugin("services")];
      const runtime = createDevToolsRuntime({ plugins });

      const eventListener = vi.fn();
      const unsubscribe = runtime.subscribeToEvents(eventListener);

      unsubscribe();
      runtime.dispatch({ type: "selectTab", tabId: "services" });

      expect(eventListener).not.toHaveBeenCalled();
    });

    it("should not emit events when state does not change", () => {
      const plugins = [createMockPlugin("graph"), createMockPlugin("services")];
      const runtime = createDevToolsRuntime({ plugins });

      const eventListener = vi.fn();
      runtime.subscribeToEvents(eventListener);

      // Selecting already active tab should not emit event
      runtime.dispatch({ type: "selectTab", tabId: "graph" });

      expect(eventListener).not.toHaveBeenCalled();
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("DevToolsRuntime integration", () => {
  it("should handle rapid successive dispatches", () => {
    const plugins = [
      createMockPlugin("graph"),
      createMockPlugin("services"),
      createMockPlugin("tracing"),
    ];
    const runtime = createDevToolsRuntime({ plugins });

    const listener = vi.fn();
    runtime.subscribe(listener);

    runtime.dispatch({ type: "selectTab", tabId: "services" });
    runtime.dispatch({ type: "selectTab", tabId: "tracing" });
    runtime.dispatch({ type: "selectTab", tabId: "graph" });

    expect(listener).toHaveBeenCalledTimes(3);
    expect(runtime.getState().activeTabId).toBe("graph");
  });

  it("should maintain state consistency across operations", () => {
    const plugins = [createMockPlugin("graph"), createMockPlugin("services")];
    const runtime = createDevToolsRuntime({
      plugins,
      tracingEnabled: true,
      initialContainerIds: new Set(["c1"]),
    });

    // Perform multiple operations
    runtime.dispatch({ type: "selectTab", tabId: "services" });
    runtime.dispatch({ type: "toggleTracing" });
    runtime.dispatch({
      type: "selectContainers",
      ids: new Set(["c2", "c3"]),
    });
    runtime.dispatch({ type: "setThreshold", value: 200 });

    const finalState = runtime.getState();

    expect(finalState.activeTabId).toBe("services");
    expect(finalState.tracingEnabled).toBe(false);
    expect(finalState.selectedContainerIds).toEqual(new Set(["c2", "c3"]));
    expect(finalState.tracingThreshold).toBe(200);
    expect(finalState.plugins).toHaveLength(2);
  });
});
