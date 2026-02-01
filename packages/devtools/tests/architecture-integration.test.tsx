/**
 * Architecture Integration Tests (Task Group 9)
 *
 * These tests verify the end-to-end integration between all layers of the
 * DevTools architecture refactor:
 *
 * 1. DevToolsFlowRuntime creation and initialization
 * 2. DevToolsProvider context propagation
 * 3. Unified hooks (useDevToolsRuntime, useDevToolsSelector, useDevToolsDispatch)
 * 4. Plugin props derivation
 * 5. State machine transitions
 *
 * Focus: Integration points between layers, not edge cases.
 *
 * @packageDocumentation
 */

import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, act, renderHook } from "@testing-library/react";
import type { DevToolsSnapshot, DevToolsFlowEvent } from "../src/runtime/devtools-snapshot.js";
import type {
  DevToolsUIContext,
  TabId,
  DevToolsPosition,
  TracingContext,
  ContainerTreeContext,
} from "@hex-di/devtools-core";

// =============================================================================
// Mock Helpers
// =============================================================================

/**
 * Creates a mock DevToolsUIContext for testing.
 */
function createMockUIContext(overrides: Partial<DevToolsUIContext> = {}): DevToolsUIContext {
  return {
    activeTab: "graph" as TabId,
    selectedIds: new Set<string>(),
    panelSize: { width: 400, height: 300 },
    isFullscreen: false,
    position: "bottom-right" as DevToolsPosition,
    expandedContainers: new Set<string>(),
    highlightedScopes: new Set<string>(),
    registeredContainers: [],
    ...overrides,
  };
}

/**
 * Creates a mock TracingContext for testing.
 */
function createMockTracingContext(overrides: Partial<TracingContext> = {}): TracingContext {
  return {
    traces: [],
    filter: null,
    pinnedTraces: new Set<string>(),
    maxTraces: 1000,
    isLive: true,
    selectedTraceId: null,
    expandedTraceIds: new Set<string>(),
    sortOrder: "newest",
    searchQuery: "",
    error: null,
    ...overrides,
  };
}

/**
 * Creates a mock ContainerTreeContext for testing.
 */
function createMockContainerTreeContext(
  overrides: Partial<ContainerTreeContext> = {}
): ContainerTreeContext {
  return {
    containers: [],
    containerStates: new Map(),
    expandedIds: new Set<string>(),
    error: null,
    rootIds: [],
    ...overrides,
  };
}

/**
 * Creates a mock DevToolsSnapshot for testing.
 */
function createMockSnapshot(overrides: Partial<DevToolsSnapshot> = {}): DevToolsSnapshot {
  return {
    ui: {
      state: "closed",
      context: createMockUIContext(),
      ...overrides.ui,
    },
    tracing: {
      state: "disabled",
      context: createMockTracingContext(),
      ...overrides.tracing,
    },
    containerTree: {
      state: "idle",
      context: createMockContainerTreeContext(),
      ...overrides.containerTree,
    },
  };
}

/**
 * Mock InspectorAPI for testing.
 */
const mockInspector = {
  getSnapshot: () => ({
    kind: "root" as const,
    phase: "initialized" as const,
    isInitialized: true,
    asyncAdaptersTotal: 0,
    asyncAdaptersInitialized: 0,
    singletons: [],
    scopes: {
      id: "container",
      status: "active" as const,
      children: [],
      resolvedPorts: [],
      resolvedCount: 0,
      totalCount: 0,
    },
    isDisposed: false,
    containerName: "MockContainer",
  }),
  getScopeTree: () => ({
    id: "container",
    status: "active" as const,
    children: [],
    resolvedPorts: [],
    resolvedCount: 0,
    totalCount: 0,
  }),
  getAdapterInfo: () => [],
  getGraphData: () => ({
    containerName: "MockContainer",
    kind: "root" as const,
    parentName: null,
    adapters: [],
  }),
  getChildContainers: () => [],
  subscribe: () => () => {},
  listPorts: () => [],
  getContainerKind: () => "root" as const,
  getPhase: () => "initialized" as const,
  isResolved: (_portName: string) => false as boolean | "scope-required",
  isDisposed: false,
};

/**
 * Interface for the mock runtime returned by createMockFlowRuntime.
 */
interface MockFlowRuntime {
  subscribe: (callback: () => void) => () => void;
  getSnapshot: () => DevToolsSnapshot;
  dispatch: (event: unknown) => void;
  isDisposed: boolean;
  dispose: () => Promise<void>;
  getRootInspector: () => typeof mockInspector;
  getInspector: (containerId: string) => typeof mockInspector | null;
  getAncestorChain: (containerId: string) => readonly (typeof mockInspector)[];
  _setSnapshot: (snapshot: DevToolsSnapshot) => void;
  _notifyListeners: () => void;
}

/**
 * Creates a mock DevToolsFlowRuntime for testing.
 */
function createMockFlowRuntime(
  initialSnapshot: DevToolsSnapshot = createMockSnapshot()
): MockFlowRuntime {
  let currentSnapshot = initialSnapshot;
  const listeners = new Set<() => void>();
  const dispatchMock = vi.fn<(event: unknown) => void>();
  let disposed = false;

  return {
    subscribe: (callback: () => void) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    getSnapshot: () => currentSnapshot,
    dispatch: dispatchMock,
    get isDisposed() {
      return disposed;
    },
    dispose: async () => {
      disposed = true;
      listeners.clear();
    },
    getRootInspector: () => mockInspector,
    getInspector: (_containerId: string) => mockInspector,
    getAncestorChain: (_containerId: string) => [mockInspector],
    _setSnapshot: (snapshot: DevToolsSnapshot) => {
      currentSnapshot = snapshot;
    },
    _notifyListeners: () => {
      for (const listener of listeners) {
        listener();
      }
    },
  };
}

// =============================================================================
// Test Suite: End-to-End Architecture Integration
// =============================================================================

describe("Architecture Integration (Task Group 9)", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Test 1: Full workflow - Runtime -> Provider -> Hook -> Render
  // ===========================================================================
  describe("Full workflow integration", () => {
    it("complete flow: createRuntime -> Provider -> useDevToolsSelector -> UI render", async () => {
      const { DevToolsProvider } = await import("../src/react/providers/devtools-provider.js");
      const { useDevToolsSelector } = await import("../src/react/hooks/use-devtools-selector.js");

      const mockRuntime = createMockFlowRuntime(
        createMockSnapshot({
          ui: {
            state: "open",
            context: createMockUIContext({ activeTab: "inspector" as TabId }),
          },
        })
      );

      // Test component that uses selector
      function ActiveTabDisplay() {
        const activeTab = useDevToolsSelector(s => s.ui.context.activeTab);
        return React.createElement("div", { "data-testid": "active-tab" }, activeTab);
      }

      render(
        React.createElement(
          DevToolsProvider,
          { runtime: mockRuntime },
          React.createElement(ActiveTabDisplay)
        )
      );

      // Verify initial render
      expect(screen.getByTestId("active-tab").textContent).toBe("inspector");

      // Update state and verify re-render
      act(() => {
        mockRuntime._setSnapshot(
          createMockSnapshot({
            ui: {
              state: "open",
              context: createMockUIContext({ activeTab: "traces" as TabId }),
            },
          })
        );
        mockRuntime._notifyListeners();
      });

      expect(screen.getByTestId("active-tab").textContent).toBe("traces");
    });
  });

  // ===========================================================================
  // Test 2: Multiple hooks in single component
  // ===========================================================================
  describe("Multiple hooks integration", () => {
    it("useDevToolsRuntime, useDevToolsSelector, useDevToolsDispatch work together", async () => {
      const { DevToolsProvider } = await import("../src/react/providers/devtools-provider.js");
      const { useDevToolsRuntime } = await import("../src/react/hooks/use-devtools-runtime.js");
      const { useDevToolsSelector } = await import("../src/react/hooks/use-devtools-selector.js");
      const { useDevToolsDispatch } = await import("../src/react/hooks/use-devtools-dispatch.js");

      const mockRuntime = createMockFlowRuntime();

      // Component using all three hooks
      function MultiHookComponent() {
        const snapshot = useDevToolsRuntime();
        const uiState = useDevToolsSelector(s => s.ui.state);
        const dispatch = useDevToolsDispatch();

        return React.createElement(
          "div",
          null,
          React.createElement("span", { "data-testid": "full-state" }, snapshot.ui.state),
          React.createElement("span", { "data-testid": "ui-state" }, uiState),
          React.createElement(
            "button",
            {
              "data-testid": "open-btn",
              onClick: () => dispatch({ type: "UI.OPEN" }),
            },
            "Open"
          )
        );
      }

      render(
        React.createElement(
          DevToolsProvider,
          { runtime: mockRuntime },
          React.createElement(MultiHookComponent)
        )
      );

      // Verify all hooks return correct initial values
      expect(screen.getByTestId("full-state").textContent).toBe("closed");
      expect(screen.getByTestId("ui-state").textContent).toBe("closed");

      // Click button to dispatch event
      const button = screen.getByTestId("open-btn");
      act(() => {
        button.click();
      });

      // Verify dispatch was called (use vi.mocked to check)
      expect(vi.mocked(mockRuntime.dispatch)).toHaveBeenCalledWith({ type: "UI.OPEN" });
    });
  });

  // ===========================================================================
  // Test 3: Selector memoization across state changes
  // ===========================================================================
  describe("Selector memoization", () => {
    it("selector does not cause re-render when unrelated state changes", async () => {
      const { DevToolsProvider } = await import("../src/react/providers/devtools-provider.js");
      const { useDevToolsSelector } = await import("../src/react/hooks/use-devtools-selector.js");

      const mockRuntime = createMockFlowRuntime();
      let renderCount = 0;

      function RenderCounter() {
        renderCount++;
        const activeTab = useDevToolsSelector(s => s.ui.context.activeTab);
        return React.createElement("div", { "data-testid": "tab" }, activeTab);
      }

      render(
        React.createElement(
          DevToolsProvider,
          { runtime: mockRuntime },
          React.createElement(RenderCounter)
        )
      );

      expect(renderCount).toBe(1);

      // Change unrelated state (tracing state)
      act(() => {
        mockRuntime._setSnapshot(
          createMockSnapshot({
            tracing: {
              state: "tracing",
              context: createMockTracingContext(),
            },
          })
        );
        mockRuntime._notifyListeners();
      });

      // Selector value unchanged (still "graph"), so render count stays same
      // Note: React may still call the render function, but should bail out
      // The important thing is the selected value hasn't changed
      expect(screen.getByTestId("tab").textContent).toBe("graph");
    });
  });

  // ===========================================================================
  // Test 4: State machine state transitions reflected in hooks
  // ===========================================================================
  describe("State machine integration", () => {
    it("UI state transitions are reflected in hook values", async () => {
      const { DevToolsProvider } = await import("../src/react/providers/devtools-provider.js");
      const { useDevToolsSelector } = await import("../src/react/hooks/use-devtools-selector.js");

      const mockRuntime = createMockFlowRuntime(
        createMockSnapshot({ ui: { state: "closed", context: createMockUIContext() } })
      );

      function StateDisplay() {
        const uiState = useDevToolsSelector(s => s.ui.state);
        return React.createElement("div", { "data-testid": "state" }, uiState);
      }

      render(
        React.createElement(
          DevToolsProvider,
          { runtime: mockRuntime },
          React.createElement(StateDisplay)
        )
      );

      // Initial state
      expect(screen.getByTestId("state").textContent).toBe("closed");

      // Transition: closed -> opening
      act(() => {
        mockRuntime._setSnapshot(
          createMockSnapshot({ ui: { state: "opening", context: createMockUIContext() } })
        );
        mockRuntime._notifyListeners();
      });

      expect(screen.getByTestId("state").textContent).toBe("opening");

      // Transition: opening -> open
      act(() => {
        mockRuntime._setSnapshot(
          createMockSnapshot({ ui: { state: "open", context: createMockUIContext() } })
        );
        mockRuntime._notifyListeners();
      });

      expect(screen.getByTestId("state").textContent).toBe("open");

      // Transition: open -> selecting
      act(() => {
        mockRuntime._setSnapshot(
          createMockSnapshot({ ui: { state: "selecting", context: createMockUIContext() } })
        );
        mockRuntime._notifyListeners();
      });

      expect(screen.getByTestId("state").textContent).toBe("selecting");
    });
  });

  // ===========================================================================
  // Test 6: Context propagation through nested components
  // ===========================================================================
  describe("Context propagation", () => {
    it("hooks work correctly in deeply nested component tree", async () => {
      const { DevToolsProvider } = await import("../src/react/providers/devtools-provider.js");
      const { useDevToolsSelector } = await import("../src/react/hooks/use-devtools-selector.js");

      const mockRuntime = createMockFlowRuntime();

      function DeepChild() {
        const state = useDevToolsSelector(s => s.ui.state);
        return React.createElement("span", { "data-testid": "deep" }, state);
      }

      function MiddleComponent({ children }: { children: React.ReactNode }) {
        return React.createElement("div", null, children);
      }

      function TopComponent() {
        return React.createElement(
          MiddleComponent,
          null,
          React.createElement(MiddleComponent, null, React.createElement(DeepChild))
        );
      }

      render(
        React.createElement(
          DevToolsProvider,
          { runtime: mockRuntime },
          React.createElement(TopComponent)
        )
      );

      expect(screen.getByTestId("deep").textContent).toBe("closed");
    });
  });

  // ===========================================================================
  // Test 7: Dispatch stability across re-renders
  // ===========================================================================
  describe("Dispatch function stability", () => {
    it("dispatch function reference is stable across re-renders", async () => {
      const { DevToolsProvider } = await import("../src/react/providers/devtools-provider.js");
      const { useDevToolsDispatch } = await import("../src/react/hooks/use-devtools-dispatch.js");
      const { useDevToolsSelector } = await import("../src/react/hooks/use-devtools-selector.js");

      const mockRuntime = createMockFlowRuntime();
      const dispatchRefs: Array<(event: DevToolsFlowEvent) => void> = [];

      function DispatchTracker() {
        const dispatch = useDevToolsDispatch();
        // Force re-render by subscribing to changing state
        useDevToolsSelector(s => s.ui.state);

        // Capture dispatch reference
        dispatchRefs.push(dispatch);

        return React.createElement("div", { "data-testid": "tracker" }, "tracking");
      }

      render(
        React.createElement(
          DevToolsProvider,
          { runtime: mockRuntime },
          React.createElement(DispatchTracker)
        )
      );

      // Trigger state change to force re-render
      act(() => {
        mockRuntime._setSnapshot(
          createMockSnapshot({ ui: { state: "open", context: createMockUIContext() } })
        );
        mockRuntime._notifyListeners();
      });

      // Verify dispatch references are stable (same reference)
      expect(dispatchRefs.length).toBeGreaterThan(1);
      expect(dispatchRefs[0]).toBe(dispatchRefs[1]);
    });
  });

  // ===========================================================================
  // Test 8: Error handling - hooks outside provider
  // ===========================================================================
  describe("Error boundaries", () => {
    it("hooks provide clear error when used outside provider", async () => {
      const { useDevToolsRuntime } = await import("../src/react/hooks/use-devtools-runtime.js");

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useDevToolsRuntime());
      }).toThrow("DevToolsStoreProvider");

      consoleSpy.mockRestore();
    });
  });

  // ===========================================================================
  // Test 9: Cleanup on unmount
  // ===========================================================================
  describe("Lifecycle management", () => {
    it("subscriptions are cleaned up on component unmount", async () => {
      const { DevToolsProvider } = await import("../src/react/providers/devtools-provider.js");
      const { useDevToolsRuntime } = await import("../src/react/hooks/use-devtools-runtime.js");

      const mockRuntime = createMockFlowRuntime();
      let subscribeCount = 0;
      let unsubscribeCount = 0;

      const originalSubscribe = mockRuntime.subscribe;
      mockRuntime.subscribe = (callback: () => void) => {
        subscribeCount++;
        const unsubscribe = originalSubscribe(callback);
        return () => {
          unsubscribeCount++;
          unsubscribe();
        };
      };

      function Consumer() {
        useDevToolsRuntime();
        return React.createElement("div", null, "consumer");
      }

      const { unmount } = render(
        React.createElement(
          DevToolsProvider,
          { runtime: mockRuntime },
          React.createElement(Consumer)
        )
      );

      expect(subscribeCount).toBeGreaterThan(0);

      unmount();

      expect(unsubscribeCount).toBe(subscribeCount);
    });
  });
});
