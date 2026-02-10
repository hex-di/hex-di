/**
 * Logger Port - Primary interface for structured logging.
 *
 * The LoggerPort follows hexagonal architecture patterns, defining the
 * contract for structured logging without coupling to specific implementations.
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";
import type { LogLevel } from "../types/log-level.js";
import type { LogContext } from "../types/log-entry.js";

/**
 * Logger interface for structured logging.
 *
 * Provides level-based logging methods with support for annotations,
 * child loggers, and timed operations.
 */
export interface Logger {
  /**
   * Log at trace level.
   */
  trace(message: string, annotations?: Record<string, unknown>): void;

  /**
   * Log at debug level.
   */
  debug(message: string, annotations?: Record<string, unknown>): void;

  /**
   * Log at info level.
   */
  info(message: string, annotations?: Record<string, unknown>): void;

  /**
   * Log at warn level.
   */
  warn(message: string, annotations?: Record<string, unknown>): void;

  /**
   * Log at error level.
   */
  error(message: string, annotations?: Record<string, unknown>): void;
  error(message: string, error: Error, annotations?: Record<string, unknown>): void;

  /**
   * Log at fatal level.
   */
  fatal(message: string, annotations?: Record<string, unknown>): void;
  fatal(message: string, error: Error, annotations?: Record<string, unknown>): void;

  /**
   * Create a child logger with additional context.
   */
  child(context: Partial<LogContext>): Logger;

  /**
   * Create a child logger with annotations.
   */
  withAnnotations(annotations: Record<string, unknown>): Logger;

  /**
   * Check if a level is enabled.
   */
  isLevelEnabled(level: LogLevel): boolean;

  /**
   * Get current log context.
   */
  getContext(): LogContext;

  /**
   * Time a synchronous operation and log duration.
   */
  time<T>(name: string, fn: () => T): T;

  /**
   * Time an asynchronous operation and log duration.
   */
  timeAsync<T>(name: string, fn: () => Promise<T>): Promise<T>;
}

/**
 * Logger port for DI registration.
 */
export const LoggerPort = port<Logger>()({
  name: "Logger",
  direction: "outbound",
  description: "Structured logging service for context-aware log output",
  category: "infrastructure",
  tags: ["logging", "observability"],
});
