import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  extractInspectorData,
  sendInspectorSnapshot,
  setLastCreatedInspector,
  getLastCreatedInspector,
  clearLastCreatedInspector,
} from "../../src/sandbox/container-bridge.js";
import type { WorkerToMainMessage } from "../../src/sandbox/worker-protocol.js";
import type {
  InspectorAPI,
  ContainerSnapshot,
  ScopeTree,
  ContainerGraphData,
  UnifiedSnapshot,
  AdapterInfo,
  ResultStatistics,
  LibraryInspector,
  InspectorEvent,
} from "@hex-di/core";

// =============================================================================
// Mock InspectorAPI
// =============================================================================

function createMockInspector(overrides?: Partial<InspectorAPI>): InspectorAPI {
  const mockSnapshot: ContainerSnapshot = {
    kind: "root",
    phase: "initialized",
    isInitialized: true,
    asyncAdaptersTotal: 0,
    asyncAdaptersInitialized: 0,
    singletons: [],
    scopes: {
      id: "root",
      status: "active",
      resolvedCount: 0,
      totalCount: 0,
      children: [],
      resolvedPorts: [],
    },
    isDisposed: false,
    containerName: "Test",
  };

  const mockScopeTree: ScopeTree = {
    id: "root",
    status: "active",
    resolvedCount: 0,
    totalCount: 0,
    children: [],
    resolvedPorts: [],
  };

  const mockGraphData: ContainerGraphData = {
    adapters: [],
    containerName: "Test",
    kind: "root",
    parentName: null,
  };

  const mockUnifiedSnapshot: UnifiedSnapshot = {
    timestamp: Date.now(),
    container: mockSnapshot,
    libraries: {},
    registeredLibraries: [],
  };

  const mockAdapterInfo: readonly AdapterInfo[] = [];
  const mockLibraryInspectors = new Map<string, LibraryInspector>();
  const mockResultStatistics = new Map<string, ResultStatistics>();

  return {
    getSnapshot: vi.fn(() => mockSnapshot),
    getScopeTree: vi.fn(() => mockScopeTree),
    getGraphData: vi.fn(() => mockGraphData),
    getUnifiedSnapshot: vi.fn(() => mockUnifiedSnapshot),
    getAdapterInfo: vi.fn(() => mockAdapterInfo),
    getLibraryInspectors: vi.fn(() => mockLibraryInspectors),
    getAllResultStatistics: vi.fn(() => mockResultStatistics),
    subscribe: vi.fn(() => () => {}),
    listPorts: vi.fn(() => []),
    isResolved: vi.fn(() => false),
    getContainerKind: vi.fn(() => "root" as const),
    getPhase: vi.fn(() => "initialized" as const),
    isDisposed: false,
    getChildContainers: vi.fn(() => []),
    getResultStatistics: vi.fn(() => undefined),
    getHighErrorRatePorts: vi.fn(() => []),
    registerLibrary: vi.fn(() => () => {}),
    getLibraryInspector: vi.fn(() => undefined),
    queryLibraries: vi.fn(() => []),
    queryByLibrary: vi.fn(() => []),
    queryByKey: vi.fn(() => []),
    ...overrides,
  };
}

describe("extractInspectorData", () => {
  beforeEach(() => {
    clearLastCreatedInspector();
  });

  it("extracts inspector from explicit inspector export", () => {
    const inspector = createMockInspector();
    const postMessage = vi.fn<(msg: WorkerToMainMessage) => void>();
    const userModule = { inspector };

    extractInspectorData(userModule, postMessage);

    // Should send inspector-data, not no-inspector
    expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "inspector-data" }));
    expect(inspector.subscribe).toHaveBeenCalled();
  });

  it("extracts inspector from container export", () => {
    const inspector = createMockInspector();
    const postMessage = vi.fn<(msg: WorkerToMainMessage) => void>();
    const userModule = { container: { inspector } };

    extractInspectorData(userModule, postMessage);

    expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "inspector-data" }));
  });

  it("falls back to last created inspector", () => {
    const inspector = createMockInspector();
    setLastCreatedInspector(inspector);
    const postMessage = vi.fn<(msg: WorkerToMainMessage) => void>();
    const userModule = {};

    extractInspectorData(userModule, postMessage);

    expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "inspector-data" }));
  });

  it("sends no-inspector when no inspector found", () => {
    const postMessage = vi.fn<(msg: WorkerToMainMessage) => void>();
    const userModule = {};

    extractInspectorData(userModule, postMessage);

    expect(postMessage).toHaveBeenCalledWith({ type: "no-inspector" });
  });

  it("subscribes to inspector events and resends snapshot", () => {
    let subscribedListener: ((event: InspectorEvent) => void) | undefined;
    const inspector = createMockInspector({
      subscribe: vi.fn((listener: (event: InspectorEvent) => void) => {
        subscribedListener = listener;
        return () => {};
      }),
    });
    const postMessage = vi.fn<(msg: WorkerToMainMessage) => void>();
    const userModule = { inspector };

    extractInspectorData(userModule, postMessage);

    // Initial data sent
    expect(postMessage).toHaveBeenCalledTimes(1);

    // Simulate an inspector event
    expect(subscribedListener).toBeDefined();
    if (subscribedListener) {
      subscribedListener({ type: "snapshot-changed" });
    }

    // Should have sent inspector-event + re-sent inspector-data
    expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "inspector-event" }));
    // Total: initial inspector-data + inspector-event + re-sent inspector-data = 3
    expect(postMessage).toHaveBeenCalledTimes(3);
  });
});

describe("sendInspectorSnapshot", () => {
  it("sends complete inspector data message", () => {
    const inspector = createMockInspector();
    const postMessage = vi.fn<(msg: WorkerToMainMessage) => void>();

    sendInspectorSnapshot(inspector, postMessage);

    expect(postMessage).toHaveBeenCalledTimes(1);
    const msg = postMessage.mock.calls[0][0];
    expect(msg.type).toBe("inspector-data");
    if (msg.type === "inspector-data") {
      expect(msg.snapshot).toBeDefined();
      expect(msg.scopeTree).toBeDefined();
      expect(msg.graphData).toBeDefined();
      expect(msg.unifiedSnapshot).toBeDefined();
      expect(msg.adapterInfo).toBeDefined();
      expect(msg.libraryInspectors).toBeDefined();
      expect(msg.resultStatistics).toBeDefined();
    }
  });
});

describe("lastCreatedInspector", () => {
  beforeEach(() => {
    clearLastCreatedInspector();
  });

  it("starts undefined", () => {
    expect(getLastCreatedInspector()).toBeUndefined();
  });

  it("can be set and retrieved", () => {
    const inspector = createMockInspector();
    setLastCreatedInspector(inspector);
    expect(getLastCreatedInspector()).toBe(inspector);
  });

  it("can be cleared", () => {
    const inspector = createMockInspector();
    setLastCreatedInspector(inspector);
    clearLastCreatedInspector();
    expect(getLastCreatedInspector()).toBeUndefined();
  });
});
