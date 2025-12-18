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
  ContainerGrouping,
  CaptiveWarning,
  LayoutDirection,
  GraphViewport,
  GraphViewModel,
  ContainerBoundaryEdge,
  ExtendedGraphViewModel,
} from "./graph.vm.js";

export {
  createEmptyGraphViewModel,
  createEmptyExtendedGraphViewModel,
} from "./graph.vm.js";

// =============================================================================
// Timeline View Model
// =============================================================================

export type {
  TraceLifetime,
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
  MemoryTrackingViewModel,
} from "./stats.vm.js";

export { createEmptyStatsViewModel } from "./stats.vm.js";

// =============================================================================
// Services View Model
// =============================================================================

export type {
  ServiceRowViewModel,
  ContainerGroupViewModel,
  ServicesSortColumn,
  SortDirection,
  ServicesViewModel,
  ServicesViewModelInput,
} from "./services.vm.js";

export {
  createEmptyServicesViewModel,
  createServicesViewModel,
} from "./services.vm.js";

// =============================================================================
// Inspector View Model
// =============================================================================

export type {
  AsyncFactoryStatus,
  ServiceInfoViewModel,
  DependencyViewModel,
  ScopeInfoViewModel,
  InspectorTarget,
  InspectorViewModel,
  ExtendedServiceInfoViewModel,
} from "./inspector.vm.js";

export {
  createEmptyInspectorViewModel,
  createEmptyExtendedServiceInfoViewModel,
} from "./inspector.vm.js";

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

export { createEmptyPanelViewModel, createMutablePanelViewModel } from "./panel.vm.js";

// =============================================================================
// Flame Graph View Model
// =============================================================================

export type {
  FlameFrame,
  ZoomRange,
  FlameGraphViewModel,
  FlameGraphViewModelInput,
} from "./flame-graph.vm.js";

export {
  createEmptyFlameGraphViewModel,
  createFlameGraphViewModel,
} from "./flame-graph.vm.js";

// =============================================================================
// Comparison View Model
// =============================================================================

export type {
  SnapshotSummary,
  ServiceDiff,
  ServiceChangeType,
  ComparisonViewModel,
  ComparisonViewModelInput,
} from "./comparison.vm.js";

export {
  createEmptyComparisonViewModel,
  createComparisonViewModel,
} from "./comparison.vm.js";

// =============================================================================
// Time Travel View Model
// =============================================================================

export type {
  StateDiff,
  TimeTravelViewModel,
  TimeTravelViewModelInput,
} from "./time-travel.vm.js";

export {
  createEmptyTimeTravelViewModel,
  createTimeTravelViewModel,
} from "./time-travel.vm.js";

// =============================================================================
// Container Hierarchy View Model
// =============================================================================

export type {
  ContainerPhase,
  ContainerNode,
  ContainerHierarchyViewModel,
  ContainerHierarchyViewModelInput,
} from "./container-hierarchy.vm.js";

export {
  createEmptyContainerHierarchyViewModel,
  createContainerHierarchyViewModel,
} from "./container-hierarchy.vm.js";
