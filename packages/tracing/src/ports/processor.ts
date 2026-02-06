/**
 * Span Processor Port - Interface for processing span lifecycle events.
 *
 * The SpanProcessorPort defines the contract for handling span start/end
 * events and coordinating with exporters to send spans to backends.
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";
import type { Span, SpanData } from "../types.js";

/**
 * Service interface for processing span lifecycle events.
 *
 * SpanProcessor implementations receive notifications when spans start
 * and end, and coordinate with SpanExporters to send completed spans
 * to observability backends.
 *
 * ## Processing Strategies
 *
 * - **Simple** - Exports immediately on span end (useful for debugging)
 * - **Batch** - Buffers spans and exports in batches (production default)
 *
 * ## Lifecycle
 *
 * 1. **onStart()** - Called when span starts (optional processing)
 * 2. **onEnd()** - Called when span ends (queue for export)
 * 3. **forceFlush()** - Immediately process pending spans
 * 4. **shutdown()** - Cleanup and ensure no data loss
 *
 * @remarks
 * - Compatible with OpenTelemetry SpanProcessor interface
 * - Processors are registered with the TracerProvider
 * - Multiple processors can run in parallel
 * - Processor errors should not affect span recording
 */
export interface SpanProcessor {
  /**
   * Called when a span is started.
   *
   * Allows processors to perform initialization, sampling decisions,
   * or early enrichment. Most processors leave this as a no-op.
   *
   * @param span - The span that was just started
   *
   * @remarks
   * - Called synchronously during span creation
   * - Should be very fast to avoid blocking
   * - Errors should be caught and logged internally
   * - Optional processing - can be no-op
   *
   * @example
   * ```typescript
   * onStart(span: Span): void {
   *   // Optional: Add processor-specific metadata
   *   span.setAttribute('processor.id', this.processorId);
   * }
   * ```
   */
  onStart(span: Span): void;

  /**
   * Called when a span has ended.
   *
   * This is where processors typically queue spans for export or
   * immediately send them to exporters. The span is now immutable
   * and ready for serialization.
   *
   * @param spanData - Immutable snapshot of the completed span
   *
   * @remarks
   * - Called synchronously during span.end()
   * - Should return quickly - queue work asynchronously
   * - Errors should be caught and logged internally
   * - Don't mutate spanData - it's readonly
   *
   * @example
   * ```typescript
   * onEnd(spanData: SpanData): void {
   *   this.buffer.push(spanData);
   *   if (this.buffer.length >= this.maxBatchSize) {
   *     this.flush().catch(err => console.error('Flush failed:', err));
   *   }
   * }
   * ```
   */
  onEnd(spanData: SpanData): void;

  /**
   * Forces immediate processing of all pending spans.
   *
   * Triggers export of buffered spans without waiting for batch
   * thresholds or timers. Used during shutdown or on demand.
   *
   * @returns Promise that resolves when flush completes
   *
   * @remarks
   * - Should export all buffered spans immediately
   * - Wait for in-flight exports to complete
   * - Timeout after reasonable duration
   * - Best effort - doesn't guarantee success
   *
   * @example
   * ```typescript
   * async forceFlush(): Promise<void> {
   *   if (this.buffer.length === 0) return;
   *   const batch = this.buffer.splice(0);
   *   await this.exporter.export(batch);
   * }
   * ```
   */
  forceFlush(): Promise<void>;

  /**
   * Shuts down the processor and releases resources.
   *
   * Ensures all pending spans are processed before cleanup.
   * After shutdown, onStart and onEnd should be no-ops.
   *
   * @returns Promise that resolves when shutdown completes
   *
   * @remarks
   * - Must flush all buffered spans
   * - Stop background timers/workers
   * - Call shutdown on associated exporters
   * - Idempotent - safe to call multiple times
   * - After shutdown, onEnd should be a no-op
   *
   * @example
   * ```typescript
   * async shutdown(): Promise<void> {
   *   this.stopBackgroundFlush();
   *   await this.forceFlush();
   *   await this.exporter.shutdown();
   *   this.isShutdown = true;
   * }
   * ```
   */
  shutdown(): Promise<void>;
}

/**
 * SpanProcessorPort - Port definition for span processors.
 *
 * Use this port to declare dependencies on span processing functionality.
 * Typically used by TracerProvider implementations.
 *
 * @example
 * ```typescript
 * import { createAdapter } from '@hex-di/core';
 * import { SpanProcessorPort } from '@hex-di/tracing/ports';
 *
 * const TracerProviderAdapter = createAdapter({
 *   provides: TracerPort,
 *   requires: [SpanProcessorPort],
 *   factory: ({ processor }) => new TracerProvider({ processor }),
 * });
 * ```
 */
export const SpanProcessorPort = port<SpanProcessor>()({
  name: "SpanProcessor",
  direction: "outbound",
  description: "Processes span lifecycle events and coordinates exports",
  category: "infrastructure",
  tags: ["tracing", "observability", "processing"],
});
