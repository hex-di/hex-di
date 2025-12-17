/**
 * WebSocketServer - WebSocket server for DevTools communication.
 *
 * Handles WebSocket connections and JSON-RPC message routing.
 *
 * @packageDocumentation
 */

import { WebSocketServer as WSServer, WebSocket } from "ws";
import type { IncomingMessage, Server as HttpServer } from "http";
import { ClientRegistry, type AppInfo } from "./client-registry.js";
import {
  type JsonRpcMessage,
  type JsonRpcRequest,
  type JsonRpcNotification,
  ErrorCodes,
  Methods,
  createSuccessResponse,
  createErrorResponse,
  createNotification,
  isRequest,
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
export interface DevToolsServerOptions {
  /**
   * Port to listen on (if creating standalone server).
   */
  readonly port?: number;

  /**
   * Existing HTTP server to attach to.
   */
  readonly server?: HttpServer;

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
export class DevToolsServer {
  private wss: WSServer | null = null;
  private readonly registry = new ClientRegistry();
  private readonly listeners = new Set<ServerEventListener>();
  private readonly options: Required<DevToolsServerOptions>;
  private isRunning = false;

  constructor(options: DevToolsServerOptions = {}) {
    this.options = {
      port: options.port ?? 9229,
      server: options.server as HttpServer,
      path: options.path ?? "/devtools",
      verbose: options.verbose ?? false,
    };

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
   * Start the WebSocket server.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    const wssOptions: { path?: string; port?: number; server?: HttpServer } = {
      path: this.options.path,
    };

    if (this.options.server !== undefined) {
      wssOptions.server = this.options.server;
    } else {
      wssOptions.port = this.options.port;
    }

    this.wss = new WSServer(wssOptions);
    this.isRunning = true;

    this.wss.on("connection", (socket, request) => {
      this.handleConnection(socket, request);
    });

    this.wss.on("error", (error) => {
      this.emit({ type: "error", error });
    });

    this.log(`DevTools server started on port ${this.options.port}`);
    this.emit({ type: "started", port: this.options.port });
  }

  /**
   * Stop the WebSocket server.
   */
  async stop(): Promise<void> {
    if (!this.isRunning || this.wss === null) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.wss!.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        this.isRunning = false;
        this.wss = null;
        this.registry.clear();
        this.log("DevTools server stopped");
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
    this.log("New connection established");

    socket.on("message", (data) => {
      this.handleMessage(socket, data.toString());
    });

    socket.on("close", () => {
      this.log("Connection closed");
      this.registry.unregisterBySocket(socket);
    });

    socket.on("error", (error) => {
      this.log(`Connection error: ${error.message}`);
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
    } else if (isNotification(message)) {
      this.handleNotification(socket, message);
    }
  }

  private handleRequest(socket: WebSocket, request: JsonRpcRequest): void {
    this.log(`Request: ${request.method}`);

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
    this.log(`Notification: ${notification.method}`);

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

    // Forward the request to the target app
    this.send(targetApp.socket, request);

    // TODO: Implement request/response correlation to forward response back
  }

  private broadcastNotification(notification: JsonRpcNotification): void {
    const message = JSON.stringify(notification);
    this.wss?.clients.forEach((client) => {
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

  private log(message: string): void {
    if (this.options.verbose) {
      console.log(`[DevToolsServer] ${message}`);
    }
  }
}
