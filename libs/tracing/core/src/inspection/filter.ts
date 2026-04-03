/**
 * Span filtering functions for the Tracing Query API.
 *
 * Pure functions that filter SpanData arrays based on SpanFilter criteria.
 * Uses early bailout per criterion for efficient filtering.
 *
 * @packageDocumentation
 */

import type { SpanData } from "../types/index.js";
import type { SpanFilter } from "./types.js";

/**
 * Tests whether a single span matches all criteria in the given filter.
 *
 * Each criterion is checked with early bailout — returns false as soon
 * as any criterion fails, avoiding unnecessary attribute lookups.
 *
 * @param span - The span to test
 * @param filter - The filter criteria to match against
 * @returns true if the span matches all specified criteria
 */
function matchesAttribute(
  attributes: SpanData["attributes"],
  key: string,
  expected: string | boolean | undefined
): boolean {
  if (expected === undefined) return true;
  const actual = attributes[key];
  return actual === expected;
}

function matchesTimeRange(startTime: number, timeRange: SpanFilter["timeRange"]): boolean {
  if (timeRange === undefined) return true;
  if (timeRange.since !== undefined && startTime < timeRange.since) return false;
  if (timeRange.until !== undefined && startTime > timeRange.until) return false;
  return true;
}

export function matchesFilter(span: SpanData, filter: SpanFilter): boolean {
  if (!matchesAttribute(span.attributes, "hex-di.port.name", filter.portName)) return false;
  if (!matchesAttribute(span.attributes, "hex-di.scope.id", filter.scopeId)) return false;
  if (!matchesAttribute(span.attributes, "hex-di.resolution.cached", filter.cached)) return false;

  const duration = span.endTime - span.startTime;
  if (filter.minDuration !== undefined && duration < filter.minDuration) return false;
  if (filter.maxDuration !== undefined && duration > filter.maxDuration) return false;

  if (!matchesTimeRange(span.startTime, filter.timeRange)) return false;
  if (filter.status !== undefined && span.status !== filter.status) return false;
  if (filter.traceId !== undefined && span.context.traceId !== filter.traceId) return false;

  return true;
}

/**
 * Filters a span array by the given criteria and applies an optional limit.
 *
 * @param spans - The spans to filter
 * @param filter - The filter criteria
 * @returns A new array containing only matching spans, truncated to limit if specified
 */
export function filterSpans(spans: readonly SpanData[], filter: SpanFilter): readonly SpanData[] {
  const result: SpanData[] = [];
  const limit = filter.limit;

  for (let i = 0; i < spans.length; i++) {
    if (limit !== undefined && result.length >= limit) {
      break;
    }
    if (matchesFilter(spans[i], filter)) {
      result.push(spans[i]);
    }
  }

  return result;
}
