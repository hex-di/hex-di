/**
 * @hex-di/tracing-otel - OpenTelemetry Bridge for HexDI Distributed Tracing
 *
 * This package bridges HexDI's lightweight tracing system with OpenTelemetry's
 * ecosystem of backends and exporters. It converts HexDI SpanData to OTel's
 * standard ReadableSpan format, enabling export to any OTel-compatible backend.
 *
 * **Features:**
 * - SpanData → ReadableSpan conversion without type casts
 * - Time conversion (milliseconds → HrTime)
 * - Span kind and status mapping
 * - Attribute, event, and link preservation
 *
 * **Upcoming in future plans:**
 * - BatchSpanProcessor and SimpleSpanProcessor
 * - OTLP HTTP exporter adapter
 * - Resource metadata builders
 * - Semantic convention mappers
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

// Re-export useful OTel types for consumers
export type { ReadableSpan } from "@opentelemetry/sdk-trace-base";
export { SpanKind, SpanStatusCode } from "@opentelemetry/api";
