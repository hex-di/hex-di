/**
 * DataSource interface for DevTools data access.
 *
 * Provides a unified interface for accessing graph and trace data
 * from different sources (local container or remote WebSocket).
 *
 * @packageDocumentation
 */

import type { ExportedGraph } from "@hex-di/devtools-core";
import type { TraceEntry } from "@hex-di/core";

// =============================================================================
// DataSource Interface
// =============================================================================

/**
 * Unified interface for DevTools data sources.
 *
 * Both LocalDataSource (same-process) and RemoteDataSource (WebSocket)
 * implement this interface, allowing DevTools UI components to work
 * with either data source transparently.
 *
 * @example LocalDataSource for browser development
 * ```typescript
 * import { LocalDataSource } from '@hex-di/devtools';
 *
 * const dataSource = new LocalDataSource(graph, container);
 * dataSource.subscribeToGraph((graph) => {
 *   console.log('Graph updated:', graph);
 * });
 * ```
 *
 * @example RemoteDataSource for CLI tools
 * ```typescript
 * import { RemoteDataSource } from '@hex-di/devtools';
 *
 * const dataSource = new RemoteDataSource({ url: 'ws://localhost:9229/devtools' });
 * await dataSource.connect();
 * ```
 */
export interface DataSource {
  /**
   * Subscribe to graph updates.
   *
   * The callback is invoked whenever the dependency graph changes.
   *
   * @param callback - Function to call with the updated graph
   * @returns Unsubscribe function to stop receiving updates
   */
  subscribeToGraph(callback: (graph: ExportedGraph) => void): () => void;

  /**
   * Subscribe to trace updates.
   *
   * The callback is invoked whenever trace entries change.
   *
   * @param callback - Function to call with updated trace entries
   * @returns Unsubscribe function to stop receiving updates
   */
  subscribeToTraces(callback: (traces: readonly TraceEntry[]) => void): () => void;

  /**
   * Get the current graph synchronously.
   *
   * Returns null if no graph data is available yet (e.g., before connection).
   *
   * @returns The current exported graph or null
   */
  getGraph(): ExportedGraph | null;

  /**
   * Connect to the data source.
   *
   * For LocalDataSource, this is a no-op.
   * For RemoteDataSource, this establishes the WebSocket connection.
   *
   * @returns Promise that resolves when connected
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the data source.
   *
   * For LocalDataSource, this cleans up subscriptions.
   * For RemoteDataSource, this closes the WebSocket connection.
   */
  disconnect(): void;
}

/**
 * Connection state for data sources.
 */
export type DataSourceConnectionState = "disconnected" | "connecting" | "connected" | "error";

/**
 * Event emitted by data sources.
 */
export type DataSourceEvent =
  | { readonly type: "connected" }
  | { readonly type: "disconnected" }
  | { readonly type: "error"; readonly error: Error }
  | { readonly type: "graph_update"; readonly graph: ExportedGraph }
  | { readonly type: "traces_update"; readonly traces: readonly TraceEntry[] };

/**
 * Listener for data source events.
 */
export type DataSourceListener = (event: DataSourceEvent) => void;
