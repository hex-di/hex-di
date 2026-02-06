/**
 * Output formatting utilities for ConsoleTracer.
 *
 * Provides colorized, timestamped console output with span hierarchy visualization.
 *
 * @packageDocumentation
 */

import type { SpanData } from "../../types/span.js";

/**
 * Configuration options for console tracer output formatting.
 *
 * Controls colorization, timestamps, filtering, and indentation of trace output.
 *
 * @public
 */
export interface ConsoleTracerOptions {
  /**
   * Enable ANSI color codes in output.
   *
   * Defaults to auto-detect from process.stdout.isTTY if available,
   * otherwise false (for browser console compatibility).
   */
  readonly colorize?: boolean;

  /**
   * Include timestamps in span output.
   *
   * @defaultValue true
   */
  readonly includeTimestamps?: boolean;

  /**
   * Minimum span duration in milliseconds to display.
   *
   * Spans shorter than this threshold are filtered from output.
   * Useful for reducing noise from very fast operations.
   *
   * @defaultValue 0 (show all spans)
   */
  readonly minDurationMs?: number;

  /**
   * Indent child spans to show hierarchy.
   *
   * @defaultValue true
   */
  readonly indent?: boolean;
}

/**
 * ANSI color codes for terminal output.
 */
const COLORS = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
} as const;

type ColorName = keyof typeof COLORS;

/**
 * Apply ANSI color code to text if colorization is enabled.
 *
 * @param text - Text to colorize
 * @param color - Color name from ANSI palette
 * @param enabled - Whether colorization is enabled
 * @returns Colorized text if enabled, plain text otherwise
 *
 * @internal
 */
export function colorize(text: string, color: ColorName, enabled: boolean): string {
  if (!enabled) return text;
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

/**
 * Format duration in milliseconds as human-readable string.
 *
 * @param durationMs - Duration in milliseconds
 * @returns Formatted duration (e.g., "12.3ms", "1.5s")
 *
 * @example
 * ```typescript
 * formatDuration(0.123)  // "0.1ms"
 * formatDuration(12.345) // "12.3ms"
 * formatDuration(1234)   // "1.2s"
 * ```
 *
 * @internal
 */
export function formatDuration(durationMs: number): string {
  if (durationMs >= 1000) {
    return `${(durationMs / 1000).toFixed(1)}s`;
  }
  return `${durationMs.toFixed(1)}ms`;
}

/**
 * Format timestamp as ISO string.
 *
 * @param timestampMs - Unix timestamp in milliseconds
 * @returns ISO 8601 formatted timestamp
 *
 * @internal
 */
function formatTimestamp(timestampMs: number): string {
  return new Date(timestampMs).toISOString();
}

/**
 * Format span data as console output string.
 *
 * Returns undefined if span should be filtered (duration < minDurationMs).
 *
 * @param spanData - Completed span data
 * @param depth - Nesting depth for indentation (0 = root)
 * @param options - Formatting options
 * @returns Formatted output string, or undefined if filtered
 *
 * @example
 * ```typescript
 * const output = formatSpan(spanData, 0, {
 *   colorize: true,
 *   includeTimestamps: true,
 *   minDurationMs: 1,
 *   indent: true,
 * });
 *
 * if (output) {
 *   console.log(output);
 * }
 * ```
 *
 * Output format:
 * ```
 * [TRACE] operation-name (12.3ms) ✓ 2024-01-15T10:30:45.123Z
 *   └─ [TRACE] child-operation (5.2ms) ✗ Error: Something failed
 * ```
 *
 * @public
 */
export function formatSpan(
  spanData: SpanData,
  depth: number,
  options: ConsoleTracerOptions
): string | undefined {
  const {
    colorize: shouldColorize = false,
    includeTimestamps = true,
    minDurationMs = 0,
    indent = true,
  } = options;

  const durationMs = spanData.endTime - spanData.startTime;

  // Filter out spans shorter than minimum duration
  if (durationMs < minDurationMs) {
    return undefined;
  }

  // Build indentation prefix
  const indentStr = indent && depth > 0 ? "  ".repeat(depth) + "└─ " : "";

  // Format operation name with color
  const nameStr = colorize(spanData.name, "cyan", shouldColorize);

  // Format duration with color
  const durationStr = colorize(`(${formatDuration(durationMs)})`, "yellow", shouldColorize);

  // Format status indicator
  let statusStr: string;
  if (spanData.status === "error") {
    statusStr = colorize("✗", "red", shouldColorize);
  } else if (spanData.status === "ok") {
    statusStr = colorize("✓", "green", shouldColorize);
  } else {
    // unset status
    statusStr = colorize("○", "gray", shouldColorize);
  }

  // Format timestamp
  const timestampStr = includeTimestamps
    ? colorize(formatTimestamp(spanData.endTime), "gray", shouldColorize)
    : "";

  // Build base output line
  let output = `${indentStr}[TRACE] ${nameStr} ${durationStr} ${statusStr}`;

  if (timestampStr) {
    output += ` ${timestampStr}`;
  }

  // Add error message if present
  if (spanData.status === "error") {
    const errorAttr = spanData.attributes["error.message"];
    if (typeof errorAttr === "string") {
      const errorMsg = colorize(errorAttr, "red", shouldColorize);
      output += `\n${indentStr}   ${errorMsg}`;
    }
  }

  // Add attributes if present (excluding error.* attributes)
  const attrs = Object.entries(spanData.attributes).filter(([key]) => !key.startsWith("error."));
  if (attrs.length > 0) {
    const attrsStr = attrs
      .map(([key, value]) => {
        const valueStr = Array.isArray(value) ? JSON.stringify(value) : String(value);
        return `${key}=${valueStr}`;
      })
      .join(", ");
    const formattedAttrs = colorize(`{${attrsStr}}`, "gray", shouldColorize);
    output += `\n${indentStr}   ${formattedAttrs}`;
  }

  return output;
}
