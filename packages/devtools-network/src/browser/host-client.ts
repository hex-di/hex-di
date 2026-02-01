/**
 * DevToolsHostClient - Browser client that acts as a data host.
 *
 * This client connects to the DevTools relay server and registers as a
 * host application. It responds to requests from TUI clients with
 * graph, trace, and stats data from the DI container.
 *
 * Unlike DevToolsClient which queries data from apps, HostClient
 * PROVIDES data to the relay for other clients to consume.
 *
 * @packageDocumentation
 */

import type {
  ExportedGraph,
  JsonRpcRequest,
  JsonRpcMessage,
  VerboseLogger,
} from "@hex-di/devtools-core";
import type { TraceEntry, TraceStats, ContainerSnapshot } from "@hex-di/core";
import {
  Methods,
  createSuccessResponse,
  createErrorResponse,
  createNotification,
  isRequest,
  ErrorCodes,
  createVerboseLogger,
} from "@hex-di/devtools-core";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for creating the host client.
 */
export interface HostClientOptions {
  /**
   * Relay server URL.
   * @default "ws://localhost:3000/devtools"
   */
  readonly url?: string;

  /**
   * Unique identifier for this application.
   */
  readonly appId: string;

  /**
   * Human-readable name for this application.
   */
  readonly appName: string;

  /**
   * Application version.
   * @default "0.0.0"
   */
  readonly appVersion?: string;

  /**
   * HexDI library version.
   * @default "0.0.0"
   */
  readonly hexDIVersion?: string;

  /**
   * Auto-reconnect on disconnect.
   * @default true
   */
  readonly autoReconnect?: boolean;

  /**
   * Reconnect delay in milliseconds.
   * @default 5000
   */
  readonly reconnectDelay?: number;

  /**
   * Enable verbose logging.
   * @default false
   */
  readonly verbose?: boolean;
}

/**
 * Data handlers that provide DevTools data.
 *
 * Register these handlers to respond to TUI client requests.
 */
export interface HostDataHandlers {
  /**
   * Return the exported graph structure.
   */
  getGraph: () => ExportedGraph;

  /**
   * Return current trace entries.
   */
  getTraces: () => readonly TraceEntry[];

  /**
   * Return trace statistics.
   */
  getStats: () => TraceStats;

  /**
   * Return container snapshot (optional).
   */
  getSnapshot?: () => ContainerSnapshot | null;

  /**
   * Pause tracing (optional).
   */
  pauseTracing?: () => void;

  /**
   * Resume tracing (optional).
   */
  resumeTracing?: () => void;

  /**
   * Clear traces (optional).
   */
  clearTraces?: () => void;

  /**
   * Pin a trace entry (optional).
   */
  pinTrace?: (traceId: string, pin: boolean) => void;
}

/**
 * Host client events.
 */
export type HostClientEvent =
  | { readonly type: "connected" }
  | { readonly type: "disconnected" }
  | { readonly type: "registered" }
  | { readonly type: "error"; readonly error: Error };

/**
 * Host client event listener.
 */
export type HostClientEventListener = (event: HostClientEvent) => void;

// =============================================================================
// DevToolsHostClient
// =============================================================================

/**
 * Browser client that hosts DI data for DevTools inspection.
 *
 * This client connects to a DevTools relay server and registers as a
 * data host. TUI clients can then query this host for graph, trace,
 * and stats data through the relay.
 *
 * @example
 * ```typescript
 * import { DevToolsHostClient } from '@hex-di/devtools-network/browser';
 * import { toJSON } from '@hex-di/devtools';
 *
 * const hostClient = new DevToolsHostClient({
 *   url: 'ws://localhost:3000/devtools',
 *   appId: 'my-app',
 *   appName: 'My React App',
 * });
 *
 * // Register handlers to provide data
 * hostClient.registerHandlers({
 *   getGraph: () => toJSON(appGraph),
 *   getTraces: () => container.getTraces(),
 *   getStats: () => container.getStats(),
 * });
 *
 * // Connect to relay
 * await hostClient.connect();
 * ```
 */
export class DevToolsHostClient {
  private ws: WebSocket | null = null;
  private handlers: HostDataHandlers | null = null;
  private isConnected = false;
  private isRegistered = false;
  private shouldReconnect = false;
  private readonly listeners = new Set<HostClientEventListener>();
  private readonly options: Required<HostClientOptions>;
  private readonly logger: VerboseLogger;

  constructor(options: HostClientOptions) {
    this.options = {
      url: options.url ?? "ws://localhost:3000/devtools",
      appId: options.appId,
      appName: options.appName,
      appVersion: options.appVersion ?? "0.0.0",
      hexDIVersion: options.hexDIVersion ?? "0.0.0",
      autoReconnect: options.autoReconnect ?? true,
      reconnectDelay: options.reconnectDelay ?? 5000,
      verbose: options.verbose ?? false,
    };
    this.logger = createVerboseLogger(`DevToolsHost:${this.options.appId}`, this.options.verbose);
  }

  /**
   * Register data handlers.
   *
   * Must be called before connect() to enable responding to requests.
   */
  registerHandlers(handlers: HostDataHandlers): void {
    this.handlers = handlers;
    this.logger.log("Handlers registered");
  }

  /**
   * Connect to the relay server.
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    if (this.handlers === null) {
      throw new Error("No handlers registered. Call registerHandlers() before connect().");
    }

    this.shouldReconnect = this.options.autoReconnect;

    return new Promise((resolve, reject) => {
      this.logger.log(`Connecting to ${this.options.url}...`);
      this.ws = new WebSocket(this.options.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.logger.log("Connected to relay server");
        this.emit({ type: "connected" });
        this.registerWithRelay();
        resolve();
      };

      this.ws.onmessage = event => {
        this.handleMessage(String(event.data));
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.isRegistered = false;
        this.ws = null;
        this.logger.log("Disconnected from relay server");
        this.emit({ type: "disconnected" });
        this.handleReconnect();
      };

      this.ws.onerror = _event => {
        const error = new Error("WebSocket connection error");
        this.logger.log(`Connection error: ${error.message}`);
        this.emit({ type: "error", error });
        if (!this.isConnected) {
          reject(error);
        }
      };
    });
  }

  /**
   * Disconnect from the relay server.
   */
  disconnect(): void {
    this.shouldReconnect = false;
    if (this.ws !== null) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.isRegistered = false;
  }

  /**
   * Notify the relay that data has been updated.
   *
   * TUI clients subscribed to this app will receive the notification.
   */
  notifyDataUpdate(type: "graph" | "traces" | "stats" | "snapshot"): void {
    if (!this.isConnected || this.ws === null) {
      return;
    }

    const notification = createNotification(Methods.DATA_UPDATE, { type });
    this.send(notification);
    this.logger.log(`Sent data update notification: ${type}`);
  }

  /**
   * Add an event listener.
   */
  on(listener: HostClientEventListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove an event listener.
   */
  off(listener: HostClientEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Check if connected to relay.
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Check if registered with relay.
   */
  get registered(): boolean {
    return this.isRegistered;
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private registerWithRelay(): void {
    if (this.ws === null || !this.isConnected) {
      return;
    }

    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: Methods.REGISTER_APP,
      params: {
        appId: this.options.appId,
        appName: this.options.appName,
        appVersion: this.options.appVersion,
        hexDIVersion: this.options.hexDIVersion,
      },
    };

    this.send(request);
    this.logger.log(`Registering as ${this.options.appName} (${this.options.appId})`);
  }

  private handleMessage(data: string): void {
    let message: JsonRpcMessage;

    try {
      message = JSON.parse(data) as JsonRpcMessage;
    } catch {
      this.logger.log("Failed to parse message");
      return;
    }

    // Handle registration response
    if ("id" in message && message.id === 1 && "result" in message) {
      this.isRegistered = true;
      this.logger.log("Registration successful");
      this.emit({ type: "registered" });
      return;
    }

    // Handle forwarded requests from TUI clients
    if (isRequest(message)) {
      this.handleRequest(message);
    }
  }

  private handleRequest(request: JsonRpcRequest): void {
    if (this.handlers === null) {
      this.sendError(request.id, ErrorCodes.INTERNAL_ERROR, "No handlers registered");
      return;
    }

    this.logger.log(`Handling request: ${request.method}`);

    try {
      switch (request.method) {
        case Methods.GET_GRAPH:
          this.sendSuccess(request.id, { graph: this.handlers.getGraph() });
          break;

        case Methods.GET_TRACES:
          this.sendSuccess(request.id, { traces: this.handlers.getTraces() });
          break;

        case Methods.GET_STATS:
          this.sendSuccess(request.id, { stats: this.handlers.getStats() });
          break;

        case Methods.GET_CONTAINER_SNAPSHOT:
          this.sendSuccess(request.id, {
            snapshot: this.handlers.getSnapshot?.() ?? null,
          });
          break;

        case Methods.TRACE_CONTROL: {
          const params = request.params as { action?: string } | undefined;
          if (params?.action === "pause") {
            this.handlers.pauseTracing?.();
          } else if (params?.action === "resume") {
            this.handlers.resumeTracing?.();
          } else if (params?.action === "clear") {
            this.handlers.clearTraces?.();
          }
          this.sendSuccess(request.id, { success: true });
          break;
        }

        case Methods.PIN_TRACE: {
          const params = request.params as { traceId?: string; pin?: boolean } | undefined;
          if (params?.traceId !== undefined && params?.pin !== undefined) {
            this.handlers.pinTrace?.(params.traceId, params.pin);
          }
          this.sendSuccess(request.id, { success: true });
          break;
        }

        default:
          this.sendError(
            request.id,
            ErrorCodes.METHOD_NOT_FOUND,
            `Method not found: ${request.method}`
          );
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.sendError(request.id, ErrorCodes.INTERNAL_ERROR, error.message);
    }
  }

  private send(message: JsonRpcMessage): void {
    if (this.ws !== null && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private sendSuccess(id: string | number, result: unknown): void {
    this.send(createSuccessResponse(id, result));
  }

  private sendError(id: string | number, code: number, message: string): void {
    this.send(createErrorResponse(id, code, message));
  }

  private handleReconnect(): void {
    if (!this.shouldReconnect) {
      return;
    }

    this.logger.log(`Reconnecting in ${this.options.reconnectDelay}ms...`);
    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect().catch(() => {
          // Will retry on next reconnect cycle
        });
      }
    }, this.options.reconnectDelay);
  }

  private emit(event: HostClientEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Ignore listener errors
      }
    }
  }
}
