/**
 * Log formatting utilities.
 *
 * Provides built-in formatters for log entries: JSON, pretty, and minimal.
 *
 * @packageDocumentation
 */

import type { LogEntry } from "../types/log-entry.js";
import type { LogFormatter, FormatterType } from "../ports/log-formatter.js";

/**
 * JSON formatter - outputs log entries as single-line JSON strings.
 */
const jsonFormatter: LogFormatter = {
  format(entry: LogEntry): string {
    const obj: Record<string, unknown> = {
      level: entry.level,
      message: entry.message,
      timestamp: new Date(entry.timestamp).toISOString(),
    };

    if (Object.keys(entry.context).length > 0) {
      Object.assign(obj, entry.context);
    }

    if (Object.keys(entry.annotations).length > 0) {
      Object.assign(obj, entry.annotations);
    }

    if (entry.error) {
      obj.error = {
        name: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack,
      };
    }

    if (entry.spans && entry.spans.length > 0) {
      obj.traceId = entry.spans[0].traceId;
      obj.spanId = entry.spans[0].spanId;
    }

    return JSON.stringify(obj);
  },
};

/**
 * Level display labels for pretty formatting.
 */
const LEVEL_LABELS: Readonly<Record<string, string>> = {
  trace: "TRACE",
  debug: "DEBUG",
  info: " INFO",
  warn: " WARN",
  error: "ERROR",
  fatal: "FATAL",
};

/**
 * Pretty formatter - outputs human-readable log lines for development.
 */
const prettyFormatter: LogFormatter = {
  format(entry: LogEntry): string {
    const time = new Date(entry.timestamp).toISOString();
    const level = LEVEL_LABELS[entry.level] ?? entry.level.toUpperCase();
    let line = `${time} [${level}] ${entry.message}`;

    const annotations = entry.annotations;
    if (Object.keys(annotations).length > 0) {
      line += ` ${JSON.stringify(annotations)}`;
    }

    if (entry.error) {
      line += ` error=${entry.error.message}`;
    }

    if (entry.spans && entry.spans.length > 0) {
      line += ` traceId=${entry.spans[0].traceId}`;
    }

    return line;
  },
};

/**
 * Minimal formatter - outputs only level and message.
 */
const minimalFormatter: LogFormatter = {
  format(entry: LogEntry): string {
    const level = LEVEL_LABELS[entry.level] ?? entry.level.toUpperCase();
    return `[${level}] ${entry.message}`;
  },
};

/**
 * Get a built-in formatter by type name.
 *
 * @param type - The formatter type
 * @returns The corresponding LogFormatter
 */
export function getFormatter(type: FormatterType): LogFormatter {
  switch (type) {
    case "json":
      return jsonFormatter;
    case "pretty":
      return prettyFormatter;
    case "minimal":
      return minimalFormatter;
  }
}
