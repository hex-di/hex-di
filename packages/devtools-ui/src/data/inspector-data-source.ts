/**
 * Transport-agnostic interface for accessing container inspection data.
 *
 * Panels program against this interface and work identically in both
 * DevTools (WebSocket) and Playground (postMessage) contexts.
 *
 * This is a read-only subset of InspectorAPI. It includes only the methods
 * that visualization panels need, excludes write operations and internal methods.
 * All return types are `| undefined` to accommodate asynchronous transports
 * where data may not have arrived yet.
 *
 * @packageDocumentation
 */

import type {
  ContainerSnapshot,
  ScopeTree,
  ContainerGraphData,
  UnifiedSnapshot,
  AdapterInfo,
  LibraryInspector,
  ResultStatistics,
  InspectorEvent,
} from "@hex-di/core";
import type { ResultChainDescriptor, ResultChainExecution } from "../panels/result/types.js";

/**
 * Transport-agnostic interface for accessing container inspection data.
 *
 * Panels program against this interface and work identically in both
 * DevTools (WebSocket) and Playground (postMessage) contexts.
 */
export interface InspectorDataSource {
  // Pull-based queries -- return undefined when data is not yet available

  /** Current container snapshot, or undefined if no data available. */
  getSnapshot(): ContainerSnapshot | undefined;

  /** Current scope tree, or undefined if no data available. */
  getScopeTree(): ScopeTree | undefined;

  /** Current graph data for visualization, or undefined if no data available. */
  getGraphData(): ContainerGraphData | undefined;

  /**
   * Unified snapshot including container state and all library snapshots,
   * or undefined if no data available.
   */
  getUnifiedSnapshot(): UnifiedSnapshot | undefined;

  /**
   * Adapter information for all registered ports,
   * or undefined if no data available.
   */
  getAdapterInfo(): readonly AdapterInfo[] | undefined;

  /**
   * All registered library inspectors,
   * or undefined if no data available.
   */
  getLibraryInspectors(): ReadonlyMap<string, LibraryInspector> | undefined;

  /**
   * Result statistics for all ports,
   * or undefined if no data available.
   */
  getAllResultStatistics(): ReadonlyMap<string, ResultStatistics> | undefined;

  // Result chain tracing -- Level 1 data (optional, only available with tracing)

  /**
   * All registered Result chain descriptors from TracedResult instrumentation.
   * Returns undefined when tracing is not enabled.
   */
  getResultChains?(): ReadonlyMap<string, ResultChainDescriptor> | undefined;

  /**
   * Recent executions for a specific chain.
   * Returns undefined when tracing is not enabled.
   */
  getResultExecutions?(chainId: string): readonly ResultChainExecution[] | undefined;

  // Push-based subscription -- listener fires on any data change

  /**
   * Subscribe to data changes. The listener receives InspectorEvents
   * matching the same event types defined in @hex-di/core.
   *
   * Returns an unsubscribe function.
   */
  subscribe(listener: (event: InspectorEvent) => void): () => void;

  // Metadata

  /**
   * Human-readable name for this data source.
   * DevTools: application name (e.g., "My App").
   * Playground: "Playground Sandbox".
   */
  readonly displayName: string;

  /**
   * Discriminant indicating the transport type.
   * "remote" for WebSocket-backed sources, "local" for direct/sandbox sources.
   */
  readonly sourceType: "remote" | "local";
}
