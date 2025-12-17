/**
 * @hex-di/devtools-react - React bindings for HexDI DevTools.
 *
 * This package provides React adapters and hooks for the DevTools presentation
 * layer defined in @hex-di/devtools-ui. It enables React applications to
 * visualize and inspect HexDI dependency graphs and container state.
 *
 * ## Quick Start
 *
 * ```tsx
 * import {
 *   DevToolsProvider,
 *   LocalDataSource,
 *   useDevTools,
 *   useGraph,
 * } from '@hex-di/devtools-react';
 * import { appGraph, container } from './di';
 *
 * // Create data source
 * const dataSource = new LocalDataSource(appGraph, container);
 *
 * function App() {
 *   return (
 *     <DevToolsProvider dataSource={dataSource}>
 *       <MainApp />
 *       <DevToolsOverlay />
 *     </DevToolsProvider>
 *   );
 * }
 *
 * function DevToolsOverlay() {
 *   const { viewModels } = useDevTools();
 *   const { viewModel: graphViewModel, selectNode } = useGraph();
 *
 *   // Render your DevTools UI using viewModels...
 * }
 * ```
 *
 * ## Architecture
 *
 * This package follows the hexagonal architecture pattern:
 *
 * - **Context**: Provides DevTools state and data to all components
 * - **Hooks**: Convenient access to specific parts of the DevTools
 * - **Data Sources**: Local (same-process) or remote (WebSocket) data access
 * - **Adapters**: React implementations of presentation ports (future)
 *
 * @packageDocumentation
 */

// =============================================================================
// Context
// =============================================================================

export {
  DevToolsProvider,
  useDevToolsContext,
  type DevToolsProviderProps,
  type DevToolsContextValue,
} from "./context/index.js";

// =============================================================================
// Hooks
// =============================================================================

export {
  useDevTools,
  useGraph,
  useTimeline,
  useStats,
  useInspector,
  usePanel,
  type UseGraphResult,
  type UseTimelineResult,
  type UseStatsResult,
  type UseInspectorResult,
  type UsePanelResult,
} from "./hooks/index.js";

// =============================================================================
// Data Sources
// =============================================================================

export {
  LocalDataSource,
  RemoteDataSource,
  type RemoteDataSourceOptions,
  type RemoteConnectionState,
  type RemoteDataSourceEvent,
  type RemoteDataSourceListener,
} from "./data-source/index.js";

// =============================================================================
// Re-exports from devtools-ui
// =============================================================================

// View Models
export type {
  GraphViewModel,
  GraphNodeViewModel,
  GraphEdgeViewModel,
  TimelineViewModel,
  TraceEntryViewModel,
  StatsViewModel,
  InspectorViewModel,
  PanelViewModel,
  TabId,
  PanelPosition,
  PanelSize,
  LayoutDirection,
  TimelineGrouping,
  TimelineSortOrder,
} from "@hex-di/devtools-ui";

// State
export type {
  DevToolsState,
  DevToolsAction,
} from "@hex-di/devtools-ui";

export {
  initialState,
  actions,
  devToolsReducer,
} from "@hex-di/devtools-ui";

// Data Source Types (from devtools-core)
export type {
  PresenterDataSourceContract,
  TraceEntry,
  TraceStats,
  ContainerSnapshot,
  ScopeInfo,
} from "@hex-di/devtools-core";

// Presenters
export {
  GraphPresenter,
  TimelinePresenter,
  StatsPresenter,
  InspectorPresenter,
  PanelPresenter,
} from "@hex-di/devtools-ui";

// =============================================================================
// Re-exports from devtools-core (Graph Types Only)
// =============================================================================

// Only re-export types that are part of devtools-react's public API
// (used by data sources and hooks). For transform functions like
// toJSON, toDOT, toMermaid, filterGraph, etc., import directly from
// @hex-di/devtools-core.
export type {
  ExportedGraph,
  ExportedNode,
  ExportedEdge,
} from "@hex-di/devtools-core";
