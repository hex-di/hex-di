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
 * A Tracer that stores spans in memory AND forwards them to a SpanProcessor
 * for export to backends like Jaeger.
 *
 * This is a copy of MemoryTracer's logic, but its onEnd callback feeds
 * completed spans to both a circular buffer (for in-process inspection)
 * and a SpanProcessor (for external export).
 */
class ExportingTracer implements Tracer {
  private readonly _spanStack: Span[] = [];
  private readonly _defaultAttributes: Attributes;
  private readonly _hasDefaultAttributes: boolean;
  private readonly _processor: SpanProcessor;
  private readonly _onSpanEnd: (spanData: SpanData) => void;

  constructor(processor: SpanProcessor, defaultAttributes: Attributes = {}) {
    this._processor = processor;
    this._defaultAttributes = defaultAttributes;
    this._hasDefaultAttributes = Object.keys(defaultAttributes).length > 0;
    this._onSpanEnd = (spanData: SpanData) => {
      this._processor.onEnd(spanData);
    };
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
    span.init(
      name,
      parentContext,
      options?.kind ?? "internal",
      attributes,
      options?.links,
      options?.startTime,
      this._onSpanEnd
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
    } finally {
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
      span.end();
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : String(error));
      span.end();
      throw error;
    } finally {
      this._popSpan(span);
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
