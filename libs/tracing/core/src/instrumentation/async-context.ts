/**
 * AsyncLocalStorage-backed span context for per-request isolation.
 *
 * In Node.js environments, provides per-async-context span stacks
 * so concurrent HTTP requests don't corrupt each other's trace
 * hierarchies. Falls back to the global span stack in browsers
 * and edge runtimes.
 *
 * @packageDocumentation
 */

import type { Span } from "../types/index.js";

/**
 * Store shape for AsyncLocalStorage.
 *
 * @internal
 */
export interface SpanStackStore {
  stack: Span[];
}

/**
 * Minimal typed interface for AsyncLocalStorage usage.
 * Avoids direct dependency on node:async_hooks type declarations.
 */
interface AsyncLocalStorageLike {
  getStore(): SpanStackStore | undefined;
  run<T>(store: SpanStackStore, fn: () => T): T;
}

/** Cached AsyncLocalStorage instance, if available */
let _als: AsyncLocalStorageLike | undefined;

let _initialized = false;

/**
 * Initialize AsyncLocalStorage-backed span context.
 *
 * Call once at application startup in Node.js environments.
 * After initialization, each async context gets its own span stack,
 * preventing cross-request span corruption.
 *
 * No-op in browser environments (safe to call unconditionally).
 *
 * @returns true if AsyncLocalStorage was successfully initialized
 *
 * @example
 * ```typescript
 * import { initAsyncSpanContext } from '@hex-di/tracing';
 *
 * await initAsyncSpanContext();
 * // Now each async context gets isolated span stacks
 * ```
 *
 * @public
 */
export async function initAsyncSpanContext(): Promise<boolean> {
  if (_initialized) return _als !== undefined;
  _initialized = true;

  try {
    // Feature-detect Node.js environment before attempting dynamic import
    if (typeof globalThis === "undefined" || !("process" in globalThis)) {
      return false;
    }

    // Use Function constructor for the dynamic import to prevent TypeScript
    // from resolving the module specifier at compile time
    const importFn = new Function("specifier", "return import(specifier)");
    const asyncHooks: Record<string, unknown> = await (importFn("node:async_hooks") as Promise<
      Record<string, unknown>
    >);

    if (asyncHooks && "AsyncLocalStorage" in asyncHooks) {
      const AlsCtor = asyncHooks.AsyncLocalStorage;
      if (typeof AlsCtor === "function") {
        const als = new (AlsCtor as new () => AsyncLocalStorageLike)();
        _als = als;
        return true;
      }
    }
  } catch {
    // Not in Node.js or async_hooks unavailable -- fall through
  }
  return false;
}

/**
 * Get the current async-local span stack store, if available.
 *
 * Returns undefined when:
 * - initAsyncSpanContext() has not been called
 * - Running outside an async context (no store)
 * - AsyncLocalStorage is not available (browser)
 *
 * @returns The current store or undefined
 *
 * @internal
 */
export function getAsyncLocalStore(): SpanStackStore | undefined {
  return _als?.getStore();
}

/**
 * Execute a function within an isolated async span context.
 *
 * When AsyncLocalStorage is available, the function runs with
 * a fresh, isolated span stack. When unavailable, the function
 * runs immediately without isolation (global stack fallback).
 *
 * @param fn - Function to execute within the isolated context
 * @returns The return value of the function
 *
 * @example
 * ```typescript
 * // In an HTTP server handler:
 * runInAsyncContext(() => {
 *   // Span operations here are isolated from other requests
 *   tracer.withSpan('handle-request', (span) => { ... });
 * });
 * ```
 *
 * @public
 */
export function runInAsyncContext<T>(fn: () => T): T {
  if (_als) {
    return _als.run({ stack: [] }, fn);
  }
  return fn();
}

/**
 * Reset async context state (for tests only).
 *
 * @internal
 */
export function _resetAsyncContext(): void {
  _als = undefined;
  _initialized = false;
}
