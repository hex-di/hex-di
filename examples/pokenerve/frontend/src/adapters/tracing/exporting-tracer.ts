import type {
  Tracer,
  Span,
  SpanOptions,
  SpanContext,
  SpanData,
  Attributes,
  AttributeValue,
  SpanProcessor,
} from "@hex-di/tracing";
import { MemorySpan } from "@hex-di/tracing";

/**
 * A Tracer that forwards completed spans to a SpanProcessor for export
 * to backends like Jaeger, while keeping the same MemorySpan mechanics.
 *
 * Spans are automatically removed from the internal context stack when
 * they end (via span.end()), ensuring correct parent-child relationships
 * regardless of whether startSpan() or withSpan() is used.
 */
class ExportingTracer implements Tracer {
  private readonly _spanStack: Span[] = [];
  private readonly _defaultAttributes: Attributes;
  private readonly _hasDefaultAttributes: boolean;
  private readonly _processor: SpanProcessor;

  constructor(processor: SpanProcessor, defaultAttributes: Attributes = {}) {
    this._processor = processor;
    this._defaultAttributes = defaultAttributes;
    this._hasDefaultAttributes = Object.keys(defaultAttributes).length > 0;
  }

  startSpan(name: string, options?: SpanOptions): Span {
    const parentContext = options?.root ? undefined : this.getSpanContext();

    let attributes: Attributes | undefined;
    if (this._hasDefaultAttributes) {
      const merged: Record<string, AttributeValue> = {};
      const defaults = this._defaultAttributes;
      for (const key in defaults) {
        merged[key] = defaults[key];
      }
      const optAttrs = options?.attributes;
      if (optAttrs !== undefined) {
        for (const key in optAttrs) {
          merged[key] = optAttrs[key];
        }
      }
      attributes = merged;
    } else {
      attributes = options?.attributes;
    }

    const span = new MemorySpan();

    // Per-span onEnd callback that pops the span from the context stack.
    // Without this, spans created via startSpan() directly (as used by
    // instrumentContainer hooks) would leak on the stack, causing every
    // subsequent span to falsely nest as a child of the previous one.
    const onEnd = (spanData: SpanData): void => {
      this._popSpan(span);
      this._processor.onEnd(spanData);
    };

    span.init(
      name,
      parentContext,
      options?.kind ?? "internal",
      attributes,
      options?.links,
      options?.startTime,
      onEnd
    );

    this._spanStack.push(span);
    return span;
  }

  withSpan<T>(name: string, fn: (span: Span) => T, options?: SpanOptions): T {
    const span = this.startSpan(name, options);
    try {
      const result = fn(span);
      span.end();
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : String(error));
      span.end();
      throw error;
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
      span.end();
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : String(error));
      span.end();
      throw error;
    }
  }

  getActiveSpan(): Span | undefined {
    const len = this._spanStack.length;
    if (len === 0) return undefined;
    return this._spanStack[len - 1];
  }

  getSpanContext(): SpanContext | undefined {
    return this.getActiveSpan()?.context;
  }

  withAttributes(attributes: Attributes): Tracer {
    const merged: Record<string, AttributeValue> = {};
    for (const key in this._defaultAttributes) {
      merged[key] = this._defaultAttributes[key];
    }
    for (const key in attributes) {
      merged[key] = attributes[key];
    }
    return new ExportingTracer(this._processor, merged);
  }

  isEnabled(): boolean {
    return true;
  }

  private _popSpan(span: Span): void {
    const stack = this._spanStack;
    const len = stack.length;
    if (len > 0 && stack[len - 1] === span) {
      stack.pop();
      return;
    }
    for (let i = len - 2; i >= 0; i--) {
      if (stack[i] === span) {
        stack.splice(i, 1);
        return;
      }
    }
  }
}

function createExportingTracer(
  processor: SpanProcessor,
  defaultAttributes?: Attributes
): ExportingTracer {
  return new ExportingTracer(processor, defaultAttributes);
}

export { createExportingTracer, ExportingTracer };
