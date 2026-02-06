/**
 * @hex-di/tracing - Distributed Tracing for HexDI
 *
 * Zero-dependency distributed tracing package following hexagonal architecture.
 *
 * Provides:
 * - Port definitions for Tracer, SpanExporter, SpanProcessor
 * - Core tracing types (Span, SpanData, SpanContext, etc.)
 * - W3C Trace Context compatible interfaces
 * - OpenTelemetry-compatible API surface
 *
 * @packageDocumentation
 */

// =============================================================================
// Ports
// =============================================================================

export { TracerPort, SpanExporterPort, SpanProcessorPort } from "./ports/index.js";
export type { Tracer, SpanExporter, SpanProcessor } from "./ports/index.js";

// =============================================================================
// Core Types
// =============================================================================

export type {
  Span,
  SpanData,
  SpanOptions,
  SpanContext,
  Attributes,
  AttributeValue,
  SpanEvent,
  SpanKind,
  SpanStatus,
} from "./types/index.js";
