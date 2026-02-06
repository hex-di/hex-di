/**
 * Core tracing types following OpenTelemetry and W3C Trace Context specifications.
 *
 * @packageDocumentation
 */

// Span types and interfaces
export type { Span, SpanContext, SpanData, SpanOptions, SpanEvent } from "./span";

// Attribute types
export type { AttributeValue, Attributes } from "./attributes";

// Status and kind types
export type { SpanKind, SpanStatus } from "./status";
