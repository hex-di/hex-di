/**
 * Pino log handler adapter.
 *
 * Bridges @hex-di/logger LogHandler interface to a Pino logger instance.
 *
 * @packageDocumentation
 */

import pino from "pino";
import { createAdapter } from "@hex-di/core";
import { LogHandlerPort } from "@hex-di/logger";
import type { LogEntry, LogHandler } from "@hex-di/logger";
import { mapLevel } from "./level-map.js";

/**
 * Options for creating a Pino log handler.
 */
export interface PinoHandlerOptions {
  readonly level?: string;
  readonly base?: Record<string, unknown>;
  readonly transport?: pino.TransportSingleOptions;
}

/**
 * Create a LogHandler backed by Pino.
 *
 * @param options - Pino configuration options
 * @returns A LogHandler that delegates to a Pino logger instance
 */
export function createPinoHandler(options: PinoHandlerOptions = {}): LogHandler {
  const pinoOptions: pino.LoggerOptions = {
    level: options.level ?? "trace",
  };

  if (options.base) {
    pinoOptions.base = options.base;
  }

  if (options.transport) {
    pinoOptions.transport = options.transport;
  }

  const logger = pino(pinoOptions);

  return {
    handle(entry: LogEntry): void {
      const pinoLevel = mapLevel(entry.level);
      const mergedFields: Record<string, unknown> = {};

      // Add context fields
      for (const key in entry.context) {
        mergedFields[key] = entry.context[key];
      }

      // Add annotation fields
      for (const key in entry.annotations) {
        mergedFields[key] = entry.annotations[key];
      }

      // Add error if present
      if (entry.error) {
        mergedFields.err = entry.error;
      }

      // Add span info if present
      if (entry.spans && entry.spans.length > 0) {
        mergedFields.traceId = entry.spans[0].traceId;
        mergedFields.spanId = entry.spans[0].spanId;
      }

      logger[pinoLevel](mergedFields, entry.message);
    },

    flush(): Promise<void> {
      logger.flush();
      return Promise.resolve();
    },

    shutdown(): Promise<void> {
      logger.flush();
      return Promise.resolve();
    },
  };
}

/**
 * Pino handler adapter for DI registration.
 */
export const PinoHandlerAdapter = createAdapter({
  provides: LogHandlerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => createPinoHandler(),
});
