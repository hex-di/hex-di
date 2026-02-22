/**
 * @hex-di/tracing-otel - OpenTelemetry Bridge for HexDI Distributed Tracing
 *
 * This package bridges HexDI's lightweight tracing system with OpenTelemetry's
 * ecosystem of backends and exporters. It provides the universal adapter for
 * exporting HexDI traces to any OpenTelemetry-compatible backend.
 *
 * **Features:**
 * - SpanData → ReadableSpan conversion without type casts
 * - Time conversion (milliseconds → HrTime)
 * - Span kind and status mapping
 * - Attribute, event, and link preservation
 * - Resource metadata builder for service identification
 * - Semantic convention mapper (HexDI → OTel attributes)
 * - BatchSpanProcessor for efficient batching
 * - SimpleSpanProcessor for immediate export
 * - OTLP HTTP exporter for universal backend support
 *
 * **Upcoming in future plans:**
 * - Backend-specific packages (Jaeger, Zipkin, DataDog)
 *
 * @packageDocumentation
 * @module @hex-di/tracing-otel
 */

// Core conversion utilities
export { convertToReadableSpan } from "./adapters/span-adapter.js";

export {
  convertSpanKind,
  convertSpanStatus,
  convertToHrTime,
  convertSpanEvent,
  convertSpanLink,
} from "./adapters/types.js";

// Processors
export { createBatchSpanProcessor } from "./processors/batch.js";
export type { BatchSpanProcessorWithMetrics } from "./processors/batch.js";
export { createSimpleSpanProcessor } from "./processors/simple.js";
export type { BatchSpanProcessorOptions, SimpleSpanProcessorOptions } from "./processors/types.js";

// Exporters
export { createOtlpHttpExporter } from "./exporters/otlp-http.js";
export type { OtlpHttpExporterOptions } from "./exporters/types.js";

// Resource metadata
export { createResource } from "./resources/resource.js";
export type { ResourceConfig } from "./resources/resource.js";

// Semantic conventions
export { mapHexDiToOtelAttributes } from "./semantic-conventions/mapper.js";

// Re-export useful OTel types for consumers
export type { ReadableSpan } from "@opentelemetry/sdk-trace-base";
export { SpanKind, SpanStatusCode } from "@opentelemetry/api";
