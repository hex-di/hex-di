/**
 * Request deduplication for in-flight queries.
 *
 * Ensures that multiple concurrent requests for the same query key
 * share a single fetch operation.
 *
 * @packageDocumentation
 */
// @ts-nocheck
function stryNS_9fa48() {
  var g =
    (typeof globalThis === "object" && globalThis && globalThis.Math === Math && globalThis) ||
    new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (
    ns.activeMutant === undefined &&
    g.process &&
    g.process.env &&
    g.process.env.__STRYKER_ACTIVE_MUTANT__
  ) {
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
  var cov =
    ns.mutantCoverage ||
    (ns.mutantCoverage = {
      static: {},
      perTest: {},
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
        throw new Error("Stryker: Hit count limit reached (" + ns.hitCount + ")");
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import type { ResultAsync } from "@hex-di/result";
export interface DeduplicationMap {
  /**
   * Get or create an in-flight request.
   * Returns the existing promise if one is in flight, otherwise
   * calls the factory and stores its promise.
   */
  dedupe<TData, TError>(
    serializedKey: string,
    factory: () => ResultAsync<TData, TError>
  ): ResultAsync<TData, TError>;

  /**
   * Remove a key from the dedup map (after completion).
   */
  complete(serializedKey: string): void;

  /**
   * Cancel all in-flight requests.
   */
  cancelAll(): void;

  /** Number of in-flight requests */
  readonly size: number;
}

/**
 * BRAND_CAST: Narrows type-erased ResultAsync from the dedup map to the
 * caller's expected types. The map key guarantees type correspondence.
 */
function narrowInflight<TData, TError>(
  promise: ResultAsync<unknown, unknown>
): ResultAsync<TData, TError> {
  if (stryMutAct_9fa48("457")) {
    {
    }
  } else {
    stryCov_9fa48("457");
    return promise as ResultAsync<TData, TError>;
  }
}
export function createDeduplicationMap(): DeduplicationMap {
  if (stryMutAct_9fa48("458")) {
    {
    }
  } else {
    stryCov_9fa48("458");
    const inflight = new Map<
      string,
      {
        promise: ResultAsync<unknown, unknown>;
        controller: AbortController;
      }
    >();
    return stryMutAct_9fa48("459")
      ? {}
      : (stryCov_9fa48("459"),
        {
          dedupe<TData, TError>(
            serializedKey: string,
            factory: () => ResultAsync<TData, TError>
          ): ResultAsync<TData, TError> {
            if (stryMutAct_9fa48("460")) {
              {
              }
            } else {
              stryCov_9fa48("460");
              const existing = inflight.get(serializedKey);
              if (
                stryMutAct_9fa48("462")
                  ? false
                  : stryMutAct_9fa48("461")
                    ? true
                    : (stryCov_9fa48("461", "462"), existing)
              ) {
                if (stryMutAct_9fa48("463")) {
                  {
                  }
                } else {
                  stryCov_9fa48("463");
                  return narrowInflight<TData, TError>(existing.promise);
                }
              }
              const controller = new AbortController();
              const promise = factory();
              inflight.set(
                serializedKey,
                stryMutAct_9fa48("464")
                  ? {}
                  : (stryCov_9fa48("464"),
                    {
                      promise,
                      controller,
                    })
              );

              // Auto-cleanup on settlement using ResultAsync methods
              void promise
                .map(() => {
                  if (stryMutAct_9fa48("465")) {
                    {
                    }
                  } else {
                    stryCov_9fa48("465");
                    inflight.delete(serializedKey);
                  }
                })
                .mapErr(() => {
                  if (stryMutAct_9fa48("466")) {
                    {
                    }
                  } else {
                    stryCov_9fa48("466");
                    inflight.delete(serializedKey);
                  }
                });
              return promise;
            }
          },
          complete(serializedKey: string): void {
            if (stryMutAct_9fa48("467")) {
              {
              }
            } else {
              stryCov_9fa48("467");
              inflight.delete(serializedKey);
            }
          },
          cancelAll(): void {
            if (stryMutAct_9fa48("468")) {
              {
              }
            } else {
              stryCov_9fa48("468");
              for (const [, entry] of inflight) {
                if (stryMutAct_9fa48("469")) {
                  {
                  }
                } else {
                  stryCov_9fa48("469");
                  entry.controller.abort();
                }
              }
              inflight.clear();
            }
          },
          get size(): number {
            if (stryMutAct_9fa48("470")) {
              {
              }
            } else {
              stryCov_9fa48("470");
              return inflight.size;
            }
          },
        });
  }
}
