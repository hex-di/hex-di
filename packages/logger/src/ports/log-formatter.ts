/**
 * Log Formatter Port - Interface for log entry formatting.
 *
 * Formatters transform structured log entries into strings
 * for output to console, files, or other text-based sinks.
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";
import type { LogEntry } from "../types/log-entry.js";

/**
 * Formatter for log entries.
 */
export interface LogFormatter {
  /**
   * Format a log entry to string.
   */
  format(entry: LogEntry): string;
}

/**
 * Log formatter port for DI registration.
 */
export const LogFormatterPort = port<LogFormatter>()({
  name: "LogFormatter",
  direction: "outbound",
  description: "Log entry formatter for text-based output",
  category: "infrastructure",
  tags: ["logging", "observability"],
});

/**
 * Built-in formatter types.
 */
export type FormatterType = "json" | "pretty" | "minimal";
