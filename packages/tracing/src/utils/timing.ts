/**
 * High-resolution timing utilities for span duration tracking.
 *
 * Provides millisecond timestamps with microsecond precision when available.
 * Falls back to Date.now() in environments without performance API.
 *
 * @packageDocumentation
 */

/** Shape of a performance-like object with timeOrigin and now(). */
interface PerformanceLike {
  timeOrigin: number;
  now: () => number;
}

/**
 * Check if value has the shape of a Performance API object.
 *
 * @param value - Value to check
 * @returns true if value has timeOrigin (number) and now (function)
 */
function isPerformanceLike(value: unknown): value is PerformanceLike {
  if (!value || typeof value !== "object") {
    return false;
  }
  if (!("timeOrigin" in value) || !("now" in value)) {
    return false;
  }
  // After 'in' narrowing, TypeScript knows these properties exist
  return typeof value.timeOrigin === "number" && typeof value.now === "function";
}

/**
 * Get high-resolution timestamp in milliseconds since Unix epoch.
 *
 * Returns timestamps with microsecond precision when performance API is available,
 * falls back to millisecond precision otherwise.
 *
 * **Precision levels:**
 * - With performance API: ~1 microsecond (0.001ms)
 * - Without performance API: ~1 millisecond
 *
 * **Use cases:**
 * - Span start/end times
 * - Event timestamps
 * - Duration measurements
 *
 * **Example:**
 * ```typescript
 * const startTime = getHighResTimestamp();
 * // ... operation ...
 * const endTime = getHighResTimestamp();
 * const duration = endTime - startTime; // milliseconds with microsecond precision
 * ```
 *
 * @returns Milliseconds since Unix epoch with microsecond precision when available
 * @public
 */
export function getHighResTimestamp(): number {
  // Try performance API (browser, Node.js 16+)
  if (typeof globalThis !== "undefined" && "performance" in globalThis) {
    const maybeGlobal: unknown = globalThis;
    if (maybeGlobal && typeof maybeGlobal === "object" && "performance" in maybeGlobal) {
      const perf: unknown = maybeGlobal.performance;
      if (isPerformanceLike(perf)) {
        return perf.timeOrigin + perf.now();
      }
    }
  }

  // Fallback to Date.now() (millisecond precision)
  return Date.now();
}

/**
 * Format duration in human-readable format.
 *
 * Automatically selects appropriate unit based on magnitude:
 * - Less than 1000ms: displays as milliseconds
 * - 1000ms or more: displays as seconds
 *
 * **Examples:**
 * ```typescript
 * formatDuration(12.345)   // '12.3ms'
 * formatDuration(156.789)  // '156.8ms'
 * formatDuration(1234.567) // '1.2s'
 * formatDuration(5678.901) // '5.7s'
 * ```
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string
 * @public
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(1)}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}
