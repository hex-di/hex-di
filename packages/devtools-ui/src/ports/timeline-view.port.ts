/**
 * TimelineViewPort - Port definition for resolution trace timeline.
 *
 * Defines the contract that timeline view implementations must fulfill.
 *
 * @packageDocumentation
 */

import { createPort } from "@hex-di/ports";
import type { TimelineViewModel, TimelineGrouping, TimelineSortOrder } from "../view-models/index.js";

// =============================================================================
// Event Types
// =============================================================================

/**
 * Event data for trace entry selection.
 */
export interface TraceSelectEvent {
  readonly traceId: string;
}

// =============================================================================
// Timeline View Contract
// =============================================================================

/**
 * Contract for timeline view implementations.
 */
export interface TimelineViewContract {
  /**
   * Render the timeline with the given view model.
   */
  render(viewModel: TimelineViewModel): void;

  /**
   * Set handler for trace entry selection.
   */
  onTraceSelect(handler: (event: TraceSelectEvent) => void): void;

  /**
   * Set handler for trace entry expand/collapse.
   */
  onTraceToggle(handler: (traceId: string) => void): void;

  /**
   * Set handler for trace pin toggle.
   */
  onTracePinToggle(handler: (traceId: string) => void): void;

  /**
   * Set handler for filter text change.
   */
  onFilterChange(handler: (text: string) => void): void;

  /**
   * Set handler for grouping change.
   */
  onGroupingChange(handler: (grouping: TimelineGrouping) => void): void;

  /**
   * Set handler for sort change.
   */
  onSortChange(handler: (sort: TimelineSortOrder, descending: boolean) => void): void;

  /**
   * Scroll to a specific trace entry.
   */
  scrollToTrace(traceId: string): void;

  /**
   * Clear the timeline display.
   */
  clear(): void;

  /**
   * Dispose resources.
   */
  dispose(): void;
}

// =============================================================================
// Port Definition
// =============================================================================

/**
 * Port for timeline view implementations.
 */
export const TimelineViewPort = createPort<"TimelineView", TimelineViewContract>("TimelineView");

export type TimelineView = TimelineViewContract;
