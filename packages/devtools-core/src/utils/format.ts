/**
 * Formatting utilities for DevTools.
 *
 * @packageDocumentation
 */

// =============================================================================
// Duration Formatting
// =============================================================================

/**
 * Format a duration value for display.
 *
 * The formatting adjusts based on the magnitude:
 * - Sub-millisecond: Shows microseconds (e.g., "500μs")
 * - Sub-10ms: Shows one decimal place (e.g., "2.5ms")
 * - Sub-second: Shows milliseconds with no decimals (e.g., "123ms")
 * - Seconds or more: Shows seconds with 2 decimals (e.g., "1.23s")
 *
 * @param ms - Duration in milliseconds
 * @returns Human-readable duration string
 *
 * @example
 * ```typescript
 * formatDuration(0.5);     // "500μs"
 * formatDuration(2.5);     // "2.5ms"
 * formatDuration(123);     // "123ms"
 * formatDuration(1234);    // "1.23s"
 * ```
 */
export function formatDuration(ms: number): string {
  if (ms < 0.1) {
    // Show very small durations in microseconds
    return `${Math.round(ms * 1000)}μs`;
  }
  if (ms < 1) {
    // Show sub-millisecond with microsecond precision
    return `${(ms * 1000).toFixed(0)}μs`;
  }
  if (ms < 10) {
    // Show with one decimal place for precision
    return `${ms.toFixed(1)}ms`;
  }
  if (ms < 1000) {
    // Show whole milliseconds
    return `${Math.round(ms)}ms`;
  }
  // Show in seconds with 2 decimal places
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format a duration value with minimal precision.
 *
 * Similar to `formatDuration` but optimized for compact display.
 *
 * @param ms - Duration in milliseconds
 * @returns Compact duration string
 *
 * @example
 * ```typescript
 * formatDurationCompact(0.5);   // "<1ms"
 * formatDurationCompact(123);   // "123ms"
 * formatDurationCompact(1500);  // "1.5s"
 * ```
 */
export function formatDurationCompact(ms: number): string {
  if (ms < 1) {
    return "<1ms";
  }
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

// =============================================================================
// Session Duration Formatting
// =============================================================================

/**
 * Format a session duration for display.
 *
 * Handles longer durations with appropriate units:
 * - Sub-second: Shows milliseconds
 * - Sub-minute: Shows seconds with one decimal
 * - Minutes or more: Shows minutes and seconds
 *
 * @param ms - Duration in milliseconds
 * @returns Human-readable session duration string
 *
 * @example
 * ```typescript
 * formatSessionDuration(500);      // "500ms"
 * formatSessionDuration(2500);     // "2.5s"
 * formatSessionDuration(90000);    // "1m 30s"
 * ```
 */
export function formatSessionDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

// =============================================================================
// Percentage Formatting
// =============================================================================

/**
 * Format a ratio as a percentage.
 *
 * @param value - Numerator value
 * @param total - Denominator value
 * @returns Percentage string (e.g., "75.0%")
 *
 * @example
 * ```typescript
 * formatPercent(3, 4);   // "75.0%"
 * formatPercent(0, 0);   // "0%"
 * ```
 */
export function formatPercent(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

/**
 * Format a ratio as a compact percentage.
 *
 * @param ratio - Ratio value (0 to 1)
 * @returns Percentage string (e.g., "75%")
 *
 * @example
 * ```typescript
 * formatPercentRatio(0.75);   // "75%"
 * formatPercentRatio(0.333);  // "33%"
 * ```
 */
export function formatPercentRatio(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

// =============================================================================
// Timestamp Formatting
// =============================================================================

/**
 * Format a Unix timestamp as a human-readable date/time string.
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Locale-formatted date/time string
 *
 * @example
 * ```typescript
 * formatTimestamp(1702800000000);  // "12/17/2023, 12:00:00 PM"
 * ```
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * Format a Unix timestamp as a time-only string.
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Locale-formatted time string
 *
 * @example
 * ```typescript
 * formatTime(1702800000000);  // "12:00:00 PM"
 * ```
 */
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}
