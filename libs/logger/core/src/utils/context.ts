/**
 * Context utilities for merging and extracting log context.
 *
 * @packageDocumentation
 */

import type { LogContext } from "../types/log-entry.js";

/**
 * Standard header names for context extraction.
 */
export const CORRELATION_ID_HEADER = "x-correlation-id";
export const REQUEST_ID_HEADER = "x-request-id";

/**
 * Merge base context with override values.
 *
 * @param base - The base log context
 * @param override - Values to merge into the base
 * @returns A new merged LogContext
 */
export function mergeContext(base: LogContext, override: Partial<LogContext>): LogContext {
  const result: Record<string, unknown> = {};
  for (const key in base) {
    result[key] = base[key];
  }
  for (const key in override) {
    const value = override[key];
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Maximum allowed length for header values used in log context.
 */
const MAX_HEADER_LENGTH = 256;

/**
 * Pattern for safe header characters (RFC 7230 token + common ID chars).
 */
const HEADER_SAFE_PATTERN = /^[a-zA-Z0-9\-_.~]+$/;

/**
 * Sanitizes a header value for safe use in log context.
 *
 * @param value - The raw header value
 * @returns The sanitized value, truncated and cleaned if necessary
 */
function sanitizeHeaderValue(value: string): string {
  if (value.length <= MAX_HEADER_LENGTH && HEADER_SAFE_PATTERN.test(value)) {
    return value;
  }
  return value.slice(0, MAX_HEADER_LENGTH).replace(/[^a-zA-Z0-9\-_.~]/g, "_");
}

/**
 * Extract log context from request headers.
 *
 * Header values are validated and sanitized:
 * - Maximum length of 256 characters
 * - Unsafe characters replaced with underscores
 *
 * @param headers - Request headers
 * @returns Extracted partial log context
 */
export function extractContextFromHeaders(
  headers: Record<string, string | undefined>
): Partial<LogContext> {
  const context: Record<string, unknown> = {};

  const correlationId = headers[CORRELATION_ID_HEADER];
  if (correlationId) {
    context.correlationId = sanitizeHeaderValue(correlationId);
  }

  const requestId = headers[REQUEST_ID_HEADER];
  if (requestId) {
    context.requestId = sanitizeHeaderValue(requestId);
  }

  return context;
}
