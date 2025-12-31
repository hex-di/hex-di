/**
 * @hex-di/devtools/react - React DevTools Components for HexDI
 *
 * This subpath provides React-specific DevTools components for visualizing
 * and inspecting HexDI dependency graphs at runtime. Import from
 * `@hex-di/devtools/react` to access these components.
 *
 * ## Key Components
 *
 * - **DevToolsProvider**: Context provider for DevTools data access via hooks.
 *
 * - **DevToolsPanel**: Full panel component for graph visualization and
 *   container inspection. Embed directly in your app layout.
 *
 * - **DevToolsFloating**: Floating toggle button that expands to show
 *   the DevTools panel. Auto-hides in production builds.
 *
 * ## Quick Start
 *
 * @example Using DevToolsProvider with hooks
 * ```typescript
 * import { DevToolsProvider, useTraces, useTraceStats } from '@hex-di/devtools/react';
 * import { TracingPlugin } from '@hex-di/tracing';
 * import { createContainer } from '@hex-di/runtime';
 * import { appGraph } from './graph';
 *
 * const container = createContainer(appGraph, { plugins: [TracingPlugin] });
 *
 * function App() {
 *   return (
 *     <DevToolsProvider graph={appGraph} container={container}>
 *       <MainApp />
 *       <DevToolsPanel />
 *     </DevToolsProvider>
 *   );
 * }
 *
 * function TraceList() {
 *   const { traces, isAvailable } = useTraces();
 *   if (!isAvailable) return <div>Tracing not enabled</div>;
 *   return <ul>{traces.map(t => <li key={t.id}>{t.portName}</li>)}</ul>;
 * }
 * ```
 *
 * @example HexDiDevTools (recommended for development)
 * ```typescript
 * import { HexDiDevToolsProvider, HexDiDevTools } from '@hex-di/devtools/react';
 * import { appGraph } from './graph';
 * import { container } from './container';
 *
 * function App() {
 *   return (
 *     <HexDiDevToolsProvider>
 *       <MainApp />
 *       <HexDiDevTools
 *         graph={appGraph}
 *         container={container}
 *         position="bottom-right"
 *       />
 *     </HexDiDevToolsProvider>
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
 * - **Collapsible Sections**: Organize information into collapsible
 *   sections for a clean developer experience.
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
// Context and Provider
// =============================================================================

/**
 * DevToolsProvider provides TracingAPI and graph data to child components.
 *
 * Wrap your application or DevTools section with this provider to enable
 * context-based access via hooks like useTracingAPI, useTraces, etc.
 *
 * @see {@link DevToolsProviderProps} - Provider props interface
 * @see {@link DevToolsContextValue} - Context value interface
 */
export { DevToolsProvider, DevToolsContext } from "./context/index.js";
export type { DevToolsProviderProps, DevToolsContextValue } from "./context/index.js";

/**
 * HexDiDevToolsProvider for multi-container DevTools support.
 *
 * Place at the top of your app to enable tracking of all containers
 * (root, child, lazy, scope). Components can register containers using
 * useRegisterContainer and access them via useContainerList and useInspector.
 *
 * @see {@link HexDiDevToolsProviderProps} - Provider props interface
 * @see {@link ContainerRegistryValue} - Context value interface
 * @see {@link ContainerEntry} - Registered container entry type
 */
export { HexDiDevToolsProvider, ContainerRegistryContext } from "./context/index.js";
export type {
  HexDiDevToolsProviderProps,
  ContainerRegistryValue,
  ContainerEntry,
  InheritanceMode,
} from "./context/index.js";

// =============================================================================
// React Hooks
// =============================================================================

/**
 * Hooks for accessing DevTools data from context.
 *
 * - useDevTools: Full context access
 * - useTracingAPI: Direct TracingAPI access
 * - useExportedGraph: Exported graph data access
 * - useTraces: Subscribe to trace entries with automatic updates
 * - useTraceStats: Subscribe to trace statistics
 * - useTracingControls: Pause, resume, clear, pin/unpin controls
 */
export {
  useDevTools,
  useTracingAPI,
  useExportedGraph,
  useTraces,
  useTraceStats,
  useTracingControls,
} from "./hooks/index.js";
export type { UseTracesResult, UseTracingControlsResult } from "./hooks/index.js";

/**
 * Multi-container inspector hooks.
 *
 * - useRegisterContainer: Register a container with DevTools
 * - useContainerList: Get all registered containers and selection state (uses Option<T>)
 * - useContainerInspector: Access RuntimeInspector for selected container
 * - useContainerInspectorStrict: Access RuntimeInspector with guaranteed selection
 * - useInspectorSnapshot: Get container snapshots
 * - useContainerPhase: Track container phase and kind
 */
export {
  useRegisterContainer,
  useContainerList,
  useContainerInspector,
  useContainerInspectorStrict,
  useInspectorSnapshot,
  useContainerPhase,
  useContainerScopeTree,
} from "./hooks/index.js";
export type {
  UseRegisterContainerOptions,
  UseContainerListResult,
  UseInspectorSnapshotResult,
  UseContainerPhaseResult,
  UseContainerScopeTreeResult,
} from "./hooks/index.js";

// =============================================================================
// Rust-like ADT Types (Option<T>, Result<T, E>)
// =============================================================================

/**
 * Rust-like algebraic data types for type-safe optional values and error handling.
 *
 * - Option<T>: Replaces `T | null` with exhaustive pattern matching
 * - Result<T, E>: Replaces thrown errors with type-safe error handling
 * - Some, None: Option constructors
 * - Ok, Err: Result constructors
 * - isSome, isNone, isOk, isErr: Type guards for pattern matching
 *
 * @example Option usage
 * ```typescript
 * const inspectorOpt = useContainerInspector();
 * if (isSome(inspectorOpt)) {
 *   const snapshot = inspectorOpt.value.snapshot();
 * }
 *
 * // Or with exhaustive matching
 * switch (inspectorOpt._tag) {
 *   case "Some": return <Inspector value={inspectorOpt.value} />;
 *   case "None": return <NoContainer />;
 * }
 * ```
 */
export {
  Some,
  None,
  isSome,
  isNone,
  unwrapOr,
  mapOption,
  Ok,
  Err,
  isOk,
  isErr,
} from "./types/adt.js";
export type {
  Option,
  Result,
  Some as SomeType,
  None as NoneType,
  Ok as OkType,
  Err as ErrType,
} from "./types/adt.js";

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
// DevToolsPanel Component (Task Group 7)
// =============================================================================

/**
 * DevToolsPanel component for embedding graph visualization in layouts.
 *
 * Displays an interactive panel with:
 * - Graph view showing all nodes (ports) with lifetime badges
 * - Dependency edges visualization
 * - Container browser with collapsible adapter details
 *
 * Supports two display modes:
 * - "tabs" (default): Modern tabbed interface with Graph, Services, Tracing, Inspector tabs
 * - "sections": Legacy CollapsibleSection layout for backward compatibility
 *
 * @see {@link DevToolsPanelProps} - Component props interface
 * @see {@link DevToolsPanelMode} - Display mode type
 *
 * @example Basic usage (tabs mode)
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
 *
 * @example Legacy sections mode
 * ```typescript
 * import { DevToolsPanel } from '@hex-di/devtools/react';
 * import { appGraph } from './graph';
 *
 * function DeveloperView() {
 *   return <DevToolsPanel graph={appGraph} mode="sections" />;
 * }
 * ```
 */
export { DevToolsPanel } from "./devtools-panel.js";
export type { DevToolsPanelProps, DevToolsPanelMode } from "./devtools-panel.js";

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
 * @see {@link HexDiDevToolsProps} - Component props interface
 * @see {@link DevToolsPosition} - Position type for the toggle button
 *
 * @example Basic usage
 * ```typescript
 * import { HexDiDevTools } from '@hex-di/devtools/react';
 * import { appGraph } from './graph';
 *
 * function App() {
 *   return (
 *     <>
 *       <MainApp />
 *       <HexDiDevTools graph={appGraph} position="bottom-right" />
 *     </>
 *   );
 * }
 * ```
 *
 * @example All corner positions
 * ```typescript
 * // Bottom-right (default)
 * <HexDiDevTools graph={graph} position="bottom-right" />
 *
 * // Bottom-left
 * <HexDiDevTools graph={graph} position="bottom-left" />
 *
 * // Top-right
 * <HexDiDevTools graph={graph} position="top-right" />
 *
 * // Top-left
 * <HexDiDevTools graph={graph} position="top-left" />
 * ```
 */
export { HexDiDevTools } from "./devtools-floating.js";
export type { HexDiDevToolsProps, DevToolsPosition } from "./devtools-floating.js";

// =============================================================================
// Container Inspector Components (Task Group 4)
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
 * applications. Works with ContainerRegistryProvider to track root, child, lazy,
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
// Tabbed Interface Components (Task Group 6)
// =============================================================================

/**
 * TabNavigation component for the DevTools panel tabbed interface.
 *
 * Provides keyboard-accessible tab navigation for switching between
 * Graph, Services, Tracing, and Inspector views.
 *
 * @see {@link TabNavigationProps} - Component props interface
 * @see {@link TabId} - Tab identifier type
 */
export { TabNavigation } from "./tab-navigation.js";
export type { TabNavigationProps, TabId } from "./tab-navigation.js";

/**
 * ResolutionTracingSection component for the Tracing tab.
 *
 * Container component providing sub-view tabs for Timeline, Tree,
 * and Summary views within the tracing feature.
 *
 * @see {@link ResolutionTracingSectionProps} - Component props interface
 * @see {@link TracingViewId} - Tracing view identifier type
 */
export { ResolutionTracingSection } from "./resolution-tracing-section.js";
export type { ResolutionTracingSectionProps, TracingViewId } from "./resolution-tracing-section.js";

// =============================================================================
// Controls Bar Component (Task Group 7)
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
// Timeline View Components (Task Group 8)
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
// Tree View Component (Task Group 9)
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
// Summary Stats View Component (Task Group 10)
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

/**
 * GraphTabContent component with container switching support.
 *
 * Provides a container selector dropdown when inside a ContainerRegistryProvider,
 * allowing users to switch between registered containers and view their dependency graphs.
 *
 * @example
 * ```tsx
 * import { GraphTabContent } from '@hex-di/devtools/react';
 * import { toJSON } from '@hex-di/devtools-core';
 *
 * function MyDevTools({ graph }) {
 *   const exportedGraph = useMemo(() => toJSON(graph), [graph]);
 *   return <GraphTabContent defaultGraph={exportedGraph} />;
 * }
 * ```
 */
export { GraphTabContent } from "./graph-tab-content.js";
export type { GraphTabContentProps } from "./graph-tab-content.js";

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
export type { LayoutConfig, InputNode, InputEdge } from "./graph-visualization/index.js";

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
