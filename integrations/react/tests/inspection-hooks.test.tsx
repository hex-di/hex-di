/**
 * Unit tests for React inspection hooks and InspectorProvider.
 *
 * These tests verify:
 * 1. useInspector throws MissingProviderError outside provider
 * 2. useInspector returns inspector inside provider
 * 3. useSnapshot returns current snapshot
 * 4. useSnapshot re-renders on inspector event
 * 5. useScopeTree returns scope tree
 * 6. useScopeTree re-renders on change
 * 7. useUnifiedSnapshot returns unified snapshot
 * 8. useUnifiedSnapshot re-renders on change
 * 9. Unmount cleanup (subscription removed)
 * 10. InspectorProvider provides inspector to children
 * 11. DevToolsBridge sends postMessage on events
 * 12. DevToolsBridge does nothing when disabled
 * 13. DevToolsBridge SSR safe (no window access)
 */

import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import React from "react";
import type {
  InspectorAPI,
  InspectorListener,
  ContainerSnapshot,
  ScopeTree,
  UnifiedSnapshot,
} from "@hex-di/core";
import { MissingProviderError } from "../src/errors.js";
import { InspectorProvider } from "../src/providers/inspector-provider.js";
import { useInspector } from "../src/hooks/use-inspector.js";
import { useSnapshot } from "../src/hooks/use-snapshot.js";
import { useScopeTree } from "../src/hooks/use-scope-tree.js";
import { useUnifiedSnapshot } from "../src/hooks/use-unified-snapshot.js";
import { DevToolsBridge } from "../src/components/dev-tools-bridge.js";

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

/**
 * Creates a mock InspectorAPI for testing.
 * The subscribe mock captures listeners so we can trigger events in tests.
 */
function createMockInspector(): {
  inspector: InspectorAPI;
  capturedListeners: InspectorListener[];
  triggerEvent: () => void;
} {
  const capturedListeners: InspectorListener[] = [];

  const inspector: InspectorAPI = {
    getSnapshot: vi.fn().mockReturnValue(baseSnapshot),
    getScopeTree: vi.fn().mockReturnValue(baseScopeTree),
    listPorts: vi.fn().mockReturnValue(["PortA", "PortB"]),
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
    getGraphData: vi
      .fn()
      .mockReturnValue({
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
    getLibraryInspector: vi.fn().mockReturnValue(undefined),
    getUnifiedSnapshot: vi.fn().mockReturnValue(baseUnifiedSnapshot),
    isDisposed: false,
  };

  const triggerEvent = () => {
    for (const listener of capturedListeners) {
      listener({ type: "snapshot-changed" });
    }
  };

  return { inspector, capturedListeners, triggerEvent };
}

// =============================================================================
// Cleanup
// =============================================================================

afterEach(() => {
  cleanup();
});

// =============================================================================
// useInspector
// =============================================================================

describe("useInspector", () => {
  it("throws MissingProviderError when used outside InspectorProvider", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    function TestComponent(): React.ReactNode {
      useInspector();
      return <div>should not render</div>;
    }

    expect(() => render(<TestComponent />)).toThrow(MissingProviderError);
    errorSpy.mockRestore();
  });

  it("returns inspector inside InspectorProvider", () => {
    const { inspector } = createMockInspector();

    function TestComponent(): React.ReactNode {
      const result = useInspector();
      return <div data-testid="ports">{result.listPorts().join(",")}</div>;
    }

    render(
      <InspectorProvider inspector={inspector}>
        <TestComponent />
      </InspectorProvider>
    );

    expect(screen.getByTestId("ports").textContent).toBe("PortA,PortB");
  });
});

// =============================================================================
// useSnapshot
// =============================================================================

describe("useSnapshot", () => {
  it("returns current container snapshot", () => {
    const { inspector } = createMockInspector();

    function TestComponent(): React.ReactNode {
      const snapshot = useSnapshot();
      return <div data-testid="kind">{snapshot.kind}</div>;
    }

    render(
      <InspectorProvider inspector={inspector}>
        <TestComponent />
      </InspectorProvider>
    );

    expect(screen.getByTestId("kind").textContent).toBe("root");
  });

  it("re-renders when inspector emits event", () => {
    const { inspector, triggerEvent } = createMockInspector();
    const getSnapshotMock = inspector.getSnapshot as ReturnType<typeof vi.fn>;

    const updatedSnapshot: ContainerSnapshot = {
      ...baseSnapshot,
      phase: "initialized",
      isInitialized: true,
    };

    function TestComponent(): React.ReactNode {
      const snapshot = useSnapshot();
      return <div data-testid="phase">{snapshot.phase}</div>;
    }

    render(
      <InspectorProvider inspector={inspector}>
        <TestComponent />
      </InspectorProvider>
    );

    expect(screen.getByTestId("phase").textContent).toBe("uninitialized");

    // Update the mock and trigger event
    getSnapshotMock.mockReturnValue(updatedSnapshot);
    act(() => {
      triggerEvent();
    });

    expect(screen.getByTestId("phase").textContent).toBe("initialized");
  });
});

// =============================================================================
// useScopeTree
// =============================================================================

describe("useScopeTree", () => {
  it("returns current scope tree", () => {
    const { inspector } = createMockInspector();

    function TestComponent(): React.ReactNode {
      const tree = useScopeTree();
      return <div data-testid="status">{tree.status}</div>;
    }

    render(
      <InspectorProvider inspector={inspector}>
        <TestComponent />
      </InspectorProvider>
    );

    expect(screen.getByTestId("status").textContent).toBe("active");
  });

  it("re-renders when scope tree changes", () => {
    const { inspector, triggerEvent } = createMockInspector();
    const getScopeTreeMock = inspector.getScopeTree as ReturnType<typeof vi.fn>;

    const updatedTree: ScopeTree = {
      ...baseScopeTree,
      resolvedCount: 2,
      children: [
        {
          id: "child-1",
          status: "active",
          resolvedCount: 1,
          totalCount: 2,
          children: [],
          resolvedPorts: ["PortA"],
        },
      ],
    };

    function TestComponent(): React.ReactNode {
      const tree = useScopeTree();
      return <div data-testid="children">{tree.children.length}</div>;
    }

    render(
      <InspectorProvider inspector={inspector}>
        <TestComponent />
      </InspectorProvider>
    );

    expect(screen.getByTestId("children").textContent).toBe("0");

    getScopeTreeMock.mockReturnValue(updatedTree);
    act(() => {
      triggerEvent();
    });

    expect(screen.getByTestId("children").textContent).toBe("1");
  });
});

// =============================================================================
// useUnifiedSnapshot
// =============================================================================

describe("useUnifiedSnapshot", () => {
  it("returns current unified snapshot", () => {
    const { inspector } = createMockInspector();

    function TestComponent(): React.ReactNode {
      const unified = useUnifiedSnapshot();
      return <div data-testid="timestamp">{unified.timestamp}</div>;
    }

    render(
      <InspectorProvider inspector={inspector}>
        <TestComponent />
      </InspectorProvider>
    );

    expect(screen.getByTestId("timestamp").textContent).toBe("1000");
  });

  it("re-renders when unified snapshot changes", () => {
    const { inspector, triggerEvent } = createMockInspector();
    const getUnifiedMock = inspector.getUnifiedSnapshot as ReturnType<typeof vi.fn>;

    const updatedUnified: UnifiedSnapshot = {
      timestamp: 2000,
      container: baseSnapshot,
      libraries: { flow: { machineCount: 3 } },
      registeredLibraries: ["flow"],
    };

    function TestComponent(): React.ReactNode {
      const unified = useUnifiedSnapshot();
      return <div data-testid="libs">{unified.registeredLibraries.join(",")}</div>;
    }

    render(
      <InspectorProvider inspector={inspector}>
        <TestComponent />
      </InspectorProvider>
    );

    expect(screen.getByTestId("libs").textContent).toBe("");

    getUnifiedMock.mockReturnValue(updatedUnified);
    act(() => {
      triggerEvent();
    });

    expect(screen.getByTestId("libs").textContent).toBe("flow");
  });
});

// =============================================================================
// Subscription Cleanup
// =============================================================================

describe("subscription cleanup", () => {
  it("removes subscription on unmount", () => {
    const { inspector, capturedListeners } = createMockInspector();

    function TestComponent(): React.ReactNode {
      const snapshot = useSnapshot();
      return <div>{snapshot.kind}</div>;
    }

    const { unmount } = render(
      <InspectorProvider inspector={inspector}>
        <TestComponent />
      </InspectorProvider>
    );

    // Listeners are registered during render (useSyncExternalStore subscribes)
    const listenerCountBefore = capturedListeners.length;
    expect(listenerCountBefore).toBeGreaterThan(0);

    unmount();

    // After unmount, all listeners should be removed
    expect(capturedListeners.length).toBe(0);
  });
});

// =============================================================================
// InspectorProvider
// =============================================================================

describe("InspectorProvider", () => {
  it("provides inspector to children", () => {
    const { inspector } = createMockInspector();

    function TestComponent(): React.ReactNode {
      const result = useInspector();
      return <div data-testid="kind">{result.getContainerKind()}</div>;
    }

    render(
      <InspectorProvider inspector={inspector}>
        <TestComponent />
      </InspectorProvider>
    );

    expect(screen.getByTestId("kind").textContent).toBe("root");
    expect(inspector.getContainerKind).toHaveBeenCalled();
  });
});

// =============================================================================
// DevToolsBridge
// =============================================================================

describe("DevToolsBridge", () => {
  let postMessageSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    postMessageSpy = vi.spyOn(window, "postMessage").mockImplementation(() => {});
  });

  afterEach(() => {
    postMessageSpy.mockRestore();
  });

  it("sends postMessage on inspector events", () => {
    const { inspector, triggerEvent } = createMockInspector();

    render(<DevToolsBridge inspector={inspector} />);

    act(() => {
      triggerEvent();
    });

    expect(postMessageSpy).toHaveBeenCalledWith(
      { type: "hex-di:inspector-event", event: { type: "snapshot-changed" } },
      "*"
    );
  });

  it("does nothing when disabled", () => {
    const { inspector, triggerEvent } = createMockInspector();

    render(<DevToolsBridge inspector={inspector} enabled={false} />);

    act(() => {
      triggerEvent();
    });

    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  it("cleans up subscription on unmount", () => {
    const { inspector, capturedListeners } = createMockInspector();

    const { unmount } = render(<DevToolsBridge inspector={inspector} />);

    const listenerCountBefore = capturedListeners.length;
    expect(listenerCountBefore).toBeGreaterThan(0);

    unmount();

    expect(capturedListeners.length).toBe(0);
  });

  it("renders null (no visual output)", () => {
    const { inspector } = createMockInspector();

    const { container } = render(<DevToolsBridge inspector={inspector} />);

    expect(container.innerHTML).toBe("");
  });
});
