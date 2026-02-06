/**
 * OTLP HTTP exporter adapter for HexDI spans.
 *
 * This module bridges HexDI's SpanExporter interface with OpenTelemetry's
 * OTLP HTTP exporter, enabling export to any OTLP-compatible collector.
 *
 * @packageDocumentation
 */

import type { SpanData, SpanExporter } from "@hex-di/tracing";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { convertToReadableSpan } from "../adapters/span-adapter.js";
import { createResource } from "../resources/resource.js";
import { mapHexDiToOtelAttributes } from "../semantic-conventions/mapper.js";
import type { OtlpHttpExporterOptions } from "./types.js";

/**
 * Create an OTLP HTTP exporter for sending HexDI spans to OpenTelemetry collectors.
 *
 * This function creates a SpanExporter implementation that:
 * 1. Maps HexDI attributes to OTel semantic conventions
 * 2. Converts HexDI SpanData to OTel ReadableSpan format
 * 3. Exports spans to OTLP-compatible backends via HTTP
 *
 * **Supported Backends:**
 * - OpenTelemetry Collector (local or cloud)
 * - Honeycomb, Lightstep, Grafana Cloud, New Relic
 * - Any service implementing OTLP HTTP protocol
 *
 * **Error Handling:**
 * - Export failures are logged but never throw
 * - Allows application to continue despite telemetry issues
 * - Check logs for `[hex-di/tracing-otel] OTLP export failed` messages
 *
 * @param options - Exporter configuration (endpoint, headers, resource)
 * @returns SpanExporter compatible with HexDI SpanProcessor
 *
 * @remarks
 * - Resource metadata is required for proper service identification
 * - Attribute mapping preserves both HexDI and OTel conventions
 * - Graceful degradation: telemetry failures don't break application
 * - forceFlush and shutdown ensure no data loss during cleanup
 *
 * @example
 * ```typescript
 * // Basic local development setup
 * const exporter = createOtlpHttpExporter({
 *   resource: {
 *     serviceName: 'my-service',
 *   },
 * });
 *
 * // Production with authentication
 * const exporter = createOtlpHttpExporter({
 *   url: 'https://api.honeycomb.io/v1/traces',
 *   headers: {
 *     'x-honeycomb-team': process.env.HONEYCOMB_API_KEY,
 *   },
 *   timeout: 30000,
 *   resource: {
 *     serviceName: 'api-gateway',
 *     serviceVersion: '1.2.3',
 *     deploymentEnvironment: 'production',
 *     serviceNamespace: 'platform',
 *   },
 * });
 *
 * // Use with SpanProcessor
 * const processor = createBatchSpanProcessor(exporter);
 * const tracer = createTracer({ processor });
 * ```
 */
export function createOtlpHttpExporter(options?: OtlpHttpExporterOptions): SpanExporter {
  // Create Resource from config if provided
  const resource = options?.resource ? createResource(options.resource) : undefined;

  // Create underlying OpenTelemetry OTLP exporter
  const otlpExporter = new OTLPTraceExporter({
    url: options?.url ?? "http://localhost:4318/v1/traces",
    headers: options?.headers,
    timeoutMillis: options?.timeout ?? 10000,
  });

  return {
    /**
     * Export a batch of HexDI spans to the OTLP collector.
     *
     * Converts HexDI spans to OpenTelemetry format and sends via HTTP.
     * Failures are logged but don't throw to avoid blocking the application.
     *
     * @param spans - Readonly array of completed HexDI spans
     */
    async export(spans: ReadonlyArray<SpanData>): Promise<void> {
      try {
        // Convert spans: HexDI -> mapped attributes -> OTel ReadableSpan
        const readableSpans: ReadableSpan[] = spans.map(hexSpan => {
          // Map HexDI attributes to OTel semantic conventions
          const mappedAttributes = mapHexDiToOtelAttributes(hexSpan.attributes);

          // Create a new SpanData with mapped attributes
          const mappedSpan: SpanData = {
            ...hexSpan,
            attributes: mappedAttributes,
          };

          // Convert to OTel ReadableSpan format with optional resource
          return convertToReadableSpan(mappedSpan, resource);
        });

        // Export via underlying OTLP exporter (callback-based API)
        await new Promise<void>((resolve, reject) => {
          otlpExporter.export(readableSpans, result => {
            if (result.code === 0) {
              // Success
              resolve();
            } else {
              // Failure - result.error contains details
              reject(new Error(`OTLP export failed: ${result.error ?? "unknown error"}`));
            }
          });
        });
      } catch (error) {
        // Log but don't throw - telemetry failures shouldn't break the application
        console.error("[hex-di/tracing-otel] OTLP export failed:", error);
      }
    },

    /**
     * Force immediate export of any buffered spans.
     *
     * Delegates to the underlying OTLP exporter's flush mechanism.
     */
    async forceFlush(): Promise<void> {
      try {
        await otlpExporter.forceFlush();
      } catch (error) {
        console.error("[hex-di/tracing-otel] OTLP forceFlush failed:", error);
      }
    },

    /**
     * Shutdown the exporter and release resources.
     *
     * Ensures all buffered spans are exported before cleanup.
     */
    async shutdown(): Promise<void> {
      try {
        await otlpExporter.shutdown();
      } catch (error) {
        console.error("[hex-di/tracing-otel] OTLP shutdown failed:", error);
      }
    },
  };
}
