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
 *   visualization and container inspection (via @hex-di/devtools/react).
 *
 * ## Quick Start
 *
 * @example Export to JSON format
 * ```typescript
 * import { toJSON } from '@hex-di/devtools';
 * import { appGraph } from './graph';
 *
 * const exported = toJSON(appGraph);
 * console.log(exported);
 * // {
 * //   nodes: [
 * //     { id: 'Logger', label: 'Logger', lifetime: 'singleton' },
 * //     { id: 'UserService', label: 'UserService', lifetime: 'scoped' }
 * //   ],
 * //   edges: [
 * //     { from: 'UserService', to: 'Logger' }
 * //   ]
 * // }
 * ```
 *
 * @example Export to DOT format
 * ```typescript
 * import { toDOT } from '@hex-di/devtools';
 * import { appGraph } from './graph';
 *
 * const dot = toDOT(appGraph);
 * console.log(dot);
 * // digraph DependencyGraph {
 * //   rankdir=TB;
 * //   node [shape=box];
 * //   "Logger" [label="Logger\n(singleton)"];
 * //   "UserService" [label="UserService\n(scoped)"];
 * //   "UserService" -> "Logger";
 * // }
 * ```
 *
 * @example Export to Mermaid format
 * ```typescript
 * import { toMermaid } from '@hex-di/devtools';
 * import { appGraph } from './graph';
 *
 * const mermaid = toMermaid(appGraph);
 * console.log(mermaid);
 * // graph TD
 * //   Logger["Logger (singleton)"]
 * //   UserService["UserService (scoped)"]
 * //   UserService --> Logger
 * ```
 *
 * @example Filter and transform
 * ```typescript
 * import { toJSON, filterGraph, byLifetime, toMermaid } from '@hex-di/devtools';
 * import { appGraph } from './graph';
 *
 * // Export only singleton services
 * const singletons = filterGraph(toJSON(appGraph), byLifetime('singleton'));
 * const mermaid = toMermaid(singletons);
 * ```
 *
 * @example React DevTools (see @hex-di/devtools/react)
 * ```typescript
 * import { DevToolsFloating } from '@hex-di/devtools/react';
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

/**
 * Re-export types from @hex-di/ports for consumer convenience.
 *
 * These types are commonly used alongside devtools utilities for
 * working with port tokens and service types.
 */
export type { Port, InferService, InferPortName } from "@hex-di/ports";

/**
 * Re-export types from @hex-di/graph for consumer convenience.
 *
 * These types are commonly used alongside devtools utilities for
 * working with graphs, adapters, and lifetimes.
 */
export type {
  Graph,
  Adapter,
  Lifetime,
  InferAdapterProvides,
  InferAdapterRequires,
  InferAdapterLifetime,
  ResolvedDeps,
} from "@hex-di/graph";

/**
 * Re-export types from @hex-di/runtime for consumer convenience.
 *
 * These types are commonly used alongside devtools utilities for
 * container inspection and scope management.
 */
export type {
  Container,
  Scope,
  ContainerInspector,
  ContainerSnapshot,
  SingletonEntry,
  ScopeTree,
} from "@hex-di/runtime";

/**
 * Re-export createInspector from @hex-di/runtime for container inspection.
 */
export { createInspector } from "@hex-di/runtime";

// =============================================================================
// Core Types (Task Group 2)
// =============================================================================

/**
 * Core types for exported graph data structures.
 *
 * These types define the serializable representation of dependency graphs
 * used by all export functions (toJSON, toDOT, toMermaid) and transform
 * utilities (filterGraph, relabelPorts).
 *
 * @see {@link ExportedNode} - Individual node in the exported graph
 * @see {@link ExportedEdge} - Dependency relationship between nodes
 * @see {@link ExportedGraph} - Complete exported graph structure
 * @see {@link DOTOptions} - Configuration for DOT format export
 * @see {@link MermaidOptions} - Configuration for Mermaid format export
 * @see {@link NodePredicate} - Filter predicate for nodes
 * @see {@link LabelTransform} - Transform function for node labels
 */
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
// Export Functions (Task Group 3)
// =============================================================================

/**
 * Export toJSON function for converting Graph to ExportedGraph.
 *
 * @see {@link toJSON} - Converts a dependency graph to JSON-serializable format
 */
export { toJSON } from "./to-json.js";

// =============================================================================
// Export Functions (Task Group 4)
// =============================================================================

/**
 * Export toDOT function for converting Graph to Graphviz DOT format.
 *
 * Generates valid Graphviz DOT syntax that can be rendered with Graphviz tools
 * or embedded in documentation. Supports configurable layout direction and
 * visual styling presets.
 *
 * @see {@link toDOT} - Converts a dependency graph to DOT format string
 *
 * @example Basic usage
 * ```typescript
 * import { toDOT } from '@hex-di/devtools';
 * import { appGraph } from './graph';
 *
 * const dot = toDOT(appGraph);
 * // digraph DependencyGraph {
 * //   rankdir=TB;
 * //   node [shape=box];
 * //   "Logger" [label="Logger\n(singleton)"];
 * //   "UserService" -> "Logger";
 * // }
 * ```
 *
 * @example With styled preset
 * ```typescript
 * const dot = toDOT(appGraph, {
 *   direction: 'LR',
 *   preset: 'styled'
 * });
 * ```
 */
export { toDOT } from "./to-dot.js";

// =============================================================================
// Export Functions (Task Group 5)
// =============================================================================

/**
 * Export toMermaid function for converting Graph to Mermaid flowchart syntax.
 *
 * Produces valid Mermaid syntax suitable for embedding in Markdown documentation,
 * GitHub README files, or any Mermaid-compatible visualization tool.
 *
 * @see {@link toMermaid} - Converts a dependency graph to Mermaid format
 *
 * @example Basic usage
 * ```typescript
 * import { toMermaid } from '@hex-di/devtools';
 * import { appGraph } from './graph';
 *
 * const mermaid = toMermaid(appGraph);
 * console.log(mermaid);
 * // graph TD
 * //   Logger["Logger (singleton)"]
 * //   UserService["UserService (scoped)"]
 * //   UserService --> Logger
 * ```
 *
 * @example With direction option
 * ```typescript
 * const mermaid = toMermaid(appGraph, { direction: 'LR' });
 * // graph LR
 * //   Logger["Logger (singleton)"]
 * //   ...
 * ```
 *
 * @example With ExportedGraph input (after filtering)
 * ```typescript
 * import { toJSON, filterGraph, byLifetime, toMermaid } from '@hex-di/devtools';
 *
 * const singletons = filterGraph(toJSON(appGraph), byLifetime('singleton'));
 * const mermaid = toMermaid(singletons);
 * ```
 */
export { toMermaid } from "./to-mermaid.js";

// =============================================================================
// Transform Utilities (Task Group 6)
// =============================================================================

/**
 * Export filterGraph and filter helper functions for graph transformation.
 *
 * These composable utilities allow filtering exported graphs by various
 * criteria such as lifetime and port name patterns.
 *
 * @see {@link filterGraph} - Filter nodes by predicate, auto-cleans edges
 * @see {@link byLifetime} - Create predicate to filter by lifetime
 * @see {@link byPortName} - Create predicate to filter by port name regex
 *
 * @example Filter to singleton services only
 * ```typescript
 * import { toJSON, filterGraph, byLifetime } from '@hex-di/devtools';
 *
 * const singletons = filterGraph(toJSON(appGraph), byLifetime('singleton'));
 * ```
 *
 * @example Filter by port name pattern
 * ```typescript
 * import { toJSON, filterGraph, byPortName } from '@hex-di/devtools';
 *
 * const services = filterGraph(toJSON(appGraph), byPortName(/Service$/));
 * ```
 *
 * @example Chain multiple filters
 * ```typescript
 * // Filter to scoped services ending with "Service"
 * const scopedServices = filterGraph(
 *   filterGraph(exported, byLifetime('scoped')),
 *   byPortName(/Service$/)
 * );
 * ```
 *
 * @example Combine with custom predicate
 * ```typescript
 * const filtered = filterGraph(exported, (node) =>
 *   node.lifetime === 'singleton' && node.id.startsWith('App.')
 * );
 * ```
 */
export { filterGraph, byLifetime, byPortName } from "./filter-graph.js";

/**
 * Export relabelPorts function for transforming node labels.
 *
 * Transform node labels in exported graphs while preserving node IDs
 * for edge reference integrity. Useful for customizing visualization output.
 *
 * @see {@link relabelPorts} - Transform node labels with custom function
 *
 * @example Add lifetime indicator to labels
 * ```typescript
 * import { toJSON, relabelPorts, toMermaid } from '@hex-di/devtools';
 *
 * const relabeled = relabelPorts(toJSON(appGraph), (node) =>
 *   `${node.label} [${node.lifetime}]`
 * );
 * const mermaid = toMermaid(relabeled);
 * ```
 *
 * @example Strip common prefix from labels
 * ```typescript
 * const cleaned = relabelPorts(exported, (node) =>
 *   node.label.replace('App.Services.', '')
 * );
 * ```
 *
 * @example Chain with filterGraph
 * ```typescript
 * import { toJSON, filterGraph, byLifetime, relabelPorts, toMermaid } from '@hex-di/devtools';
 *
 * const singletons = filterGraph(toJSON(appGraph), byLifetime('singleton'));
 * const relabeled = relabelPorts(singletons, (n) => `[S] ${n.label}`);
 * const mermaid = toMermaid(relabeled);
 * ```
 */
export { relabelPorts } from "./relabel-ports.js";

// =============================================================================
// React DevTools Components
// =============================================================================

/**
 * Export React DevTools components from the package root.
 *
 * These components provide runtime graph visualization and container inspection
 * in React applications.
 *
 * @see {@link DevToolsFloating} - Floating DevTools panel for development
 * @see {@link DevToolsPanel} - Embeddable DevTools panel component
 *
 * @example Basic usage with DevToolsFloating
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
 */
export { DevToolsFloating, DevToolsPanel } from "./react/index.js";

// =============================================================================
// Tracing
// =============================================================================

/**
 * Export tracing utilities for performance monitoring.
 *
 * @see {@link createTracingContainer} - Wrap a container with tracing capabilities
 * @see {@link TracingAPI} - API for accessing trace data
 * @see {@link TraceEntry} - Individual trace entry data structure
 *
 * @example Enable tracing for DevTools
 * ```typescript
 * import { createContainer } from '@hex-di/runtime';
 * import { DevToolsFloating, createTracingContainer } from '@hex-di/devtools';
 * import { appGraph } from './graph';
 *
 * const baseContainer = createContainer(appGraph);
 * const container = createTracingContainer(baseContainer);
 *
 * function App() {
 *   return (
 *     <>
 *       <MainApp />
 *       <DevToolsFloating graph={appGraph} container={container} />
 *     </>
 *   );
 * }
 * ```
 */
export { createTracingContainer } from "./tracing/index.js";
export type {
  TracingContainer,
  TracingContainerOptions,
} from "./tracing/index.js";
export type {
  TracingAPI,
  TraceEntry,
  TraceFilter,
  TraceStats,
  TraceRetentionPolicy,
} from "@hex-di/devtools-core";
export type { TraceCollector } from "./tracing/collector.js";

// =============================================================================
// State Management (Task Group 3.1)
// =============================================================================

/**
 * Export state management utilities for DevTools.
 *
 * Framework-agnostic state management that works with React, TUI,
 * or any other framework using the reducer pattern.
 *
 * @see {@link devToolsReducer} - Pure reducer function for DevTools state
 * @see {@link initialState} - Default initial state
 * @see {@link actions} - Action creator functions
 */
export { devToolsReducer, initialState, actions } from "./state/index.js";

export type {
  DevToolsState,
  PanelState,
  GraphState,
  TimelineState,
  InspectorState,
} from "./state/index.js";

export type { DevToolsAction } from "./state/index.js";

export {
  selectPanel,
  selectGraph,
  selectTimeline,
  selectInspector,
  selectActiveTabId,
  selectIsPanelOpen,
  selectIsFullscreen,
  selectPanelPosition,
  selectPanelSize,
  selectIsDarkMode,
  selectSelectedNodeId,
  selectHighlightedNodeIds,
  selectZoom,
  selectPanOffset,
  selectGraphDirection,
  selectHasNodeSelection,
  selectHasHighlight,
  selectSelectedTraceId,
  selectExpandedTraceIds,
  selectTimelineFilter,
  selectTimelineGrouping,
  selectTimelineSortOrder,
  selectTimelineSortDescending,
  selectIsTracingPaused,
  selectSlowThreshold,
  selectHasTimelineFilter,
  selectIsTraceExpanded,
  selectSelectedServicePortName,
  selectSelectedScopeId,
  selectInspectorFilter,
  selectShowDependencies,
  selectShowDependents,
  selectExpandedScopeIds,
  selectHasServiceSelection,
  selectHasScopeSelection,
  selectIsScopeExpanded,
  selectLastUpdated,
  selectIsDevToolsActive,
} from "./state/index.js";

// =============================================================================
// View Models (Task Group 3.1)
// =============================================================================

/**
 * Export view models for DevTools views.
 *
 * Immutable data structures that represent the complete state needed to
 * render each DevTools view. Framework-agnostic and can be consumed by
 * React, TUI, or any other presentation layer.
 */
export type {
  // Graph view model
  NodePosition,
  NodeDimensions,
  GraphNodeViewModel,
  GraphEdgeViewModel,
  LayoutDirection,
  GraphViewport,
  GraphViewModel,
  // Timeline view model
  TraceLifetime,
  TraceEntryViewModel,
  TimeRange,
  TraceGroup,
  TimelineGrouping,
  TimelineSortOrder,
  TimelineViewModel,
  // Stats view model
  MetricViewModel,
  LifetimeBreakdown,
  TopServiceViewModel,
  TimeSeriesPoint,
  TimeSeriesData,
  StatsViewModel,
  // Inspector view model
  ServiceInfoViewModel,
  DependencyViewModel,
  ScopeInfoViewModel,
  InspectorTarget,
  InspectorViewModel,
  // Panel view model
  TabId,
  TabViewModel,
  PanelPosition,
  PanelSize,
  PanelLayoutViewModel,
  ConnectionStatus,
  ConnectionViewModel,
  PanelViewModel,
} from "./view-models/index.js";

export {
  createEmptyGraphViewModel,
  createEmptyTimelineViewModel,
  createEmptyStatsViewModel,
  createEmptyInspectorViewModel,
  createEmptyPanelViewModel,
} from "./view-models/index.js";

// =============================================================================
// Presenters (Task Group 3.1)
// =============================================================================

/**
 * Export presenters for DevTools views.
 *
 * Framework-agnostic presentation logic that transforms data from the
 * data source into view models ready for rendering.
 */
export {
  GraphPresenter,
  TimelinePresenter,
  StatsPresenter,
  InspectorPresenter,
  PanelPresenter,
} from "./presenters/index.js";

// =============================================================================
// Shared Headless Components (Task Group 3.2)
// =============================================================================

/**
 * Export shared headless components for DevTools views.
 *
 * Platform-agnostic React components that use the usePrimitives() hook
 * to render in both DOM and TUI environments. These components accept
 * view models as props and emit events via callbacks.
 *
 * @see {@link DevToolsPanel} - Main panel with tab navigation (renamed from headless)
 * @see {@link GraphView} - Dependency graph visualization
 * @see {@link TimelineView} - Resolution trace timeline
 * @see {@link StatsView} - Statistics dashboard
 * @see {@link InspectorView} - Service/scope inspection
 */
export {
  DevToolsPanel as HeadlessDevToolsPanel,
  GraphView,
  TimelineView,
  StatsView,
  InspectorView,
} from "./components/index.js";

export type {
  DevToolsPanelProps as HeadlessDevToolsPanelProps,
  GraphViewProps,
  TimelineViewProps,
  StatsViewProps,
  InspectorViewProps,
} from "./components/index.js";

// =============================================================================
// Primitives Infrastructure
// =============================================================================

/**
 * Export primitives infrastructure for building DevTools UIs.
 *
 * @see {@link usePrimitives} - Hook to access render primitives
 * @see {@link PrimitivesProvider} - Context provider for primitives
 * @see {@link RenderPrimitivesPort} - Port definition for primitives
 */
export { usePrimitives } from "./hooks/use-primitives.js";
export { PrimitivesProvider } from "./hooks/primitives-context.js";
export type { PrimitivesProviderProps } from "./hooks/primitives-context.js";

export { RenderPrimitivesPort } from "./ports/render-primitives.port.js";
export type {
  RenderPrimitives,
  RendererType,
  SemanticColor,
  SpacingToken,
  LayoutProps,
  BoxProps,
  TextProps,
  ButtonProps,
  IconProps,
  ScrollViewProps,
  DividerProps,
  GraphRendererProps,
  StyleSystem,
  TextVariant,
  IconName,
  DOMOnlyProps,
  TUIOnlyProps,
  RendererSpecificProps,
} from "./ports/render-primitives.port.js";

// =============================================================================
// Data Sources (Task Group 4.3)
// =============================================================================

/**
 * Export data sources for DevTools data access.
 *
 * Data sources provide a unified interface for accessing graph and trace data
 * from different sources (local container or remote WebSocket).
 *
 * @see {@link DataSource} - Unified data source interface
 * @see {@link LocalDataSource} - Same-process data access
 * @see {@link RemoteDataSource} - WebSocket-based remote data access
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
 * const dataSource = new RemoteDataSource({
 *   url: 'ws://localhost:9229/devtools',
 *   appId: 'my-app',
 * });
 *
 * await dataSource.connect();
 * ```
 */
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
// Network Layer (Task Group 4.3)
// =============================================================================

/**
 * Export network layer utilities for DevTools communication.
 *
 * Provides client registry and protocol utilities for managing
 * connections between DevTools clients and servers.
 *
 * @see {@link ClientRegistry} - Track connected DevTools clients
 * @see {@link Methods} - Protocol method names
 * @see {@link createRequest} - Create JSON-RPC requests
 *
 * @example Using ClientRegistry
 * ```typescript
 * import { ClientRegistry } from '@hex-di/devtools';
 *
 * const registry = new ClientRegistry<WebSocket>();
 *
 * registry.addListener((event, app) => {
 *   console.log(`App ${app.appId} ${event}`);
 * });
 * ```
 *
 * @example Creating protocol messages
 * ```typescript
 * import { createRequest, Methods, serializeMessage } from '@hex-di/devtools';
 *
 * const request = createRequest(1, Methods.GET_GRAPH, { appId: 'my-app' });
 * const json = serializeMessage(request);
 * socket.send(json);
 * ```
 */
export {
  // Client Registry
  ClientRegistry,
  type RegisteredApp,
  type AppInfo,
  type ClientRegistryListener,
  // Protocol utilities
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
