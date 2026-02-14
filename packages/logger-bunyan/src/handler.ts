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
import { mapLevel, type BunyanLevel } from "./level-map.js";

const levelMethods: Record<
  BunyanLevel,
  (logger: bunyan, f: Record<string, unknown>, m: string) => void
> = {
  trace: (l, f, m) => l.trace(f, m),
  debug: (l, f, m) => l.debug(f, m),
  info: (l, f, m) => l.info(f, m),
  warn: (l, f, m) => l.warn(f, m),
  error: (l, f, m) => l.error(f, m),
  fatal: (l, f, m) => l.fatal(f, m),
};

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

  // Bunyan exposes a `.streams` property at runtime (array of stream configs),
  // but it's not in the TypeScript type declarations. We capture the configured
  // streams at creation time so flush/shutdown can access them type-safely.
  const configuredStreams = options.streams ?? [];

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

      levelMethods[bunyanLevel](logger, mergedFields, entry.message);
    },

    async flush(): Promise<void> {
      // Drain all writable streams to ensure buffered data is flushed.
      // Non-destructive: logger remains usable after flush returns.
      const flushPromises: Array<Promise<void>> = [];
      for (const streamConfig of configuredStreams) {
        const s: unknown = streamConfig.stream;
        // Runtime type guard: only operate on Node.js WritableStream-like objects
        if (s && typeof s === "object" && "write" in s && "cork" in s) {
          const ws = s as {
            once?: (event: string, fn: () => void) => void;
            writableLength?: number;
          };
          flushPromises.push(
            new Promise<void>(resolve => {
              if (typeof ws.once === "function") {
                ws.once("drain", resolve);
                if (ws.writableLength === 0) {
                  resolve();
                }
              } else {
                resolve();
              }
            })
          );
        }
      }
      if (flushPromises.length > 0) {
        await Promise.all(flushPromises);
      }
    },

    async shutdown(): Promise<void> {
      // End all writable streams and wait for completion.
      // Terminal operation: logger should not be used after shutdown.
      const shutdownPromises: Array<Promise<void>> = [];
      for (const streamConfig of configuredStreams) {
        const s: unknown = streamConfig.stream;
        // Runtime type guard: only operate on Node.js WritableStream-like objects
        if (s && typeof s === "object" && "end" in s) {
          const ws = s as {
            end?: (cb?: () => void) => void;
            on?: (event: string, fn: () => void) => void;
          };
          if (typeof ws.end === "function") {
            const endFn = ws.end.bind(s);
            shutdownPromises.push(
              new Promise<void>(resolve => {
                let settled = false;
                if (typeof ws.on === "function") {
                  ws.on("finish", () => {
                    if (!settled) {
                      settled = true;
                      resolve();
                    }
                  });
                  ws.on("error", () => {
                    if (!settled) {
                      settled = true;
                      resolve();
                    }
                  });
                }
                endFn(() => {
                  if (!settled) {
                    settled = true;
                    resolve();
                  }
                });
              })
            );
          }
        }
      }
      if (shutdownPromises.length > 0) {
        await Promise.all(shutdownPromises);
      }
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
