/**
 * Mock implementation of PresenterDataSourceContract for testing.
 *
 * This mock allows you to control the data returned by the data source
 * and trigger updates to subscribed callbacks. Useful for testing
 * presenter components and hooks that depend on data sources.
 *
 * @packageDocumentation
 */

import type {
  ExportedGraph,
  TraceEntry,
  TraceStats,
  ContainerSnapshot,
} from "@hex-di/devtools-core";

// =============================================================================
// Contract Interface (mirrors PresenterDataSourceContract)
// =============================================================================

/**
 * Presenter data source contract that this mock implements.
 *
 * Duplicated here to avoid a dependency on devtools-ui package.
 * This interface matches PresenterDataSourceContract exactly.
 */
export interface PresenterDataSourceContract {
  getGraph(): ExportedGraph;
  getTraces(): readonly TraceEntry[];
  getStats(): TraceStats;
  getContainerSnapshot(): ContainerSnapshot | null;
  hasTracing(): boolean;
  hasContainer(): boolean;
  isPaused(): boolean;
  pause(): void;
  resume(): void;
  clearTraces(): void;
  pinTrace(traceId: string): void;
  unpinTrace(traceId: string): void;
  subscribe(callback: () => void): () => void;
}

// =============================================================================
// Mock Configuration
// =============================================================================

/**
 * Configuration options for creating a mock data source.
 */
export interface MockDataSourceConfig {
  /**
   * Initial graph data. Defaults to an empty graph.
   */
  readonly graph?: ExportedGraph;

  /**
   * Initial trace entries. Defaults to an empty array.
   */
  readonly traces?: readonly TraceEntry[];

  /**
   * Initial trace statistics. Defaults to empty stats.
   */
  readonly stats?: TraceStats;

  /**
   * Initial container snapshot. Defaults to null.
   */
  readonly snapshot?: ContainerSnapshot | null;

  /**
   * Whether tracing is available. Defaults to true.
   */
  readonly hasTracing?: boolean;

  /**
   * Whether container inspection is available. Defaults to true.
   */
  readonly hasContainer?: boolean;

  /**
   * Whether tracing is initially paused. Defaults to false.
   */
  readonly isPaused?: boolean;
}

// =============================================================================
// Mock Actions Interface
// =============================================================================

/**
 * Actions available on the mock data source for controlling behavior in tests.
 */
export interface MockDataSourceActions {
  /**
   * Trigger all subscribed callbacks.
   * Call this after modifying the mock data to notify subscribers.
   */
  _triggerUpdate(): void;

  /**
   * Set the graph data and optionally trigger an update.
   *
   * @param graph - The new graph data
   * @param autoTrigger - Whether to automatically trigger subscribers (default: true)
   */
  _setGraph(graph: ExportedGraph, autoTrigger?: boolean): void;

  /**
   * Set the trace entries and optionally trigger an update.
   *
   * @param traces - The new trace entries
   * @param autoTrigger - Whether to automatically trigger subscribers (default: true)
   */
  _setTraces(traces: readonly TraceEntry[], autoTrigger?: boolean): void;

  /**
   * Set the trace statistics and optionally trigger an update.
   *
   * @param stats - The new statistics
   * @param autoTrigger - Whether to automatically trigger subscribers (default: true)
   */
  _setStats(stats: TraceStats, autoTrigger?: boolean): void;

  /**
   * Set the container snapshot and optionally trigger an update.
   *
   * @param snapshot - The new snapshot
   * @param autoTrigger - Whether to automatically trigger subscribers (default: true)
   */
  _setSnapshot(snapshot: ContainerSnapshot | null, autoTrigger?: boolean): void;

  /**
   * Get all currently subscribed callbacks.
   * Useful for verifying subscription behavior in tests.
   */
  _getSubscribers(): ReadonlySet<() => void>;

  /**
   * Get the IDs of all pinned traces.
   */
  _getPinnedTraceIds(): ReadonlySet<string>;

  /**
   * Get the count of pause() calls.
   */
  _getPauseCallCount(): number;

  /**
   * Get the count of resume() calls.
   */
  _getResumeCallCount(): number;

  /**
   * Get the count of clearTraces() calls.
   */
  _getClearCallCount(): number;
}

// =============================================================================
// Default Values
// =============================================================================

const DEFAULT_GRAPH: ExportedGraph = {
  nodes: [],
  edges: [],
};

const DEFAULT_STATS: TraceStats = {
  totalResolutions: 0,
  averageDuration: 0,
  cacheHitRate: 0,
  slowCount: 0,
  sessionStart: Date.now(),
  totalDuration: 0,
};

// =============================================================================
// Mock Implementation
// =============================================================================

/**
 * Create a mock data source for testing.
 *
 * @example Basic usage
 * ```typescript
 * import { createMockDataSource } from "@hex-di/devtools-testing";
 *
 * const mockDataSource = createMockDataSource({
 *   graph: { nodes: [], edges: [] },
 *   traces: [],
 * });
 *
 * // Use in tests
 * const graph = mockDataSource.getGraph();
 *
 * // Update data and trigger subscribers
 * mockDataSource._setGraph({ nodes: [node1], edges: [] });
 * ```
 *
 * @example With subscription testing
 * ```typescript
 * const mock = createMockDataSource();
 * const callback = vi.fn();
 *
 * const unsubscribe = mock.subscribe(callback);
 *
 * mock._setGraph({ nodes: [], edges: [] });
 *
 * expect(callback).toHaveBeenCalledOnce();
 *
 * unsubscribe();
 * mock._triggerUpdate();
 *
 * expect(callback).toHaveBeenCalledOnce(); // Still 1, unsubscribed
 * ```
 *
 * @param config - Optional configuration for initial state
 * @returns A mock data source with test control actions
 */
export function createMockDataSource(
  config: MockDataSourceConfig = {}
): PresenterDataSourceContract & MockDataSourceActions {
  // Internal state
  let graph: ExportedGraph = config.graph ?? DEFAULT_GRAPH;
  let traces: readonly TraceEntry[] = config.traces ?? [];
  let stats: TraceStats = config.stats ?? DEFAULT_STATS;
  let snapshot: ContainerSnapshot | null = config.snapshot ?? null;
  const hasTracingFlag = config.hasTracing ?? true;
  const hasContainerFlag = config.hasContainer ?? true;
  let paused = config.isPaused ?? false;

  // Tracking state
  const subscribers = new Set<() => void>();
  const pinnedTraceIds = new Set<string>();
  let pauseCallCount = 0;
  let resumeCallCount = 0;
  let clearCallCount = 0;

  // Helper to trigger all subscribers
  const triggerUpdate = (): void => {
    for (const callback of subscribers) {
      callback();
    }
  };

  return {
    // PresenterDataSourceContract implementation
    getGraph(): ExportedGraph {
      return graph;
    },

    getTraces(): readonly TraceEntry[] {
      return traces;
    },

    getStats(): TraceStats {
      return stats;
    },

    getContainerSnapshot(): ContainerSnapshot | null {
      return snapshot;
    },

    hasTracing(): boolean {
      return hasTracingFlag;
    },

    hasContainer(): boolean {
      return hasContainerFlag;
    },

    isPaused(): boolean {
      return paused;
    },

    pause(): void {
      paused = true;
      pauseCallCount++;
      triggerUpdate();
    },

    resume(): void {
      paused = false;
      resumeCallCount++;
      triggerUpdate();
    },

    clearTraces(): void {
      traces = [];
      clearCallCount++;
      triggerUpdate();
    },

    pinTrace(traceId: string): void {
      pinnedTraceIds.add(traceId);
      // Update the trace to be pinned
      traces = traces.map(trace => (trace.id === traceId ? { ...trace, isPinned: true } : trace));
      triggerUpdate();
    },

    unpinTrace(traceId: string): void {
      pinnedTraceIds.delete(traceId);
      // Update the trace to be unpinned
      traces = traces.map(trace => (trace.id === traceId ? { ...trace, isPinned: false } : trace));
      triggerUpdate();
    },

    subscribe(callback: () => void): () => void {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },

    // MockDataSourceActions implementation
    _triggerUpdate(): void {
      triggerUpdate();
    },

    _setGraph(newGraph: ExportedGraph, autoTrigger = true): void {
      graph = newGraph;
      if (autoTrigger) {
        triggerUpdate();
      }
    },

    _setTraces(newTraces: readonly TraceEntry[], autoTrigger = true): void {
      traces = newTraces;
      if (autoTrigger) {
        triggerUpdate();
      }
    },

    _setStats(newStats: TraceStats, autoTrigger = true): void {
      stats = newStats;
      if (autoTrigger) {
        triggerUpdate();
      }
    },

    _setSnapshot(newSnapshot: ContainerSnapshot | null, autoTrigger = true): void {
      snapshot = newSnapshot;
      if (autoTrigger) {
        triggerUpdate();
      }
    },

    _getSubscribers(): ReadonlySet<() => void> {
      return subscribers;
    },

    _getPinnedTraceIds(): ReadonlySet<string> {
      return pinnedTraceIds;
    },

    _getPauseCallCount(): number {
      return pauseCallCount;
    },

    _getResumeCallCount(): number {
      return resumeCallCount;
    },

    _getClearCallCount(): number {
      return clearCallCount;
    },
  };
}
