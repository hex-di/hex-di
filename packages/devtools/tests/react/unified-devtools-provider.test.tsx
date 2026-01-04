/**
 * Tests for Unified DevToolsProvider and Hooks
 *
 * Task Group 4: Tests for the unified DevToolsProvider that accepts DevToolsFlowRuntime
 * and the new hook API (useDevToolsRuntime, useDevToolsSelector, useDevToolsDispatch).
 *
 * These 8 focused tests verify:
 * 1. DevToolsProvider accepts DevToolsFlowRuntime as prop
 * 2. DevToolsProvider provides runtime via context
 * 3. useDevToolsRuntime() returns full DevToolsSnapshot via useSyncExternalStore
 * 4. useDevToolsSelector() with selector function
 * 5. useDevToolsSelector() memoization (ref-based)
 * 6. useDevToolsDispatch() returns stable dispatch function
 * 7. Hooks throw outside provider context
 * 8. Provider cleanup on unmount
 *
 * @packageDocumentation
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, act, renderHook } from "@testing-library/react";
import React, { type ReactNode } from "react";
import type { DevToolsSnapshot, DevToolsFlowEvent } from "../../src/runtime/devtools-snapshot.js";
import type { DevToolsUIContext, TabId, DevToolsPosition } from "@hex-di/devtools-core";
import type { TracingContext } from "@hex-di/devtools-core";
import type { ContainerTreeContext } from "@hex-di/devtools-core";

// =============================================================================
// Test Fixtures
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
 * Mock InspectorWithSubscription for testing.
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
 * Creates a mock DevToolsFlowRuntime for testing.
 */
function createMockFlowRuntime(initialSnapshot: DevToolsSnapshot = createMockSnapshot()): {
  subscribe: (callback: () => void) => () => void;
  getSnapshot: () => DevToolsSnapshot;
  dispatch: (event: DevToolsFlowEvent) => void;
  isDisposed: boolean;
  dispose: () => Promise<void>;
  getRootInspector: () => typeof mockInspector;
  getInspector: (containerId: string) => typeof mockInspector | null;
  getAncestorChain: (containerId: string) => readonly (typeof mockInspector)[];
  // Test helpers
  _setSnapshot: (snapshot: DevToolsSnapshot) => void;
  _notifyListeners: () => void;
} {
  let currentSnapshot = initialSnapshot;
  const listeners = new Set<() => void>();
  const dispatchMock = vi.fn<(event: DevToolsFlowEvent) => void>();
  let disposed = false;

  return {
    subscribe: callback => {
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
    // Test helpers
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
// Test Suite
// =============================================================================

describe("Unified DevToolsProvider and Hooks", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // Test 1: DevToolsProvider accepts DevToolsFlowRuntime as prop
  describe("Test 1: DevToolsProvider accepts DevToolsFlowRuntime as prop", () => {
    it("renders children when runtime prop is provided", async () => {
      const { DevToolsProvider } = await import("../../src/react/providers/devtools-provider.js");

      const mockRuntime = createMockFlowRuntime();

      render(
        React.createElement(
          DevToolsProvider,
          { runtime: mockRuntime },
          React.createElement("div", { "data-testid": "child" }, "Child content")
        )
      );

      expect(screen.getByTestId("child")).toBeDefined();
      expect(screen.getByTestId("child").textContent).toBe("Child content");
    });
  });

  // Test 2: DevToolsProvider provides runtime via context
  describe("Test 2: DevToolsProvider provides runtime via context", () => {
    it("provides runtime to child components via context", async () => {
      const { DevToolsProvider } = await import("../../src/react/providers/devtools-provider.js");
      const { useDevToolsRuntime } = await import("../../src/react/hooks/use-devtools-runtime.js");

      const mockRuntime = createMockFlowRuntime();

      function Consumer() {
        const snapshot = useDevToolsRuntime();
        return React.createElement("div", { "data-testid": "snapshot-state" }, snapshot.ui.state);
      }

      render(
        React.createElement(
          DevToolsProvider,
          { runtime: mockRuntime },
          React.createElement(Consumer)
        )
      );

      expect(screen.getByTestId("snapshot-state").textContent).toBe("closed");
    });
  });

  // Test 3: useDevToolsRuntime() returns full DevToolsSnapshot via useSyncExternalStore
  describe("Test 3: useDevToolsRuntime() returns full DevToolsSnapshot via useSyncExternalStore", () => {
    it("returns current snapshot and updates on state changes", async () => {
      const { DevToolsProvider } = await import("../../src/react/providers/devtools-provider.js");
      const { useDevToolsRuntime } = await import("../../src/react/hooks/use-devtools-runtime.js");

      const initialSnapshot = createMockSnapshot({
        ui: { state: "closed", context: createMockUIContext() },
      });
      const mockRuntime = createMockFlowRuntime(initialSnapshot);

      function Wrapper({ children }: { children: ReactNode }) {
        return React.createElement(DevToolsProvider, { runtime: mockRuntime }, children);
      }

      const { result } = renderHook(() => useDevToolsRuntime(), { wrapper: Wrapper });

      // Initial state
      expect(result.current.ui.state).toBe("closed");

      // Update snapshot and notify
      act(() => {
        mockRuntime._setSnapshot(
          createMockSnapshot({
            ui: { state: "open", context: createMockUIContext() },
          })
        );
        mockRuntime._notifyListeners();
      });

      // Should reflect new state
      expect(result.current.ui.state).toBe("open");
    });
  });

  // Test 4: useDevToolsSelector() with selector function
  describe("Test 4: useDevToolsSelector() with selector function", () => {
    it("returns selected slice of snapshot", async () => {
      const { DevToolsProvider } = await import("../../src/react/providers/devtools-provider.js");
      const { useDevToolsSelector } =
        await import("../../src/react/hooks/use-devtools-selector.js");

      const snapshot = createMockSnapshot({
        ui: {
          state: "open",
          context: createMockUIContext({ activeTab: "inspector" as TabId }),
        },
      });
      const mockRuntime = createMockFlowRuntime(snapshot);

      function Wrapper({ children }: { children: ReactNode }) {
        return React.createElement(DevToolsProvider, { runtime: mockRuntime }, children);
      }

      const selectActiveTab = (s: DevToolsSnapshot) => s.ui.context.activeTab;

      const { result } = renderHook(() => useDevToolsSelector(selectActiveTab), {
        wrapper: Wrapper,
      });

      expect(result.current).toBe("inspector");
    });
  });

  // Test 5: useDevToolsSelector() memoization (ref-based)
  describe("Test 5: useDevToolsSelector() memoization (ref-based)", () => {
    it("returns same reference when selected value is unchanged", async () => {
      const { DevToolsProvider } = await import("../../src/react/providers/devtools-provider.js");
      const { useDevToolsSelector } =
        await import("../../src/react/hooks/use-devtools-selector.js");

      const initialSnapshot = createMockSnapshot({
        ui: {
          state: "open",
          context: createMockUIContext({ activeTab: "graph" as TabId }),
        },
        tracing: {
          state: "disabled",
          context: createMockTracingContext(),
        },
      });
      const mockRuntime = createMockFlowRuntime(initialSnapshot);

      function Wrapper({ children }: { children: ReactNode }) {
        return React.createElement(DevToolsProvider, { runtime: mockRuntime }, children);
      }

      const selectActiveTab = (s: DevToolsSnapshot) => s.ui.context.activeTab;

      const { result, rerender } = renderHook(() => useDevToolsSelector(selectActiveTab), {
        wrapper: Wrapper,
      });

      const firstValue = result.current;

      // Change unrelated state (tracing state)
      act(() => {
        mockRuntime._setSnapshot(
          createMockSnapshot({
            ui: {
              state: "open",
              context: createMockUIContext({ activeTab: "graph" as TabId }), // Same activeTab
            },
            tracing: {
              state: "tracing", // Changed tracing state
              context: createMockTracingContext(),
            },
          })
        );
        mockRuntime._notifyListeners();
      });

      rerender();

      const secondValue = result.current;

      // For primitive values, Object.is will be used - the value should be the same
      expect(firstValue).toBe(secondValue);
    });

    it("updates when selected value changes", async () => {
      const { DevToolsProvider } = await import("../../src/react/providers/devtools-provider.js");
      const { useDevToolsSelector } =
        await import("../../src/react/hooks/use-devtools-selector.js");

      const initialSnapshot = createMockSnapshot({
        ui: {
          state: "open",
          context: createMockUIContext({ activeTab: "graph" as TabId }),
        },
      });
      const mockRuntime = createMockFlowRuntime(initialSnapshot);

      function Wrapper({ children }: { children: ReactNode }) {
        return React.createElement(DevToolsProvider, { runtime: mockRuntime }, children);
      }

      const selectActiveTab = (s: DevToolsSnapshot) => s.ui.context.activeTab;

      const { result } = renderHook(() => useDevToolsSelector(selectActiveTab), {
        wrapper: Wrapper,
      });

      expect(result.current).toBe("graph");

      // Change activeTab
      act(() => {
        mockRuntime._setSnapshot(
          createMockSnapshot({
            ui: {
              state: "open",
              context: createMockUIContext({ activeTab: "traces" as TabId }), // Changed activeTab
            },
          })
        );
        mockRuntime._notifyListeners();
      });

      expect(result.current).toBe("traces");
    });
  });

  // Test 6: useDevToolsDispatch() returns stable dispatch function
  describe("Test 6: useDevToolsDispatch() returns stable dispatch function", () => {
    it("returns referentially stable dispatch function across re-renders", async () => {
      const { DevToolsProvider } = await import("../../src/react/providers/devtools-provider.js");
      const { useDevToolsDispatch } =
        await import("../../src/react/hooks/use-devtools-dispatch.js");

      const mockRuntime = createMockFlowRuntime();

      function Wrapper({ children }: { children: ReactNode }) {
        return React.createElement(DevToolsProvider, { runtime: mockRuntime }, children);
      }

      const { result, rerender } = renderHook(() => useDevToolsDispatch(), {
        wrapper: Wrapper,
      });

      const dispatch1 = result.current;

      rerender();

      const dispatch2 = result.current;

      // Dispatch function should be referentially stable
      expect(dispatch1).toBe(dispatch2);
    });

    it("dispatches events to runtime", async () => {
      const { DevToolsProvider } = await import("../../src/react/providers/devtools-provider.js");
      const { useDevToolsDispatch } =
        await import("../../src/react/hooks/use-devtools-dispatch.js");

      const mockRuntime = createMockFlowRuntime();

      function Wrapper({ children }: { children: ReactNode }) {
        return React.createElement(DevToolsProvider, { runtime: mockRuntime }, children);
      }

      const { result } = renderHook(() => useDevToolsDispatch(), { wrapper: Wrapper });

      act(() => {
        result.current({ type: "UI.OPEN" });
      });

      expect(mockRuntime.dispatch).toHaveBeenCalledWith({ type: "UI.OPEN" });
    });
  });

  // Test 7: Hooks throw outside provider context
  describe("Test 7: Hooks throw outside provider context", () => {
    it("useDevToolsRuntime throws with helpful error outside provider", async () => {
      const { useDevToolsRuntime } = await import("../../src/react/hooks/use-devtools-runtime.js");

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useDevToolsRuntime());
      }).toThrow("DevToolsStoreProvider");

      consoleSpy.mockRestore();
    });

    it("useDevToolsSelector throws with helpful error outside provider", async () => {
      const { useDevToolsSelector } =
        await import("../../src/react/hooks/use-devtools-selector.js");

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useDevToolsSelector(s => s.ui.state));
      }).toThrow("DevToolsStoreProvider");

      consoleSpy.mockRestore();
    });

    it("useDevToolsDispatch throws with helpful error outside provider", async () => {
      const { useDevToolsDispatch } =
        await import("../../src/react/hooks/use-devtools-dispatch.js");

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useDevToolsDispatch());
      }).toThrow("DevToolsStoreProvider");

      consoleSpy.mockRestore();
    });
  });

  // Test 8: Provider cleanup on unmount
  describe("Test 8: Provider cleanup on unmount", () => {
    it("unsubscribes from runtime on unmount", async () => {
      const { DevToolsProvider } = await import("../../src/react/providers/devtools-provider.js");
      const { useDevToolsRuntime } = await import("../../src/react/hooks/use-devtools-runtime.js");

      const mockRuntime = createMockFlowRuntime();
      let subscribeCallCount = 0;
      let unsubscribeCallCount = 0;

      const originalSubscribe = mockRuntime.subscribe.bind(mockRuntime);
      const trackedRuntime = {
        ...mockRuntime,
        subscribe: (callback: () => void) => {
          subscribeCallCount++;
          const unsubscribe = originalSubscribe(callback);
          return () => {
            unsubscribeCallCount++;
            unsubscribe();
          };
        },
      };

      function Wrapper({ children }: { children: ReactNode }) {
        return React.createElement(DevToolsProvider, { runtime: trackedRuntime }, children);
      }

      const { unmount } = renderHook(() => useDevToolsRuntime(), { wrapper: Wrapper });

      expect(subscribeCallCount).toBe(1);

      unmount();

      expect(unsubscribeCallCount).toBe(1);
    });
  });
});
