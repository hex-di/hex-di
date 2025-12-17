/**
 * Stderr Logger Adapter - Node.js stderr logging.
 *
 * Writes all log output to stderr, leaving stdout free for:
 * - TUI output rendering
 * - MCP JSON-RPC protocol communication
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/graph";
import { LoggerPort, type Logger, type LogLevel } from "@hex-di/devtools-core";

/**
 * Stderr logger implementation.
 */
class StderrLoggerImpl implements Logger {
  constructor(private readonly minLevel: LogLevel = "debug") {}

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private write(message: string): void {
    // Use console.error which writes to stderr
    console.error(message);
  }

  debug(message: string): void {
    if (this.shouldLog("debug")) {
      this.write(`[DEBUG] ${message}`);
    }
  }

  info(message: string): void {
    if (this.shouldLog("info")) {
      this.write(`[INFO] ${message}`);
    }
  }

  warn(message: string): void {
    if (this.shouldLog("warn")) {
      this.write(`[WARN] ${message}`);
    }
  }

  error(message: string): void {
    if (this.shouldLog("error")) {
      this.write(`[ERROR] ${message}`);
    }
  }
}

/**
 * Stderr logger adapter for Node.js environments.
 *
 * Essential for:
 * - MCP servers (stdout reserved for JSON-RPC)
 * - TUI applications (stdout reserved for display)
 *
 * Singleton lifetime ensures consistent logging throughout the app.
 *
 * @example
 * ```typescript
 * import { StderrLoggerAdapter } from '@hex-di/devtools-adapters';
 *
 * // For MCP server - stdout is reserved for protocol
 * const graph = createGraph()
 *   .provide(StderrLoggerAdapter);
 * ```
 */
export const StderrLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => new StderrLoggerImpl(),
});

/**
 * Create a stderr logger adapter with custom minimum log level.
 *
 * @param minLevel - Minimum level to log (default: "debug")
 *
 * @example
 * ```typescript
 * // Only log errors in production MCP server
 * const graph = createGraph()
 *   .provide(createStderrLoggerAdapter("error"));
 * ```
 */
export function createStderrLoggerAdapter(minLevel: LogLevel = "debug") {
  return createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "singleton",
    factory: () => new StderrLoggerImpl(minLevel),
  });
}
