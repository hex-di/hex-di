/**
 * Log Handler Port - Interface for log entry processing.
 *
 * Log handlers receive structured log entries and route them
 * to the appropriate output (console, file, remote service, etc.).
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";
import type { LogEntry } from "../types/log-entry.js";

/**
 * Handler that processes log entries.
 */
export interface LogHandler {
  /**
   * Handle a log entry.
   *
   * **Error contract:** Implementations SHOULD NOT throw from this method.
   * If an error occurs during handling, implementations should either:
   * 1. Swallow the error and increment an internal counter (preferred)
   * 2. Throw the error (will be caught by logger and reported to stderr)
   *
   * Callers MUST wrap calls to handle() in try/catch.
   */
  handle(entry: LogEntry): void;

  /**
   * Flush pending log entries.
   *
   * **Contract:** Non-destructive and re-entrant. Handler remains
   * usable after flush() returns.
   */
  flush(): Promise<void>;

  /**
   * Shutdown handler and release resources.
   *
   * **Contract:** Terminal operation. May reject subsequent handle() calls.
   * Should flush before releasing resources.
   */
  shutdown(): Promise<void>;
}

/**
 * Log handler port for DI registration.
 */
export const LogHandlerPort = port<LogHandler>()({
  name: "LogHandler",
  direction: "outbound",
  description: "Log entry processor for routing entries to backends",
  category: "logger/handler",
  tags: ["logging", "observability"],
});
