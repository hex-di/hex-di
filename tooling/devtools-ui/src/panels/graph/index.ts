/**
 * Graph panel module.
 *
 * @packageDocumentation
 */

// Main component
export { GraphPanel } from "./graph-panel.js";

// Types
export type {
  LibraryAdapterKind,
  GraphViewportState,
  GraphFilterState,
  SavedFilterPreset,
  GraphPanelState,
  MultiContainerGraphState,
  EnrichedGraphNode,
  EnrichedGraphEdge,
  MetadataSection,
  MetadataDisplayState,
  GraphAnalysisState,
  GraphNavigationSelection,
  GraphPanelAction,
  LayoutNode,
  LayoutEdge,
  GraphLayout,
  GraphExportFormat,
} from "./types.js";

// Pure logic
export { matchesFilter, countActiveFilters, filterPredicates } from "./filter-logic.js";
export { detectLibraryKind } from "./library-detection.js";
export {
  enrichNode,
  enrichEdge,
  buildDependentCounts,
  buildTransitiveDepthMap,
  buildDependentMap,
} from "./enrichment.js";
export { computeGraphLayout } from "./layout-engine.js";
export { computeInitialViewport } from "./viewport.js";
export { createLayoutCache } from "./layout-cache.js";
export type { LayoutCache } from "./layout-cache.js";

// Export
export {
  exportDot,
  buildSubgraphDot,
  exportMermaid,
  exportSvg,
  exportPng,
  exportInspectionJson,
  exportStructuredLogs,
  encodeGraphUrlState,
  decodeGraphUrlState,
} from "./export.js";

// State management
export { graphPanelReducer, createInitialState } from "./graph-panel-reducer.js";
export { useGraphPanelState } from "./use-graph-panel-state.js";
export type { GraphPanelDispatch } from "./use-graph-panel-state.js";
export { useGraphData } from "./use-graph-data.js";
export {
  useGraphAnalysis,
  analyzeFromGraphData,
  analyzeFromInspection,
} from "./use-graph-analysis.js";

// Constants
export {
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
  PAN_STEP,
  NODE_WIDTH,
  NODE_HEIGHT,
  HIGH_ERROR_RATE_THRESHOLD,
  VIEWPORT_CULLING_THRESHOLD,
  DEFAULT_FILTER_STATE,
  DEFAULT_VIEWPORT_STATE,
  CATEGORY_COLORS,
  COMPLEXITY_SAFE_MAX,
  COMPLEXITY_MONITOR_MAX,
} from "./constants.js";

// Node shapes
export {
  getNodeShapePath,
  getLibraryBadgeLetter,
  isDashedShape,
} from "./components/node-shapes.js";
