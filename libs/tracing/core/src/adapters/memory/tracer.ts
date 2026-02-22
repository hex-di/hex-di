/**
 * MemoryTracer implementation for testing and debugging.
 *
 * Implements the Tracer interface with in-memory span collection.
 * Stores all completed spans in a flat array for test assertions.
 *
 * @packageDocumentation
 */

import type { Tracer } from "../../ports/tracer.js";
import type {
  Span,
  SpanOptions,
  SpanContext,
  SpanData,
  Attributes,
  AttributeValue,
} from "../../types/index.js";
import { MemorySpan } from "./span.js";

/**
 * Options for creating a MemoryTracer.
 *
 * @public
 */
export interface MemoryTracerOptions {
  /** Maximum spans to retain (FIFO eviction). @default 10000 */
  readonly maxSpans?: number;
  /** Default attributes applied to all spans. @default {} */
  readonly defaultAttributes?: Attributes;
  /**
   * Callback invoked when a span is evicted due to buffer overflow.
   * Receives the evicted span data and the running total of dropped spans.
   */
  readonly onDrop?: (spanData: SpanData, droppedCount: number) => void;
}

/**
 * MemoryTracer - In-memory implementation of the Tracer interface.
 *
 * Collects all completed spans in memory for testing and debugging.
 * Provides getCollectedSpans() and clear() methods for test assertions.
 *
 * **Features:**
 * - Flat span storage (no tree structure)
 * - Parent-child tracking via parentSpanId
 * - 10k span limit with FIFO eviction
 * - Active span stack for context propagation
 *
 * **Usage:**
 * ```typescript
 * const tracer = createMemoryTracer();
 *
 * tracer.withSpan('operation', (span) => {
 *   span.setAttribute('key', 'value');
 * });
 *
 * const spans = tracer.getCollectedSpans();
 * expect(spans).toHaveLength(1);
 * expect(spans[0].name).toBe('operation');
 * ```
 *
 * @public
 */
export class MemoryTracer implements Tracer {
  /** Circular buffer for completed spans */
  private readonly _spans: (SpanData | undefined)[];

  /** Head pointer for circular buffer */
  private _head = 0;

  /** Tail pointer for circular buffer */
  private _tail = 0;

  /** Current size of circular buffer */
  private _size = 0;

  /** Array-based stack of active spans (push/pop are O(1)) */
  private readonly _spanStack: Span[] = [];

  /** Maximum number of spans to retain (FIFO eviction) */
  private readonly _maxSpans: number;

  /** Default attributes applied to all spans */
  private readonly _defaultAttributes: Attributes;

  /** Whether default attributes are non-empty (skip merge when false) */
  private readonly _hasDefaultAttributes: boolean;

  /** Bound onEnd callback to avoid creating closures per span */
  private readonly _onSpanEnd: (spanData: SpanData) => void;

  /** Running count of spans dropped due to buffer overflow */
  private _droppedSpanCount = 0;

  /** Optional callback invoked when a span is evicted */
  private readonly _onDrop: ((spanData: SpanData, droppedCount: number) => void) | undefined;

  /**
   * Creates a new MemoryTracer.
   *
   * @param options - Configuration options (or maxSpans number for legacy compat)
   * @param defaultAttributes - Default attributes (only used with numeric first arg)
   */
  constructor(options?: MemoryTracerOptions | number, defaultAttributes?: Attributes) {
    // Support both new options object and legacy positional args
    let maxSpans: number;
    let attrs: Attributes;
    let onDrop: ((spanData: SpanData, droppedCount: number) => void) | undefined;

    if (typeof options === "number") {
      maxSpans = options;
      attrs = defaultAttributes ?? {};
      onDrop = undefined;
    } else {
      maxSpans = options?.maxSpans ?? 10000;
      attrs = options?.defaultAttributes ?? {};
      onDrop = options?.onDrop;
    }

    this._maxSpans = maxSpans;
    this._spans = new Array(maxSpans);
    this._defaultAttributes = attrs;
    this._hasDefaultAttributes = Object.keys(attrs).length > 0;
    this._onSpanEnd = this._collectSpan.bind(this);
    this._onDrop = onDrop;
  }

  /**
   * Number of spans dropped due to buffer overflow.
   *
   * For GxP audit trails: compare this with total span count to
   * assess data completeness.
   */
  get droppedSpanCount(): number {
    return this._droppedSpanCount;
  }

  /**
   * Starts a new span with the given name and options.
   *
   * The span becomes the active span in the current context.
   * Callers must call span.end() when complete.
   *
   * @param name - Human-readable span name
   * @param options - Optional configuration for parent context, attributes, etc.
   * @returns A new active span
   */
  startSpan(name: string, options?: SpanOptions): Span {
    // Determine parent context
    const parentContext = options?.root ? undefined : this.getSpanContext();

    // Determine final attributes — avoid spread/merge when possible
    let attributes: Attributes | undefined;
    if (this._hasDefaultAttributes) {
      // Merge default attributes with span attributes using for...in
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

    // Create span directly (no pool)
    const span = new MemorySpan();

    // Initialize span with individual params (no options object)
    span.init(
      name,
      parentContext,
      options?.kind ?? "internal",
      attributes,
      options?.links,
      options?.startTime,
      this._onSpanEnd
    );

    // Push to active span stack
    this._spanStack.push(span);

    return span;
  }

  /**
   * Executes a synchronous function within a new span context.
   *
   * The span is automatically started before the function executes and
   * ended after completion. Error status is set automatically if the
   * function throws.
   *
   * @param name - Human-readable span name
   * @param fn - Synchronous function to execute with the span
   * @param options - Optional configuration for the span
   * @returns The return value of the function
   * @throws Re-throws any error from the function after recording it
   */
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
      // Remove span from stack
      this._popSpan(span);
    }
  }

  /**
   * Executes an asynchronous function within a new span context.
   *
   * The span is automatically started before the async function executes
   * and ended after the promise resolves or rejects. Error status is set
   * automatically on rejection.
   *
   * @param name - Human-readable span name
   * @param fn - Async function to execute with the span
   * @param options - Optional configuration for the span
   * @returns A promise that resolves to the function's return value
   * @throws Re-throws any error from the function after recording it
   */
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
      // Remove span from stack
      this._popSpan(span);
    }
  }

  /**
   * Returns the currently active span, if any.
   *
   * @returns The active span, or undefined if no span is active
   */
  getActiveSpan(): Span | undefined {
    const len = this._spanStack.length;
    if (len === 0) {
      return undefined;
    }
    return this._spanStack[len - 1];
  }

  /**
   * Returns the span context of the currently active span.
   *
   * @returns The active span context, or undefined if no span is active
   */
  getSpanContext(): SpanContext | undefined {
    const activeSpan = this.getActiveSpan();
    return activeSpan?.context;
  }

  /**
   * Creates a new tracer instance with additional default attributes.
   *
   * All spans created by the returned tracer will include the specified
   * attributes in addition to any attributes provided at span creation.
   *
   * @param attributes - Default attributes to apply to all spans
   * @returns A new tracer instance with the attributes applied
   */
  withAttributes(attributes: Attributes): Tracer {
    const merged: Record<string, AttributeValue> = {};
    const defaults = this._defaultAttributes;
    for (const key in defaults) {
      merged[key] = defaults[key];
    }
    for (const key in attributes) {
      merged[key] = attributes[key];
    }
    return new MemoryTracer({
      maxSpans: this._maxSpans,
      defaultAttributes: merged,
      onDrop: this._onDrop,
    });
  }

  /**
   * Indicates whether this tracer is actively recording spans.
   *
   * MemoryTracer always returns true (records spans for testing).
   *
   * @returns true (memory tracer always records)
   */
  isEnabled(): boolean {
    return true;
  }

  /**
   * Returns a copy of all collected spans.
   *
   * Spans are in the order they were completed (not necessarily creation order).
   *
   * @returns Array of completed span data
   */
  getCollectedSpans(): SpanData[] {
    const result: SpanData[] = [];
    for (let i = 0; i < this._size; i++) {
      const index = (this._head + i) % this._maxSpans;
      const span = this._spans[index];
      if (span !== undefined) {
        result.push(span);
      }
    }
    return result;
  }

  /**
   * Clears all collected spans and resets the active span stack.
   *
   * Useful for test isolation between test cases.
   */
  clear(): void {
    // Reset circular buffer
    this._head = 0;
    this._tail = 0;
    this._size = 0;
    this._droppedSpanCount = 0;
    this._spans.fill(undefined);

    // Reset span stack
    this._spanStack.length = 0;
  }

  /**
   * Collects a completed span, enforcing the max span limit.
   *
   * Circular buffer implementation eliminates Array.shift() O(n) overhead.
   *
   * @param spanData - Completed span data
   * @internal
   */
  private _collectSpan(spanData: SpanData): void {
    // Save the evicted span BEFORE overwriting (when full, tail == head)
    const evictedSpan = this._size >= this._maxSpans ? this._spans[this._head] : undefined;

    // Write at tail position
    this._spans[this._tail] = spanData;
    this._tail = (this._tail + 1) % this._maxSpans;

    // Update size and advance head if buffer is full
    if (this._size < this._maxSpans) {
      this._size++;
    } else {
      // Buffer full -- record the drop for GxP audit trail
      this._head = (this._head + 1) % this._maxSpans;
      this._droppedSpanCount++;

      if (this._onDrop && evictedSpan !== undefined) {
        this._onDrop(evictedSpan, this._droppedSpanCount);
      }
    }
  }

  /**
   * Removes a span from the active span stack.
   *
   * @param span - The span to remove
   * @internal
   */
  private _popSpan(span: Span): void {
    const stack = this._spanStack;
    const len = stack.length;
    // Fast path: span is at the top of the stack (most common case)
    if (len > 0 && stack[len - 1] === span) {
      stack.pop();
      return;
    }
    // Slow path: find and remove from middle
    for (let i = len - 2; i >= 0; i--) {
      if (stack[i] === span) {
        stack.splice(i, 1);
        return;
      }
    }
  }
}

/**
 * Creates a new MemoryTracer instance.
 *
 * Convenience factory for creating memory tracers in tests.
 *
 * @param options - Configuration options (or maxSpans number for legacy compat)
 * @param defaultAttributes - Default attributes (only used with numeric first arg)
 * @returns A new MemoryTracer instance
 *
 * @example
 * ```typescript
 * const tracer = createMemoryTracer();
 *
 * tracer.withSpan('test-operation', (span) => {
 *   span.setAttribute('test', true);
 * });
 *
 * expect(tracer.getCollectedSpans()).toHaveLength(1);
 * tracer.clear();
 * ```
 *
 * @example With drop tracking
 * ```typescript
 * const drops: SpanData[] = [];
 * const tracer = createMemoryTracer({
 *   maxSpans: 100,
 *   onDrop: (span) => drops.push(span),
 * });
 * ```
 *
 * @public
 */
export function createMemoryTracer(
  options?: MemoryTracerOptions | number,
  defaultAttributes?: Attributes
): MemoryTracer {
  return new MemoryTracer(options, defaultAttributes);
}
