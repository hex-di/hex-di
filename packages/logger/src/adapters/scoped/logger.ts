/**
 * Handler-backed Logger implementation.
 *
 * Delegates all log entry processing to a LogHandler, enabling
 * flexible log routing through the handler abstraction.
 *
 * @packageDocumentation
 */

import type { Logger } from "../../ports/logger.js";
import type { LogHandler } from "../../ports/log-handler.js";
import type { LogLevel } from "../../types/log-level.js";
import type { LogEntry, LogContext } from "../../types/log-entry.js";
import { shouldLog } from "../../types/log-level.js";
import { mergeContext } from "../../utils/context.js";

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
 * Internal handler-backed logger implementation.
 */
class HandlerLoggerImpl implements Logger {
  private readonly _handler: LogHandler;
  private readonly _context: LogContext;
  private readonly _baseAnnotations: Record<string, unknown>;
  private readonly _minLevel: LogLevel;

  constructor(
    handler: LogHandler,
    context: LogContext = {},
    baseAnnotations: Record<string, unknown> = {},
    minLevel: LogLevel = "trace"
  ) {
    this._handler = handler;
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
    return new HandlerLoggerImpl(
      this._handler,
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
    return new HandlerLoggerImpl(this._handler, this._context, merged, this._minLevel);
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
      message,
      timestamp: Date.now(),
      context: this._context,
      annotations: mergedAnnotations,
      error,
    };

    this._handler.handle(entry);
  }
}

/**
 * Creates a new handler-backed Logger instance.
 *
 * The logger delegates all log entry processing to the provided LogHandler,
 * enabling flexible routing to any backend.
 *
 * @param handler - The LogHandler to delegate entries to
 * @param options - Optional configuration for level, context, and annotations
 * @returns A new Logger instance backed by the handler
 */
export function createHandlerLogger(
  handler: LogHandler,
  options?: {
    level?: LogLevel;
    context?: LogContext;
    annotations?: Record<string, unknown>;
  }
): Logger {
  return new HandlerLoggerImpl(
    handler,
    options?.context ?? {},
    options?.annotations ?? {},
    options?.level ?? "trace"
  );
}
