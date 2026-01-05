/**
 * @hex-di/devtools/react - React DevTools Components for HexDI
 *
 * This subpath provides React-specific DevTools components for visualizing
 * and inspecting HexDI dependency graphs at runtime. Import from
 * `@hex-di/devtools/react` to access these components.
 *
 * ## Key Components
 *
 * - **HexDiDevTools**: Floating toggle button that expands to show
 *   the DevTools panel. Auto-hides in production builds.
 *
 * - **DevToolsPanel**: Full panel component for graph visualization and
 *   container inspection. Embed directly in your app layout.
 *
 * ## Quick Start
 *
 * @example Using HexDiDevTools (recommended for development)
 * ```typescript
 * import { HexDiDevTools } from '@hex-di/devtools/react';
 * import { container } from './container';
 *
 * function App() {
 *   return (
 *     <>
 *       <MainApp />
 *       <HexDiDevTools container={container} />
 *     </>
 *   );
 * }
 * ```
 *
 * @example DevToolsPanel (for embedding in layouts)
 * ```typescript
 * import { DevToolsPanel } from '@hex-di/devtools/react';
 * import { appGraph } from './graph';
 *
 * function DeveloperView() {
 *   return (
 *     <div className="dev-layout">
 *       <MainContent />
 *       <aside className="dev-sidebar">
 *         <DevToolsPanel graph={appGraph} />
 *       </aside>
 *     </div>
 *   );
 * }
 * ```
 *
 * ## Features
 *
 * - **Graph Visualization**: Visual representation of dependency graph
 *   with nodes colored by lifetime (singleton, scoped, transient).
 *
 * - **Container Inspection**: Browse registered ports, view adapter
 *   configurations, and inspect dependency relationships.
 *
 * - **Tabbed Interface**: Modern tabbed interface with Graph, Services, Tracing, Inspector tabs.
 *
 * - **Production Safety**: DevToolsFloating automatically returns null
 *   in production mode (NODE_ENV === 'production').
 *
 * - **State Persistence**: DevToolsFloating remembers open/closed state
 *   across page reloads via localStorage.
 *
 * @packageDocumentation
 */

// =============================================================================
// Unified DevTools Provider
// =============================================================================

/**
 * DevToolsProvider for the new unified DevToolsFlowRuntime.
 *
 * Use this provider with the new hooks:
 * - useDevToolsRuntime: Get the full DevToolsSnapshot
 * - useDevToolsSelector: Subscribe to a selected slice
 * - useDevToolsDispatch: Get stable dispatch function
 */
export { DevToolsProvider, type DevToolsProviderProps } from "./providers/devtools-provider.js";

// =============================================================================
// DevTools Runtime Hooks (Plugin Architecture)
// =============================================================================

/**
 * Unified hooks for accessing DevTools state.
 *
 * - useDevToolsRuntime: Get the full DevToolsSnapshot
 * - useDevToolsSelector: Subscribe to a selected slice of state
 * - useDevToolsDispatch: Get stable dispatch function
 */
export {
  useDevToolsRuntime,
  useDevToolsSelector,
  useDevToolsDispatch,
  type DevToolsSnapshotSelector,
  type DevToolsDispatch,
} from "./hooks/index.js";

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * Utility hooks for specialized use cases.
 *
 * - useGraphFilters: Manage filter state for graph nodes with debounced search
 * - useTraceStats: Subscribe to trace statistics
 */
export {
  useGraphFilters,
  useTraceStats,
  type GraphFilterState,
  type UseGraphFiltersResult,
} from "./hooks/index.js";

// =============================================================================
// Container Inspector Hooks
// =============================================================================

/**
 * Multi-container inspector hooks.
 *
 * - useContainerInspector: Access RuntimeInspector for selected container (returns T | null)
 * - useContainerInspectorStrict: Access RuntimeInspector with guaranteed selection
 * - useInspectorSnapshot: Get container snapshots
 * - useContainerPhase: Track container phase and kind
 */
export {
  useContainerInspector,
  useContainerInspectorStrict,
  useInspectorSnapshot,
  useContainerPhase,
} from "./hooks/index.js";
export type { UseInspectorSnapshotResult, UseContainerPhaseResult } from "./hooks/index.js";

// =============================================================================
// InspectableContainer Type
// =============================================================================

/**
 * InspectableContainer interface for type-safe container storage.
 *
 * This trait-like interface enables storing heterogeneous containers
 * without type parameter variance issues. All Container variants
 * satisfy this interface structurally.
 */
export type { InspectableContainer } from "./types/inspectable-container.js";
export { isInspectableContainer, INTERNAL_ACCESS } from "./types/inspectable-container.js";

// =============================================================================
// Re-exports from Main Package (for convenience)
// =============================================================================

/**
 * Re-export types from main devtools package for convenience.
 * Consumers can import everything they need from this single entry point.
 */
export type { Graph, Adapter, Lifetime, Container, Scope } from "../index.js";

// =============================================================================
// DevToolsPanel Component
// =============================================================================

/**
 * DevToolsPanel component for embedding graph visualization in layouts.
 *
 * Displays an interactive panel with:
 * - Graph view showing all nodes (ports) with lifetime badges
 * - Dependency edges visualization
 * - Container browser with collapsible adapter details
 *
 * Uses a modern tabbed interface with Graph, Services, Tracing, Inspector tabs.
 *
 * @see {@link DevToolsPanelProps} - Component props interface
 *
 * @example Basic usage
 * ```typescript
 * import { DevToolsPanel } from '@hex-di/devtools/react';
 * import { appGraph } from './graph';
 *
 * function DeveloperView() {
 *   return (
 *     <aside className="dev-sidebar">
 *       <DevToolsPanel graph={appGraph} />
 *     </aside>
 *   );
 * }
 * ```
 */
export { DevToolsPanel } from "./devtools-panel.js";
export type { DevToolsPanelProps } from "./devtools-panel.js";

// =============================================================================
// HexDiDevTools Component (Floating DevTools)
// =============================================================================

/**
 * HexDiDevTools component for toggle-able DevTools overlay.
 *
 * Renders a small floating toggle button that expands to show the full
 * DevToolsPanel when clicked. The open/closed state is persisted in
 * localStorage so it remembers across page reloads.
 *
 * In production mode (when `process.env.NODE_ENV === 'production'`),
 * this component returns `null` to ensure DevTools are not visible
 * in production builds.
 *
 * Automatically extracts the graph from the container via InspectorPlugin.
 *
 * @see {@link HexDiDevToolsProps} - Component props interface
 * @see {@link DevToolsPosition} - Position type for the toggle button
 *
 * @example Basic usage
 * ```typescript
 * import { HexDiDevTools } from '@hex-di/devtools/react';
 * import { container } from './container';
 *
 * function App() {
 *   return (
 *     <>
 *       <MainApp />
 *       <HexDiDevTools container={container} />
 *     </>
 *   );
 * }
 * ```
 *
 * @example With custom plugins
 * ```typescript
 * import { HexDiDevTools, defaultPlugins } from '@hex-di/devtools/react';
 * import { container } from './container';
 * import { MyPlugin } from './my-plugin';
 *
 * <HexDiDevTools
 *   container={container}
 *   plugins={[...defaultPlugins(), MyPlugin()]}
 *   position="top-left"
 * />
 * ```
 */
export { HexDiDevTools } from "./hex-di-devtools.js";
export type { HexDiDevToolsProps, DevToolsPosition } from "./hex-di-devtools.js";

// =============================================================================
// Container Inspector Components
// =============================================================================

/**
 * ContainerInspector component for runtime container state inspection.
 *
 * Provides a comprehensive view of container state including:
 * - Scope hierarchy tree visualization
 * - Resolved services list with filters and search
 * - Auto-refresh polling support
 *
 * @see {@link ContainerInspectorProps} - Component props interface
 */
export { ContainerInspector } from "./container-inspector.js";
export type { ContainerInspectorProps } from "./container-inspector.js";

/**
 * ContainerSelector component for switching between registered containers.
 *
 * Provides a dropdown to select from all registered containers in multi-container
 * applications. Works with the runtime architecture to track root, child, lazy,
 * and scope containers.
 *
 * @example Basic usage
 * ```tsx
 * import { ContainerSelector } from '@hex-di/devtools/react';
 *
 * function InspectorHeader() {
 *   return (
 *     <div className="header">
 *       <ContainerSelector />
 *     </div>
 *   );
 * }
 * ```
 *
 * @see {@link ContainerSelectorProps} - Component props interface
 * @see {@link ContainerKindBadge} - Badge component for container types
 * @see {@link InheritanceModeBadge} - Badge component for inheritance mode
 */
export {
  ContainerSelector,
  ContainerKindBadge,
  InheritanceModeBadge,
} from "./container-selector.js";
export type {
  ContainerSelectorProps,
  ContainerKindBadgeProps,
  InheritanceModeBadgeProps,
} from "./container-selector.js";

/**
 * ScopeHierarchy component for visualizing scope tree structure.
 *
 * @see {@link ScopeHierarchyProps} - Component props interface
 */
export { ScopeHierarchy } from "./scope-hierarchy.js";
export type { ScopeHierarchyProps } from "./scope-hierarchy.js";

/**
 * ContainerScopeHierarchy component for unified container/scope tree visualization.
 *
 * Displays ALL containers and their scopes in a single hierarchical tree.
 * Containers are nested according to their parent-child relationships.
 *
 * @see {@link ContainerScopeHierarchyProps} - Component props interface
 * @see {@link ContainerScopeTreeNode} - Tree node types
 */
export { ContainerScopeHierarchy } from "./container-scope-hierarchy.js";
export type { ContainerScopeHierarchyProps } from "./container-scope-hierarchy.js";
export type {
  ContainerScopeTreeNode,
  ContainerNode,
  ScopeNode,
} from "./types/container-scope-tree.js";
export { isContainerNode, isScopeNode } from "./types/container-scope-tree.js";

/**
 * ResolvedServices component for displaying service resolution status.
 *
 * @see {@link ResolvedServicesProps} - Component props interface
 * @see {@link ServiceInfo} - Service information structure
 * @see {@link ServiceFilters} - Filter state structure
 */
export { ResolvedServices } from "./resolved-services.js";
export type { ResolvedServicesProps, ServiceInfo, ServiceFilters } from "./resolved-services.js";

/**
 * EnhancedServicesView component for comprehensive service exploration.
 *
 * Combines list and tree views with search, filters, and view mode toggle.
 * Provides dependency relationships and performance data.
 *
 * @see {@link EnhancedServicesViewProps} - Component props interface
 * @see {@link ServicesViewMode} - View mode type
 */
export { EnhancedServicesView } from "./enhanced-services-view.js";
export type { EnhancedServicesViewProps, ServicesViewMode } from "./enhanced-services-view.js";

/**
 * ServiceDependencyTree component for hierarchical dependency visualization.
 *
 * Displays services in a tree structure based on their dependency relationships.
 *
 * @see {@link ServiceDependencyTreeProps} - Component props interface
 */
export { ServiceDependencyTree } from "./service-dependency-tree.js";
export type { ServiceDependencyTreeProps } from "./service-dependency-tree.js";

/**
 * EnhancedServiceItem component for rich service display.
 *
 * Expandable row showing status, lifetime, dependency counts, and details.
 *
 * @see {@link EnhancedServiceItemProps} - Component props interface
 */
export { EnhancedServiceItem } from "./enhanced-service-item.js";
export type { EnhancedServiceItemProps } from "./enhanced-service-item.js";

/**
 * ServicePerformance components for per-service metrics display.
 *
 * @see {@link ServicePerformanceInfoProps} - Component props interface
 * @see {@link ServicePerformance} - Performance metrics structure
 */
export {
  ServicePerformanceInfo,
  ServicePerformanceDisplay,
  useServicePerformance,
  calculateServicePerformance,
} from "./service-performance.js";
export type {
  ServicePerformanceInfoProps,
  ServicePerformanceDisplayProps,
  ServicePerformance,
} from "./service-performance.js";

/**
 * Service tree building utilities.
 *
 * @see {@link ServiceTreeNode} - Tree node structure
 * @see {@link ServiceWithRelations} - Enhanced service info
 */
export {
  buildDependencyTree,
  enrichServicesWithRelations,
  buildDependentsMap,
  buildDependenciesMap,
  getVisibleServiceIds,
  getAllExpandableIds,
  findParentServiceId,
  countTreeNodes,
} from "./services-tree.js";
export type { ServiceTreeNode, ServiceWithRelations } from "./services-tree.js";

// =============================================================================
// Tabbed Interface Components
// =============================================================================

/**
 * TabNavigation component for the DevTools panel tabbed interface.
 *
 * Provides keyboard-accessible tab navigation for switching between
 * Graph, Services, Tracing, and Inspector views.
 *
 * @see {@link TabNavigationProps} - Component props interface
 */
export { TabNavigation } from "./tab-navigation.js";
export type { TabNavigationProps } from "./tab-navigation.js";

/**
 * PluginTabContent component for rendering active plugin content.
 *
 * Dynamically renders the active plugin's component within a tabpanel.
 * Only mounts the active plugin for performance (no hidden tabs).
 *
 * @see {@link PluginTabContentProps} - Component props interface
 */
export { PluginTabContent } from "./plugin-tab-content.js";
export type { PluginTabContentProps } from "./plugin-tab-content.js";

// ResolutionTracingSection was removed - use TracingPlugin instead
// The plugin architecture provides a cleaner approach via plugins/tracing-plugin.ts

// =============================================================================
// Controls Bar Component
// =============================================================================

/**
 * TracingControlsBar component for filtering and controlling trace display.
 *
 * Provides search, filter buttons, sort dropdown, threshold slider,
 * recording indicator, and active filters bar.
 *
 * @see {@link TracingControlsBarProps} - Component props interface
 * @see {@link TracingFilters} - Filter state interface
 * @see {@link TracingSortOption} - Sort option type
 * @see {@link TracingStatusFilter} - Cache status filter type
 * @see {@link TracingExportFormat} - Export format type
 */
export { TracingControlsBar } from "./tracing-controls-bar.js";
export type {
  TracingControlsBarProps,
  TracingFilters,
  TracingSortOption,
  TracingStatusFilter,
  TracingExportFormat,
} from "./tracing-controls-bar.js";

// =============================================================================
// Timeline View Components
// =============================================================================

/**
 * TimelineView component for horizontal time-axis visualization of traces.
 *
 * Displays resolution events as horizontal bars on a time axis with:
 * - Time ruler with auto-scaling, major/minor ticks, threshold marker
 * - Color-coded bars: green (<10ms), yellow (10ms-threshold), red (>=threshold), cyan (cache hit)
 * - Expandable rows showing trace details
 * - Zoom controls: [+] [-] [Fit All] [Focus Slow]
 * - Pin icon for pinned traces
 * - Footer with summary statistics
 *
 * @see {@link TimelineViewProps} - Component props interface
 */
export { TimelineView } from "./timeline-view.js";
export type { TimelineViewProps } from "./timeline-view.js";

/**
 * TimelineRow component for displaying a single trace in the timeline.
 *
 * Shows order badge, port name, duration bar, lifetime badge, status indicators,
 * and expandable details panel with trace information.
 *
 * @see {@link TimelineRowProps} - Component props interface
 */
export { TimelineRow } from "./timeline-row.js";
export type { TimelineRowProps } from "./timeline-row.js";

/**
 * TimeRuler component for the timeline header.
 *
 * Displays a time ruler with auto-scaling tick intervals,
 * major/minor ticks, time labels, and threshold marker.
 *
 * @see {@link TimeRulerProps} - Component props interface
 */
export { TimeRuler } from "./time-ruler.js";
export type { TimeRulerProps } from "./time-ruler.js";

// =============================================================================
// Tree View Component
// =============================================================================

/**
 * TreeView component for hierarchical dependency chain visualization.
 *
 * Displays resolution traces in a tree structure grouped by root resolution,
 * with expand/collapse controls, tree connectors, self/total time display,
 * visual states for cached and slow traces, and keyboard navigation.
 *
 * @see {@link TreeViewProps} - Component props interface
 * @see {@link TimeDisplayMode} - Time display mode type
 */
export { TreeView } from "./tree-view.js";
export type { TreeViewProps, TimeDisplayMode } from "./tree-view.js";

// =============================================================================
// Summary Stats View Component
// =============================================================================

/**
 * SummaryStatsView component for aggregate performance metrics.
 *
 * Displays overview cards, duration distribution, slowest services,
 * lifetime breakdown, and cache efficiency visualization.
 *
 * @see {@link SummaryStatsViewProps} - Component props interface
 */
export { SummaryStatsView } from "./summary-stats-view.js";
export type { SummaryStatsViewProps } from "./summary-stats-view.js";

// =============================================================================
// Graph Visualization Components
// =============================================================================

/**
 * DependencyGraph component for interactive visual dependency graph.
 *
 * Renders a visual node-based dependency graph with:
 * - Hierarchical layout using Dagre algorithm
 * - Interactive zoom and pan with D3
 * - Hover highlighting of connected dependencies
 * - Click selection with focus
 * - Tooltips showing node details
 * - Lifetime-based color coding (singleton=green, scoped=blue, transient=orange)
 *
 * @see {@link DependencyGraphProps} - Component props interface
 *
 * @example Basic usage
 * ```typescript
 * import { DependencyGraph } from '@hex-di/devtools/react';
 *
 * <DependencyGraph
 *   nodes={[
 *     { id: 'Logger', label: 'Logger', lifetime: 'singleton' },
 *     { id: 'UserService', label: 'UserService', lifetime: 'scoped' },
 *   ]}
 *   edges={[
 *     { from: 'UserService', to: 'Logger' },
 *   ]}
 *   direction="TB"
 *   onNodeClick={(nodeId) => console.log('Clicked:', nodeId)}
 * />
 * ```
 */
export { DependencyGraph } from "./graph-visualization/index.js";
export type { DependencyGraphProps } from "./graph-visualization/index.js";

// GraphTabContent was removed - use GraphPlugin instead
// The plugin architecture provides a cleaner approach via plugins/graph-plugin.ts

/**
 * Utility to build ExportedGraph from a container's internal state.
 *
 * Enables visualizing the dependency graph for any container without
 * requiring the original Graph object.
 *
 * @example
 * ```tsx
 * import { buildExportedGraphFromContainer } from '@hex-di/devtools/react';
 *
 * const graph = buildExportedGraphFromContainer(container);
 * console.log(`${graph.nodes.length} services`);
 * ```
 */
export { buildExportedGraphFromContainer } from "./utils/build-graph-from-container.js";

/**
 * GraphRenderer component for low-level SVG rendering with D3 zoom.
 *
 * Used internally by DependencyGraph but exported for advanced customization.
 */
export { GraphRenderer } from "./graph-visualization/index.js";

/**
 * Layout utilities for computing graph positions.
 *
 * - computeLayout: Computes node positions using Dagre
 * - generateEdgePath: Creates SVG path strings for edges
 * - findConnectedNodes/findConnectedEdges: For highlighting
 */
export {
  computeLayout,
  generateEdgePath,
  findConnectedNodes,
  findConnectedEdges,
} from "./graph-visualization/index.js";
export type { LayoutConfig } from "./graph-visualization/index.js";

/**
 * Graph visualization types.
 */
export type {
  Point,
  PositionedNode,
  PositionedEdge,
  LayoutResult,
  GraphDirection,
  GraphInteractionState,
  TransformState,
  ContainerOwnershipEntry,
} from "./graph-visualization/index.js";
export { createEdgeKey, DEFAULT_TRANSFORM } from "./graph-visualization/index.js";

/**
 * Graph styling utilities.
 */
export {
  graphContainerStyles,
  graphNodeStyles,
  graphEdgeStyles,
  graphControlsStyles,
  tooltipStyles,
  getLifetimeStrokeVar,
  LIFETIME_COLORS,
} from "./graph-visualization/index.js";

// =============================================================================
// Filter Components
// =============================================================================

/**
 * Filter chip components for graph filtering UI.
 *
 * - FilterChip: A single toggleable chip for filtering
 * - FilterChipGroup: A labeled group of related filter chips
 *
 * @example
 * ```tsx
 * import { FilterChip, FilterChipGroup } from '@hex-di/devtools/react';
 *
 * <FilterChipGroup label="Lifetime">
 *   <FilterChip label="Singleton" isActive={true} onClick={() => {}} />
 *   <FilterChip label="Scoped" isActive={false} onClick={() => {}} />
 * </FilterChipGroup>
 * ```
 */
export { FilterChip, FilterChipGroup } from "./components/filter-chips.js";
export type { FilterChipProps, FilterChipGroupProps } from "./components/filter-chips.js";

/**
 * Filter preset buttons for quick filter configurations.
 *
 * Provides preset buttons for common filtering scenarios:
 * - "Overrides Only" - filter to ownership === "overridden"
 * - "Async Services" - filter to factoryKind === "async"
 * - "Current Container" - filter to first selected container
 * - "Inherited Only" - filter to ownership === "inherited"
 *
 * @example
 * ```tsx
 * import { FilterPresets, getPresetFilterConfig } from '@hex-di/devtools/react';
 *
 * <FilterPresets
 *   onPresetSelect={(presetId) => {
 *     const config = getPresetFilterConfig(presetId);
 *     // Apply config to filters
 *   }}
 *   activePreset={null}
 * />
 * ```
 */
export { FilterPresets, getPresetFilterConfig } from "./components/filter-presets.js";
export type { FilterPresetsProps, FilterPresetId } from "./components/filter-presets.js";
