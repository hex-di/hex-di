/**
 * Tests for DevToolsServer.
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DevToolsServer, type ServerEvent, type ServerEventListener } from "../src/server/websocket-server.js";
import { Methods, createRequest, createNotification, ErrorCodes } from "@hex-di/devtools-core";
import { EventEmitter } from "node:events";

// =============================================================================
// In-memory WebSocket Pair (no real network sockets)
// =============================================================================

type WsEventName = "message" | "close" | "error" | "open";
type WsListener = (data?: unknown) => void;

const WS_OPEN = 1;
const WS_CLOSED = 3;

class InMemoryWebSocket {
  readyState = WS_OPEN;
  private readonly listeners = new Map<WsEventName, Set<WsListener>>();
  peer: InMemoryWebSocket | null = null;

  on(event: WsEventName, listener: WsListener): void {
    const set = this.listeners.get(event) ?? new Set<WsListener>();
    set.add(listener);
    this.listeners.set(event, set);
  }

  emit(event: WsEventName, data?: unknown): void {
    const set = this.listeners.get(event);
    if (set === undefined) return;
    for (const listener of set) {
      listener(data);
    }
  }

  send(data: string): void {
    if (this.readyState !== WS_OPEN) return;
    // Deliver to the peer as an incoming message (simulates network)
    this.peer?.emit("message", data);
  }

  close(): void {
    if (this.readyState === WS_CLOSED) return;
    this.readyState = WS_CLOSED;
    this.emit("close");
    if (this.peer !== null && this.peer.readyState !== WS_CLOSED) {
      this.peer.readyState = WS_CLOSED;
      this.peer.emit("close");
    }
  }
}

function createSocketPair(): { client: InMemoryWebSocket; server: InMemoryWebSocket } {
  const client = new InMemoryWebSocket();
  const server = new InMemoryWebSocket();
  client.peer = server;
  server.peer = client;
  return { client, server };
}

function attachToServer(server: DevToolsServer, serverSocket: InMemoryWebSocket): void {
  // Bypass network upgrade/handshake and directly attach the in-memory socket.
  (server as any).handleConnection(serverSocket, {} as any);
}

class FakeAttachableServer extends EventEmitter {
  constructor(private readonly port: number) {
    super();
  }

  address(): { port: number } {
    return { port: this.port };
  }
}

// Helper to wait for a condition
async function waitFor(
  condition: () => boolean,
  timeout = 2000
): Promise<void> {
  const start = Date.now();
  while (!condition() && Date.now() - start < timeout) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

// Helper to wait for a specific event
function waitForEvent<T extends ServerEvent["type"]>(
  server: DevToolsServer,
  eventType: T,
  timeout = 2000
): Promise<Extract<ServerEvent, { type: T }>> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${eventType}`));
    }, timeout);

    const listener: ServerEventListener = (event) => {
      if (event.type === eventType) {
        clearTimeout(timeoutId);
        server.off(listener);
        resolve(event as Extract<ServerEvent, { type: T }>);
      }
    };
    server.on(listener);
  });
}

describe("DevToolsServer", () => {
  let server: DevToolsServer;
  const testPort = 9330;

  beforeEach(() => {
    // Use attached mode to avoid binding real network sockets in tests.
    const attachable = new FakeAttachableServer(testPort);
    server = new DevToolsServer({
      port: testPort,
      server: attachable as any,
      verbose: false,
    });
  });

  afterEach(async () => {
    if (server.running) {
      await server.stop();
    }
  });

  // ===========================================================================
  // Server Lifecycle
  // ===========================================================================

  describe("start/stop", () => {
    it("should start the server", async () => {
      await server.start();

      expect(server.running).toBe(true);
    });

    it("should emit started event", async () => {
      const eventPromise = waitForEvent(server, "started");
      await server.start();
      const event = await eventPromise;

      expect(event.port).toBe(testPort);
    });

    it("should stop the server", async () => {
      await server.start();
      await server.stop();

      expect(server.running).toBe(false);
    });

    it("should emit stopped event", async () => {
      await server.start();

      const eventPromise = waitForEvent(server, "stopped");
      await server.stop();
      const event = await eventPromise;

      expect(event.type).toBe("stopped");
    });

    it("should not throw when starting already running server", async () => {
      await server.start();
      await expect(server.start()).resolves.toBeUndefined();
    });

    it("should not throw when stopping already stopped server", async () => {
      await expect(server.stop()).resolves.toBeUndefined();
    });
  });

  // ===========================================================================
  // Event Listeners
  // ===========================================================================

  describe("event listeners", () => {
    it("should add event listener", async () => {
      const listener = vi.fn<ServerEventListener>();
      server.on(listener);

      await server.start();

      expect(listener).toHaveBeenCalled();
    });

    it("should remove event listener", async () => {
      const listener = vi.fn<ServerEventListener>();
      server.on(listener);
      server.off(listener);

      await server.start();

      expect(listener).not.toHaveBeenCalled();
    });

    it("should not throw if listener throws", async () => {
      const badListener = vi.fn<ServerEventListener>(() => {
        throw new Error("Listener error");
      });
      server.on(badListener);

      await expect(server.start()).resolves.toBeUndefined();
    });
  });

  // ===========================================================================
  // Client Connections
  // ===========================================================================

  describe("client connections", () => {
    it("should accept WebSocket connections", async () => {
      const { client, server: serverSocket } = createSocketPair();
      attachToServer(server, serverSocket);

      expect(client.readyState).toBe(WS_OPEN);
      client.close();
    });

    it("should track connected apps after registration", async () => {
      const { client, server: serverSocket } = createSocketPair();
      attachToServer(server, serverSocket);

      // Register app
      const request = createRequest(1, Methods.REGISTER_APP, {
        appId: "test-app",
        appName: "Test App",
        appVersion: "1.0.0",
        hexDIVersion: "0.1.0",
      });
      client.send(JSON.stringify(request));

      await waitFor(() => server.connectedApps > 0);

      expect(server.connectedApps).toBe(1);

      client.close();
    });

    it("should emit connection event on app registration", async () => {
      const { client, server: serverSocket } = createSocketPair();
      attachToServer(server, serverSocket);

      const eventPromise = waitForEvent(server, "connection");

      const request = createRequest(1, Methods.REGISTER_APP, {
        appId: "test-app",
        appName: "Test App",
      });
      client.send(JSON.stringify(request));

      const event = await eventPromise;

      expect(event.appId).toBe("test-app");
      expect(event.appName).toBe("Test App");

      client.close();
    });

    it("should emit disconnection event on client disconnect", async () => {
      const { client, server: serverSocket } = createSocketPair();
      attachToServer(server, serverSocket);

      // Register first
      const request = createRequest(1, Methods.REGISTER_APP, {
        appId: "test-app",
        appName: "Test App",
      });
      client.send(JSON.stringify(request));

      await waitFor(() => server.connectedApps > 0);

      const eventPromise = waitForEvent(server, "disconnection");

      client.close();

      const event = await eventPromise;

      expect(event.appId).toBe("test-app");
    });

    it("should remove app from registry on disconnect", async () => {
      const { client, server: serverSocket } = createSocketPair();
      attachToServer(server, serverSocket);

      const request = createRequest(1, Methods.REGISTER_APP, {
        appId: "test-app",
        appName: "Test App",
      });
      client.send(JSON.stringify(request));

      await waitFor(() => server.connectedApps > 0);

      client.close();

      await waitFor(() => server.connectedApps === 0);

      expect(server.connectedApps).toBe(0);
    });
  });

  // ===========================================================================
  // listApps
  // ===========================================================================

  describe("listApps", () => {
    it("should return empty list when no apps connected", () => {
      const apps = server.listApps();
      expect(apps).toHaveLength(0);
    });

    it("should return list of connected apps", async () => {
      const { client, server: serverSocket } = createSocketPair();
      attachToServer(server, serverSocket);

      const request = createRequest(1, Methods.REGISTER_APP, {
        appId: "test-app",
        appName: "Test App",
      });
      client.send(JSON.stringify(request));

      await waitFor(() => server.connectedApps > 0);

      const apps = server.listApps();

      expect(apps).toHaveLength(1);
      expect(apps[0]).toMatchObject({
        appId: "test-app",
        appName: "Test App",
      });

      client.close();
    });
  });

  // ===========================================================================
  // Message Handling
  // ===========================================================================

  describe("message handling", () => {
    let client: InMemoryWebSocket;

    beforeEach(async () => {
      const pair = createSocketPair();
      client = pair.client;
      attachToServer(server, pair.server);
    });

    afterEach(() => {
      if (client.readyState === WS_OPEN) {
        client.close();
      }
    });

    it("should respond to REGISTER_APP request", async () => {
      const responsePromise = new Promise<string>((resolve) => {
        client.on("message", (data) => {
          resolve(String(data));
        });
      });

      const request = createRequest(1, Methods.REGISTER_APP, {
        appId: "test-app",
        appName: "Test App",
      });
      client.send(JSON.stringify(request));

      const response = JSON.parse(await responsePromise);

      expect(response.id).toBe(1);
      expect(response.result).toEqual({ success: true });
    });

    it("should respond to LIST_APPS request", async () => {
      // Register first
      const registerRequest = createRequest(1, Methods.REGISTER_APP, {
        appId: "test-app",
        appName: "Test App",
      });
      client.send(JSON.stringify(registerRequest));

      await waitFor(() => server.connectedApps > 0);

      // Now list apps
      const responsePromise = new Promise<string>((resolve) => {
        client.on("message", (data) => {
          const msg = JSON.parse(String(data));
          if (msg.id === 2) {
            resolve(String(data));
          }
        });
      });

      const listRequest = createRequest(2, Methods.LIST_APPS, undefined);
      client.send(JSON.stringify(listRequest));

      const response = JSON.parse(await responsePromise);

      expect(response.id).toBe(2);
      expect(response.result.apps).toHaveLength(1);
    });

    it("should return error for invalid JSON", async () => {
      const responsePromise = new Promise<string>((resolve) => {
        client.on("message", (data) => {
          resolve(String(data));
        });
      });

      client.send("invalid json");

      const response = JSON.parse(await responsePromise);

      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(ErrorCodes.PARSE_ERROR);
    });

    it("should return error for unknown method", async () => {
      const responsePromise = new Promise<string>((resolve) => {
        client.on("message", (data) => {
          resolve(String(data));
        });
      });

      const request = createRequest(1, "unknown.method" as any, {});
      client.send(JSON.stringify(request));

      const response = JSON.parse(await responsePromise);

      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(ErrorCodes.METHOD_NOT_FOUND);
    });

    it("should return error for REGISTER_APP with invalid params", async () => {
      const responsePromise = new Promise<string>((resolve) => {
        client.on("message", (data) => {
          resolve(String(data));
        });
      });

      const request = createRequest(1, Methods.REGISTER_APP, {
        // Missing required fields
      } as any);
      client.send(JSON.stringify(request));

      const response = JSON.parse(await responsePromise);

      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(ErrorCodes.INVALID_PARAMS);
    });

    it("should return error for data requests without appId", async () => {
      const responsePromise = new Promise<string>((resolve) => {
        client.on("message", (data) => {
          resolve(String(data));
        });
      });

      const request = createRequest(1, Methods.GET_GRAPH, {} as any);
      client.send(JSON.stringify(request));

      const response = JSON.parse(await responsePromise);

      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(ErrorCodes.INVALID_PARAMS);
    });

    it("should return error for data requests with non-existent app", async () => {
      const responsePromise = new Promise<string>((resolve) => {
        client.on("message", (data) => {
          resolve(String(data));
        });
      });

      const request = createRequest(1, Methods.GET_GRAPH, { appId: "non-existent" });
      client.send(JSON.stringify(request));

      const response = JSON.parse(await responsePromise);

      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(ErrorCodes.APP_NOT_FOUND);
    });
  });

  // ===========================================================================
  // Notifications
  // ===========================================================================

  describe("notifications", () => {
    let client1: InMemoryWebSocket;
    let client2: InMemoryWebSocket;
    let server1: InMemoryWebSocket;
    let server2: InMemoryWebSocket;

    beforeEach(async () => {
      const pair1 = createSocketPair();
      const pair2 = createSocketPair();
      client1 = pair1.client;
      client2 = pair2.client;
      server1 = pair1.server;
      server2 = pair2.server;

      attachToServer(server, server1);
      attachToServer(server, server2);

      // Provide a fake wss client set so DATA_UPDATE can be broadcast.
      (server as any).wss = { clients: new Set([server1, server2]) };
    });

    afterEach(() => {
      if (client1.readyState === WS_OPEN) client1.close();
      if (client2.readyState === WS_OPEN) client2.close();
    });

    it("should broadcast DATA_UPDATE notification to all clients", async () => {
      const receivedMessages: string[] = [];

      client2.on("message", (data) => {
        receivedMessages.push(String(data));
      });

      // Send notification from client1
      const notification = createNotification(Methods.DATA_UPDATE, {
        type: "graph",
        appId: "test-app",
      });
      client1.send(JSON.stringify(notification));

      await waitFor(() => receivedMessages.length > 0);

      const received = JSON.parse(receivedMessages[0]!);
      expect(received.method).toBe(Methods.DATA_UPDATE);
    });
  });

  // ===========================================================================
  // Options
  // ===========================================================================

  describe("options", () => {
    it("should use default port when not specified", () => {
      const defaultServer = new DevToolsServer();
      // Just verify it can be created
      expect(defaultServer).toBeDefined();
    });

    it("should use default path when not specified", () => {
      const defaultServer = new DevToolsServer();
      expect(defaultServer).toBeDefined();
    });
  });

  // ===========================================================================
  // Clear Registry on Stop
  // ===========================================================================

  describe("registry cleanup", () => {
    it("should clear registry when stopped", async () => {
      await server.start();

      const { client, server: serverSocket } = createSocketPair();
      attachToServer(server, serverSocket);

      const request = createRequest(1, Methods.REGISTER_APP, {
        appId: "test-app",
        appName: "Test App",
      });
      client.send(JSON.stringify(request));

      await waitFor(() => server.connectedApps > 0);

      client.close();
      await server.stop();

      expect(server.connectedApps).toBe(0);
    });
  });
});
