/**
 * Trace Collector Activity
 *
 * Long-running activity that subscribes to the tracing API and emits
 * trace events to the TracingMachine. Uses AbortSignal for proper cleanup
 * and the @hex-di/flow activity() factory pattern for typed events.
 *
 * This activity is designed to be spawned by the TracingMachine when
 * transitioning to the "tracing" state, and stopped when paused or stopped.
 *
 * @packageDocumentation
 */

import { defineEvents, activity, activityPort } from "@hex-di/flow";
import type { TracingAPI, TraceEntry, TraceFilter } from "@hex-di/core";
import type { TracingEvent } from "../machines/tracing.machine.js";

// =============================================================================
// Activity Events
// =============================================================================

/**
 * Events emitted by the trace collector activity.
 *
 * These map to TracingMachine events.
 */
export const TraceCollectorEvents = defineEvents({
  /** Single trace received */
  TRACE_RECEIVED: (trace: TraceEntry) => ({ trace }),

  /** Batch of traces received */
  TRACES_BATCH: (traces: readonly TraceEntry[]) => ({ traces }),

  /** Collection stopped successfully */
  STOPPED: () => ({}),

  /** Collection error */
  ERROR: (error: Error) => ({ error }),
});

// =============================================================================
// Activity Types
// =============================================================================

/**
 * Input for the trace collector activity.
 */
export interface TraceCollectorInput {
  /** The tracing API to collect from */
  readonly tracingAPI: TracingAPI;
  /** Optional filter to apply to collected traces */
  readonly filter?: TraceFilter;
}

/**
 * Output from the trace collector activity.
 */
export interface TraceCollectorOutput {
  /** Number of traces collected during this session */
  readonly tracesCollected: number;
}

/**
 * Event sink for emitting events from the activity.
 * @deprecated Use the activity() factory pattern instead.
 */
export interface TraceEventSink {
  /**
   * Emit an event to the machine.
   *
   * @param event - The event to emit (use TraceCollectorEvents factories)
   */
  emit(event: { readonly type: TracingEvent; readonly [key: string]: unknown }): void;
}

// =============================================================================
// Activity Port
// =============================================================================

/**
 * Port for the trace collector activity.
 */
export const TraceCollectorPort = activityPort<TraceCollectorInput, TraceCollectorOutput>()(
  "TraceCollector"
);

// =============================================================================
// Activity Implementation
// =============================================================================

/**
 * Trace Collector Activity.
 *
 * Subscribes to the tracing API and emits TRACE_RECEIVED events for new traces.
 * Uses a pull-then-push pattern: on each subscription callback, it fetches
 * only the new traces since the last seen count.
 *
 * This is a long-running activity that continues until the AbortSignal
 * is triggered.
 *
 * Events emitted:
 * - TRACE_RECEIVED: Single trace was received
 * - TRACES_BATCH: Multiple traces were received at once
 * - STOPPED: Collection stopped cleanly
 * - ERROR: Collection error occurred
 *
 * @example
 * ```typescript
 * const { events } = await testActivity(TraceCollectorActivity, {
 *   input: { tracingAPI, filter: { portName: 'UserService' } },
 *   deps: {},
 *   abortAfter: 1000, // Collect for 1 second
 * });
 *
 * const traceEvents = events.filter(e => e.type === 'TRACE_RECEIVED');
 * console.log(`Collected ${traceEvents.length} traces`);
 * ```
 */
export const TraceCollectorActivity = activity(TraceCollectorPort, {
  requires: [] as const,
  emits: TraceCollectorEvents,
  timeout: undefined, // Long-running, no timeout

  async execute(input: TraceCollectorInput, { sink, signal }): Promise<TraceCollectorOutput> {
    const { tracingAPI, filter } = input;
    let tracesCollected = 0;

    // Check if already aborted
    if (signal.aborted) {
      sink.emit(TraceCollectorEvents.STOPPED());
      return { tracesCollected: 0 };
    }

    // Create a promise that resolves when aborted
    const abortPromise = new Promise<void>(resolve => {
      signal.addEventListener("abort", () => resolve(), { once: true });
    });

    try {
      // Track the last seen count to only emit new traces
      let lastSeenCount = 0;

      // Subscribe to trace updates
      const unsubscribe = tracingAPI.subscribe(() => {
        // Don't emit if aborted
        if (signal.aborted) {
          return;
        }

        // Get current traces (with filter if provided)
        const traces = tracingAPI.getTraces(filter);

        // Only emit new traces
        if (traces.length > lastSeenCount) {
          const newTraces = traces.slice(lastSeenCount);
          const newCount = newTraces.length;
          lastSeenCount = traces.length;
          tracesCollected += newCount;

          // Emit as batch or single based on count
          if (newTraces.length === 1 && newTraces[0] !== undefined) {
            sink.emit(TraceCollectorEvents.TRACE_RECEIVED(newTraces[0]));
          } else if (newTraces.length > 1) {
            sink.emit(TraceCollectorEvents.TRACES_BATCH(newTraces));
          }
        }
      });

      // Wait for abort signal
      await abortPromise;

      // Cleanup subscription
      unsubscribe();

      // Emit stopped event
      sink.emit(TraceCollectorEvents.STOPPED());

      return { tracesCollected };
    } catch (error) {
      // Emit error and stopped
      const err = error instanceof Error ? error : new Error(String(error));
      sink.emit(TraceCollectorEvents.ERROR(err));
      sink.emit(TraceCollectorEvents.STOPPED());
      return { tracesCollected };
    }
  },

  // Cleanup function for graceful shutdown
  cleanup(reason, { deps: _deps }) {
    // No-op: subscription is already cleaned up in execute()
    // This is called after execute() completes, so nothing to do here
  },
});

// =============================================================================
// Legacy Function (for backward compatibility)
// =============================================================================

/**
 * Starts the trace collector activity.
 *
 * @deprecated Use TraceCollectorActivity with the activity() factory pattern.
 *
 * This function subscribes to the tracing API and emits trace events to
 * the provided sink. It uses a pull-then-push pattern: on each subscription
 * callback, it fetches only the new traces since the last seen count.
 *
 * @param input - The activity input containing the tracing API and optional filter
 * @param sink - The event sink to emit events to
 * @param signal - AbortSignal for cleanup
 */
export function runTraceCollector(
  input: TraceCollectorInput,
  sink: TraceEventSink,
  signal: AbortSignal
): void {
  const { tracingAPI, filter } = input;

  // Check if already aborted
  if (signal.aborted) {
    sink.emit(TraceCollectorEvents.STOPPED());
    return;
  }

  try {
    // Track the last seen count to only emit new traces
    let lastSeenCount = 0;

    // Subscribe to trace updates
    const unsubscribe = tracingAPI.subscribe(() => {
      // Don't emit if aborted
      if (signal.aborted) {
        return;
      }

      // Get current traces (with filter if provided)
      const traces = tracingAPI.getTraces(filter);

      // Only emit new traces
      if (traces.length > lastSeenCount) {
        const newTraces = traces.slice(lastSeenCount);
        lastSeenCount = traces.length;

        // Emit as batch or single based on count
        if (newTraces.length === 1 && newTraces[0] !== undefined) {
          sink.emit(TraceCollectorEvents.TRACE_RECEIVED(newTraces[0]));
        } else if (newTraces.length > 1) {
          sink.emit(TraceCollectorEvents.TRACES_BATCH(newTraces));
        }
      }
    });

    // Setup cleanup on abort
    signal.addEventListener(
      "abort",
      () => {
        unsubscribe();
        sink.emit(TraceCollectorEvents.STOPPED());
      },
      { once: true }
    );
  } catch {
    // Errors are handled by the React layer - we just emit stopped
    sink.emit(TraceCollectorEvents.STOPPED());
  }
}
