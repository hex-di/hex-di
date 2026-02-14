/**
 * Tests for useTracingSummary hook.
 *
 * Verifies:
 * 1. Throws MissingProviderError outside InspectorProvider
 * 2. Returns undefined when no tracing inspector registered
 * 3. Returns TracingSummary when tracing inspector exists
 * 4. Defaults non-numeric snapshot fields to 0
 * 5. Re-renders when inspector emits event with updated data
 * 6. Cleans up subscription on unmount
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import React from "react";
import type {
  InspectorAPI,
  InspectorListener,
  ContainerSnapshot,
  ScopeTree,
  UnifiedSnapshot,
  LibraryInspector,
} from "@hex-di/core";
import { MissingProviderError } from "../src/errors.js";
import { InspectorProvider } from "../src/providers/inspector-provider.js";
import { useTracingSummary } from "../src/hooks/use-tracing-summary.js";

// =============================================================================
// Test Fixtures
// =============================================================================

const baseScopeTree: ScopeTree = {
  id: "root",
  status: "active",
  resolvedCount: 0,
  totalCount: 3,
  children: [],
  resolvedPorts: [],
};

const baseSnapshot: ContainerSnapshot = {
  kind: "root",
  containerName: "TestContainer",
  phase: "uninitialized",
  isInitialized: false,
  isDisposed: false,
  asyncAdaptersTotal: 0,
  asyncAdaptersInitialized: 0,
  singletons: [],
  scopes: baseScopeTree,
};

const baseUnifiedSnapshot: UnifiedSnapshot = {
  timestamp: 1000,
  container: baseSnapshot,
  libraries: {},
  registeredLibraries: [],
};

function createMockInspector(tracingSnapshot?: Record<string, unknown>): {
  inspector: InspectorAPI;
  capturedListeners: InspectorListener[];
  triggerEvent: () => void;
  tracingInspector: LibraryInspector | undefined;
} {
  const capturedListeners: InspectorListener[] = [];

  const tracingInspector: LibraryInspector | undefined = tracingSnapshot
    ? {
        name: "tracing",
        getSnapshot: vi.fn().mockReturnValue(tracingSnapshot),
      }
    : undefined;

  const inspector: InspectorAPI = {
    getSnapshot: vi.fn().mockReturnValue(baseSnapshot),
    getScopeTree: vi.fn().mockReturnValue(baseScopeTree),
    listPorts: vi.fn().mockReturnValue(["PortA"]),
    isResolved: vi.fn().mockReturnValue(false),
    getContainerKind: vi.fn().mockReturnValue("root"),
    getPhase: vi.fn().mockReturnValue("uninitialized"),
    subscribe: vi.fn().mockImplementation((listener: InspectorListener) => {
      capturedListeners.push(listener);
      return () => {
        const idx = capturedListeners.indexOf(listener);
        if (idx >= 0) capturedListeners.splice(idx, 1);
      };
    }),
    getChildContainers: vi.fn().mockReturnValue([]),
    getAdapterInfo: vi.fn().mockReturnValue([]),
    getGraphData: vi.fn().mockReturnValue({
      adapters: [],
      containerName: "TestContainer",
      kind: "root",
      parentName: null,
    }),
    getResultStatistics: vi.fn().mockReturnValue(undefined),
    getAllResultStatistics: vi.fn().mockReturnValue(new Map()),
    getHighErrorRatePorts: vi.fn().mockReturnValue([]),
    registerLibrary: vi.fn().mockReturnValue(() => {}),
    getLibraryInspectors: vi.fn().mockReturnValue(new Map()),
    getLibraryInspector: vi.fn().mockImplementation((name: string) => {
      if (name === "tracing" && tracingInspector) return tracingInspector;
      return undefined;
    }),
    getUnifiedSnapshot: vi.fn().mockReturnValue(baseUnifiedSnapshot),
    queryLibraries: vi.fn().mockReturnValue([]),
    queryByLibrary: vi.fn().mockReturnValue([]),
    queryByKey: vi.fn().mockReturnValue([]),
    isDisposed: false,
  };

  const triggerEvent = () => {
    for (const listener of capturedListeners) {
      listener({ type: "snapshot-changed" });
    }
  };

  return { inspector, capturedListeners, triggerEvent, tracingInspector };
}

// =============================================================================
// Cleanup
// =============================================================================

afterEach(() => {
  cleanup();
});

// =============================================================================
// Tests
// =============================================================================

describe("useTracingSummary", () => {
  it("throws MissingProviderError when used outside InspectorProvider", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    function TestComponent(): React.ReactNode {
      useTracingSummary();
      return <div>should not render</div>;
    }

    expect(() => render(<TestComponent />)).toThrow(MissingProviderError);
    errorSpy.mockRestore();
  });

  it("returns undefined when no tracing inspector is registered", () => {
    const { inspector } = createMockInspector();

    function TestComponent(): React.ReactNode {
      const summary = useTracingSummary();
      return <div data-testid="result">{summary === undefined ? "none" : "has-data"}</div>;
    }

    render(
      <InspectorProvider inspector={inspector}>
        <TestComponent />
      </InspectorProvider>
    );

    expect(screen.getByTestId("result").textContent).toBe("none");
  });

  it("returns TracingSummary when tracing inspector exists", () => {
    const { inspector } = createMockInspector({
      totalSpans: 42,
      errorCount: 3,
      averageDuration: 12.5,
      cacheHitRate: 0.75,
    });

    function TestComponent(): React.ReactNode {
      const summary = useTracingSummary();
      if (!summary) return <div data-testid="result">none</div>;
      return (
        <div>
          <span data-testid="totalSpans">{summary.totalSpans}</span>
          <span data-testid="errorCount">{summary.errorCount}</span>
          <span data-testid="avgDuration">{summary.averageDuration}</span>
          <span data-testid="cacheHitRate">{summary.cacheHitRate}</span>
        </div>
      );
    }

    render(
      <InspectorProvider inspector={inspector}>
        <TestComponent />
      </InspectorProvider>
    );

    expect(screen.getByTestId("totalSpans").textContent).toBe("42");
    expect(screen.getByTestId("errorCount").textContent).toBe("3");
    expect(screen.getByTestId("avgDuration").textContent).toBe("12.5");
    expect(screen.getByTestId("cacheHitRate").textContent).toBe("0.75");
  });

  it("defaults non-numeric snapshot fields to 0", () => {
    const { inspector } = createMockInspector({
      totalSpans: "not-a-number",
      errorCount: undefined,
      // averageDuration and cacheHitRate missing entirely
    });

    function TestComponent(): React.ReactNode {
      const summary = useTracingSummary();
      if (!summary) return <div>none</div>;
      return (
        <div>
          <span data-testid="totalSpans">{summary.totalSpans}</span>
          <span data-testid="errorCount">{summary.errorCount}</span>
          <span data-testid="avgDuration">{summary.averageDuration}</span>
          <span data-testid="cacheHitRate">{summary.cacheHitRate}</span>
        </div>
      );
    }

    render(
      <InspectorProvider inspector={inspector}>
        <TestComponent />
      </InspectorProvider>
    );

    expect(screen.getByTestId("totalSpans").textContent).toBe("0");
    expect(screen.getByTestId("errorCount").textContent).toBe("0");
    expect(screen.getByTestId("avgDuration").textContent).toBe("0");
    expect(screen.getByTestId("cacheHitRate").textContent).toBe("0");
  });

  it("re-renders when inspector emits event with updated data", () => {
    const { inspector, triggerEvent, tracingInspector } = createMockInspector({
      totalSpans: 10,
      errorCount: 0,
      averageDuration: 5.0,
      cacheHitRate: 0.5,
    });

    const getSnapshotMock = tracingInspector!.getSnapshot as ReturnType<typeof vi.fn>;

    function TestComponent(): React.ReactNode {
      const summary = useTracingSummary();
      if (!summary) return <div>none</div>;
      return <div data-testid="totalSpans">{summary.totalSpans}</div>;
    }

    render(
      <InspectorProvider inspector={inspector}>
        <TestComponent />
      </InspectorProvider>
    );

    expect(screen.getByTestId("totalSpans").textContent).toBe("10");

    // Update the mock and trigger event
    getSnapshotMock.mockReturnValue({
      totalSpans: 25,
      errorCount: 2,
      averageDuration: 8.0,
      cacheHitRate: 0.6,
    });
    act(() => {
      triggerEvent();
    });

    expect(screen.getByTestId("totalSpans").textContent).toBe("25");
  });

  it("cleans up subscription on unmount", () => {
    const { inspector, capturedListeners } = createMockInspector({
      totalSpans: 1,
      errorCount: 0,
      averageDuration: 1.0,
      cacheHitRate: 0.0,
    });

    function TestComponent(): React.ReactNode {
      const summary = useTracingSummary();
      return <div>{summary ? "yes" : "no"}</div>;
    }

    const { unmount } = render(
      <InspectorProvider inspector={inspector}>
        <TestComponent />
      </InspectorProvider>
    );

    const listenerCountBefore = capturedListeners.length;
    expect(listenerCountBefore).toBeGreaterThan(0);

    unmount();

    expect(capturedListeners.length).toBe(0);
  });
});
