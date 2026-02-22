/**
 * Logger inspector interface and implementation.
 *
 * Provides pull-based queries and push-based subscriptions for
 * observing the logging system's runtime state.
 *
 * @packageDocumentation
 */

import type { LogLevel } from "../types/index.js";
import type { LogEntry } from "../types/index.js";
import type { RedactionConfig } from "../utils/redaction.js";
import type { SamplingConfig } from "../utils/sampling.js";
import type {
  LoggingSnapshot,
  HandlerInfo,
  SamplingStatistics,
  RedactionStatistics,
  ContextUsageStatistics,
  TimeWindowOptions,
  RecentEntriesOptions,
} from "./snapshot.js";
import type { LoggerInspectorEvent } from "./events.js";

/**
 * Listener callback for logger inspector events.
 */
export type LoggerInspectorListener = (event: LoggerInspectorEvent) => void;

/**
 * Logger inspector interface for observing logging system state.
 */
export interface LoggerInspector {
  readonly libraryName: "logging";
  getSnapshot(): LoggingSnapshot;
  getEntryCounts(): Readonly<Record<LogLevel, number>>;
  getErrorRate(options?: TimeWindowOptions): number;
  getHandlerInfo(): readonly HandlerInfo[];
  getSamplingStatistics(): SamplingStatistics;
  getRedactionStatistics(): RedactionStatistics;
  getRecentEntries(options?: RecentEntriesOptions): readonly LogEntry[];
  getContextUsage(): ContextUsageStatistics;
  subscribe(listener: LoggerInspectorListener): () => void;
}

/**
 * All six log levels for iteration.
 */
const ALL_LEVELS: readonly LogLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"];

/**
 * Options for creating a LoggerInspector adapter.
 */
export interface CreateLoggerInspectorOptions {
  readonly handlers?: readonly HandlerInfo[];
  readonly samplingConfig?: SamplingConfig;
  readonly redactionConfig?: RedactionConfig;
  readonly errorRateThreshold?: number;
  readonly errorRateWindowMs?: number;
  readonly recentEntriesCapacity?: number;
  readonly contextDepth?: number;
}

/**
 * Internal inspector adapter with instrumentation hooks.
 */
export interface LoggerInspectorAdapter extends LoggerInspector {
  /**
   * Called by the logging pipeline to record an entry.
   */
  recordEntry(entry: LogEntry): void;

  /**
   * Record that a sampling decision dropped an entry.
   */
  recordSamplingDrop(level: LogLevel): void;

  /**
   * Record that a redaction was applied.
   */
  recordRedaction(fieldPath: string): void;

  /**
   * Record context field usage from a log entry.
   */
  recordContextUsage(fields: readonly string[], childDepth: number): void;
}

/**
 * Creates a LoggerInspector adapter with instrumentation hooks.
 */
export function createLoggerInspectorAdapter(
  options: CreateLoggerInspectorOptions = {}
): LoggerInspectorAdapter {
  const {
    handlers = [],
    samplingConfig,
    redactionConfig,
    errorRateThreshold = 0.5,
    errorRateWindowMs = 60_000,
    recentEntriesCapacity = 100,
    contextDepth = 0,
  } = options;

  // Per-level entry counts
  const counts: Record<LogLevel, number> = {
    trace: 0,
    debug: 0,
    info: 0,
    warn: 0,
    error: 0,
    fatal: 0,
  };

  // Circular buffer of timestamps for error entries (for windowed error rate)
  const errorTimestamps: number[] = [];

  // All timestamps for windowed total count
  const allTimestamps: number[] = [];

  // Sampling stats per level
  const samplingReceived: Record<LogLevel, number> = {
    trace: 0,
    debug: 0,
    info: 0,
    warn: 0,
    error: 0,
    fatal: 0,
  };
  const samplingDropped: Record<LogLevel, number> = {
    trace: 0,
    debug: 0,
    info: 0,
    warn: 0,
    error: 0,
    fatal: 0,
  };

  // Redaction stats
  let totalRedactions = 0;
  const redactionFieldFrequency: Record<string, number> = {};
  let patternMatches = 0;

  // Context usage
  const contextFieldFrequency: Record<string, number> = {};
  let maxChildDepth = 0;

  // Recent entries circular buffer
  const recentEntries: LogEntry[] = [];
  let recentInsertIndex = 0;
  let recentCount = 0;

  // Subscribers
  const listeners = new Set<LoggerInspectorListener>();

  // Mutable handler list
  const currentHandlers = [...handlers];

  function emit(event: LoggerInspectorEvent): void {
    for (const listener of listeners) {
      listener(event);
    }
  }

  function getTotal(): number {
    let total = 0;
    for (const level of ALL_LEVELS) {
      total += counts[level];
    }
    return total;
  }

  function computeErrorRate(): number {
    const total = getTotal();
    if (total === 0) return 0;
    return (counts.error + counts.fatal) / total;
  }

  function computeWindowedErrorRate(windowMs: number): number {
    const now = Date.now();
    const cutoff = now - windowMs;

    let errorCount = 0;
    for (const ts of errorTimestamps) {
      if (ts >= cutoff) errorCount++;
    }

    let totalCount = 0;
    for (const ts of allTimestamps) {
      if (ts >= cutoff) totalCount++;
    }

    if (totalCount === 0) return 0;
    return errorCount / totalCount;
  }

  function getOrderedRecentEntries(): readonly LogEntry[] {
    if (recentCount === 0) return [];

    const size = Math.min(recentCount, recentEntriesCapacity);
    const result: LogEntry[] = [];

    if (recentCount <= recentEntriesCapacity) {
      // Buffer hasn't wrapped yet
      for (let i = 0; i < size; i++) {
        result.push(recentEntries[i]);
      }
    } else {
      // Buffer has wrapped, read from oldest to newest
      for (let i = 0; i < size; i++) {
        const idx = (recentInsertIndex + i) % recentEntriesCapacity;
        result.push(recentEntries[idx]);
      }
    }

    return result;
  }

  const adapter: LoggerInspectorAdapter = {
    libraryName: "logging",

    getSnapshot(): LoggingSnapshot {
      return {
        timestamp: Date.now(),
        totalEntries: getTotal(),
        entriesByLevel: { ...counts },
        errorRate: computeErrorRate(),
        handlers: [...currentHandlers],
        samplingActive: samplingConfig !== undefined,
        redactionActive: redactionConfig !== undefined,
        contextDepth,
      };
    },

    getEntryCounts(): Readonly<Record<LogLevel, number>> {
      return { ...counts };
    },

    getErrorRate(opts?: TimeWindowOptions): number {
      if (opts?.windowMs !== undefined) {
        return computeWindowedErrorRate(opts.windowMs);
      }
      return computeErrorRate();
    },

    getHandlerInfo(): readonly HandlerInfo[] {
      return [...currentHandlers];
    },

    getSamplingStatistics(): SamplingStatistics {
      let totalReceived = 0;
      let totalAccepted = 0;

      function levelStats(level: LogLevel): {
        readonly received: number;
        readonly accepted: number;
        readonly dropped: number;
      } {
        const received = samplingReceived[level];
        const dropped = samplingDropped[level];
        const accepted = received - dropped;
        totalReceived += received;
        totalAccepted += accepted;
        return { received, accepted, dropped };
      }

      const byLevel: Record<
        LogLevel,
        { readonly received: number; readonly accepted: number; readonly dropped: number }
      > = {
        trace: levelStats("trace"),
        debug: levelStats("debug"),
        info: levelStats("info"),
        warn: levelStats("warn"),
        error: levelStats("error"),
        fatal: levelStats("fatal"),
      };

      return {
        active: samplingConfig !== undefined,
        byLevel,
        acceptanceRate: totalReceived === 0 ? 1 : totalAccepted / totalReceived,
      };
    },

    getRedactionStatistics(): RedactionStatistics {
      return {
        active: redactionConfig !== undefined,
        totalRedactions,
        fieldFrequency: { ...redactionFieldFrequency },
        patternMatches,
      };
    },

    getRecentEntries(opts?: RecentEntriesOptions): readonly LogEntry[] {
      const all = getOrderedRecentEntries();
      let filtered = all;

      if (opts?.level !== undefined) {
        filtered = filtered.filter(e => e.level === opts.level);
      }

      if (opts?.since !== undefined) {
        const since = opts.since;
        filtered = filtered.filter(e => e.timestamp >= since);
      }

      if (opts?.limit !== undefined) {
        filtered = filtered.slice(-opts.limit);
      }

      return filtered;
    },

    getContextUsage(): ContextUsageStatistics {
      return {
        activeVariables: Object.keys(contextFieldFrequency).length,
        fieldFrequency: { ...contextFieldFrequency },
        maxChildDepth,
      };
    },

    subscribe(listener: LoggerInspectorListener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    recordEntry(entry: LogEntry): void {
      counts[entry.level]++;
      samplingReceived[entry.level]++;

      const ts = entry.timestamp;
      allTimestamps.push(ts);

      if (entry.level === "error" || entry.level === "fatal") {
        errorTimestamps.push(ts);
      }

      // Add to circular buffer
      recentEntries[recentInsertIndex] = entry;
      recentInsertIndex = (recentInsertIndex + 1) % recentEntriesCapacity;
      recentCount++;

      emit({ type: "entry-logged", level: entry.level, message: entry.message, timestamp: ts });

      // Check error rate threshold
      const currentErrorRate = computeWindowedErrorRate(errorRateWindowMs);
      if (currentErrorRate >= errorRateThreshold && counts.error + counts.fatal > 0) {
        emit({
          type: "error-rate-threshold",
          errorRate: currentErrorRate,
          threshold: errorRateThreshold,
          windowMs: errorRateWindowMs,
        });
      }

      emit({ type: "snapshot-changed" });
    },

    recordSamplingDrop(level: LogLevel): void {
      samplingReceived[level]++;
      samplingDropped[level]++;
      emit({ type: "sampling-dropped", level, dropCount: samplingDropped[level] });
    },

    recordRedaction(fieldPath: string): void {
      totalRedactions++;
      redactionFieldFrequency[fieldPath] = (redactionFieldFrequency[fieldPath] ?? 0) + 1;
      patternMatches++;
      emit({ type: "redaction-applied", fieldPath, count: redactionFieldFrequency[fieldPath] });
    },

    recordContextUsage(fields: readonly string[], childDepth: number): void {
      for (const field of fields) {
        contextFieldFrequency[field] = (contextFieldFrequency[field] ?? 0) + 1;
      }
      if (childDepth > maxChildDepth) {
        maxChildDepth = childDepth;
      }
    },
  };

  return adapter;
}
