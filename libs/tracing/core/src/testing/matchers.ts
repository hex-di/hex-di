/**
 * Span matcher predicates for common test assertions.
 *
 * Pure functions that check if a span meets specific criteria.
 * Use these as building blocks for custom assertions.
 *
 * @packageDocumentation
 */

import type { SpanData, SpanStatus, AttributeValue } from "../types/index.js";

/**
 * Checks if a span has a specific attribute.
 *
 * If value is provided, checks for exact match.
 * If value is omitted, checks only for key presence.
 *
 * **Pure function:** No side effects, does not modify input.
 *
 * @param span - Span to check
 * @param key - Attribute key to look for
 * @param value - Optional expected value (checks key presence if omitted)
 * @returns true if attribute exists (and matches value if provided)
 *
 * @example
 * ```typescript
 * // Check if attribute exists
 * if (hasAttribute(span, 'http.method')) {
 *   // ...
 * }
 *
 * // Check if attribute has specific value
 * if (hasAttribute(span, 'http.status_code', 200)) {
 *   // ...
 * }
 * ```
 *
 * @public
 */
export function hasAttribute(span: SpanData, key: string, value?: AttributeValue): boolean {
  const attrValue = span.attributes[key];

  // Check key presence
  if (attrValue === undefined) {
    return false;
  }

  // If value specified, check for exact match
  if (value !== undefined) {
    return attrValue === value;
  }

  // Key exists and no value specified
  return true;
}

/**
 * Checks if a span has an event with the specified name.
 *
 * Returns true if at least one event matches the name.
 *
 * **Pure function:** No side effects, does not modify input.
 *
 * @param span - Span to check
 * @param name - Event name to look for (exact match)
 * @returns true if span has at least one event with this name
 *
 * @example
 * ```typescript
 * if (hasEvent(span, 'cache.miss')) {
 *   // Span recorded a cache miss
 * }
 * ```
 *
 * @public
 */
export function hasEvent(span: SpanData, name: string): boolean {
  return span.events.some(event => event.name === name);
}

/**
 * Checks if a span has the specified status.
 *
 * **Pure function:** No side effects, does not modify input.
 *
 * @param span - Span to check
 * @param status - Expected status ('unset' | 'ok' | 'error')
 * @returns true if span status matches
 *
 * @example
 * ```typescript
 * if (hasStatus(span, 'error')) {
 *   // Span failed
 * }
 * ```
 *
 * @public
 */
export function hasStatus(span: SpanData, status: SpanStatus): boolean {
  return span.status === status;
}

/**
 * Checks if a span's duration falls within specified bounds.
 *
 * Duration is calculated as endTime - startTime.
 * Both bounds are optional and inclusive when provided.
 *
 * **Pure function:** No side effects, does not modify input.
 *
 * @param span - Span to check
 * @param minMs - Optional minimum duration in milliseconds (inclusive)
 * @param maxMs - Optional maximum duration in milliseconds (inclusive)
 * @returns true if duration is within bounds
 *
 * @example
 * ```typescript
 * // Check minimum duration
 * if (hasDuration(span, 100)) {
 *   // Span took at least 100ms
 * }
 *
 * // Check duration range
 * if (hasDuration(span, 50, 200)) {
 *   // Span took between 50-200ms
 * }
 *
 * // Check maximum duration
 * if (hasDuration(span, undefined, 1000)) {
 *   // Span took at most 1 second
 * }
 * ```
 *
 * @public
 */
export function hasDuration(span: SpanData, minMs?: number, maxMs?: number): boolean {
  const duration = span.endTime - span.startTime;

  if (minMs !== undefined && duration < minMs) {
    return false;
  }

  if (maxMs !== undefined && duration > maxMs) {
    return false;
  }

  return true;
}
