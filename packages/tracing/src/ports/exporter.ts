/**
 * Span Exporter Port - Interface for exporting completed spans to backends.
 *
 * The SpanExporterPort defines the contract for sending span data to
 * observability backends (Jaeger, Zipkin, OTLP collectors, etc.).
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";
import type { SpanData } from "../types/index.js";

/**
 * Service interface for exporting completed spans.
 *
 * SpanExporter implementations send span data to external observability
 * backends. Exporters receive batches of completed spans and handle
 * serialization, transmission, and retry logic.
 *
 * ## Lifecycle
 *
 * 1. **export()** - Called by SpanProcessor to send completed spans
 * 2. **forceFlush()** - Called to immediately send any buffered spans
 * 3. **shutdown()** - Called during cleanup to ensure no data loss
 *
 * ## Implementation Guidelines
 *
 * - Exporters should buffer spans and send in batches for efficiency
 * - Failed exports should be retried with exponential backoff
 * - Shutdown must ensure all buffered spans are sent or written
 * - Export errors should be logged but not throw (to avoid blocking)
 *
 * @remarks
 * - Compatible with OpenTelemetry SpanExporter interface
 * - Exporters run in the context of a SpanProcessor
 * - Multiple exporters can be composed (e.g., console + OTLP)
 */
export interface SpanExporter {
  /**
   * Exports a batch of completed spans to the backend.
   *
   * This method is called by the SpanProcessor when spans are ready
   * to be sent. Implementations should handle serialization, network
   * transmission, and error handling.
   *
   * @param spans - Readonly array of completed span snapshots
   * @returns Promise that resolves when export succeeds or fails
   *
   * @remarks
   * - Should not throw - return rejected promise for export failures
   * - May buffer spans internally for batch transmission
   * - Failed exports should be retried or logged
   * - Rejection does not stop the processor
   *
   * @example
   * ```typescript
   * export async function export(spans: ReadonlyArray<SpanData>): Promise<void> {
   *   try {
   *     await httpClient.post('/v1/traces', {
   *       resourceSpans: serializeSpans(spans),
   *     });
   *   } catch (error) {
   *     console.error('Failed to export spans:', error);
   *     // Don't throw - log and continue
   *   }
   * }
   * ```
   */
  export(spans: ReadonlyArray<SpanData>): Promise<void>;

  /**
   * Forces immediate export of any buffered spans.
   *
   * Ensures all pending spans are sent to the backend without waiting
   * for batch thresholds. Called during application shutdown or on demand.
   *
   * @returns Promise that resolves when flush completes
   *
   * @remarks
   * - Should send all buffered data immediately
   * - Wait for in-flight requests to complete
   * - Timeout after reasonable duration (e.g., 30s)
   * - Does not guarantee success - best effort
   *
   * @example
   * ```typescript
   * process.on('SIGTERM', async () => {
   *   await exporter.forceFlush();
   *   process.exit(0);
   * });
   * ```
   */
  forceFlush(): Promise<void>;

  /**
   * Shuts down the exporter and releases resources.
   *
   * Ensures all buffered spans are exported before cleanup. After
   * shutdown, no further spans should be exported.
   *
   * @returns Promise that resolves when shutdown completes
   *
   * @remarks
   * - Must flush all buffered spans
   * - Close network connections
   * - Clear internal state
   * - Idempotent - safe to call multiple times
   * - After shutdown, export() should be a no-op
   *
   * @example
   * ```typescript
   * // During application shutdown
   * await exporter.shutdown();
   * // exporter.export() now does nothing
   * ```
   */
  shutdown(): Promise<void>;
}

/**
 * SpanExporterPort - Port definition for span exporters.
 *
 * Use this port to declare dependencies on span export functionality.
 * Typically used by SpanProcessor implementations.
 *
 * @example
 * ```typescript
 * import { createAdapter } from '@hex-di/core';
 * import { SpanExporterPort } from '@hex-di/tracing/ports';
 *
 * const BatchSpanProcessorAdapter = createAdapter({
 *   provides: SpanProcessorPort,
 *   requires: [SpanExporterPort],
 *   factory: ({ exporter }) => new BatchSpanProcessor(exporter),
 * });
 * ```
 */
export const SpanExporterPort = port<SpanExporter>()({
  name: "SpanExporter",
  direction: "outbound",
  description: "Exports completed spans to observability backends",
  category: "infrastructure",
  tags: ["tracing", "observability", "export"],
});
