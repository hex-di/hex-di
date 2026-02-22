/**
 * Constants and default values for the Graph Panel.
 *
 * @packageDocumentation
 */

import type { GraphFilterState, GraphViewportState } from "./types.js";

// =============================================================================
// Zoom
// =============================================================================

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3.0;
const ZOOM_STEP = 0.1;
const PAN_STEP = 50;
const FIT_PADDING = 40;

// =============================================================================
// Node Dimensions
// =============================================================================

const NODE_WIDTH = 200;
const NODE_HEIGHT = 72;
const NODE_BORDER_RADIUS = 6;
const CATEGORY_BAR_WIDTH = 3;

// =============================================================================
// Layout
// =============================================================================

const LAYOUT_NODE_SEP = 40;
const LAYOUT_RANK_SEP = 60;
const LAYOUT_MARGIN_X = 20;
const LAYOUT_MARGIN_Y = 20;

// =============================================================================
// Thresholds
// =============================================================================

const HIGH_ERROR_RATE_THRESHOLD = 0.1;
const VIEWPORT_CULLING_THRESHOLD = 50;
const VIRTUAL_SCROLL_THRESHOLD = 50;
const LAYOUT_WORKER_THRESHOLD = 100;
const VIEWPORT_CULLING_MARGIN = 200;
const SEARCH_DEBOUNCE_MS = 150;

// =============================================================================
// Animation
// =============================================================================

const ENTER_EXIT_DURATION_MS = 300;
const TRANSITION_DURATION_MS = 200;
const DRAG_HOLD_MS = 200;

// =============================================================================
// Complexity Score Zones
// =============================================================================

const COMPLEXITY_SAFE_MAX = 50;
const COMPLEXITY_MONITOR_MAX = 100;

// =============================================================================
// Minimap
// =============================================================================

const MINIMAP_WIDTH = 180;
const MINIMAP_HEIGHT = 120;
const MINIMAP_PADDING = 12;

// =============================================================================
// Category Color Palette
// =============================================================================

const CATEGORY_COLORS: Readonly<Record<string, string>> = {
  persistence: "#6366f1",
  messaging: "#8b5cf6",
  "external-api": "#ec4899",
  logging: "#14b8a6",
  configuration: "#f59e0b",
  domain: "#3b82f6",
  infrastructure: "#6b7280",
  state: "#8b5cf6",
  query: "#06b6d4",
  saga: "#f97316",
  flow: "#10b981",
};

const DEFAULT_CATEGORY_COLOR = "var(--hex-text-muted)";

// =============================================================================
// Library Accent Colors
// =============================================================================

const LIBRARY_ACCENT_COLORS: Readonly<Record<string, string>> = {
  store: "#059669",
  query: "#0891B2",
  saga: "#BE123C",
  flow: "#4338CA",
  logger: "#475569",
  tracing: "#D97706",
  core: "var(--hex-border)",
};

const LIBRARY_ACCENT_STRIP_WIDTH = 4;

// =============================================================================
// Library Kind Labels (for inline card metadata line 2)
// =============================================================================

const LIBRARY_KIND_LABELS: Readonly<Record<string, string>> = {
  "store/state": "state",
  "store/atom": "atom",
  "store/derived": "derived",
  "store/async-derived": "async-derived",
  "store/linked-derived": "linked",
  "store/effect": "effect",
  "query/query": "query",
  "query/mutation": "mutation",
  "query/streamed-query": "streamed",
  "saga/saga": "saga",
  "saga/saga-management": "management",
  "flow/flow": "flow",
  "flow/activity": "activity",
  "logger/logger": "logger",
  "logger/handler": "handler",
  "logger/formatter": "formatter",
  "logger/inspector": "inspector",
  "tracing/tracer": "tracer",
  "tracing/processor": "processor",
  "tracing/exporter": "exporter",
  "tracing/bridge": "bridge",
};

// =============================================================================
// Default Filter State
// =============================================================================

const DEFAULT_FILTER_STATE: GraphFilterState = {
  searchText: "",
  lifetimes: new Set(),
  origins: new Set(),
  libraryKinds: new Set(),
  category: "",
  tags: [],
  tagMode: "any",
  direction: "all",
  minErrorRate: 0,
  inheritanceModes: new Set(),
  resolutionStatus: "all",
  compoundMode: "and",
};

// =============================================================================
// Default Viewport State
// =============================================================================

const DEFAULT_VIEWPORT_STATE: GraphViewportState = {
  panX: 0,
  panY: 0,
  zoom: 1,
};

// =============================================================================
// localStorage Keys
// =============================================================================

const STORAGE_KEY_PRESETS = "hex-devtools-graph-presets";
const STORAGE_KEY_LAYOUT_DIRECTION = "hex-devtools-graph-direction";
const STORAGE_KEY_MINIMAP_VISIBLE = "hex-devtools-graph-minimap";

// =============================================================================
// Exports
// =============================================================================

export {
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
  PAN_STEP,
  FIT_PADDING,
  NODE_WIDTH,
  NODE_HEIGHT,
  NODE_BORDER_RADIUS,
  CATEGORY_BAR_WIDTH,
  LAYOUT_NODE_SEP,
  LAYOUT_RANK_SEP,
  LAYOUT_MARGIN_X,
  LAYOUT_MARGIN_Y,
  HIGH_ERROR_RATE_THRESHOLD,
  VIEWPORT_CULLING_THRESHOLD,
  VIRTUAL_SCROLL_THRESHOLD,
  LAYOUT_WORKER_THRESHOLD,
  VIEWPORT_CULLING_MARGIN,
  SEARCH_DEBOUNCE_MS,
  ENTER_EXIT_DURATION_MS,
  TRANSITION_DURATION_MS,
  DRAG_HOLD_MS,
  COMPLEXITY_SAFE_MAX,
  COMPLEXITY_MONITOR_MAX,
  MINIMAP_WIDTH,
  MINIMAP_HEIGHT,
  MINIMAP_PADDING,
  CATEGORY_COLORS,
  DEFAULT_CATEGORY_COLOR,
  LIBRARY_ACCENT_COLORS,
  LIBRARY_ACCENT_STRIP_WIDTH,
  LIBRARY_KIND_LABELS,
  DEFAULT_FILTER_STATE,
  DEFAULT_VIEWPORT_STATE,
  STORAGE_KEY_PRESETS,
  STORAGE_KEY_LAYOUT_DIRECTION,
  STORAGE_KEY_MINIMAP_VISIBLE,
};
