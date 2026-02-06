/**
 * @hex-di/tracing-jaeger - Jaeger Exporter for HexDI Distributed Tracing
 *
 * This package provides a lightweight adapter for exporting HexDI traces to
 * Jaeger backend using the Jaeger Thrift protocol over HTTP. It bridges HexDI's
 * tracing system with Jaeger's powerful trace visualization and analysis tools.
 *
 * **Features:**
 * - Direct export to Jaeger backend using native Thrift protocol
 * - Automatic span conversion from HexDI to OpenTelemetry format
 * - Resource metadata for service identification in Jaeger UI
 * - Graceful error handling (telemetry failures never break application)
 *
 * **Jaeger Setup:**
 * - Default endpoint: http://localhost:14268/api/traces (collector)
 * - View traces at: http://localhost:16686 (Jaeger UI)
 * - Requires Jaeger backend running (see: https://www.jaegertracing.io/docs/getting-started/)
 *
 * **Quick Start:**
 * ```typescript
 * import { createJaegerExporter } from '@hex-di/tracing-jaeger';
 * import { createBatchSpanProcessor } from '@hex-di/tracing-otel';
 *
 * const exporter = createJaegerExporter({
 *   serviceName: 'my-service',
 *   deploymentEnvironment: 'development',
 * });
 *
 * const processor = createBatchSpanProcessor(exporter);
 * // Use processor with your tracer
 * ```
 *
 * **Protocol:**
 * This exporter uses Jaeger's native Thrift protocol over HTTP, which is
 * optimized for Jaeger's internal span model. For OTLP-compatible backends,
 * use `@hex-di/tracing-otel` instead.
 *
 * @packageDocumentation
 * @module @hex-di/tracing-jaeger
 */

export { createJaegerExporter } from "./exporter.js";
export type { JaegerExporterOptions } from "./exporter.js";
