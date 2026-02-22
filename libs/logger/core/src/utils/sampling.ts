/**
 * Sampling logger wrapper.
 *
 * Wraps a Logger to probabilistically sample log entries,
 * reducing log volume while maintaining statistical representation.
 *
 * @packageDocumentation
 */

import type { Logger } from "../ports/logger.js";
import type { LogLevel } from "../types/log-level.js";
import type { LogContext } from "../types/log-entry.js";

/**
 * Configuration for sampling behavior.
 */
export interface SamplingConfig {
  readonly rate: number; // 0.0 to 1.0
  readonly perLevel?: Partial<Record<LogLevel, number>>;
  readonly alwaysLogErrors?: boolean; // default: true
  /** Seedable random function for deterministic testing. Defaults to Math.random. */
  readonly randomFn?: () => number;
  /** Called when an entry is dropped by sampling. */
  readonly onDrop?: (level: LogLevel, count: number) => void;
}

/**
 * Determine whether a log entry should be sampled (kept).
 */
function shouldSample(level: LogLevel, config: SamplingConfig): boolean {
  const alwaysLogErrors = config.alwaysLogErrors ?? true;

  if (alwaysLogErrors && (level === "error" || level === "fatal")) {
    return true;
  }

  const rate = config.perLevel?.[level] ?? config.rate;
  const random = config.randomFn ?? Math.random;
  return random() < rate;
}

/**
 * Create a Logger wrapper that probabilistically samples log entries.
 *
 * @param logger - The logger to wrap
 * @param config - Sampling configuration
 * @returns A new Logger with sampling applied
 */
export function withSampling(logger: Logger, config: SamplingConfig): Logger {
  let droppedCount = 0;

  function tryLog(level: LogLevel): boolean {
    if (shouldSample(level, config)) {
      return true;
    }
    droppedCount++;
    if (config.onDrop) {
      config.onDrop(level, droppedCount);
    }
    return false;
  }

  return {
    trace(message: string, annotations?: Record<string, unknown>): void {
      if (tryLog("trace")) {
        logger.trace(message, annotations);
      }
    },

    debug(message: string, annotations?: Record<string, unknown>): void {
      if (tryLog("debug")) {
        logger.debug(message, annotations);
      }
    },

    info(message: string, annotations?: Record<string, unknown>): void {
      if (tryLog("info")) {
        logger.info(message, annotations);
      }
    },

    warn(message: string, annotations?: Record<string, unknown>): void {
      if (tryLog("warn")) {
        logger.warn(message, annotations);
      }
    },

    error(
      message: string,
      errorOrAnnotations?: Error | Record<string, unknown>,
      annotations?: Record<string, unknown>
    ): void {
      if (tryLog("error")) {
        if (errorOrAnnotations instanceof Error) {
          logger.error(message, errorOrAnnotations, annotations);
        } else {
          logger.error(message, errorOrAnnotations);
        }
      }
    },

    fatal(
      message: string,
      errorOrAnnotations?: Error | Record<string, unknown>,
      annotations?: Record<string, unknown>
    ): void {
      if (tryLog("fatal")) {
        if (errorOrAnnotations instanceof Error) {
          logger.fatal(message, errorOrAnnotations, annotations);
        } else {
          logger.fatal(message, errorOrAnnotations);
        }
      }
    },

    child(context: Partial<LogContext>): Logger {
      return withSampling(logger.child(context), config);
    },

    withAnnotations(annotations: Record<string, unknown>): Logger {
      return withSampling(logger.withAnnotations(annotations), config);
    },

    isLevelEnabled(level: LogLevel): boolean {
      return logger.isLevelEnabled(level);
    },

    getContext(): LogContext {
      return logger.getContext();
    },

    time<T>(name: string, fn: () => T): T {
      return logger.time(name, fn);
    },

    timeAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
      return logger.timeAsync(name, fn);
    },
  };
}
