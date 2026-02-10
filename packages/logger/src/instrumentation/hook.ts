/**
 * Logging hook factory for container instrumentation.
 *
 * Creates hook objects compatible with container resolution lifecycle.
 *
 * @packageDocumentation
 */

import type { Logger } from "../ports/logger.js";
import type { AutoLogOptions } from "./container.js";

/**
 * Hook object for container resolution lifecycle events.
 */
export interface LoggingHook {
  readonly beforeResolve?: (portName: string) => void;
  readonly afterResolve?: (portName: string, instance: unknown) => void;
  readonly onError?: (portName: string, error: Error) => void;
}

/**
 * Creates a logging hook that logs container resolution events.
 *
 * The hook respects the provided options for filtering and log levels.
 * Includes a reentrance guard to prevent infinite loops when the logger
 * itself triggers a resolution.
 *
 * @param logger - Logger instance to use for logging
 * @param options - Configuration options
 * @returns A hook object with lifecycle methods
 */
export function createLoggingHook(logger: Logger, options?: AutoLogOptions): LoggingHook {
  const resolutionLevel = options?.resolutionLevel ?? "debug";
  const includeTiming = options?.includeTiming ?? false;
  const minDurationMs = options?.minDurationMs ?? 0;
  const portFilter = options?.portFilter ?? defaultPortFilter;

  let isResolving = false;
  const timingMap = new Map<string, number>();

  return {
    beforeResolve(portName: string): void {
      if (isResolving || !portFilter(portName)) {
        return;
      }

      if (includeTiming) {
        timingMap.set(portName, Date.now());
      }
    },

    afterResolve(portName: string, _instance: unknown): void {
      if (isResolving || !portFilter(portName)) {
        return;
      }

      isResolving = true;
      try {
        if (includeTiming) {
          const startTime = timingMap.get(portName);
          timingMap.delete(portName);

          if (startTime !== undefined) {
            const duration = Date.now() - startTime;
            if (duration >= minDurationMs) {
              logger[resolutionLevel](`Resolved port: ${portName}`, {
                port: portName,
                durationMs: duration,
              });
            }
          } else {
            logger[resolutionLevel](`Resolved port: ${portName}`, { port: portName });
          }
        } else {
          logger[resolutionLevel](`Resolved port: ${portName}`, { port: portName });
        }
      } finally {
        isResolving = false;
      }
    },

    onError(portName: string, error: Error): void {
      if (isResolving || !portFilter(portName)) {
        return;
      }

      isResolving = true;
      try {
        logger.error(`Failed to resolve port: ${portName}`, error, { port: portName });
      } finally {
        isResolving = false;
      }
    },
  };
}

function defaultPortFilter(portName: string): boolean {
  return portName !== "Logger" && portName !== "LogHandler";
}
