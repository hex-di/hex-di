/**
 * Core tracing type definitions.
 *
 * Placeholder types for span operations - full implementations
 * will be provided in subsequent plans.
 *
 * @packageDocumentation
 */

/**
 * Represents an active span in a distributed trace.
 *
 * Spans track individual operations within a trace, forming a tree structure
 * that captures the execution flow across service boundaries.
 *
 * @remarks
 * Full implementation defined in Plan 02.
 */
export interface Span {
  /** Unique identifier for this span */
  readonly spanId: string;
  /** Trace ID this span belongs to */
  readonly traceId: string;
  /** Records an event at a specific point in the span */
  addEvent(name: string, attributes?: Attributes): void;
  /** Sets an attribute on the span */
  setAttribute(key: string, value: AttributeValue): void;
  /** Sets multiple attributes on the span */
  setAttributes(attributes: Attributes): void;
  /** Marks the span as errored */
  setStatus(status: SpanStatus): void;
  /** Ends the span */
  end(endTime?: number): void;
}

/**
 * Immutable snapshot of a completed span for export.
 *
 * @remarks
 * Full implementation defined in Plan 02.
 */
export interface SpanData {
  readonly spanId: string;
  readonly traceId: string;
  readonly parentSpanId?: string;
  readonly name: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly attributes: Attributes;
  readonly events: readonly SpanEvent[];
  readonly status: SpanStatus;
}

/**
 * Configuration options for starting a new span.
 */
export interface SpanOptions {
  /** Attributes to set on the span at creation */
  readonly attributes?: Attributes;
  /** Parent span context (defaults to active span if not provided) */
  readonly parent?: SpanContext;
  /** Link to related spans in other traces */
  readonly links?: readonly SpanLink[];
  /** Span kind (client, server, internal, producer, consumer) */
  readonly kind?: SpanKind;
}

/**
 * W3C Trace Context propagation data.
 *
 * @remarks
 * Full implementation defined in Plan 02.
 */
export interface SpanContext {
  readonly traceId: string;
  readonly spanId: string;
  readonly traceFlags: number;
  readonly traceState?: string;
}

/**
 * Key-value attributes for spans and events.
 */
export interface Attributes {
  readonly [key: string]: AttributeValue;
}

/**
 * Valid attribute value types per OTel spec.
 */
export type AttributeValue = string | number | boolean | string[] | number[] | boolean[];

/**
 * Events recorded during span execution.
 */
export interface SpanEvent {
  readonly name: string;
  readonly timestamp: number;
  readonly attributes?: Attributes;
}

/**
 * Links to related spans (for batch operations, retries, etc.).
 */
export interface SpanLink {
  readonly context: SpanContext;
  readonly attributes?: Attributes;
}

/**
 * Span kind per OTel semantic conventions.
 */
export type SpanKind = "internal" | "server" | "client" | "producer" | "consumer";

/**
 * Span status per OTel spec.
 */
export interface SpanStatus {
  readonly code: "unset" | "ok" | "error";
  readonly message?: string;
}
