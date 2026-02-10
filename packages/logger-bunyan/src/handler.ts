/**
 * Bunyan log handler adapter.
 *
 * Bridges @hex-di/logger LogHandler interface to a Bunyan logger instance.
 *
 * @packageDocumentation
 */

import bunyan from "bunyan";
import { createAdapter } from "@hex-di/core";
import { LogHandlerPort } from "@hex-di/logger";
import type { LogEntry, LogHandler } from "@hex-di/logger";
import { mapLevel } from "./level-map.js";

/**
 * Options for creating a Bunyan log handler.
 */
export interface BunyanHandlerOptions {
  readonly name: string;
  readonly level?: bunyan.LogLevel;
  readonly streams?: bunyan.Stream[];
  readonly serializers?: bunyan.Serializers;
}

/**
 * Create a LogHandler backed by Bunyan.
 *
 * @param options - Bunyan configuration options
 * @returns A LogHandler that delegates to a Bunyan logger instance
 */
export function createBunyanHandler(options: BunyanHandlerOptions): LogHandler {
  const loggerOptions: bunyan.LoggerOptions = {
    name: options.name,
  };

  if (options.level !== undefined) {
    loggerOptions.level = options.level;
  }

  if (options.streams) {
    loggerOptions.streams = options.streams;
  }

  if (options.serializers) {
    loggerOptions.serializers = options.serializers;
  }

  const logger = bunyan.createLogger(loggerOptions);

  return {
    handle(entry: LogEntry): void {
      const bunyanLevel = mapLevel(entry.level);
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

      logger[bunyanLevel](mergedFields, entry.message);
    },

    async flush(): Promise<void> {
      // Bunyan auto-flushes
    },

    async shutdown(): Promise<void> {
      // Bunyan doesn't have a close method; streams are cleaned up
      // when the process exits.
    },
  };
}

/**
 * Bunyan handler adapter for DI registration.
 *
 * Uses a default "app" name for the logger.
 */
export const BunyanHandlerAdapter = createAdapter({
  provides: LogHandlerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => createBunyanHandler({ name: "app" }),
});
