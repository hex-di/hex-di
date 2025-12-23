/**
 * @hex-di/devtools - Graph Visualization and DevTools for HexDI
 *
 * Provides graph visualization export utilities and React DevTools components
 * for HexDI dependency injection library. Export dependency graphs to JSON,
 * DOT (Graphviz), and Mermaid formats for documentation, and visualize
 * container state with React DevTools components.
 *
 * ## Key Features
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
 * - **React DevTools**: Floating DevTools panel for runtime graph
 *   visualization and container inspection.
 *
 * @example Export to JSON format
 * ```typescript
 * import { toJSON } from '@hex-di/devtools';
 * import { appGraph } from './graph';
 *
 * const exported = toJSON(appGraph);
 * ```
 *
 * @example React DevTools
 * ```typescript
 * import { DevToolsFloating } from '@hex-di/devtools';
 * import { appGraph } from './graph';
 *
 * function App() {
 *   return (
 *     <>
 *       <MainApp />
 *       <DevToolsFloating graph={appGraph} position="bottom-right" />
 *     </>
 *   );
 * }
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Re-exports from Sibling Packages
// =============================================================================

export type { Port, InferService, InferPortName } from "@hex-di/ports";

export type {
  Graph,
  Adapter,
  Lifetime,
  InferAdapterProvides,
  InferAdapterRequires,
  InferAdapterLifetime,
  ResolvedDeps,
} from "@hex-di/graph";

export type {
  Container,
  Scope,
  ContainerInspector,
  ContainerSnapshot,
  SingletonEntry,
  ScopeTree,
} from "@hex-di/runtime";

export { createInspector } from "@hex-di/runtime";

// =============================================================================
// Core Types
// =============================================================================

export type {
  ExportedNode,
  ExportedEdge,
  ExportedGraph,
  DOTOptions,
  MermaidOptions,
  NodePredicate,
  LabelTransform,
} from "@hex-di/devtools-core";

// =============================================================================
// Export Functions
// =============================================================================

export { toJSON } from "./to-json.js";
export { toDOT } from "./to-dot.js";
export { toMermaid } from "./to-mermaid.js";

// =============================================================================
// Transform Utilities
// =============================================================================

export { filterGraph, byLifetime, byPortName } from "./filter-graph.js";
export { relabelPorts } from "./relabel-ports.js";

// =============================================================================
// React DevTools Components
// =============================================================================

export { DevToolsFloating, DevToolsPanel } from "./react/index.js";

// =============================================================================
// Tracing
// =============================================================================

export { createTracingContainer } from "./tracing/index.js";
export type { TracingContainer, TracingContainerOptions } from "./tracing/index.js";
export type {
  TracingAPI,
  TraceEntry,
  TraceFilter,
  TraceStats,
  TraceRetentionPolicy,
} from "@hex-di/devtools-core";
export type { TraceCollector } from "./tracing/collector.js";

// =============================================================================
// Data Sources
// =============================================================================

export {
  LocalDataSource,
  RemoteDataSource,
  type DataSource,
  type DataSourceConnectionState,
  type DataSourceEvent,
  type DataSourceListener,
  type RemoteDataSourceOptions,
  type WebSocketLike,
} from "./data-source/index.js";

// =============================================================================
// Network Protocol
// =============================================================================

export {
  ClientRegistry,
  type RegisteredApp,
  type AppInfo,
  type ClientRegistryListener,
  ErrorCodes,
  Methods,
  createRequest,
  createSuccessResponse,
  createErrorResponse,
  createNotification,
  isRequest,
  isNotification,
  isResponse,
  isErrorResponse,
  isSuccessResponse,
  isValidJsonRpcMessage,
  parseJsonRpcMessage,
  parseMessage,
  serializeMessage,
  deserializeMessage,
  type JsonRpcRequest,
  type JsonRpcSuccessResponse,
  type JsonRpcError,
  type JsonRpcErrorResponse,
  type JsonRpcResponse,
  type JsonRpcNotification,
  type JsonRpcMessage,
  type ErrorCode,
  type Method,
  type MethodMap,
  type MethodParams,
  type MethodResult,
  type ParseMessageResult,
} from "./network/index.js";
