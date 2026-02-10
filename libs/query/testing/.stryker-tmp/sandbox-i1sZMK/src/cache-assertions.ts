/**
 * Cache Entry Assertion Helpers
 *
 * Fluent assertions for verifying cache entry state in tests.
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
import { expect } from "vitest";
import type { QueryClient, QueryPort } from "@hex-di/query";

// =============================================================================
// CacheEntryAssertions
// =============================================================================

export interface CacheEntryAssertions<TData> {
  /** Assert that a cache entry exists for this port+params */
  toExist(): void;
  /** Assert that no cache entry exists for this port+params */
  toNotExist(): void;
  /** Assert that the cache entry has the expected data */
  toHaveData(expected: TData): void;
  /** Assert that the cache entry is marked as invalidated (stale) */
  toBeStale(): void;
  /** Assert that the cache entry is not invalidated (fresh) */
  toBeFresh(): void;
  /** Assert that the cache entry has the expected number of observers */
  toHaveObserverCount(n: number): void;
}

// =============================================================================
// expectCacheEntry
// =============================================================================

/**
 * Fluent assertions for cache entries.
 *
 * @example
 * ```typescript
 * const client = createQueryClient();
 * client.setQueryData(UsersPort, {}, [{ id: "1", name: "Alice" }]);
 *
 * expectCacheEntry(client, UsersPort, {}).toExist();
 * expectCacheEntry(client, UsersPort, {}).toHaveData([{ id: "1", name: "Alice" }]);
 * expectCacheEntry(client, UsersPort, {}).toBeFresh();
 * ```
 */
export function expectCacheEntry<TData, TParams, TError, TName extends string>(
  client: QueryClient,
  port: QueryPort<TName, TData, TParams, TError>,
  params: TParams
): CacheEntryAssertions<TData> {
  if (stryMutAct_9fa48("57")) {
    {
    }
  } else {
    stryCov_9fa48("57");
    return stryMutAct_9fa48("58")
      ? {}
      : (stryCov_9fa48("58"),
        {
          toExist() {
            if (stryMutAct_9fa48("59")) {
              {
              }
            } else {
              stryCov_9fa48("59");
              const entry = client.cache.get(port, params);
              expect(entry).toBeDefined();
            }
          },
          toNotExist() {
            if (stryMutAct_9fa48("60")) {
              {
              }
            } else {
              stryCov_9fa48("60");
              const entry = client.cache.get(port, params);
              expect(entry).toBeUndefined();
            }
          },
          toHaveData(expected: TData) {
            if (stryMutAct_9fa48("61")) {
              {
              }
            } else {
              stryCov_9fa48("61");
              const entry = client.cache.get(port, params);
              expect(entry).toBeDefined();
              if (
                stryMutAct_9fa48("64")
                  ? entry !== undefined
                  : stryMutAct_9fa48("63")
                    ? false
                    : stryMutAct_9fa48("62")
                      ? true
                      : (stryCov_9fa48("62", "63", "64"), entry === undefined)
              )
                return;
              expect(entry.data).toEqual(expected);
            }
          },
          toBeStale() {
            if (stryMutAct_9fa48("65")) {
              {
              }
            } else {
              stryCov_9fa48("65");
              const entry = client.cache.get(port, params);
              expect(entry).toBeDefined();
              if (
                stryMutAct_9fa48("68")
                  ? entry !== undefined
                  : stryMutAct_9fa48("67")
                    ? false
                    : stryMutAct_9fa48("66")
                      ? true
                      : (stryCov_9fa48("66", "67", "68"), entry === undefined)
              )
                return;
              expect(entry.isInvalidated).toBe(
                stryMutAct_9fa48("69") ? false : (stryCov_9fa48("69"), true)
              );
            }
          },
          toBeFresh() {
            if (stryMutAct_9fa48("70")) {
              {
              }
            } else {
              stryCov_9fa48("70");
              const entry = client.cache.get(port, params);
              expect(entry).toBeDefined();
              if (
                stryMutAct_9fa48("73")
                  ? entry !== undefined
                  : stryMutAct_9fa48("72")
                    ? false
                    : stryMutAct_9fa48("71")
                      ? true
                      : (stryCov_9fa48("71", "72", "73"), entry === undefined)
              )
                return;
              expect(entry.isInvalidated).toBe(
                stryMutAct_9fa48("74") ? true : (stryCov_9fa48("74"), false)
              );
            }
          },
          toHaveObserverCount(n: number) {
            if (stryMutAct_9fa48("75")) {
              {
              }
            } else {
              stryCov_9fa48("75");
              const entry = client.cache.get(port, params);
              expect(entry).toBeDefined();
              if (
                stryMutAct_9fa48("78")
                  ? entry !== undefined
                  : stryMutAct_9fa48("77")
                    ? false
                    : stryMutAct_9fa48("76")
                      ? true
                      : (stryCov_9fa48("76", "77", "78"), entry === undefined)
              )
                return;
              expect(entry.observerCount).toBe(n);
            }
          },
        });
  }
}
