/**
 * DataDog APM integration types.
 *
 * Minimal interfaces for interacting with dd-trace without direct dependency.
 * Users pass their own initialized dd-trace tracer to the bridge.
 *
 * @packageDocumentation
 */

/**
 * Minimal interface for a dd-trace span.
 *
 * Represents an active span in the DataDog tracer. We define only
 * the methods needed for the bridge to avoid depending on dd-trace types.
 *
 * @remarks
 * - Compatible with dd-trace Span interface
 * - Users don't interact with this directly
 * - Bridge uses this to set tags and finish spans
 */
export interface DdSpan {
  /**
   * Set a tag on the span.
   *
   * @param key - Tag key (use dot notation: 'http.method')
   * @param value - Tag value (primitive or object)
   */
  setTag(key: string, value: unknown): void;

  /**
   * Finish the span with optional end time.
   *
   * @param finishTime - Optional end time in milliseconds since Unix epoch
   */
  finish(finishTime?: number): void;
}

/**
 * Minimal interface for a dd-trace tracer.
 *
 * Represents the DataDog tracer instance. We define only the methods
 * needed for creating spans and flushing data.
 *
 * @remarks
 * - Compatible with dd-trace Tracer interface
 * - Users initialize their own tracer with dd-trace
 * - Bridge wraps the user's tracer to export HexDI spans
 */
export interface DdTracer {
  /**
   * Start a new span.
   *
   * @param name - Span operation name
   * @param options - Span options (start time, parent, tags)
   * @returns Active span
   */
  startSpan(
    name: string,
    options?: {
      startTime?: number;
      childOf?: DdSpan;
      tags?: Record<string, unknown>;
    }
  ): DdSpan;

  /**
   * Force flush of pending spans to DataDog agent.
   *
   * @returns Promise or void (dd-trace supports both)
   */
  flush(): Promise<void> | void;
}

/**
 * Configuration for the DataDog bridge.
 *
 * The bridge accepts an already-initialized dd-trace tracer, keeping
 * the package lightweight and avoiding forced installation of dd-trace.
 *
 * @remarks
 * - Users must install dd-trace themselves: `npm install dd-trace`
 * - Users initialize the tracer with their own configuration
 * - Bridge wraps the tracer to export HexDI spans
 *
 * @example
 * ```typescript
 * import tracer from 'dd-trace';
 * import { createDataDogBridge } from '@hex-di/tracing-datadog';
 *
 * // Initialize dd-trace with your configuration
 * tracer.init({
 *   service: 'my-service',
 *   env: 'production',
 *   version: '1.2.3',
 * });
 *
 * // Create bridge with initialized tracer
 * const exporter = createDataDogBridge({
 *   tracer,
 * });
 *
 * // Use with HexDI SpanProcessor
 * const processor = createBatchSpanProcessor(exporter);
 * ```
 */
export interface DataDogBridgeConfig {
  /**
   * Initialized dd-trace tracer instance.
   *
   * Users must initialize this with dd-trace.init() before passing
   * to the bridge. The bridge will use this tracer to create and
   * finish spans based on HexDI SpanData.
   *
   * @remarks
   * - Initialize with dd-trace.init() first
   * - Configure agent URL, service name, tags, etc.
   * - Enable profiling, APM, or security features as needed
   */
  tracer: DdTracer;
}
