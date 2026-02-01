/**
 * RemoteDataSource - Data source for remote DevTools connection.
 *
 * Connects to a DevTools server via WebSocket to fetch dependency graphs,
 * traces, and other debugging data from remote HexDI applications.
 * Platform-agnostic implementation that works in both browser and Node.js.
 *
 * @packageDocumentation
 */

import type { ExportedGraph, PresenterDataSourceContract } from "@hex-di/devtools-core";
import type { TraceEntry, TraceStats, ContainerSnapshot } from "@hex-di/core";
import {
  Methods,
  createRequest,
  isResponse,
  isErrorResponse,
  type JsonRpcMessage,
  type JsonRpcSuccessResponse,
} from "@hex-di/devtools-core";
import type {
  DataSource,
  DataSourceConnectionState,
  DataSourceEvent,
  DataSourceListener,
} from "./data-source.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for creating a RemoteDataSource.
 */
export interface RemoteDataSourceOptions {
  /**
   * WebSocket server URL.
   * @default "ws://localhost:9229/devtools"
   */
  readonly url?: string;

  /**
   * Target app ID to fetch data from.
   * If not provided, will use the first available app.
   */
  readonly appId?: string;

  /**
   * Whether to automatically reconnect on disconnect.
   * @default true
   */
  readonly autoReconnect?: boolean;

  /**
   * Reconnect delay in milliseconds.
   * @default 5000
   */
  readonly reconnectDelay?: number;

  /**
   * Auto-refresh interval in milliseconds.
   * Set to 0 to disable auto-refresh.
   * @default 1000
   */
  readonly refreshInterval?: number;

  /**
   * Request timeout in milliseconds.
   * @default 30000
   */
  readonly requestTimeout?: number;

  /**
   * WebSocket factory for platform-specific implementation.
   * In browsers, uses native WebSocket. In Node.js, use 'ws' package.
   */
  readonly createWebSocket?: (url: string) => WebSocketLike;
}

/**
 * Minimal WebSocket interface for platform-agnostic implementation.
 */
export interface WebSocketLike {
  readonly readyState: number;
  send(data: string): void;
  close(): void;
  onopen: ((event: unknown) => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onclose: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
}

// WebSocket ready states
const WS_OPEN = 1;

// =============================================================================
// Empty Data Factories
// =============================================================================

function createEmptyGraph(): ExportedGraph {
  return Object.freeze({ nodes: [], edges: [] });
}

function createEmptyStats(): TraceStats {
  return Object.freeze({
    totalResolutions: 0,
    averageDuration: 0,
    cacheHitRate: 0,
    slowCount: 0,
    sessionStart: Date.now(),
    totalDuration: 0,
  });
}

// =============================================================================
// RemoteDataSource
// =============================================================================

/**
 * Remote data source that connects to a DevTools server via WebSocket.
 *
 * Platform-agnostic implementation that works in both browser and Node.js.
 * Implements both DataSource (unified API) and PresenterDataSourceContract
 * (backward compatibility).
 *
 * Data is fetched asynchronously and cached locally. The contract methods
 * provide synchronous access to the cached data.
 *
 * @example Browser usage
 * ```typescript
 * import { RemoteDataSource } from '@hex-di/devtools';
 *
 * const dataSource = new RemoteDataSource({
 *   url: 'ws://localhost:9229/devtools',
 *   appId: 'my-app',
 * });
 *
 * await dataSource.connect();
 *
 * dataSource.subscribeToGraph((graph) => {
 *   console.log('Graph updated:', graph);
 * });
 * ```
 *
 * @example Node.js TUI usage
 * ```typescript
 * import { RemoteDataSource } from '@hex-di/devtools';
 * import WebSocket from 'ws';
 *
 * const dataSource = new RemoteDataSource({
 *   url: 'ws://localhost:9229/devtools',
 *   createWebSocket: (url) => new WebSocket(url),
 * });
 *
 * await dataSource.connect();
 * ```
 */
export class RemoteDataSource implements DataSource, PresenterDataSourceContract {
  private readonly options: Required<Omit<RemoteDataSourceOptions, "createWebSocket">> & {
    createWebSocket: (url: string) => WebSocketLike;
  };
  private readonly listeners = new Set<DataSourceListener>();
  private readonly subscribers = new Set<() => void>();
  private readonly graphSubscribers = new Set<(graph: ExportedGraph) => void>();
  private readonly tracesSubscribers = new Set<(traces: readonly TraceEntry[]) => void>();
  private readonly pendingRequests = new Map<
    string | number,
    { resolve: (result: unknown) => void; reject: (error: Error) => void }
  >();
  private connectionState: DataSourceConnectionState = "disconnected";
  private currentAppId: string | null = null;
  private paused = false;
  private requestIdCounter = 0;
  private shouldReconnect = false;
  private socket: WebSocketLike | null = null;

  // Cached data
  private cachedGraph: ExportedGraph = createEmptyGraph();
  private cachedTraces: readonly TraceEntry[] = [];
  private cachedStats: TraceStats = createEmptyStats();
  private cachedSnapshot: ContainerSnapshot | null = null;

  // Refresh timer
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options: RemoteDataSourceOptions = {}) {
    // Default WebSocket factory for browsers
    const defaultCreateWebSocket = (url: string): WebSocketLike => {
      if (typeof WebSocket !== "undefined") {
        return new WebSocket(url) as WebSocketLike;
      }
      throw new Error(
        "No WebSocket implementation available. " +
          "In Node.js, provide createWebSocket option with 'ws' package."
      );
    };

    this.options = {
      url: options.url ?? "ws://localhost:9229/devtools",
      appId: options.appId ?? "",
      autoReconnect: options.autoReconnect ?? true,
      reconnectDelay: options.reconnectDelay ?? 5000,
      refreshInterval: options.refreshInterval ?? 1000,
      requestTimeout: options.requestTimeout ?? 30000,
      createWebSocket: options.createWebSocket ?? defaultCreateWebSocket,
    };

    if (options.appId !== undefined && options.appId !== "") {
      this.currentAppId = options.appId;
    }
  }

  // ===========================================================================
  // DataSource Interface Implementation
  // ===========================================================================

  /**
   * Subscribe to graph updates.
   */
  subscribeToGraph(callback: (graph: ExportedGraph) => void): () => void {
    this.graphSubscribers.add(callback);
    // Immediately notify with current graph
    callback(this.cachedGraph);
    return () => {
      this.graphSubscribers.delete(callback);
    };
  }

  /**
   * Subscribe to trace updates.
   */
  subscribeToTraces(callback: (traces: readonly TraceEntry[]) => void): () => void {
    this.tracesSubscribers.add(callback);
    // Immediately notify with current traces
    callback(this.cachedTraces);
    return () => {
      this.tracesSubscribers.delete(callback);
    };
  }

  /**
   * Get the current graph (returns cached data).
   */
  getGraph(): ExportedGraph {
    return this.cachedGraph;
  }

  /**
   * Connect to the DevTools server and fetch initial data.
   */
  async connect(): Promise<void> {
    if (this.connectionState === "connected") return;

    this.connectionState = "connecting";
    this.shouldReconnect = this.options.autoReconnect;

    return new Promise<void>((resolve, reject) => {
      try {
        this.socket = this.options.createWebSocket(this.options.url);
      } catch (error) {
        this.connectionState = "error";
        const err = error instanceof Error ? error : new Error(String(error));
        this.emit({ type: "error", error: err });
        reject(err);
        return;
      }

      this.socket.onopen = () => {
        this.connectionState = "connected";
        this.emit({ type: "connected" });
        this.startAutoRefresh();
        // Fetch initial data
        this.initializeData()
          .then(() => resolve())
          .catch(reject);
      };

      this.socket.onmessage = (event: { data: string }) => {
        this.handleMessage(event.data);
      };

      this.socket.onclose = () => {
        this.connectionState = "disconnected";
        this.stopAutoRefresh();
        this.emit({ type: "disconnected" });
        this.handleReconnect();
      };

      this.socket.onerror = () => {
        this.connectionState = "error";
        const error = new Error("WebSocket connection error");
        this.emit({ type: "error", error });
      };
    });
  }

  /**
   * Disconnect from the DevTools server.
   */
  disconnect(): void {
    this.shouldReconnect = false;
    this.stopAutoRefresh();
    if (this.socket !== null) {
      this.socket.close();
      this.socket = null;
    }
    this.connectionState = "disconnected";
    this.emit({ type: "disconnected" });
  }

  /**
   * Get the current connection state.
   */
  get state(): DataSourceConnectionState {
    return this.connectionState;
  }

  /**
   * Check if connected to the server.
   */
  get isConnected(): boolean {
    return this.connectionState === "connected";
  }

  /**
   * Get the current app ID.
   */
  get appId(): string | null {
    return this.currentAppId;
  }

  /**
   * Add an event listener.
   */
  on(listener: DataSourceListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove an event listener.
   */
  off(listener: DataSourceListener): void {
    this.listeners.delete(listener);
  }

  // ===========================================================================
  // PresenterDataSourceContract Implementation
  // ===========================================================================

  getTraces(): readonly TraceEntry[] {
    return this.cachedTraces;
  }

  getStats(): TraceStats {
    return this.cachedStats;
  }

  getContainerSnapshot(): ContainerSnapshot | null {
    return this.cachedSnapshot;
  }

  hasTracing(): boolean {
    return this.cachedTraces.length > 0;
  }

  hasContainer(): boolean {
    return this.cachedSnapshot !== null;
  }

  isPaused(): boolean {
    return this.paused;
  }

  pause(): void {
    if (this.currentAppId !== null && this.isConnected) {
      void this.sendRequest(Methods.TRACE_CONTROL, { appId: this.currentAppId, action: "pause" });
      this.paused = true;
      this.notifySubscribers();
    }
  }

  resume(): void {
    if (this.currentAppId !== null && this.isConnected) {
      void this.sendRequest(Methods.TRACE_CONTROL, { appId: this.currentAppId, action: "resume" });
      this.paused = false;
      this.notifySubscribers();
    }
  }

  clearTraces(): void {
    if (this.currentAppId !== null && this.isConnected) {
      void this.sendRequest(Methods.TRACE_CONTROL, { appId: this.currentAppId, action: "clear" });
      this.cachedTraces = [];
      this.cachedStats = createEmptyStats();
      this.notifySubscribers();
      this.notifyTracesSubscribers();
    }
  }

  pinTrace(traceId: string): void {
    if (this.currentAppId !== null && this.isConnected) {
      void this.sendRequest(Methods.PIN_TRACE, { appId: this.currentAppId, traceId, pin: true });
      // Update local cache
      this.cachedTraces = this.cachedTraces.map(trace =>
        trace.id === traceId ? { ...trace, isPinned: true } : trace
      );
      this.notifySubscribers();
      this.notifyTracesSubscribers();
    }
  }

  unpinTrace(traceId: string): void {
    if (this.currentAppId !== null && this.isConnected) {
      void this.sendRequest(Methods.PIN_TRACE, { appId: this.currentAppId, traceId, pin: false });
      // Update local cache
      this.cachedTraces = this.cachedTraces.map(trace =>
        trace.id === traceId ? { ...trace, isPinned: false } : trace
      );
      this.notifySubscribers();
      this.notifyTracesSubscribers();
    }
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  // ===========================================================================
  // Public Methods
  // ===========================================================================

  /**
   * Manually refresh all cached data from the server.
   */
  async refresh(): Promise<void> {
    if (!this.isConnected || this.currentAppId === null) {
      return;
    }

    try {
      const [graphResult, tracesResult, statsResult, snapshotResult] = await Promise.all([
        this.sendRequest<{ graph: ExportedGraph }>(Methods.GET_GRAPH, { appId: this.currentAppId }),
        this.sendRequest<{ traces: readonly TraceEntry[] }>(Methods.GET_TRACES, {
          appId: this.currentAppId,
        }),
        this.sendRequest<{ stats: TraceStats }>(Methods.GET_STATS, { appId: this.currentAppId }),
        this.sendRequest<{ snapshot: ContainerSnapshot | null }>(Methods.GET_CONTAINER_SNAPSHOT, {
          appId: this.currentAppId,
        }),
      ]);

      const graphChanged = JSON.stringify(this.cachedGraph) !== JSON.stringify(graphResult.graph);
      const tracesChanged =
        JSON.stringify(this.cachedTraces) !== JSON.stringify(tracesResult.traces);

      this.cachedGraph = graphResult.graph;
      this.cachedTraces = tracesResult.traces;
      this.cachedStats = statsResult.stats;
      this.cachedSnapshot = snapshotResult.snapshot;

      this.notifySubscribers();

      if (graphChanged) {
        this.notifyGraphSubscribers();
      }

      if (tracesChanged) {
        this.notifyTracesSubscribers();
      }
    } catch {
      // Ignore refresh errors - keep using cached data
    }
  }

  /**
   * Dispose the data source and clean up resources.
   */
  dispose(): void {
    this.disconnect();
    this.listeners.clear();
    this.subscribers.clear();
    this.graphSubscribers.clear();
    this.tracesSubscribers.clear();
    this.pendingRequests.clear();
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private async initializeData(): Promise<void> {
    // If no appId was specified, get the first available app
    if (this.currentAppId === null) {
      const result = await this.sendRequest<{
        apps: readonly { appId: string; appName: string }[];
      }>(Methods.LIST_APPS, undefined);
      const firstApp = result.apps[0];
      if (firstApp === undefined) {
        throw new Error("No apps connected to DevTools server");
      }
      this.currentAppId = firstApp.appId;
    }

    // Fetch initial data
    await this.refresh();
  }

  private async sendRequest<T>(method: string, params: unknown): Promise<T> {
    if (!this.isConnected || this.socket === null || this.socket.readyState !== WS_OPEN) {
      throw new Error("Not connected");
    }

    const id = ++this.requestIdCounter;
    const request = createRequest(id, method, params);
    const socket = this.socket;

    return new Promise<T>((resolve, reject) => {
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

  private startAutoRefresh(): void {
    if (this.options.refreshInterval <= 0) {
      return;
    }

    this.stopAutoRefresh();
    this.refreshTimer = setInterval(() => {
      void this.refresh();
    }, this.options.refreshInterval);
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer !== null) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private notifySubscribers(): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber();
      } catch {
        // Ignore subscriber errors
      }
    }
  }

  private notifyGraphSubscribers(): void {
    for (const callback of this.graphSubscribers) {
      try {
        callback(this.cachedGraph);
      } catch {
        // Ignore callback errors
      }
    }
    this.emit({ type: "graph_update", graph: this.cachedGraph });
  }

  private notifyTracesSubscribers(): void {
    for (const callback of this.tracesSubscribers) {
      try {
        callback(this.cachedTraces);
      } catch {
        // Ignore callback errors
      }
    }
    this.emit({ type: "traces_update", traces: this.cachedTraces });
  }

  private emit(event: DataSourceEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Ignore listener errors
      }
    }
  }
}
