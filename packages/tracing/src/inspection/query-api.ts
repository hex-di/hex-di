/**
 * Tracing Query API factory.
 *
 * Creates a TracingQueryAPI instance that wraps a SpanSource
 * with convenient filtering and aggregation methods.
 *
 * @packageDocumentation
 */

import type { SpanData } from "../types/index.js";
import type { TracingQueryAPI, SpanSource, SpanFilter, TimeRangeOptions } from "./types.js";
import { filterSpans } from "./filter.js";
import {
  computeAverageDuration,
  computeErrorCount,
  computeCacheHitRate,
  computePercentiles,
  buildTraceTree,
} from "./aggregation.js";

/**
 * Internal helper: builds a SpanFilter from the convenience parameters
 * used by most query API methods.
 */
function buildFilter(
  portName?: string,
  options?: TimeRangeOptions,
  extras?: Partial<SpanFilter>
): SpanFilter {
  const filter: SpanFilter = {
    portName,
    timeRange: options,
    ...extras,
  };
  return filter;
}

/**
 * Returns filtered spans from the source using the convenience parameters.
 */
function getFilteredSpans(
  source: SpanSource,
  portName?: string,
  options?: TimeRangeOptions,
  extras?: Partial<SpanFilter>
): readonly SpanData[] {
  const filter = buildFilter(portName, options, extras);
  return filterSpans(source(), filter);
}

/**
 * Creates a TracingQueryAPI backed by the given span source.
 *
 * The span source is called on every query, so results always reflect
 * the latest collected spans (pull-based model).
 *
 * @param source - A function returning the current span collection
 * @returns A TracingQueryAPI instance
 */
export function createTracingQueryApi(source: SpanSource): TracingQueryAPI {
  return {
    querySpans(filter: SpanFilter): readonly SpanData[] {
      return filterSpans(source(), filter);
    },

    getAverageDuration(portName?: string, options?: TimeRangeOptions): number | undefined {
      const spans = getFilteredSpans(source, portName, options);
      return computeAverageDuration(spans);
    },

    getErrorCount(portName?: string, options?: TimeRangeOptions): number {
      const spans = getFilteredSpans(source, portName, options);
      return computeErrorCount(spans);
    },

    getCacheHitRate(portName?: string, options?: TimeRangeOptions): number | undefined {
      const spans = getFilteredSpans(source, portName, options);
      return computeCacheHitRate(spans);
    },

    getPercentiles(
      portName: string,
      percentiles: readonly number[],
      options?: TimeRangeOptions
    ): Readonly<Record<number, number>> {
      const spans = getFilteredSpans(source, portName, options);
      return computePercentiles(spans, percentiles);
    },

    getSlowResolutions(
      thresholdMs: number,
      options?: TimeRangeOptions & { readonly limit?: number }
    ): readonly SpanData[] {
      const limit = options?.limit;
      const spans = getFilteredSpans(source, undefined, options, {
        minDuration: thresholdMs,
        limit,
      });
      return spans;
    },

    getErrorSpans(
      portName?: string,
      options?: TimeRangeOptions & { readonly limit?: number }
    ): readonly SpanData[] {
      const limit = options?.limit;
      const spans = getFilteredSpans(source, portName, options, { status: "error", limit });
      return spans;
    },

    getResolutionCount(portName?: string, options?: TimeRangeOptions): number {
      const spans = getFilteredSpans(source, portName, options);
      return spans.length;
    },

    getTraceTree(traceId: string) {
      return buildTraceTree(source(), traceId);
    },
  };
}
