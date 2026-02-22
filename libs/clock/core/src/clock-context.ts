/**
 * AsyncLocalStorage-based clock context for ambient clock propagation.
 *
 * Uses a dynamic import pattern to avoid compile-time dependency on
 * node:async_hooks, making this module safe for edge runtimes and browsers.
 *
 * @packageDocumentation
 */

import { fromPromise } from "@hex-di/result";
import type { ClockService } from "./ports/clock.js";
import type { SequenceGeneratorService } from "./ports/sequence.js";

/** Ambient clock context threaded through async boundaries. */
export interface ClockContext {
  readonly clock: ClockService;
  readonly sequenceGenerator: SequenceGeneratorService;
}

/**
 * Minimal typed interface for AsyncLocalStorage usage.
 * Avoids direct dependency on node:async_hooks type declarations.
 */
interface AsyncLocalStorageLike<T> {
  getStore(): T | undefined;
  run<R>(store: T, fn: () => R): R;
}

/** Opaque handle to an AsyncLocalStorage-backed clock context. */
export interface ClockContextHandle {
  /** Returns the current clock context, or undefined if outside a run() scope. */
  readonly get: () => ClockContext | undefined;
  /** Runs fn with the given context, freezing it before storage. */
  readonly run: <T>(ctx: ClockContext, fn: () => T) => T;
}

/**
 * Creates an AsyncLocalStorage-backed clock context handle.
 *
 * Uses dynamic import to avoid compile-time node:async_hooks dependency.
 * Falls back gracefully if AsyncLocalStorage is unavailable.
 *
 * Call `await init()` before using the handle in Node.js environments.
 */
export interface AsyncClockContextHandle extends ClockContextHandle {
  /**
   * Initialize AsyncLocalStorage. Must be called once before use in Node.js.
   * No-op on platforms where AsyncLocalStorage is unavailable.
   * Returns true if AsyncLocalStorage was successfully initialized.
   */
  readonly init: () => Promise<boolean>;
}

/**
 * Creates an AsyncLocalStorage-backed clock context handle.
 *
 * The handle is not initialized until `init()` is called. Before initialization,
 * `get()` always returns undefined and `run()` invokes the callback immediately.
 */
export function createClockContext(): AsyncClockContextHandle {
  let storage: AsyncLocalStorageLike<ClockContext> | undefined;

  return Object.freeze({
    /* Stryker disable all -- UNKILLABLE: init() uses new Function() dynamic import which is blocked in Stryker sandbox; all branches inside init() are untestable */
    async init(): Promise<boolean> {
      if (storage !== undefined) return true;

      // Feature-detect Node.js environment before attempting dynamic import
      if (typeof globalThis === "undefined" || !("process" in globalThis)) {
        return false;
      }

      // Use Function constructor to prevent TypeScript from resolving
      // the module specifier at compile time
      const importFn = new Function("specifier", "return import(specifier)");
      const asyncHooksResult = await fromPromise(
        importFn("node:async_hooks") as Promise<Record<string, unknown>>,
        () => null
      );

      if (asyncHooksResult.isErr()) return false;

      const asyncHooks = asyncHooksResult.value;
      if (asyncHooks && "AsyncLocalStorage" in asyncHooks) {
        const AlsCtor = asyncHooks["AsyncLocalStorage"];
        if (typeof AlsCtor === "function") {
          storage = new (AlsCtor as new () => AsyncLocalStorageLike<ClockContext>)();
          return true;
        }
      }

      return false;
    },
    /* Stryker restore all */

    // Stryker disable next-line BlockStatement -- UNKILLABLE: get() body is always-undefined when init() fails in Stryker sandbox
    get(): ClockContext | undefined {
      return storage?.getStore();
    },

    run<T>(ctx: ClockContext, fn: () => T): T {
      // Stryker disable next-line ConditionalExpression,BlockStatement -- UNKILLABLE: storage is never set when init() fails in Stryker sandbox
      if (storage !== undefined) {
        return storage.run(Object.freeze(ctx), fn);
      }
      return fn();
    },
  });
}
