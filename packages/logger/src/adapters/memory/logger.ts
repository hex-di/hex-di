/**
 * Memory logger implementation for testing and debugging.
 *
 * Stores all log entries in memory for test assertions.
 *
 * @packageDocumentation
 */

import type { Logger } from "../../ports/logger.js";
import type { LogLevel } from "../../types/log-level.js";
import type { LogEntry, LogContext } from "../../types/log-entry.js";
import { shouldLog } from "../../types/log-level.js";
import { mergeContext } from "../../utils/context.js";

/**
 * Extended Logger interface with testing methods.
 */
export interface MemoryLogger extends Logger {
  /** Get all collected log entries. */
  getEntries(): ReadonlyArray<LogEntry>;
  /** Get entries filtered by level. */
  getEntriesByLevel(level: LogLevel): ReadonlyArray<LogEntry>;
  /** Clear all collected entries. */
  clear(): void;
  /** Find an entry matching a predicate. */
  findEntry(predicate: (entry: LogEntry) => boolean): LogEntry | undefined;
}

/**
 * Parses the overloaded error/fatal method arguments.
 *
 * Supports:
 *   error(message, annotations?)
 *   error(message, error, annotations?)
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
 * Internal memory logger implementation.
 */
class MemoryLoggerImpl implements MemoryLogger {
  private readonly _entries: LogEntry[];
  private readonly _context: LogContext;
  private readonly _baseAnnotations: Record<string, unknown>;
  private readonly _minLevel: LogLevel;

  constructor(
    entries: LogEntry[],
    context: LogContext = {},
    baseAnnotations: Record<string, unknown> = {},
    minLevel: LogLevel = "trace"
  ) {
    this._entries = entries;
    this._context = context;
    this._baseAnnotations = baseAnnotations;
    this._minLevel = minLevel;
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
    return new MemoryLoggerImpl(
      this._entries,
      mergeContext(this._context, context),
      this._baseAnnotations,
      this._minLevel
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
    return new MemoryLoggerImpl(this._entries, this._context, merged, this._minLevel);
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

  getEntries(): ReadonlyArray<LogEntry> {
    return [...this._entries];
  }

  getEntriesByLevel(level: LogLevel): ReadonlyArray<LogEntry> {
    return this._entries.filter(e => e.level === level);
  }

  clear(): void {
    this._entries.length = 0;
  }

  findEntry(predicate: (entry: LogEntry) => boolean): LogEntry | undefined {
    return this._entries.find(predicate);
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
      message,
      timestamp: Date.now(),
      context: this._context,
      annotations: mergedAnnotations,
      error,
    };

    this._entries.push(entry);
  }
}

/**
 * Creates a new MemoryLogger instance.
 *
 * Convenience factory for creating memory loggers in tests.
 *
 * @param minLevel - Minimum log level (default: "trace")
 * @returns A new MemoryLogger instance
 */
export function createMemoryLogger(minLevel: LogLevel = "trace"): MemoryLogger {
  return new MemoryLoggerImpl([], {}, {}, minLevel);
}
