/**
 * @hex-di/devtools-core - Core types, protocol, and transform utilities for HexDI DevTools.
 *
 * This package provides the foundational types, protocol definitions, and pure
 * functions for working with dependency graphs. It has zero framework
 * dependencies and can be used in any JavaScript environment.
 *
 * ## Key Features
 *
 * - **Canonical Types**: Single source of truth for all DevTools types
 *   including graphs, traces, container snapshots, and configuration.
 *
 * - **JSON-RPC Protocol**: Complete protocol definition for DevTools
 *   communication between clients, servers, and relay nodes.
 *
 * - **toJSON**: Export dependency graphs to a JSON-serializable format
 *   with nodes (ports) and edges (dependencies).
 *
 * - **toDOT**: Generate Graphviz DOT format for professional graph
 *   visualization with configurable styling and layout direction.
 *
 * - **toMermaid**: Generate Mermaid flowchart syntax for easy embedding
 *   in Markdown documentation and GitHub README files.
 *
 * - **Transform Utilities**: Filter and transform exported graphs with
 *   composable utilities like filterGraph, byLifetime, and relabelPorts.
 *
 * @packageDocumentation
 */

// =============================================================================
// Core Types (Canonical - Single Source of Truth)
// =============================================================================

export type {
  // Re-exported from @hex-di/graph
  Lifetime,
  FactoryKind,
  // Graph types
  ExportedNode,
  ExportedEdge,
  ExportedGraph,
  // Export option types
  DOTOptions,
  MermaidOptions,
  // Transform types
  NodePredicate,
  LabelTransform,
  // Trace types
  TraceEntry,
  TraceFilter,
  TraceStats,
  TraceRetentionPolicy,
  TracingOptions,
  TracingAPI,
  // Container types
  ContainerKind,
  ContainerPhase,
  SingletonEntry,
  ScopeInfo,
  ScopeTree,
  ContainerSnapshot,
  RootContainerSnapshot,
  ChildContainerSnapshot,
  LazyContainerSnapshot,
  ScopeSnapshot,
  // Error types
  DevToolsError,
  // Communication types
  ClientRole,
  ServerInfo,
  // Presenter contract
  PresenterDataSourceContract,
} from "./types.js";

// Export values
export { DEFAULT_RETENTION_POLICY, hasTracingAccess } from "./types.js";

// =============================================================================
// Protocol (JSON-RPC 2.0)
// =============================================================================

export {
  // Types
  type JsonRpcRequest,
  type JsonRpcSuccessResponse,
  type JsonRpcError,
  type JsonRpcErrorResponse,
  type JsonRpcResponse,
  type JsonRpcNotification,
  type JsonRpcMessage,
  type ErrorCode,
  type Method,
  // Request/Response types
  type RegisterAppParams,
  type AppIdParams,
  type GetGraphResult,
  type GetTracesResult,
  type GetStatsResult,
  type GetContainerSnapshotResult,
  type TraceControlParams,
  type PinTraceParams,
  type AppInfo,
  type ListAppsResult,
  // Sync types
  type SyncStateParams,
  type SyncActionParams,
  type SyncPreferencesParams,
  type GetSyncStatusResult,
  // Notification types
  type DataUpdateNotification,
  type AppConnectionNotification,
  // Type-safe method mapping
  type MethodMap,
  type MethodParams,
  type MethodResult,
  type NotificationMap,
  // Constants
  ErrorCodes,
  Methods,
  // Helpers
  createRequest,
  createSuccessResponse,
  createErrorResponse,
  createNotification,
  isRequest,
  isNotification,
  isResponse,
  isErrorResponse,
  isSuccessResponse,
  // Safe parsing with validation
  isValidJsonRpcMessage,
  parseJsonRpcMessage,
} from "./protocol/index.js";

// =============================================================================
// Transform Functions
// =============================================================================

export { toJSON, toDOT, toMermaid } from "./transforms/index.js";

// =============================================================================
// Filter Functions
// =============================================================================

export { filterGraph, byLifetime, byPortName } from "./filters/index.js";

// =============================================================================
// Utility Functions
// =============================================================================

export {
  relabelPorts,
  formatDuration,
  formatDurationCompact,
  formatSessionDuration,
  formatPercent,
  formatPercentRatio,
  formatTimestamp,
  formatTime,
  createVerboseLogger,
  noopLogger,
  type VerboseLogger,
} from "./utils/index.js";

// =============================================================================
// Port Definitions
// =============================================================================

// Domain Ports
export {
  TraceCollectorPort,
  type TraceCollector,
  type TraceEntryInput,
} from "./ports/trace-collector.port.js";

export { LoggerPort, type Logger, type LogLevel } from "./ports/logger.port.js";

// Infrastructure Ports
export {
  WebSocketPort,
  type WebSocketService,
  type WebSocketState,
  type WebSocketEventHandlers,
} from "./ports/websocket.port.js";

// Re-export from @hex-di/ports for convenience
export { createPort, type Port, type InferService, type InferPortName } from "@hex-di/ports";
