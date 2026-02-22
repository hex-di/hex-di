import { describe, it, expect, vi } from "vitest";
import { PlaygroundInspectorBridge } from "../../src/adapter/playground-inspector-bridge.js";
import type { InspectorDataSource } from "@hex-di/devtools-ui";
import type {
  ContainerSnapshot,
  ScopeTree,
  ContainerGraphData,
  UnifiedSnapshot,
  AdapterInfo,
  InspectorEvent,
  ResultStatistics,
} from "@hex-di/core";
import type {
  SerializedLibraryInspectors,
  SerializedResultStatistics,
} from "../../src/sandbox/worker-protocol.js";

// =============================================================================
// Test Data Factories
// =============================================================================

function createMockSnapshot(): ContainerSnapshot {
  return {
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
}

function createMockScopeTree(): ScopeTree {
  return {
    id: "root",
    status: "active",
    resolvedCount: 0,
    totalCount: 0,
    children: [],
    resolvedPorts: [],
  };
}

function createMockGraphData(): ContainerGraphData {
  return {
    adapters: [],
    containerName: "Test",
    kind: "root",
    parentName: null,
  };
}

function createMockUnifiedSnapshot(snapshot: ContainerSnapshot): UnifiedSnapshot {
  return {
    timestamp: Date.now(),
    container: snapshot,
    libraries: {},
    registeredLibraries: [],
  };
}

function createMockInspectorData(): {
  readonly snapshot: ContainerSnapshot;
  readonly scopeTree: ScopeTree;
  readonly graphData: ContainerGraphData;
  readonly unifiedSnapshot: UnifiedSnapshot;
  readonly adapterInfo: readonly AdapterInfo[];
  readonly libraryInspectors: SerializedLibraryInspectors;
  readonly resultStatistics: SerializedResultStatistics;
} {
  const snapshot = createMockSnapshot();
  return {
    snapshot,
    scopeTree: createMockScopeTree(),
    graphData: createMockGraphData(),
    unifiedSnapshot: createMockUnifiedSnapshot(snapshot),
    adapterInfo: [],
    libraryInspectors: [],
    resultStatistics: [],
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("PlaygroundInspectorBridge", () => {
  it("initial state: all get methods return undefined", () => {
    const bridge = new PlaygroundInspectorBridge();

    expect(bridge.getSnapshot()).toBeUndefined();
    expect(bridge.getScopeTree()).toBeUndefined();
    expect(bridge.getGraphData()).toBeUndefined();
    expect(bridge.getUnifiedSnapshot()).toBeUndefined();
    expect(bridge.getAdapterInfo()).toBeUndefined();
    expect(bridge.getLibraryInspectors()).toBeUndefined();
    expect(bridge.getAllResultStatistics()).toBeUndefined();
  });

  it("handleInspectorData populates cache", () => {
    const bridge = new PlaygroundInspectorBridge();
    const data = createMockInspectorData();

    bridge.handleInspectorData(data);

    expect(bridge.getSnapshot()).toBe(data.snapshot);
    expect(bridge.getScopeTree()).toBe(data.scopeTree);
    expect(bridge.getGraphData()).toBe(data.graphData);
    expect(bridge.getUnifiedSnapshot()).toBe(data.unifiedSnapshot);
    expect(bridge.getAdapterInfo()).toBe(data.adapterInfo);
    expect(bridge.getLibraryInspectors()).toBeDefined();
    expect(bridge.getAllResultStatistics()).toBeDefined();
  });

  it("subscribe notifies on data update", () => {
    const bridge = new PlaygroundInspectorBridge();
    const listener = vi.fn<(event: InspectorEvent) => void>();

    bridge.subscribe(listener);
    bridge.handleInspectorData(createMockInspectorData());

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ type: "snapshot-changed" });
  });

  it("reset clears all data", () => {
    const bridge = new PlaygroundInspectorBridge();
    bridge.handleInspectorData(createMockInspectorData());

    // Verify data is populated
    expect(bridge.getSnapshot()).toBeDefined();

    bridge.reset();

    expect(bridge.getSnapshot()).toBeUndefined();
    expect(bridge.getScopeTree()).toBeUndefined();
    expect(bridge.getGraphData()).toBeUndefined();
    expect(bridge.getUnifiedSnapshot()).toBeUndefined();
    expect(bridge.getAdapterInfo()).toBeUndefined();
    expect(bridge.getLibraryInspectors()).toBeUndefined();
    expect(bridge.getAllResultStatistics()).toBeUndefined();
  });

  it("unsubscribe stops notifications", () => {
    const bridge = new PlaygroundInspectorBridge();
    const listener = vi.fn<(event: InspectorEvent) => void>();

    const unsubscribe = bridge.subscribe(listener);
    bridge.handleInspectorData(createMockInspectorData());
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    bridge.handleInspectorData(createMockInspectorData());
    expect(listener).toHaveBeenCalledTimes(1); // Not called again
  });

  it('sourceType is "local"', () => {
    const bridge = new PlaygroundInspectorBridge();
    expect(bridge.sourceType).toBe("local");
  });

  it('displayName is "Playground Sandbox"', () => {
    const bridge = new PlaygroundInspectorBridge();
    expect(bridge.displayName).toBe("Playground Sandbox");
  });

  it("satisfies InspectorDataSource", () => {
    const bridge = new PlaygroundInspectorBridge();
    // Type-level check: bridge must be assignable to InspectorDataSource
    const _source: InspectorDataSource = bridge;
    // Runtime check: all required methods exist
    expect(typeof _source.getSnapshot).toBe("function");
    expect(typeof _source.getScopeTree).toBe("function");
    expect(typeof _source.getGraphData).toBe("function");
    expect(typeof _source.getUnifiedSnapshot).toBe("function");
    expect(typeof _source.getAdapterInfo).toBe("function");
    expect(typeof _source.getLibraryInspectors).toBe("function");
    expect(typeof _source.getAllResultStatistics).toBe("function");
    expect(typeof _source.subscribe).toBe("function");
    expect(_source.displayName).toBe("Playground Sandbox");
    expect(_source.sourceType).toBe("local");
  });

  it("library inspectors deserialized correctly", () => {
    const bridge = new PlaygroundInspectorBridge();
    const data = createMockInspectorData();

    const serializedLibInspectors: SerializedLibraryInspectors = [
      ["flow", { name: "flow", snapshot: { activities: 3 } }],
      ["store", { name: "store", snapshot: { stores: 2 } }],
    ];

    bridge.handleInspectorData({
      ...data,
      libraryInspectors: serializedLibInspectors,
    });

    const inspectors = bridge.getLibraryInspectors();
    expect(inspectors).toBeDefined();
    expect(inspectors).toBeInstanceOf(Map);
    expect(inspectors?.size).toBe(2);

    const flowInspector = inspectors?.get("flow");
    expect(flowInspector).toBeDefined();
    expect(flowInspector?.name).toBe("flow");
    expect(flowInspector?.getSnapshot()).toEqual({ activities: 3 });

    const storeInspector = inspectors?.get("store");
    expect(storeInspector).toBeDefined();
    expect(storeInspector?.name).toBe("store");
    expect(storeInspector?.getSnapshot()).toEqual({ stores: 2 });
  });

  it("result statistics deserialized correctly", () => {
    const bridge = new PlaygroundInspectorBridge();
    const data = createMockInspectorData();

    const stats: ResultStatistics = {
      portName: "MyPort",
      totalCalls: 10,
      okCount: 8,
      errCount: 2,
      errorRate: 0.2,
      errorsByCode: new Map([["ERR_FACTORY", 2]]),
    };

    const serializedStats: SerializedResultStatistics = [["MyPort", stats]];

    bridge.handleInspectorData({
      ...data,
      resultStatistics: serializedStats,
    });

    const resultStats = bridge.getAllResultStatistics();
    expect(resultStats).toBeDefined();
    expect(resultStats).toBeInstanceOf(Map);
    expect(resultStats?.size).toBe(1);

    const portStats = resultStats?.get("MyPort");
    expect(portStats).toBeDefined();
    expect(portStats?.portName).toBe("MyPort");
    expect(portStats?.totalCalls).toBe(10);
    expect(portStats?.okCount).toBe(8);
    expect(portStats?.errCount).toBe(2);
    expect(portStats?.errorRate).toBe(0.2);
  });
});
