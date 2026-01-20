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

export { toJSON, toDOT, toMermaid } from "@hex-di/devtools-core";

// =============================================================================
// Transform Utilities
// =============================================================================

export { filterGraph, byLifetime, byPortName, relabelPorts } from "@hex-di/devtools-core";

// =============================================================================
// React DevTools Components
// =============================================================================

export { HexDiDevTools, DevToolsPanel } from "./react/index.js";

// =============================================================================
// Zustand Store (React Integration)
// =============================================================================

export {
  // Store factory
  createDevToolsStore,
  createDevToolsStoreWithRuntime,
  // React Provider and hooks
  DevToolsStoreProvider,
  useDevToolsStore,
  useDevToolsStoreApi,
  useDevToolsRuntime,
  useDevToolsUI,
  useContainerTree,
  useTracingState,
  useSelectedContainerId,
  useContainers,
  useIsDevToolsOpen,
  useActiveTab,
  useDevToolsActions,
  useTracingActions,
  // Selectors (prefixed with "store" to avoid conflicts with runtime selectors)
  selectFirstSelectedId as storeSelectFirstSelectedId,
  selectIsContainerExpanded as storeSelectIsContainerExpanded,
  selectContainerById as storeSelectContainerById,
  selectIsContainerTreeReady as storeSelectIsContainerTreeReady,
  // Types
  type CreateDevToolsStoreConfig,
  type DevToolsStore,
  type DevToolsStoreState,
  type DevToolsStoreActions,
  type DevToolsStoreWithRuntime,
  type UIState as StoreUIState,
  type ContainerTreeState as StoreContainerTreeState,
  type TracingState as StoreTracingState,
  type DevToolsStoreProviderProps,
} from "./store/index.js";

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

// =============================================================================
// DevTools Runtime
// =============================================================================

export {
  // Validation Errors
  PluginConfigurationError,
  PluginValidationError,
  // Plugin Factory Helper
  defineDevToolsPlugin,
  // Selector Utilities
  createSelector,
  createParameterizedSelector,
  // Selectors (prefixed with "runtime" for consistency with store selectors)
  selectPlugins as runtimeSelectPlugins,
  selectActivePlugin as runtimeSelectActivePlugin,
  selectPluginById as runtimeSelectPluginById,
  selectTabList as runtimeSelectTabList,
  selectSelectedContainers as runtimeSelectSelectedContainers,
  selectIsContainerSelected as runtimeSelectIsContainerSelected,
  selectTracingState as runtimeSelectTracingState,
  selectIsTracingActive as runtimeSelectIsTracingActive,
  // Deprecated: Unprefixed selectors (kept for backward compatibility)
  selectPlugins,
  selectActivePlugin,
  selectPluginById,
  selectTabList,
  selectSelectedContainers,
  selectIsContainerSelected,
  selectTracingState,
  selectIsTracingActive,
  // Type Guards
  isDevToolsCommand,
  isDevToolsEvent,
} from "./runtime/index.js";

// Runtime Types
export type {
  // State
  DevToolsRuntimeState,
  DevToolsRuntimeConfig,
  DevToolsRuntime,
  // Plugin Types
  DevToolsPlugin,
  PluginProps,
  PluginShortcut,
  ContainerEntry,
  PluginRuntimeAccess,
  PluginCommand,
  PluginStateSnapshot,
  // Plugin Utility Types
  ExtractPluginIds,
  PluginConfig,
  HasShortcuts,
  StrictPlugin,
  MinimalPlugin,
  // Commands
  DevToolsCommand,
  SelectTabCommand,
  SelectContainersCommand,
  ToggleTracingCommand,
  PauseTracingCommand,
  ResumeTracingCommand,
  SetThresholdCommand,
  ClearTracesCommand,
  // Events
  DevToolsEvent,
  TabChangedEvent,
  ContainersSelectedEvent,
  TracingStateChangedEvent,
  TracesClearedEvent,
  // Utility Types
  CommandType,
  EventType,
  ExtractCommand,
  ExtractEvent,
  StateListener,
  EventListener,
  // Selector Types
  Selector,
  ParameterizedSelector,
  TabConfig,
  TracingStateSnapshot,
} from "./runtime/index.js";

// =============================================================================
// Built-in Plugins
// =============================================================================

export {
  // Individual Plugins
  GraphPlugin,
  ServicesPlugin,
  TracingPlugin,
  InspectorTabPlugin,
  // Plugin Presets
  defaultPlugins,
  minimalPlugins,
} from "./plugins/index.js";
