/**
 * Aggregation functions for the Tracing Query API.
 *
 * Pure functions that compute statistics over SpanData arrays.
 * All functions are stateless and operate on readonly inputs.
 *
 * @packageDocumentation
 */

import type { SpanData } from "../types/index.js";
import type { TraceTree } from "./types.js";

/**
 * Computes the average duration of the given spans.
 *
 * @param spans - The spans to average
 * @returns The average duration in ms, or undefined if no spans
 */
export function computeAverageDuration(spans: readonly SpanData[]): number | undefined {
  if (spans.length === 0) {
    return undefined;
  }

  let total = 0;
  for (let i = 0; i < spans.length; i++) {
    total += spans[i].endTime - spans[i].startTime;
  }

  return total / spans.length;
}

/**
 * Counts spans with error status.
 *
 * @param spans - The spans to count
 * @returns The number of spans with status "error"
 */
export function computeErrorCount(spans: readonly SpanData[]): number {
  let count = 0;
  for (let i = 0; i < spans.length; i++) {
    if (spans[i].status === "error") {
      count++;
    }
  }
  return count;
}

/**
 * Computes the cache hit rate across the given spans.
 *
 * Only considers spans that have the `hex-di.resolution.cached` attribute
 * as a boolean. Returns undefined if no spans have the cached attribute.
 *
 * @param spans - The spans to analyze
 * @returns Cache hit rate (0-1), or undefined if no spans have cached attribute
 */
export function computeCacheHitRate(spans: readonly SpanData[]): number | undefined {
  let total = 0;
  let hits = 0;

  for (let i = 0; i < spans.length; i++) {
    const cached = spans[i].attributes["hex-di.resolution.cached"];
    if (typeof cached === "boolean") {
      total++;
      if (cached) {
        hits++;
      }
    }
  }

  if (total === 0) {
    return undefined;
  }

  return hits / total;
}

/**
 * Computes duration percentiles using the nearest-rank method.
 *
 * For each requested percentile p (0-100), returns the value below which
 * p% of the duration values fall.
 *
 * @param spans - The spans to analyze
 * @param percentiles - The percentiles to compute (e.g., [50, 90, 99])
 * @returns A record mapping each percentile to its computed duration value.
 *          Returns 0 for all percentiles if spans is empty.
 */
export function computePercentiles(
  spans: readonly SpanData[],
  percentiles: readonly number[]
): Readonly<Record<number, number>> {
  const result: Record<number, number> = {};

  if (spans.length === 0) {
    for (let i = 0; i < percentiles.length; i++) {
      result[percentiles[i]] = 0;
    }
    return result;
  }

  // Extract and sort durations
  const durations: number[] = [];
  for (let i = 0; i < spans.length; i++) {
    durations.push(spans[i].endTime - spans[i].startTime);
  }
  durations.sort((a, b) => a - b);

  // Nearest-rank method
  for (let i = 0; i < percentiles.length; i++) {
    const p = percentiles[i];
    const rank = Math.ceil((p / 100) * durations.length);
    // Clamp rank to valid index (1-based → 0-based)
    const index = Math.min(Math.max(rank, 1), durations.length) - 1;
    result[p] = durations[index];
  }

  return result;
}

/**
 * Builds a trace tree from spans sharing the given traceId.
 *
 * Filters spans by traceId, then organizes them into a tree structure
 * based on parentSpanId relationships. Returns the root node (span
 * without a parentSpanId), or undefined if no matching spans exist.
 *
 * @param spans - All available spans
 * @param traceId - The trace ID to build the tree for
 * @returns The root TraceTree node, or undefined if no spans match
 */
export function buildTraceTree(spans: readonly SpanData[], traceId: string): TraceTree | undefined {
  // Filter spans belonging to this trace
  const traceSpans: SpanData[] = [];
  for (let i = 0; i < spans.length; i++) {
    if (spans[i].context.traceId === traceId) {
      traceSpans.push(spans[i]);
    }
  }

  if (traceSpans.length === 0) {
    return undefined;
  }

  // Index children by parentSpanId
  const childrenMap = new Map<string, SpanData[]>();
  let rootSpan: SpanData | undefined;

  for (let i = 0; i < traceSpans.length; i++) {
    const span = traceSpans[i];
    if (span.parentSpanId === undefined) {
      rootSpan = span;
    } else {
      const existing = childrenMap.get(span.parentSpanId);
      if (existing !== undefined) {
        existing.push(span);
      } else {
        childrenMap.set(span.parentSpanId, [span]);
      }
    }
  }

  // If no root span found, use the first span as root (partial trace)
  if (rootSpan === undefined) {
    rootSpan = traceSpans[0];
  }

  // Recursively build tree
  function buildNode(span: SpanData): TraceTree {
    const childSpans = childrenMap.get(span.context.spanId);
    const children: TraceTree[] = [];
    if (childSpans !== undefined) {
      for (let i = 0; i < childSpans.length; i++) {
        children.push(buildNode(childSpans[i]));
      }
    }
    return { span, children };
  }

  return buildNode(rootSpan);
}
