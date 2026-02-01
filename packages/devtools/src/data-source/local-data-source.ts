/**
 * LocalDataSource - Data source for same-process container access.
 *
 * Provides access to graph and tracing data from a local container
 * running in the same process. Used for in-browser development.
 *
 * @packageDocumentation
 */

import type {
  Port,
  TracingAPI,
  TraceEntry,
  TraceStats,
  ContainerSnapshot,
  InspectorAPI,
} from "@hex-di/core";
import type { Graph } from "@hex-di/graph";
import type { Container, ContainerPhase } from "@hex-di/runtime";
import { createInspector, getTracingAPI, getInspectorAPI } from "@hex-di/runtime";
import {
  toJSON,
  type ExportedGraph,
  type PresenterDataSourceContract,
} from "@hex-di/devtools-core";
import type {
  DataSource,
  DataSourceConnectionState,
  DataSourceEvent,
  DataSourceListener,
} from "./data-source.js";

// =============================================================================
// Local Data Source
// =============================================================================

/**
 * Local data source implementation for same-process access.
 *
 * Provides direct access to a container's graph and tracing data
 * without network overhead. Implements both DataSource (for new unified API)
 * and PresenterDataSourceContract (for backward compatibility with presenters).
 *
 * @example
 * ```tsx
 * import { LocalDataSource } from '@hex-di/devtools';
 * import { FloatingDevTools } from '@hex-di/devtools/dom';
 *
 * const dataSource = new LocalDataSource(graph, container);
 *
 * function App() {
 *   return (
 *     <>
 *       <MainApp />
 *       <FloatingDevTools dataSource={dataSource} />
 *     </>
 *   );
 * }
 * ```
 */
export class LocalDataSource implements DataSource, PresenterDataSourceContract {
  private readonly exportedGraph: ExportedGraph;
  private readonly tracingAPI: TracingAPI | null;
  private readonly inspectorAPI: InspectorAPI | null;
  private readonly containerRef: Container<
    Port<unknown, string>,
    Port<unknown, string>,
    Port<unknown, string>,
    ContainerPhase
  > | null;
  private readonly subscribers = new Set<() => void>();
  private readonly graphSubscribers = new Set<(graph: ExportedGraph) => void>();
  private readonly tracesSubscribers = new Set<(traces: readonly TraceEntry[]) => void>();
  private readonly listeners = new Set<DataSourceListener>();
  private unsubscribeFromTracing: (() => void) | null = null;
  private connectionState: DataSourceConnectionState = "disconnected";

  /**
   * Create a new local data source.
   *
   * @param graph - The dependency graph to visualize
   * @param container - Optional container for runtime inspection and tracing
   */
  constructor(
    graph: Graph<Port<unknown, string>>,
    container?: Container<
      Port<unknown, string>,
      Port<unknown, string>,
      Port<unknown, string>,
      ContainerPhase
    >
  ) {
    this.exportedGraph = toJSON(graph);
    this.containerRef = container ?? null;

    // Extract tracing API if TracingPlugin is registered
    this.tracingAPI = container !== undefined ? (getTracingAPI(container) ?? null) : null;

    // Extract inspector API if InspectorPlugin is registered
    this.inspectorAPI = container !== undefined ? (getInspectorAPI(container) ?? null) : null;

    // Subscribe to tracing changes
    if (this.tracingAPI !== null) {
      this.unsubscribeFromTracing = this.tracingAPI.subscribe(() => {
        this.notifySubscribers();
        this.notifyTracesSubscribers();
      });
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
    callback(this.exportedGraph);
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
    callback(this.getTraces());
    return () => {
      this.tracesSubscribers.delete(callback);
    };
  }

  /**
   * Get the current graph (always available for local source).
   */
  getGraph(): ExportedGraph {
    return this.exportedGraph;
  }

  /**
   * Connect to the data source (no-op for local).
   */
  connect(): Promise<void> {
    this.connectionState = "connected";
    this.emit({ type: "connected" });
    // Emit initial data
    this.emit({ type: "graph_update", graph: this.exportedGraph });
    this.emit({ type: "traces_update", traces: this.getTraces() });
    return Promise.resolve();
  }

  /**
   * Disconnect from the data source.
   */
  disconnect(): void {
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

  /**
   * Get all trace entries.
   */
  getTraces(): readonly TraceEntry[] {
    if (this.tracingAPI === null) {
      return [];
    }
    return this.tracingAPI.getTraces();
  }

  /**
   * Get trace statistics.
   */
  getStats(): TraceStats {
    if (this.tracingAPI === null) {
      return {
        totalResolutions: 0,
        averageDuration: 0,
        cacheHitRate: 0,
        slowCount: 0,
        sessionStart: Date.now(),
        totalDuration: 0,
      };
    }
    return this.tracingAPI.getStats();
  }

  /**
   * Get container snapshot.
   *
   * Uses InspectorPlugin if available, otherwise falls back to createInspector().
   */
  getContainerSnapshot(): ContainerSnapshot | null {
    if (this.containerRef === null) {
      return null;
    }

    // Prefer InspectorPlugin for typed snapshots
    if (this.inspectorAPI !== null) {
      return this.inspectorAPI.getSnapshot();
    }

    // Fallback: use createInspector directly
    const inspector = createInspector(this.containerRef);
    const rawSnapshot = inspector.snapshot();

    // Map runtime's SingletonEntry to devtools-core's SingletonEntry
    const singletons = rawSnapshot.singletons.map(entry => ({
      portName: entry.portName,
      lifetime: entry.lifetime,
      isResolved: entry.isResolved,
      resolvedAt: entry.resolvedAt ?? 0,
    }));

    // Build a root container snapshot from the raw data
    return {
      kind: "root",
      phase: rawSnapshot.isDisposed ? "disposed" : "initialized",
      isDisposed: rawSnapshot.isDisposed,
      singletons,
      scopes: inspector.getScopeTree(),
      isInitialized: true,
      asyncAdaptersTotal: 0,
      asyncAdaptersInitialized: 0,
      containerName: rawSnapshot.containerName,
    };
  }

  /**
   * Check if tracing is available.
   */
  hasTracing(): boolean {
    return this.tracingAPI !== null;
  }

  /**
   * Check if container inspection is available.
   */
  hasContainer(): boolean {
    return this.containerRef !== null;
  }

  /**
   * Check if currently paused.
   */
  isPaused(): boolean {
    if (this.tracingAPI === null) {
      return false;
    }
    return this.tracingAPI.isPaused();
  }

  /**
   * Pause tracing.
   */
  pause(): void {
    if (this.tracingAPI !== null) {
      this.tracingAPI.pause();
    }
  }

  /**
   * Resume tracing.
   */
  resume(): void {
    if (this.tracingAPI !== null) {
      this.tracingAPI.resume();
    }
  }

  /**
   * Clear all traces.
   */
  clearTraces(): void {
    if (this.tracingAPI !== null) {
      this.tracingAPI.clear();
    }
  }

  /**
   * Pin a trace entry.
   */
  pinTrace(traceId: string): void {
    if (this.tracingAPI !== null) {
      this.tracingAPI.pin(traceId);
    }
  }

  /**
   * Unpin a trace entry.
   */
  unpinTrace(traceId: string): void {
    if (this.tracingAPI !== null) {
      this.tracingAPI.unpin(traceId);
    }
  }

  /**
   * Subscribe to data changes.
   */
  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Dispose resources.
   */
  dispose(): void {
    if (this.unsubscribeFromTracing !== null) {
      this.unsubscribeFromTracing();
      this.unsubscribeFromTracing = null;
    }
    this.subscribers.clear();
    this.graphSubscribers.clear();
    this.tracesSubscribers.clear();
    this.listeners.clear();
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private notifySubscribers(): void {
    queueMicrotask(() => {
      for (const callback of this.subscribers) {
        callback();
      }
    });
  }

  private notifyTracesSubscribers(): void {
    queueMicrotask(() => {
      const traces = this.getTraces();
      for (const callback of this.tracesSubscribers) {
        callback(traces);
      }
      this.emit({ type: "traces_update", traces });
    });
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
