/**
 * Types for the Tracing Query API.
 *
 * Provides interfaces for filtering, aggregating, and querying
 * collected span data from the MemoryTracer.
 *
 * @packageDocumentation
 */

import type { SpanData, SpanStatus } from "../types/index.js";

/**
 * Time range filter options for span queries.
 */
export interface TimeRangeOptions {
  /** Include spans starting at or after this timestamp (ms since epoch) */
  readonly since?: number;
  /** Include spans starting at or before this timestamp (ms since epoch) */
  readonly until?: number;
}

/**
 * Filter criteria for querying spans.
 *
 * All fields are optional — only specified fields participate in filtering.
 * Multiple fields are combined with AND logic.
 */
export interface SpanFilter {
  /** Filter by port name attribute (`hex-di.port.name`) */
  readonly portName?: string;
  /** Filter by time range (based on startTime) */
  readonly timeRange?: TimeRangeOptions;
  /** Minimum span duration in ms (endTime - startTime) */
  readonly minDuration?: number;
  /** Maximum span duration in ms (endTime - startTime) */
  readonly maxDuration?: number;
  /** Filter by span status */
  readonly status?: SpanStatus;
  /** Filter by scope ID attribute (`hex-di.scope.id`) */
  readonly scopeId?: string;
  /** Filter by cache hit attribute (`hex-di.resolution.cached`) */
  readonly cached?: boolean;
  /** Filter by trace ID */
  readonly traceId?: string;
  /** Maximum number of results to return */
  readonly limit?: number;
}

/**
 * Tree representation of a distributed trace.
 *
 * Each node contains a span and its direct children,
 * forming a hierarchy based on parentSpanId relationships.
 */
export interface TraceTree {
  /** The span at this node */
  readonly span: SpanData;
  /** Direct child spans */
  readonly children: readonly TraceTree[];
}

/**
 * Query API for analyzing collected span data.
 *
 * Provides filtering, aggregation, and analysis functions
 * over a span source (typically MemoryTracer.getCollectedSpans).
 */
export interface TracingQueryAPI {
  /** Query spans matching filter criteria */
  querySpans(filter: SpanFilter): readonly SpanData[];
  /** Compute average duration across matching spans */
  getAverageDuration(portName?: string, options?: TimeRangeOptions): number | undefined;
  /** Count spans with error status */
  getErrorCount(portName?: string, options?: TimeRangeOptions): number;
  /** Compute cache hit rate (0-1) across matching spans */
  getCacheHitRate(portName?: string, options?: TimeRangeOptions): number | undefined;
  /** Compute duration percentiles for a specific port */
  getPercentiles(
    portName: string,
    percentiles: readonly number[],
    options?: TimeRangeOptions
  ): Readonly<Record<number, number>>;
  /** Find spans slower than the given threshold */
  getSlowResolutions(
    thresholdMs: number,
    options?: TimeRangeOptions & { readonly limit?: number }
  ): readonly SpanData[];
  /** Find spans with error status */
  getErrorSpans(
    portName?: string,
    options?: TimeRangeOptions & { readonly limit?: number }
  ): readonly SpanData[];
  /** Count total resolutions matching criteria */
  getResolutionCount(portName?: string, options?: TimeRangeOptions): number;
  /** Build a trace tree from all spans sharing the given traceId */
  getTraceTree(traceId: string): TraceTree | undefined;
}

/**
 * Function that returns the current collection of spans.
 * Typically wraps MemoryTracer.getCollectedSpans().
 */
export type SpanSource = () => readonly SpanData[];
