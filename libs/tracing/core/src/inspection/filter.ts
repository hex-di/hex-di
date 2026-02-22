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
export function matchesFilter(span: SpanData, filter: SpanFilter): boolean {
  // Port name check
  if (filter.portName !== undefined) {
    const portAttr = span.attributes["hex-di.port.name"];
    if (typeof portAttr !== "string" || portAttr !== filter.portName) {
      return false;
    }
  }

  // Scope ID check
  if (filter.scopeId !== undefined) {
    const scopeAttr = span.attributes["hex-di.scope.id"];
    if (typeof scopeAttr !== "string" || scopeAttr !== filter.scopeId) {
      return false;
    }
  }

  // Cached check
  if (filter.cached !== undefined) {
    const cachedAttr = span.attributes["hex-di.resolution.cached"];
    if (typeof cachedAttr !== "boolean" || cachedAttr !== filter.cached) {
      return false;
    }
  }

  // Duration checks
  const duration = span.endTime - span.startTime;

  if (filter.minDuration !== undefined && duration < filter.minDuration) {
    return false;
  }

  if (filter.maxDuration !== undefined && duration > filter.maxDuration) {
    return false;
  }

  // Time range checks (based on startTime)
  if (filter.timeRange !== undefined) {
    if (filter.timeRange.since !== undefined && span.startTime < filter.timeRange.since) {
      return false;
    }
    if (filter.timeRange.until !== undefined && span.startTime > filter.timeRange.until) {
      return false;
    }
  }

  // Status check
  if (filter.status !== undefined && span.status !== filter.status) {
    return false;
  }

  // Trace ID check
  if (filter.traceId !== undefined && span.context.traceId !== filter.traceId) {
    return false;
  }

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
