/**
 * Integration tests for the inspector data pipeline.
 *
 * Uses REAL @hex-di/core, @hex-di/graph, @hex-di/runtime packages (no mocks)
 * to verify that inspector data can survive structured clone (postMessage)
 * and that the full extraction pipeline works end-to-end.
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import {
  extractInspectorData,
  setLastCreatedInspector,
  getLastCreatedInspector,
  clearLastCreatedInspector,
} from "../../src/sandbox/container-bridge.js";
import {
  serializeLibraryInspectors,
  serializeResultStatistics,
} from "../../src/sandbox/worker-protocol.js";
import type { WorkerToMainMessage } from "../../src/sandbox/worker-protocol.js";
import { PlaygroundInspectorBridge } from "../../src/adapter/playground-inspector-bridge.js";

// =============================================================================
// Test Fixtures — Real ports, adapters, and graph
// =============================================================================

interface Logger {
  log(msg: string): void;
}

interface Database {
  query(sql: string): string;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });

function buildMinimalGraph() {
  return GraphBuilder.create()
    .provide(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      })
    )
    .provide(
      createAdapter({
        provides: DatabasePort,
        requires: [LoggerPort],
        lifetime: "transient",
        factory: deps => ({
          query: (sql: string) => `result:${sql}:${typeof deps.Logger.log}`,
        }),
      })
    )
    .build();
}

// =============================================================================
// Test 1: Real container has inspector available after createContainer
// =============================================================================

describe("real container inspector availability", () => {
  it("container.inspector is defined and has required methods", () => {
    const graph = buildMinimalGraph();
    const container = createContainer({ graph, name: "PipelineTest" });

    expect(container.inspector).toBeDefined();
    expect(typeof container.inspector.getSnapshot).toBe("function");
    expect(typeof container.inspector.getScopeTree).toBe("function");
    expect(typeof container.inspector.getGraphData).toBe("function");
    expect(typeof container.inspector.getUnifiedSnapshot).toBe("function");
    expect(typeof container.inspector.getAdapterInfo).toBe("function");
    expect(typeof container.inspector.getLibraryInspectors).toBe("function");
    expect(typeof container.inspector.getAllResultStatistics).toBe("function");
    expect(typeof container.inspector.subscribe).toBe("function");
  });

  it("inspector returns meaningful data for a real graph", () => {
    const graph = buildMinimalGraph();
    const container = createContainer({ graph, name: "PipelineTest" });
    const inspector = container.inspector;

    const snapshot = inspector.getSnapshot();
    expect(snapshot.containerName).toBe("PipelineTest");
    expect(snapshot.kind).toBe("root");

    const scopeTree = inspector.getScopeTree();
    expect(scopeTree.id).toBeDefined();

    const graphData = inspector.getGraphData();
    expect(graphData.containerName).toBe("PipelineTest");
    expect(graphData.adapters.length).toBeGreaterThan(0);

    const adapterInfo = inspector.getAdapterInfo();
    expect(adapterInfo.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Test 2: Inspector data survives structured clone (postMessage simulation)
// =============================================================================

describe("inspector data structured clone safety", () => {
  it("all inspector snapshot data survives structuredClone", () => {
    const graph = buildMinimalGraph();
    const container = createContainer({ graph, name: "CloneTest" });
    const inspector = container.inspector;

    const snapshot = inspector.getSnapshot();
    const scopeTree = inspector.getScopeTree();
    const graphData = inspector.getGraphData();
    const unifiedSnapshot = inspector.getUnifiedSnapshot();
    const adapterInfo = inspector.getAdapterInfo();
    const libraryInspectors = serializeLibraryInspectors(inspector.getLibraryInspectors());
    const resultStatistics = serializeResultStatistics(inspector.getAllResultStatistics());

    const message = {
      type: "inspector-data" as const,
      snapshot,
      scopeTree,
      graphData,
      unifiedSnapshot,
      adapterInfo,
      libraryInspectors,
      resultStatistics,
    };

    // This is the critical test — structuredClone is what postMessage uses
    const cloned = structuredClone(message);

    expect(cloned.type).toBe("inspector-data");
    expect(cloned.snapshot.containerName).toBe("CloneTest");
    expect(cloned.scopeTree.id).toBe(scopeTree.id);
    expect(cloned.graphData.containerName).toBe("CloneTest");
    expect(cloned.graphData.adapters.length).toBe(graphData.adapters.length);
    expect(cloned.adapterInfo.length).toBe(adapterInfo.length);
  });
});

// =============================================================================
// Test 3: extractInspectorData sends inspector-data via runtime hook
// =============================================================================

describe("extractInspectorData with real inspector", () => {
  beforeEach(() => {
    clearLastCreatedInspector();
  });

  it("sends inspector-data (not no-inspector) when lastCreatedInspector is set", () => {
    const graph = buildMinimalGraph();
    const container = createContainer({ graph, name: "ExtractTest" });

    setLastCreatedInspector(container.inspector);

    const postMessage = vi.fn<(msg: WorkerToMainMessage) => void>();
    extractInspectorData({}, postMessage);

    // Should NOT be no-inspector
    const noInspectorCalls = postMessage.mock.calls.filter(([msg]) => msg.type === "no-inspector");
    expect(noInspectorCalls).toHaveLength(0);

    // Should have sent inspector-data
    const inspectorDataCalls = postMessage.mock.calls.filter(
      ([msg]) => msg.type === "inspector-data"
    );
    expect(inspectorDataCalls.length).toBeGreaterThanOrEqual(1);

    const msg = inspectorDataCalls[0][0];
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

// =============================================================================
// Test 4: Full message is structured-clone safe end-to-end
// =============================================================================

describe("full pipeline structured clone safety", () => {
  beforeEach(() => {
    clearLastCreatedInspector();
  });

  it("message passed to postMessage survives structuredClone", () => {
    const graph = buildMinimalGraph();
    const container = createContainer({ graph, name: "E2ECloneTest" });

    setLastCreatedInspector(container.inspector);

    const postMessage = vi.fn<(msg: WorkerToMainMessage) => void>();
    extractInspectorData({}, postMessage);

    const inspectorDataCalls = postMessage.mock.calls.filter(
      ([msg]) => msg.type === "inspector-data"
    );
    expect(inspectorDataCalls.length).toBeGreaterThanOrEqual(1);

    // The actual message that would be passed to self.postMessage()
    const actualMessage = inspectorDataCalls[0][0];

    // This simulates what self.postMessage() does in a real Web Worker
    const cloned = structuredClone(actualMessage);

    expect(cloned.type).toBe("inspector-data");
    if (cloned.type === "inspector-data") {
      expect(cloned.snapshot.containerName).toBe("E2ECloneTest");
      expect(cloned.graphData.adapters.length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// Test 5: Instrumented createContainer wrapper captures inspector
// =============================================================================

describe("instrumented createContainer wrapper", () => {
  beforeEach(() => {
    clearLastCreatedInspector();
  });

  it("wrapper captures inspector matching worker-entry.ts pattern", () => {
    const graph = buildMinimalGraph();

    // Reproduce the exact wrapping pattern from worker-entry.ts
    const originalCreateContainer = createContainer;
    const wrapped = (...args: Parameters<typeof originalCreateContainer>) => {
      const container = originalCreateContainer(...args);
      if (container.inspector) {
        setLastCreatedInspector(container.inspector);
      }
      return container;
    };

    const container = wrapped({ graph, name: "WrapperTest" });

    expect(getLastCreatedInspector()).toBeDefined();
    expect(getLastCreatedInspector()).toBe(container.inspector);
  });

  it("wrapped container still functions correctly", async () => {
    const graph = buildMinimalGraph();

    const originalCreateContainer = createContainer;
    const wrapped = (...args: Parameters<typeof originalCreateContainer>) => {
      const container = originalCreateContainer(...args);
      if (container.inspector) {
        setLastCreatedInspector(container.inspector);
      }
      return container;
    };

    const container = wrapped({ graph, name: "FuncTest" });
    const initialized = await container.initialize();
    const logger = initialized.resolve(LoggerPort);
    expect(typeof logger.log).toBe("function");
  });
});

// =============================================================================
// Test 6: Module namespace spread + destructuring (simulates compiled user code)
// =============================================================================

describe("module namespace spread with destructuring", () => {
  beforeEach(() => {
    clearLastCreatedInspector();
  });

  it("destructuring from spread object gets the instrumented createContainer", () => {
    // Simulate what worker-entry.ts does: spread the runtime module and override
    const hexDiRuntime = { createContainer, GraphBuilder: {} };
    const originalCreateContainer = hexDiRuntime.createContainer;
    const instrumentedRuntime = {
      ...hexDiRuntime,
      createContainer(...args: Parameters<typeof originalCreateContainer>) {
        const container = originalCreateContainer(...args);
        if (container.inspector) {
          setLastCreatedInspector(container.inspector);
        }
        return container;
      },
    };

    // Simulate what compiled user code does:
    // const { createContainer } = globalThis.__hexModules["@hex-di/runtime"]
    const { createContainer: userCreateContainer } = instrumentedRuntime;

    const graph = buildMinimalGraph();
    const container = userCreateContainer({ graph, name: "DestructureTest" });

    // The critical assertion: destructuring should get the INSTRUMENTED version
    expect(getLastCreatedInspector()).toBeDefined();
    expect(getLastCreatedInspector()).toBe(container.inspector);
  });

  it("end-to-end: destructured createContainer → extractInspectorData → structured clone", () => {
    // Full simulation of the worker pipeline
    const hexDiRuntime = { createContainer };
    const originalCreateContainer = hexDiRuntime.createContainer;
    const instrumentedRuntime = {
      ...hexDiRuntime,
      createContainer(...args: Parameters<typeof originalCreateContainer>) {
        const container = originalCreateContainer(...args);
        if (container.inspector) {
          setLastCreatedInspector(container.inspector);
        }
        return container;
      },
    };

    // Simulate user code destructuring
    const { createContainer: userCreateContainer } = instrumentedRuntime;

    // Simulate user code execution
    const graph = buildMinimalGraph();
    userCreateContainer({ graph, name: "FullE2E" });

    // Simulate extractInspectorData after user code runs
    const postMessage = vi.fn<(msg: WorkerToMainMessage) => void>();
    extractInspectorData({}, postMessage);

    // Should have sent inspector-data
    const inspectorDataCalls = postMessage.mock.calls.filter(
      ([msg]) => msg.type === "inspector-data"
    );
    expect(inspectorDataCalls.length).toBeGreaterThanOrEqual(1);

    // Should survive structured clone
    const actualMessage = inspectorDataCalls[0][0];
    const cloned = structuredClone(actualMessage);
    expect(cloned.type).toBe("inspector-data");
    if (cloned.type === "inspector-data") {
      expect(cloned.snapshot.containerName).toBe("FullE2E");
    }
  });
});

// =============================================================================
// Test 7: PlaygroundInspectorBridge receives and caches real inspector data
// =============================================================================

describe("PlaygroundInspectorBridge with real inspector data", () => {
  beforeEach(() => {
    clearLastCreatedInspector();
  });

  it("bridge caches data from handleWorkerMessage with real inspector data", () => {
    const graph = buildMinimalGraph();
    const container = createContainer({ graph, name: "BridgeTest" });
    setLastCreatedInspector(container.inspector);

    // Capture the message that extractInspectorData would send
    const messages: WorkerToMainMessage[] = [];
    extractInspectorData({}, msg => messages.push(msg));

    const inspectorDataMsg = messages.find(m => m.type === "inspector-data");
    expect(inspectorDataMsg).toBeDefined();
    if (inspectorDataMsg === undefined) return;

    // Simulate structured clone (postMessage boundary)
    const clonedMsg = structuredClone(inspectorDataMsg);

    // Feed the cloned message into the bridge (simulates main thread receiving it)
    const bridge = new PlaygroundInspectorBridge();
    bridge.handleWorkerMessage(clonedMsg);

    // The bridge should now have cached data
    expect(bridge.getSnapshot()).toBeDefined();
    expect(bridge.getSnapshot()?.containerName).toBe("BridgeTest");
    expect(bridge.getScopeTree()).toBeDefined();
    expect(bridge.getGraphData()).toBeDefined();
    expect(bridge.getGraphData()?.adapters.length).toBeGreaterThan(0);
    expect(bridge.getUnifiedSnapshot()).toBeDefined();
    expect(bridge.getAdapterInfo()).toBeDefined();
    expect(bridge.getLibraryInspectors()).toBeDefined();
    expect(bridge.getAllResultStatistics()).toBeDefined();
  });

  it("bridge notifies subscribers when inspector data arrives", () => {
    const graph = buildMinimalGraph();
    const container = createContainer({ graph, name: "NotifyTest" });
    setLastCreatedInspector(container.inspector);

    const messages: WorkerToMainMessage[] = [];
    extractInspectorData({}, msg => messages.push(msg));

    const inspectorDataMsg = messages.find(m => m.type === "inspector-data");
    expect(inspectorDataMsg).toBeDefined();
    if (inspectorDataMsg === undefined) return;
    const clonedMsg = structuredClone(inspectorDataMsg);

    const bridge = new PlaygroundInspectorBridge();
    const notified = vi.fn();
    bridge.subscribe(notified);

    bridge.handleWorkerMessage(clonedMsg);

    expect(notified).toHaveBeenCalledTimes(1);
    expect(notified).toHaveBeenCalledWith({ type: "snapshot-changed" });
  });
});

// =============================================================================
// Test 8: clearLastCreatedInspector prevents stale data between runs
// =============================================================================

describe("inspector state isolation between runs", () => {
  beforeEach(() => {
    clearLastCreatedInspector();
  });

  it("clear prevents stale inspector from previous run", () => {
    const graph = buildMinimalGraph();
    const container1 = createContainer({ graph, name: "Run1" });

    setLastCreatedInspector(container1.inspector);
    expect(getLastCreatedInspector()).toBe(container1.inspector);

    // Simulate clearing between runs (what executeUserCode does)
    clearLastCreatedInspector();
    expect(getLastCreatedInspector()).toBeUndefined();

    // Simulate new run with a fresh graph
    const graph2 = buildMinimalGraph();
    const container2 = createContainer({ graph: graph2, name: "Run2" });
    setLastCreatedInspector(container2.inspector);

    expect(getLastCreatedInspector()).toBe(container2.inspector);
    expect(getLastCreatedInspector()).not.toBe(container1.inspector);
  });
});
