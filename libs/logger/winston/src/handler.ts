/**
 * Winston log handler adapter.
 *
 * Bridges @hex-di/logger LogHandler interface to a Winston logger instance.
 *
 * @packageDocumentation
 */

import winston from "winston";
import { createAdapter } from "@hex-di/core";
import { LogHandlerPort } from "@hex-di/logger";
import type { LogEntry, LogHandler } from "@hex-di/logger";

/**
 * Options for creating a Winston log handler.
 */
export interface WinstonHandlerOptions {
  readonly level?: string;
  readonly format?: winston.Logform.Format;
  readonly transports?: winston.transport[];
  readonly defaultMeta?: Record<string, unknown>;
}

/**
 * Map hex-di log levels to Winston levels.
 * Winston uses syslog-style where lower numbers = higher severity.
 * We need to ensure 'trace' and 'fatal' are recognized.
 */
const WINSTON_LEVELS: Record<string, number> = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
};

/**
 * Create a LogHandler backed by Winston.
 *
 * @param options - Winston configuration options
 * @returns A LogHandler that delegates to a Winston logger instance
 */
export function createWinstonHandler(options: WinstonHandlerOptions = {}): LogHandler {
  const logger = winston.createLogger({
    levels: WINSTON_LEVELS,
    level: options.level ?? "trace",
    format: options.format ?? winston.format.json(),
    transports: options.transports ?? [new winston.transports.Console()],
    defaultMeta: options.defaultMeta,
  });

  return {
    handle(entry: LogEntry): void {
      const meta: Record<string, unknown> = {};

      // Add context fields
      for (const key in entry.context) {
        meta[key] = entry.context[key];
      }

      // Add annotation fields
      for (const key in entry.annotations) {
        meta[key] = entry.annotations[key];
      }

      // Add error if present
      if (entry.error) {
        meta.error = {
          name: entry.error.name,
          message: entry.error.message,
          stack: entry.error.stack,
        };
      }

      // Add span info if present
      if (entry.spans && entry.spans.length > 0) {
        meta.traceId = entry.spans[0].traceId;
        meta.spanId = entry.spans[0].spanId;
      }

      meta.timestamp = entry.timestamp;

      logger.log({
        level: entry.level,
        message: entry.message,
        ...meta,
      });
    },

    async flush(): Promise<void> {
      // Non-destructive flush: drain all transport buffers without
      // ending the logger. Logger remains usable after flush returns.
      const drainPromises: Array<Promise<void>> = [];
      for (const transport of logger.transports) {
        if (transport.writableLength > 0) {
          drainPromises.push(
            new Promise<void>(resolve => {
              transport.once("drain", resolve);
              // Safety timeout to prevent indefinite hangs
              setTimeout(resolve, 5000);
            })
          );
        }
      }
      if (drainPromises.length > 0) {
        await Promise.all(drainPromises);
      }
    },

    async shutdown(): Promise<void> {
      // Terminal operation: flush all pending data, then close.
      // Logger should not be used after shutdown returns.
      await new Promise<void>(resolve => {
        let finished = false;
        logger.on("finish", () => {
          if (!finished) {
            finished = true;
            resolve();
          }
        });
        logger.on("error", () => {
          if (!finished) {
            finished = true;
            resolve();
          }
        });
        // Safety timeout
        setTimeout(() => {
          if (!finished) {
            finished = true;
            resolve();
          }
        }, 5000);
        logger.end();
      });
      logger.close();
    },
  };
}

/**
 * Winston handler adapter for DI registration.
 */
export const WinstonHandlerAdapter = createAdapter({
  provides: LogHandlerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => createWinstonHandler(),
});
