/**
 * QueryCache implementation.
 *
 * An in-memory cache storing query entries keyed by port+params.
 * Supports subscriptions, structural sharing, and garbage collection.
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
import { ok, err } from "@hex-di/result";
import type { CacheEntry } from "./cache-entry.js";
import {
  createPendingEntry,
  createSuccessEntry,
  createErrorEntry,
  withInvalidated,
  withObserverCount,
} from "./cache-entry.js";
import type { CacheKey } from "./cache-key.js";
import { createCacheKeyFromName, serializeCacheKey, cacheKeyMatchesPort } from "./cache-key.js";
import { replaceEqualDeep } from "./structural-sharing.js";
import { DEFAULT_QUERY_OPTIONS } from "../types/options.js";

// =============================================================================
// PortLike - minimal interface to avoid variance issues
// =============================================================================

interface PortLike {
  readonly __portName: string;
}

// =============================================================================
// Cache Events
// =============================================================================

export type CacheEvent =
  | {
      readonly type: "added";
      readonly key: CacheKey;
      readonly entry: CacheEntry<unknown, unknown>;
    }
  | {
      readonly type: "updated";
      readonly key: CacheKey;
      readonly entry: CacheEntry<unknown, unknown>;
    }
  | {
      readonly type: "removed";
      readonly key: CacheKey;
    }
  | {
      readonly type: "invalidated";
      readonly key: CacheKey;
    }
  | {
      readonly type: "cleared";
    };
export type CacheListener = (event: CacheEvent) => void;
export type Unsubscribe = () => void;

// =============================================================================
// GC Configuration
// =============================================================================

export interface GarbageCollectorConfig {
  readonly interval: number;
  readonly enabled: boolean;
}

// =============================================================================
// Clock Interface
// =============================================================================

export interface Clock {
  readonly now: () => number;
}
const systemClock: Clock = stryMutAct_9fa48("82")
  ? {}
  : (stryCov_9fa48("82"),
    {
      now: stryMutAct_9fa48("83") ? () => undefined : (stryCov_9fa48("83"), () => Date.now()),
    });

// =============================================================================
// QueryCache Interface
// =============================================================================

export interface QueryCache {
  // === Read ===
  get(port: PortLike, params: unknown): CacheEntry<unknown, unknown> | undefined;
  has(port: PortLike, params: unknown): boolean;
  getAll(): ReadonlyMap<string, CacheEntry<unknown, unknown>>;
  findByPort(port: PortLike): ReadonlyArray<readonly [CacheKey, CacheEntry<unknown, unknown>]>;
  find(
    predicate: (entry: CacheEntry<unknown, unknown>, key: CacheKey) => boolean
  ): ReadonlyArray<readonly [CacheKey, CacheEntry<unknown, unknown>]>;

  // === Write ===
  set(
    port: PortLike,
    params: unknown,
    data: unknown,
    options?: {
      readonly structuralSharing?: boolean;
    }
  ): void;
  setError(port: PortLike, params: unknown, error: unknown): void;
  invalidate(port: PortLike, params?: unknown): void;
  remove(port: PortLike, params?: unknown): void;
  clear(): void;

  // === Internal (used by QueryClient/observers) ===
  getOrCreate(port: PortLike, params: unknown): CacheEntry<unknown, unknown>;
  incrementObservers(port: PortLike, params: unknown): void;
  decrementObservers(port: PortLike, params: unknown): void;

  // === Subscriptions ===
  subscribe(listener: CacheListener): Unsubscribe;

  // === Metrics ===
  readonly size: number;

  // === Disposal ===
  dispose(): void;
}

// =============================================================================
// QueryCache Configuration
// =============================================================================

export interface QueryCacheConfig {
  readonly clock?: Clock;
  readonly gc?: Partial<GarbageCollectorConfig>;
}

// =============================================================================
// createQueryCache Factory
// =============================================================================

export function createQueryCache(config?: QueryCacheConfig): QueryCache {
  if (stryMutAct_9fa48("84")) {
    {
    }
  } else {
    stryCov_9fa48("84");
    const clock = stryMutAct_9fa48("85")
      ? config?.clock && systemClock
      : (stryCov_9fa48("85"),
        (stryMutAct_9fa48("86") ? config.clock : (stryCov_9fa48("86"), config?.clock)) ??
          systemClock);
    const gcConfig: GarbageCollectorConfig = stryMutAct_9fa48("87")
      ? {}
      : (stryCov_9fa48("87"),
        {
          interval: stryMutAct_9fa48("88")
            ? config?.gc?.interval && 60_000
            : (stryCov_9fa48("88"),
              (stryMutAct_9fa48("90")
                ? config.gc?.interval
                : stryMutAct_9fa48("89")
                  ? config?.gc.interval
                  : (stryCov_9fa48("89", "90"), config?.gc?.interval)) ?? 60_000),
          enabled: stryMutAct_9fa48("91")
            ? config?.gc?.enabled && true
            : (stryCov_9fa48("91"),
              (stryMutAct_9fa48("93")
                ? config.gc?.enabled
                : stryMutAct_9fa48("92")
                  ? config?.gc.enabled
                  : (stryCov_9fa48("92", "93"), config?.gc?.enabled)) ??
                (stryMutAct_9fa48("94") ? false : (stryCov_9fa48("94"), true))),
        });

    // Internal storage: serialized cache key -> entry
    const entries = new Map<string, CacheEntry<unknown, unknown>>();
    // Reverse map: serialized key -> CacheKey object
    const keyMap = new Map<string, CacheKey>();
    // Listeners
    const listeners = new Set<CacheListener>();
    // GC timer
    let gcTimer: ReturnType<typeof setTimeout> | undefined;
    let disposed = stryMutAct_9fa48("95") ? true : (stryCov_9fa48("95"), false);
    function emit(event: CacheEvent): void {
      if (stryMutAct_9fa48("96")) {
        {
        }
      } else {
        stryCov_9fa48("96");
        for (const listener of listeners) {
          if (stryMutAct_9fa48("97")) {
            {
            }
          } else {
            stryCov_9fa48("97");
            listener(event);
          }
        }
      }
    }
    function getSerializedKey(port: PortLike, params: unknown): string {
      if (stryMutAct_9fa48("98")) {
        {
        }
      } else {
        stryCov_9fa48("98");
        const cacheKey = createCacheKeyFromName(port.__portName, params);
        return serializeCacheKey(cacheKey);
      }
    }
    function ensureCacheKey(
      port: PortLike,
      params: unknown
    ): {
      serialized: string;
      cacheKey: CacheKey;
    } {
      if (stryMutAct_9fa48("99")) {
        {
        }
      } else {
        stryCov_9fa48("99");
        const cacheKey = createCacheKeyFromName(port.__portName, params);
        const serialized = serializeCacheKey(cacheKey);
        if (
          stryMutAct_9fa48("102")
            ? false
            : stryMutAct_9fa48("101")
              ? true
              : stryMutAct_9fa48("100")
                ? keyMap.has(serialized)
                : (stryCov_9fa48("100", "101", "102"), !keyMap.has(serialized))
        ) {
          if (stryMutAct_9fa48("103")) {
            {
            }
          } else {
            stryCov_9fa48("103");
            keyMap.set(serialized, cacheKey);
          }
        }
        return stryMutAct_9fa48("104")
          ? {}
          : (stryCov_9fa48("104"),
            {
              serialized,
              cacheKey,
            });
      }
    }

    // GC sweep
    function gcSweep(): void {
      if (stryMutAct_9fa48("105")) {
        {
        }
      } else {
        stryCov_9fa48("105");
        const now = clock.now();
        const keysToRemove: string[] = stryMutAct_9fa48("106")
          ? ["Stryker was here"]
          : (stryCov_9fa48("106"), []);
        for (const [serialized, entry] of entries) {
          if (stryMutAct_9fa48("107")) {
            {
            }
          } else {
            stryCov_9fa48("107");
            if (
              stryMutAct_9fa48("111")
                ? entry.observerCount <= 0
                : stryMutAct_9fa48("110")
                  ? entry.observerCount >= 0
                  : stryMutAct_9fa48("109")
                    ? false
                    : stryMutAct_9fa48("108")
                      ? true
                      : (stryCov_9fa48("108", "109", "110", "111"), entry.observerCount > 0)
            )
              continue;
            const cacheTime = DEFAULT_QUERY_OPTIONS.cacheTime;
            if (
              stryMutAct_9fa48("114")
                ? entry.dataUpdatedAt !== undefined || now - entry.dataUpdatedAt > cacheTime
                : stryMutAct_9fa48("113")
                  ? false
                  : stryMutAct_9fa48("112")
                    ? true
                    : (stryCov_9fa48("112", "113", "114"),
                      (stryMutAct_9fa48("116")
                        ? entry.dataUpdatedAt === undefined
                        : stryMutAct_9fa48("115")
                          ? true
                          : (stryCov_9fa48("115", "116"), entry.dataUpdatedAt !== undefined)) &&
                        (stryMutAct_9fa48("119")
                          ? now - entry.dataUpdatedAt <= cacheTime
                          : stryMutAct_9fa48("118")
                            ? now - entry.dataUpdatedAt >= cacheTime
                            : stryMutAct_9fa48("117")
                              ? true
                              : (stryCov_9fa48("117", "118", "119"),
                                (stryMutAct_9fa48("120")
                                  ? now + entry.dataUpdatedAt
                                  : (stryCov_9fa48("120"), now - entry.dataUpdatedAt)) >
                                  cacheTime)))
            ) {
              if (stryMutAct_9fa48("121")) {
                {
                }
              } else {
                stryCov_9fa48("121");
                keysToRemove.push(serialized);
              }
            } else if (
              stryMutAct_9fa48("124")
                ? entry.errorUpdatedAt !== undefined || now - entry.errorUpdatedAt > cacheTime
                : stryMutAct_9fa48("123")
                  ? false
                  : stryMutAct_9fa48("122")
                    ? true
                    : (stryCov_9fa48("122", "123", "124"),
                      (stryMutAct_9fa48("126")
                        ? entry.errorUpdatedAt === undefined
                        : stryMutAct_9fa48("125")
                          ? true
                          : (stryCov_9fa48("125", "126"), entry.errorUpdatedAt !== undefined)) &&
                        (stryMutAct_9fa48("129")
                          ? now - entry.errorUpdatedAt <= cacheTime
                          : stryMutAct_9fa48("128")
                            ? now - entry.errorUpdatedAt >= cacheTime
                            : stryMutAct_9fa48("127")
                              ? true
                              : (stryCov_9fa48("127", "128", "129"),
                                (stryMutAct_9fa48("130")
                                  ? now + entry.errorUpdatedAt
                                  : (stryCov_9fa48("130"), now - entry.errorUpdatedAt)) >
                                  cacheTime)))
            ) {
              if (stryMutAct_9fa48("131")) {
                {
                }
              } else {
                stryCov_9fa48("131");
                keysToRemove.push(serialized);
              }
            }
          }
        }
        for (const serialized of keysToRemove) {
          if (stryMutAct_9fa48("132")) {
            {
            }
          } else {
            stryCov_9fa48("132");
            const key = keyMap.get(serialized);
            entries.delete(serialized);
            keyMap.delete(serialized);
            if (
              stryMutAct_9fa48("134")
                ? false
                : stryMutAct_9fa48("133")
                  ? true
                  : (stryCov_9fa48("133", "134"), key)
            ) {
              if (stryMutAct_9fa48("135")) {
                {
                }
              } else {
                stryCov_9fa48("135");
                emit(
                  stryMutAct_9fa48("136")
                    ? {}
                    : (stryCov_9fa48("136"),
                      {
                        type: stryMutAct_9fa48("137") ? "" : (stryCov_9fa48("137"), "removed"),
                        key,
                      })
                );
              }
            }
          }
        }
      }
    }
    function startGC(): void {
      if (stryMutAct_9fa48("138")) {
        {
        }
      } else {
        stryCov_9fa48("138");
        if (
          stryMutAct_9fa48("141")
            ? (gcConfig.enabled && gcConfig.interval > 0) || gcTimer === undefined
            : stryMutAct_9fa48("140")
              ? false
              : stryMutAct_9fa48("139")
                ? true
                : (stryCov_9fa48("139", "140", "141"),
                  (stryMutAct_9fa48("143")
                    ? gcConfig.enabled || gcConfig.interval > 0
                    : stryMutAct_9fa48("142")
                      ? true
                      : (stryCov_9fa48("142", "143"),
                        gcConfig.enabled &&
                          (stryMutAct_9fa48("146")
                            ? gcConfig.interval <= 0
                            : stryMutAct_9fa48("145")
                              ? gcConfig.interval >= 0
                              : stryMutAct_9fa48("144")
                                ? true
                                : (stryCov_9fa48("144", "145", "146"), gcConfig.interval > 0)))) &&
                    (stryMutAct_9fa48("148")
                      ? gcTimer !== undefined
                      : stryMutAct_9fa48("147")
                        ? true
                        : (stryCov_9fa48("147", "148"), gcTimer === undefined)))
        ) {
          if (stryMutAct_9fa48("149")) {
            {
            }
          } else {
            stryCov_9fa48("149");
            gcTimer = setInterval(gcSweep, gcConfig.interval);
            // Unref the timer so it doesn't keep Node processes alive
            if (
              stryMutAct_9fa48("152")
                ? (typeof gcTimer === "object" && gcTimer !== null) || "unref" in gcTimer
                : stryMutAct_9fa48("151")
                  ? false
                  : stryMutAct_9fa48("150")
                    ? true
                    : (stryCov_9fa48("150", "151", "152"),
                      (stryMutAct_9fa48("154")
                        ? typeof gcTimer === "object" || gcTimer !== null
                        : stryMutAct_9fa48("153")
                          ? true
                          : (stryCov_9fa48("153", "154"),
                            (stryMutAct_9fa48("156")
                              ? typeof gcTimer !== "object"
                              : stryMutAct_9fa48("155")
                                ? true
                                : (stryCov_9fa48("155", "156"),
                                  typeof gcTimer ===
                                    (stryMutAct_9fa48("157")
                                      ? ""
                                      : (stryCov_9fa48("157"), "object")))) &&
                              (stryMutAct_9fa48("159")
                                ? gcTimer === null
                                : stryMutAct_9fa48("158")
                                  ? true
                                  : (stryCov_9fa48("158", "159"), gcTimer !== null)))) &&
                        (stryMutAct_9fa48("160") ? "" : (stryCov_9fa48("160"), "unref")) in gcTimer)
            ) {
              if (stryMutAct_9fa48("161")) {
                {
                }
              } else {
                stryCov_9fa48("161");
                (
                  gcTimer as {
                    unref: () => void;
                  }
                ).unref();
              }
            }
          }
        }
      }
    }
    function stopGC(): void {
      if (stryMutAct_9fa48("162")) {
        {
        }
      } else {
        stryCov_9fa48("162");
        if (
          stryMutAct_9fa48("165")
            ? gcTimer === undefined
            : stryMutAct_9fa48("164")
              ? false
              : stryMutAct_9fa48("163")
                ? true
                : (stryCov_9fa48("163", "164", "165"), gcTimer !== undefined)
        ) {
          if (stryMutAct_9fa48("166")) {
            {
            }
          } else {
            stryCov_9fa48("166");
            clearInterval(gcTimer);
            gcTimer = undefined;
          }
        }
      }
    }
    startGC();
    const cache: QueryCache = stryMutAct_9fa48("167")
      ? {}
      : (stryCov_9fa48("167"),
        {
          get(port: PortLike, params: unknown): CacheEntry<unknown, unknown> | undefined {
            if (stryMutAct_9fa48("168")) {
              {
              }
            } else {
              stryCov_9fa48("168");
              const serialized = getSerializedKey(port, params);
              return entries.get(serialized);
            }
          },
          has(port: PortLike, params: unknown): boolean {
            if (stryMutAct_9fa48("169")) {
              {
              }
            } else {
              stryCov_9fa48("169");
              const serialized = getSerializedKey(port, params);
              return entries.has(serialized);
            }
          },
          getAll(): ReadonlyMap<string, CacheEntry<unknown, unknown>> {
            if (stryMutAct_9fa48("170")) {
              {
              }
            } else {
              stryCov_9fa48("170");
              return entries;
            }
          },
          findByPort(
            port: PortLike
          ): ReadonlyArray<readonly [CacheKey, CacheEntry<unknown, unknown>]> {
            if (stryMutAct_9fa48("171")) {
              {
              }
            } else {
              stryCov_9fa48("171");
              const results: Array<readonly [CacheKey, CacheEntry<unknown, unknown>]> =
                stryMutAct_9fa48("172") ? ["Stryker was here"] : (stryCov_9fa48("172"), []);
              for (const [serialized, entry] of entries) {
                if (stryMutAct_9fa48("173")) {
                  {
                  }
                } else {
                  stryCov_9fa48("173");
                  const key = keyMap.get(serialized);
                  if (
                    stryMutAct_9fa48("176")
                      ? key || cacheKeyMatchesPort(key, port.__portName)
                      : stryMutAct_9fa48("175")
                        ? false
                        : stryMutAct_9fa48("174")
                          ? true
                          : (stryCov_9fa48("174", "175", "176"),
                            key && cacheKeyMatchesPort(key, port.__portName))
                  ) {
                    if (stryMutAct_9fa48("177")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("177");
                      results.push([key, entry] as const);
                    }
                  }
                }
              }
              return results;
            }
          },
          find(
            predicate: (entry: CacheEntry<unknown, unknown>, key: CacheKey) => boolean
          ): ReadonlyArray<readonly [CacheKey, CacheEntry<unknown, unknown>]> {
            if (stryMutAct_9fa48("178")) {
              {
              }
            } else {
              stryCov_9fa48("178");
              const results: Array<readonly [CacheKey, CacheEntry<unknown, unknown>]> =
                stryMutAct_9fa48("179") ? ["Stryker was here"] : (stryCov_9fa48("179"), []);
              for (const [serialized, entry] of entries) {
                if (stryMutAct_9fa48("180")) {
                  {
                  }
                } else {
                  stryCov_9fa48("180");
                  const key = keyMap.get(serialized);
                  if (
                    stryMutAct_9fa48("183")
                      ? key || predicate(entry, key)
                      : stryMutAct_9fa48("182")
                        ? false
                        : stryMutAct_9fa48("181")
                          ? true
                          : (stryCov_9fa48("181", "182", "183"), key && predicate(entry, key))
                  ) {
                    if (stryMutAct_9fa48("184")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("184");
                      results.push([key, entry] as const);
                    }
                  }
                }
              }
              return results;
            }
          },
          set(
            port: PortLike,
            params: unknown,
            data: unknown,
            options?: {
              readonly structuralSharing?: boolean;
            }
          ): void {
            if (stryMutAct_9fa48("185")) {
              {
              }
            } else {
              stryCov_9fa48("185");
              const { serialized, cacheKey } = ensureCacheKey(port, params);
              const prev = entries.get(serialized);
              const useStructuralSharing = stryMutAct_9fa48("186")
                ? options?.structuralSharing && true
                : (stryCov_9fa48("186"),
                  (stryMutAct_9fa48("187")
                    ? options.structuralSharing
                    : (stryCov_9fa48("187"), options?.structuralSharing)) ??
                    (stryMutAct_9fa48("188") ? false : (stryCov_9fa48("188"), true)));
              let finalData = data;
              if (
                stryMutAct_9fa48("191")
                  ? useStructuralSharing || prev?.data !== undefined
                  : stryMutAct_9fa48("190")
                    ? false
                    : stryMutAct_9fa48("189")
                      ? true
                      : (stryCov_9fa48("189", "190", "191"),
                        useStructuralSharing &&
                          (stryMutAct_9fa48("193")
                            ? prev?.data === undefined
                            : stryMutAct_9fa48("192")
                              ? true
                              : (stryCov_9fa48("192", "193"),
                                (stryMutAct_9fa48("194")
                                  ? prev.data
                                  : (stryCov_9fa48("194"), prev?.data)) !== undefined)))
              ) {
                if (stryMutAct_9fa48("195")) {
                  {
                  }
                } else {
                  stryCov_9fa48("195");
                  finalData = replaceEqualDeep(prev.data, data);
                }
              }
              const result = ok(finalData);
              const newEntry = createSuccessEntry(result, finalData, clock.now(), prev);
              entries.set(serialized, newEntry);
              if (
                stryMutAct_9fa48("198")
                  ? prev !== undefined
                  : stryMutAct_9fa48("197")
                    ? false
                    : stryMutAct_9fa48("196")
                      ? true
                      : (stryCov_9fa48("196", "197", "198"), prev === undefined)
              ) {
                if (stryMutAct_9fa48("199")) {
                  {
                  }
                } else {
                  stryCov_9fa48("199");
                  emit(
                    stryMutAct_9fa48("200")
                      ? {}
                      : (stryCov_9fa48("200"),
                        {
                          type: stryMutAct_9fa48("201") ? "" : (stryCov_9fa48("201"), "added"),
                          key: cacheKey,
                          entry: newEntry,
                        })
                  );
                }
              } else {
                if (stryMutAct_9fa48("202")) {
                  {
                  }
                } else {
                  stryCov_9fa48("202");
                  emit(
                    stryMutAct_9fa48("203")
                      ? {}
                      : (stryCov_9fa48("203"),
                        {
                          type: stryMutAct_9fa48("204") ? "" : (stryCov_9fa48("204"), "updated"),
                          key: cacheKey,
                          entry: newEntry,
                        })
                  );
                }
              }
            }
          },
          setError(port: PortLike, params: unknown, error: unknown): void {
            if (stryMutAct_9fa48("205")) {
              {
              }
            } else {
              stryCov_9fa48("205");
              const { serialized, cacheKey } = ensureCacheKey(port, params);
              const prev = entries.get(serialized);
              const result = err(error);
              const newEntry = createErrorEntry(result, error, clock.now(), prev);
              entries.set(serialized, newEntry);
              if (
                stryMutAct_9fa48("208")
                  ? prev !== undefined
                  : stryMutAct_9fa48("207")
                    ? false
                    : stryMutAct_9fa48("206")
                      ? true
                      : (stryCov_9fa48("206", "207", "208"), prev === undefined)
              ) {
                if (stryMutAct_9fa48("209")) {
                  {
                  }
                } else {
                  stryCov_9fa48("209");
                  emit(
                    stryMutAct_9fa48("210")
                      ? {}
                      : (stryCov_9fa48("210"),
                        {
                          type: stryMutAct_9fa48("211") ? "" : (stryCov_9fa48("211"), "added"),
                          key: cacheKey,
                          entry: newEntry,
                        })
                  );
                }
              } else {
                if (stryMutAct_9fa48("212")) {
                  {
                  }
                } else {
                  stryCov_9fa48("212");
                  emit(
                    stryMutAct_9fa48("213")
                      ? {}
                      : (stryCov_9fa48("213"),
                        {
                          type: stryMutAct_9fa48("214") ? "" : (stryCov_9fa48("214"), "updated"),
                          key: cacheKey,
                          entry: newEntry,
                        })
                  );
                }
              }
            }
          },
          invalidate(port: PortLike, params?: unknown): void {
            if (stryMutAct_9fa48("215")) {
              {
              }
            } else {
              stryCov_9fa48("215");
              if (
                stryMutAct_9fa48("218")
                  ? params === undefined
                  : stryMutAct_9fa48("217")
                    ? false
                    : stryMutAct_9fa48("216")
                      ? true
                      : (stryCov_9fa48("216", "217", "218"), params !== undefined)
              ) {
                if (stryMutAct_9fa48("219")) {
                  {
                  }
                } else {
                  stryCov_9fa48("219");
                  const { serialized, cacheKey } = ensureCacheKey(port, params);
                  const entry = entries.get(serialized);
                  if (
                    stryMutAct_9fa48("221")
                      ? false
                      : stryMutAct_9fa48("220")
                        ? true
                        : (stryCov_9fa48("220", "221"), entry)
                  ) {
                    if (stryMutAct_9fa48("222")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("222");
                      entries.set(serialized, withInvalidated(entry));
                      emit(
                        stryMutAct_9fa48("223")
                          ? {}
                          : (stryCov_9fa48("223"),
                            {
                              type: stryMutAct_9fa48("224")
                                ? ""
                                : (stryCov_9fa48("224"), "invalidated"),
                              key: cacheKey,
                            })
                      );
                    }
                  }
                }
              } else {
                if (stryMutAct_9fa48("225")) {
                  {
                  }
                } else {
                  stryCov_9fa48("225");
                  for (const [serialized, entry] of entries) {
                    if (stryMutAct_9fa48("226")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("226");
                      const key = keyMap.get(serialized);
                      if (
                        stryMutAct_9fa48("229")
                          ? key || cacheKeyMatchesPort(key, port.__portName)
                          : stryMutAct_9fa48("228")
                            ? false
                            : stryMutAct_9fa48("227")
                              ? true
                              : (stryCov_9fa48("227", "228", "229"),
                                key && cacheKeyMatchesPort(key, port.__portName))
                      ) {
                        if (stryMutAct_9fa48("230")) {
                          {
                          }
                        } else {
                          stryCov_9fa48("230");
                          entries.set(serialized, withInvalidated(entry));
                          emit(
                            stryMutAct_9fa48("231")
                              ? {}
                              : (stryCov_9fa48("231"),
                                {
                                  type: stryMutAct_9fa48("232")
                                    ? ""
                                    : (stryCov_9fa48("232"), "invalidated"),
                                  key,
                                })
                          );
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          remove(port: PortLike, params?: unknown): void {
            if (stryMutAct_9fa48("233")) {
              {
              }
            } else {
              stryCov_9fa48("233");
              if (
                stryMutAct_9fa48("236")
                  ? params === undefined
                  : stryMutAct_9fa48("235")
                    ? false
                    : stryMutAct_9fa48("234")
                      ? true
                      : (stryCov_9fa48("234", "235", "236"), params !== undefined)
              ) {
                if (stryMutAct_9fa48("237")) {
                  {
                  }
                } else {
                  stryCov_9fa48("237");
                  const { serialized, cacheKey } = ensureCacheKey(port, params);
                  if (
                    stryMutAct_9fa48("239")
                      ? false
                      : stryMutAct_9fa48("238")
                        ? true
                        : (stryCov_9fa48("238", "239"), entries.has(serialized))
                  ) {
                    if (stryMutAct_9fa48("240")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("240");
                      entries.delete(serialized);
                      keyMap.delete(serialized);
                      emit(
                        stryMutAct_9fa48("241")
                          ? {}
                          : (stryCov_9fa48("241"),
                            {
                              type: stryMutAct_9fa48("242")
                                ? ""
                                : (stryCov_9fa48("242"), "removed"),
                              key: cacheKey,
                            })
                      );
                    }
                  }
                }
              } else {
                if (stryMutAct_9fa48("243")) {
                  {
                  }
                } else {
                  stryCov_9fa48("243");
                  const keysToRemove: string[] = stryMutAct_9fa48("244")
                    ? ["Stryker was here"]
                    : (stryCov_9fa48("244"), []);
                  for (const [serialized] of entries) {
                    if (stryMutAct_9fa48("245")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("245");
                      const key = keyMap.get(serialized);
                      if (
                        stryMutAct_9fa48("248")
                          ? key || cacheKeyMatchesPort(key, port.__portName)
                          : stryMutAct_9fa48("247")
                            ? false
                            : stryMutAct_9fa48("246")
                              ? true
                              : (stryCov_9fa48("246", "247", "248"),
                                key && cacheKeyMatchesPort(key, port.__portName))
                      ) {
                        if (stryMutAct_9fa48("249")) {
                          {
                          }
                        } else {
                          stryCov_9fa48("249");
                          keysToRemove.push(serialized);
                        }
                      }
                    }
                  }
                  for (const serialized of keysToRemove) {
                    if (stryMutAct_9fa48("250")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("250");
                      const key = keyMap.get(serialized);
                      entries.delete(serialized);
                      keyMap.delete(serialized);
                      if (
                        stryMutAct_9fa48("252")
                          ? false
                          : stryMutAct_9fa48("251")
                            ? true
                            : (stryCov_9fa48("251", "252"), key)
                      ) {
                        if (stryMutAct_9fa48("253")) {
                          {
                          }
                        } else {
                          stryCov_9fa48("253");
                          emit(
                            stryMutAct_9fa48("254")
                              ? {}
                              : (stryCov_9fa48("254"),
                                {
                                  type: stryMutAct_9fa48("255")
                                    ? ""
                                    : (stryCov_9fa48("255"), "removed"),
                                  key,
                                })
                          );
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          clear(): void {
            if (stryMutAct_9fa48("256")) {
              {
              }
            } else {
              stryCov_9fa48("256");
              entries.clear();
              keyMap.clear();
              emit(
                stryMutAct_9fa48("257")
                  ? {}
                  : (stryCov_9fa48("257"),
                    {
                      type: stryMutAct_9fa48("258") ? "" : (stryCov_9fa48("258"), "cleared"),
                    })
              );
            }
          },
          getOrCreate(port: PortLike, params: unknown): CacheEntry<unknown, unknown> {
            if (stryMutAct_9fa48("259")) {
              {
              }
            } else {
              stryCov_9fa48("259");
              const { serialized, cacheKey } = ensureCacheKey(port, params);
              const existing = entries.get(serialized);
              if (
                stryMutAct_9fa48("261")
                  ? false
                  : stryMutAct_9fa48("260")
                    ? true
                    : (stryCov_9fa48("260", "261"), existing)
              ) {
                if (stryMutAct_9fa48("262")) {
                  {
                  }
                } else {
                  stryCov_9fa48("262");
                  return existing;
                }
              }
              const pending = createPendingEntry();
              entries.set(serialized, pending);
              emit(
                stryMutAct_9fa48("263")
                  ? {}
                  : (stryCov_9fa48("263"),
                    {
                      type: stryMutAct_9fa48("264") ? "" : (stryCov_9fa48("264"), "added"),
                      key: cacheKey,
                      entry: pending,
                    })
              );
              return pending;
            }
          },
          incrementObservers(port: PortLike, params: unknown): void {
            if (stryMutAct_9fa48("265")) {
              {
              }
            } else {
              stryCov_9fa48("265");
              const serialized = getSerializedKey(port, params);
              const entry = entries.get(serialized);
              if (
                stryMutAct_9fa48("267")
                  ? false
                  : stryMutAct_9fa48("266")
                    ? true
                    : (stryCov_9fa48("266", "267"), entry)
              ) {
                if (stryMutAct_9fa48("268")) {
                  {
                  }
                } else {
                  stryCov_9fa48("268");
                  entries.set(
                    serialized,
                    withObserverCount(
                      entry,
                      stryMutAct_9fa48("269")
                        ? entry.observerCount - 1
                        : (stryCov_9fa48("269"), entry.observerCount + 1)
                    )
                  );
                }
              }
            }
          },
          decrementObservers(port: PortLike, params: unknown): void {
            if (stryMutAct_9fa48("270")) {
              {
              }
            } else {
              stryCov_9fa48("270");
              const serialized = getSerializedKey(port, params);
              const entry = entries.get(serialized);
              if (
                stryMutAct_9fa48("273")
                  ? entry || entry.observerCount > 0
                  : stryMutAct_9fa48("272")
                    ? false
                    : stryMutAct_9fa48("271")
                      ? true
                      : (stryCov_9fa48("271", "272", "273"),
                        entry &&
                          (stryMutAct_9fa48("276")
                            ? entry.observerCount <= 0
                            : stryMutAct_9fa48("275")
                              ? entry.observerCount >= 0
                              : stryMutAct_9fa48("274")
                                ? true
                                : (stryCov_9fa48("274", "275", "276"), entry.observerCount > 0)))
              ) {
                if (stryMutAct_9fa48("277")) {
                  {
                  }
                } else {
                  stryCov_9fa48("277");
                  entries.set(
                    serialized,
                    withObserverCount(
                      entry,
                      stryMutAct_9fa48("278")
                        ? entry.observerCount + 1
                        : (stryCov_9fa48("278"), entry.observerCount - 1)
                    )
                  );
                }
              }
            }
          },
          subscribe(listener: CacheListener): Unsubscribe {
            if (stryMutAct_9fa48("279")) {
              {
              }
            } else {
              stryCov_9fa48("279");
              listeners.add(listener);
              return () => {
                if (stryMutAct_9fa48("280")) {
                  {
                  }
                } else {
                  stryCov_9fa48("280");
                  listeners.delete(listener);
                }
              };
            }
          },
          get size(): number {
            if (stryMutAct_9fa48("281")) {
              {
              }
            } else {
              stryCov_9fa48("281");
              return entries.size;
            }
          },
          dispose(): void {
            if (stryMutAct_9fa48("282")) {
              {
              }
            } else {
              stryCov_9fa48("282");
              if (
                stryMutAct_9fa48("284")
                  ? false
                  : stryMutAct_9fa48("283")
                    ? true
                    : (stryCov_9fa48("283", "284"), disposed)
              )
                return;
              disposed = stryMutAct_9fa48("285") ? false : (stryCov_9fa48("285"), true);
              stopGC();
              entries.clear();
              keyMap.clear();
              listeners.clear();
            }
          },
        });
    return cache;
  }
}
