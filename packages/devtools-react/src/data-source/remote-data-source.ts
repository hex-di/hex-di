/**
 * Remote data source using WebSocket for browser environments.
 *
 * This data source connects to a DevTools server via WebSocket to fetch
 * dependency graphs, traces, and other debugging data from remote HexDI
 * applications.
 *
 * Uses a caching approach: data is fetched asynchronously from the server
 * and cached locally. The PresenterDataSourceContract methods then provide
 * synchronous access to this cached data, which is required by the presenters.
 *
 * @packageDocumentation
 */

import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import type {
  ExportedGraph,
  PresenterDataSourceContract,
  TraceEntry,
  TraceStats,
  ContainerSnapshot,
} from "@hex-di/devtools-core";
import {
  DevToolsClient,
  BrowserWebSocketAdapter,
  WebSocketPort,
  type ClientOptions,
  type WebSocketService,
} from "@hex-di/devtools-network";

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
   * Pre-configured WebSocketService instance.
   *
   * If provided, this WebSocket service will be used directly instead of
   * creating an internal container. This is the recommended approach for
   * proper dependency injection.
   *
   * If not provided, an internal container will be created with the
   * BrowserWebSocketAdapter. The internal container will be disposed when
   * `dispose()` is called.
   */
  readonly webSocket?: import("@hex-di/devtools-network").WebSocketService;
}

/**
 * Connection state for RemoteDataSource.
 */
export type RemoteConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

/**
 * Event emitted by RemoteDataSource.
 */
export type RemoteDataSourceEvent =
  | { readonly type: "connected" }
  | { readonly type: "disconnected" }
  | { readonly type: "error"; readonly error: Error }
  | { readonly type: "data_update" };

/**
 * Listener for RemoteDataSource events.
 */
export type RemoteDataSourceListener = (event: RemoteDataSourceEvent) => void;

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
 * Uses the BrowserWebSocketAdapter for browser-native WebSocket connections.
 * Implements the PresenterDataSourceContract to provide data to React components.
 *
 * Data is fetched asynchronously and cached locally. The contract methods
 * provide synchronous access to the cached data.
 *
 * @example
 * ```typescript
 * import { RemoteDataSource, DevToolsProvider } from '@hex-di/devtools-react';
 *
 * // Create remote data source
 * const dataSource = new RemoteDataSource({
 *   url: 'ws://localhost:9229/devtools',
 *   appId: 'my-app',
 * });
 *
 * // Connect to server (fetches initial data)
 * await dataSource.connect();
 *
 * // Use in React
 * function App() {
 *   return (
 *     <DevToolsProvider dataSource={dataSource}>
 *       <MainApp />
 *     </DevToolsProvider>
 *   );
 * }
 * ```
 */
export class RemoteDataSource implements PresenterDataSourceContract {
  private readonly client: DevToolsClient;
  private readonly options: Required<Omit<RemoteDataSourceOptions, "webSocket">>;
  private readonly listeners = new Set<RemoteDataSourceListener>();
  private readonly subscribers = new Set<() => void>();
  private connectionState: RemoteConnectionState = "disconnected";
  private currentAppId: string | null = null;
  private paused = false;

  /**
   * Internal container created when no webSocket is provided.
   * Will be disposed when `dispose()` is called.
   * Null if webSocket was provided via options (external DI).
   */
  private readonly internalContainer: { dispose(): Promise<void> } | null;

  // Cached data
  private cachedGraph: ExportedGraph = createEmptyGraph();
  private cachedTraces: readonly TraceEntry[] = [];
  private cachedStats: TraceStats = createEmptyStats();
  private cachedSnapshot: ContainerSnapshot | null = null;

  // Refresh timer
  private refreshTimer: number | null = null;

  constructor(options: RemoteDataSourceOptions = {}) {
    this.options = {
      url: options.url ?? "ws://localhost:9229/devtools",
      appId: options.appId ?? "",
      autoReconnect: options.autoReconnect ?? true,
      reconnectDelay: options.reconnectDelay ?? 5000,
      refreshInterval: options.refreshInterval ?? 1000,
    };

    // Use injected WebSocket service or create internal container
    let webSocket: WebSocketService;
    if (options.webSocket !== undefined) {
      // External DI - use provided WebSocket service
      webSocket = options.webSocket;
      this.internalContainer = null;
    } else {
      // Fallback - create internal container (will be disposed in dispose())
      const graph = GraphBuilder.create().provide(BrowserWebSocketAdapter).build();
      const container = createContainer(graph);
      webSocket = container.resolve(WebSocketPort);
      this.internalContainer = container;
    }

    // Create DevToolsClient with browser WebSocket
    const clientOptions: ClientOptions = {
      url: this.options.url,
      webSocket,
      autoReconnect: this.options.autoReconnect,
      reconnectDelay: this.options.reconnectDelay,
    };
    this.client = new DevToolsClient(clientOptions);

    // If appId was provided, use it
    if (options.appId !== undefined && options.appId !== "") {
      this.currentAppId = options.appId;
    }

    // Forward client events
    this.client.on((event) => {
      switch (event.type) {
        case "connected":
          this.connectionState = "connected";
          this.emit({ type: "connected" });
          this.startAutoRefresh();
          break;
        case "disconnected":
          this.connectionState = "disconnected";
          this.stopAutoRefresh();
          this.emit({ type: "disconnected" });
          break;
        case "error":
          this.connectionState = "error";
          this.emit({ type: "error", error: event.error });
          break;
        case "data_update":
          this.emit({ type: "data_update" });
          break;
      }
    });
  }

  /**
   * Connect to the DevTools server and fetch initial data.
   */
  async connect(): Promise<void> {
    this.connectionState = "connecting";
    await this.client.connect();

    // If no appId was specified, get the first available app
    if (this.currentAppId === null) {
      const apps = await this.client.listApps();
      const firstApp = apps[0];
      if (firstApp === undefined) {
        throw new Error("No apps connected to DevTools server");
      }
      this.currentAppId = firstApp.appId;
    }

    // Fetch initial data
    await this.refresh();
  }

  /**
   * Disconnect from the DevTools server.
   */
  disconnect(): void {
    this.stopAutoRefresh();
    this.client.disconnect();
    this.connectionState = "disconnected";
  }

  /**
   * Dispose the data source and clean up resources.
   *
   * This will:
   * 1. Disconnect from the server
   * 2. Clear all listeners and subscribers
   * 3. Dispose the internal container if one was created
   *
   * After calling dispose(), the data source should not be reused.
   */
  async dispose(): Promise<void> {
    this.disconnect();
    this.listeners.clear();
    this.subscribers.clear();

    // Dispose internal container if we created one
    if (this.internalContainer !== null) {
      await this.internalContainer.dispose();
    }
  }

  /**
   * Manually refresh all cached data from the server.
   */
  async refresh(): Promise<void> {
    if (!this.client.connected || this.currentAppId === null) {
      return;
    }

    try {
      const [graph, traces, stats, snapshot] = await Promise.all([
        this.client.getGraph(this.currentAppId),
        this.client.getTraces(this.currentAppId),
        this.client.getStats(this.currentAppId),
        this.client.getSnapshot(this.currentAppId),
      ]);

      this.cachedGraph = graph;
      this.cachedTraces = traces;
      this.cachedStats = stats;
      this.cachedSnapshot = snapshot;

      this.emit({ type: "data_update" });
      this.notifySubscribers();
    } catch {
      // Ignore refresh errors - keep using cached data
    }
  }

  /**
   * Get the current connection state.
   */
  get state(): RemoteConnectionState {
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
  on(listener: RemoteDataSourceListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove an event listener.
   */
  off(listener: RemoteDataSourceListener): void {
    this.listeners.delete(listener);
  }

  // ===========================================================================
  // PresenterDataSourceContract Implementation (Synchronous Cached Access)
  // ===========================================================================

  getGraph(): ExportedGraph {
    return this.cachedGraph;
  }

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
    if (this.currentAppId !== null && this.client.connected) {
      void this.client.pauseTracing(this.currentAppId);
      this.paused = true;
      this.notifySubscribers();
    }
  }

  resume(): void {
    if (this.currentAppId !== null && this.client.connected) {
      void this.client.resumeTracing(this.currentAppId);
      this.paused = false;
      this.notifySubscribers();
    }
  }

  clearTraces(): void {
    if (this.currentAppId !== null && this.client.connected) {
      void this.client.clearTraces(this.currentAppId);
      this.cachedTraces = [];
      this.cachedStats = createEmptyStats();
      this.notifySubscribers();
    }
  }

  pinTrace(traceId: string): void {
    if (this.currentAppId !== null && this.client.connected) {
      void this.client.pinTrace(this.currentAppId, traceId);
      // Update local cache
      this.cachedTraces = this.cachedTraces.map((trace) =>
        trace.id === traceId ? { ...trace, isPinned: true } : trace
      );
      this.notifySubscribers();
    }
  }

  unpinTrace(traceId: string): void {
    if (this.currentAppId !== null && this.client.connected) {
      void this.client.unpinTrace(this.currentAppId, traceId);
      // Update local cache
      this.cachedTraces = this.cachedTraces.map((trace) =>
        trace.id === traceId ? { ...trace, isPinned: false } : trace
      );
      this.notifySubscribers();
    }
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private startAutoRefresh(): void {
    if (this.options.refreshInterval <= 0) {
      return;
    }

    this.stopAutoRefresh();
    this.refreshTimer = window.setInterval(() => {
      void this.refresh();
    }, this.options.refreshInterval);
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer !== null) {
      window.clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private emit(event: RemoteDataSourceEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Ignore listener errors
      }
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
}
