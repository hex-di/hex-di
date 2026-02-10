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
 * Extract log context from request headers.
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
    context.correlationId = correlationId;
  }

  const requestId = headers[REQUEST_ID_HEADER];
  if (requestId) {
    context.requestId = requestId;
  }

  return context;
}
