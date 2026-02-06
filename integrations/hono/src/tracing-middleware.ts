import type { Tracer, Attributes } from "@hex-di/tracing";
import type { MiddlewareHandler } from "hono";
import type { Context } from "hono";
import { extractTraceContext, injectTraceContext } from "@hex-di/tracing";

/**
 * Options for customizing tracing middleware behavior.
 */
export interface TracingMiddlewareOptions {
  /**
   * Tracer instance to use for creating spans.
   */
  readonly tracer: Tracer;

  /**
   * Custom span name function.
   * Defaults to "${method} ${path}" pattern.
   *
   * @param context - Hono context for the request
   * @returns Span name for this request
   */
  readonly spanName?: (context: Context) => string;

  /**
   * Whether to extract trace context from incoming request headers.
   * Defaults to true.
   */
  readonly extractContext?: boolean;

  /**
   * Whether to inject trace context into outgoing response headers.
   * Defaults to true.
   */
  readonly injectContext?: boolean;

  /**
   * Custom attributes function for adding request-specific metadata.
   *
   * @param context - Hono context for the request
   * @returns Attributes to add to the span
   */
  readonly attributes?: (context: Context) => Attributes;
}

/**
 * Default span name generator following HTTP semantic conventions.
 *
 * @param context - Hono context for the request
 * @returns Span name in format "${method} ${path}"
 */
function defaultSpanName(context: Context): string {
  const method = context.req.method;
  const path = context.req.path;
  return `${method} ${path}`;
}

/**
 * Create Hono middleware that integrates distributed tracing.
 *
 * The middleware:
 * - Extracts W3C Trace Context from incoming request headers (traceparent)
 * - Creates a root server span for the request
 * - Sets HTTP semantic attributes (method, url, status code, etc.)
 * - Records exceptions and sets error status on failure
 * - Injects trace context into response headers for propagation
 * - Ensures span.end() is always called via try/catch/finally
 *
 * @param options - Configuration for tracing behavior
 * @returns Hono middleware handler
 *
 * @example
 * ```typescript
 * import { Hono } from 'hono';
 * import { tracingMiddleware } from '@hex-di/hono';
 * import { createConsoleTracer } from '@hex-di/tracing';
 *
 * const app = new Hono();
 * const tracer = createConsoleTracer();
 *
 * app.use('*', tracingMiddleware({
 *   tracer,
 *   attributes: (c) => ({
 *     'user.id': c.get('userId'),
 *   }),
 * }));
 * ```
 */
export function tracingMiddleware(options: TracingMiddlewareOptions): MiddlewareHandler {
  const {
    tracer,
    spanName = defaultSpanName,
    extractContext = true,
    injectContext = true,
    attributes,
  } = options;

  const middleware: MiddlewareHandler = async (context, next) => {
    // Extract parent context from request headers if enabled
    // Note: Current tracer implementations don't support external parent context
    // from SpanContext, but we still extract it for potential future use or
    // for recording as attributes
    const extractedContext = extractContext
      ? (() => {
          const headers: Record<string, string | undefined> = {};
          context.req.raw.headers.forEach((value, key) => {
            headers[key] = value;
          });
          return extractTraceContext(headers);
        })()
      : undefined;

    // Compute span name and initial attributes
    const name = spanName(context);
    const customAttributes = attributes ? attributes(context) : {};

    // Build attributes, including extracted trace context if available
    const spanAttributes: Record<string, string | number> = {
      // HTTP semantic conventions
      "http.method": context.req.method,
      "http.url": context.req.url,
      "http.target": context.req.path,
      ...customAttributes,
    };

    // If we extracted a parent context, record it as attributes
    // (since current tracer API doesn't support external parent context)
    if (extractedContext) {
      spanAttributes["http.request.traceparent.trace_id"] = extractedContext.traceId;
      spanAttributes["http.request.traceparent.span_id"] = extractedContext.spanId;
      spanAttributes["http.request.traceparent.trace_flags"] = extractedContext.traceFlags;
    }

    // Start server span with HTTP semantic attributes
    // Note: Using root: true because HTTP server entry points are root spans
    // within this service's trace. If there's an active span from instrumentation,
    // the tracer will still use it as parent unless root: true
    const span = tracer.startSpan(name, {
      kind: "server",
      attributes: spanAttributes,
      root: true, // HTTP server spans are root spans for this service
    });

    let handlerError: unknown;

    try {
      // Execute downstream handlers
      await next();

      // Record response status code
      span.setAttribute("http.status_code", context.res.status);

      // Set error status for 5xx responses
      if (context.res.status >= 500) {
        span.setStatus("error");
      }
    } catch (error) {
      // Record the exception and set error status
      handlerError = error;

      if (error instanceof Error) {
        span.recordException(error);
      } else {
        span.recordException(String(error));
      }
    } finally {
      // Always end the span
      span.end();

      // Inject trace context into response headers if enabled
      if (injectContext) {
        const spanContext = span.context;
        const responseHeaders: Record<string, string> = {};
        injectTraceContext(spanContext, responseHeaders);

        // Set headers on Hono response
        for (const [key, value] of Object.entries(responseHeaders)) {
          context.header(key, value);
        }
      }
    }

    // Re-throw handler error after span is ended and headers are set
    if (handlerError !== undefined) {
      throw handlerError;
    }
  };

  return middleware;
}
