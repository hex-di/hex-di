/**
 * Context variables for trace propagation in dependency injection.
 *
 * These variables enable passing trace context through the DI container
 * without explicitly threading it through every service.
 *
 * **Usage pattern (implemented in Phase 24):**
 * ```typescript
 * // Instrumentation sets these during resolution
 * withContext(TraceContextVar, context, () => {
 *   container.resolve(MyService);
 * });
 *
 * // Services can access trace context
 * const context = getContext(TraceContextVar);
 * ```
 *
 * @packageDocumentation
 */

import { createContextVariable, type ContextVariable } from "@hex-di/core";
import type { Span } from "../types/span.js";
import type { SpanContext } from "../types/span.js";

/**
 * Context variable for W3C Trace Context propagation.
 *
 * Carries the current span's trace context (traceId, spanId, flags)
 * through DI resolution. Used by instrumentation to maintain trace
 * continuity across container boundaries.
 *
 * **Set by:** Phase 24 instrumentation during container.resolve()
 * **Read by:** Services that need trace context (e.g., loggers, HTTP clients)
 *
 * @example
 * ```typescript
 * // Phase 24 instrumentation (not yet implemented)
 * const context = extractTraceContext(request.headers);
 * withContext(TraceContextVar, context, () => {
 *   const service = container.resolve(MyService);
 * });
 *
 * // Service usage
 * const context = getContext(TraceContextVar);
 * if (context) {
 *   logger.log({ traceId: context.traceId, message: '...' });
 * }
 * ```
 */
export const TraceContextVar: ContextVariable<SpanContext | undefined> = createContextVariable(
  "hex-di/trace-context",
  undefined
);

/**
 * Context variable for the currently active span.
 *
 * Carries the active Span object through DI resolution, allowing
 * services to add attributes, events, or create child spans.
 *
 * **Set by:** Phase 24 instrumentation during container.resolve()
 * **Read by:** Services that need to annotate the active span
 *
 * @example
 * ```typescript
 * // Phase 24 instrumentation (not yet implemented)
 * const span = tracer.startSpan('resolve', { kind: 'internal' });
 * withContext(ActiveSpanVar, span, () => {
 *   const service = container.resolve(MyService);
 * });
 *
 * // Service usage
 * const span = getContext(ActiveSpanVar);
 * if (span) {
 *   span.setAttribute('user.id', userId);
 *   span.addEvent({ name: 'cache.hit', time: Date.now() });
 * }
 * ```
 */
export const ActiveSpanVar: ContextVariable<Span | undefined> = createContextVariable(
  "hex-di/active-span",
  undefined
);

/**
 * Context variable for correlation ID.
 *
 * Carries a correlation ID (e.g., request ID, session ID) through
 * DI resolution for linking related operations across services.
 *
 * Unlike trace context which follows W3C spec, correlation IDs are
 * application-specific identifiers for business logic correlation.
 *
 * **Set by:** Application code at entry points (HTTP middleware, queue handlers)
 * **Read by:** Services that need correlation for logging or business logic
 *
 * @example
 * ```typescript
 * // Set at entry point
 * const correlationId = request.headers['x-correlation-id'] ?? generateCorrelationId();
 * withContext(CorrelationIdVar, correlationId, () => {
 *   const service = container.resolve(MyService);
 * });
 *
 * // Service usage
 * const correlationId = getContext(CorrelationIdVar);
 * logger.log({ correlationId, message: '...' });
 * ```
 */
export const CorrelationIdVar: ContextVariable<string | undefined> = createContextVariable(
  "hex-di/correlation-id",
  undefined
);
