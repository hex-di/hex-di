/**
 * MemorySpan implementation for testing and debugging.
 *
 * Implements the Span interface with in-memory storage for all telemetry data.
 * Designed for unit tests and development environments where full tracing
 * backends are not available.
 *
 * @packageDocumentation
 */

import type {
  Span,
  SpanContext,
  SpanEvent,
  SpanData,
  SpanStatus,
  Attributes,
  AttributeValue,
  SpanKind,
} from "../../types/index.js";
import { generateTraceId, generateSpanId } from "../../utils/index.js";

/** Shared empty arrays to avoid allocating new ones per span */
const EMPTY_LINKS: ReadonlyArray<SpanContext> = Object.freeze([]);
const EMPTY_EVENTS: ReadonlyArray<SpanEvent> = Object.freeze([]);

/** No-op end callback to avoid null checks */
const NOOP_END: (spanData: SpanData) => void = () => {};

/**
 * MemorySpan - In-memory implementation of the Span interface.
 *
 * Collects all span data in memory for testing and debugging purposes.
 * Calls the provided onEnd callback with SpanData when the span ends.
 *
 * All fields are initialized in the constructor to ensure a monomorphic
 * V8 hidden class for optimal JIT performance.
 *
 * **Attribute optimization:** Attributes are stored as a mutable plain object.
 * Initial attributes from init() are copied in directly, and setAttribute()
 * writes to the same object. toSpanData() passes the reference directly,
 * avoiding any Map ↔ object conversion.
 *
 * @public
 */
export class MemorySpan implements Span {
  /** W3C Trace Context for this span */
  context: SpanContext = {
    traceId: "",
    spanId: "",
    traceFlags: 0x01,
  };

  /** Span start time in milliseconds since Unix epoch */
  private _startTime = 0;

  /** Span name (operation identifier) */
  private _name = "";

  /** Span kind (internal, server, client, etc.) */
  private _kind: SpanKind = "internal";

  /** Parent span ID if this is a child span */
  private _parentSpanId: string | undefined = undefined;

  /** Links to other spans */
  private _links: ReadonlyArray<SpanContext> = EMPTY_LINKS;

  /** Mutable attributes storage as plain object (no Map overhead) */
  private _attributes: Record<string, AttributeValue> | undefined = undefined;

  /** Recorded events (lazy-allocated) */
  private _events: SpanEvent[] | undefined = undefined;

  /** Current span status */
  private _status: SpanStatus = "unset";

  /** Whether the span is still recording */
  private _recording = false;

  /** Callback invoked when span ends */
  private _onEnd: (spanData: SpanData) => void = NOOP_END;

  /**
   * Initialize the span with new data.
   *
   * Called by the tracer when creating a new span. Accepts individual
   * parameters instead of an options object to avoid intermediate allocations.
   *
   * @param name - Human-readable span name
   * @param parentContext - Optional parent span context for hierarchy
   * @param kind - Span kind (defaults to "internal")
   * @param attributes - Optional initial attributes (passed by reference when possible)
   * @param links - Optional span links
   * @param startTime - Optional explicit start time
   * @param onEnd - Callback invoked with SpanData when span ends
   * @internal
   */
  init(
    name: string,
    parentContext: SpanContext | undefined,
    kind: SpanKind,
    attributes: Attributes | undefined,
    links: ReadonlyArray<SpanContext> | undefined,
    startTime: number | undefined,
    onEnd: (spanData: SpanData) => void
  ): void {
    this._name = name;
    this._onEnd = onEnd;
    this._parentSpanId = parentContext?.spanId;
    this._kind = kind;
    this._links = links ?? EMPTY_LINKS;
    this._status = "unset";
    this._recording = true;
    this._events = undefined;

    // Store attributes: use provided object directly as mutable record
    // (Attributes is Readonly<Record<...>> at compile time but we need mutable access)
    // We cast-free approach: create new object and copy, or set to undefined
    if (attributes !== undefined) {
      // Copy into a fresh mutable object
      const mutable: Record<string, AttributeValue> = {};
      for (const key in attributes) {
        mutable[key] = attributes[key];
      }
      this._attributes = mutable;
    } else {
      this._attributes = undefined;
    }

    // Generate span context (use parent's traceId if available)
    const traceId = parentContext?.traceId ?? generateTraceId();
    const spanId = generateSpanId();

    this.context = {
      traceId,
      spanId,
      traceFlags: parentContext?.traceFlags ?? 0x01,
      traceState: parentContext?.traceState,
    };

    // Set start time (use explicit time or current time)
    this._startTime = startTime ?? Date.now();
  }

  /**
   * Set a single attribute on the span.
   *
   * @param key - Attribute name (use dot notation: 'http.method')
   * @param value - Attribute value
   * @returns this for method chaining
   */
  setAttribute(key: string, value: AttributeValue): this {
    if (this._recording) {
      if (this._attributes === undefined) {
        this._attributes = {};
      }
      this._attributes[key] = value;
    }
    return this;
  }

  /**
   * Set multiple attributes at once.
   *
   * @param attributes - Map of attribute key-value pairs
   * @returns this for method chaining
   */
  setAttributes(attributes: Attributes): this {
    if (this._recording) {
      if (this._attributes === undefined) {
        this._attributes = {};
      }
      for (const key in attributes) {
        this._attributes[key] = attributes[key];
      }
    }
    return this;
  }

  /**
   * Record a point-in-time event during span execution.
   *
   * @param event - Event with name, timestamp, and optional attributes
   * @returns this for method chaining
   */
  addEvent(event: SpanEvent): this {
    if (this._recording) {
      if (this._events === undefined) {
        this._events = [];
      }
      this._events.push(event);
    }
    return this;
  }

  /**
   * Set the span's final status.
   *
   * @param status - 'unset' | 'ok' | 'error'
   * @returns this for method chaining
   */
  setStatus(status: SpanStatus): this {
    if (this._recording) {
      this._status = status;
    }
    return this;
  }

  /**
   * Record an exception that occurred during span execution.
   * Automatically sets status to 'error' and adds exception event.
   *
   * @param exception - Error object or error message
   * @returns this for method chaining
   */
  recordException(exception: Error | string): this {
    if (!this._recording) {
      return this;
    }

    this.setStatus("error");

    const exceptionMessage = typeof exception === "string" ? exception : exception.message;
    const exceptionType = typeof exception === "string" ? "Error" : exception.constructor.name;

    this.addEvent({
      name: "exception",
      time: Date.now(),
      attributes: {
        "exception.type": exceptionType,
        "exception.message": exceptionMessage,
      },
    });

    return this;
  }

  /**
   * Complete the span and record its end time.
   * No further modifications allowed after calling end().
   *
   * Calls the onEnd callback with immutable SpanData snapshot.
   *
   * @param endTime - Optional explicit end time (defaults to current time)
   */
  end(endTime?: number): void {
    if (!this._recording) {
      return;
    }

    this._recording = false;
    const finalEndTime = endTime ?? Date.now();

    const spanData = this._toSpanData(finalEndTime);
    this._onEnd(spanData);
  }

  /**
   * Check if span is still active (not yet ended).
   *
   * @returns true if span is recording, false after end() is called
   */
  isRecording(): boolean {
    return this._recording;
  }

  /**
   * Convert span to immutable SpanData snapshot.
   *
   * @param endTime - End time in milliseconds since Unix epoch
   * @returns Immutable span data
   * @internal
   */
  private _toSpanData(endTime: number): SpanData {
    return {
      context: this.context,
      parentSpanId: this._parentSpanId,
      name: this._name,
      kind: this._kind,
      startTime: this._startTime,
      endTime,
      status: this._status,
      attributes: this._attributes ?? {},
      events: this._events ?? EMPTY_EVENTS,
      links: this._links,
    };
  }
}
