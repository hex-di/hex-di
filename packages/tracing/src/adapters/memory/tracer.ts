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
  /** Flat storage of completed spans */
  private _spans: SpanData[];

  /** Stack of active spans for context propagation */
  private _spanStack: Span[];

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
    this._spans = [];
    this._spanStack = [];
    this._maxSpans = maxSpans;
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
    return this._spanStack[this._spanStack.length - 1];
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
    return [...this._spans];
  }

  /**
   * Clears all collected spans and resets the active span stack.
   *
   * Useful for test isolation between test cases.
   */
  clear(): void {
    this._spans = [];
    this._spanStack = [];
  }

  /**
   * Collects a completed span, enforcing the max span limit.
   *
   * @param spanData - Completed span data
   * @internal
   */
  private _collectSpan(spanData: SpanData): void {
    this._spans.push(spanData);

    // Enforce FIFO eviction if over limit
    if (this._spans.length > this._maxSpans) {
      this._spans.shift(); // Remove oldest span
    }
  }

  /**
   * Removes a span from the active span stack.
   *
   * @param span - The span to remove
   * @internal
   */
  private _popSpan(span: Span): void {
    const index = this._spanStack.indexOf(span);
    if (index !== -1) {
      this._spanStack.splice(index, 1);
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
