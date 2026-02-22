/**
 * Module-level span stack for context propagation.
 *
 * Provides a simple LIFO stack for tracking active spans across
 * container boundaries. This enables automatic parent-child relationships
 * for nested dependency resolutions.
 *
 * Works in all JavaScript environments (browser, Node.js, edge runtimes)
 * without requiring AsyncLocalStorage or other platform-specific APIs.
 *
 * @packageDocumentation
 */

import type { Span } from "../types/index.js";
import { getAsyncLocalStore } from "./async-context.js";

/**
 * Module-level span stack for tracking active spans.
 *
 * @remarks
 * When AsyncLocalStorage is initialized (via initAsyncSpanContext()),
 * each async context gets its own isolated span stack, preventing
 * cross-request trace corruption. Falls back to a global stack
 * for browsers and edge runtimes.
 *
 * All access is through the exported functions
 * (pushSpan, popSpan, getActiveSpan, clearStack).
 *
 * The stack maintains spans in LIFO order:
 * - `pushSpan()` adds a span to the top
 * - `popSpan()` removes and returns the top span
 * - `getActiveSpan()` returns the top span without removing it
 */
const globalStack: Span[] = [];

/**
 * Get the current span stack (async-local or global fallback).
 */
function getStack(): Span[] {
  const store = getAsyncLocalStore();
  if (store) return store.stack;
  return globalStack;
}

/**
 * Pushes a span onto the stack, making it the active span.
 *
 * Called by instrumentation hooks when starting a new resolution.
 * The span becomes the parent for any nested resolutions.
 *
 * @param span - The span to push
 *
 * @example
 * ```typescript
 * const span = tracer.startSpan('resolve:Logger');
 * pushSpan(span);
 * try {
 *   // Nested resolutions will use this span as parent
 *   const result = factory();
 * } finally {
 *   popSpan();
 *   span.end();
 * }
 * ```
 */
export function pushSpan(span: Span): void {
  getStack().push(span);
}

/**
 * Removes and returns the top span from the stack.
 *
 * Called by instrumentation hooks when completing a resolution.
 * Returns undefined if the stack is empty.
 *
 * @returns The top span, or undefined if stack is empty
 *
 * @example
 * ```typescript
 * const span = popSpan();
 * if (span) {
 *   span.end();
 * }
 * ```
 */
export function popSpan(): Span | undefined {
  return getStack().pop();
}

/**
 * Returns the currently active span without removing it from the stack.
 *
 * Used by instrumentation hooks to establish parent-child relationships:
 * when creating a new span, the active span becomes its parent.
 *
 * @returns The active span, or undefined if no span is active
 *
 * @example
 * ```typescript
 * const parentSpan = getActiveSpan();
 * const childSpan = tracer.startSpan('child-operation', {
 *   // Parent context is inferred from parentSpan
 * });
 * ```
 */
export function getActiveSpan(): Span | undefined {
  const stack = getStack();
  return stack.length > 0 ? stack[stack.length - 1] : undefined;
}

/**
 * Clears all spans from the stack.
 *
 * Primarily used in tests to reset state between test cases.
 * Should rarely be needed in production code.
 *
 * @example
 * ```typescript
 * afterEach(() => {
 *   clearStack();
 * });
 * ```
 */
export function clearStack(): void {
  getStack().length = 0;
}

/**
 * Returns the current stack depth.
 *
 * Useful for debugging and assertions. The depth indicates how many
 * nested resolutions are currently active:
 * - Depth 0: No active resolutions
 * - Depth 1: One top-level resolution
 * - Depth N: N nested resolutions
 *
 * @returns The number of spans currently on the stack
 *
 * @example
 * ```typescript
 * console.log(`Current resolution depth: ${getStackDepth()}`);
 * ```
 */
export function getStackDepth(): number {
  return getStack().length;
}
