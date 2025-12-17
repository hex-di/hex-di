/**
 * @hex-di/devtools-ui - Framework-agnostic presentation logic for HexDI DevTools.
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
 * ## Key Concepts
 *
 * ### View Models
 *
 * View models are immutable data structures containing all information
 * needed to render a view. They are computed by presenters from the
 * data source and contain pre-formatted values for display.
 *
 * ```typescript
 * import { GraphPresenter, PresenterDataSourcePort } from '@hex-di/devtools-ui';
 *
 * const dataSource: PresenterDataSourceContract = ...;
 * const presenter = new GraphPresenter(dataSource);
 * const viewModel = presenter.getViewModel();
 * // viewModel contains nodes, edges, viewport, etc.
 * ```
 *
 * ### Ports
 *
 * Ports define the contract that view implementations must fulfill.
 * React adapters use D3/SVG, TUI adapters use ASCII art, but both
 * implement the same port interface.
 *
 * ```typescript
 * import { GraphViewPort, GraphViewContract } from '@hex-di/devtools-ui';
 *
 * // React implementation
 * const reactGraphView: GraphViewContract = {
 *   render(viewModel) { // Use D3 },
 *   onNodeClick(handler) { // Attach D3 click handlers },
 *   // ...
 * };
 * ```
 *
 * ### State Management
 *
 * The state module provides reducer-based state management that works
 * with React (useReducer), or any other framework using the pattern.
 *
 * ```typescript
 * import { devToolsReducer, initialState, actions } from '@hex-di/devtools-ui';
 *
 * const state = devToolsReducer(initialState, actions.setActiveTab('graph'));
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// View Models
// =============================================================================

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

export type { PresenterDataSourceContract } from "./data-source/index.js";

// =============================================================================
// State
// =============================================================================

export type {
  DevToolsState,
  PanelState,
  GraphState,
  TimelineState,
  InspectorState,
  DevToolsAction,
} from "./state/index.js";

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
