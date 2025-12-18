/**
 * Network layer integration tests.
 *
 * Tests for LocalDataSource, RemoteDataSource, ClientRegistry, and protocol
 * message serialization.
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import type { ExportedGraph } from "@hex-di/devtools-core";
import {
  LocalDataSource,
  RemoteDataSource,
  ClientRegistry,
  createRequest,
  createSuccessResponse,
  createErrorResponse,
  createNotification,
  serializeMessage,
  parseMessage,
  Methods,
  ErrorCodes,
  isRequest,
  isResponse,
  isErrorResponse,
  isNotification,
  type WebSocketLike,
} from "../../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(msg: string): void;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");

// =============================================================================
// Test: LocalDataSource provides graph data
// =============================================================================

describe("LocalDataSource", () => {
  it("provides graph data from a local graph", () => {
    // Create a simple graph for testing
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: (msg: string) => console.log(msg) }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();

    // Create LocalDataSource
    const dataSource = new LocalDataSource(graph);

    // Get the graph
    const exportedGraph = dataSource.getGraph();

    // Verify graph structure
    expect(exportedGraph).toBeDefined();
    expect(exportedGraph.nodes).toHaveLength(1);
    expect(exportedGraph.nodes[0]?.id).toBe("Logger");
    expect(exportedGraph.nodes[0]?.lifetime).toBe("singleton");
    expect(exportedGraph.edges).toHaveLength(0);
  });

  it("subscribes to graph updates", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const dataSource = new LocalDataSource(graph);

    // Track callback invocations
    const callback = vi.fn();

    // Subscribe
    const unsubscribe = dataSource.subscribeToGraph(callback);

    // Callback should be invoked immediately with current graph
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        nodes: expect.arrayContaining([
          expect.objectContaining({ id: "Logger" }),
        ]),
      })
    );

    // Unsubscribe
    unsubscribe();
  });

  it("connects and disconnects properly", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const dataSource = new LocalDataSource(graph);

    // Listen for events
    const events: string[] = [];
    dataSource.on((event) => events.push(event.type));

    // Connect
    await dataSource.connect();
    expect(dataSource.state).toBe("connected");
    expect(events).toContain("connected");
    expect(events).toContain("graph_update");

    // Disconnect
    dataSource.disconnect();
    expect(dataSource.state).toBe("disconnected");
    expect(events).toContain("disconnected");
  });
});

// =============================================================================
// Test: RemoteDataSource connects via WebSocket
// =============================================================================

describe("RemoteDataSource", () => {
  let mockSocket: WebSocketLike;
  let messageHandler: ((event: { data: string }) => void) | null;
  let openHandler: (() => void) | null;

  beforeEach(() => {
    messageHandler = null;
    openHandler = null;

    mockSocket = {
      readyState: 1, // OPEN
      send: vi.fn(),
      close: vi.fn(),
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null,
    };

    // Capture handlers when they're set
    Object.defineProperty(mockSocket, "onopen", {
      set: (fn) => { openHandler = fn; },
      get: () => openHandler,
    });
    Object.defineProperty(mockSocket, "onmessage", {
      set: (fn) => { messageHandler = fn; },
      get: () => messageHandler,
    });
  });

  it("connects via WebSocket and fetches initial data", async () => {
    const mockGraph: ExportedGraph = {
      nodes: [{ id: "TestService", label: "TestService", lifetime: "singleton", factoryKind: "sync" }],
      edges: [],
    };

    const dataSource = new RemoteDataSource({
      url: "ws://localhost:9229/devtools",
      appId: "test-app",
      autoReconnect: false,
      refreshInterval: 0,
      createWebSocket: () => mockSocket,
    });

    // Start connection
    const connectPromise = dataSource.connect();

    // Simulate WebSocket open
    openHandler?.();

    // Wait for connection state to update
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Simulate responses to initial data requests
    // GET_GRAPH response
    setTimeout(() => {
      messageHandler?.({
        data: JSON.stringify(createSuccessResponse(1, { graph: mockGraph })),
      });
    }, 0);

    // GET_TRACES response
    setTimeout(() => {
      messageHandler?.({
        data: JSON.stringify(createSuccessResponse(2, { traces: [] })),
      });
    }, 10);

    // GET_STATS response
    setTimeout(() => {
      messageHandler?.({
        data: JSON.stringify(createSuccessResponse(3, { stats: {
          totalResolutions: 0,
          averageDuration: 0,
          cacheHitRate: 0,
          slowCount: 0,
          sessionStart: Date.now(),
          totalDuration: 0,
        }})),
      });
    }, 20);

    // GET_CONTAINER_SNAPSHOT response
    setTimeout(() => {
      messageHandler?.({
        data: JSON.stringify(createSuccessResponse(4, { snapshot: null })),
      });
    }, 30);

    await connectPromise;

    // Verify connection state
    expect(dataSource.state).toBe("connected");
    expect(dataSource.isConnected).toBe(true);
    expect(dataSource.appId).toBe("test-app");

    // Verify graph data was cached
    const graph = dataSource.getGraph();
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0]?.id).toBe("TestService");

    // Cleanup
    dataSource.disconnect();
  });

  it("handles disconnect and reconnect", async () => {
    const dataSource = new RemoteDataSource({
      url: "ws://localhost:9229/devtools",
      appId: "test-app",
      autoReconnect: false,
      refreshInterval: 0,
      createWebSocket: () => mockSocket,
    });

    // Track events
    const events: string[] = [];
    dataSource.on((event) => events.push(event.type));

    // Connect
    const connectPromise = dataSource.connect();
    openHandler?.();

    // Simulate data responses
    setTimeout(() => {
      messageHandler?.({
        data: JSON.stringify(createSuccessResponse(1, { graph: { nodes: [], edges: [] } })),
      });
      messageHandler?.({
        data: JSON.stringify(createSuccessResponse(2, { traces: [] })),
      });
      messageHandler?.({
        data: JSON.stringify(createSuccessResponse(3, { stats: {
          totalResolutions: 0, averageDuration: 0, cacheHitRate: 0,
          slowCount: 0, sessionStart: Date.now(), totalDuration: 0,
        }})),
      });
      messageHandler?.({
        data: JSON.stringify(createSuccessResponse(4, { snapshot: null })),
      });
    }, 0);

    await connectPromise;
    expect(events).toContain("connected");

    // Disconnect
    dataSource.disconnect();
    expect(events).toContain("disconnected");
    expect(dataSource.state).toBe("disconnected");
  });
});

// =============================================================================
// Test: ClientRegistry handles multiple apps
// =============================================================================

describe("ClientRegistry", () => {
  it("handles multiple apps registration and listing", () => {
    const registry = new ClientRegistry<{ id: string }>();

    // Register multiple apps
    const socket1 = { id: "socket-1" };
    const socket2 = { id: "socket-2" };
    const socket3 = { id: "socket-3" };

    registry.registerApp(socket1, "app-1", "App One", "1.0.0", "0.1.0");
    registry.registerApp(socket2, "app-2", "App Two", "2.0.0", "0.1.0");
    registry.registerApp(socket3, "app-3", "App Three", "3.0.0", "0.1.0");

    // Verify all apps are registered
    expect(registry.size).toBe(3);
    expect(registry.hasApp("app-1")).toBe(true);
    expect(registry.hasApp("app-2")).toBe(true);
    expect(registry.hasApp("app-3")).toBe(true);

    // List all apps
    const apps = registry.listApps();
    expect(apps).toHaveLength(3);
    expect(apps.map((a) => a.appId)).toContain("app-1");
    expect(apps.map((a) => a.appId)).toContain("app-2");
    expect(apps.map((a) => a.appId)).toContain("app-3");

    // Get specific app
    const app1 = registry.getApp("app-1");
    expect(app1).toBeDefined();
    expect(app1?.appName).toBe("App One");
    expect(app1?.appVersion).toBe("1.0.0");
    expect(app1?.socket).toBe(socket1);

    // Get app by socket
    const appBySocket = registry.getAppBySocket(socket2);
    expect(appBySocket).toBeDefined();
    expect(appBySocket?.appId).toBe("app-2");
  });

  it("notifies listeners on connect and disconnect", () => {
    const registry = new ClientRegistry<{ id: string }>();
    const listener = vi.fn();

    registry.addListener(listener);

    // Register an app
    const socket = { id: "socket-1" };
    registry.registerApp(socket, "app-1", "App One", "1.0.0", "0.1.0");

    // Should notify on connect
    expect(listener).toHaveBeenCalledWith("connected", expect.objectContaining({
      appId: "app-1",
      appName: "App One",
    }));

    // Unregister by socket
    registry.unregisterBySocket(socket);

    // Should notify on disconnect
    expect(listener).toHaveBeenCalledWith("disconnected", expect.objectContaining({
      appId: "app-1",
    }));

    expect(registry.size).toBe(0);
  });

  it("handles re-registration of same app ID", () => {
    const registry = new ClientRegistry<{ id: string }>();

    const socket1 = { id: "socket-1" };
    const socket2 = { id: "socket-2" };

    // Register app with first socket
    registry.registerApp(socket1, "app-1", "App One v1", "1.0.0", "0.1.0");

    // Re-register same app ID with new socket
    registry.registerApp(socket2, "app-1", "App One v2", "2.0.0", "0.1.0");

    // Should only have one registration
    expect(registry.size).toBe(1);

    // Should have updated info
    const app = registry.getApp("app-1");
    expect(app?.appName).toBe("App One v2");
    expect(app?.socket).toBe(socket2);

    // Old socket should not be linked
    expect(registry.getAppBySocket(socket1)).toBeUndefined();
  });

  it("clears all registrations", () => {
    const registry = new ClientRegistry<{ id: string }>();
    const listener = vi.fn();
    registry.addListener(listener);

    registry.registerApp({ id: "s1" }, "app-1", "App 1", "1.0.0", "0.1.0");
    registry.registerApp({ id: "s2" }, "app-2", "App 2", "1.0.0", "0.1.0");

    // Clear listener mock
    listener.mockClear();

    // Clear all
    registry.clear();

    // Should notify disconnect for each
    expect(listener).toHaveBeenCalledTimes(2);
    expect(registry.size).toBe(0);
  });
});

// =============================================================================
// Test: Protocol messages serialize correctly
// =============================================================================

describe("Protocol message serialization", () => {
  it("creates and serializes request messages", () => {
    const request = createRequest(1, Methods.GET_GRAPH, { appId: "test-app" });

    expect(request.jsonrpc).toBe("2.0");
    expect(request.id).toBe(1);
    expect(request.method).toBe("devtools.getGraph");
    expect(request.params).toEqual({ appId: "test-app" });

    // Serialize
    const json = serializeMessage(request);
    const parsed = JSON.parse(json);

    expect(parsed.jsonrpc).toBe("2.0");
    expect(parsed.id).toBe(1);
    expect(parsed.method).toBe("devtools.getGraph");
  });

  it("creates and serializes success responses", () => {
    const response = createSuccessResponse(1, { graph: { nodes: [], edges: [] } });

    expect(response.jsonrpc).toBe("2.0");
    expect(response.id).toBe(1);
    expect(response.result).toEqual({ graph: { nodes: [], edges: [] } });

    // Serialize and parse
    const json = serializeMessage(response);
    const parsed = JSON.parse(json);

    expect(parsed.result.graph.nodes).toEqual([]);
  });

  it("creates and serializes error responses", () => {
    const error = createErrorResponse(1, ErrorCodes.APP_NOT_FOUND, "App not found", { appId: "unknown" });

    expect(error.jsonrpc).toBe("2.0");
    expect(error.id).toBe(1);
    expect(error.error.code).toBe(-32001);
    expect(error.error.message).toBe("App not found");
    expect(error.error.data).toEqual({ appId: "unknown" });

    // Serialize
    const json = serializeMessage(error);
    const parsed = JSON.parse(json);

    expect(parsed.error.code).toBe(-32001);
  });

  it("creates and serializes notifications", () => {
    const notification = createNotification(Methods.DATA_UPDATE, { type: "graph" });

    expect(notification.jsonrpc).toBe("2.0");
    expect(notification.method).toBe("devtools.dataUpdate");
    expect(notification.params).toEqual({ type: "graph" });
    expect("id" in notification).toBe(false);

    // Serialize
    const json = serializeMessage(notification);
    const parsed = JSON.parse(json);

    expect(parsed.method).toBe("devtools.dataUpdate");
    expect(parsed.id).toBeUndefined();
  });

  it("parses and validates messages correctly", () => {
    // Valid request
    const requestJson = JSON.stringify(createRequest(1, Methods.GET_GRAPH, { appId: "test" }));
    const requestResult = parseMessage(requestJson);

    expect(requestResult.success).toBe(true);
    if (requestResult.success) {
      expect(isRequest(requestResult.message)).toBe(true);
    }

    // Valid response
    const responseJson = JSON.stringify(createSuccessResponse(1, { test: true }));
    const responseResult = parseMessage(responseJson);

    expect(responseResult.success).toBe(true);
    if (responseResult.success) {
      expect(isResponse(responseResult.message)).toBe(true);
    }

    // Valid error response
    const errorJson = JSON.stringify(createErrorResponse(1, -32600, "Invalid"));
    const errorResult = parseMessage(errorJson);

    expect(errorResult.success).toBe(true);
    if (errorResult.success) {
      expect(isErrorResponse(errorResult.message as ReturnType<typeof createSuccessResponse> | ReturnType<typeof createErrorResponse>)).toBe(true);
    }

    // Valid notification
    const notificationJson = JSON.stringify(createNotification("test.method", {}));
    const notificationResult = parseMessage(notificationJson);

    expect(notificationResult.success).toBe(true);
    if (notificationResult.success) {
      expect(isNotification(notificationResult.message)).toBe(true);
    }

    // Invalid JSON
    const invalidResult = parseMessage("not json");
    expect(invalidResult.success).toBe(false);
    if (!invalidResult.success) {
      expect(invalidResult.error).toContain("JSON parse error");
    }

    // Invalid structure
    const invalidStructureResult = parseMessage('{"foo": "bar"}');
    expect(invalidStructureResult.success).toBe(false);
    if (!invalidStructureResult.success) {
      expect(invalidStructureResult.error).toContain("Invalid JSON-RPC");
    }
  });

  it("uses correct method constants", () => {
    // Verify method constants match expected values
    expect(Methods.REGISTER_APP).toBe("devtools.registerApp");
    expect(Methods.GET_GRAPH).toBe("devtools.getGraph");
    expect(Methods.GET_TRACES).toBe("devtools.getTraces");
    expect(Methods.GET_STATS).toBe("devtools.getStats");
    expect(Methods.GET_CONTAINER_SNAPSHOT).toBe("devtools.getContainerSnapshot");
    expect(Methods.TRACE_CONTROL).toBe("devtools.traceControl");
    expect(Methods.PIN_TRACE).toBe("devtools.pinTrace");
    expect(Methods.DATA_UPDATE).toBe("devtools.dataUpdate");
    expect(Methods.LIST_APPS).toBe("devtools.listApps");
  });

  it("uses correct error code constants", () => {
    expect(ErrorCodes.PARSE_ERROR).toBe(-32700);
    expect(ErrorCodes.INVALID_REQUEST).toBe(-32600);
    expect(ErrorCodes.METHOD_NOT_FOUND).toBe(-32601);
    expect(ErrorCodes.INVALID_PARAMS).toBe(-32602);
    expect(ErrorCodes.INTERNAL_ERROR).toBe(-32603);
    expect(ErrorCodes.APP_NOT_FOUND).toBe(-32001);
    expect(ErrorCodes.NOT_CONNECTED).toBe(-32002);
    expect(ErrorCodes.TIMEOUT).toBe(-32003);
  });
});
