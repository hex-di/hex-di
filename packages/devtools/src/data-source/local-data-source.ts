/**
 * LocalDataSource - Data source for same-process container access.
 *
 * Provides access to graph and tracing data from a local container
 * running in the same process. Used for in-browser development.
 *
 * @packageDocumentation
 */

import type { Port } from "@hex-di/ports";
import type { Graph } from "@hex-di/graph";
import type { Container, ContainerPhase } from "@hex-di/runtime";
import { TRACING_ACCESS } from "@hex-di/runtime";
import type {
  ExportedGraph,
  PresenterDataSourceContract,
  TraceEntry,
  TraceStats,
  ContainerSnapshot,
} from "@hex-di/devtools-core";
import { toJSON } from "../to-json.js";
import type {
  DataSource,
  DataSourceConnectionState,
  DataSourceEvent,
  DataSourceListener,
} from "./data-source.js";

// =============================================================================
// Tracing API Type (matching runtime's TracingAPI)
// =============================================================================

/**
 * Trace entry from the runtime tracing system.
 */
interface RuntimeTraceEntry {
  readonly id: string;
  readonly portName: string;
  readonly lifetime: "singleton" | "scoped" | "transient";
  readonly startTime: number;
  readonly duration: number;
  readonly isCacheHit: boolean;
  readonly isPinned: boolean;
  readonly parentId: string | null;
  readonly childIds: readonly string[];
  readonly scopeId: string | null;
  readonly order: number;
}

/**
 * Trace statistics from the runtime.
 */
interface RuntimeTraceStats {
  readonly totalResolutions: number;
  readonly averageDuration: number;
  readonly cacheHitRate: number;
  readonly slowCount: number;
  readonly sessionStart: number;
  readonly totalDuration: number;
}

/**
 * Runtime tracing API interface.
 */
interface RuntimeTracingAPI {
  getTraces(): readonly RuntimeTraceEntry[];
  getStats(): RuntimeTraceStats;
  isPaused(): boolean;
  pause(): void;
  resume(): void;
  clear(): void;
  pinTrace(traceId: string): void;
  unpinTrace(traceId: string): void;
  subscribe(callback: () => void): () => void;
}

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
  private readonly tracingAPI: RuntimeTracingAPI | null;
  private readonly containerRef: Container<
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
    container?: Container<Port<unknown, string>, Port<unknown, string>, ContainerPhase>
  ) {
    this.exportedGraph = toJSON(graph);
    this.containerRef = container ?? null;

    // Extract tracing API if available
    if (container !== undefined) {
      const containerWithTracing = container as { [TRACING_ACCESS]?: RuntimeTracingAPI };
      this.tracingAPI = containerWithTracing[TRACING_ACCESS] ?? null;

      // Subscribe to tracing changes
      if (this.tracingAPI !== null) {
        this.unsubscribeFromTracing = this.tracingAPI.subscribe(() => {
          this.notifySubscribers();
          this.notifyTracesSubscribers();
        });
      }
    } else {
      this.tracingAPI = null;
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
   */
  getContainerSnapshot(): ContainerSnapshot | null {
    if (this.containerRef === null) {
      return null;
    }

    // Container snapshot is limited without direct access to container internals
    // Return basic snapshot structure
    return {
      singletons: [],
      scopes: [],
      phase: "ready",
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
      this.tracingAPI.pinTrace(traceId);
    }
  }

  /**
   * Unpin a trace entry.
   */
  unpinTrace(traceId: string): void {
    if (this.tracingAPI !== null) {
      this.tracingAPI.unpinTrace(traceId);
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
