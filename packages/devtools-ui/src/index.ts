/**
 * @hex-di/devtools-ui — Shared UI components, panels, and visualization primitives.
 *
 * @packageDocumentation
 */

// =============================================================================
// Data source
// =============================================================================

export type { InspectorDataSource } from "./data/inspector-data-source.js";
export { LocalInspectorAdapter } from "./data/local-inspector-adapter.js";

// =============================================================================
// Panels
// =============================================================================

export type { DevToolsPanel, PanelProps, ResolvedTheme } from "./panels/types.js";
export { PanelRegistry, getBuiltInPanels } from "./panels/registry.js";
export { OverviewPanel } from "./panels/overview-panel.js";
export { ContainerPanel } from "./panels/container-panel.js";
export { GraphPanel } from "./panels/graph-panel.js";
export { ScopeTreePanel } from "./panels/scope-tree-panel.js";
export { EventLogPanel } from "./panels/event-log-panel.js";
export { TracingPanel } from "./panels/tracing-panel.js";
export { ResultPanel } from "./panels/result-panel.js";
export { HealthPanel } from "./panels/health-panel.js";

// =============================================================================
// Visualization
// =============================================================================

export { TreeRenderer } from "./visualization/tree/tree-renderer.js";
export { TimelineRenderer } from "./visualization/timeline/timeline-renderer.js";
export { JsonTree } from "./visualization/json-tree/json-tree.js";

// =============================================================================
// Theme
// =============================================================================

export { ThemeProvider } from "./theme/theme-provider.js";
export { useTheme } from "./theme/use-theme.js";
export { designTokens } from "./theme/tokens.js";

// =============================================================================
// Components
// =============================================================================

export { StatusBadge } from "./components/status-badge.js";
export { SearchInput } from "./components/search-input.js";
export { EmptyState } from "./components/empty-state.js";
export { ErrorBoundary } from "./components/error-boundary.js";
export { StatCard } from "./components/stat-card.js";
export { SectionHeader } from "./components/section-header.js";
export { SortHeader } from "./components/sort-header.js";

// =============================================================================
// Hooks
// =============================================================================

export { useDataSourceSnapshot } from "./hooks/use-data-source-snapshot.js";
export { useDataSourceScopeTree } from "./hooks/use-data-source-scope-tree.js";
export { useDataSourceUnifiedSnapshot } from "./hooks/use-data-source-unified-snapshot.js";
export { useDataSourceTracingSummary } from "./hooks/use-data-source-tracing-summary.js";
export type { TracingSummary } from "./hooks/use-data-source-tracing-summary.js";
export { useTableSort } from "./hooks/use-table-sort.js";
export { useTreeNavigation } from "./hooks/use-tree-navigation.js";
export { useAutoScroll } from "./hooks/use-auto-scroll.js";
export { usePersistedState } from "./hooks/use-persisted-state.js";
export { useKeyboardShortcuts } from "./hooks/use-keyboard-shortcuts.js";
export { useResizeObserver } from "./hooks/use-resize-observer.js";

// =============================================================================
// Context
// =============================================================================

export { DataSourceProvider, useDataSource } from "./context/data-source-context.js";
export { PanelStateProvider, usePanelState } from "./context/panel-context.js";
