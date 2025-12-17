/**
 * Memory Trace Collector Adapter
 *
 * An in-memory trace collector for development and debugging.
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

interface MemoryTraceCollectorOptions {
  readonly maxEntries?: number;
  readonly slowThresholdMs?: number;
}

/**
 * Creates an in-memory trace collector.
 */
function createMemoryTraceCollector(
  options: MemoryTraceCollectorOptions = {}
): TraceCollector {
  const maxEntries = options.maxEntries ?? 1000;
  const slowThresholdMs = options.slowThresholdMs ?? 100;
  const traces: TraceEntry[] = [];
  const subscribers = new Set<(trace: TraceEntry) => void>();
  const sessionStart = Date.now();
  let paused = false;
  let orderCounter = 0;
  let idCounter = 0;

  const matchesFilter = (trace: TraceEntry, filter: TraceFilter): boolean => {
    if (filter.portName !== undefined && !trace.portName.toLowerCase().includes(filter.portName.toLowerCase())) {
      return false;
    }
    if (filter.lifetime !== undefined && trace.lifetime !== filter.lifetime) {
      return false;
    }
    if (filter.isCacheHit !== undefined && trace.isCacheHit !== filter.isCacheHit) {
      return false;
    }
    if (filter.minDuration !== undefined && trace.duration < filter.minDuration) {
      return false;
    }
    if (filter.maxDuration !== undefined && trace.duration > filter.maxDuration) {
      return false;
    }
    if (filter.scopeId !== undefined && trace.scopeId !== filter.scopeId) {
      return false;
    }
    if (filter.isPinned !== undefined && trace.isPinned !== filter.isPinned) {
      return false;
    }
    return true;
  };

  return {
    record(entry: TraceEntryInput): void {
      if (paused) {
        return;
      }

      const fullEntry: TraceEntry = {
        id: `trace-${++idCounter}`,
        portName: entry.portName,
        lifetime: entry.lifetime,
        startTime: performance.now(),
        duration: entry.durationMs,
        isCacheHit: entry.cacheHit,
        parentId: entry.parentId ?? null,
        childIds: [],
        scopeId: entry.scopeId ?? null,
        order: ++orderCounter,
        isPinned: entry.durationMs >= slowThresholdMs,
      };

      traces.push(fullEntry);

      // Evict oldest entries if over limit
      while (traces.length > maxEntries) {
        traces.shift();
      }

      // Notify subscribers
      for (const subscriber of subscribers) {
        try {
          subscriber(fullEntry);
        } catch {
          // Ignore subscriber errors
        }
      }
    },

    getTraces(filter?: TraceFilter): readonly TraceEntry[] {
      if (filter === undefined) {
        return [...traces];
      }
      return traces.filter((t) => matchesFilter(t, filter));
    },

    getStats(): TraceStats {
      if (traces.length === 0) {
        return {
          totalResolutions: 0,
          averageDuration: 0,
          cacheHitRate: 0,
          slowCount: 0,
          sessionStart,
          totalDuration: 0,
        };
      }

      const cacheHits = traces.filter((t) => t.isCacheHit).length;
      const totalDuration = traces.reduce((sum, t) => sum + t.duration, 0);
      const slowCount = traces.filter((t) => t.duration >= slowThresholdMs).length;

      return {
        totalResolutions: traces.length,
        averageDuration: totalDuration / traces.length,
        cacheHitRate: cacheHits / traces.length,
        slowCount,
        sessionStart,
        totalDuration,
      };
    },

    subscribe(callback: (trace: TraceEntry) => void): () => void {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },

    pause(): void {
      paused = true;
    },

    resume(): void {
      paused = false;
    },

    isPaused(): boolean {
      return paused;
    },

    clear(): void {
      traces.length = 0;
    },
  };
}

// =============================================================================
// Adapter Definition
// =============================================================================

/**
 * Memory Trace Collector Adapter
 *
 * Provides an in-memory trace collector for development use.
 * Singleton lifetime ensures all traces are collected in one place.
 */
export const MemoryTraceCollectorAdapter = createAdapter({
  provides: TraceCollectorPort,
  requires: [],
  lifetime: 'singleton',
  factory: () => createMemoryTraceCollector(),
});
