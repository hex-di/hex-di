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
   */
  handle(entry: LogEntry): void;

  /**
   * Flush pending log entries.
   */
  flush(): Promise<void>;

  /**
   * Shutdown handler and release resources.
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
  category: "infrastructure",
  tags: ["logging", "observability"],
});
