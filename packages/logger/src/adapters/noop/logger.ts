/**
 * NoOp logger implementation with zero runtime overhead.
 *
 * All methods are no-ops, ensuring zero performance impact
 * when logging is disabled.
 *
 * @packageDocumentation
 */

import type { Logger } from "../../ports/logger.js";
import type { LogLevel } from "../../types/log-level.js";
import type { LogContext } from "../../types/log-entry.js";

/**
 * Empty context object returned by the no-op logger.
 */
const EMPTY_CONTEXT: LogContext = Object.freeze({});

/**
 * Singleton no-op logger that does nothing.
 * Zero runtime overhead when logging is disabled.
 */
export const NOOP_LOGGER: Logger = Object.freeze({
  trace(_message: string, _annotations?: Record<string, unknown>): void {
    // No-op
  },

  debug(_message: string, _annotations?: Record<string, unknown>): void {
    // No-op
  },

  info(_message: string, _annotations?: Record<string, unknown>): void {
    // No-op
  },

  warn(_message: string, _annotations?: Record<string, unknown>): void {
    // No-op
  },

  error(
    _message: string,
    _errorOrAnnotations?: Error | Record<string, unknown>,
    _annotations?: Record<string, unknown>
  ): void {
    // No-op
  },

  fatal(
    _message: string,
    _errorOrAnnotations?: Error | Record<string, unknown>,
    _annotations?: Record<string, unknown>
  ): void {
    // No-op
  },

  child(_context: Partial<LogContext>): Logger {
    return NOOP_LOGGER;
  },

  withAnnotations(_annotations: Record<string, unknown>): Logger {
    return NOOP_LOGGER;
  },

  isLevelEnabled(_level: LogLevel): boolean {
    return false;
  },

  getContext(): LogContext {
    return EMPTY_CONTEXT;
  },

  time<T>(_name: string, fn: () => T): T {
    return fn();
  },

  async timeAsync<T>(_name: string, fn: () => Promise<T>): Promise<T> {
    return fn();
  },
});
