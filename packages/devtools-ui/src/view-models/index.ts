/**
 * View Models - Immutable data structures for DevTools views.
 *
 * These view models represent the complete state needed to render each
 * DevTools view. They are framework-agnostic and can be consumed by
 * React, TUI, or any other presentation layer.
 *
 * @packageDocumentation
 */

// =============================================================================
// Graph View Model
// =============================================================================

export type {
  NodePosition,
  NodeDimensions,
  GraphNodeViewModel,
  GraphEdgeViewModel,
  LayoutDirection,
  GraphViewport,
  GraphViewModel,
} from "./graph.vm.js";

export { createEmptyGraphViewModel } from "./graph.vm.js";

// =============================================================================
// Timeline View Model
// =============================================================================

export type {
  TraceEntryViewModel,
  TimeRange,
  TraceGroup,
  TimelineGrouping,
  TimelineSortOrder,
  TimelineViewModel,
} from "./timeline.vm.js";

export { createEmptyTimelineViewModel } from "./timeline.vm.js";

// =============================================================================
// Stats View Model
// =============================================================================

export type {
  MetricViewModel,
  LifetimeBreakdown,
  TopServiceViewModel,
  TimeSeriesPoint,
  TimeSeriesData,
  StatsViewModel,
} from "./stats.vm.js";

export { createEmptyStatsViewModel } from "./stats.vm.js";

// =============================================================================
// Inspector View Model
// =============================================================================

export type {
  ServiceInfoViewModel,
  DependencyViewModel,
  ScopeInfoViewModel,
  InspectorTarget,
  InspectorViewModel,
} from "./inspector.vm.js";

export { createEmptyInspectorViewModel } from "./inspector.vm.js";

// =============================================================================
// Panel View Model
// =============================================================================

export type {
  TabId,
  TabViewModel,
  PanelPosition,
  PanelSize,
  PanelLayoutViewModel,
  ConnectionStatus,
  ConnectionViewModel,
  PanelViewModel,
} from "./panel.vm.js";

export { createEmptyPanelViewModel } from "./panel.vm.js";
