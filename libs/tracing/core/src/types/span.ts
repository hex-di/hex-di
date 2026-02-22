/**
 * Core span types and interfaces for distributed tracing.
 *
 * Implements OpenTelemetry span API and W3C Trace Context specification
 * for propagating trace context across service boundaries.
 *
 * @packageDocumentation
 */

import type { Attributes, AttributeValue } from "./attributes";
import type { SpanKind, SpanStatus } from "./status";

/**
 * W3C Trace Context identifying a span's position in a distributed trace.
 *
 * Used for trace propagation via HTTP headers (traceparent, tracestate).
 * All spans within a trace share the same traceId.
 *
 * **Format specifications:**
 * - `traceId`: 32 hex characters (16 bytes), globally unique
 * - `spanId`: 16 hex characters (8 bytes), unique within trace
 * - `traceFlags`: 1 byte (0x00 or 0x01), bit 0 indicates sampling
 * - `traceState`: optional vendor-specific data, max 512 chars
 *
 * **Example:**
 * ```typescript
 * const context: SpanContext = {
 *   traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
 *   spanId: '00f067aa0ba902b7',
 *   traceFlags: 0x01, // sampled
 *   traceState: 'vendor1=value1,vendor2=value2'
 * };
 * ```
 *
 * @see https://www.w3.org/TR/trace-context/
 * @public
 */
export interface SpanContext {
  /**
   * Globally unique trace identifier (16 bytes as 32 hex chars).
   * All spans in a trace share this ID.
   */
  readonly traceId: string;

  /**
   * Unique span identifier within the trace (8 bytes as 16 hex chars).
   * Child spans reference their parent's spanId.
   */
  readonly spanId: string;

  /**
   * W3C trace flags (1 byte).
   * Bit 0: sampled flag (0x01 = sampled, 0x00 = not sampled)
   * Bits 1-7: reserved for future use
   */
  readonly traceFlags: number;

  /**
   * Optional vendor-specific trace state (max 512 chars).
   * Format: comma-separated list-members, e.g., 'vendor1=value1,vendor2=value2'
   */
  readonly traceState?: string;
}

/**
 * Configuration options for creating a new span.
 *
 * @public
 */
export interface SpanOptions {
  /**
   * Categorizes the span's role (server, client, internal, etc.).
   * Defaults to 'internal' if not specified.
   */
  readonly kind?: SpanKind;

  /**
   * Initial attributes to attach to the span.
   * Can add more via setAttribute() after creation.
   */
  readonly attributes?: Attributes;

  /**
   * Links to other spans (e.g., follows-from relationships, batched operations).
   * Each link is a SpanContext reference.
   */
  readonly links?: ReadonlyArray<SpanContext>;

  /**
   * Explicit start time in milliseconds since Unix epoch.
   * Defaults to current time if not specified.
   */
  readonly startTime?: number;

  /**
   * If true, this span starts a new trace (no parent).
   * Used for entry points like HTTP servers.
   */
  readonly root?: boolean;
}

/**
 * Event recorded during span execution.
 *
 * Events represent point-in-time occurrences (logs, exceptions, checkpoints).
 * Unlike attributes which describe the span, events describe what happened when.
 *
 * **Example:**
 * ```typescript
 * span.addEvent({
 *   name: 'cache.miss',
 *   time: Date.now(),
 *   attributes: { key: 'user:123' }
 * });
 * ```
 *
 * @public
 */
export interface SpanEvent {
  /** Event name (e.g., 'exception', 'cache.hit', 'retry.attempt') */
  readonly name: string;

  /** Timestamp in milliseconds since Unix epoch */
  readonly time: number;

  /** Optional event-specific attributes */
  readonly attributes?: Attributes;
}

/**
 * Active span interface for recording telemetry.
 *
 * Represents an ongoing operation in the distributed trace.
 * Once ended, the span becomes immutable SpanData.
 *
 * **Lifecycle:**
 * 1. Create span: `tracer.startSpan('operation')`
 * 2. Add context: `span.setAttribute('key', 'value')`
 * 3. Record events: `span.addEvent({ name: 'milestone' })`
 * 4. Handle errors: `span.recordException(error)`
 * 5. Complete: `span.end()`
 *
 * **Thread safety:** Implementations must be safe for concurrent access.
 *
 * @public
 */
export interface Span {
  /**
   * W3C Trace Context for propagation to downstream services.
   * Immutable for the span's lifetime.
   */
  readonly context: SpanContext;

  /**
   * Set a single attribute on the span.
   * Overwrites existing attribute with the same key.
   *
   * @param key - Attribute name (use dot notation: 'http.method')
   * @param value - Attribute value (primitive or homogeneous array)
   */
  setAttribute(key: string, value: AttributeValue): this;

  /**
   * Set multiple attributes at once.
   * More efficient than calling setAttribute() repeatedly.
   *
   * @param attributes - Map of attribute key-value pairs
   */
  setAttributes(attributes: Attributes): this;

  /**
   * Record a point-in-time event during span execution.
   *
   * @param event - Event with name, timestamp, and optional attributes
   */
  addEvent(event: SpanEvent): this;

  /**
   * Set the span's final status.
   * Cannot change from 'ok' to 'error' (status is immutable once set).
   *
   * @param status - 'unset' | 'ok' | 'error'
   */
  setStatus(status: SpanStatus): this;

  /**
   * Record an exception that occurred during span execution.
   * Automatically sets status to 'error' and adds exception event.
   *
   * @param exception - Error object or error message
   */
  recordException(exception: Error | string): this;

  /**
   * Complete the span and record its end time.
   * No further modifications allowed after calling end().
   *
   * @param endTime - Optional explicit end time (defaults to current time)
   */
  end(endTime?: number): void;

  /**
   * Check if span is still active (not yet ended).
   * Returns false after end() is called.
   */
  isRecording(): boolean;
}

/**
 * Immutable snapshot of a completed span.
 *
 * Created when span.end() is called. Used for exporting to tracing backends
 * (Jaeger, Zipkin, etc.) via OpenTelemetry exporters.
 *
 * @public
 */
export interface SpanData {
  /** Span's W3C Trace Context */
  readonly context: SpanContext;

  /** Parent span's ID, or undefined if root span */
  readonly parentSpanId?: string;

  /** Operation name (e.g., 'GET /users/:id', 'db.query', 'validateInput') */
  readonly name: string;

  /** Span kind (server, client, internal, etc.) */
  readonly kind: SpanKind;

  /** Start time in milliseconds since Unix epoch */
  readonly startTime: number;

  /** End time in milliseconds since Unix epoch */
  readonly endTime: number;

  /** Final span status */
  readonly status: SpanStatus;

  /** All attributes attached during span lifetime */
  readonly attributes: Attributes;

  /** All events recorded during span lifetime */
  readonly events: ReadonlyArray<SpanEvent>;

  /** Links to other spans */
  readonly links: ReadonlyArray<SpanContext>;
}
