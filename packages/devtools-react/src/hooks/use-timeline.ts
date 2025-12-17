/**
 * useTimeline - Hook for resolution trace timeline data.
 *
 * Provides access to timeline view model and timeline-related actions.
 *
 * @packageDocumentation
 */

import { useMemo } from "react";
import { useDevToolsContext } from "../context/devtools-context.js";
import type { TimelineViewModel, TimelineGrouping, TimelineSortOrder } from "@hex-di/devtools-ui";

/**
 * Timeline hook return type.
 */
export interface UseTimelineResult {
  /**
   * The timeline view model, or null if not available.
   */
  readonly viewModel: TimelineViewModel | null;

  /**
   * Whether tracing is available.
   */
  readonly hasTracing: boolean;

  /**
   * Whether tracing is paused.
   */
  readonly isPaused: boolean;

  /**
   * Selected trace ID, or null if none selected.
   */
  readonly selectedTraceId: string | null;

  /**
   * Expanded trace IDs.
   */
  readonly expandedTraceIds: readonly string[];

  /**
   * Current filter text.
   */
  readonly filter: string;

  /**
   * Current grouping mode.
   */
  readonly grouping: TimelineGrouping;

  /**
   * Current sort order.
   */
  readonly sortOrder: TimelineSortOrder;

  /**
   * Whether sort is descending.
   */
  readonly sortDescending: boolean;

  /**
   * Slow threshold in milliseconds.
   */
  readonly slowThreshold: number;

  /**
   * Select a trace entry.
   */
  selectTrace(traceId: string | null): void;

  /**
   * Toggle trace expansion.
   */
  toggleTraceExpansion(traceId: string): void;

  /**
   * Set filter text.
   */
  setFilter(filter: string): void;

  /**
   * Toggle pause state.
   */
  togglePause(): void;

  /**
   * Clear all traces.
   */
  clear(): void;

  /**
   * Pin a trace.
   */
  pinTrace(traceId: string): void;

  /**
   * Unpin a trace.
   */
  unpinTrace(traceId: string): void;
}

/**
 * Hook to access timeline data and actions.
 *
 * @example
 * ```tsx
 * function TimelineView() {
 *   const { viewModel, isPaused, togglePause, selectTrace } = useTimeline();
 *
 *   if (!viewModel) {
 *     return <div>Loading...</div>;
 *   }
 *
 *   return (
 *     <div>
 *       <button onClick={togglePause}>
 *         {isPaused ? 'Resume' : 'Pause'}
 *       </button>
 *       {viewModel.entries.map(entry => (
 *         <div key={entry.id} onClick={() => selectTrace(entry.id)}>
 *           {entry.portName} - {entry.durationFormatted}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useTimeline(): UseTimelineResult {
  const context = useDevToolsContext();

  const result = useMemo((): UseTimelineResult => ({
    viewModel: context.viewModels.timeline,
    hasTracing: context.dataSource?.hasTracing() ?? false,
    isPaused: context.state.timeline.isPaused,
    selectedTraceId: context.state.timeline.selectedEntryId,
    expandedTraceIds: context.state.timeline.expandedEntryIds,
    filter: context.state.timeline.filterText,
    grouping: context.state.timeline.grouping,
    sortOrder: context.state.timeline.sortOrder,
    sortDescending: context.state.timeline.sortDescending,
    slowThreshold: context.state.timeline.slowThresholdMs,
    selectTrace: context.selectTrace,
    toggleTraceExpansion: context.toggleTraceExpansion,
    setFilter: context.setTimelineFilter,
    togglePause: context.toggleTracingPause,
    clear: context.clearTraces,
    pinTrace: (traceId: string) => context.dataSource?.pinTrace(traceId),
    unpinTrace: (traceId: string) => context.dataSource?.unpinTrace(traceId),
  }), [
    context.viewModels.timeline,
    context.dataSource,
    context.state.timeline.isPaused,
    context.state.timeline.selectedEntryId,
    context.state.timeline.expandedEntryIds,
    context.state.timeline.filterText,
    context.state.timeline.grouping,
    context.state.timeline.sortOrder,
    context.state.timeline.sortDescending,
    context.state.timeline.slowThresholdMs,
    context.selectTrace,
    context.toggleTraceExpansion,
    context.setTimelineFilter,
    context.toggleTracingPause,
    context.clearTraces,
  ]);

  return result;
}
