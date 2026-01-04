/**
 * Tests for Task Group 6: Obsolete Code Deletion
 *
 * These 2 focused tests verify that the new architecture works correctly
 * after the old provider, runtime, hook, and context files have been deleted.
 *
 * Test 1: DevToolsProvider initializes correctly without old providers
 *   - Verifies DevToolsProvider works standalone without DevToolsFlowProvider
 *   - Verifies DevToolsProvider works without DevToolsContainerProvider
 *   - Confirms no dependency on deleted provider code
 *
 * Test 2: Hooks work correctly without old runtime files
 *   - Verifies useDevToolsRuntime works without old create-runtime-with-containers
 *   - Verifies useDevToolsSelector works without old ring-buffer, event-aggregator
 *   - Verifies useDevToolsDispatch works without old container-lifecycle-manager
 *   - Confirms no dependency on deleted runtime code
 *
 * @packageDocumentation
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, renderHook, act } from "@testing-library/react";
import React, { type ReactNode } from "react";
import type { DevToolsSnapshot, DevToolsFlowEvent } from "../../src/runtime/devtools-snapshot.js";
import type { DevToolsUIContext, TabId, DevToolsPosition } from "@hex-di/devtools-core";
import type { TracingContext } from "@hex-di/devtools-core";
import type { ContainerTreeContext } from "@hex-di/devtools-core";

// =============================================================================
// Test Fixtures (Minimal Mock Runtime)
// =============================================================================

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
 * Creates a minimal mock DevToolsFlowRuntime for testing.
 *
 * This mock represents only the new unified runtime API without any
 * dependency on the old runtime files (create-runtime-with-containers,
 * container-lifecycle-manager, ring-buffer, event-aggregator, etc.)
 */
function createMinimalMockRuntime(): {
  subscribe: (callback: () => void) => () => void;
  getSnapshot: () => DevToolsSnapshot;
  dispatch: (event: DevToolsFlowEvent) => void;
  isDisposed: boolean;
  getRootInspector: () => typeof mockInspector;
  getInspector: (containerId: string) => typeof mockInspector | null;
  getAncestorChain: (containerId: string) => readonly (typeof mockInspector)[];
  // Test helpers
  _setSnapshot: (snapshot: DevToolsSnapshot) => void;
  _notifyListeners: () => void;
} {
  const mockUIContext: DevToolsUIContext = {
    activeTab: "graph" as TabId,
    selectedIds: new Set<string>(),
    panelSize: { width: 400, height: 300 },
    isFullscreen: false,
    position: "bottom-right" as DevToolsPosition,
    expandedContainers: new Set<string>(),
    highlightedScopes: new Set<string>(),
    registeredContainers: [],
  };

  const mockTracingContext: TracingContext = {
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
  };

  const mockContainerTreeContext: ContainerTreeContext = {
    containers: [],
    containerStates: new Map(),
    expandedIds: new Set<string>(),
    error: null,
    rootIds: [],
  };

  let currentSnapshot: DevToolsSnapshot = {
    ui: { state: "closed", context: mockUIContext },
    tracing: { state: "disabled", context: mockTracingContext },
    containerTree: { state: "idle", context: mockContainerTreeContext },
  };

  const listeners = new Set<() => void>();
  const dispatchMock = vi.fn<(event: DevToolsFlowEvent) => void>();

  return {
    subscribe: callback => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    getSnapshot: () => currentSnapshot,
    dispatch: dispatchMock,
    isDisposed: false,
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
// Test Suite
// =============================================================================

describe("Task Group 6: Obsolete Code Deletion Verification", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Test 1: DevToolsProvider initializes correctly without old providers
  // =========================================================================
  describe("Test 1: DevToolsProvider initializes correctly without old providers", () => {
    it("DevToolsProvider works without any dependency on DevToolsFlowProvider or DevToolsContainerProvider", async () => {
      // Import ONLY the new unified provider - NOT the old providers
      const { DevToolsProvider } = await import("../../src/react/providers/devtools-provider.js");
      const { useDevToolsRuntime } = await import("../../src/react/hooks/use-devtools-runtime.js");

      // Create a minimal mock runtime that represents the new architecture
      // This mock does NOT use any of the old runtime files
      const mockRuntime = createMinimalMockRuntime();

      function Wrapper({ children }: { children: ReactNode }) {
        return React.createElement(DevToolsProvider, { runtime: mockRuntime }, children);
      }

      // Verify the provider can be rendered and hooks can consume it
      const { result } = renderHook(() => useDevToolsRuntime(), { wrapper: Wrapper });

      // Verify initial state is accessible
      expect(result.current).toBeDefined();
      expect(result.current.ui.state).toBe("closed");
      expect(result.current.tracing.state).toBe("disabled");
      expect(result.current.containerTree.state).toBe("idle");

      // Verify the hook responds to state changes
      act(() => {
        mockRuntime._setSnapshot({
          ...result.current,
          ui: { ...result.current.ui, state: "open" },
        });
        mockRuntime._notifyListeners();
      });

      expect(result.current.ui.state).toBe("open");
    });

    it("DevToolsProvider provides context without requiring old container-tree-context", async () => {
      // Import the new context directly - container-tree-context.ts should be deleted
      const { DevToolsContext } = await import("../../src/react/context/devtools-context.js");
      const { DevToolsProvider } = await import("../../src/react/providers/devtools-provider.js");

      // Verify DevToolsContext is the only context needed
      expect(DevToolsContext).toBeDefined();
      expect(DevToolsContext.displayName).toBe("DevToolsContext");

      // Verify provider works with just DevToolsContext
      const mockRuntime = createMinimalMockRuntime();

      function TestConsumer() {
        const context = React.useContext(DevToolsContext);
        return React.createElement(
          "div",
          { "data-testid": "context-check" },
          context !== null ? "has-context" : "no-context"
        );
      }

      const { getByTestId } = await import("@testing-library/react").then(module =>
        module.render(
          React.createElement(
            DevToolsProvider,
            { runtime: mockRuntime },
            React.createElement(TestConsumer)
          )
        )
      );

      expect(getByTestId("context-check").textContent).toBe("has-context");
    });
  });

  // =========================================================================
  // Test 2: Hooks work correctly without old runtime files
  // =========================================================================
  describe("Test 2: Hooks work correctly without old runtime files", () => {
    it("useDevToolsRuntime, useDevToolsSelector, useDevToolsDispatch work without old runtime dependencies", async () => {
      // Import ONLY the new unified hooks
      const { DevToolsProvider } = await import("../../src/react/providers/devtools-provider.js");
      const { useDevToolsRuntime } = await import("../../src/react/hooks/use-devtools-runtime.js");
      const { useDevToolsSelector } =
        await import("../../src/react/hooks/use-devtools-selector.js");
      const { useDevToolsDispatch } =
        await import("../../src/react/hooks/use-devtools-dispatch.js");

      // Create minimal runtime - NO dependency on:
      // - create-runtime-with-containers.ts
      // - container-lifecycle-manager.ts
      // - container-discovery.ts
      // - event-aggregator.ts
      // - ring-buffer.ts
      const mockRuntime = createMinimalMockRuntime();

      function Wrapper({ children }: { children: ReactNode }) {
        return React.createElement(DevToolsProvider, { runtime: mockRuntime }, children);
      }

      // Test useDevToolsRuntime
      const { result: runtimeResult } = renderHook(() => useDevToolsRuntime(), {
        wrapper: Wrapper,
      });
      expect(runtimeResult.current).toBeDefined();
      expect(runtimeResult.current.ui).toBeDefined();
      expect(runtimeResult.current.tracing).toBeDefined();
      expect(runtimeResult.current.containerTree).toBeDefined();

      // Test useDevToolsSelector with a simple selector
      const selectUIState = (snapshot: DevToolsSnapshot) => snapshot.ui.state;
      const { result: selectorResult } = renderHook(() => useDevToolsSelector(selectUIState), {
        wrapper: Wrapper,
      });
      expect(selectorResult.current).toBe("closed");

      // Test useDevToolsDispatch
      const { result: dispatchResult } = renderHook(() => useDevToolsDispatch(), {
        wrapper: Wrapper,
      });
      expect(typeof dispatchResult.current).toBe("function");

      // Verify dispatch works
      act(() => {
        dispatchResult.current({ type: "UI.OPEN" });
      });
      expect(mockRuntime.dispatch).toHaveBeenCalledWith({ type: "UI.OPEN" });
    });

    it("hooks work without old hook files (use-runtime, use-selector, use-state, etc.)", async () => {
      // This test verifies the NEW hooks work independently
      // without requiring the OLD hooks:
      // - use-runtime.ts
      // - use-selector.ts
      // - use-state.ts
      // - use-traces.ts
      // - use-tracing-controls.ts
      // - use-container-scope-tree.ts

      const { DevToolsProvider } = await import("../../src/react/providers/devtools-provider.js");
      const { useDevToolsRuntime } = await import("../../src/react/hooks/use-devtools-runtime.js");
      const { useDevToolsSelector } =
        await import("../../src/react/hooks/use-devtools-selector.js");
      const { useDevToolsDispatch } =
        await import("../../src/react/hooks/use-devtools-dispatch.js");

      const mockRuntime = createMinimalMockRuntime();

      function Wrapper({ children }: { children: ReactNode }) {
        return React.createElement(DevToolsProvider, { runtime: mockRuntime }, children);
      }

      // Verify all three hooks can be used together in a single component
      function MultiHookComponent() {
        const snapshot = useDevToolsRuntime();
        const uiState = useDevToolsSelector(s => s.ui.state);
        const dispatch = useDevToolsDispatch();

        return React.createElement(
          "div",
          null,
          React.createElement("span", { "data-testid": "snapshot-check" }, snapshot.ui.state),
          React.createElement("span", { "data-testid": "selector-check" }, uiState),
          React.createElement(
            "button",
            {
              "data-testid": "dispatch-check",
              onClick: () => dispatch({ type: "UI.OPEN" }),
            },
            "Open"
          )
        );
      }

      const { getByTestId } = await import("@testing-library/react").then(module =>
        module.render(React.createElement(Wrapper, null, React.createElement(MultiHookComponent)))
      );

      expect(getByTestId("snapshot-check").textContent).toBe("closed");
      expect(getByTestId("selector-check").textContent).toBe("closed");
      expect(getByTestId("dispatch-check")).toBeDefined();

      // Verify state updates propagate correctly
      act(() => {
        mockRuntime._setSnapshot({
          ui: { state: "open", context: mockRuntime.getSnapshot().ui.context },
          tracing: mockRuntime.getSnapshot().tracing,
          containerTree: mockRuntime.getSnapshot().containerTree,
        });
        mockRuntime._notifyListeners();
      });

      expect(getByTestId("snapshot-check").textContent).toBe("open");
      expect(getByTestId("selector-check").textContent).toBe("open");
    });
  });
});
