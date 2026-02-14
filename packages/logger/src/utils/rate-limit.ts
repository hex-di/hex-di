/**
 * Rate limiting logger wrapper.
 *
 * Wraps a Logger to enforce rate limits on log entries
 * using a sliding window counter approach.
 *
 * @packageDocumentation
 */

import type { Logger } from "../ports/logger.js";
import type { LogLevel } from "../types/log-level.js";
import type { LogContext } from "../types/log-entry.js";

/**
 * Configuration for rate limiting behavior.
 */
export interface RateLimitConfig {
  readonly maxEntries: number;
  readonly windowMs: number;
  readonly perLevel?: Partial<Record<LogLevel, number>>;
  readonly strategy?: "drop" | "sample"; // default: "drop"
  /** Seedable random function for deterministic testing. Defaults to Math.random. */
  readonly randomFn?: () => number;
  /** Called when an entry is dropped by rate limiting. */
  readonly onDrop?: (count: number, windowMs: number) => void;
}

/**
 * Sliding window counter for tracking log entry timestamps.
 */
interface WindowCounter {
  readonly timestamps: number[];
}

/**
 * Remove expired timestamps outside the window.
 */
function pruneWindow(counter: WindowCounter, now: number, windowMs: number): void {
  const cutoff = now - windowMs;
  while (counter.timestamps.length > 0 && counter.timestamps[0] < cutoff) {
    counter.timestamps.shift();
  }
}

/**
 * Check if a log entry is within the rate limit.
 */
function isWithinLimit(
  counter: WindowCounter,
  level: LogLevel,
  config: RateLimitConfig,
  now: number
): boolean {
  pruneWindow(counter, now, config.windowMs);

  const limit = config.perLevel?.[level] ?? config.maxEntries;

  if (counter.timestamps.length >= limit) {
    if (config.strategy === "sample") {
      // Sample: allow with probability inversely proportional to overflow
      const random = config.randomFn ?? Math.random;
      return random() < limit / (counter.timestamps.length + 1);
    }
    return false;
  }

  return true;
}

/**
 * Record a log entry timestamp in the counter.
 */
function recordEntry(counter: WindowCounter, now: number): void {
  counter.timestamps.push(now);
}

/**
 * Create a Logger wrapper that enforces rate limits.
 *
 * @param logger - The logger to wrap
 * @param config - Rate limit configuration
 * @returns A new Logger with rate limiting applied
 */
export function withRateLimit(logger: Logger, config: RateLimitConfig): Logger {
  const counter: WindowCounter = { timestamps: [] };
  const droppedState = { count: 0 };

  return createRateLimitedLogger(logger, config, counter, droppedState);
}

function createRateLimitedLogger(
  logger: Logger,
  config: RateLimitConfig,
  counter: WindowCounter,
  droppedState: { count: number }
): Logger {
  function tryLog(level: LogLevel): boolean {
    const now = Date.now();
    if (!isWithinLimit(counter, level, config, now)) {
      droppedState.count++;
      if (config.onDrop) {
        config.onDrop(droppedState.count, config.windowMs);
      }
      return false;
    }
    recordEntry(counter, now);
    return true;
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
      return createRateLimitedLogger(logger.child(context), config, counter, droppedState);
    },

    withAnnotations(annotations: Record<string, unknown>): Logger {
      return createRateLimitedLogger(
        logger.withAnnotations(annotations),
        config,
        counter,
        droppedState
      );
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
