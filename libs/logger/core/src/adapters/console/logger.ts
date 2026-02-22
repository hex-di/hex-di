/**
 * Console logger implementation for development.
 *
 * Outputs formatted log entries to console with level-based methods
 * and optional colorization.
 *
 * @packageDocumentation
 */

import type { Logger } from "../../ports/logger.js";
import type { LogFormatter } from "../../ports/log-formatter.js";
import type { LogLevel } from "../../types/log-level.js";
import type { LogEntry, LogContext } from "../../types/log-entry.js";
import { shouldLog } from "../../types/log-level.js";
import { mergeContext } from "../../utils/context.js";
import { getFormatter } from "../../utils/formatting.js";
import { getConsole } from "../../utils/globals.js";
import { getStderr } from "../../utils/stderr.js";
import { sanitizeMessage } from "../../utils/sanitize.js";
import { sanitizeAnnotations } from "../../utils/validation.js";
import { nextSequence } from "../../utils/sequence.js";

/**
 * Console logger options.
 */
export interface ConsoleLoggerOptions {
  readonly level?: LogLevel;
  readonly formatter?: LogFormatter;
  readonly formatterType?: "json" | "pretty" | "minimal";
}

/**
 * Parses the overloaded error/fatal method arguments.
 */
function parseErrorArgs(
  errorOrAnnotations: Error | Record<string, unknown> | undefined,
  annotations: Record<string, unknown> | undefined
): { error?: Error; annotations: Record<string, unknown> } {
  if (errorOrAnnotations instanceof Error) {
    return { error: errorOrAnnotations, annotations: annotations ?? {} };
  }
  return { error: undefined, annotations: errorOrAnnotations ?? {} };
}

/**
 * Console-level method mapping for log levels.
 */
const CONSOLE_METHOD: Readonly<Record<LogLevel, "log" | "debug" | "info" | "warn" | "error">> = {
  trace: "debug",
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
  fatal: "error",
};

/**
 * Console logger implementation.
 */
class ConsoleLoggerImpl implements Logger {
  private readonly _minLevel: LogLevel;
  private readonly _context: LogContext;
  private readonly _baseAnnotations: Record<string, unknown>;
  private readonly _formatter: LogFormatter;
  private _droppedCount = 0;

  constructor(
    minLevel: LogLevel,
    context: LogContext,
    baseAnnotations: Record<string, unknown>,
    formatter: LogFormatter
  ) {
    this._minLevel = minLevel;
    this._context = context;
    this._baseAnnotations = baseAnnotations;
    this._formatter = formatter;
  }

  trace(message: string, annotations?: Record<string, unknown>): void {
    this._log("trace", message, undefined, annotations);
  }

  debug(message: string, annotations?: Record<string, unknown>): void {
    this._log("debug", message, undefined, annotations);
  }

  info(message: string, annotations?: Record<string, unknown>): void {
    this._log("info", message, undefined, annotations);
  }

  warn(message: string, annotations?: Record<string, unknown>): void {
    this._log("warn", message, undefined, annotations);
  }

  error(
    message: string,
    errorOrAnnotations?: Error | Record<string, unknown>,
    annotations?: Record<string, unknown>
  ): void {
    const parsed = parseErrorArgs(errorOrAnnotations, annotations);
    this._log("error", message, parsed.error, parsed.annotations);
  }

  fatal(
    message: string,
    errorOrAnnotations?: Error | Record<string, unknown>,
    annotations?: Record<string, unknown>
  ): void {
    const parsed = parseErrorArgs(errorOrAnnotations, annotations);
    this._log("fatal", message, parsed.error, parsed.annotations);
  }

  child(context: Partial<LogContext>): Logger {
    return new ConsoleLoggerImpl(
      this._minLevel,
      mergeContext(this._context, context),
      this._baseAnnotations,
      this._formatter
    );
  }

  withAnnotations(annotations: Record<string, unknown>): Logger {
    const merged: Record<string, unknown> = {};
    for (const key in this._baseAnnotations) {
      merged[key] = this._baseAnnotations[key];
    }
    for (const key in annotations) {
      merged[key] = annotations[key];
    }
    return new ConsoleLoggerImpl(this._minLevel, this._context, merged, this._formatter);
  }

  isLevelEnabled(level: LogLevel): boolean {
    return shouldLog(level, this._minLevel);
  }

  getContext(): LogContext {
    return this._context;
  }

  time<T>(name: string, fn: () => T): T {
    const start = Date.now();
    try {
      const result = fn();
      const duration = Date.now() - start;
      this._log("debug", `${name} completed`, undefined, { duration });
      return result;
    } catch (err) {
      const duration = Date.now() - start;
      this._log("error", `${name} failed`, err instanceof Error ? err : undefined, { duration });
      throw err;
    }
  }

  async timeAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this._log("debug", `${name} completed`, undefined, { duration });
      return result;
    } catch (err) {
      const duration = Date.now() - start;
      this._log("error", `${name} failed`, err instanceof Error ? err : undefined, { duration });
      throw err;
    }
  }

  private _log(
    level: LogLevel,
    message: string,
    error: Error | undefined,
    annotations: Record<string, unknown> | undefined
  ): void {
    if (!shouldLog(level, this._minLevel)) {
      return;
    }

    const mergedAnnotations: Record<string, unknown> = {};
    for (const key in this._baseAnnotations) {
      mergedAnnotations[key] = this._baseAnnotations[key];
    }
    if (annotations) {
      for (const key in annotations) {
        mergedAnnotations[key] = annotations[key];
      }
    }

    const entry: LogEntry = {
      level,
      message: sanitizeMessage(message),
      timestamp: Date.now(),
      sequence: nextSequence(),
      context: this._context,
      annotations: sanitizeAnnotations(mergedAnnotations),
      error,
    };

    let formatted: string;
    try {
      formatted = this._formatter.format(entry);
    } catch (formatError: unknown) {
      this._droppedCount++;
      const fallback = getStderr();
      if (fallback) {
        const msg = formatError instanceof Error ? formatError.message : String(formatError);
        fallback(
          `[LOGGER FORMAT ERROR] Failed to format log entry: ${msg}. ` +
            `Original entry: level=${entry.level} message=${entry.message}`
        );
      }
      return;
    }

    const method = CONSOLE_METHOD[level];
    const cons = getConsole();
    if (cons) {
      try {
        cons[method](formatted);
      } catch {
        this._droppedCount++;
      }
    } else {
      this._droppedCount++;
      if (this._droppedCount === 1) {
        const fallback = getStderr();
        if (fallback) {
          fallback("[LOGGER WARNING] Console unavailable. Log entries will be dropped.");
        }
      }
    }
  }
}

/**
 * Creates a new ConsoleLogger instance.
 *
 * @param options - Console logger configuration
 * @returns A new ConsoleLogger instance
 */
export function createConsoleLogger(options: ConsoleLoggerOptions = {}): Logger {
  const formatter = options.formatter ?? getFormatter(options.formatterType ?? "pretty");
  return new ConsoleLoggerImpl(options.level ?? "info", {}, {}, formatter);
}
