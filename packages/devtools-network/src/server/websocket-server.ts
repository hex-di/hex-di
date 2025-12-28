/**
 * WebSocketServer - WebSocket server for DevTools communication.
 *
 * Handles WebSocket connections and JSON-RPC message routing.
 *
 * @packageDocumentation
 */

import { WebSocketServer as WSServer, WebSocket } from "ws";
import type { IncomingMessage, Server as HttpServer } from "http";
import type { Http2SecureServer } from "http2";
import { createVerboseLogger, type VerboseLogger } from "@hex-di/devtools-core";
import { ClientRegistry, type AppInfo } from "./client-registry.js";
import {
  type JsonRpcMessage,
  type JsonRpcRequest,
  type JsonRpcResponse,
  type JsonRpcNotification,
  ErrorCodes,
  Methods,
  createSuccessResponse,
  createErrorResponse,
  isRequest,
  isResponse,
  isNotification,
  parseJsonRpcMessage,
  type RegisterAppParams,
} from "./protocol.js";

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if a value is a valid RegisterAppParams object.
 *
 * @param value - The value to check
 * @returns True if the value is a valid RegisterAppParams
 */
function isRegisterAppParams(value: unknown): value is RegisterAppParams {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return typeof obj["appId"] === "string" && typeof obj["appName"] === "string";
}

/**
 * Check if a value has a valid appId property.
 *
 * @param value - The value to check
 * @returns True if the value has a string appId property
 */
function hasAppId(value: unknown): value is { appId: string } {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return typeof (value as Record<string, unknown>)["appId"] === "string";
}

// =============================================================================
// Types
// =============================================================================

/**
 * Options for creating the WebSocket server.
 */
/**
 * Union of server types that can be used with DevToolsServer.
 * Includes both HTTP/1.x and HTTP/2 servers for Vite compatibility.
 */
export type AttachableServer = HttpServer | Http2SecureServer;

export interface DevToolsServerOptions {
  /**
   * Port to listen on (if creating standalone server).
   */
  readonly port?: number;

  /**
   * Existing HTTP server to attach to.
   * Accepts both HTTP/1.x (http.Server) and HTTP/2 (Http2SecureServer)
   * for compatibility with Vite dev server.
   */
  readonly server?: AttachableServer;

  /**
   * Path for WebSocket connections.
   * @default "/devtools"
   */
  readonly path?: string;

  /**
   * Enable verbose logging.
   * @default false
   */
  readonly verbose?: boolean;
}

/**
 * Server event listener type.
 */
export type ServerEventListener = (event: ServerEvent) => void;

/**
 * Server events.
 */
export type ServerEvent =
  | { type: "started"; port: number }
  | { type: "stopped" }
  | { type: "connection"; appId: string; appName: string }
  | { type: "disconnection"; appId: string; appName: string }
  | { type: "error"; error: Error };

// =============================================================================
// DevToolsServer
// =============================================================================

/**
 * WebSocket server for DevTools communication.
 *
 * @example
 * ```typescript
 * import { DevToolsServer } from '@hex-di/devtools-network';
 *
 * const server = new DevToolsServer({ port: 9229 });
 * await server.start();
 *
 * // Listen for events
 * server.on((event) => {
 *   if (event.type === 'connection') {
 *     console.log(`App connected: ${event.appName}`);
 *   }
 * });
 * ```
 */
/**
 * Pending request info for response correlation.
 */
interface PendingRequest {
  /** The socket that made the original request */
  readonly originSocket: WebSocket;
  /** Timeout handle for request timeout */
  readonly timeoutId: ReturnType<typeof setTimeout>;
}

/**
 * Internal resolved options type for DevToolsServer.
 * Uses union with undefined for optional server, avoiding Required<> issues.
 */
interface ResolvedDevToolsOptions {
  readonly port: number;
  readonly server: AttachableServer | undefined;
  readonly path: string;
  readonly verbose: boolean;
}

export class DevToolsServer {
  private wss: WSServer | null = null;
  private readonly registry = new ClientRegistry();
  private readonly listeners = new Set<ServerEventListener>();
  private readonly options: ResolvedDevToolsOptions;
  private readonly logger: VerboseLogger;
  private isRunning = false;

  /** Map of request ID to pending request info for response correlation */
  private readonly pendingRequests = new Map<string | number, PendingRequest>();

  /** Timeout for forwarded requests (30 seconds) */
  private static readonly REQUEST_TIMEOUT_MS = 30000;

  constructor(options: DevToolsServerOptions = {}) {
    this.options = {
      port: options.port ?? 9229,
      server: options.server,
      path: options.path ?? "/devtools",
      verbose: options.verbose ?? false,
    };
    this.logger = createVerboseLogger("DevToolsServer", this.options.verbose);

    // Forward registry events
    this.registry.addListener((event, app) => {
      if (event === "connected") {
        this.emit({ type: "connection", appId: app.appId, appName: app.appName });
      } else {
        this.emit({ type: "disconnection", appId: app.appId, appName: app.appName });
      }
    });
  }

  /**
   * Upgrade handler bound to this instance.
   * Stored to enable proper cleanup in stop().
   */
  private upgradeHandler:
    | ((request: IncomingMessage, socket: import("stream").Duplex, head: Buffer) => void)
    | null = null;

  /**
   * Start the WebSocket server.
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    let actualPort = this.options.port;

    if (this.options.server !== undefined) {
      // Attached mode: use noServer to avoid conflicts with Vite's HMR WebSocket.
      // We manually handle 'upgrade' events and filter by path.
      const wss = new WSServer({ noServer: true });
      this.wss = wss;

      // Create bound upgrade handler so we can remove it in stop()
      this.upgradeHandler = (request, socket, head) => {
        // Parse the request URL to check the path
        const url = request.url ?? "";
        const pathname = url.startsWith("/") ? url.split("?")[0] : "/";

        // Only handle requests to our DevTools path
        if (pathname === this.options.path) {
          wss.handleUpgrade(request, socket, head, ws => {
            wss.emit("connection", ws, request);
          });
        }
        // For other paths, don't do anything - let Vite's HMR handle them
      };

      this.options.server.on("upgrade", this.upgradeHandler);

      // Get actual port from attached server
      const address = this.options.server.address();
      if (typeof address === "object" && address !== null) {
        actualPort = address.port;
      }
    } else {
      // Standalone mode: create server on specified port
      this.wss = new WSServer({
        port: this.options.port,
        path: this.options.path,
      });
    }

    this.isRunning = true;

    this.wss.on("connection", (socket, request) => {
      this.handleConnection(socket, request);
    });

    this.wss.on("error", error => {
      this.emit({ type: "error", error });
    });

    this.logger.log(`DevTools server started on port ${actualPort}`);
    this.emit({ type: "started", port: actualPort });
  }

  /**
   * Stop the WebSocket server.
   */
  async stop(): Promise<void> {
    if (!this.isRunning || this.wss === null) {
      return;
    }

    // Remove upgrade handler from attached server if present
    if (this.options.server !== undefined && this.upgradeHandler !== null) {
      this.options.server.removeListener("upgrade", this.upgradeHandler);
      this.upgradeHandler = null;
    }

    const wss = this.wss;
    return new Promise((resolve, reject) => {
      wss.close(err => {
        if (err) {
          reject(err);
          return;
        }
        this.isRunning = false;
        this.wss = null;
        this.registry.clear();
        this.logger.log("DevTools server stopped");
        this.emit({ type: "stopped" });
        resolve();
      });
    });
  }

  /**
   * Add an event listener.
   */
  on(listener: ServerEventListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove an event listener.
   */
  off(listener: ServerEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * List connected apps.
   */
  listApps(): readonly AppInfo[] {
    return this.registry.listApps();
  }

  /**
   * Get the number of connected apps.
   */
  get connectedApps(): number {
    return this.registry.size;
  }

  /**
   * Check if server is running.
   */
  get running(): boolean {
    return this.isRunning;
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private handleConnection(socket: WebSocket, _request: IncomingMessage): void {
    this.logger.log("New connection established");

    socket.on("message", data => {
      this.handleMessage(socket, data.toString());
    });

    socket.on("close", () => {
      this.logger.log("Connection closed");
      this.registry.unregisterBySocket(socket);
    });

    socket.on("error", error => {
      this.logger.log(`Connection error: ${error.message}`);
      this.emit({ type: "error", error });
    });
  }

  private handleMessage(socket: WebSocket, data: string): void {
    const message = parseJsonRpcMessage(data);

    if (message === null) {
      this.sendError(socket, null, ErrorCodes.PARSE_ERROR, "Parse error");
      return;
    }

    if (isRequest(message)) {
      this.handleRequest(socket, message);
    } else if (isResponse(message)) {
      this.handleResponse(socket, message);
    } else if (isNotification(message)) {
      this.handleNotification(socket, message);
    }
  }

  private handleRequest(socket: WebSocket, request: JsonRpcRequest): void {
    this.logger.log(`Request: ${request.method}`);

    switch (request.method) {
      case Methods.REGISTER_APP:
        this.handleRegisterApp(socket, request);
        break;

      case Methods.LIST_APPS:
        this.handleListApps(socket, request);
        break;

      case Methods.GET_GRAPH:
      case Methods.GET_TRACES:
      case Methods.GET_STATS:
      case Methods.GET_CONTAINER_SNAPSHOT:
      case Methods.TRACE_CONTROL:
      case Methods.PIN_TRACE:
        // These requests need to be forwarded to the appropriate app
        this.handleForwardRequest(socket, request);
        break;

      default:
        this.sendError(
          socket,
          request.id,
          ErrorCodes.METHOD_NOT_FOUND,
          `Method not found: ${request.method}`
        );
    }
  }

  private handleNotification(socket: WebSocket, notification: JsonRpcNotification): void {
    this.logger.log(`Notification: ${notification.method}`);

    if (notification.method === Methods.DATA_UPDATE) {
      // Broadcast to all connected UI clients
      this.broadcastNotification(notification);
    }
  }

  private handleRegisterApp(socket: WebSocket, request: JsonRpcRequest): void {
    if (!isRegisterAppParams(request.params)) {
      this.sendError(socket, request.id, ErrorCodes.INVALID_PARAMS, "Invalid params");
      return;
    }

    const params = request.params;
    this.registry.registerApp(
      socket,
      params.appId,
      params.appName,
      params.appVersion ?? "0.0.0",
      params.hexDIVersion ?? "0.0.0"
    );

    this.send(socket, createSuccessResponse(request.id, { success: true }));
  }

  private handleListApps(socket: WebSocket, request: JsonRpcRequest): void {
    const apps = this.registry.listApps();
    this.send(socket, createSuccessResponse(request.id, { apps }));
  }

  private handleForwardRequest(socket: WebSocket, request: JsonRpcRequest): void {
    // Validate params has appId
    if (!hasAppId(request.params)) {
      this.sendError(socket, request.id, ErrorCodes.INVALID_PARAMS, "Missing appId");
      return;
    }

    const targetApp = this.registry.getApp(request.params.appId);
    if (targetApp === undefined) {
      this.sendError(socket, request.id, ErrorCodes.APP_NOT_FOUND, "App not found");
      return;
    }

    // Set up timeout for the request
    const timeoutId = setTimeout(() => {
      const pending = this.pendingRequests.get(request.id);
      if (pending !== undefined) {
        this.pendingRequests.delete(request.id);
        this.sendError(
          pending.originSocket,
          request.id,
          ErrorCodes.INTERNAL_ERROR,
          "Request timeout"
        );
      }
    }, DevToolsServer.REQUEST_TIMEOUT_MS);

    // Track the pending request for response correlation
    this.pendingRequests.set(request.id, {
      originSocket: socket,
      timeoutId,
    });

    // Forward the request to the target app
    this.send(targetApp.socket, request);
    this.logger.log(`Forwarded request ${request.id} to app ${request.params.appId}`);
  }

  private handleResponse(_socket: WebSocket, response: JsonRpcResponse): void {
    // Error responses can have null id - ignore these as we can't route them
    if (response.id === null) {
      this.logger.log("Received error response with null ID, cannot route");
      return;
    }

    // Look up the pending request to find the original client
    const pending = this.pendingRequests.get(response.id);

    if (pending === undefined) {
      this.logger.log(`Received response for unknown request ID: ${response.id}`);
      return;
    }

    // Clear timeout and remove from pending
    clearTimeout(pending.timeoutId);
    this.pendingRequests.delete(response.id);

    // Forward the response to the original client
    this.send(pending.originSocket, response);
    this.logger.log(`Forwarded response ${response.id} to client`);
  }

  private broadcastNotification(notification: JsonRpcNotification): void {
    const message = JSON.stringify(notification);
    this.wss?.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  private send(socket: WebSocket, message: JsonRpcMessage): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  private sendError(
    socket: WebSocket,
    id: string | number | null,
    code: number,
    message: string
  ): void {
    this.send(socket, createErrorResponse(id, code, message));
  }

  private emit(event: ServerEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Ignore listener errors
      }
    }
  }
}
