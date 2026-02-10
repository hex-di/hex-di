/**
 * DataDog APM bridge for HexDI distributed tracing.
 *
 * This module bridges HexDI's SpanExporter interface with DataDog's
 * dd-trace tracer, enabling direct export to DataDog APM.
 *
 * @packageDocumentation
 */

import type { SpanData, SpanExporter } from "@hex-di/tracing";
import type { DataDogBridgeConfig, DdSpan } from "./types.js";
import { logError, mapSpanKindToDataDog } from "./utils.js";

/**
 * Create a DataDog bridge for exporting HexDI spans to DataDog APM.
 *
 * This function creates a SpanExporter implementation that:
 * 1. Accepts an already-initialized dd-trace tracer instance
 * 2. Converts HexDI SpanData to DataDog span format
 * 3. Exports spans to DataDog APM via dd-trace
 *
 * **Why peer dependency?**
 * dd-trace is ~50MB+ with native dependencies. By making it a peer
 * dependency, we keep this package lightweight. Users who need DataDog
 * integration install dd-trace themselves and pass the initialized
 * tracer to this bridge.
 *
 * **Error Handling:**
 * - Export failures are logged but never throw
 * - Allows application to continue despite telemetry issues
 * - Check logs for `[hex-di/tracing-datadog]` messages
 *
 * @param config - Bridge configuration with initialized dd-trace tracer
 * @returns SpanExporter compatible with HexDI SpanProcessor
 *
 * @remarks
 * - User must install dd-trace: `npm install dd-trace`
 * - User must initialize tracer before passing to bridge
 * - Graceful degradation: telemetry failures don't break application
 * - Preserves DataDog-specific features (tags, resources, errors)
 *
 * @example
 * ```typescript
 * import tracer from 'dd-trace';
 * import { createDataDogBridge } from '@hex-di/tracing-datadog';
 * import { createBatchSpanProcessor } from '@hex-di/tracing-otel';
 *
 * // Initialize dd-trace with your configuration
 * tracer.init({
 *   service: 'my-service',
 *   env: 'production',
 *   version: '1.2.3',
 *   hostname: 'datadog-agent',
 *   port: 8126,
 * });
 *
 * // Create bridge with initialized tracer
 * const exporter = createDataDogBridge({ tracer });
 *
 * // Use with HexDI SpanProcessor
 * const processor = createBatchSpanProcessor(exporter);
 * const hexTracer = createTracer({ processor });
 * ```
 */
export function createDataDogBridge(config: DataDogBridgeConfig): SpanExporter {
  const { tracer, serviceName, environment, version } = config;

  // Track active spans by spanId for parent-child relationships
  const activeSpans = new Map<string, DdSpan>();
  let isShutdown = false;

  return {
    /**
     * Export a batch of HexDI spans to DataDog APM.
     *
     * Converts each HexDI span to a dd-trace span, setting tags from
     * attributes and finishing with the correct timing.
     *
     * @param spans - Readonly array of completed HexDI spans
     */
    export(spans: ReadonlyArray<SpanData>): Promise<void> {
      if (isShutdown) {
        return Promise.resolve();
      }

      return Promise.resolve().then(() => {
        try {
          for (const hexSpan of spans) {
            try {
              // Find parent span if this is a child span
              const parentSpan = hexSpan.parentSpanId
                ? activeSpans.get(hexSpan.parentSpanId)
                : undefined;

              // Start dd-trace span with same name and timing
              const ddSpan = tracer.startSpan(hexSpan.name, {
                startTime: hexSpan.startTime,
                childOf: parentSpan,
                tags: {}, // Will set via setTag for proper typing
              });

              // Store span for potential child spans
              activeSpans.set(hexSpan.context.spanId, ddSpan);

              // Set span kind as DataDog-compatible tag
              ddSpan.setTag("span.kind", mapSpanKindToDataDog(hexSpan.kind));

              // Set DataDog-specific trace context tags
              ddSpan.setTag("dd.trace_id", hexSpan.context.traceId);
              ddSpan.setTag("dd.span_id", hexSpan.context.spanId);

              // Set service metadata tags if provided in bridge config
              if (serviceName) {
                ddSpan.setTag("service.name", serviceName);
              }
              if (environment) {
                ddSpan.setTag("env", environment);
              }
              if (version) {
                ddSpan.setTag("version", version);
              }

              // Set duration as a tag (milliseconds)
              ddSpan.setTag("duration_ms", hexSpan.endTime - hexSpan.startTime);

              // Set all HexDI attributes as DataDog tags
              for (const [key, value] of Object.entries(hexSpan.attributes)) {
                ddSpan.setTag(key, value);
              }

              // Handle error status
              if (hexSpan.status === "error") {
                ddSpan.setTag("error", true);
                // Add error message from attributes if available
                const errorMsg = hexSpan.attributes["error.message"];
                if (errorMsg) {
                  ddSpan.setTag("error.message", errorMsg);
                }
                // Add error type from attributes if available
                const errorType = hexSpan.attributes["error.type"];
                if (errorType) {
                  ddSpan.setTag("error.type", errorType);
                }
              }

              // Set resource name (DataDog's primary span identifier)
              // Use operation name from attributes or span name
              const operationName = hexSpan.attributes["operation.name"];
              const resourceName = typeof operationName === "string" ? operationName : hexSpan.name;
              ddSpan.setTag("resource.name", resourceName);

              // Set parent span ID if present
              if (hexSpan.parentSpanId) {
                ddSpan.setTag("dd.parent_id", hexSpan.parentSpanId);
              }

              // Add span events as tags (dd-trace doesn't have first-class events)
              if (hexSpan.events.length > 0) {
                ddSpan.setTag("span.events.count", hexSpan.events.length);
                hexSpan.events.forEach((event, index) => {
                  ddSpan.setTag(`event.${index}.name`, event.name);
                  ddSpan.setTag(`event.${index}.time`, event.time);
                  if (event.attributes) {
                    for (const [key, value] of Object.entries(event.attributes)) {
                      ddSpan.setTag(`event.${index}.${key}`, value);
                    }
                  }
                });
              }

              // Finish span with correct end time
              ddSpan.finish(hexSpan.endTime);

              // Clean up from active spans map
              activeSpans.delete(hexSpan.context.spanId);
            } catch (spanError) {
              // Log individual span errors but continue processing batch
              logError(
                `[hex-di/tracing-datadog] Failed to export span ${hexSpan.name}:`,
                spanError
              );
            }
          }
        } catch (error) {
          // Log but don't throw - telemetry failures shouldn't break the application
          logError("[hex-di/tracing-datadog] DataDog export failed:", error);
        }
      });
    },

    /**
     * Force immediate flush of pending spans.
     *
     * Delegates to dd-trace's flush mechanism. dd-trace may return
     * either a Promise or void, so we handle both cases.
     */
    async forceFlush(): Promise<void> {
      if (isShutdown) {
        return;
      }

      try {
        const result = tracer.flush();
        // Handle both Promise and void returns
        if (result && typeof result === "object" && "then" in result) {
          await result;
        }
      } catch (error) {
        logError("[hex-di/tracing-datadog] DataDog forceFlush failed:", error);
      }
    },

    /**
     * Shutdown the exporter and release resources.
     *
     * Ensures all buffered spans are flushed to DataDog agent before cleanup.
     */
    async shutdown(): Promise<void> {
      if (isShutdown) {
        return;
      }

      isShutdown = true;

      try {
        const result = tracer.flush();
        // Handle both Promise and void returns
        if (result && typeof result === "object" && "then" in result) {
          await result;
        }
        // Clear active spans map
        activeSpans.clear();
      } catch (error) {
        logError("[hex-di/tracing-datadog] DataDog shutdown failed:", error);
      }
    },
  };
}
