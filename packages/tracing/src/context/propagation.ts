/**
 * W3C Trace Context propagation utilities for distributed tracing.
 *
 * Implements header extraction and injection for propagating trace context
 * across service boundaries via HTTP headers.
 *
 * Supports:
 * - `traceparent`: W3C Trace Context identifying current span
 * - `tracestate`: Vendor-specific opaque passthrough data
 *
 * @see https://www.w3.org/TR/trace-context/#trace-context-http-headers-format
 * @packageDocumentation
 */

import type { SpanContext } from "../types/span.js";
import { formatTraceparent, parseTraceparent } from "./parse.js";

/**
 * Case-insensitive header lookup helper.
 *
 * HTTP headers are case-insensitive per RFC 7230, so 'Traceparent',
 * 'traceparent', and 'TRACEPARENT' are all equivalent.
 *
 * @param headers - Headers object to search
 * @param name - Header name to find (case-insensitive)
 * @returns Header value if found, undefined otherwise
 */
function getHeaderCaseInsensitive(
  headers: Record<string, string | undefined>,
  name: string
): string | undefined {
  const lowerName = name.toLowerCase();

  for (const key in headers) {
    if (key.toLowerCase() === lowerName) {
      return headers[key];
    }
  }

  return undefined;
}

/**
 * Extract trace context from HTTP headers.
 *
 * Looks for W3C Trace Context headers:
 * - `traceparent`: Required, identifies current span in trace
 * - `tracestate`: Optional, vendor-specific passthrough data
 *
 * Header lookup is case-insensitive per HTTP spec.
 *
 * @param headers - HTTP request/response headers
 * @returns Parsed SpanContext if traceparent is valid, undefined otherwise
 *
 * @example
 * ```typescript
 * const headers = {
 *   'traceparent': '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
 *   'tracestate': 'vendor1=value1,vendor2=value2'
 * };
 *
 * const context = extractTraceContext(headers);
 * // {
 * //   traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
 * //   spanId: '00f067aa0ba902b7',
 * //   traceFlags: 1,
 * //   traceState: 'vendor1=value1,vendor2=value2'
 * // }
 * ```
 */
export function extractTraceContext(
  headers: Record<string, string | undefined>
): SpanContext | undefined {
  // Look for traceparent header (case-insensitive)
  const traceparent = getHeaderCaseInsensitive(headers, "traceparent");

  if (!traceparent) {
    return undefined;
  }

  // Parse traceparent header
  const context = parseTraceparent(traceparent);

  if (!context) {
    return undefined;
  }

  // Look for optional tracestate header (case-insensitive)
  const tracestate = getHeaderCaseInsensitive(headers, "tracestate");

  if (tracestate) {
    return {
      ...context,
      traceState: tracestate,
    };
  }

  return context;
}

/**
 * Inject trace context into HTTP headers.
 *
 * Adds W3C Trace Context headers:
 * - `traceparent`: Current span context formatted as W3C header
 * - `tracestate`: Vendor-specific data if present in context
 *
 * **Mutates** the headers object directly for performance.
 *
 * @param context - Span context to inject
 * @param headers - Headers object to mutate (adds traceparent/tracestate)
 *
 * @example
 * ```typescript
 * const context: SpanContext = {
 *   traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
 *   spanId: '00f067aa0ba902b7',
 *   traceFlags: 1,
 *   traceState: 'vendor1=value1'
 * };
 *
 * const headers: Record<string, string> = {};
 * injectTraceContext(context, headers);
 *
 * // headers now contains:
 * // {
 * //   traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
 * //   tracestate: 'vendor1=value1'
 * // }
 * ```
 */
export function injectTraceContext(context: SpanContext, headers: Record<string, string>): void {
  // Set traceparent header
  headers.traceparent = formatTraceparent(context);

  // Set tracestate header if present
  if (context.traceState) {
    headers.tracestate = context.traceState;
  }
}
