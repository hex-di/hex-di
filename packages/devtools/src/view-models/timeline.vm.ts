/**
 * TimelineViewModel - Immutable view data for resolution trace timeline.
 *
 * Contains grouped and formatted trace entries for timeline visualization.
 * Supports hierarchical display of parent-child resolution relationships.
 *
 * @packageDocumentation
 */

// =============================================================================
// Trace Lifetime Type
// =============================================================================

/**
 * Lifetime as recorded in traces.
 */
export type TraceLifetime = "singleton" | "scoped" | "transient";

// =============================================================================
// Trace Entry View Model
// =============================================================================

/**
 * A single trace entry formatted for display.
 */
export interface TraceEntryViewModel {
  /** Unique identifier for the trace */
  readonly id: string;
  /** Port name that was resolved */
  readonly portName: string;
  /** Service lifetime */
  readonly lifetime: TraceLifetime;
  /** Resolution start time (ISO string for display) */
  readonly startTime: string;
  /** Resolution duration in milliseconds */
  readonly durationMs: number;
  /** Formatted duration string (e.g., "1.23ms") */
  readonly durationFormatted: string;
  /** Whether this was a cache hit */
  readonly isCacheHit: boolean;
  /** Whether this entry is pinned */
  readonly isPinned: boolean;
  /** Parent trace ID if this is a child resolution */
  readonly parentId: string | null;
  /** Child trace IDs */
  readonly childIds: readonly string[];
  /** Scope ID where resolution occurred */
  readonly scopeId: string | null;
  /** Resolution order (sequence number) */
  readonly order: number;
  /** Depth in the resolution tree (0 = root) */
  readonly depth: number;
  /** Whether this entry is expanded (showing children) */
  readonly isExpanded: boolean;
  /** Whether this entry is selected */
  readonly isSelected: boolean;
  /** Whether this is considered a slow resolution */
  readonly isSlow: boolean;
  /** Relative position in timeline (0-1) for visual positioning */
  readonly relativePosition: number;
  /** Relative width in timeline (0-1) for visual sizing */
  readonly relativeWidth: number;
}

// =============================================================================
// Time Range
// =============================================================================

/**
 * Time range for the timeline view.
 */
export interface TimeRange {
  /** Start time in milliseconds */
  readonly startMs: number;
  /** End time in milliseconds */
  readonly endMs: number;
  /** Total duration in milliseconds */
  readonly durationMs: number;
}

// =============================================================================
// Grouped Traces
// =============================================================================

/**
 * Traces grouped by a common attribute.
 */
export interface TraceGroup {
  /** Group identifier */
  readonly id: string;
  /** Display label for the group */
  readonly label: string;
  /** Traces in this group */
  readonly entries: readonly TraceEntryViewModel[];
  /** Whether this group is collapsed */
  readonly isCollapsed: boolean;
  /** Total duration of all entries in group */
  readonly totalDurationMs: number;
  /** Number of cache hits in group */
  readonly cacheHitCount: number;
  /** Number of slow resolutions in group */
  readonly slowCount: number;
}

// =============================================================================
// Timeline View Model
// =============================================================================

/**
 * Grouping mode for timeline entries.
 */
export type TimelineGrouping = "none" | "port" | "scope" | "lifetime";

/**
 * Sort order for timeline entries.
 */
export type TimelineSortOrder = "time" | "duration" | "name";

/**
 * Complete view model for rendering a resolution timeline.
 */
export interface TimelineViewModel {
  /** All trace entries (flat list) */
  readonly entries: readonly TraceEntryViewModel[];
  /** Grouped entries (when grouping is enabled) */
  readonly groups: readonly TraceGroup[];
  /** Current grouping mode */
  readonly grouping: TimelineGrouping;
  /** Current sort order */
  readonly sortOrder: TimelineSortOrder;
  /** Whether sort is descending */
  readonly sortDescending: boolean;
  /** Time range covered by the timeline */
  readonly timeRange: TimeRange;
  /** Currently selected entry ID */
  readonly selectedEntryId: string | null;
  /** Currently expanded entry IDs (for hierarchical view) */
  readonly expandedEntryIds: readonly string[];
  /** Search/filter text */
  readonly filterText: string;
  /** Whether to show only cache hits */
  readonly showOnlyCacheHits: boolean;
  /** Whether to show only slow resolutions */
  readonly showOnlySlow: boolean;
  /** Slow threshold in milliseconds */
  readonly slowThresholdMs: number;
  /** Total entry count (before filtering) */
  readonly totalCount: number;
  /** Visible entry count (after filtering) */
  readonly visibleCount: number;
  /** Whether the timeline is empty */
  readonly isEmpty: boolean;
  /** Whether tracing is currently paused */
  readonly isPaused: boolean;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Creates an empty TimelineViewModel.
 */
export function createEmptyTimelineViewModel(): TimelineViewModel {
  return Object.freeze({
    entries: Object.freeze([]),
    groups: Object.freeze([]),
    grouping: "none" as const,
    sortOrder: "time" as const,
    sortDescending: false,
    timeRange: Object.freeze({ startMs: 0, endMs: 0, durationMs: 0 }),
    selectedEntryId: null,
    expandedEntryIds: Object.freeze([]),
    filterText: "",
    showOnlyCacheHits: false,
    showOnlySlow: false,
    slowThresholdMs: 10,
    totalCount: 0,
    visibleCount: 0,
    isEmpty: true,
    isPaused: false,
  });
}
