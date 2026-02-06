/**
 * BatchSpanProcessor - Buffers spans and exports in configurable batches.
 *
 * This processor buffers spans in memory and exports them in batches when
 * thresholds are reached or on scheduled intervals. This is the recommended
 * processor for production use due to efficient batching and lower overhead.
 *
 * @packageDocumentation
 */

import type { Span, SpanData, SpanExporter, SpanProcessor } from "@hex-di/tracing";
import type { BatchSpanProcessorOptions } from "./types.js";
import { logError, safeSetTimeout, safeClearTimeout, hasSetTimeout } from "../utils/globals.js";

/**
 * Default configuration values for BatchSpanProcessor.
 */
const DEFAULT_MAX_QUEUE_SIZE = 2048;
const DEFAULT_SCHEDULED_DELAY_MILLIS = 5000;
const DEFAULT_EXPORT_TIMEOUT_MILLIS = 30000;
const DEFAULT_MAX_EXPORT_BATCH_SIZE = 512;

/**
 * Creates a BatchSpanProcessor that buffers and exports spans in batches.
 *
 * BatchSpanProcessor buffers completed spans in memory and exports them
 * in batches when size thresholds are reached or on scheduled intervals.
 * This approach minimizes overhead and network calls compared to immediate
 * per-span exports.
 *
 * **Buffering Strategy:**
 * - Spans are buffered up to `maxQueueSize`
 * - When buffer reaches `maxExportBatchSize`, immediate flush is triggered
 * - Otherwise, flush is scheduled after `scheduledDelayMillis`
 * - If buffer exceeds `maxQueueSize`, oldest span is dropped (FIFO)
 *
 * **Export Strategy:**
 * - Batches are limited to `maxExportBatchSize` spans per export call
 * - Large buffers are exported in multiple batches sequentially
 * - Export errors are logged but don't prevent further processing
 *
 * **Shutdown Behavior:**
 * - All buffered spans are flushed before shutdown completes
 * - Exporter shutdown is called with timeout protection (OTEL-08)
 * - After shutdown, onEnd becomes a no-op
 *
 * @param exporter - SpanExporter to send completed spans to
 * @param options - Configuration options
 * @returns SpanProcessor implementation
 *
 * @example
 * ```typescript
 * import { createBatchSpanProcessor } from '@hex-di/tracing-otel';
 * import { createOtlpHttpExporter } from '@hex-di/tracing-otel';
 *
 * const exporter = createOtlpHttpExporter({
 *   url: 'http://localhost:4318/v1/traces',
 * });
 *
 * const processor = createBatchSpanProcessor(exporter, {
 *   maxQueueSize: 2048,
 *   scheduledDelayMillis: 5000,
 *   maxExportBatchSize: 512,
 * });
 *
 * // Register with tracer provider
 * tracerProvider.addSpanProcessor(processor);
 *
 * // Cleanup on shutdown
 * await processor.shutdown();
 * ```
 */
export function createBatchSpanProcessor(
  exporter: SpanExporter,
  options?: BatchSpanProcessorOptions
): SpanProcessor {
  const maxQueueSize = options?.maxQueueSize ?? DEFAULT_MAX_QUEUE_SIZE;
  const scheduledDelayMillis = options?.scheduledDelayMillis ?? DEFAULT_SCHEDULED_DELAY_MILLIS;
  const exportTimeoutMillis = options?.exportTimeoutMillis ?? DEFAULT_EXPORT_TIMEOUT_MILLIS;
  const maxExportBatchSize = options?.maxExportBatchSize ?? DEFAULT_MAX_EXPORT_BATCH_SIZE;

  // Internal state
  const spanBuffer: SpanData[] = [];
  let flushTimer: unknown = undefined;
  let isShutdown = false;

  /**
   * Schedule a flush after scheduledDelayMillis if not already scheduled.
   */
  function scheduleFlush(): void {
    if (flushTimer !== undefined || !hasSetTimeout()) {
      return; // Timer already set or no setTimeout available
    }

    flushTimer = safeSetTimeout(() => {
      flushTimer = undefined;
      flush().catch(err => {
        logError("[hex-di/tracing-otel] BatchSpanProcessor scheduled flush failed:", err);
      });
    }, scheduledDelayMillis);
  }

  /**
   * Clear any pending flush timer.
   */
  function clearFlushTimer(): void {
    if (flushTimer !== undefined) {
      safeClearTimeout(flushTimer);
      flushTimer = undefined;
    }
  }

  /**
   * Export buffered spans in batches.
   */
  async function flush(): Promise<void> {
    if (spanBuffer.length === 0) {
      return;
    }

    // Export in batches to respect maxExportBatchSize
    while (spanBuffer.length > 0) {
      const batch = spanBuffer.splice(0, maxExportBatchSize);
      try {
        await exporter.export(batch);
      } catch (err) {
        logError("[hex-di/tracing-otel] BatchSpanProcessor export failed:", err);
        // Continue with next batch despite error
      }
    }
  }

  return {
    /**
     * No-op - BatchSpanProcessor doesn't process spans on start.
     */
    onStart(_span: Span): void {
      // No-op - no processing needed on start
    },

    /**
     * Buffer span and trigger flush if thresholds are met.
     *
     * Buffering strategy:
     * 1. If shutdown, become a no-op
     * 2. If buffer is full, drop oldest span
     * 3. Add span to buffer
     * 4. If buffer reaches maxExportBatchSize, flush immediately
     * 5. Otherwise, schedule delayed flush
     */
    onEnd(spanData: SpanData): void {
      if (isShutdown) {
        return;
      }

      // Drop oldest span if buffer is full
      if (spanBuffer.length >= maxQueueSize) {
        spanBuffer.shift();
      }

      // Add span to buffer
      spanBuffer.push(spanData);

      // Immediate flush if batch size reached
      if (spanBuffer.length >= maxExportBatchSize) {
        clearFlushTimer();
        flush().catch(err => {
          logError("[hex-di/tracing-otel] BatchSpanProcessor immediate flush failed:", err);
        });
      } else {
        // Schedule delayed flush
        scheduleFlush();
      }
    },

    /**
     * Force immediate flush of all buffered spans.
     *
     * Clears any pending timer and exports all buffered spans in batches.
     */
    async forceFlush(): Promise<void> {
      if (isShutdown) {
        return;
      }

      clearFlushTimer();
      await flush();
    },

    /**
     * Shutdown processor and exporter with timeout protection.
     *
     * Shutdown sequence:
     * 1. Set shutdown flag (makes onEnd a no-op)
     * 2. Clear pending flush timer
     * 3. Flush all remaining buffered spans
     * 4. Shutdown exporter with timeout protection (OTEL-08)
     */
    async shutdown(): Promise<void> {
      if (isShutdown) {
        return;
      }

      isShutdown = true;
      clearFlushTimer();

      // Flush remaining spans
      try {
        await flush();
      } catch (err) {
        logError("[hex-di/tracing-otel] BatchSpanProcessor final flush failed:", err);
      }

      // Shutdown exporter with timeout
      if (!hasSetTimeout()) {
        // No timeout available - just call shutdown directly
        try {
          await exporter.shutdown();
        } catch (err) {
          logError("[hex-di/tracing-otel] BatchSpanProcessor shutdown error:", err);
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
        logError("[hex-di/tracing-otel] BatchSpanProcessor shutdown error:", err);
      }
    },
  };
}
