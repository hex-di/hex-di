/**
 * Tracer Port - Primary interface for creating and managing spans.
 *
 * The TracerPort follows hexagonal architecture patterns, defining the
 * contract for distributed tracing without coupling to specific implementations.
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";
import type { Span, SpanOptions, SpanContext, Attributes } from "../types/index.js";

/**
 * Service interface for the distributed tracer.
 *
 * The Tracer provides the primary API for creating spans and managing
 * trace context. It follows OpenTelemetry conventions while remaining
 * implementation-agnostic.
 *
 * ## Usage Patterns
 *
 * **Manual span management:**
 * ```typescript
 * const span = tracer.startSpan('operation-name');
 * try {
 *   // ... do work
 *   span.setAttribute('result', 'success');
 * } finally {
 *   span.end();
 * }
 * ```
 *
 * **Automatic span lifecycle (sync):**
 * ```typescript
 * const result = tracer.withSpan('operation-name', (span) => {
 *   span.setAttribute('input', value);
 *   return computeResult();
 * });
 * ```
 *
 * **Automatic span lifecycle (async):**
 * ```typescript
 * const result = await tracer.withSpanAsync('operation-name', async (span) => {
 *   span.setAttribute('userId', userId);
 *   return await fetchUserData(userId);
 * });
 * ```
 *
 * @remarks
 * - Spans are automatically propagated through the module-level context stack
 * - Parent-child relationships are established via active span context
 * - Context propagation is handled by the tracer implementation
 */
export interface Tracer {
  /**
   * Starts a new span with the given name and options.
   *
   * The span becomes the active span in the current context. Callers are
   * responsible for ending the span via `span.end()`.
   *
   * @param name - Human-readable span name (e.g., 'http.request', 'db.query')
   * @param options - Optional configuration for parent context, attributes, etc.
   * @returns A new active span
   *
   * @remarks
   * - If no parent is specified in options, uses current active span as parent
   * - Span names should follow semantic conventions where applicable
   * - Manual span management requires careful error handling to ensure spans end
   *
   * @example
   * ```typescript
   * const span = tracer.startSpan('user.fetch', {
   *   attributes: { 'user.id': userId },
   * });
   * try {
   *   const user = await fetchUser(userId);
   *   span.setAttribute('user.found', true);
   *   return user;
   * } catch (error) {
   *   span.setStatus({ code: 'error', message: String(error) });
   *   throw error;
   * } finally {
   *   span.end();
   * }
   * ```
   */
  startSpan(name: string, options?: SpanOptions): Span;

  /**
   * Executes a synchronous function within a new span context.
   *
   * The span is automatically started before the function executes and
   * ended after completion (success or error). Error status is set
   * automatically if the function throws.
   *
   * @param name - Human-readable span name
   * @param fn - Synchronous function to execute with the span
   * @param options - Optional configuration for the span
   * @returns The return value of the function
   * @throws Re-throws any error from the function after recording it
   *
   * @remarks
   * - Preferred over manual `startSpan()` for most synchronous operations
   * - Exception details are automatically recorded to the span
   * - Span context is propagated to nested operations
   *
   * @example
   * ```typescript
   * const result = tracer.withSpan('calculate.total', (span) => {
   *   span.setAttribute('items.count', items.length);
   *   return items.reduce((sum, item) => sum + item.price, 0);
   * });
   * ```
   */
  withSpan<T>(name: string, fn: (span: Span) => T, options?: SpanOptions): T;

  /**
   * Executes an asynchronous function within a new span context.
   *
   * The span is automatically started before the async function executes
   * and ended after the promise resolves or rejects. Error status is set
   * automatically on rejection.
   *
   * @param name - Human-readable span name
   * @param fn - Async function to execute with the span
   * @param options - Optional configuration for the span
   * @returns A promise that resolves to the function's return value
   * @throws Re-throws any error from the function after recording it
   *
   * @remarks
   * - Preferred over manual `startSpan()` for async operations
   * - Context propagation across async boundaries is handled automatically
   * - Promise rejection details are recorded to the span
   *
   * @example
   * ```typescript
   * const user = await tracer.withSpanAsync('user.fetch', async (span) => {
   *   span.setAttribute('user.id', userId);
   *   const data = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
   *   span.setAttribute('user.found', data !== null);
   *   return data;
   * });
   * ```
   */
  withSpanAsync<T>(name: string, fn: (span: Span) => Promise<T>, options?: SpanOptions): Promise<T>;

  /**
   * Returns the currently active span, if any.
   *
   * The active span is the most recently started span that has not yet ended,
   * maintained via the module-level context stack.
   *
   * @returns The active span, or undefined if no span is active
   *
   * @remarks
   * - Used primarily for custom instrumentation and debugging
   * - Most code should use `withSpan` or `withSpanAsync` instead
   * - Active span changes as spans start and end
   *
   * @example
   * ```typescript
   * const activeSpan = tracer.getActiveSpan();
   * if (activeSpan) {
   *   activeSpan.setAttribute('custom.context', contextValue);
   * }
   * ```
   */
  getActiveSpan(): Span | undefined;

  /**
   * Returns the span context of the currently active span.
   *
   * Span context contains the W3C Trace Context propagation data
   * (traceId, spanId, traceFlags, traceState) without the mutable
   * span operations.
   *
   * @returns The active span context, or undefined if no span is active
   *
   * @remarks
   * - Used for manual context propagation across boundaries
   * - Suitable for injection into HTTP headers, message metadata, etc.
   * - Context is immutable and can be safely serialized
   *
   * @example
   * ```typescript
   * const context = tracer.getSpanContext();
   * if (context) {
   *   // Inject into HTTP headers
   *   headers['traceparent'] = `00-${context.traceId}-${context.spanId}-${context.traceFlags.toString(16).padStart(2, '0')}`;
   * }
   * ```
   */
  getSpanContext(): SpanContext | undefined;

  /**
   * Creates a new tracer instance with additional default attributes.
   *
   * All spans created by the returned tracer will include the specified
   * attributes in addition to any attributes provided at span creation.
   *
   * @param attributes - Default attributes to apply to all spans
   * @returns A new tracer instance with the attributes applied
   *
   * @remarks
   * - Useful for adding service-level or tenant-level attributes
   * - Attributes can be overridden at span creation time
   * - Does not mutate the original tracer instance
   *
   * @example
   * ```typescript
   * const serviceTracer = tracer.withAttributes({
   *   'service.name': 'user-service',
   *   'service.version': '1.2.3',
   *   'deployment.environment': 'production',
   * });
   *
   * // All spans from serviceTracer will include these attributes
   * serviceTracer.withSpan('operation', (span) => {
   *   // span already has service.name, service.version, deployment.environment
   * });
   * ```
   */
  withAttributes(attributes: Attributes): Tracer;

  /**
   * Indicates whether this tracer is actively recording spans.
   *
   * Returns false for NoOp tracers, true for recording tracers
   * (Memory, Console, OTel, etc). This enables early bailout
   * optimizations in instrumentation code to avoid constructing
   * attribute objects when tracing is disabled.
   *
   * @returns true if tracer records spans, false for NoOp
   *
   * @remarks
   * - NoOp tracers return false (no recording, zero overhead)
   * - All other tracer implementations return true
   * - Used by instrumentation hooks for performance optimization
   * - Not intended for application code - use getActiveSpan() instead
   *
   * @example
   * ```typescript
   * if (tracer.isEnabled()) {
   *   // Only construct expensive attribute objects when tracing
   *   const attributes = buildComplexAttributes();
   *   tracer.startSpan('operation', { attributes });
   * }
   * ```
   */
  isEnabled(): boolean;
}

/**
 * TracerPort - Port definition for the distributed tracer.
 *
 * Use this port to declare dependencies on tracing functionality
 * in your adapters and services.
 *
 * @example
 * ```typescript
 * import { createAdapter } from '@hex-di/core';
 * import { TracerPort } from '@hex-di/tracing/ports';
 *
 * const UserServiceAdapter = createAdapter({
 *   provides: UserServicePort,
 *   requires: [TracerPort],
 *   factory: ({ tracer }) => ({
 *     async getUser(id: string) {
 *       return tracer.withSpanAsync('user.get', async (span) => {
 *         span.setAttribute('user.id', id);
 *         return await db.findUser(id);
 *       });
 *     },
 *   }),
 * });
 * ```
 */
export const TracerPort = port<Tracer>()({
  name: "Tracer",
  direction: "outbound",
  description: "Distributed tracing service for creating and managing spans",
  category: "infrastructure",
  tags: ["tracing", "observability", "opentelemetry"],
});
