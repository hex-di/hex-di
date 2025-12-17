/**
 * TimelinePresenter - Pure presentation logic for resolution timeline.
 *
 * Transforms trace data into TimelineViewModel ready for rendering.
 *
 * @packageDocumentation
 */

import type { PresenterDataSourceContract, TraceEntry } from "@hex-di/devtools-core";
import type {
  TimelineViewModel,
  TraceEntryViewModel,
  TraceGroup,
  TimelineGrouping,
  TimelineSortOrder,
  TimeRange,
} from "../view-models/index.js";
import { createEmptyTimelineViewModel } from "../view-models/index.js";

// =============================================================================
// TimelinePresenter
// =============================================================================

/**
 * Presenter for resolution trace timeline.
 */
export class TimelinePresenter {
  private selectedEntryId: string | null = null;
  private expandedEntryIds: Set<string> = new Set();
  private filterText = "";
  private grouping: TimelineGrouping = "none";
  private sortOrder: TimelineSortOrder = "time";
  private sortDescending = false;
  private showOnlyCacheHits = false;
  private showOnlySlow = false;
  private slowThresholdMs = 10;

  constructor(private readonly dataSource: PresenterDataSourceContract) {}

  /**
   * Get the current timeline view model.
   */
  getViewModel(): TimelineViewModel {
    if (!this.dataSource.hasTracing()) {
      return createEmptyTimelineViewModel();
    }

    const traces = this.dataSource.getTraces();
    if (traces.length === 0) {
      return {
        ...createEmptyTimelineViewModel(),
        isPaused: this.dataSource.isPaused(),
      };
    }

    const timeRange = this.calculateTimeRange(traces);
    const filteredTraces = this.filterTraces(traces);
    const sortedTraces = this.sortTraces(filteredTraces);
    const entries = this.transformTraces(sortedTraces, timeRange);
    const groups = this.groupTraces(entries);

    return Object.freeze({
      entries: Object.freeze(entries),
      groups: Object.freeze(groups),
      grouping: this.grouping,
      sortOrder: this.sortOrder,
      sortDescending: this.sortDescending,
      timeRange: Object.freeze(timeRange),
      selectedEntryId: this.selectedEntryId,
      expandedEntryIds: Object.freeze([...this.expandedEntryIds]),
      filterText: this.filterText,
      showOnlyCacheHits: this.showOnlyCacheHits,
      showOnlySlow: this.showOnlySlow,
      slowThresholdMs: this.slowThresholdMs,
      totalCount: traces.length,
      visibleCount: entries.length,
      isEmpty: false,
      isPaused: this.dataSource.isPaused(),
    });
  }

  /**
   * Select a trace entry.
   */
  selectEntry(entryId: string | null): void {
    this.selectedEntryId = entryId;
  }

  /**
   * Toggle entry expansion.
   */
  toggleEntry(entryId: string): void {
    if (this.expandedEntryIds.has(entryId)) {
      this.expandedEntryIds.delete(entryId);
    } else {
      this.expandedEntryIds.add(entryId);
    }
  }

  /**
   * Set filter text.
   */
  setFilterText(text: string): void {
    this.filterText = text;
  }

  /**
   * Set grouping mode.
   */
  setGrouping(grouping: TimelineGrouping): void {
    this.grouping = grouping;
  }

  /**
   * Set sort order.
   */
  setSortOrder(order: TimelineSortOrder, descending: boolean): void {
    this.sortOrder = order;
    this.sortDescending = descending;
  }

  /**
   * Set cache hit filter.
   */
  setShowOnlyCacheHits(show: boolean): void {
    this.showOnlyCacheHits = show;
  }

  /**
   * Set slow filter.
   */
  setShowOnlySlow(show: boolean): void {
    this.showOnlySlow = show;
  }

  /**
   * Set slow threshold.
   */
  setSlowThreshold(ms: number): void {
    this.slowThresholdMs = ms;
  }

  /**
   * Calculate time range from traces.
   */
  private calculateTimeRange(traces: readonly TraceEntry[]): TimeRange {
    if (traces.length === 0) {
      return { startMs: 0, endMs: 0, durationMs: 0 };
    }

    const startMs = Math.min(...traces.map(t => t.startTime));
    const endMs = Math.max(...traces.map(t => t.startTime + t.duration));

    return {
      startMs,
      endMs,
      durationMs: endMs - startMs,
    };
  }

  /**
   * Filter traces based on current filters.
   */
  private filterTraces(traces: readonly TraceEntry[]): TraceEntry[] {
    return traces.filter(trace => {
      if (this.filterText && !trace.portName.toLowerCase().includes(this.filterText.toLowerCase())) {
        return false;
      }
      if (this.showOnlyCacheHits && !trace.isCacheHit) {
        return false;
      }
      if (this.showOnlySlow && trace.duration < this.slowThresholdMs) {
        return false;
      }
      return true;
    });
  }

  /**
   * Sort traces based on current sort settings.
   */
  private sortTraces(traces: TraceEntry[]): TraceEntry[] {
    const sorted = [...traces];
    const multiplier = this.sortDescending ? -1 : 1;

    sorted.sort((a, b) => {
      switch (this.sortOrder) {
        case "time":
          return (a.startTime - b.startTime) * multiplier;
        case "duration":
          return (a.duration - b.duration) * multiplier;
        case "name":
          return a.portName.localeCompare(b.portName) * multiplier;
        default:
          return 0;
      }
    });

    return sorted;
  }

  /**
   * Transform trace data to view models.
   */
  private transformTraces(traces: readonly TraceEntry[], timeRange: TimeRange): TraceEntryViewModel[] {
    // Build depth map for parent-child relationships
    const depthMap = new Map<string, number>();
    traces.forEach(trace => {
      if (!trace.parentId) {
        depthMap.set(trace.id, 0);
      } else {
        const parentDepth = depthMap.get(trace.parentId) ?? 0;
        depthMap.set(trace.id, parentDepth + 1);
      }
    });

    return traces.map(trace => {
      const relativePosition = timeRange.durationMs > 0
        ? (trace.startTime - timeRange.startMs) / timeRange.durationMs
        : 0;
      const relativeWidth = timeRange.durationMs > 0
        ? trace.duration / timeRange.durationMs
        : 0;

      return Object.freeze({
        id: trace.id,
        portName: trace.portName,
        lifetime: trace.lifetime,
        startTime: new Date(trace.startTime).toISOString(),
        durationMs: trace.duration,
        durationFormatted: this.formatDuration(trace.duration),
        isCacheHit: trace.isCacheHit,
        isPinned: trace.isPinned,
        parentId: trace.parentId,
        childIds: Object.freeze([...trace.childIds]),
        scopeId: trace.scopeId,
        order: trace.order,
        depth: depthMap.get(trace.id) ?? 0,
        isExpanded: this.expandedEntryIds.has(trace.id),
        isSelected: this.selectedEntryId === trace.id,
        isSlow: trace.duration >= this.slowThresholdMs,
        relativePosition,
        relativeWidth: Math.max(0.01, relativeWidth), // Minimum width for visibility
      });
    });
  }

  /**
   * Group traces based on current grouping mode.
   */
  private groupTraces(entries: readonly TraceEntryViewModel[]): TraceGroup[] {
    if (this.grouping === "none") {
      return [];
    }

    const groups = new Map<string, TraceEntryViewModel[]>();

    entries.forEach(entry => {
      let groupKey: string;
      switch (this.grouping) {
        case "port":
          groupKey = entry.portName;
          break;
        case "scope":
          groupKey = entry.scopeId ?? "root";
          break;
        case "lifetime":
          groupKey = entry.lifetime;
          break;
        default:
          groupKey = "default";
      }

      const group = groups.get(groupKey) ?? [];
      group.push(entry);
      groups.set(groupKey, group);
    });

    return Array.from(groups.entries()).map(([id, groupEntries]) => {
      const totalDurationMs = groupEntries.reduce((sum, e) => sum + e.durationMs, 0);
      const cacheHitCount = groupEntries.filter(e => e.isCacheHit).length;
      const slowCount = groupEntries.filter(e => e.isSlow).length;

      return Object.freeze({
        id,
        label: id,
        entries: Object.freeze(groupEntries),
        isCollapsed: false,
        totalDurationMs,
        cacheHitCount,
        slowCount,
      });
    });
  }

  /**
   * Format duration for display.
   */
  private formatDuration(ms: number): string {
    if (ms < 1) {
      return `${(ms * 1000).toFixed(0)}us`;
    }
    if (ms < 1000) {
      return `${ms.toFixed(2)}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
  }
}
