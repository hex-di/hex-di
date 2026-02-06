/**
 * Test utilities for verifying tracing behavior.
 *
 * Provides assertion helpers and span matcher predicates for writing
 * tests that verify distributed tracing instrumentation.
 *
 * @example
 * ```typescript
 * import { createMemoryTracer } from '@hex-di/tracing';
 * import { assertSpanExists, hasAttribute, hasEvent } from '@hex-di/tracing/testing';
 *
 * const tracer = createMemoryTracer();
 * tracer.withSpan('operation', span => {
 *   span.setAttribute('key', 'value');
 *   span.addEvent({ name: 'milestone', time: Date.now() });
 * });
 *
 * const spans = tracer.getCollectedSpans();
 * const span = assertSpanExists(spans, {
 *   name: 'operation',
 *   attributes: { key: 'value' }
 * });
 *
 * expect(hasEvent(span, 'milestone')).toBe(true);
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Assertions
// =============================================================================

export { assertSpanExists } from "./assertions.js";
export type { SpanMatcher } from "./assertions.js";

// =============================================================================
// Matchers
// =============================================================================

export { hasAttribute, hasEvent, hasStatus, hasDuration } from "./matchers.js";
