/**
 * Tracing integration for structured logging.
 *
 * Provides optional span injection into log entries via a Logger wrapper.
 * When an active span is available (via a SpanProvider), trace IDs and span IDs
 * are automatically attached to log annotations.
 *
 * @packageDocumentation
 */

import type { Logger } from "../ports/logger.js";
import type { LogLevel } from "../types/log-level.js";
import type { LogContext } from "../types/log-entry.js";

/**
 * Span information for log entry correlation.
 */
export interface SpanInfo {
  readonly traceId: string;
  readonly spanId: string;
}

/**
 * A function that retrieves active span information.
 * Returns undefined if no span is active or tracing is not available.
 */
export type SpanProvider = () => ReadonlyArray<SpanInfo> | undefined;

/**
 * No-op span provider that always returns undefined.
 */
const noopProvider: SpanProvider = () => undefined;

/**
 * Create a span provider that attempts to read the active tracing context.
 *
 * Since @hex-di/tracing cannot be dynamically imported at runtime easily,
 * this returns a no-op provider by default. Users should wire up their own
 * SpanProvider if tracing context is available.
 *
 * @returns A SpanProvider (defaults to no-op)
 */
export function createSpanProvider(): SpanProvider {
  return noopProvider;
}

/**
 * Merge span info into annotations.
 */
function mergeSpanAnnotations(
  annotations: Record<string, unknown> | undefined,
  spans: ReadonlyArray<SpanInfo>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (annotations) {
    for (const key of Object.keys(annotations)) {
      result[key] = annotations[key];
    }
  }
  if (spans.length > 0) {
    result.traceId = spans[0].traceId;
    result.spanId = spans[0].spanId;
    result.__spans = spans;
  }
  return result;
}

/**
 * Create a Logger wrapper that injects active trace spans into log entries.
 *
 * When a span is active (the provider returns span info), the traceId and spanId
 * are injected into the log annotations. When no span is active, logging
 * proceeds without modification.
 *
 * @param logger - The logger to wrap
 * @param spanProvider - Function to get active spans (defaults to auto-detect via createSpanProvider)
 * @returns Logger that includes span info in entries
 */
export function withSpanInjection(
  logger: Logger,
  spanProvider: SpanProvider = createSpanProvider()
): Logger {
  function enrichAnnotations(
    annotations: Record<string, unknown> | undefined
  ): Record<string, unknown> | undefined {
    const spans = spanProvider();
    if (!spans || spans.length === 0) {
      return annotations;
    }
    return mergeSpanAnnotations(annotations, spans);
  }

  return {
    trace(message: string, annotations?: Record<string, unknown>): void {
      logger.trace(message, enrichAnnotations(annotations));
    },

    debug(message: string, annotations?: Record<string, unknown>): void {
      logger.debug(message, enrichAnnotations(annotations));
    },

    info(message: string, annotations?: Record<string, unknown>): void {
      logger.info(message, enrichAnnotations(annotations));
    },

    warn(message: string, annotations?: Record<string, unknown>): void {
      logger.warn(message, enrichAnnotations(annotations));
    },

    error(
      message: string,
      errorOrAnnotations?: Error | Record<string, unknown>,
      annotations?: Record<string, unknown>
    ): void {
      if (errorOrAnnotations instanceof Error) {
        logger.error(message, errorOrAnnotations, enrichAnnotations(annotations));
      } else {
        logger.error(message, enrichAnnotations(errorOrAnnotations));
      }
    },

    fatal(
      message: string,
      errorOrAnnotations?: Error | Record<string, unknown>,
      annotations?: Record<string, unknown>
    ): void {
      if (errorOrAnnotations instanceof Error) {
        logger.fatal(message, errorOrAnnotations, enrichAnnotations(annotations));
      } else {
        logger.fatal(message, enrichAnnotations(errorOrAnnotations));
      }
    },

    child(context: Partial<LogContext>): Logger {
      return withSpanInjection(logger.child(context), spanProvider);
    },

    withAnnotations(annotations: Record<string, unknown>): Logger {
      return withSpanInjection(logger.withAnnotations(annotations), spanProvider);
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
