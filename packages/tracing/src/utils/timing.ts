/**
 * High-resolution timing utilities for span duration tracking.
 *
 * Provides millisecond timestamps with microsecond precision when available.
 * Falls back to Date.now() in environments without performance API.
 *
 * @packageDocumentation
 */

import { getPerformance } from "./globals.js";

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
  const perf = getPerformance();
  if (perf) {
    return perf.timeOrigin + perf.now();
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
