/**
 * Test assertion helpers for verifying tracing behavior.
 *
 * Provides functions for finding spans that match specific criteria
 * and throwing descriptive errors when no match is found.
 *
 * @packageDocumentation
 */

import type { SpanData, SpanStatus, Attributes } from "../types/index.js";

/**
 * Criteria for matching spans in test assertions.
 *
 * All specified criteria must match for a span to be selected.
 * Omitted criteria are not checked.
 *
 * @example
 * ```typescript
 * // Find span by name and status
 * assertSpanExists(spans, {
 *   name: 'GET /users',
 *   status: 'ok'
 * });
 *
 * // Find span with pattern matching and attributes
 * assertSpanExists(spans, {
 *   name: /^GET /,
 *   attributes: { 'http.status_code': 200 }
 * });
 * ```
 *
 * @public
 */
export interface SpanMatcher {
  /**
   * Match span name (exact string or regex pattern).
   *
   * - String: exact match
   * - RegExp: pattern match
   */
  readonly name?: string | RegExp;

  /**
   * Match span status.
   *
   * Must be exact match: 'unset', 'ok', or 'error'.
   */
  readonly status?: SpanStatus;

  /**
   * Match span attributes.
   *
   * Span must have all specified attributes with matching values.
   * Span may have additional attributes not in the matcher.
   */
  readonly attributes?: Attributes;

  /**
   * Match span event presence.
   *
   * Span must have at least one event with this exact name.
   */
  readonly hasEvent?: string;

  /**
   * Match minimum span duration in milliseconds.
   *
   * Duration = endTime - startTime.
   * Span duration must be >= minDuration.
   */
  readonly minDuration?: number;
}

/**
 * Asserts that at least one span matches the given criteria.
 *
 * Searches through all provided spans and returns the first match.
 * Throws a descriptive error if no span matches, including details
 * about what was searched for and what spans were available.
 *
 * **Pure function:** No side effects, does not modify input.
 *
 * @param spans - Array of span data to search
 * @param matcher - Criteria to match against
 * @returns The first matching span
 * @throws Error with diagnostic information if no span matches
 *
 * @example
 * ```typescript
 * const tracer = createMemoryTracer();
 * tracer.withSpan('operation', span => {
 *   span.setAttribute('key', 'value');
 * });
 *
 * const spans = tracer.getCollectedSpans();
 * const span = assertSpanExists(spans, {
 *   name: 'operation',
 *   attributes: { key: 'value' }
 * });
 * ```
 *
 * @public
 */
export function assertSpanExists(spans: ReadonlyArray<SpanData>, matcher: SpanMatcher): SpanData {
  // Try to find matching span
  for (const span of spans) {
    if (spanMatches(span, matcher)) {
      return span;
    }
  }

  // No match found - build helpful error message
  const criteria: string[] = [];

  if (matcher.name !== undefined) {
    if (typeof matcher.name === "string") {
      criteria.push(`name: "${matcher.name}"`);
    } else {
      criteria.push(`name: ${matcher.name.toString()}`);
    }
  }

  if (matcher.status !== undefined) {
    criteria.push(`status: "${matcher.status}"`);
  }

  if (matcher.attributes !== undefined) {
    const attrs = Object.entries(matcher.attributes)
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join(", ");
    criteria.push(`attributes: { ${attrs} }`);
  }

  if (matcher.hasEvent !== undefined) {
    criteria.push(`hasEvent: "${matcher.hasEvent}"`);
  }

  if (matcher.minDuration !== undefined) {
    criteria.push(`minDuration: ${matcher.minDuration}ms`);
  }

  const criteriaStr = criteria.length > 0 ? criteria.join(", ") : "{}";
  const spanNames = spans.map(s => `"${s.name}"`).join(", ");
  const availableSpans = spans.length > 0 ? spanNames : "none";

  throw new Error(
    `No span found matching criteria: { ${criteriaStr} }\n` + `Available spans: ${availableSpans}`
  );
}

/**
 * Checks if a span matches all criteria in the matcher.
 *
 * All specified criteria must match. Omitted criteria are not checked.
 *
 * @param span - Span to check
 * @param matcher - Criteria to match
 * @returns true if all criteria match, false otherwise
 * @internal
 */
function spanMatches(span: SpanData, matcher: SpanMatcher): boolean {
  // Check name
  if (matcher.name !== undefined) {
    if (typeof matcher.name === "string") {
      if (span.name !== matcher.name) {
        return false;
      }
    } else {
      if (!matcher.name.test(span.name)) {
        return false;
      }
    }
  }

  // Check status
  if (matcher.status !== undefined) {
    if (span.status !== matcher.status) {
      return false;
    }
  }

  // Check attributes
  if (matcher.attributes !== undefined) {
    for (const [key, value] of Object.entries(matcher.attributes)) {
      if (span.attributes[key] !== value) {
        return false;
      }
    }
  }

  // Check event presence
  if (matcher.hasEvent !== undefined) {
    const hasMatchingEvent = span.events.some(e => e.name === matcher.hasEvent);
    if (!hasMatchingEvent) {
      return false;
    }
  }

  // Check minimum duration
  if (matcher.minDuration !== undefined) {
    const duration = span.endTime - span.startTime;
    if (duration < matcher.minDuration) {
      return false;
    }
  }

  return true;
}
