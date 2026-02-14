/**
 * Configuration types for span processors.
 *
 * These options control buffering, batching, and timeout behavior
 * for span processing and export operations.
 *
 * @packageDocumentation
 */

/**
 * Configuration options for BatchSpanProcessor.
 *
 * BatchSpanProcessor buffers spans in memory and exports them in
 * batches when thresholds are reached or on scheduled intervals.
 */
export interface BatchSpanProcessorOptions {
  /**
   * Maximum number of spans to buffer before dropping oldest spans.
   *
   * When the buffer reaches this size, the oldest span is removed
   * before adding the new span (FIFO queue behavior).
   *
   * @default 2048
   */
  maxQueueSize?: number;

  /**
   * Interval in milliseconds between scheduled flush operations.
   *
   * A timer is set to export buffered spans at this interval,
   * even if the batch size threshold hasn't been reached.
   *
   * @default 5000 (5 seconds)
   */
  scheduledDelayMillis?: number;

  /**
   * Maximum time in milliseconds to wait for export operations.
   *
   * Used to timeout export and shutdown operations to prevent
   * deadlocks and ensure graceful termination.
   *
   * @default 30000 (30 seconds)
   */
  exportTimeoutMillis?: number;

  /**
   * Maximum number of spans to export in a single batch.
   *
   * When the buffer reaches this size, an immediate flush is
   * triggered. During forceFlush/shutdown, spans are exported
   * in batches of this size.
   *
   * @default 512
   */
  maxExportBatchSize?: number;

  /**
   * Maximum number of export retry attempts on failure.
   *
   * When an export batch fails, the processor retries with
   * exponential backoff up to this many times before dropping
   * the batch.
   *
   * @default 3
   */
  maxRetryAttempts?: number;

  /**
   * Base delay in milliseconds for retry backoff.
   *
   * Actual delay is: baseRetryDelayMs * 2^(attemptNumber - 1)
   *
   * @default 1000 (1 second)
   */
  baseRetryDelayMs?: number;
}

/**
 * Configuration options for SimpleSpanProcessor.
 *
 * SimpleSpanProcessor exports spans immediately when they end,
 * without buffering. Useful for debugging and testing.
 */
export interface SimpleSpanProcessorOptions {
  /**
   * Maximum time in milliseconds to wait for export operations.
   *
   * Used to timeout export and shutdown operations to prevent
   * deadlocks and ensure graceful termination.
   *
   * @default 30000 (30 seconds)
   */
  exportTimeoutMillis?: number;
}
