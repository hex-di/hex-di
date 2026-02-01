/**
 * Correlation ID utilities for tracing and debugging.
 *
 * @packageDocumentation
 */

/**
 * Generates a unique correlation ID for tracing purposes.
 *
 * The ID format is a compact alphanumeric string that's unique enough
 * for debugging and tracing within a session.
 *
 * @returns A unique correlation ID string
 *
 * @example
 * ```typescript
 * const id = generateCorrelationId();
 * // e.g., "abc12xyz"
 * ```
 */
export function generateCorrelationId(): string {
  return Math.random().toString(36).substring(2, 15);
}
