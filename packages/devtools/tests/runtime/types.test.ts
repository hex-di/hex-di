/**
 * Tests for DevTools Runtime Core Types
 *
 * These tests verify:
 * 1. State initialization with default values
 * 2. State immutability (state cannot be mutated directly)
 * 3. Plugin registration and id uniqueness validation
 * 4. Active tab selection state transitions
 * 5. Command type guards work correctly
 * 6. Event type guards work correctly
 */

import { describe, it, expect } from "vitest";
import type {
  DevToolsRuntimeState,
  DevToolsCommand,
  DevToolsEvent,
} from "../../src/runtime/types.js";
import type { DevToolsPlugin, PluginProps } from "../../src/react/types/plugin-types.js";
import { isDevToolsCommand, isDevToolsEvent } from "../../src/runtime/types.js";

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
// State Initialization Tests
// =============================================================================

describe("DevToolsRuntimeState", () => {
  describe("state initialization with default values", () => {
    it("should initialize with required fields", () => {
      const plugins = [createMockPlugin("graph"), createMockPlugin("services")];

      const state: DevToolsRuntimeState = {
        activeTabId: "graph",
        selectedContainerIds: new Set<string>(),
        tracingEnabled: true,
        tracingPaused: false,
        tracingThreshold: 100,
        plugins: Object.freeze(plugins),
      };

      expect(state.activeTabId).toBe("graph");
      expect(state.selectedContainerIds.size).toBe(0);
      expect(state.tracingEnabled).toBe(true);
      expect(state.tracingPaused).toBe(false);
      expect(state.tracingThreshold).toBe(100);
      expect(state.plugins).toHaveLength(2);
    });

    it("should allow empty container selection", () => {
      const state: DevToolsRuntimeState = {
        activeTabId: "graph",
        selectedContainerIds: new Set<string>(),
        tracingEnabled: false,
        tracingPaused: false,
        tracingThreshold: 50,
        plugins: Object.freeze([createMockPlugin("test")]),
      };

      expect(state.selectedContainerIds).toBeInstanceOf(Set);
      expect(state.selectedContainerIds.size).toBe(0);
    });

    it("should support multiple selected containers", () => {
      const containerIds = new Set(["container-1", "container-2", "container-3"]);

      const state: DevToolsRuntimeState = {
        activeTabId: "graph",
        selectedContainerIds: containerIds,
        tracingEnabled: true,
        tracingPaused: false,
        tracingThreshold: 100,
        plugins: Object.freeze([createMockPlugin("test")]),
      };

      expect(state.selectedContainerIds.size).toBe(3);
      expect(state.selectedContainerIds.has("container-1")).toBe(true);
      expect(state.selectedContainerIds.has("container-2")).toBe(true);
      expect(state.selectedContainerIds.has("container-3")).toBe(true);
    });
  });

  describe("state immutability", () => {
    it("should use frozen plugins array", () => {
      const plugins = Object.freeze([createMockPlugin("graph"), createMockPlugin("services")]);

      const state: DevToolsRuntimeState = {
        activeTabId: "graph",
        selectedContainerIds: new Set<string>(),
        tracingEnabled: true,
        tracingPaused: false,
        tracingThreshold: 100,
        plugins,
      };

      // Frozen arrays cannot be modified
      expect(Object.isFrozen(state.plugins)).toBe(true);
    });

    it("should preserve ReadonlySet semantics for container selection", () => {
      const containerIds: ReadonlySet<string> = new Set(["container-1"]);

      const state: DevToolsRuntimeState = {
        activeTabId: "graph",
        selectedContainerIds: containerIds,
        tracingEnabled: true,
        tracingPaused: false,
        tracingThreshold: 100,
        plugins: Object.freeze([createMockPlugin("test")]),
      };

      // ReadonlySet still has iteration capabilities
      expect([...state.selectedContainerIds]).toEqual(["container-1"]);
    });
  });

  describe("plugin registration", () => {
    it("should register multiple plugins with unique ids", () => {
      const plugins = Object.freeze([
        createMockPlugin("graph"),
        createMockPlugin("services"),
        createMockPlugin("tracing"),
        createMockPlugin("inspector"),
      ]);

      const state: DevToolsRuntimeState = {
        activeTabId: plugins[0].id,
        selectedContainerIds: new Set<string>(),
        tracingEnabled: true,
        tracingPaused: false,
        tracingThreshold: 100,
        plugins,
      };

      const ids = state.plugins.map(p => p.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
      expect(ids).toContain("graph");
      expect(ids).toContain("services");
      expect(ids).toContain("tracing");
      expect(ids).toContain("inspector");
    });

    it("should preserve plugin order as registered", () => {
      const plugins = Object.freeze([
        createMockPlugin("first"),
        createMockPlugin("second"),
        createMockPlugin("third"),
      ]);

      const state: DevToolsRuntimeState = {
        activeTabId: "first",
        selectedContainerIds: new Set<string>(),
        tracingEnabled: true,
        tracingPaused: false,
        tracingThreshold: 100,
        plugins,
      };

      expect(state.plugins[0].id).toBe("first");
      expect(state.plugins[1].id).toBe("second");
      expect(state.plugins[2].id).toBe("third");
    });
  });

  describe("active tab state transitions", () => {
    it("should allow changing active tab to any registered plugin id", () => {
      const plugins = Object.freeze([
        createMockPlugin("graph"),
        createMockPlugin("services"),
        createMockPlugin("tracing"),
      ]);

      // Initial state with first tab active
      const initialState: DevToolsRuntimeState = {
        activeTabId: "graph",
        selectedContainerIds: new Set<string>(),
        tracingEnabled: true,
        tracingPaused: false,
        tracingThreshold: 100,
        plugins,
      };

      expect(initialState.activeTabId).toBe("graph");

      // Simulate state transition to a new tab
      const nextState: DevToolsRuntimeState = {
        ...initialState,
        activeTabId: "services",
      };

      expect(nextState.activeTabId).toBe("services");
      // Original state should be unchanged (immutability)
      expect(initialState.activeTabId).toBe("graph");
    });

    it("should create new state object on tab change", () => {
      const plugins = Object.freeze([createMockPlugin("graph"), createMockPlugin("services")]);

      const state1: DevToolsRuntimeState = {
        activeTabId: "graph",
        selectedContainerIds: new Set<string>(),
        tracingEnabled: true,
        tracingPaused: false,
        tracingThreshold: 100,
        plugins,
      };

      const state2: DevToolsRuntimeState = {
        ...state1,
        activeTabId: "services",
      };

      // States should be different objects
      expect(state1).not.toBe(state2);
      // But share immutable data
      expect(state1.plugins).toBe(state2.plugins);
    });
  });
});

// =============================================================================
// Command Type Guard Tests
// =============================================================================

describe("isDevToolsCommand", () => {
  it("should return true for valid selectTab command", () => {
    const command: DevToolsCommand = { type: "selectTab", tabId: "graph" };
    expect(isDevToolsCommand(command)).toBe(true);
  });

  it("should return true for valid selectContainers command", () => {
    const command: DevToolsCommand = {
      type: "selectContainers",
      ids: new Set(["container-1"]),
    };
    expect(isDevToolsCommand(command)).toBe(true);
  });

  it("should return true for valid toggleTracing command", () => {
    const command: DevToolsCommand = { type: "toggleTracing" };
    expect(isDevToolsCommand(command)).toBe(true);
  });

  it("should return true for valid pauseTracing command", () => {
    const command: DevToolsCommand = { type: "pauseTracing" };
    expect(isDevToolsCommand(command)).toBe(true);
  });

  it("should return true for valid resumeTracing command", () => {
    const command: DevToolsCommand = { type: "resumeTracing" };
    expect(isDevToolsCommand(command)).toBe(true);
  });

  it("should return true for valid setThreshold command", () => {
    const command: DevToolsCommand = { type: "setThreshold", value: 150 };
    expect(isDevToolsCommand(command)).toBe(true);
  });

  it("should return true for valid clearTraces command", () => {
    const command: DevToolsCommand = { type: "clearTraces" };
    expect(isDevToolsCommand(command)).toBe(true);
  });

  it("should return false for null", () => {
    expect(isDevToolsCommand(null)).toBe(false);
  });

  it("should return false for undefined", () => {
    expect(isDevToolsCommand(undefined)).toBe(false);
  });

  it("should return false for invalid command type", () => {
    expect(isDevToolsCommand({ type: "invalidCommand" })).toBe(false);
  });

  it("should return false for missing required fields", () => {
    expect(isDevToolsCommand({ type: "selectTab" })).toBe(false);
    expect(isDevToolsCommand({ type: "setThreshold" })).toBe(false);
  });
});

// =============================================================================
// Event Type Guard Tests
// =============================================================================

describe("isDevToolsEvent", () => {
  it("should return true for valid tabChanged event", () => {
    const event: DevToolsEvent = { type: "tabChanged", tabId: "services" };
    expect(isDevToolsEvent(event)).toBe(true);
  });

  it("should return true for valid containersSelected event", () => {
    const event: DevToolsEvent = {
      type: "containersSelected",
      ids: new Set(["container-1", "container-2"]),
    };
    expect(isDevToolsEvent(event)).toBe(true);
  });

  it("should return true for valid tracingStateChanged event", () => {
    const event: DevToolsEvent = {
      type: "tracingStateChanged",
      enabled: true,
      paused: false,
    };
    expect(isDevToolsEvent(event)).toBe(true);
  });

  it("should return true for valid tracesCleared event", () => {
    const event: DevToolsEvent = { type: "tracesCleared" };
    expect(isDevToolsEvent(event)).toBe(true);
  });

  it("should return false for null", () => {
    expect(isDevToolsEvent(null)).toBe(false);
  });

  it("should return false for undefined", () => {
    expect(isDevToolsEvent(undefined)).toBe(false);
  });

  it("should return false for invalid event type", () => {
    expect(isDevToolsEvent({ type: "invalidEvent" })).toBe(false);
  });

  it("should return false for missing required fields", () => {
    expect(isDevToolsEvent({ type: "tabChanged" })).toBe(false);
    expect(isDevToolsEvent({ type: "tracingStateChanged", enabled: true })).toBe(false);
  });
});
