/**
 * Shared Headless Components - Platform-agnostic UI components.
 *
 * These components use the usePrimitives() hook to access platform-specific
 * primitive components (Box, Text, Button, etc.), enabling them to work
 * in both DOM (browser) and TUI (terminal) environments.
 *
 * @packageDocumentation
 */

// =============================================================================
// DevToolsPanel
// =============================================================================

/**
 * Main container component for DevTools with tab navigation.
 *
 * @see {@link DevToolsPanel} - Main DevTools panel component
 * @see {@link DevToolsPanelProps} - Props for DevToolsPanel
 */
export { DevToolsPanel } from "./DevToolsPanel.js";
export type { DevToolsPanelProps } from "./DevToolsPanel.js";

// =============================================================================
// GraphView
// =============================================================================

/**
 * Dependency graph visualization component.
 *
 * @see {@link GraphView} - Graph visualization component
 * @see {@link GraphViewProps} - Props for GraphView
 * @see {@link GraphViewFilterState} - Filter state for GraphView
 */
export { GraphView } from "./GraphView.js";
export type { GraphViewProps, GraphViewFilterState } from "./GraphView.js";

// =============================================================================
// EnhancedGraphView
// =============================================================================

/**
 * Full-featured dependency graph visualization with filters and overlays.
 *
 * @see {@link EnhancedGraphView} - Enhanced graph visualization component
 * @see {@link EnhancedGraphViewProps} - Props for EnhancedGraphView
 * @see {@link GraphFilterState} - Filter state for graph
 * @see {@link defaultFilterState} - Default filter state
 */
export { EnhancedGraphView, defaultFilterState } from "./EnhancedGraphView.js";
export type {
  EnhancedGraphViewProps,
  GraphFilterState,
  LifetimeFilter,
  FactoryFilter,
} from "./EnhancedGraphView.js";

// =============================================================================
// TimelineView
// =============================================================================

/**
 * Resolution trace timeline component.
 *
 * @see {@link TimelineView} - Timeline visualization component
 * @see {@link TimelineViewProps} - Props for TimelineView
 */
export { TimelineView } from "./TimelineView.js";
export type { TimelineViewProps } from "./TimelineView.js";

// =============================================================================
// StatsView
// =============================================================================

/**
 * Statistics dashboard component.
 *
 * @see {@link StatsView} - Statistics display component
 * @see {@link StatsViewProps} - Props for StatsView
 */
export { StatsView } from "./StatsView.js";
export type { StatsViewProps } from "./StatsView.js";

// =============================================================================
// ServicesView
// =============================================================================

/**
 * Services Tab component - sortable, filterable service list.
 *
 * @see {@link ServicesView} - Services list component
 * @see {@link ServicesViewProps} - Props for ServicesView
 */
export { ServicesView } from "./ServicesView.js";
export type { ServicesViewProps } from "./ServicesView.js";

// =============================================================================
// InspectorView
// =============================================================================

/**
 * Service and scope inspection component.
 *
 * @see {@link InspectorView} - Inspector display component
 * @see {@link InspectorViewProps} - Props for InspectorView
 */
export { InspectorView } from "./InspectorView.js";
export type { InspectorViewProps } from "./InspectorView.js";

// =============================================================================
// ComparisonView
// =============================================================================

/**
 * Snapshot comparison component with diff visualization.
 *
 * @see {@link ComparisonView} - Comparison display component
 * @see {@link ComparisonViewProps} - Props for ComparisonView
 */
export { ComparisonView } from "./ComparisonView.js";
export type { ComparisonViewProps } from "./ComparisonView.js";
