/**
 * Tests for DevToolsClient.
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { createMockWebSocket, type MockWebSocketActions } from "@hex-di/devtools-testing";
import {
  Methods,
  createSuccessResponse,
  createErrorResponse,
  ErrorCodes,
} from "@hex-di/devtools-core";
import { DevToolsClient, type ClientEventListener } from "../src/client/client.js";
import type { WebSocketService } from "../src/client/ports/websocket.port.js";

describe("DevToolsClient", () => {
  let mockWebSocket: WebSocketService & MockWebSocketActions;
  let client: DevToolsClient;

  beforeEach(() => {
    mockWebSocket = createMockWebSocket();
    client = new DevToolsClient({
      url: "ws://localhost:9229/devtools",
      webSocket: mockWebSocket,
      autoReconnect: false,
      requestTimeout: 1000,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ===========================================================================
  // Connection
  // ===========================================================================

  describe("connect", () => {
    it("should connect to the WebSocket server", async () => {
      const connectPromise = client.connect();
      mockWebSocket.simulateOpen();
      await connectPromise;

      expect(client.connected).toBe(true);
      expect(mockWebSocket.getConnectedUrl()).toBe("ws://localhost:9229/devtools");
    });

    it("should emit connected event", async () => {
      const listener = vi.fn<ClientEventListener>();
      client.on(listener);

      const connectPromise = client.connect();
      mockWebSocket.simulateOpen();
      await connectPromise;

      expect(listener).toHaveBeenCalledWith({ type: "connected" });
    });

    it("should throw error when no WebSocket service provided", async () => {
      const clientWithoutWs = new DevToolsClient();

      await expect(clientWithoutWs.connect()).rejects.toThrow("No WebSocket service provided");
    });

    it("should not reconnect if already connected", async () => {
      const connectPromise = client.connect();
      mockWebSocket.simulateOpen();
      await connectPromise;

      // Try to connect again
      await client.connect();

      expect(mockWebSocket.getConnectCallCount()).toBe(1);
    });

    it("should emit error event on WebSocket error", async () => {
      const listener = vi.fn<ClientEventListener>();
      client.on(listener);

      const connectPromise = client.connect();
      const error = new Error("Connection failed");
      mockWebSocket.simulateError(error);

      await expect(connectPromise).rejects.toThrow("Connection failed");

      expect(listener).toHaveBeenCalledWith({
        type: "error",
        error: expect.any(Error),
      });
    });
  });

  // ===========================================================================
  // Disconnection
  // ===========================================================================

  describe("disconnect", () => {
    it("should disconnect from the server", async () => {
      const connectPromise = client.connect();
      mockWebSocket.simulateOpen();
      await connectPromise;

      client.disconnect();
      await vi.waitFor(() => expect(mockWebSocket.getState()).toBe("closed"));

      expect(client.connected).toBe(false);
    });

    it("should emit disconnected event", async () => {
      const listener = vi.fn<ClientEventListener>();
      client.on(listener);

      const connectPromise = client.connect();
      mockWebSocket.simulateOpen();
      await connectPromise;

      client.disconnect();
      await vi.waitFor(() => {
        expect(listener).toHaveBeenCalledWith({ type: "disconnected" });
      });
    });
  });

  // ===========================================================================
  // Event Listeners
  // ===========================================================================

  describe("event listeners", () => {
    it("should add event listener", async () => {
      const listener = vi.fn<ClientEventListener>();
      client.on(listener);

      const connectPromise = client.connect();
      mockWebSocket.simulateOpen();
      await connectPromise;

      expect(listener).toHaveBeenCalled();
    });

    it("should remove event listener", async () => {
      const listener = vi.fn<ClientEventListener>();
      client.on(listener);
      client.off(listener);

      const connectPromise = client.connect();
      mockWebSocket.simulateOpen();
      await connectPromise;

      expect(listener).not.toHaveBeenCalled();
    });

    it("should not throw if listener throws", async () => {
      const badListener = vi.fn<ClientEventListener>(() => {
        throw new Error("Listener error");
      });
      client.on(badListener);

      const connectPromise = client.connect();
      mockWebSocket.simulateOpen();

      await expect(connectPromise).resolves.toBeUndefined();
    });
  });

  // ===========================================================================
  // listApps
  // ===========================================================================

  describe("listApps", () => {
    beforeEach(async () => {
      const connectPromise = client.connect();
      mockWebSocket.simulateOpen();
      await connectPromise;
    });

    it("should list available apps", async () => {
      const listAppsPromise = client.listApps();

      // Simulate server response
      const messages = mockWebSocket.getSentMessages();
      const request = JSON.parse(messages[0]!);
      expect(request.method).toBe(Methods.LIST_APPS);

      const response = createSuccessResponse(request.id, {
        apps: [
          { appId: "app1", appName: "App 1" },
          { appId: "app2", appName: "App 2" },
        ],
      });
      mockWebSocket.simulateMessage(JSON.stringify(response));

      const apps = await listAppsPromise;

      expect(apps).toHaveLength(2);
      expect(apps[0]).toEqual({ appId: "app1", appName: "App 1" });
    });

    it("should throw error when not connected", async () => {
      client.disconnect();
      await vi.waitFor(() => expect(mockWebSocket.getState()).toBe("closed"));

      await expect(client.listApps()).rejects.toThrow("Not connected");
    });
  });

  // ===========================================================================
  // getGraph
  // ===========================================================================

  describe("getGraph", () => {
    beforeEach(async () => {
      const connectPromise = client.connect();
      mockWebSocket.simulateOpen();
      await connectPromise;
    });

    it("should get graph from an app", async () => {
      const getGraphPromise = client.getGraph("app1");

      const messages = mockWebSocket.getSentMessages();
      const request = JSON.parse(messages[0]!);
      expect(request.method).toBe(Methods.GET_GRAPH);
      expect(request.params.appId).toBe("app1");

      const testGraph = { nodes: [], edges: [] };
      const response = createSuccessResponse(request.id, { graph: testGraph });
      mockWebSocket.simulateMessage(JSON.stringify(response));

      const graph = await getGraphPromise;

      expect(graph).toEqual(testGraph);
    });
  });

  // ===========================================================================
  // getTraces
  // ===========================================================================

  describe("getTraces", () => {
    beforeEach(async () => {
      const connectPromise = client.connect();
      mockWebSocket.simulateOpen();
      await connectPromise;
    });

    it("should get traces from an app", async () => {
      const getTracesPromise = client.getTraces("app1");

      const messages = mockWebSocket.getSentMessages();
      const request = JSON.parse(messages[0]!);
      expect(request.method).toBe(Methods.GET_TRACES);

      const testTraces = [{ id: "trace1", portName: "Logger" }];
      const response = createSuccessResponse(request.id, { traces: testTraces });
      mockWebSocket.simulateMessage(JSON.stringify(response));

      const traces = await getTracesPromise;

      expect(traces).toEqual(testTraces);
    });
  });

  // ===========================================================================
  // getStats
  // ===========================================================================

  describe("getStats", () => {
    beforeEach(async () => {
      const connectPromise = client.connect();
      mockWebSocket.simulateOpen();
      await connectPromise;
    });

    it("should get stats from an app", async () => {
      const getStatsPromise = client.getStats("app1");

      const messages = mockWebSocket.getSentMessages();
      const request = JSON.parse(messages[0]!);
      expect(request.method).toBe(Methods.GET_STATS);

      const testStats = { totalResolutions: 100, averageDuration: 5.5 };
      const response = createSuccessResponse(request.id, { stats: testStats });
      mockWebSocket.simulateMessage(JSON.stringify(response));

      const stats = await getStatsPromise;

      expect(stats).toEqual(testStats);
    });
  });

  // ===========================================================================
  // getSnapshot
  // ===========================================================================

  describe("getSnapshot", () => {
    beforeEach(async () => {
      const connectPromise = client.connect();
      mockWebSocket.simulateOpen();
      await connectPromise;
    });

    it("should get snapshot from an app", async () => {
      const getSnapshotPromise = client.getSnapshot("app1");

      const messages = mockWebSocket.getSentMessages();
      const request = JSON.parse(messages[0]!);
      expect(request.method).toBe(Methods.GET_CONTAINER_SNAPSHOT);

      const testSnapshot = { scopes: [], rootScopeId: "root" };
      const response = createSuccessResponse(request.id, { snapshot: testSnapshot });
      mockWebSocket.simulateMessage(JSON.stringify(response));

      const snapshot = await getSnapshotPromise;

      expect(snapshot).toEqual(testSnapshot);
    });

    it("should return null when no snapshot available", async () => {
      const getSnapshotPromise = client.getSnapshot("app1");

      const messages = mockWebSocket.getSentMessages();
      const request = JSON.parse(messages[0]!);

      const response = createSuccessResponse(request.id, { snapshot: null });
      mockWebSocket.simulateMessage(JSON.stringify(response));

      const snapshot = await getSnapshotPromise;

      expect(snapshot).toBeNull();
    });
  });

  // ===========================================================================
  // Control Methods
  // ===========================================================================

  describe("control methods", () => {
    beforeEach(async () => {
      const connectPromise = client.connect();
      mockWebSocket.simulateOpen();
      await connectPromise;
    });

    it("should pause tracing", async () => {
      const pausePromise = client.pauseTracing("app1");

      const messages = mockWebSocket.getSentMessages();
      const request = JSON.parse(messages[0]!);
      expect(request.method).toBe(Methods.TRACE_CONTROL);
      expect(request.params.action).toBe("pause");

      const response = createSuccessResponse(request.id, { success: true });
      mockWebSocket.simulateMessage(JSON.stringify(response));

      await expect(pausePromise).resolves.toBeUndefined();
    });

    it("should resume tracing", async () => {
      const resumePromise = client.resumeTracing("app1");

      const messages = mockWebSocket.getSentMessages();
      const request = JSON.parse(messages[0]!);
      expect(request.params.action).toBe("resume");

      const response = createSuccessResponse(request.id, { success: true });
      mockWebSocket.simulateMessage(JSON.stringify(response));

      await expect(resumePromise).resolves.toBeUndefined();
    });

    it("should clear traces", async () => {
      const clearPromise = client.clearTraces("app1");

      const messages = mockWebSocket.getSentMessages();
      const request = JSON.parse(messages[0]!);
      expect(request.params.action).toBe("clear");

      const response = createSuccessResponse(request.id, { success: true });
      mockWebSocket.simulateMessage(JSON.stringify(response));

      await expect(clearPromise).resolves.toBeUndefined();
    });

    it("should pin trace", async () => {
      const pinPromise = client.pinTrace("app1", "trace1");

      const messages = mockWebSocket.getSentMessages();
      const request = JSON.parse(messages[0]!);
      expect(request.method).toBe(Methods.PIN_TRACE);
      expect(request.params.pin).toBe(true);

      const response = createSuccessResponse(request.id, { success: true });
      mockWebSocket.simulateMessage(JSON.stringify(response));

      await expect(pinPromise).resolves.toBeUndefined();
    });

    it("should unpin trace", async () => {
      const unpinPromise = client.unpinTrace("app1", "trace1");

      const messages = mockWebSocket.getSentMessages();
      const request = JSON.parse(messages[0]!);
      expect(request.params.pin).toBe(false);

      const response = createSuccessResponse(request.id, { success: true });
      mockWebSocket.simulateMessage(JSON.stringify(response));

      await expect(unpinPromise).resolves.toBeUndefined();
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe("error handling", () => {
    beforeEach(async () => {
      const connectPromise = client.connect();
      mockWebSocket.simulateOpen();
      await connectPromise;
    });

    it("should reject on server error response", async () => {
      const listAppsPromise = client.listApps();

      const messages = mockWebSocket.getSentMessages();
      const request = JSON.parse(messages[0]!);

      const response = createErrorResponse(
        request.id,
        ErrorCodes.INTERNAL_ERROR,
        "Internal server error"
      );
      mockWebSocket.simulateMessage(JSON.stringify(response));

      await expect(listAppsPromise).rejects.toThrow("Internal server error");
    });

    it("should timeout if no response received", async () => {
      // Create a new client with a short timeout for this test
      const shortTimeoutMockWs = createMockWebSocket({ autoOpen: true });
      const shortTimeoutClient = new DevToolsClient({
        webSocket: shortTimeoutMockWs,
        requestTimeout: 100, // Short timeout for testing
      });
      await shortTimeoutClient.connect();

      const listAppsPromise = shortTimeoutClient.listApps();

      // Wait for the timeout to occur naturally
      await expect(listAppsPromise).rejects.toThrow("Request timeout");

      shortTimeoutClient.disconnect();
    });

    it("should handle invalid JSON messages gracefully", async () => {
      // This shouldn't throw, just be ignored
      mockWebSocket.simulateMessage("invalid json");

      // Client should still work
      const listAppsPromise = client.listApps();

      const messages = mockWebSocket.getSentMessages();
      const request = JSON.parse(messages[0]!);

      const response = createSuccessResponse(request.id, { apps: [] });
      mockWebSocket.simulateMessage(JSON.stringify(response));

      const apps = await listAppsPromise;
      expect(apps).toEqual([]);
    });
  });

  // ===========================================================================
  // Reconnection
  // ===========================================================================

  describe("reconnection", () => {
    it("should attempt reconnect on disconnect when autoReconnect is true", async () => {
      vi.useFakeTimers();

      const reconnectClient = new DevToolsClient({
        webSocket: mockWebSocket,
        autoReconnect: true,
        reconnectDelay: 100,
      });

      const connectPromise = reconnectClient.connect();
      mockWebSocket.simulateOpen();
      await connectPromise;

      // Simulate disconnect
      mockWebSocket.simulateClose();

      // Wait for reconnect
      await vi.advanceTimersByTimeAsync(150);

      // Should have attempted to reconnect
      expect(mockWebSocket.getConnectCallCount()).toBeGreaterThan(1);

      reconnectClient.disconnect();
      vi.useRealTimers();
    });

    it("should not reconnect when explicitly disconnected", async () => {
      const reconnectClient = new DevToolsClient({
        webSocket: mockWebSocket,
        autoReconnect: true,
        reconnectDelay: 100,
      });

      const connectPromise = reconnectClient.connect();
      mockWebSocket.simulateOpen();
      await connectPromise;

      // Explicitly disconnect
      reconnectClient.disconnect();
      await vi.waitFor(() => expect(mockWebSocket.getState()).toBe("closed"));

      const connectCount = mockWebSocket.getConnectCallCount();

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should not have reconnected
      expect(mockWebSocket.getConnectCallCount()).toBe(connectCount);
    });
  });

  // ===========================================================================
  // Default Options
  // ===========================================================================

  describe("default options", () => {
    it("should use default URL", () => {
      const defaultClient = new DevToolsClient({ webSocket: mockWebSocket });

      void defaultClient.connect();

      expect(mockWebSocket.getConnectedUrl()).toBe("ws://localhost:9229/devtools");
    });
  });
});
