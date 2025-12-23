/**
 * DevTools WebSocket Client - Connects to DevTools server.
 *
 * Uses hexagonal architecture with WebSocketPort for platform-agnostic
 * WebSocket connections. Works in both Node.js and browser environments.
 *
 * @packageDocumentation
 */

import type {
  ExportedGraph,
  TraceEntry,
  TraceStats,
  ContainerSnapshot,
  JsonRpcMessage,
  JsonRpcSuccessResponse,
  MethodParams,
  MethodResult,
  MethodMap,
} from "@hex-di/devtools-core";
import { Methods, createRequest, isResponse, isErrorResponse } from "@hex-di/devtools-core";
import type { WebSocketService } from "./ports/websocket.port.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Client connection options.
 */
export interface ClientOptions {
  /**
   * Server URL.
   * @default "ws://localhost:9229/devtools"
   */
  readonly url?: string;

  /**
   * WebSocket service implementation.
   * If not provided, the client cannot connect.
   * Use WsAdapter for Node.js or BrowserWebSocketAdapter for browsers.
   */
  readonly webSocket?: WebSocketService;

  /**
   * Reconnect on disconnect.
   * @default true
   */
  readonly autoReconnect?: boolean;

  /**
   * Reconnect delay in milliseconds.
   * @default 5000
   */
  readonly reconnectDelay?: number;

  /**
   * Request timeout in milliseconds.
   * @default 30000
   */
  readonly requestTimeout?: number;
}

/**
 * Client events.
 */
export type ClientEvent =
  | { readonly type: "connected" }
  | { readonly type: "disconnected" }
  | { readonly type: "error"; readonly error: Error }
  | { readonly type: "data_update"; readonly updateType: string };

/**
 * Client event listener.
 */
export type ClientEventListener = (event: ClientEvent) => void;

// =============================================================================
// DevToolsClient
// =============================================================================

/**
 * WebSocket client for connecting to DevTools server.
 *
 * Provides methods to fetch dependency graphs, traces, and stats
 * from connected HexDI applications.
 *
 * Uses hexagonal architecture with WebSocketPort for platform-agnostic
 * WebSocket connections. Inject either WsAdapter (Node.js) or
 * BrowserWebSocketAdapter (browser) to use the client.
 *
 * @example Node.js usage
 * ```typescript
 * import { DevToolsClient, WsAdapter, WebSocketPort } from "@hex-di/devtools-network";
 * import { createContainer } from "@hex-di/runtime";
 * import { GraphBuilder } from "@hex-di/graph";
 *
 * const graph = GraphBuilder.create().provide(WsAdapter).build();
 * const container = createContainer(graph);
 * const webSocket = container.resolve(WebSocketPort);
 *
 * const client = new DevToolsClient({ webSocket });
 * await client.connect();
 * ```
 *
 * @example Browser usage
 * ```typescript
 * import { DevToolsClient, BrowserWebSocketAdapter, WebSocketPort } from "@hex-di/devtools-network";
 * import { createContainer } from "@hex-di/runtime";
 * import { GraphBuilder } from "@hex-di/graph";
 *
 * const graph = GraphBuilder.create().provide(BrowserWebSocketAdapter).build();
 * const container = createContainer(graph);
 * const webSocket = container.resolve(WebSocketPort);
 *
 * const client = new DevToolsClient({ webSocket });
 * await client.connect();
 * ```
 */
export class DevToolsClient {
  private readonly webSocket: WebSocketService | null;
  private readonly options: Required<Omit<ClientOptions, "webSocket">> & {
    webSocket: WebSocketService | null;
  };
  private readonly listeners = new Set<ClientEventListener>();
  private readonly pendingRequests = new Map<
    string | number,
    { resolve: (result: unknown) => void; reject: (error: Error) => void }
  >();
  private requestIdCounter = 0;
  private isConnected = false;
  private shouldReconnect = false;

  constructor(options: ClientOptions = {}) {
    this.webSocket = options.webSocket ?? null;
    this.options = {
      url: options.url ?? "ws://localhost:9229/devtools",
      webSocket: this.webSocket,
      autoReconnect: options.autoReconnect ?? true,
      reconnectDelay: options.reconnectDelay ?? 5000,
      requestTimeout: options.requestTimeout ?? 30000,
    };
  }

  /**
   * Connect to the server.
   */
  async connect(): Promise<void> {
    if (this.isConnected) return;

    if (this.webSocket === null) {
      throw new Error(
        "No WebSocket service provided. " +
          "Use WsAdapter (Node.js) or BrowserWebSocketAdapter (browser)."
      );
    }

    this.shouldReconnect = this.options.autoReconnect;

    await this.webSocket.connect(this.options.url, {
      onOpen: () => {
        this.isConnected = true;
        this.emit({ type: "connected" });
      },
      onMessage: data => {
        this.handleMessage(data);
      },
      onClose: () => {
        this.isConnected = false;
        this.emit({ type: "disconnected" });
        this.handleReconnect();
      },
      onError: error => {
        this.emit({ type: "error", error });
      },
    });
  }

  /**
   * Disconnect from the server.
   */
  disconnect(): void {
    this.shouldReconnect = false;
    if (this.webSocket !== null) {
      this.webSocket.disconnect();
    }
    this.isConnected = false;
  }

  /**
   * Add an event listener.
   */
  on(listener: ClientEventListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove an event listener.
   */
  off(listener: ClientEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Check if connected.
   */
  get connected(): boolean {
    return this.isConnected;
  }

  // ===========================================================================
  // Data Methods
  // ===========================================================================

  /**
   * List available apps.
   */
  async listApps(): Promise<readonly { appId: string; appName: string }[]> {
    const result = await this.sendTypedRequest(Methods.LIST_APPS, undefined);
    return result.apps;
  }

  /**
   * Get graph from an app.
   */
  async getGraph(appId: string): Promise<ExportedGraph> {
    const result = await this.sendTypedRequest(Methods.GET_GRAPH, { appId });
    return result.graph;
  }

  /**
   * Get traces from an app.
   */
  async getTraces(appId: string): Promise<readonly TraceEntry[]> {
    const result = await this.sendTypedRequest(Methods.GET_TRACES, { appId });
    return result.traces;
  }

  /**
   * Get stats from an app.
   */
  async getStats(appId: string): Promise<TraceStats> {
    const result = await this.sendTypedRequest(Methods.GET_STATS, { appId });
    return result.stats;
  }

  /**
   * Get container snapshot from an app.
   */
  async getSnapshot(appId: string): Promise<ContainerSnapshot | null> {
    const result = await this.sendTypedRequest(Methods.GET_CONTAINER_SNAPSHOT, { appId });
    return result.snapshot;
  }

  // ===========================================================================
  // Control Methods
  // ===========================================================================

  /**
   * Pause tracing.
   */
  async pauseTracing(appId: string): Promise<void> {
    await this.sendTypedRequest(Methods.TRACE_CONTROL, { appId, action: "pause" });
  }

  /**
   * Resume tracing.
   */
  async resumeTracing(appId: string): Promise<void> {
    await this.sendTypedRequest(Methods.TRACE_CONTROL, { appId, action: "resume" });
  }

  /**
   * Clear traces.
   */
  async clearTraces(appId: string): Promise<void> {
    await this.sendTypedRequest(Methods.TRACE_CONTROL, { appId, action: "clear" });
  }

  /**
   * Pin a trace entry.
   */
  async pinTrace(appId: string, traceId: string): Promise<void> {
    await this.sendTypedRequest(Methods.PIN_TRACE, { appId, traceId, pin: true });
  }

  /**
   * Unpin a trace entry.
   */
  async unpinTrace(appId: string, traceId: string): Promise<void> {
    await this.sendTypedRequest(Methods.PIN_TRACE, { appId, traceId, pin: false });
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Send a type-safe request using MethodMap for compile-time validation.
   *
   * @param method - The method name from Methods constant
   * @param params - Type-safe parameters for the method
   * @returns Type-safe result for the method
   */
  private async sendTypedRequest<M extends keyof MethodMap>(
    method: M,
    params: MethodParams<M>
  ): Promise<MethodResult<M>> {
    if (!this.isConnected || this.webSocket === null) {
      throw new Error("Not connected");
    }

    const id = ++this.requestIdCounter;
    const request = createRequest(id, method, params);
    const socket = this.webSocket;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve: resolve as (result: unknown) => void, reject });
      socket.send(JSON.stringify(request));

      // Timeout
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error("Request timeout"));
        }
      }, this.options.requestTimeout);
    });
  }

  private handleMessage(data: string): void {
    let message: JsonRpcMessage;

    try {
      message = JSON.parse(data) as JsonRpcMessage;
    } catch {
      return;
    }

    // Handle responses (check id is not null for error responses)
    if (isResponse(message) && message.id !== null) {
      const pending = this.pendingRequests.get(message.id);
      if (pending !== undefined) {
        this.pendingRequests.delete(message.id);
        if (isErrorResponse(message)) {
          pending.reject(new Error(message.error.message));
        } else {
          pending.resolve((message as JsonRpcSuccessResponse).result);
        }
      }
    }
  }

  private handleReconnect(): void {
    if (!this.shouldReconnect) return;

    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect().catch(() => {
          // Will retry on next reconnect cycle
        });
      }
    }, this.options.reconnectDelay);
  }

  private emit(event: ClientEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Ignore listener errors
      }
    }
  }
}
