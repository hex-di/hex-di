/**
 * ConsoleTracer implementation for human-readable development debugging.
 *
 * Outputs formatted trace spans to console.log with colorization, hierarchy
 * visualization, and duration filtering.
 *
 * @packageDocumentation
 */

import type { Tracer } from "../../ports/tracer.js";
import type { Span, SpanContext, SpanOptions, SpanData, SpanEvent } from "../../types/span.js";
import type { Attributes, AttributeValue } from "../../types/attributes.js";
import type { SpanKind, SpanStatus } from "../../types/status.js";
import type { ConsoleTracerOptions } from "./formatter.js";
import { formatSpan } from "./formatter.js";
import { generateTraceId, generateSpanId } from "../../utils/id-generation.js";
import { getStdoutTTY, getConsole } from "../../utils/globals.js";

/**
 * Span implementation for ConsoleTracer.
 *
 * Captures span data and invokes onEnd callback when span completes.
 *
 * @internal
 */
class ConsoleSpan implements Span {
  readonly context: SpanContext;
  private readonly _parentSpanId?: string;
  private readonly _name: string;
  private readonly _kind: SpanKind;
  private readonly _startTime: number;
  private readonly _attributes: Record<string, AttributeValue>;
  private readonly _events: SpanEvent[];
  private readonly _links: ReadonlyArray<SpanContext>;
  private _status: SpanStatus;
  private _recording: boolean;
  private readonly _onEnd: (spanData: SpanData) => void;

  constructor(
    name: string,
    options: SpanOptions | undefined,
    parentContext: SpanContext | undefined,
    defaultAttributes: Attributes,
    onEnd: (spanData: SpanData) => void
  ) {
    this._name = name;
    this._kind = options?.kind ?? "internal";
    this._startTime = options?.startTime ?? Date.now();
    this._attributes = { ...defaultAttributes, ...options?.attributes };
    this._events = [];
    this._links = options?.links ?? [];
    this._status = "unset";
    this._recording = true;
    this._onEnd = onEnd;

    // Generate or reuse trace context
    if (options?.root || !parentContext) {
      // New trace
      this.context = {
        traceId: generateTraceId(),
        spanId: generateSpanId(),
        traceFlags: 0x01, // sampled
      };
      this._parentSpanId = undefined;
    } else {
      // Continue existing trace
      this.context = {
        traceId: parentContext.traceId,
        spanId: generateSpanId(),
        traceFlags: parentContext.traceFlags,
        traceState: parentContext.traceState,
      };
      this._parentSpanId = parentContext.spanId;
    }
  }

  setAttribute(key: string, value: AttributeValue): this {
    if (this._recording) {
      this._attributes[key] = value;
    }
    return this;
  }

  setAttributes(attributes: Attributes): this {
    if (this._recording) {
      Object.assign(this._attributes, attributes);
    }
    return this;
  }

  addEvent(event: SpanEvent): this {
    if (this._recording) {
      this._events.push(event);
    }
    return this;
  }

  setStatus(status: SpanStatus): this {
    if (this._recording && this._status !== "ok") {
      // Status is immutable once set to 'ok'
      this._status = status;
    }
    return this;
  }

  recordException(exception: Error | string): this {
    if (!this._recording) return this;

    const errorMessage = exception instanceof Error ? exception.message : exception;
    const errorStack = exception instanceof Error ? exception.stack : undefined;

    this.setStatus("error");
    this.setAttribute("error.message", errorMessage);
    if (errorStack) {
      this.setAttribute("error.stack", errorStack);
    }

    this.addEvent({
      name: "exception",
      time: Date.now(),
      attributes: {
        "exception.type": exception instanceof Error ? exception.constructor.name : "string",
        "exception.message": errorMessage,
      },
    });

    return this;
  }

  end(endTime?: number): void {
    if (!this._recording) return;

    this._recording = false;

    const spanData: SpanData = {
      context: this.context,
      parentSpanId: this._parentSpanId,
      name: this._name,
      kind: this._kind,
      startTime: this._startTime,
      endTime: endTime ?? Date.now(),
      status: this._status,
      attributes: this._attributes,
      events: this._events,
      links: this._links,
    };

    this._onEnd(spanData);
  }

  isRecording(): boolean {
    return this._recording;
  }
}

/**
 * Stack entry tracking span and its depth.
 *
 * @internal
 */
interface StackEntry {
  span: ConsoleSpan;
  depth: number;
}

/**
 * ConsoleTracer implementation for development debugging.
 *
 * Outputs human-readable trace spans to console with optional colorization,
 * timestamps, and hierarchy visualization. Useful for local debugging and
 * understanding application flow.
 *
 * @example
 * ```typescript
 * const tracer = new ConsoleTracer({
 *   colorize: true,
 *   includeTimestamps: true,
 *   minDurationMs: 1, // Only show spans >= 1ms
 *   indent: true,
 * });
 *
 * tracer.withSpan('operation', (span) => {
 *   span.setAttribute('user.id', '123');
 *   // ... do work
 * });
 * ```
 *
 * Output:
 * ```
 * [TRACE] operation (12.3ms) ✓ 2024-01-15T10:30:45.123Z
 *    {user.id=123}
 * ```
 *
 * @public
 */
export class ConsoleTracer implements Tracer {
  private readonly _options: Required<ConsoleTracerOptions>;
  private readonly _spanStack: StackEntry[];
  private readonly _defaultAttributes: Attributes;

  constructor(options: ConsoleTracerOptions = {}, defaultAttributes: Attributes = {}) {
    this._options = {
      colorize: options.colorize ?? this._detectTTY(),
      includeTimestamps: options.includeTimestamps ?? true,
      minDurationMs: options.minDurationMs ?? 0,
      indent: options.indent ?? true,
    };
    this._spanStack = [];
    this._defaultAttributes = defaultAttributes;
  }

  /**
   * Detect if running in a TTY terminal for colorization.
   *
   * @internal
   */
  private _detectTTY(): boolean {
    return getStdoutTTY();
  }

  startSpan(name: string, options?: SpanOptions): Span {
    const parentContext = this.getSpanContext();
    const currentDepth = this._spanStack.length;

    const span = new ConsoleSpan(name, options, parentContext, this._defaultAttributes, spanData =>
      this._onSpanEnd(spanData, currentDepth)
    );

    this._spanStack.push({ span, depth: currentDepth });
    return span;
  }

  withSpan<T>(name: string, fn: (span: Span) => T, options?: SpanOptions): T {
    const span = this.startSpan(name, options);
    try {
      const result = fn(span);
      span.setStatus("ok");
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : String(error));
      throw error;
    } finally {
      span.end();
      this._popSpan(span);
    }
  }

  async withSpanAsync<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    options?: SpanOptions
  ): Promise<T> {
    const span = this.startSpan(name, options);
    try {
      const result = await fn(span);
      span.setStatus("ok");
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : String(error));
      throw error;
    } finally {
      span.end();
      this._popSpan(span);
    }
  }

  getActiveSpan(): Span | undefined {
    const entry = this._spanStack[this._spanStack.length - 1];
    return entry?.span;
  }

  getSpanContext(): SpanContext | undefined {
    const span = this.getActiveSpan();
    return span?.context;
  }

  withAttributes(attributes: Attributes): Tracer {
    const mergedAttributes = { ...this._defaultAttributes, ...attributes };
    return new ConsoleTracer(this._options, mergedAttributes);
  }

  /**
   * Indicates whether this tracer is actively recording spans.
   *
   * ConsoleTracer always returns true (records spans for console output).
   *
   * @returns true (console tracer always records)
   */
  isEnabled(): boolean {
    return true;
  }

  /**
   * Handle span end event - format and output to console.
   *
   * @param spanData - Completed span data
   * @param depth - Nesting depth for indentation
   *
   * @internal
   */
  private _onSpanEnd(spanData: SpanData, depth: number): void {
    const output = formatSpan(spanData, depth, this._options);
    if (output) {
      this._logToConsole(output);
    }
  }

  /**
   * Output to console.log via globalThis for environment independence.
   *
   * @param message - Message to log
   *
   * @internal
   */
  private _logToConsole(message: string): void {
    const cons = getConsole();
    if (cons) {
      cons.log(message);
    }
  }

  /**
   * Remove span from stack after it ends.
   *
   * @param span - Span to remove
   *
   * @internal
   */
  private _popSpan(span: Span): void {
    const index = this._spanStack.findIndex(entry => entry.span === span);
    if (index !== -1) {
      this._spanStack.splice(index, 1);
    }
  }
}
