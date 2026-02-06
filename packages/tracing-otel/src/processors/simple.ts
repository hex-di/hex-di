/**
 * SimpleSpanProcessor - Exports spans immediately on completion.
 *
 * This processor exports spans synchronously (fire-and-forget) as soon
 * as they end. It's useful for debugging and testing, but not recommended
 * for production due to high overhead.
 *
 * @packageDocumentation
 */

import type { Span, SpanData, SpanExporter, SpanProcessor } from "@hex-di/tracing";
import type { SimpleSpanProcessorOptions } from "./types.js";
import { logError, safeSetTimeout, hasSetTimeout } from "../utils/globals.js";

/**
 * Default timeout for export operations (30 seconds).
 */
const DEFAULT_EXPORT_TIMEOUT_MILLIS = 30000;

/**
 * Creates a SimpleSpanProcessor that exports spans immediately on end.
 *
 * SimpleSpanProcessor exports each span as soon as it completes, without
 * buffering or batching. Export operations are fire-and-forget (async
 * but not awaited) to avoid blocking span.end() calls.
 *
 * **Use Cases:**
 * - Development and debugging (immediate visibility)
 * - Testing scenarios requiring deterministic export timing
 * - Low-volume tracing where batching overhead isn't justified
 *
 * **Not Recommended For:**
 * - Production environments (use BatchSpanProcessor instead)
 * - High-throughput scenarios (each span triggers network call)
 *
 * @param exporter - SpanExporter to send completed spans to
 * @param options - Configuration options
 * @returns SpanProcessor implementation
 *
 * @example
 * ```typescript
 * import { createSimpleSpanProcessor } from '@hex-di/tracing-otel';
 * import { createConsoleExporter } from './exporters/console.js';
 *
 * const exporter = createConsoleExporter();
 * const processor = createSimpleSpanProcessor(exporter);
 *
 * // Register with tracer provider
 * tracerProvider.addSpanProcessor(processor);
 *
 * // Cleanup on shutdown
 * await processor.shutdown();
 * ```
 */
export function createSimpleSpanProcessor(
  exporter: SpanExporter,
  options?: SimpleSpanProcessorOptions
): SpanProcessor {
  const exportTimeoutMillis = options?.exportTimeoutMillis ?? DEFAULT_EXPORT_TIMEOUT_MILLIS;

  let isShutdown = false;

  return {
    /**
     * No-op - SimpleSpanProcessor doesn't process spans on start.
     */
    onStart(_span: Span): void {
      // No-op - no processing needed on start
    },

    /**
     * Exports span immediately on completion.
     *
     * The export is fire-and-forget to avoid blocking span.end().
     * Errors are logged but do not propagate.
     */
    onEnd(spanData: SpanData): void {
      // After shutdown, become a no-op
      if (isShutdown) {
        return;
      }

      // Fire-and-forget export - don't block span.end()
      exporter.export([spanData]).catch(err => {
        logError("[hex-di/tracing-otel] SimpleSpanProcessor export failed:", err);
      });
    },

    /**
     * Forces immediate flush of any pending exports in the exporter.
     *
     * SimpleSpanProcessor doesn't buffer, but the exporter might.
     */
    async forceFlush(): Promise<void> {
      if (isShutdown) {
        return;
      }

      try {
        await exporter.forceFlush();
      } catch (err) {
        logError("[hex-di/tracing-otel] SimpleSpanProcessor forceFlush failed:", err);
      }
    },

    /**
     * Shuts down the processor and exporter with timeout protection.
     *
     * After shutdown, onEnd becomes a no-op. The exporter is shutdown
     * with a timeout to prevent deadlocks (OTEL-08).
     */
    async shutdown(): Promise<void> {
      if (isShutdown) {
        return;
      }

      isShutdown = true;

      if (!hasSetTimeout()) {
        // No timeout available - just call shutdown directly
        try {
          await exporter.shutdown();
        } catch (err) {
          logError("[hex-di/tracing-otel] SimpleSpanProcessor shutdown error:", err);
        }
        return;
      }

      try {
        await Promise.race([
          exporter.shutdown(),
          new Promise<never>((_resolve, reject) => {
            safeSetTimeout(() => {
              reject(new Error("Shutdown timeout"));
            }, exportTimeoutMillis);
          }),
        ]);
      } catch (err) {
        logError("[hex-di/tracing-otel] SimpleSpanProcessor shutdown error:", err);
      }
    },
  };
}
