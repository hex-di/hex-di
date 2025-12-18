/**
 * @hex-di/devtools-ui - Framework-agnostic presentation logic for HexDI DevTools.
 *
 * @deprecated This package is deprecated and will be removed in the next major version (v2.0).
 * Please migrate to the new unified package structure:
 *
 * ## Migration Guide
 *
 * | Old Import | New Import |
 * |------------|------------|
 * | `@hex-di/devtools-ui` | `@hex-di/devtools` |
 * | View models (`GraphViewModel`, etc.) | `@hex-di/devtools` |
 * | Presenters (`GraphPresenter`, etc.) | `@hex-di/devtools` |
 * | State (`devToolsReducer`, `actions`) | `@hex-di/devtools` |
 * | Ports (`GraphViewPort`, etc.) | `@hex-di/devtools` (internal) |
 *
 * ## Example Migration
 *
 * Before:
 * ```typescript
 * import { GraphPresenter, GraphViewModel, devToolsReducer } from '@hex-di/devtools-ui';
 * ```
 *
 * After:
 * ```typescript
 * import { GraphPresenter, devToolsReducer } from '@hex-di/devtools';
 * import type { GraphViewModel } from '@hex-di/devtools';
 * ```
 *
 * This package provides the shared presentation layer for DevTools, enabling
 * both React (browser) and TUI (terminal) interfaces to share the same logic.
 *
 * ## Architecture
 *
 * The package follows the Presentation-Abstraction-Control (PAC) pattern:
 *
 * - **View Models**: Immutable data structures for rendering
 * - **Ports**: Contracts that view implementations must fulfill
 * - **Presenters**: Pure logic that transforms data into view models
 * - **State**: Framework-agnostic reducer-based state management
 * - **Data Source**: Abstraction for accessing graph and tracing data
 *
 * @packageDocumentation
 */

// =============================================================================
// View Models
// =============================================================================

/**
 * @deprecated Import from `@hex-di/devtools` instead.
 * Will be removed in v2.0.
 */
export type {
  // Graph
  NodePosition,
  NodeDimensions,
  GraphNodeViewModel,
  GraphEdgeViewModel,
  LayoutDirection,
  GraphViewport,
  GraphViewModel,
  // Timeline
  TraceEntryViewModel,
  TimeRange,
  TraceGroup,
  TimelineGrouping,
  TimelineSortOrder,
  TimelineViewModel,
  // Stats
  MetricViewModel,
  LifetimeBreakdown,
  TopServiceViewModel,
  TimeSeriesPoint,
  TimeSeriesData,
  StatsViewModel,
  // Inspector
  ServiceInfoViewModel,
  DependencyViewModel,
  ScopeInfoViewModel,
  InspectorTarget,
  InspectorViewModel,
  // Panel
  TabId,
  TabViewModel,
  PanelPosition,
  PanelSize,
  PanelLayoutViewModel,
  ConnectionStatus,
  ConnectionViewModel,
  PanelViewModel,
} from "./view-models/index.js";

/**
 * @deprecated Import from `@hex-di/devtools` instead.
 * Will be removed in v2.0.
 */
export {
  createEmptyGraphViewModel,
  createEmptyTimelineViewModel,
  createEmptyStatsViewModel,
  createEmptyInspectorViewModel,
  createEmptyPanelViewModel,
} from "./view-models/index.js";

// =============================================================================
// Ports
// =============================================================================

/**
 * @deprecated Internal API. Use headless components from `@hex-di/devtools` instead.
 * Will be removed in v2.0.
 */
export type {
  NodeClickEvent,
  EdgeClickEvent,
  GraphViewContract,
  GraphView,
  TraceSelectEvent,
  TimelineViewContract,
  TimelineView,
  StatsViewContract,
  StatsView,
  InspectorViewContract,
  InspectorView,
  PanelViewContract,
  PanelView,
} from "./ports/index.js";

/**
 * @deprecated Internal API. Use headless components from `@hex-di/devtools` instead.
 * Will be removed in v2.0.
 */
export {
  GraphViewPort,
  TimelineViewPort,
  StatsViewPort,
  InspectorViewPort,
  PanelViewPort,
} from "./ports/index.js";

// =============================================================================
// Presenters
// =============================================================================

/**
 * @deprecated Import from `@hex-di/devtools` instead.
 * Will be removed in v2.0.
 */
export {
  GraphPresenter,
  TimelinePresenter,
  StatsPresenter,
  InspectorPresenter,
  PanelPresenter,
} from "./presenters/index.js";

// =============================================================================
// Data Source
// =============================================================================

/**
 * @deprecated Import from `@hex-di/devtools-core` instead.
 * Will be removed in v2.0.
 */
export type { PresenterDataSourceContract } from "./data-source/index.js";

// =============================================================================
// State
// =============================================================================

/**
 * @deprecated Import from `@hex-di/devtools` instead.
 * Will be removed in v2.0.
 */
export type {
  DevToolsState,
  PanelState,
  GraphState,
  TimelineState,
  InspectorState,
  DevToolsAction,
} from "./state/index.js";

/**
 * @deprecated Import from `@hex-di/devtools` instead.
 * Will be removed in v2.0.
 */
export {
  initialState,
  actions,
  devToolsReducer,
  // Selectors
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
