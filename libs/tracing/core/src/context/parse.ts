/**
 * W3C Trace Context header parsing and formatting utilities.
 *
 * Implements the W3C Trace Context specification for traceparent headers:
 * https://www.w3.org/TR/trace-context/#traceparent-header
 *
 * Format: `00-{traceId}-{spanId}-{flags}`
 * - version: 2 hex chars, must be '00' for this implementation
 * - traceId: 32 hex chars (16 bytes), not all zeros
 * - spanId: 16 hex chars (8 bytes), not all zeros
 * - flags: 2 hex chars (1 byte)
 *
 * @packageDocumentation
 */

import type { SpanContext } from "../types/span.js";

const TRACE_ID_HEX_LENGTH = 32;
const SPAN_ID_HEX_LENGTH = 16;
const HEX_REGEX = /^[0-9a-f]+$/;
const ALL_ZEROS_TRACE_ID = "0".repeat(TRACE_ID_HEX_LENGTH);
const ALL_ZEROS_SPAN_ID = "0".repeat(SPAN_ID_HEX_LENGTH);

/**
 * Validates a trace ID according to W3C specification.
 *
 * Requirements:
 * - Exactly 32 hexadecimal characters (16 bytes)
 * - Not all zeros
 *
 * @param id - The trace ID to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * ```typescript
 * isValidTraceId('4bf92f3577b34da6a3ce929d0e0e4736'); // true
 * isValidTraceId('00000000000000000000000000000000'); // false (all zeros)
 * isValidTraceId('invalid'); // false (wrong length)
 * ```
 */
export function isValidTraceId(id: string): boolean {
  return id.length === TRACE_ID_HEX_LENGTH && HEX_REGEX.test(id) && id !== ALL_ZEROS_TRACE_ID;
}

/**
 * Validates a span ID according to W3C specification.
 *
 * Requirements:
 * - Exactly 16 hexadecimal characters (8 bytes)
 * - Not all zeros
 *
 * @param id - The span ID to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * ```typescript
 * isValidSpanId('00f067aa0ba902b7'); // true
 * isValidSpanId('0000000000000000'); // false (all zeros)
 * isValidSpanId('invalid'); // false (wrong length)
 * ```
 */
export function isValidSpanId(id: string): boolean {
  return id.length === SPAN_ID_HEX_LENGTH && HEX_REGEX.test(id) && id !== ALL_ZEROS_SPAN_ID;
}

/**
 * Parses a W3C traceparent header into a SpanContext.
 *
 * Format: `00-{traceId}-{spanId}-{flags}`
 *
 * @param header - The traceparent header value to parse
 * @returns SpanContext if valid, undefined if invalid or malformed
 *
 * @see https://www.w3.org/TR/trace-context/#traceparent-header
 *
 * @example
 * ```typescript
 * const context = parseTraceparent('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');
 * // {
 * //   traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
 * //   spanId: '00f067aa0ba902b7',
 * //   traceFlags: 1
 * // }
 *
 * parseTraceparent('invalid-format'); // undefined
 * ```
 */
export function parseTraceparent(header: string): SpanContext | undefined {
  const parts = header.split("-");

  // Must have exactly 4 parts: version-traceId-spanId-flags
  if (parts.length !== 4) {
    return undefined;
  }

  const [version, traceId, spanId, flags] = parts;

  // Validate version is '00'
  if (version !== "00") {
    return undefined;
  }

  // Validate trace ID
  if (!isValidTraceId(traceId)) {
    return undefined;
  }

  // Validate span ID
  if (!isValidSpanId(spanId)) {
    return undefined;
  }

  // Validate flags: must be exactly 2 hex chars
  if (flags.length !== 2 || !HEX_REGEX.test(flags)) {
    return undefined;
  }

  // Parse flags from hex string to number
  const traceFlags = Number.parseInt(flags, 16);

  return {
    traceId,
    spanId,
    traceFlags,
  };
}

/**
 * Formats a SpanContext into a W3C traceparent header value.
 *
 * @param context - The span context to format
 * @returns Formatted traceparent header string
 *
 * @example
 * ```typescript
 * const header = formatTraceparent({
 *   traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
 *   spanId: '00f067aa0ba902b7',
 *   traceFlags: 1
 * });
 * // '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'
 * ```
 */
export function formatTraceparent(context: SpanContext): string {
  // Convert traceFlags number to 2-char hex string, padded with zero if needed
  const flags = context.traceFlags.toString(16).padStart(2, "0");
  return `00-${context.traceId}-${context.spanId}-${flags}`;
}
