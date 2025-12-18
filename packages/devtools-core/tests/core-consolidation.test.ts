/**
 * Tests for devtools-core consolidation.
 *
 * These tests verify that:
 * 1. Transform functions produce correct output
 * 2. Filter functions work correctly
 * 3. Protocol types are properly exported
 * 4. Testing utilities are accessible internally
 */

import { describe, it, expect } from "vitest";

// Main public API imports
import {
  // Transform functions
  toDOT,
  toMermaid,
  // Filter functions
  filterGraph,
  byLifetime,
  byPortName,
  // Protocol exports
  createRequest,
  createSuccessResponse,
  createNotification,
  isRequest,
  isNotification,
  isResponse,
  ErrorCodes,
  Methods,
  // Utility exports
  formatDuration,
  formatDurationCompact,
  formatPercent,
  formatTimestamp,
} from "../src/index.js";

// Internal testing utilities (not part of public API)
import {
  createNode,
  createEdge,
  createGraph,
  createSimpleGraph,
  createComplexGraph,
  createTraceEntry,
  createTraceStats,
  createTestTraces,
  createStatsFromTraces,
  createMockDataSource,
  createMockWebSocket,
} from "../src/testing/index.js";

// =============================================================================
// Test 1: Transform Functions Produce Correct Output
// =============================================================================

describe("Transform Functions", () => {
  it("transforms produce correct output for graph data", () => {
    // Create a test graph using internal fixtures
    const graph = createSimpleGraph();

    // toJSON-like behavior on pre-built graph (graphs from toJSON are frozen)
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
    expect(Object.isFrozen(graph)).toBe(true);

    // toDOT produces valid DOT output
    const dot = toDOT(graph);
    expect(dot).toContain("digraph DependencyGraph {");
    expect(dot).toContain('"Logger"');
    expect(dot).toContain('"UserService"');
    expect(dot).toContain('"UserService" -> "Logger"');

    // toMermaid produces valid Mermaid output
    const mermaid = toMermaid(graph);
    expect(mermaid).toMatch(/^graph TD/);
    expect(mermaid).toContain('Logger["Logger (singleton)"]');
    expect(mermaid).toContain('UserService["UserService (scoped)"]');
    expect(mermaid).toContain("UserService --> Logger");
  });

  it("format utilities produce human-readable output", () => {
    // Duration formatting
    expect(formatDuration(0.5)).toBe("500μs");
    expect(formatDuration(2.5)).toBe("2.5ms");
    expect(formatDuration(123)).toBe("123ms");
    expect(formatDuration(1500)).toBe("1.50s");

    // Compact duration formatting
    expect(formatDurationCompact(0.5)).toBe("<1ms");
    expect(formatDurationCompact(123)).toBe("123ms");

    // Percentage formatting
    expect(formatPercent(3, 4)).toBe("75.0%");
    expect(formatPercent(0, 0)).toBe("0%");

    // Timestamp formatting returns locale string
    const timestamp = Date.now();
    const formatted = formatTimestamp(timestamp);
    expect(typeof formatted).toBe("string");
    expect(formatted.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Test 2: Filter Functions Work Correctly
// =============================================================================

describe("Filter Functions", () => {
  it("filters work correctly on graph data", () => {
    const graph = createComplexGraph();

    // byLifetime filter
    const singletons = filterGraph(graph, byLifetime("singleton"));
    expect(singletons.nodes.every((n) => n.lifetime === "singleton")).toBe(true);
    expect(singletons.nodes.length).toBeGreaterThan(0);

    const scopedNodes = filterGraph(graph, byLifetime("scoped"));
    expect(scopedNodes.nodes.every((n) => n.lifetime === "scoped")).toBe(true);
    expect(scopedNodes.nodes.length).toBeGreaterThan(0);

    // byPortName filter
    const userServices = filterGraph(graph, byPortName(/^User/));
    expect(userServices.nodes.every((n) => n.id.startsWith("User"))).toBe(true);

    // Custom predicate filter
    const serviceNodes = filterGraph(graph, (n) => n.id.includes("Service"));
    expect(serviceNodes.nodes.every((n) => n.id.includes("Service"))).toBe(true);

    // Verify edges are properly cleaned up (no dangling references)
    const filteredEdges = singletons.edges;
    const nodeIds = new Set(singletons.nodes.map((n) => n.id));
    for (const edge of filteredEdges) {
      expect(nodeIds.has(edge.from)).toBe(true);
      expect(nodeIds.has(edge.to)).toBe(true);
    }
  });

  it("filter returns frozen immutable structure", () => {
    const graph = createSimpleGraph();
    const filtered = filterGraph(graph, () => true);

    expect(Object.isFrozen(filtered)).toBe(true);
    expect(Object.isFrozen(filtered.nodes)).toBe(true);
    expect(Object.isFrozen(filtered.edges)).toBe(true);
  });
});

// =============================================================================
// Test 3: Protocol Types Are Properly Exported
// =============================================================================

describe("Protocol Types and Helpers", () => {
  it("protocol exports are available and functional", () => {
    // Error codes are exported with correct values
    expect(ErrorCodes.PARSE_ERROR).toBe(-32700);
    expect(ErrorCodes.INVALID_REQUEST).toBe(-32600);
    expect(ErrorCodes.METHOD_NOT_FOUND).toBe(-32601);

    // Methods are exported (with devtools. prefix)
    expect(Methods.REGISTER_APP).toBe("devtools.registerApp");
    expect(Methods.GET_GRAPH).toBe("devtools.getGraph");
    expect(Methods.GET_TRACES).toBe("devtools.getTraces");

    // Request creation helpers work (signature: id, method, params?)
    const request = createRequest(1, Methods.GET_GRAPH, { appId: "test-app" });
    expect(request.jsonrpc).toBe("2.0");
    expect(request.method).toBe("devtools.getGraph");
    expect(request.params).toEqual({ appId: "test-app" });
    expect(request.id).toBe(1);

    // Response creation helpers work (signature: id, result)
    const response = createSuccessResponse(1, { nodes: [], edges: [] });
    expect(response.jsonrpc).toBe("2.0");
    expect(response.result).toEqual({ nodes: [], edges: [] });
    expect(response.id).toBe(1);

    // Notification creation helpers work
    const notification = createNotification(Methods.DATA_UPDATE, { type: "graph" });
    expect(notification.jsonrpc).toBe("2.0");
    expect(notification.method).toBe("devtools.dataUpdate");
    expect(notification.params).toEqual({ type: "graph" });
    expect("id" in notification).toBe(false);

    // Type guards work
    expect(isRequest(request)).toBe(true);
    expect(isNotification(notification)).toBe(true);
    expect(isResponse(response)).toBe(true);

    expect(isRequest(notification)).toBe(false);
    expect(isNotification(request)).toBe(false);
    expect(isResponse(request)).toBe(false);
  });
});

// =============================================================================
// Test 4: Testing Utilities Are Accessible Internally
// =============================================================================

describe("Internal Testing Utilities", () => {
  it("graph fixtures are accessible and produce correct data", () => {
    // Node factory
    const node = createNode({ id: "TestService", lifetime: "scoped" });
    expect(node.id).toBe("TestService");
    expect(node.lifetime).toBe("scoped");
    expect(node.factoryKind).toBe("sync"); // default

    // Edge factory
    const edge = createEdge("ServiceA", "ServiceB");
    expect(edge.from).toBe("ServiceA");
    expect(edge.to).toBe("ServiceB");

    // Graph factory
    const graph = createGraph({
      nodes: [node],
      edges: [edge],
    });
    expect(graph.nodes).toHaveLength(1);
    expect(graph.edges).toHaveLength(1);
    expect(Object.isFrozen(graph)).toBe(true);

    // Pre-built graphs
    const simpleGraph = createSimpleGraph();
    expect(simpleGraph.nodes.length).toBeGreaterThan(0);

    const complexGraph = createComplexGraph();
    expect(complexGraph.nodes.length).toBeGreaterThan(simpleGraph.nodes.length);
  });

  it("trace fixtures are accessible and produce correct data", () => {
    // Trace entry factory
    const trace = createTraceEntry({
      id: "trace-1",
      portName: "UserService",
      duration: 10,
    });
    expect(trace.id).toBe("trace-1");
    expect(trace.portName).toBe("UserService");
    expect(trace.duration).toBe(10);
    expect(trace.isCacheHit).toBe(false); // default

    // Stats factory
    const stats = createTraceStats({
      totalResolutions: 100,
      cacheHitRate: 0.5,
    });
    expect(stats.totalResolutions).toBe(100);
    expect(stats.cacheHitRate).toBe(0.5);

    // Pre-built traces
    const testTraces = createTestTraces();
    expect(testTraces.length).toBeGreaterThan(0);

    // Stats from traces
    const derivedStats = createStatsFromTraces(testTraces);
    expect(derivedStats.totalResolutions).toBe(testTraces.length);
  });

  it("mock data source is accessible and functional", () => {
    const mockDataSource = createMockDataSource({
      graph: createSimpleGraph(),
    });

    // Basic data access works
    const graph = mockDataSource.getGraph();
    expect(graph.nodes.length).toBeGreaterThan(0);

    // Subscription works
    let updateCalled = false;
    const unsubscribe = mockDataSource.subscribe(() => {
      updateCalled = true;
    });

    mockDataSource._triggerUpdate();
    expect(updateCalled).toBe(true);

    unsubscribe();
  });

  it("mock WebSocket is accessible and functional", () => {
    const mockWs = createMockWebSocket({ autoOpen: true });

    // Connection works
    let opened = false;
    void mockWs.connect("ws://localhost:8080", {
      onOpen: () => { opened = true; },
      onMessage: () => {},
      onClose: () => {},
      onError: () => {},
    }).then(() => {
      expect(opened).toBe(true);
      expect(mockWs.isConnected).toBe(true);
    });

    // State tracking works
    expect(mockWs.getConnectCallCount()).toBe(1);
  });
});
