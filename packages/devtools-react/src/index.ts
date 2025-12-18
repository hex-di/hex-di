/**
 * @hex-di/devtools-react - React bindings for HexDI DevTools.
 *
 * @deprecated This package is deprecated and will be removed in the next major version (v2.0).
 * Please migrate to the new unified package structure:
 *
 * ## Migration Guide
 *
 * | Old Import | New Import |
 * |------------|------------|
 * | `@hex-di/devtools-react` | `@hex-di/devtools/dom` |
 * | `DevToolsProvider` | `DOMDevToolsProvider` from `@hex-di/devtools/dom` |
 * | `LocalDataSource` | `LocalDataSource` from `@hex-di/devtools` |
 * | `RemoteDataSource` | `RemoteDataSource` from `@hex-di/devtools` |
 * | `useDevTools` | Use view models directly with `@hex-di/devtools` presenters |
 * | `useGraph` | Use `GraphPresenter` from `@hex-di/devtools` |
 *
 * ## Example Migration
 *
 * Before:
 * ```typescript
 * import { DevToolsProvider, LocalDataSource, useGraph } from '@hex-di/devtools-react';
 * ```
 *
 * After:
 * ```typescript
 * import { LocalDataSource, GraphPresenter } from '@hex-di/devtools';
 * import { DOMDevToolsProvider } from '@hex-di/devtools/dom';
 * ```
 *
 * This package provides React adapters and hooks for the DevTools presentation
 * layer defined in @hex-di/devtools-ui. It enables React applications to
 * visualize and inspect HexDI dependency graphs and container state.
 *
 * @packageDocumentation
 */

// =============================================================================
// Context
// =============================================================================

/**
 * @deprecated Use `DOMDevToolsProvider` from `@hex-di/devtools/dom` instead.
 * Will be removed in v2.0.
 */
export {
  DevToolsProvider,
  useDevToolsContext,
  type DevToolsProviderProps,
  type DevToolsContextValue,
} from "./context/index.js";

// =============================================================================
// Hooks
// =============================================================================

/**
 * @deprecated Use presenters from `@hex-di/devtools` instead.
 * Will be removed in v2.0.
 */
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

/**
 * @deprecated Import from `@hex-di/devtools` instead.
 * Will be removed in v2.0.
 */
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

/**
 * @deprecated Import from `@hex-di/devtools` instead.
 * Will be removed in v2.0.
 */
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

/**
 * @deprecated Import from `@hex-di/devtools` instead.
 * Will be removed in v2.0.
 */
// State
export type {
  DevToolsState,
  DevToolsAction,
} from "@hex-di/devtools-ui";

/**
 * @deprecated Import from `@hex-di/devtools` instead.
 * Will be removed in v2.0.
 */
export {
  initialState,
  actions,
  devToolsReducer,
} from "@hex-di/devtools-ui";

/**
 * @deprecated Import from `@hex-di/devtools-core` instead.
 * Will be removed in v2.0.
 */
// Data Source Types (from devtools-core)
export type {
  PresenterDataSourceContract,
  TraceEntry,
  TraceStats,
  ContainerSnapshot,
  ScopeInfo,
} from "@hex-di/devtools-core";

/**
 * @deprecated Import from `@hex-di/devtools` instead.
 * Will be removed in v2.0.
 */
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

/**
 * @deprecated Import from `@hex-di/devtools-core` or `@hex-di/devtools` instead.
 * Will be removed in v2.0.
 */
// Only re-export types that are part of devtools-react's public API
// (used by data sources and hooks). For transform functions like
// toJSON, toDOT, toMermaid, filterGraph, etc., import directly from
// @hex-di/devtools-core.
export type {
  ExportedGraph,
  ExportedNode,
  ExportedEdge,
} from "@hex-di/devtools-core";
