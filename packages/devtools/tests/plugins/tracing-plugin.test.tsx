/**
 * Tests for TracingPlugin
 *
 * These tests verify:
 * 1. Plugin renders tracing section
 * 2. Timeline/tree/summary sub-views
 * 3. Pause/resume via runtime commands
 * 4. Threshold control
 */

import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import type { TracingAPI, TraceEntry, TraceStats } from "@hex-di/core";
import { TracingPlugin } from "../../src/plugins/tracing-plugin.js";
import { TracingPluginContent } from "../../src/plugins/tracing/tracing-content.js";
import type {
  PluginProps,
  PluginRuntimeAccess,
  PluginStateSnapshot,
} from "../../src/react/types/plugin-types.js";

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Create a mock state for testing.
 */
function createMockState(overrides: Partial<PluginStateSnapshot> = {}): PluginStateSnapshot {
  return {
    activeTabId: "tracing",
    selectedContainerIds: new Set<string>(),
    tracingEnabled: true,
    tracingPaused: false,
    tracingThreshold: 50,
    plugins: [],
    ...overrides,
  };
}

/**
 * Create a mock runtime for testing.
 */
function createMockRuntime(): PluginRuntimeAccess {
  return {
    dispatch: vi.fn(),
  };
}

/**
 * Create a mock trace entry.
 */
function createMockTraceEntry(
  id: string,
  portName: string,
  duration: number,
  options: Partial<Omit<TraceEntry, "id" | "portName" | "duration">> = {}
): TraceEntry {
  return {
    id,
    portName,
    duration,
    startTime: Date.now(),
    lifetime: "singleton",
    isCacheHit: false,
    isPinned: false,
    order: 0,
    parentId: null,
    childIds: [],
    scopeId: null,
    ...options,
  };
}

/**
 * Create a mock TraceStats object.
 */
function createMockTraceStats(overrides: Partial<TraceStats> = {}): TraceStats {
  return {
    totalResolutions: 0,
    averageDuration: 0,
    cacheHitRate: 0,
    slowCount: 0,
    sessionStart: Date.now(),
    totalDuration: 0,
    ...overrides,
  };
}

/**
 * Create a mock TracingAPI for testing.
 */
function createMockTracingAPI(traces: readonly TraceEntry[] = [], isPaused = false): TracingAPI {
  let paused = isPaused;
  const subscribers: Array<(entry: TraceEntry) => void> = [];

  return {
    getTraces: () => traces,
    getStats: () =>
      createMockTraceStats({
        totalResolutions: traces.length,
        averageDuration:
          traces.length > 0 ? traces.reduce((sum, t) => sum + t.duration, 0) / traces.length : 0,
        totalDuration: traces.reduce((sum, t) => sum + t.duration, 0),
      }),
    subscribe: (callback: (entry: TraceEntry) => void) => {
      subscribers.push(callback);
      return () => {
        const index = subscribers.indexOf(callback);
        if (index > -1) {
          subscribers.splice(index, 1);
        }
      };
    },
    clear: vi.fn(() => {
      // Note: We don't need to notify subscribers on clear
      // since the component will re-fetch traces after calling clear
    }),
    pause: vi.fn(() => {
      paused = true;
    }),
    resume: vi.fn(() => {
      paused = false;
    }),
    isPaused: () => paused,
    pin: vi.fn(),
    unpin: vi.fn(),
  };
}

/**
 * Create mock PluginProps for testing.
 */
function createMockPluginProps(overrides: Partial<PluginProps> = {}): PluginProps {
  return {
    runtime: createMockRuntime(),
    state: createMockState(),
    graph: { nodes: [], edges: [] },
    containers: [],
    containerScopeTree: null,
    ...overrides,
  };
}

// =============================================================================
// TracingPlugin Factory Tests
// =============================================================================

describe("TracingPlugin", () => {
  describe("plugin factory", () => {
    it("should create a plugin with id 'tracing'", () => {
      const plugin = TracingPlugin();

      expect(plugin.id).toBe("tracing");
    });

    it("should create a plugin with label 'Tracing'", () => {
      const plugin = TracingPlugin();

      expect(plugin.label).toBe("Tracing");
    });

    it("should include a keyboard shortcut 't' to focus tracing tab", () => {
      const plugin = TracingPlugin();

      expect(plugin.shortcuts).toBeDefined();
      expect(plugin.shortcuts).toHaveLength(1);

      const shortcut = plugin.shortcuts?.[0];
      expect(shortcut?.key).toBe("t");
      expect(shortcut?.description).toContain("tracing");
    });

    it("should have a component defined", () => {
      const plugin = TracingPlugin();

      expect(plugin.component).toBeDefined();
      expect(typeof plugin.component).toBe("function");
    });

    it("should return a frozen plugin object", () => {
      const plugin = TracingPlugin();

      expect(Object.isFrozen(plugin)).toBe(true);
    });
  });
});

// =============================================================================
// TracingPluginContent Rendering Tests
// =============================================================================

describe("TracingPluginContent", () => {
  afterEach(() => {
    cleanup();
  });

  describe("basic rendering", () => {
    it("should render without errors", () => {
      const props = createMockPluginProps();

      expect(() => render(<TracingPluginContent {...props} />)).not.toThrow();
    });

    it("should render the tracing section container", () => {
      const props = createMockPluginProps();

      render(<TracingPluginContent {...props} />);

      const container = screen.getByTestId("tab-content-tracing");
      expect(container).toBeDefined();
    });
  });

  describe("sub-view tabs (timeline/tree/summary)", () => {
    it("should render view toggle tabs", () => {
      const tracingAPI = createMockTracingAPI([createMockTraceEntry("1", "ServiceA", 10)]);
      const props = createMockPluginProps({ tracingAPI });

      render(<TracingPluginContent {...props} />);

      const tabsContainer = screen.getByTestId("tracing-view-tabs");
      expect(tabsContainer).toBeDefined();
    });

    it("should render timeline view by default", () => {
      const tracingAPI = createMockTracingAPI([createMockTraceEntry("1", "ServiceA", 10)]);
      const props = createMockPluginProps({ tracingAPI });

      render(<TracingPluginContent {...props} />);

      // Timeline tab should be selected (aria-selected="true")
      const timelineTab = screen.getByRole("tab", { name: /timeline/i });
      expect(timelineTab.getAttribute("aria-selected")).toBe("true");
    });

    it("should switch to tree view when tree tab is clicked", () => {
      const tracingAPI = createMockTracingAPI([createMockTraceEntry("1", "ServiceA", 10)]);
      const props = createMockPluginProps({ tracingAPI });

      render(<TracingPluginContent {...props} />);

      const treeTab = screen.getByRole("tab", { name: /tree/i });
      fireEvent.click(treeTab);

      expect(treeTab.getAttribute("aria-selected")).toBe("true");
    });

    it("should switch to summary view when summary tab is clicked", () => {
      const tracingAPI = createMockTracingAPI([createMockTraceEntry("1", "ServiceA", 10)]);
      const props = createMockPluginProps({ tracingAPI });

      render(<TracingPluginContent {...props} />);

      const summaryTab = screen.getByRole("tab", { name: /summary/i });
      fireEvent.click(summaryTab);

      expect(summaryTab.getAttribute("aria-selected")).toBe("true");
    });
  });

  describe("pause/resume via runtime commands", () => {
    it("should dispatch pauseTracing command when pause button is clicked", () => {
      const runtime = createMockRuntime();
      const state = createMockState({ tracingPaused: false });
      const tracingAPI = createMockTracingAPI([createMockTraceEntry("1", "ServiceA", 10)], false);
      const props = createMockPluginProps({
        runtime,
        state,
        tracingAPI,
      });

      render(<TracingPluginContent {...props} />);

      const pauseButton = screen.getByTestId("tracing-pause-toggle");
      expect(pauseButton).toBeDefined();
      expect(pauseButton.textContent).toBe("Pause");

      fireEvent.click(pauseButton);

      expect(runtime.dispatch).toHaveBeenCalledWith({ type: "pauseTracing" });
    });

    it("should dispatch resumeTracing command when resume button is clicked", () => {
      const runtime = createMockRuntime();
      const state = createMockState({ tracingPaused: true });
      const tracingAPI = createMockTracingAPI([createMockTraceEntry("1", "ServiceA", 10)], true);
      const props = createMockPluginProps({
        runtime,
        state,
        tracingAPI,
      });

      render(<TracingPluginContent {...props} />);

      const resumeButton = screen.getByTestId("tracing-pause-toggle");
      expect(resumeButton.textContent).toBe("Resume");

      fireEvent.click(resumeButton);

      expect(runtime.dispatch).toHaveBeenCalledWith({ type: "resumeTracing" });
    });

    it("should dispatch clearTraces command when clear all button is clicked", () => {
      const runtime = createMockRuntime();
      const state = createMockState();
      const tracingAPI = createMockTracingAPI([createMockTraceEntry("1", "ServiceA", 10)]);
      const props = createMockPluginProps({
        runtime,
        state,
        tracingAPI,
      });

      render(<TracingPluginContent {...props} />);

      const clearButton = screen.getByTestId("tracing-clear-all");
      fireEvent.click(clearButton);

      expect(runtime.dispatch).toHaveBeenCalledWith({ type: "clearTraces" });
    });
  });

  describe("threshold control", () => {
    it("should render threshold slider", () => {
      const tracingAPI = createMockTracingAPI([createMockTraceEntry("1", "ServiceA", 10)]);
      const props = createMockPluginProps({ tracingAPI });

      render(<TracingPluginContent {...props} />);

      const thresholdSlider = screen.getByTestId("tracing-threshold-slider");
      expect(thresholdSlider).toBeDefined();
    });

    it("should display current threshold value from runtime state", () => {
      const state = createMockState({ tracingThreshold: 75 });
      const tracingAPI = createMockTracingAPI([createMockTraceEntry("1", "ServiceA", 10)]);
      const props = createMockPluginProps({
        state,
        tracingAPI,
      });

      render(<TracingPluginContent {...props} />);

      const thresholdLabel = screen.getByTestId("tracing-threshold-label");
      expect(thresholdLabel.textContent).toContain("75");
    });

    it("should dispatch setThreshold command when slider value changes", () => {
      const runtime = createMockRuntime();
      const state = createMockState({ tracingThreshold: 50 });
      const tracingAPI = createMockTracingAPI([createMockTraceEntry("1", "ServiceA", 10)]);
      const props = createMockPluginProps({
        runtime,
        state,
        tracingAPI,
      });

      render(<TracingPluginContent {...props} />);

      const thresholdSlider = screen.getByTestId("tracing-threshold-slider");
      fireEvent.change(thresholdSlider, { target: { value: "100" } });

      expect(runtime.dispatch).toHaveBeenCalledWith({
        type: "setThreshold",
        value: 100,
      });
    });
  });

  describe("recording indicator", () => {
    it("should show recording indicator when not paused", () => {
      const state = createMockState({ tracingPaused: false });
      const tracingAPI = createMockTracingAPI([createMockTraceEntry("1", "ServiceA", 10)], false);
      const props = createMockPluginProps({
        state,
        tracingAPI,
      });

      render(<TracingPluginContent {...props} />);

      const indicator = screen.getByTestId("tracing-recording-indicator");
      expect(indicator.textContent).toContain("Recording");
    });

    it("should show paused indicator when paused", () => {
      const state = createMockState({ tracingPaused: true });
      const tracingAPI = createMockTracingAPI([createMockTraceEntry("1", "ServiceA", 10)], true);
      const props = createMockPluginProps({
        state,
        tracingAPI,
      });

      render(<TracingPluginContent {...props} />);

      const indicator = screen.getByTestId("tracing-recording-indicator");
      expect(indicator.textContent).toContain("Paused");
    });
  });

  describe("empty state", () => {
    it("should show empty state when no traces and no tracingAPI", () => {
      const props = createMockPluginProps();

      render(<TracingPluginContent {...props} />);

      const emptyState = screen.getByTestId("tracing-empty-state");
      expect(emptyState).toBeDefined();
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("TracingPlugin Integration", () => {
  afterEach(() => {
    cleanup();
  });

  it("should be usable as a DevToolsPlugin", () => {
    const plugin = TracingPlugin();

    // Verify it satisfies the DevToolsPlugin interface
    expect(plugin).toHaveProperty("id");
    expect(plugin).toHaveProperty("label");
    expect(plugin).toHaveProperty("component");

    // Component should be renderable with PluginProps
    const Component = plugin.component;
    const props = createMockPluginProps();

    expect(() => render(<Component {...props} />)).not.toThrow();
  });

  it("should render all tracing controls and views", () => {
    const tracingAPI = createMockTracingAPI([
      createMockTraceEntry("1", "ServiceA", 10),
      createMockTraceEntry("2", "ServiceB", 25),
      createMockTraceEntry("3", "ServiceC", 60),
    ]);
    const props = createMockPluginProps({ tracingAPI });

    render(<TracingPluginContent {...props} />);

    // Verify all key UI elements are present
    expect(screen.getByTestId("tracing-view-tabs")).toBeDefined();
    expect(screen.getByTestId("tracing-controls-bar")).toBeDefined();
    expect(screen.getByTestId("tracing-pause-toggle")).toBeDefined();
    expect(screen.getByTestId("tracing-threshold-slider")).toBeDefined();
    expect(screen.getByTestId("tracing-clear-all")).toBeDefined();
  });

  it("should use runtime state for tracing paused status", () => {
    const state = createMockState({ tracingPaused: true });
    const tracingAPI = createMockTracingAPI([createMockTraceEntry("1", "ServiceA", 10)], true);
    const props = createMockPluginProps({
      state,
      tracingAPI,
    });

    render(<TracingPluginContent {...props} />);

    // The pause toggle should show "Resume" when paused
    const pauseToggle = screen.getByTestId("tracing-pause-toggle");
    expect(pauseToggle.textContent).toBe("Resume");
  });

  it("should use runtime state for threshold value", () => {
    const state = createMockState({ tracingThreshold: 200 });
    const tracingAPI = createMockTracingAPI([createMockTraceEntry("1", "ServiceA", 10)]);
    const props = createMockPluginProps({
      state,
      tracingAPI,
    });

    render(<TracingPluginContent {...props} />);

    // The threshold label should display the value from runtime state
    const thresholdLabel = screen.getByTestId("tracing-threshold-label");
    expect(thresholdLabel.textContent).toContain("200");
  });
});
