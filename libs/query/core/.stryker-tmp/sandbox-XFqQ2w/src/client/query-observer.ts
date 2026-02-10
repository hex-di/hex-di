/**
 * QueryObserver - Subscribes to a single query and tracks state changes.
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
import type { QueryPort } from "../ports/query-port.js";
import type { CacheEntry } from "../cache/cache-entry.js";
import type { QueryState, QueryStatus, FetchStatus } from "../types/state.js";
import type { QueryResolutionError } from "../types/errors.js";
import type { RefetchOptions } from "../types/options.js";

// Forward reference to QueryClient-like (avoid circular import)
interface QueryClientLike {
  fetchQuery<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams
  ): ResultAsync<TData, TError | QueryResolutionError>;
  readonly cache: {
    get(
      port: {
        readonly __portName: string;
      },
      params: unknown
    ): CacheEntry<unknown, unknown> | undefined;
    getOrCreate(
      port: {
        readonly __portName: string;
      },
      params: unknown
    ): CacheEntry<unknown, unknown>;
    incrementObservers(
      port: {
        readonly __portName: string;
      },
      params: unknown
    ): void;
    decrementObservers(
      port: {
        readonly __portName: string;
      },
      params: unknown
    ): void;
    subscribe(listener: (event: unknown) => void): () => void;
  };
}

// =============================================================================
// Observer Options
// =============================================================================

export interface QueryObserverOptions<TData, TError> {
  readonly enabled?: boolean;
  readonly staleTime?: number;
  readonly refetchOnMount?: boolean | "always";
  readonly select?: (data: TData) => unknown;
  readonly notifyOnChangeProps?: ReadonlyArray<keyof QueryState<TData, TError>>;
}

// =============================================================================
// Observer Interface
// =============================================================================

export interface QueryObserver<TData, TError = Error> {
  subscribe(listener: (state: QueryState<TData, TError>) => void): () => void;
  getState(): QueryState<TData, TError>;
  refetch(options?: RefetchOptions): ResultAsync<TData, TError | QueryResolutionError>;
  destroy(): void;
  readonly isDestroyed: boolean;
}

// =============================================================================
// BRAND_CAST: Type-erased cache entry narrowing
// =============================================================================

/**
 * BRAND_CAST: Narrows type-erased cache entry fields to the observer's
 * generic types. The cache stores <unknown, unknown>; the observer's port
 * guarantees the stored data matches <TData, TError>.
 */
function narrowEntryData<TData>(data: unknown): TData | undefined {
  if (stryMutAct_9fa48("771")) {
    {
    }
  } else {
    stryCov_9fa48("771");
    return data as TData | undefined;
  }
}
function narrowEntryError<TError>(error: unknown): TError | null {
  if (stryMutAct_9fa48("772")) {
    {
    }
  } else {
    stryCov_9fa48("772");
    return error as TError | null;
  }
}
function narrowEntryResult<TData, TError>(
  result: CacheEntry<unknown, unknown>["result"]
): QueryState<TData, TError>["result"] {
  if (stryMutAct_9fa48("773")) {
    {
    }
  } else {
    stryCov_9fa48("773");
    return result as QueryState<TData, TError>["result"];
  }
}

// =============================================================================
// Observer Factory
// =============================================================================

const DEFAULT_STATUS: QueryStatus = stryMutAct_9fa48("774")
  ? ""
  : (stryCov_9fa48("774"), "pending");
export function createQueryObserver<TData, TParams, TError, TName extends string>(
  client: QueryClientLike,
  port: QueryPort<TName, TData, TParams, TError>,
  params: TParams,
  options?: QueryObserverOptions<TData, TError>
): QueryObserver<TData, TError> {
  if (stryMutAct_9fa48("775")) {
    {
    }
  } else {
    stryCov_9fa48("775");
    const listeners = new Set<(state: QueryState<TData, TError>) => void>();
    let destroyed = stryMutAct_9fa48("776") ? true : (stryCov_9fa48("776"), false);
    let isFetching = stryMutAct_9fa48("777") ? true : (stryCov_9fa48("777"), false);

    // Register as observer
    client.cache.getOrCreate(port, params);
    client.cache.incrementObservers(port, params);
    function deriveState(
      entry: CacheEntry<unknown, unknown> | undefined
    ): QueryState<TData, TError> {
      if (stryMutAct_9fa48("778")) {
        {
        }
      } else {
        stryCov_9fa48("778");
        const status: QueryStatus = stryMutAct_9fa48("779")
          ? entry?.status && DEFAULT_STATUS
          : (stryCov_9fa48("779"),
            (stryMutAct_9fa48("780") ? entry.status : (stryCov_9fa48("780"), entry?.status)) ??
              DEFAULT_STATUS);
        const fetchStatus: FetchStatus = isFetching
          ? stryMutAct_9fa48("781")
            ? ""
            : (stryCov_9fa48("781"), "fetching")
          : stryMutAct_9fa48("782")
            ? ""
            : (stryCov_9fa48("782"), "idle");
        const data = narrowEntryData<TData>(
          stryMutAct_9fa48("783") ? entry.data : (stryCov_9fa48("783"), entry?.data)
        );
        const error = narrowEntryError<TError>(
          stryMutAct_9fa48("784")
            ? entry?.error && null
            : (stryCov_9fa48("784"),
              (stryMutAct_9fa48("785") ? entry.error : (stryCov_9fa48("785"), entry?.error)) ??
                null)
        );
        return stryMutAct_9fa48("786")
          ? {}
          : (stryCov_9fa48("786"),
            {
              status,
              fetchStatus,
              isPending: stryMutAct_9fa48("789")
                ? status !== "pending"
                : stryMutAct_9fa48("788")
                  ? false
                  : stryMutAct_9fa48("787")
                    ? true
                    : (stryCov_9fa48("787", "788", "789"),
                      status ===
                        (stryMutAct_9fa48("790") ? "" : (stryCov_9fa48("790"), "pending"))),
              isSuccess: stryMutAct_9fa48("793")
                ? status !== "success"
                : stryMutAct_9fa48("792")
                  ? false
                  : stryMutAct_9fa48("791")
                    ? true
                    : (stryCov_9fa48("791", "792", "793"),
                      status ===
                        (stryMutAct_9fa48("794") ? "" : (stryCov_9fa48("794"), "success"))),
              isError: stryMutAct_9fa48("797")
                ? status !== "error"
                : stryMutAct_9fa48("796")
                  ? false
                  : stryMutAct_9fa48("795")
                    ? true
                    : (stryCov_9fa48("795", "796", "797"),
                      status === (stryMutAct_9fa48("798") ? "" : (stryCov_9fa48("798"), "error"))),
              isFetching: stryMutAct_9fa48("801")
                ? fetchStatus !== "fetching"
                : stryMutAct_9fa48("800")
                  ? false
                  : stryMutAct_9fa48("799")
                    ? true
                    : (stryCov_9fa48("799", "800", "801"),
                      fetchStatus ===
                        (stryMutAct_9fa48("802") ? "" : (stryCov_9fa48("802"), "fetching"))),
              isRefetching: stryMutAct_9fa48("805")
                ? status === "success" || fetchStatus === "fetching"
                : stryMutAct_9fa48("804")
                  ? false
                  : stryMutAct_9fa48("803")
                    ? true
                    : (stryCov_9fa48("803", "804", "805"),
                      (stryMutAct_9fa48("807")
                        ? status !== "success"
                        : stryMutAct_9fa48("806")
                          ? true
                          : (stryCov_9fa48("806", "807"),
                            status ===
                              (stryMutAct_9fa48("808")
                                ? ""
                                : (stryCov_9fa48("808"), "success")))) &&
                        (stryMutAct_9fa48("810")
                          ? fetchStatus !== "fetching"
                          : stryMutAct_9fa48("809")
                            ? true
                            : (stryCov_9fa48("809", "810"),
                              fetchStatus ===
                                (stryMutAct_9fa48("811")
                                  ? ""
                                  : (stryCov_9fa48("811"), "fetching"))))),
              isLoading: stryMutAct_9fa48("814")
                ? status === "pending" || fetchStatus === "fetching"
                : stryMutAct_9fa48("813")
                  ? false
                  : stryMutAct_9fa48("812")
                    ? true
                    : (stryCov_9fa48("812", "813", "814"),
                      (stryMutAct_9fa48("816")
                        ? status !== "pending"
                        : stryMutAct_9fa48("815")
                          ? true
                          : (stryCov_9fa48("815", "816"),
                            status ===
                              (stryMutAct_9fa48("817")
                                ? ""
                                : (stryCov_9fa48("817"), "pending")))) &&
                        (stryMutAct_9fa48("819")
                          ? fetchStatus !== "fetching"
                          : stryMutAct_9fa48("818")
                            ? true
                            : (stryCov_9fa48("818", "819"),
                              fetchStatus ===
                                (stryMutAct_9fa48("820")
                                  ? ""
                                  : (stryCov_9fa48("820"), "fetching"))))),
              isStale: stryMutAct_9fa48("821")
                ? entry?.isInvalidated && true
                : (stryCov_9fa48("821"),
                  (stryMutAct_9fa48("822")
                    ? entry.isInvalidated
                    : (stryCov_9fa48("822"), entry?.isInvalidated)) ??
                    (stryMutAct_9fa48("823") ? false : (stryCov_9fa48("823"), true))),
              isPlaceholderData: stryMutAct_9fa48("824") ? true : (stryCov_9fa48("824"), false),
              result: narrowEntryResult<TData, TError>(
                stryMutAct_9fa48("825") ? entry.result : (stryCov_9fa48("825"), entry?.result)
              ),
              data,
              error,
              dataUpdatedAt: stryMutAct_9fa48("826")
                ? entry.dataUpdatedAt
                : (stryCov_9fa48("826"), entry?.dataUpdatedAt),
              errorUpdatedAt: stryMutAct_9fa48("827")
                ? entry.errorUpdatedAt
                : (stryCov_9fa48("827"), entry?.errorUpdatedAt),
              refetch: stryMutAct_9fa48("828")
                ? () => undefined
                : (stryCov_9fa48("828"), (opts?: RefetchOptions) => observer.refetch(opts)),
            });
      }
    }
    function notify(): void {
      if (stryMutAct_9fa48("829")) {
        {
        }
      } else {
        stryCov_9fa48("829");
        if (
          stryMutAct_9fa48("831")
            ? false
            : stryMutAct_9fa48("830")
              ? true
              : (stryCov_9fa48("830", "831"), destroyed)
        )
          return;
        const entry = client.cache.get(port, params);
        const state = deriveState(entry);
        for (const listener of listeners) {
          if (stryMutAct_9fa48("832")) {
            {
            }
          } else {
            stryCov_9fa48("832");
            listener(state);
          }
        }
      }
    }

    // Subscribe to cache events
    const unsubscribeCache = client.cache.subscribe(() => {
      if (stryMutAct_9fa48("833")) {
        {
        }
      } else {
        stryCov_9fa48("833");
        notify();
      }
    });

    // Initial fetch if enabled
    const enabled = stryMutAct_9fa48("834")
      ? options?.enabled && true
      : (stryCov_9fa48("834"),
        (stryMutAct_9fa48("835") ? options.enabled : (stryCov_9fa48("835"), options?.enabled)) ??
          (stryMutAct_9fa48("836") ? false : (stryCov_9fa48("836"), true)));
    if (
      stryMutAct_9fa48("838")
        ? false
        : stryMutAct_9fa48("837")
          ? true
          : (stryCov_9fa48("837", "838"), enabled)
    ) {
      if (stryMutAct_9fa48("839")) {
        {
        }
      } else {
        stryCov_9fa48("839");
        isFetching = stryMutAct_9fa48("840") ? false : (stryCov_9fa48("840"), true);
        void client
          .fetchQuery(port, params)
          .map(() => {
            if (stryMutAct_9fa48("841")) {
              {
              }
            } else {
              stryCov_9fa48("841");
              isFetching = stryMutAct_9fa48("842") ? true : (stryCov_9fa48("842"), false);
              notify();
            }
          })
          .mapErr(() => {
            if (stryMutAct_9fa48("843")) {
              {
              }
            } else {
              stryCov_9fa48("843");
              isFetching = stryMutAct_9fa48("844") ? true : (stryCov_9fa48("844"), false);
              notify();
            }
          });
      }
    }
    const observer: QueryObserver<TData, TError> = stryMutAct_9fa48("845")
      ? {}
      : (stryCov_9fa48("845"),
        {
          subscribe(listener: (state: QueryState<TData, TError>) => void): () => void {
            if (stryMutAct_9fa48("846")) {
              {
              }
            } else {
              stryCov_9fa48("846");
              listeners.add(listener);
              return () => {
                if (stryMutAct_9fa48("847")) {
                  {
                  }
                } else {
                  stryCov_9fa48("847");
                  listeners.delete(listener);
                }
              };
            }
          },
          getState(): QueryState<TData, TError> {
            if (stryMutAct_9fa48("848")) {
              {
              }
            } else {
              stryCov_9fa48("848");
              const entry = client.cache.get(port, params);
              return deriveState(entry);
            }
          },
          refetch(_options?: RefetchOptions): ResultAsync<TData, TError | QueryResolutionError> {
            if (stryMutAct_9fa48("849")) {
              {
              }
            } else {
              stryCov_9fa48("849");
              isFetching = stryMutAct_9fa48("850") ? false : (stryCov_9fa48("850"), true);
              notify();
              const result = client.fetchQuery(port, params);
              void result
                .map(() => {
                  if (stryMutAct_9fa48("851")) {
                    {
                    }
                  } else {
                    stryCov_9fa48("851");
                    isFetching = stryMutAct_9fa48("852") ? true : (stryCov_9fa48("852"), false);
                    notify();
                  }
                })
                .mapErr(() => {
                  if (stryMutAct_9fa48("853")) {
                    {
                    }
                  } else {
                    stryCov_9fa48("853");
                    isFetching = stryMutAct_9fa48("854") ? true : (stryCov_9fa48("854"), false);
                    notify();
                  }
                });
              return result;
            }
          },
          destroy(): void {
            if (stryMutAct_9fa48("855")) {
              {
              }
            } else {
              stryCov_9fa48("855");
              if (
                stryMutAct_9fa48("857")
                  ? false
                  : stryMutAct_9fa48("856")
                    ? true
                    : (stryCov_9fa48("856", "857"), destroyed)
              )
                return;
              destroyed = stryMutAct_9fa48("858") ? false : (stryCov_9fa48("858"), true);
              unsubscribeCache();
              client.cache.decrementObservers(port, params);
              listeners.clear();
            }
          },
          get isDestroyed(): boolean {
            if (stryMutAct_9fa48("859")) {
              {
              }
            } else {
              stryCov_9fa48("859");
              return destroyed;
            }
          },
        });
    return observer;
  }
}
