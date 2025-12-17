/**
 * Console Logger Adapter - Browser-friendly logging.
 *
 * Uses `console` methods for logging. Suitable for:
 * - React DevTools (browser)
 * - Node.js development (when stdout is available)
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/graph";
import { LoggerPort, type Logger, type LogLevel } from "@hex-di/devtools-core";

/**
 * Console logger implementation.
 */
class ConsoleLoggerImpl implements Logger {
  constructor(private readonly minLevel: LogLevel = "debug") {}

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  debug(message: string): void {
    if (this.shouldLog("debug")) {
      console.debug(`[DEBUG] ${message}`);
    }
  }

  info(message: string): void {
    if (this.shouldLog("info")) {
      console.info(`[INFO] ${message}`);
    }
  }

  warn(message: string): void {
    if (this.shouldLog("warn")) {
      console.warn(`[WARN] ${message}`);
    }
  }

  error(message: string): void {
    if (this.shouldLog("error")) {
      console.error(`[ERROR] ${message}`);
    }
  }
}

/**
 * Console logger adapter for browser environments.
 *
 * Uses standard `console` methods (debug, info, warn, error).
 * Singleton lifetime ensures consistent logging throughout the app.
 *
 * @example
 * ```typescript
 * import { ConsoleLoggerAdapter } from '@hex-di/devtools-adapters';
 *
 * const graph = createGraph()
 *   .provide(ConsoleLoggerAdapter);
 * ```
 */
export const ConsoleLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => new ConsoleLoggerImpl(),
});

/**
 * Create a console logger adapter with custom minimum log level.
 *
 * @param minLevel - Minimum level to log (default: "debug")
 *
 * @example
 * ```typescript
 * // Only log warnings and errors
 * const graph = createGraph()
 *   .provide(createConsoleLoggerAdapter("warn"));
 * ```
 */
export function createConsoleLoggerAdapter(minLevel: LogLevel = "debug") {
  return createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "singleton",
    factory: () => new ConsoleLoggerImpl(minLevel),
  });
}
