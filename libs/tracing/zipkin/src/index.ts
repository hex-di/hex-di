/**
 * @hex-di/tracing-zipkin - Zipkin Exporter for HexDI Distributed Tracing
 *
 * This package provides a lightweight adapter for exporting HexDI traces to
 * Zipkin backend using the Zipkin JSON v2 API. It bridges HexDI's tracing
 * system with Zipkin's powerful trace visualization and analysis tools.
 *
 * **Features:**
 * - Direct export to Zipkin backend using JSON v2 API
 * - Automatic span conversion from HexDI to OpenTelemetry format
 * - Resource metadata for service identification in Zipkin UI
 * - Graceful error handling (telemetry failures never break application)
 *
 * **Zipkin Setup:**
 * - Default endpoint: http://localhost:9411/api/v2/spans
 * - View traces at: http://localhost:9411 (Zipkin UI)
 * - Requires Zipkin backend running (see: https://zipkin.io/pages/quickstart)
 *
 * **Quick Start:**
 * ```typescript
 * import { createZipkinExporter } from '@hex-di/tracing-zipkin';
 * import { createBatchSpanProcessor } from '@hex-di/tracing-otel';
 *
 * const exporter = createZipkinExporter({
 *   serviceName: 'my-service',
 *   deploymentEnvironment: 'development',
 * });
 *
 * const processor = createBatchSpanProcessor(exporter);
 * // Use processor with your tracer
 * ```
 *
 * **Protocol:**
 * This exporter uses Zipkin's JSON v2 API, which is the standard Zipkin
 * protocol. For OTLP-compatible backends, use `@hex-di/tracing-otel` instead.
 *
 * @packageDocumentation
 * @module @hex-di/tracing-zipkin
 */

export { createZipkinExporter } from "./exporter.js";
export type { ZipkinExporterOptions } from "./exporter.js";
