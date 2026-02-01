/**
 * @hex-di/devtools-core - Core types, protocol, and transform utilities for HexDI DevTools.
 *
 * This package provides the foundational types, protocol definitions, and pure
 * functions for working with dependency graphs. It has zero framework
 * dependencies and can be used in any JavaScript environment.
 *
 * ## Key Features
 *
 * - **Canonical Types**: Single source of truth for all DevTools types
 *   including graphs, traces, container snapshots, and configuration.
 *
 * - **JSON-RPC Protocol**: Complete protocol definition for DevTools
 *   communication between clients, servers, and relay nodes.
 *
 * - **toJSON**: Export dependency graphs to a JSON-serializable format
 *   with nodes (ports) and edges (dependencies).
 *
 * - **toDOT**: Generate Graphviz DOT format for professional graph
 *   visualization with configurable styling and layout direction.
 *
 * - **toMermaid**: Generate Mermaid flowchart syntax for easy embedding
 *   in Markdown documentation and GitHub README files.
 *
 * - **Transform Utilities**: Filter and transform exported graphs with
 *   composable utilities like filterGraph, byLifetime, and relabelPorts.
 *
 * @packageDocumentation
 */

// =============================================================================
// Core Types (Visualization Layer)
// =============================================================================

// Note: Container snapshot and tracing types are now in @hex-di/core.
// Import directly from @hex-di/core for those types.

export type {
  // Re-exported from @hex-di/graph
  FactoryKind,
  // Container ownership metadata
  ContainerOwnershipEntry,
  // Graph types
  ExportedNode,
  ExportedEdge,
  ExportedGraph,
  // Export option types
  DOTOptions,
  MermaidOptions,
  // Transform types
  NodePredicate,
  LabelTransform,
  // Error types
  DevToolsError,
  // Communication types
  ClientRole,
  ServerInfo,
  // Presenter contract
  PresenterDataSourceContract,
} from "./types.js";

// =============================================================================
// Protocol (JSON-RPC 2.0)
// =============================================================================

export {
  // Types
  type JsonRpcRequest,
  type JsonRpcSuccessResponse,
  type JsonRpcError,
  type JsonRpcErrorResponse,
  type JsonRpcResponse,
  type JsonRpcNotification,
  type JsonRpcMessage,
  type ErrorCode,
  type Method,
  // Request/Response types
  type RegisterAppParams,
  type AppIdParams,
  type GetGraphResult,
  type GetTracesResult,
  type GetStatsResult,
  type GetContainerSnapshotResult,
  type TraceControlParams,
  type PinTraceParams,
  type AppInfo,
  type ListAppsResult,
  // Sync types
  type SyncStateParams,
  type SyncActionParams,
  type SyncPreferencesParams,
  type GetSyncStatusResult,
  // Notification types
  type DataUpdateNotification,
  type AppConnectionNotification,
  // Type-safe method mapping
  type MethodMap,
  type MethodParams,
  type MethodResult,
  type NotificationMap,
  // Constants
  ErrorCodes,
  Methods,
  // Helpers
  createRequest,
  createSuccessResponse,
  createErrorResponse,
  createNotification,
  isRequest,
  isNotification,
  isResponse,
  isErrorResponse,
  isSuccessResponse,
  // Safe parsing with validation
  isValidJsonRpcMessage,
  parseJsonRpcMessage,
} from "./protocol/index.js";

// =============================================================================
// Transform Functions
// =============================================================================

export { toJSON, toDOT, toMermaid } from "./transforms/index.js";

// =============================================================================
// Filter Functions
// =============================================================================

export { filterGraph, byLifetime, byPortName } from "./filters/index.js";

// =============================================================================
// Utility Functions
// =============================================================================

export {
  relabelPorts,
  formatDuration,
  formatDurationCompact,
  formatSessionDuration,
  formatPercent,
  formatPercentRatio,
  formatTimestamp,
  formatTime,
  createVerboseLogger,
  noopLogger,
  type VerboseLogger,
} from "./utils/index.js";

// =============================================================================
// Port Definitions
// =============================================================================

// Domain Ports
export {
  TraceCollectorPort,
  type TraceCollector,
  type TraceEntryInput,
} from "./ports/trace-collector.port.js";

export { LoggerPort, type Logger, type LogLevel } from "./ports/logger.port.js";

// Infrastructure Ports
export {
  WebSocketPort,
  type WebSocketService,
  type WebSocketState,
  type WebSocketEventHandlers,
} from "./ports/websocket.port.js";

// Re-export from @hex-di/core for convenience
export { createPort, type Port, type InferService, type InferPortName } from "@hex-di/core";

// =============================================================================
// Container Node Metadata Types (Tree View)
// =============================================================================

export type {
  // Core metadata types
  ScopeType,
  DisposedState,
  ContainerNodeRequiredMetadata,
  ContainerNodeOptionalMetadata,
  ContainerNodeMetadata,
  // Loading state types (discriminated union)
  MetadataLoading,
  MetadataLoaded,
  MetadataError,
  ContainerNodeMetadataState,
  // Error types
  MetadataLoadErrorCategory,
  MetadataLoadError,
  // Lifecycle state types (discriminated union)
  ContainerActiveState,
  ContainerDisposingState,
  ContainerDisposedState,
  ContainerErrorState,
  ContainerLifecycleState,
  // Tree node types
  ContainerTreeViewNode,
  // Utility types
  ExtractMetadataData,
  PartialOptionalMetadata,
  MergeMetadata,
} from "./types/container-node-metadata.js";

// Export type guards and factory functions
export {
  isMetadataLoading,
  isMetadataLoaded,
  isMetadataError,
  isContainerActive,
  isContainerDisposed,
  createLoadingMetadataState,
  createLoadedMetadataState,
  createErrorMetadataState,
} from "./types/container-node-metadata.js";

// =============================================================================
// Unified Graph Types (Multi-Container Visualization)
// =============================================================================

export type {
  // Container identity
  ContainerId,
  ContainerInfo,
  // Adapter ownership discriminated union
  OwnedAdapter,
  InheritedAdapter,
  OverriddenAdapter,
  AdapterOwnership,
  // Unified graph types
  PortId,
  UnifiedGraphNode,
  UnifiedGraphEdge,
  UnifiedGraph,
  // View configuration
  UnifiedGraphFilter,
  UnifiedGraphOptions,
  // Utility types
  OwnershipType,
  OwnershipTypeMap,
  ExtractOwnership,
} from "./types/unified-graph.js";

// Export factory functions, type guards, and utilities
export {
  // Identity constructors
  containerId,
  portId,
  // Type guards
  isOwnedAdapter,
  isInheritedAdapter,
  isOverriddenAdapter,
  // Factory functions
  createEmptyUnifiedGraph,
  createOwnedAdapter,
  createInheritedAdapter,
  createOverriddenAdapter,
  // Query utilities
  getDefiningContainers,
  getPrimaryOwnership,
  hasOverrides,
  getCanonicalLifetime,
} from "./types/unified-graph.js";

// =============================================================================
// Ownership Visualization Types
// =============================================================================

export type {
  // Ownership state discriminated union
  OwnedOwnershipState,
  InheritedOwnershipState,
  OverriddenOwnershipState,
  OwnershipState,
  // Node visual state
  NodeVisualStyle,
  NodeVisualState,
  // Badge discriminated union
  BadgePosition,
  AsyncBadge,
  InheritanceModeBadge,
  OverrideBadge,
  ContainerCountBadge,
  ContainerBadge,
  NodeBadge,
  // Container badge content
  ContainerBadgeContent,
  PortBadgeContents,
  // Aggregate node types (multi-select)
  AggregateOwnershipSummary,
  AggregateVisualPriority,
  AggregateNodeState,
  ContainerOwnershipDetail,
  // Utility types
  OwnershipTypeMap as OwnershipStateTypeMap,
  BadgeTypeMap,
  BadgeType,
  ExtractBadge,
  ValidBadgePosition,
  BadgesAtPosition,
} from "./types/ownership-visualization.js";

// Export type guards
export {
  isOwnedOwnership,
  isInheritedOwnership,
  isOverriddenOwnership,
  isAsyncBadge,
  isInheritanceModeBadge,
  isOverrideBadge,
  isContainerCountBadge,
} from "./types/ownership-visualization.js";

// Export factory functions
export {
  createOwnedOwnership,
  createInheritedOwnership,
  createOverriddenOwnership,
  createAsyncBadge,
  createInheritanceModeBadge,
  createOverrideBadge,
  createContainerCountBadge,
  createContainerBadge,
  computeAggregateSummary,
  determineVisualPriority,
} from "./types/ownership-visualization.js";

// Export visual style constants
export {
  OWNERSHIP_COLORS,
  OWNERSHIP_OPACITY,
  OWNERSHIP_STROKE,
  BADGE_CONFIG,
} from "./types/ownership-visualization.js";

// =============================================================================
// Graph Filter and Search Types
// =============================================================================

export type {
  // Filter state types
  OwnershipFilterValue,
  OwnershipFilterState,
  LifetimeFilterState,
  FactoryKindFilterState,
  ContainerSelectionMode,
  ContainerFilterState,
  GraphFilterState,
  // Filter predicate types
  UnifiedNodePredicate,
  UnifiedEdgePredicate,
  GraphFilterPredicate,
  // Search types
  SearchMatchLocation,
  SearchMatch,
  SearchMode,
  SearchConfig,
  SearchState,
  // Highlight types
  HighlightReason,
  HighlightIntensity,
  NodeHighlightState,
  EdgeHighlightState,
  DimState,
  HighlightState,
  // Combined state
  GraphVisualizationState,
  // Filter result types
  FilterResult,
  FilterCounts,
  // Action types (discriminated unions)
  ToggleOwnershipFilterAction,
  ToggleLifetimeFilterAction,
  ToggleFactoryKindFilterAction,
  SetContainerModeAction,
  ToggleContainerAction,
  SetPortNameQueryAction,
  ResetFiltersAction,
  SetFilterStateAction,
  FilterAction,
  SetSearchQueryAction,
  SetSearchConfigAction,
  NextSearchResultAction,
  PreviousSearchResultAction,
  SelectSearchResultAction,
  ClearSearchAction,
  SearchAction,
  SetHoverNodeAction,
  SetSelectedNodeAction,
  ClearHighlightsAction,
  SetDimStateAction,
  HighlightAction,
  VisualizationAction,
  // Utility types
  ToggleFilterValue,
  FilterActionMap,
  ExtractFilterAction,
  FilterDimension,
  FilterDimensionStateMap,
  FilterDimensionState,
} from "./types/graph-filter-search.js";

// Export type guards
export {
  isOwnershipFilterAction,
  isLifetimeFilterAction,
  isContainerFilterAction,
  isSearchActive,
  isFilterActive,
  isHighlightActive,
} from "./types/graph-filter-search.js";

// Export factory functions
export {
  createNodeHighlight,
  createEdgeHighlight,
  createEdgeKey,
  createSearchMatch,
  computeHighlightIntensity,
  mergeHighlightReasons,
} from "./types/graph-filter-search.js";

// Export default state constants
export {
  DEFAULT_OWNERSHIP_FILTER,
  DEFAULT_LIFETIME_FILTER,
  DEFAULT_FACTORY_KIND_FILTER,
  DEFAULT_CONTAINER_FILTER,
  DEFAULT_FILTER_STATE,
  DEFAULT_SEARCH_CONFIG,
  DEFAULT_SEARCH_STATE,
  DEFAULT_DIM_STATE,
  DEFAULT_HIGHLIGHT_STATE,
  DEFAULT_VISUALIZATION_STATE,
} from "./types/graph-filter-search.js";

// =============================================================================
// State Machines (FSM)
// =============================================================================

export * from "./machines/index.js";

// =============================================================================
// Activities
// =============================================================================

export * from "./activities/index.js";
