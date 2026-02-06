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

/**
 * Module-level span stack for tracking active spans.
 *
 * @remarks
 * This is a module-scoped array, not exported. All access is through
 * the exported functions (pushSpan, popSpan, getActiveSpan, clearStack).
 *
 * The stack maintains spans in LIFO order:
 * - `pushSpan()` adds a span to the top
 * - `popSpan()` removes and returns the top span
 * - `getActiveSpan()` returns the top span without removing it
 *
 * This simple design works for synchronous resolution and provides
 * the foundation for distributed tracing across container boundaries.
 */
const spanStack: Span[] = [];

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
  spanStack.push(span);
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
  return spanStack.pop();
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
  return spanStack.length > 0 ? spanStack[spanStack.length - 1] : undefined;
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
  spanStack.length = 0;
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
  return spanStack.length;
}
