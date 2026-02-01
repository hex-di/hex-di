/**
 * Tracing State Machine
 *
 * Global state machine for trace collection and display. Manages:
 * - Trace collection lifecycle (start/stop/pause)
 * - Trace filtering and search
 * - Trace pinning and selection
 * - Sort order and display preferences
 *
 * Note: Activity spawning/stopping is handled by the React integration
 * layer, not through entry effects. This machine defines states and
 * transitions only.
 *
 * @packageDocumentation
 */

import { createMachine, type Machine } from "@hex-di/flow";
import type { TraceEntry, TraceFilter } from "@hex-di/core";

// =============================================================================
// Sort Order Types
// =============================================================================

/**
 * Sort order for trace display.
 */
export type TraceSortOrder = "newest" | "oldest" | "slowest";

// =============================================================================
// State Types
// =============================================================================

/**
 * Tracing machine states.
 */
export type TracingState = "disabled" | "idle" | "tracing" | "paused" | "stopping";

/**
 * Tracing machine events.
 */
export type TracingEvent =
  | "ENABLE"
  | "DISABLE"
  | "START"
  | "PAUSE"
  | "RESUME"
  | "STOP"
  | "STOPPED"
  | "TRACE_RECEIVED"
  | "TRACES_BATCH"
  | "SET_FILTER"
  | "CLEAR_FILTER"
  | "SET_SEARCH"
  | "CLEAR"
  | "PIN_TRACE"
  | "UNPIN_TRACE"
  | "SELECT_TRACE"
  | "DESELECT_TRACE"
  | "EXPAND_TRACE"
  | "COLLAPSE_TRACE"
  | "SET_SORT"
  | "SET_MAX_TRACES"
  | "EXPORT";

/**
 * Tracing machine context.
 */
export interface TracingContext {
  /** All collected traces */
  readonly traces: readonly TraceEntry[];
  /** Current filter criteria */
  readonly filter: TraceFilter | null;
  /** Set of pinned trace IDs (protected from eviction) */
  readonly pinnedTraces: ReadonlySet<string>;
  /** Maximum number of traces to retain */
  readonly maxTraces: number;
  /** Whether to show live updates */
  readonly isLive: boolean;
  /** Currently selected trace ID for detail view */
  readonly selectedTraceId: string | null;
  /** Set of expanded trace IDs (showing children) */
  readonly expandedTraceIds: ReadonlySet<string>;
  /** Sort order for trace display */
  readonly sortOrder: TraceSortOrder;
  /** Text search query */
  readonly searchQuery: string;
  /** Last error encountered */
  readonly error: Error | null;
}

// =============================================================================
// Event Payloads
// =============================================================================

interface TraceReceivedPayload {
  readonly trace: TraceEntry;
}

interface TracesBatchPayload {
  readonly traces: readonly TraceEntry[];
}

interface SetFilterPayload {
  readonly filter: TraceFilter;
}

interface SetSearchPayload {
  readonly query: string;
}

interface PinTracePayload {
  readonly traceId: string;
}

interface UnpinTracePayload {
  readonly traceId: string;
}

interface SelectTracePayload {
  readonly traceId: string;
}

interface ExpandTracePayload {
  readonly traceId: string;
}

interface CollapseTracePayload {
  readonly traceId: string;
}

interface SetSortPayload {
  readonly sortOrder: TraceSortOrder;
}

interface SetMaxTracesPayload {
  readonly maxTraces: number;
}

interface ErrorPayload {
  readonly error: Error;
}

// =============================================================================
// Initial Context
// =============================================================================

const initialContext: TracingContext = {
  traces: [],
  filter: null,
  pinnedTraces: new Set<string>(),
  maxTraces: 10000,
  isLive: true,
  selectedTraceId: null,
  expandedTraceIds: new Set<string>(),
  sortOrder: "newest",
  searchQuery: "",
  error: null,
};

// =============================================================================
// Helper Functions
// =============================================================================

function addToSet<T>(set: ReadonlySet<T>, value: T): ReadonlySet<T> {
  const newSet = new Set(set);
  newSet.add(value);
  return newSet;
}

function removeFromSet<T>(set: ReadonlySet<T>, value: T): ReadonlySet<T> {
  const newSet = new Set(set);
  newSet.delete(value);
  return newSet;
}

/**
 * Appends a trace and enforces max traces limit.
 * Pinned traces are protected from eviction.
 */
function appendTrace(
  traces: readonly TraceEntry[],
  trace: TraceEntry,
  maxTraces: number,
  pinnedTraces: ReadonlySet<string>
): readonly TraceEntry[] {
  const newTraces = [...traces, trace];

  // Enforce max traces limit
  if (newTraces.length > maxTraces) {
    return evictTraces(newTraces, maxTraces, pinnedTraces);
  }

  return newTraces;
}

/**
 * Appends multiple traces and enforces max traces limit.
 */
function appendTraces(
  traces: readonly TraceEntry[],
  newEntries: readonly TraceEntry[],
  maxTraces: number,
  pinnedTraces: ReadonlySet<string>
): readonly TraceEntry[] {
  const combined = [...traces, ...newEntries];

  if (combined.length > maxTraces) {
    return evictTraces(combined, maxTraces, pinnedTraces);
  }

  return combined;
}

/**
 * Evicts oldest non-pinned traces to enforce max limit.
 */
function evictTraces(
  traces: readonly TraceEntry[],
  maxTraces: number,
  pinnedTraces: ReadonlySet<string>
): readonly TraceEntry[] {
  // Separate pinned and unpinned
  const pinned: TraceEntry[] = [];
  const unpinned: TraceEntry[] = [];

  for (const trace of traces) {
    if (pinnedTraces.has(trace.id)) {
      pinned.push(trace);
    } else {
      unpinned.push(trace);
    }
  }

  // Calculate how many unpinned traces we can keep
  const keepCount = Math.max(0, maxTraces - pinned.length);
  const keptUnpinned = unpinned.slice(-keepCount);

  // Recombine in original order (pinned first, then kept unpinned)
  return [...pinned, ...keptUnpinned];
}

// =============================================================================
// Machine Definition
// =============================================================================

/**
 * Tracing state machine.
 *
 * Controls the trace collection lifecycle and UI state.
 * Activity spawning/stopping is handled externally by the React integration
 * layer which responds to state changes.
 */
export const tracingMachine: Machine<TracingState, TracingEvent, TracingContext> = createMachine({
  id: "Tracing",
  initial: "disabled",
  context: initialContext,
  states: {
    // ========================================================================
    // Disabled State - TracingAPI not available
    // ========================================================================
    disabled: {
      on: {
        ENABLE: {
          target: "idle",
        },
      },
    },

    // ========================================================================
    // Idle State - Ready to start tracing
    // ========================================================================
    idle: {
      on: {
        START: {
          target: "tracing",
        },
        SET_FILTER: {
          target: "idle",
          actions: [
            (
              ctx: TracingContext,
              event: { readonly type: "SET_FILTER"; readonly payload: SetFilterPayload }
            ): TracingContext => ({
              ...ctx,
              filter: event.payload.filter,
            }),
          ],
        },
        CLEAR_FILTER: {
          target: "idle",
          actions: [
            (ctx: TracingContext): TracingContext => ({
              ...ctx,
              filter: null,
            }),
          ],
        },
        SET_SEARCH: {
          target: "idle",
          actions: [
            (
              ctx: TracingContext,
              event: { readonly type: "SET_SEARCH"; readonly payload: SetSearchPayload }
            ): TracingContext => ({
              ...ctx,
              searchQuery: event.payload.query,
            }),
          ],
        },
        SET_SORT: {
          target: "idle",
          actions: [
            (
              ctx: TracingContext,
              event: { readonly type: "SET_SORT"; readonly payload: SetSortPayload }
            ): TracingContext => ({
              ...ctx,
              sortOrder: event.payload.sortOrder,
            }),
          ],
        },
        SET_MAX_TRACES: {
          target: "idle",
          actions: [
            (
              ctx: TracingContext,
              event: { readonly type: "SET_MAX_TRACES"; readonly payload: SetMaxTracesPayload }
            ): TracingContext => ({
              ...ctx,
              maxTraces: event.payload.maxTraces,
            }),
          ],
        },
        DISABLE: {
          target: "disabled",
        },
      },
    },

    // ========================================================================
    // Tracing State - Actively collecting traces
    // ========================================================================
    tracing: {
      // Activity spawning handled by React layer
      on: {
        PAUSE: {
          target: "paused",
        },
        STOP: {
          target: "stopping",
        },
        TRACE_RECEIVED: {
          target: "tracing",
          actions: [
            (
              ctx: TracingContext,
              event: { readonly type: "TRACE_RECEIVED"; readonly payload: TraceReceivedPayload }
            ): TracingContext => ({
              ...ctx,
              traces: appendTrace(ctx.traces, event.payload.trace, ctx.maxTraces, ctx.pinnedTraces),
            }),
          ],
        },
        TRACES_BATCH: {
          target: "tracing",
          actions: [
            (
              ctx: TracingContext,
              event: { readonly type: "TRACES_BATCH"; readonly payload: TracesBatchPayload }
            ): TracingContext => ({
              ...ctx,
              traces: appendTraces(
                ctx.traces,
                event.payload.traces,
                ctx.maxTraces,
                ctx.pinnedTraces
              ),
            }),
          ],
        },
        SET_FILTER: {
          target: "tracing",
          actions: [
            (
              ctx: TracingContext,
              event: { readonly type: "SET_FILTER"; readonly payload: SetFilterPayload }
            ): TracingContext => ({
              ...ctx,
              filter: event.payload.filter,
            }),
          ],
        },
        CLEAR_FILTER: {
          target: "tracing",
          actions: [
            (ctx: TracingContext): TracingContext => ({
              ...ctx,
              filter: null,
            }),
          ],
        },
        SET_SEARCH: {
          target: "tracing",
          actions: [
            (
              ctx: TracingContext,
              event: { readonly type: "SET_SEARCH"; readonly payload: SetSearchPayload }
            ): TracingContext => ({
              ...ctx,
              searchQuery: event.payload.query,
            }),
          ],
        },
        CLEAR: {
          target: "tracing",
          actions: [
            (ctx: TracingContext): TracingContext => ({
              ...ctx,
              traces: [],
              selectedTraceId: null,
              expandedTraceIds: new Set<string>(),
            }),
          ],
        },
        PIN_TRACE: {
          target: "tracing",
          actions: [
            (
              ctx: TracingContext,
              event: { readonly type: "PIN_TRACE"; readonly payload: PinTracePayload }
            ): TracingContext => ({
              ...ctx,
              pinnedTraces: addToSet(ctx.pinnedTraces, event.payload.traceId),
            }),
          ],
        },
        UNPIN_TRACE: {
          target: "tracing",
          actions: [
            (
              ctx: TracingContext,
              event: { readonly type: "UNPIN_TRACE"; readonly payload: UnpinTracePayload }
            ): TracingContext => ({
              ...ctx,
              pinnedTraces: removeFromSet(ctx.pinnedTraces, event.payload.traceId),
            }),
          ],
        },
        SELECT_TRACE: {
          target: "tracing",
          actions: [
            (
              ctx: TracingContext,
              event: { readonly type: "SELECT_TRACE"; readonly payload: SelectTracePayload }
            ): TracingContext => ({
              ...ctx,
              selectedTraceId: event.payload.traceId,
            }),
          ],
        },
        DESELECT_TRACE: {
          target: "tracing",
          actions: [
            (ctx: TracingContext): TracingContext => ({
              ...ctx,
              selectedTraceId: null,
            }),
          ],
        },
        EXPAND_TRACE: {
          target: "tracing",
          actions: [
            (
              ctx: TracingContext,
              event: { readonly type: "EXPAND_TRACE"; readonly payload: ExpandTracePayload }
            ): TracingContext => ({
              ...ctx,
              expandedTraceIds: addToSet(ctx.expandedTraceIds, event.payload.traceId),
            }),
          ],
        },
        COLLAPSE_TRACE: {
          target: "tracing",
          actions: [
            (
              ctx: TracingContext,
              event: { readonly type: "COLLAPSE_TRACE"; readonly payload: CollapseTracePayload }
            ): TracingContext => ({
              ...ctx,
              expandedTraceIds: removeFromSet(ctx.expandedTraceIds, event.payload.traceId),
            }),
          ],
        },
        SET_SORT: {
          target: "tracing",
          actions: [
            (
              ctx: TracingContext,
              event: { readonly type: "SET_SORT"; readonly payload: SetSortPayload }
            ): TracingContext => ({
              ...ctx,
              sortOrder: event.payload.sortOrder,
            }),
          ],
        },
        EXPORT: {
          target: "tracing",
          // Export is handled by React layer - just emit as a signal
        },
        DISABLE: {
          target: "stopping",
        },
      },
    },

    // ========================================================================
    // Paused State - Collection paused, existing traces retained
    // ========================================================================
    paused: {
      on: {
        RESUME: {
          target: "tracing",
        },
        STOP: {
          target: "stopping",
        },
        CLEAR: {
          target: "paused",
          actions: [
            (ctx: TracingContext): TracingContext => ({
              ...ctx,
              traces: [],
              selectedTraceId: null,
              expandedTraceIds: new Set<string>(),
            }),
          ],
        },
        PIN_TRACE: {
          target: "paused",
          actions: [
            (
              ctx: TracingContext,
              event: { readonly type: "PIN_TRACE"; readonly payload: PinTracePayload }
            ): TracingContext => ({
              ...ctx,
              pinnedTraces: addToSet(ctx.pinnedTraces, event.payload.traceId),
            }),
          ],
        },
        UNPIN_TRACE: {
          target: "paused",
          actions: [
            (
              ctx: TracingContext,
              event: { readonly type: "UNPIN_TRACE"; readonly payload: UnpinTracePayload }
            ): TracingContext => ({
              ...ctx,
              pinnedTraces: removeFromSet(ctx.pinnedTraces, event.payload.traceId),
            }),
          ],
        },
        SELECT_TRACE: {
          target: "paused",
          actions: [
            (
              ctx: TracingContext,
              event: { readonly type: "SELECT_TRACE"; readonly payload: SelectTracePayload }
            ): TracingContext => ({
              ...ctx,
              selectedTraceId: event.payload.traceId,
            }),
          ],
        },
        DESELECT_TRACE: {
          target: "paused",
          actions: [
            (ctx: TracingContext): TracingContext => ({
              ...ctx,
              selectedTraceId: null,
            }),
          ],
        },
        SET_FILTER: {
          target: "paused",
          actions: [
            (
              ctx: TracingContext,
              event: { readonly type: "SET_FILTER"; readonly payload: SetFilterPayload }
            ): TracingContext => ({
              ...ctx,
              filter: event.payload.filter,
            }),
          ],
        },
        CLEAR_FILTER: {
          target: "paused",
          actions: [
            (ctx: TracingContext): TracingContext => ({
              ...ctx,
              filter: null,
            }),
          ],
        },
        SET_SEARCH: {
          target: "paused",
          actions: [
            (
              ctx: TracingContext,
              event: { readonly type: "SET_SEARCH"; readonly payload: SetSearchPayload }
            ): TracingContext => ({
              ...ctx,
              searchQuery: event.payload.query,
            }),
          ],
        },
        EXPORT: {
          target: "paused",
          // Export handled by React layer
        },
        DISABLE: {
          target: "stopping",
        },
      },
    },

    // ========================================================================
    // Stopping State - Cleanup in progress
    // ========================================================================
    stopping: {
      // Activity cleanup handled by React layer
      on: {
        STOPPED: {
          target: "idle",
          actions: [
            (ctx: TracingContext): TracingContext => ({
              ...ctx,
              error: null,
            }),
          ],
        },
      },
    },
  },
});
