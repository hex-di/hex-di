/**
 * Trace Collector Port - Domain port for resolution tracing
 *
 * Collects and manages resolution trace data for performance analysis.
 *
 * @packageDocumentation
 */

import { createPort } from "@hex-di/core";
import type { TraceEntry, TraceFilter, TraceStats, Lifetime } from "@hex-di/core";

// =============================================================================
// Service Interface
// =============================================================================

/**
 * Interface for collecting and querying resolution traces.
 *
 * Trace collection enables:
 * - Performance analysis and bottleneck detection
 * - Cache efficiency monitoring
 * - Resolution chain visualization
 */
export interface TraceCollector {
  /**
   * Records a new resolution trace entry.
   */
  record(entry: TraceEntryInput): void;

  /**
   * Gets traces matching the optional filter.
   */
  getTraces(filter?: TraceFilter): readonly TraceEntry[];

  /**
   * Gets aggregate statistics.
   */
  getStats(): TraceStats;

  /**
   * Subscribes to new trace entries.
   * Returns an unsubscribe function.
   */
  subscribe(callback: (trace: TraceEntry) => void): () => void;

  /**
   * Pauses trace collection.
   */
  pause(): void;

  /**
   * Resumes trace collection.
   */
  resume(): void;

  /**
   * Checks if collection is paused.
   */
  isPaused(): boolean;

  /**
   * Clears all collected traces.
   */
  clear(): void;
}

/**
 * Input for recording a trace entry.
 */
export interface TraceEntryInput {
  readonly portName: string;
  readonly lifetime: Lifetime;
  readonly durationMs: number;
  readonly cacheHit: boolean;
  readonly scopeId?: string | null;
  readonly parentId?: string | null;
}

// =============================================================================
// Port Definition
// =============================================================================

/**
 * Port for trace collection functionality.
 *
 * Supports real-time subscription to new traces and trace data caching.
 */
export const TraceCollectorPort = createPort<"TraceCollector", TraceCollector>("TraceCollector");
