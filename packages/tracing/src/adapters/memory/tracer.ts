/**
 * MemoryTracer implementation for testing and debugging.
 *
 * Implements the Tracer interface with in-memory span collection.
 * Stores all completed spans in a flat array for test assertions.
 *
 * @packageDocumentation
 */

import type { Tracer } from "../../ports/tracer.js";
import type { Span, SpanOptions, SpanContext, SpanData, Attributes } from "../../types/index.js";
import { MemorySpan } from "./span.js";

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

  /** Map-based stack of active spans for O(1) operations */
  private readonly _spanStack = new Map<number, Span>();

  /** Current depth in span stack */
  private _stackDepth = 0;

  /** Maximum number of spans to retain (FIFO eviction) */
  private readonly _maxSpans: number;

  /** Default attributes applied to all spans */
  private readonly _defaultAttributes: Attributes;

  /**
   * Creates a new MemoryTracer.
   *
   * @param maxSpans - Maximum spans to retain (default: 10000)
   * @param defaultAttributes - Attributes applied to all spans (default: {})
   */
  constructor(maxSpans = 10000, defaultAttributes: Attributes = {}) {
    this._maxSpans = maxSpans;
    this._spans = new Array(maxSpans);
    this._defaultAttributes = defaultAttributes;
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

    // Merge default attributes with span attributes
    const mergedAttributes = {
      ...this._defaultAttributes,
      ...(options?.attributes ?? {}),
    };

    const mergedOptions: SpanOptions = {
      ...options,
      attributes: mergedAttributes,
    };

    // Create span with onEnd callback that collects span data
    const span = new MemorySpan(name, parentContext, mergedOptions, spanData => {
      this._collectSpan(spanData);
    });

    // Push to active span stack (O(1) with Map)
    this._spanStack.set(this._stackDepth++, span);

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
    if (this._stackDepth === 0) {
      return undefined;
    }
    return this._spanStack.get(this._stackDepth - 1);
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
    const mergedAttributes = {
      ...this._defaultAttributes,
      ...attributes,
    };
    return new MemoryTracer(this._maxSpans, mergedAttributes);
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
    this._spans.fill(undefined);

    // Reset span stack
    this._spanStack.clear();
    this._stackDepth = 0;
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
    // Write at tail position
    this._spans[this._tail] = spanData;
    this._tail = (this._tail + 1) % this._maxSpans;

    // Update size and advance head if buffer is full
    if (this._size < this._maxSpans) {
      this._size++;
    } else {
      // Buffer full, advance head to maintain FIFO
      this._head = (this._head + 1) % this._maxSpans;
    }
  }

  /**
   * Removes a span from the active span stack.
   *
   * @param span - The span to remove
   * @internal
   */
  private _popSpan(span: Span): void {
    // Find the span in the stack
    for (const [depth, stackSpan] of this._spanStack.entries()) {
      if (stackSpan === span) {
        this._spanStack.delete(depth);
        // Only decrement if it's the top of the stack
        if (depth === this._stackDepth - 1) {
          this._stackDepth--;
        }
        break;
      }
    }
  }
}

/**
 * Creates a new MemoryTracer instance.
 *
 * Convenience factory for creating memory tracers in tests.
 *
 * @param maxSpans - Maximum spans to retain (default: 10000)
 * @param defaultAttributes - Attributes applied to all spans (default: {})
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
 * @public
 */
export function createMemoryTracer(
  maxSpans = 10000,
  defaultAttributes: Attributes = {}
): MemoryTracer {
  return new MemoryTracer(maxSpans, defaultAttributes);
}
