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
  SpanOptions,
  SpanEvent,
  SpanData,
  SpanStatus,
  Attributes,
  AttributeValue,
  SpanKind,
} from "../../types/index.js";
import { generateTraceId, generateSpanId } from "../../utils/index.js";

/**
 * MemorySpan - In-memory implementation of the Span interface.
 *
 * Collects all span data in memory for testing and debugging purposes.
 * Calls the provided onEnd callback with SpanData when the span ends.
 *
 * **Object pooling:** Spans are designed for reuse via object pooling.
 * Use init() to initialize and reset() to prepare for pool return.
 *
 * **Thread safety:** Not thread-safe. Designed for single-threaded test environments.
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
  private _parentSpanId?: string;

  /** Links to other spans */
  private _links: SpanContext[] = [];

  /** Mutable attributes storage (lazy-allocated) */
  private _attributes?: Map<string, AttributeValue>;

  /** Recorded events (lazy-allocated) */
  private _events?: SpanEvent[];

  /** Current span status */
  private _status: SpanStatus = "unset";

  /** Whether the span is still recording */
  private _recording = false;

  /** Callback invoked when span ends */
  private _onEnd: (spanData: SpanData) => void = () => {};

  /**
   * Initialize the span with new data.
   *
   * Called by the tracer when acquiring a span from the pool or creating new.
   *
   * @param name - Human-readable span name
   * @param parentContext - Optional parent span context for hierarchy
   * @param options - Optional span configuration
   * @param onEnd - Callback invoked with SpanData when span ends
   * @internal
   */
  init(
    name: string,
    parentContext: SpanContext | undefined,
    options: SpanOptions | undefined,
    onEnd: (spanData: SpanData) => void
  ): void {
    this._name = name;
    this._onEnd = onEnd;
    this._parentSpanId = parentContext?.spanId;
    this._kind = options?.kind ?? "internal";
    this._links = options?.links ? [...options.links] : [];
    this._status = "unset";
    this._recording = true;

    // Initialize with options attributes if provided (lazy allocation)
    if (options?.attributes && Object.keys(options.attributes).length > 0) {
      if (!this._attributes) {
        this._attributes = new Map();
      } else {
        this._attributes.clear();
      }
      for (const [key, value] of Object.entries(options.attributes)) {
        this._attributes.set(key, value);
      }
    }

    // Generate span context (use parent's traceId if available)
    const traceId = parentContext?.traceId ?? generateTraceId();
    const spanId = generateSpanId();
    const traceFlags = parentContext?.traceFlags ?? 0x01; // Default to sampled
    const traceState = parentContext?.traceState;

    this.context = {
      traceId,
      spanId,
      traceFlags,
      traceState,
    };

    // Set start time (use explicit time or current time)
    this._startTime = options?.startTime ?? Date.now();
  }

  /**
   * Reset the span to clean state for pool reuse.
   *
   * Called by the object pool after a span is released.
   *
   * @internal
   */
  reset(): void {
    this._name = "";
    this._parentSpanId = undefined;
    this._kind = "internal";
    this._links = [];
    this._status = "unset";
    this._recording = false;
    this._startTime = 0;
    this._onEnd = () => {};

    // Clear lazy-allocated structures
    if (this._attributes) {
      this._attributes.clear();
    }
    if (this._events) {
      this._events.length = 0;
    }

    // Reset context
    this.context = {
      traceId: "",
      spanId: "",
      traceFlags: 0x01,
    };
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
      if (!this._attributes) {
        this._attributes = new Map();
      }
      this._attributes.set(key, value);
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
      if (!this._attributes) {
        this._attributes = new Map();
      }
      for (const [key, value] of Object.entries(attributes)) {
        this._attributes.set(key, value);
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
      if (!this._events) {
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
   * The tracer is responsible for releasing the span back to the pool.
   *
   * @param endTime - Optional explicit end time (defaults to current time)
   */
  end(endTime?: number): void {
    if (!this._recording) {
      return;
    }

    this._recording = false;
    const finalEndTime = endTime ?? Date.now();

    const spanData = this.toSpanData(finalEndTime);
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
  private toSpanData(endTime: number): SpanData {
    // Convert Map to plain object for attributes (only if allocated)
    const attributes: Record<string, AttributeValue> = {};
    if (this._attributes) {
      for (const [key, value] of this._attributes.entries()) {
        attributes[key] = value;
      }
    }

    return {
      context: this.context,
      parentSpanId: this._parentSpanId,
      name: this._name,
      kind: this._kind,
      startTime: this._startTime,
      endTime,
      status: this._status,
      attributes,
      events: this._events ? [...this._events] : [],
      links: [...this._links],
    };
  }
}
