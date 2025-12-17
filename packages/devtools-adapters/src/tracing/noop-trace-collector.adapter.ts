/**
 * No-Op Trace Collector Adapter
 *
 * A trace collector that does nothing - for production or testing.
 *
 * @packageDocumentation
 */

import { createAdapter } from '@hex-di/graph';
import {
  TraceCollectorPort,
  type TraceCollector,
  type TraceEntry,
  type TraceFilter,
  type TraceStats,
  type TraceEntryInput,
} from '@hex-di/devtools-core';

// =============================================================================
// Implementation
// =============================================================================

const EMPTY_STATS: TraceStats = Object.freeze({
  totalResolutions: 0,
  averageDuration: 0,
  cacheHitRate: 0,
  slowCount: 0,
  sessionStart: 0,
  totalDuration: 0,
});

const EMPTY_TRACES: readonly TraceEntry[] = Object.freeze([]);

/**
 * Creates a no-op trace collector that discards all traces.
 */
function createNoopTraceCollector(): TraceCollector {
  return {
    record(_entry: TraceEntryInput): void {
      // Intentionally empty
    },

    getTraces(_filter?: TraceFilter): readonly TraceEntry[] {
      return EMPTY_TRACES;
    },

    getStats(): TraceStats {
      return EMPTY_STATS;
    },

    subscribe(_callback: (trace: TraceEntry) => void): () => void {
      return () => {
        // Intentionally empty
      };
    },

    pause(): void {
      // Intentionally empty
    },

    resume(): void {
      // Intentionally empty
    },

    isPaused(): boolean {
      return false;
    },

    clear(): void {
      // Intentionally empty
    },
  };
}

// =============================================================================
// Adapter Definition
// =============================================================================

/**
 * No-Op Trace Collector Adapter
 *
 * Provides a trace collector that discards all traces.
 * Useful for production when tracing overhead is not desired.
 */
export const NoopTraceCollectorAdapter = createAdapter({
  provides: TraceCollectorPort,
  requires: [],
  lifetime: 'singleton',
  factory: () => createNoopTraceCollector(),
});
