/**
 * NoOp tracer implementation with zero runtime overhead.
 *
 * This module provides singleton frozen instances that perform no operations
 * and make no allocations after initialization. The NoOp tracer is designed
 * for production environments where tracing is disabled, ensuring zero
 * performance impact.
 *
 * **Zero-overhead guarantees:**
 * - No allocations (returns same frozen singleton instances)
 * - No timing calls (no Date.now(), no performance.now())
 * - No state mutations (all objects frozen)
 * - No-op methods (all methods return immediately)
 *
 * @packageDocumentation
 */

import type { Span, SpanContext, SpanEvent, Attributes } from "../../types/index.js";
import type { Tracer } from "../../ports/tracer.js";
import type { SpanStatus } from "../../types/status.js";

/**
 * Zero trace context for the NoOp span.
 *
 * Uses all-zeros for traceId, spanId, and traceFlags to indicate
 * no tracing is active. This context is invalid per W3C Trace Context spec
 * and will not be propagated to downstream services.
 */
const NOOP_SPAN_CONTEXT: SpanContext = Object.freeze({
  traceId: "00000000000000000000000000000000",
  spanId: "0000000000000000",
  traceFlags: 0,
});

/**
 * Singleton NoOp span that performs no operations.
 *
 * All mutation methods return `this` for chaining without allocating.
 * isRecording() returns false to signal that telemetry is not being captured.
 * end() is a no-op since there's no state to finalize.
 */
const NOOP_SPAN: Span = Object.freeze({
  context: NOOP_SPAN_CONTEXT,

  setAttribute(_key: string, _value: unknown): Span {
    return NOOP_SPAN;
  },

  setAttributes(_attributes: Attributes): Span {
    return NOOP_SPAN;
  },

  addEvent(_event: SpanEvent): Span {
    return NOOP_SPAN;
  },

  setStatus(_status: SpanStatus): Span {
    return NOOP_SPAN;
  },

  recordException(_exception: Error | string): Span {
    return NOOP_SPAN;
  },

  end(_endTime?: number): void {
    // No-op: nothing to finalize
  },

  isRecording(): boolean {
    return false;
  },
});

/**
 * Singleton NoOp tracer that creates no spans.
 *
 * All operations return the singleton NOOP_SPAN or execute the provided
 * function without creating any tracing context. This ensures zero
 * allocation overhead for disabled tracing.
 *
 * **Method behaviors:**
 * - `startSpan()`: Returns NOOP_SPAN singleton
 * - `withSpan()`: Executes function immediately with NOOP_SPAN
 * - `withSpanAsync()`: Executes async function immediately with NOOP_SPAN
 * - `getActiveSpan()`: Returns undefined (no active tracing)
 * - `getSpanContext()`: Returns undefined (no context to propagate)
 * - `withAttributes()`: Returns self (attributes have no effect)
 */
const NOOP_TRACER: Tracer = Object.freeze({
  startSpan(_name: string, _options?: unknown): Span {
    return NOOP_SPAN;
  },

  withSpan<T>(_name: string, fn: (span: Span) => T, _options?: unknown): T {
    return fn(NOOP_SPAN);
  },

  async withSpanAsync<T>(
    _name: string,
    fn: (span: Span) => Promise<T>,
    _options?: unknown
  ): Promise<T> {
    return fn(NOOP_SPAN);
  },

  getActiveSpan(): undefined {
    return undefined;
  },

  getSpanContext(): undefined {
    return undefined;
  },

  withAttributes(_attributes: Attributes): Tracer {
    return NOOP_TRACER;
  },
});

/**
 * NoOp span singleton for testing and validation.
 *
 * Exported for tests that need to verify NoOp behavior or compare
 * span instances for identity checks.
 *
 * @public
 */
export const NOOP_SPAN_EXPORTED = NOOP_SPAN;

/**
 * NoOp tracer singleton for use by the adapter.
 *
 * This is the primary export used by NoOpTracerAdapter to implement
 * the TracerPort with zero overhead.
 *
 * @public
 */
export const NOOP_TRACER_EXPORTED = NOOP_TRACER;
