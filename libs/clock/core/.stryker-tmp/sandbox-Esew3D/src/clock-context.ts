/**
 * AsyncLocalStorage-based clock context for ambient clock propagation.
 *
 * Uses a dynamic import pattern to avoid compile-time dependency on
 * node:async_hooks, making this module safe for edge runtimes and browsers.
 *
 * @packageDocumentation
 */
// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
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
  if (stryMutAct_9fa48("616")) {
    {}
  } else {
    stryCov_9fa48("616");
    let storage: AsyncLocalStorageLike<ClockContext> | undefined;
    return Object.freeze(stryMutAct_9fa48("617") ? {} : (stryCov_9fa48("617"), {
      async init(): Promise<boolean> {
        if (stryMutAct_9fa48("618")) {
          {}
        } else {
          stryCov_9fa48("618");
          if (stryMutAct_9fa48("621") ? storage === undefined : stryMutAct_9fa48("620") ? false : stryMutAct_9fa48("619") ? true : (stryCov_9fa48("619", "620", "621"), storage !== undefined)) return stryMutAct_9fa48("622") ? false : (stryCov_9fa48("622"), true);
          try {
            if (stryMutAct_9fa48("623")) {
              {}
            } else {
              stryCov_9fa48("623");
              // Feature-detect Node.js environment before attempting dynamic import
              if (stryMutAct_9fa48("626") ? typeof globalThis === "undefined" && !("process" in globalThis) : stryMutAct_9fa48("625") ? false : stryMutAct_9fa48("624") ? true : (stryCov_9fa48("624", "625", "626"), (stryMutAct_9fa48("628") ? typeof globalThis !== "undefined" : stryMutAct_9fa48("627") ? false : (stryCov_9fa48("627", "628"), typeof globalThis === (stryMutAct_9fa48("629") ? "" : (stryCov_9fa48("629"), "undefined")))) || (stryMutAct_9fa48("630") ? "process" in globalThis : (stryCov_9fa48("630"), !((stryMutAct_9fa48("631") ? "" : (stryCov_9fa48("631"), "process")) in globalThis))))) {
                if (stryMutAct_9fa48("632")) {
                  {}
                } else {
                  stryCov_9fa48("632");
                  return stryMutAct_9fa48("633") ? true : (stryCov_9fa48("633"), false);
                }
              }

              // Use Function constructor to prevent TypeScript from resolving
              // the module specifier at compile time
              const importFn = new Function(stryMutAct_9fa48("634") ? "" : (stryCov_9fa48("634"), "specifier"), stryMutAct_9fa48("635") ? "" : (stryCov_9fa48("635"), "return import(specifier)"));
              const asyncHooks: Record<string, unknown> = await (importFn("node:async_hooks") as Promise<Record<string, unknown>>);
              if (stryMutAct_9fa48("638") ? asyncHooks || "AsyncLocalStorage" in asyncHooks : stryMutAct_9fa48("637") ? false : stryMutAct_9fa48("636") ? true : (stryCov_9fa48("636", "637", "638"), asyncHooks && (stryMutAct_9fa48("639") ? "" : (stryCov_9fa48("639"), "AsyncLocalStorage")) in asyncHooks)) {
                if (stryMutAct_9fa48("640")) {
                  {}
                } else {
                  stryCov_9fa48("640");
                  const AlsCtor = asyncHooks[stryMutAct_9fa48("641") ? "" : (stryCov_9fa48("641"), "AsyncLocalStorage")];
                  if (stryMutAct_9fa48("644") ? typeof AlsCtor !== "function" : stryMutAct_9fa48("643") ? false : stryMutAct_9fa48("642") ? true : (stryCov_9fa48("642", "643", "644"), typeof AlsCtor === (stryMutAct_9fa48("645") ? "" : (stryCov_9fa48("645"), "function")))) {
                    if (stryMutAct_9fa48("646")) {
                      {}
                    } else {
                      stryCov_9fa48("646");
                      storage = new (AlsCtor as new () => AsyncLocalStorageLike<ClockContext>)();
                      return stryMutAct_9fa48("647") ? false : (stryCov_9fa48("647"), true);
                    }
                  }
                }
              }
            }
          } catch {
            // Not in Node.js or async_hooks unavailable — fall through
          }
          return stryMutAct_9fa48("648") ? true : (stryCov_9fa48("648"), false);
        }
      },
      get(): ClockContext | undefined {
        if (stryMutAct_9fa48("649")) {
          {}
        } else {
          stryCov_9fa48("649");
          return stryMutAct_9fa48("650") ? storage.getStore() : (stryCov_9fa48("650"), storage?.getStore());
        }
      },
      run<T>(ctx: ClockContext, fn: () => T): T {
        if (stryMutAct_9fa48("651")) {
          {}
        } else {
          stryCov_9fa48("651");
          if (stryMutAct_9fa48("654") ? storage === undefined : stryMutAct_9fa48("653") ? false : stryMutAct_9fa48("652") ? true : (stryCov_9fa48("652", "653", "654"), storage !== undefined)) {
            if (stryMutAct_9fa48("655")) {
              {}
            } else {
              stryCov_9fa48("655");
              return storage.run(Object.freeze(ctx), fn);
            }
          }
          return fn();
        }
      }
    }));
  }
}