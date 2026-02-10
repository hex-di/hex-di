/**
 * Zipkin exporter adapter for HexDI spans.
 *
 * This module bridges HexDI's SpanExporter interface with OpenTelemetry's
 * Zipkin exporter, enabling direct export to Zipkin backend using the
 * Zipkin JSON v2 API.
 *
 * @packageDocumentation
 */

import type { SpanData, SpanExporter } from "@hex-di/tracing";
import {
  convertToReadableSpan,
  createResource,
  mapHexDiToOtelAttributes,
} from "@hex-di/tracing-otel";
import { ZipkinExporter } from "@opentelemetry/exporter-zipkin";
import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";

/**
 * Configuration options for the Zipkin exporter.
 *
 * @remarks
 * - Default URL is localhost:9411 (Zipkin HTTP API)
 * - serviceName is required for proper service identification
 * - Additional resource attributes help categorize traces in Zipkin UI
 */
export interface ZipkinExporterOptions {
  /**
   * Zipkin collector endpoint.
   *
   * @default 'http://localhost:9411/api/v2/spans'
   */
  url?: string;

  /**
   * Service name for identifying the source of traces.
   *
   * This appears in Zipkin UI service dropdown.
   */
  serviceName: string;

  /**
   * Service version for tracking deployments.
   *
   * @example '1.2.3'
   */
  serviceVersion?: string;

  /**
   * Deployment environment.
   *
   * @example 'production', 'staging', 'development'
   */
  deploymentEnvironment?: string;

  /**
   * Service namespace for grouping related services.
   *
   * @example 'platform', 'payments', 'user-services'
   */
  serviceNamespace?: string;

  /**
   * Additional resource attributes to attach to all spans.
   *
   * @example
   * ```typescript
   * {
   *   'deployment.region': 'us-east-1',
   *   'host.name': 'api-server-01'
   * }
   * ```
   */
  attributes?: Record<string, string>;

  /**
   * HTTP headers for authentication with the Zipkin collector.
   *
   * @example
   * ```typescript
   * {
   *   'Authorization': 'Bearer my-token',
   * }
   * ```
   */
  headers?: Record<string, string>;

  /**
   * Request timeout in milliseconds.
   *
   * @default 10000 (10 seconds)
   */
  timeout?: number;

  /**
   * Whether to map HexDI-specific attributes to OpenTelemetry semantic conventions.
   *
   * When enabled, attributes like `hex-di.port.name` are additionally mapped to
   * OTel conventions like `code.namespace` for better interop with Zipkin's UI.
   *
   * @default true
   */
  mapSemanticAttributes?: boolean;
}

/**
 * Log an error message to console if available.
 *
 * Simple inline helper to avoid dependency on tracing-otel internals.
 *
 * @param message - Error message
 * @param args - Additional arguments
 */
function logError(message: string, ...args: unknown[]): void {
  if (typeof globalThis !== "undefined" && "console" in globalThis) {
    const g: Record<string, unknown> = globalThis;
    const cons = g.console;
    if (cons && typeof cons === "object" && "error" in cons) {
      const consObj: Record<string, unknown> = cons;
      const errorFn = consObj.error;
      if (typeof errorFn === "function") {
        errorFn.call(cons, message, ...args);
      }
    }
  }
}

/**
 * Create a Zipkin exporter for sending HexDI spans to Zipkin backend.
 *
 * This function creates a SpanExporter implementation that:
 * 1. Converts HexDI SpanData to OTel ReadableSpan format
 * 2. Attaches resource metadata for service identification
 * 3. Exports spans to Zipkin via JSON v2 API
 *
 * **Zipkin Backend:**
 * - Uses Zipkin's JSON v2 API over HTTP
 * - Default endpoint: http://localhost:9411/api/v2/spans
 * - Requires Zipkin server running (port 9411)
 * - View traces at http://localhost:9411 (Zipkin UI)
 *
 * **Error Handling:**
 * - Export failures are logged but never throw
 * - Allows application to continue despite telemetry issues
 * - Check logs for `[hex-di/tracing-zipkin]` messages
 *
 * @param options - Exporter configuration (URL, service metadata)
 * @returns SpanExporter compatible with HexDI SpanProcessor
 *
 * @remarks
 * - Resource metadata is required for proper service identification in Zipkin UI
 * - Graceful degradation: telemetry failures don't break application
 * - forceFlush and shutdown ensure no data loss during cleanup
 *
 * @example
 * ```typescript
 * // Basic local development setup
 * const exporter = createZipkinExporter({
 *   serviceName: 'my-service',
 * });
 *
 * // Production with custom endpoint
 * const exporter = createZipkinExporter({
 *   url: 'http://zipkin-server:9411/api/v2/spans',
 *   serviceName: 'api-gateway',
 *   serviceVersion: '1.2.3',
 *   deploymentEnvironment: 'production',
 *   serviceNamespace: 'platform',
 *   attributes: {
 *     'deployment.region': 'us-east-1',
 *   },
 * });
 *
 * // Use with SpanProcessor
 * const processor = createBatchSpanProcessor(exporter);
 * const tracer = createTracer({ processor });
 * ```
 */
export function createZipkinExporter(options: ZipkinExporterOptions): SpanExporter {
  const shouldMapAttributes = options.mapSemanticAttributes !== false;

  // Create Resource from service metadata
  const resource = createResource({
    serviceName: options.serviceName,
    serviceVersion: options.serviceVersion,
    deploymentEnvironment: options.deploymentEnvironment,
    serviceNamespace: options.serviceNamespace,
    attributes: options.attributes,
  });

  // Create underlying OpenTelemetry Zipkin exporter
  const zipkinExporter = new ZipkinExporter({
    url: options.url ?? "http://localhost:9411/api/v2/spans",
    headers: options.headers,
  });

  let isShutdown = false;

  return {
    /**
     * Export a batch of HexDI spans to Zipkin backend.
     *
     * Converts HexDI spans to OpenTelemetry format and sends via JSON v2 API.
     * Optionally maps HexDI-specific attributes to OTel semantic conventions.
     * Failures are logged but don't throw to avoid blocking the application.
     *
     * @param spans - Readonly array of completed HexDI spans
     */
    async export(spans: ReadonlyArray<SpanData>): Promise<void> {
      if (isShutdown) {
        return;
      }

      try {
        // Convert HexDI spans to OTel ReadableSpan format with resource
        const readableSpans: ReadableSpan[] = spans.map(hexSpan => {
          // Optionally map HexDI attributes to OTel semantic conventions
          const mappedSpan = shouldMapAttributes
            ? { ...hexSpan, attributes: mapHexDiToOtelAttributes(hexSpan.attributes) }
            : hexSpan;

          return convertToReadableSpan(mappedSpan, resource);
        });

        // Export via underlying Zipkin exporter (callback-based API)
        await new Promise<void>((resolve, reject) => {
          zipkinExporter.export(readableSpans, result => {
            if (result.code === 0) {
              // Success
              resolve();
            } else {
              // Failure - result.error contains details
              reject(new Error(`Zipkin export failed: ${result.error ?? "unknown error"}`));
            }
          });
        });
      } catch (error) {
        // Log but don't throw - telemetry failures shouldn't break the application
        logError("[hex-di/tracing-zipkin] Export failed:", error);
      }
    },

    /**
     * Force immediate export of any buffered spans.
     *
     * Delegates to the underlying Zipkin exporter's flush mechanism.
     */
    async forceFlush(): Promise<void> {
      if (isShutdown) {
        return;
      }

      try {
        await zipkinExporter.forceFlush();
      } catch (error) {
        logError("[hex-di/tracing-zipkin] forceFlush failed:", error);
      }
    },

    /**
     * Shutdown the exporter and release resources.
     *
     * Ensures all buffered spans are exported before cleanup.
     */
    async shutdown(): Promise<void> {
      if (isShutdown) {
        return;
      }

      isShutdown = true;

      try {
        await zipkinExporter.shutdown();
      } catch (error) {
        logError("[hex-di/tracing-zipkin] Shutdown failed:", error);
      }
    },
  };
}
