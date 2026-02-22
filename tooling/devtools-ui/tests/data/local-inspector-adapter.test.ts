/**
 * Tests for LocalInspectorAdapter.
 *
 * DoD 40.2.1:
 * 1. LocalInspectorAdapter wraps InspectorAPI (delegates all methods)
 * 2. sourceType is "local"
 * 3. displayName returns constructor argument
 * 4. subscribe/unsubscribe delegates correctly
 * 5. Returns undefined when underlying data is unavailable
 */

import { describe, it, expect, vi } from "vitest";
import type {
  InspectorAPI,
  InspectorListener,
  ContainerSnapshot,
  ScopeTree,
  ContainerGraphData,
  UnifiedSnapshot,
  AdapterInfo,
  LibraryInspector,
  ResultStatistics,
} from "@hex-di/core";
import { LocalInspectorAdapter } from "../../src/data/local-inspector-adapter.js";

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

const baseGraphData: ContainerGraphData = {
  adapters: [],
  containerName: "TestContainer",
  kind: "root",
  parentName: null,
};

const baseAdapterInfo: readonly AdapterInfo[] = [
  {
    portName: "Logger",
    lifetime: "singleton",
    factoryKind: "sync",
    dependencyNames: [],
  },
];

const baseLibraryInspectors: ReadonlyMap<string, LibraryInspector> = new Map([
  ["tracing", { name: "tracing", getSnapshot: () => ({ totalSpans: 10 }) }],
]);

const baseResultStats: ReadonlyMap<string, ResultStatistics> = new Map([
  [
    "Logger",
    {
      portName: "Logger",
      totalCalls: 5,
      okCount: 4,
      errCount: 1,
      errorRate: 0.2,
      errorsByCode: new Map([["FACTORY_ERROR", 1]]),
    },
  ],
]);

function createMockInspector(): {
  inspector: InspectorAPI;
  capturedListeners: InspectorListener[];
} {
  const capturedListeners: InspectorListener[] = [];

  const inspector: InspectorAPI = {
    getSnapshot: vi.fn().mockReturnValue(baseSnapshot),
    getScopeTree: vi.fn().mockReturnValue(baseScopeTree),
    listPorts: vi.fn().mockReturnValue(["Logger"]),
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
    getAdapterInfo: vi.fn().mockReturnValue(baseAdapterInfo),
    getGraphData: vi.fn().mockReturnValue(baseGraphData),
    getResultStatistics: vi.fn().mockReturnValue(undefined),
    getAllResultStatistics: vi.fn().mockReturnValue(baseResultStats),
    getHighErrorRatePorts: vi.fn().mockReturnValue([]),
    registerLibrary: vi.fn().mockReturnValue(() => {}),
    getLibraryInspectors: vi.fn().mockReturnValue(baseLibraryInspectors),
    getLibraryInspector: vi.fn().mockReturnValue(undefined),
    getUnifiedSnapshot: vi.fn().mockReturnValue(baseUnifiedSnapshot),
    queryLibraries: vi.fn().mockReturnValue([]),
    queryByLibrary: vi.fn().mockReturnValue([]),
    queryByKey: vi.fn().mockReturnValue([]),
    isDisposed: false,
  };

  return { inspector, capturedListeners };
}

// =============================================================================
// Tests
// =============================================================================

describe("LocalInspectorAdapter", () => {
  it("delegates all get methods to the underlying InspectorAPI", () => {
    const { inspector } = createMockInspector();
    const adapter = new LocalInspectorAdapter(inspector, "Test");

    expect(adapter.getSnapshot()).toBe(baseSnapshot);
    expect(inspector.getSnapshot).toHaveBeenCalledOnce();

    expect(adapter.getScopeTree()).toBe(baseScopeTree);
    expect(inspector.getScopeTree).toHaveBeenCalledOnce();

    expect(adapter.getGraphData()).toBe(baseGraphData);
    expect(inspector.getGraphData).toHaveBeenCalledOnce();

    expect(adapter.getUnifiedSnapshot()).toBe(baseUnifiedSnapshot);
    expect(inspector.getUnifiedSnapshot).toHaveBeenCalledOnce();

    expect(adapter.getAdapterInfo()).toBe(baseAdapterInfo);
    expect(inspector.getAdapterInfo).toHaveBeenCalledOnce();

    expect(adapter.getLibraryInspectors()).toBe(baseLibraryInspectors);
    expect(inspector.getLibraryInspectors).toHaveBeenCalledOnce();

    expect(adapter.getAllResultStatistics()).toBe(baseResultStats);
    expect(inspector.getAllResultStatistics).toHaveBeenCalledOnce();
  });

  it("has sourceType set to 'local'", () => {
    const { inspector } = createMockInspector();
    const adapter = new LocalInspectorAdapter(inspector, "Test");

    expect(adapter.sourceType).toBe("local");
  });

  it("returns the displayName provided in the constructor", () => {
    const { inspector } = createMockInspector();
    const adapter = new LocalInspectorAdapter(inspector, "My Local Container");

    expect(adapter.displayName).toBe("My Local Container");
  });

  it("delegates subscribe and unsubscribe to the underlying inspector", () => {
    const { inspector, capturedListeners } = createMockInspector();
    const adapter = new LocalInspectorAdapter(inspector, "Test");
    const listener = vi.fn();

    const unsubscribe = adapter.subscribe(listener);

    expect(inspector.subscribe).toHaveBeenCalledOnce();
    expect(capturedListeners).toHaveLength(1);

    // Fire an event through the inspector's captured listener
    capturedListeners[0]({ type: "snapshot-changed" });
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ type: "snapshot-changed" });

    // Unsubscribe
    unsubscribe();
    expect(capturedListeners).toHaveLength(0);
  });

  it("returns undefined when underlying data is unavailable", () => {
    const { inspector } = createMockInspector();

    // Override mocks to return undefined-like values (InspectorAPI normally
    // returns data synchronously, but we simulate unavailable data by
    // having the methods return the values and the adapter just passes through)
    vi.mocked(inspector.getSnapshot).mockReturnValue(undefined as any);
    vi.mocked(inspector.getScopeTree).mockReturnValue(undefined as any);
    vi.mocked(inspector.getGraphData).mockReturnValue(undefined as any);
    vi.mocked(inspector.getUnifiedSnapshot).mockReturnValue(undefined as any);
    vi.mocked(inspector.getAdapterInfo).mockReturnValue(undefined as any);
    vi.mocked(inspector.getLibraryInspectors).mockReturnValue(undefined as any);
    vi.mocked(inspector.getAllResultStatistics).mockReturnValue(undefined as any);

    const adapter = new LocalInspectorAdapter(inspector, "Test");

    expect(adapter.getSnapshot()).toBeUndefined();
    expect(adapter.getScopeTree()).toBeUndefined();
    expect(adapter.getGraphData()).toBeUndefined();
    expect(adapter.getUnifiedSnapshot()).toBeUndefined();
    expect(adapter.getAdapterInfo()).toBeUndefined();
    expect(adapter.getLibraryInspectors()).toBeUndefined();
    expect(adapter.getAllResultStatistics()).toBeUndefined();
  });
});
