/**
 * useSuspenseQuery Hook
 *
 * Integrates with React Suspense to throw Promises when data is
 * loading and errors for ErrorBoundary. When the data is ready,
 * the returned state always has `status: "success"` with `TData`.
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
import { useRef, useCallback, useSyncExternalStore, useEffect } from "react";
import type { QueryPort, QueryState, QueryObserver, QueryObserverOptions } from "@hex-di/query";
import { useQueryClient } from "../context/query-client-context.js";

// =============================================================================
// SuspenseQueryState
// =============================================================================

export interface SuspenseQueryState<TData, _TError> {
  readonly status: "success";
  readonly data: TData;
  readonly isSuccess: true;
  readonly isFetching: boolean;
  readonly isRefetching: boolean;
  readonly dataUpdatedAt: number | undefined;
}

// =============================================================================
// SuspenseQueryOptions
// =============================================================================

export interface SuspenseQueryOptions {
  readonly enabled?: boolean;
}

// =============================================================================
// Suspense promise cache
// =============================================================================

interface SuspenseEntry {
  readonly promise: Promise<void>;
  result:
    | "pending"
    | "success"
    | {
        readonly error: unknown;
      };
}
const suspenseCache = new Map<string, SuspenseEntry>();

// =============================================================================
// useSuspenseQuery Hook
// =============================================================================

/**
 * Subscribe to a query with Suspense integration.
 *
 * If data is not available, throws a Promise for React Suspense.
 * If an error occurs, throws the error for ErrorBoundary.
 * When data is available, returns a narrowed success state.
 */
export function useSuspenseQuery<TData, TParams, TError, TName extends string>(
  port: QueryPort<TName, TData, TParams, TError>,
  params: TParams,
  options?: SuspenseQueryOptions
): SuspenseQueryState<TData, TError> {
  if (stryMutAct_9fa48("550")) {
    {
    }
  } else {
    stryCov_9fa48("550");
    const client = useQueryClient();
    const observerRef = useRef<QueryObserver<TData, TError> | null>(null);
    const snapshotRef = useRef<QueryState<TData, TError> | null>(null);

    // Lazily create/recreate observer
    if (
      stryMutAct_9fa48("553")
        ? observerRef.current === null && observerRef.current.isDestroyed
        : stryMutAct_9fa48("552")
          ? false
          : stryMutAct_9fa48("551")
            ? true
            : (stryCov_9fa48("551", "552", "553"),
              (stryMutAct_9fa48("555")
                ? observerRef.current !== null
                : stryMutAct_9fa48("554")
                  ? false
                  : (stryCov_9fa48("554", "555"), observerRef.current === null)) ||
                observerRef.current.isDestroyed)
    ) {
      if (stryMutAct_9fa48("556")) {
        {
        }
      } else {
        stryCov_9fa48("556");
        const observerOptions: QueryObserverOptions<TData, TError> = stryMutAct_9fa48("557")
          ? {}
          : (stryCov_9fa48("557"),
            {
              enabled: stryMutAct_9fa48("558")
                ? options.enabled
                : (stryCov_9fa48("558"), options?.enabled),
            });
        observerRef.current = client.observe(port, params, observerOptions);
        snapshotRef.current = null;
      }
    }
    const observer = observerRef.current;

    // Cleanup observer and suspense cache entry on unmount
    useEffect(
      () => {
        if (stryMutAct_9fa48("559")) {
          {
          }
        } else {
          stryCov_9fa48("559");
          return () => {
            if (stryMutAct_9fa48("560")) {
              {
              }
            } else {
              stryCov_9fa48("560");
              observer.destroy();
            }
          };
        }
      },
      stryMutAct_9fa48("561") ? [] : (stryCov_9fa48("561"), [observer])
    );
    const subscribe = useCallback(
      (onStoreChange: () => void) => {
        if (stryMutAct_9fa48("562")) {
          {
          }
        } else {
          stryCov_9fa48("562");
          const unsubscribe = observer.subscribe(() => {
            if (stryMutAct_9fa48("563")) {
              {
              }
            } else {
              stryCov_9fa48("563");
              snapshotRef.current = null;
              onStoreChange();
            }
          });
          // Check for missed notifications between getSnapshot and subscribe
          const currentState = observer.getState();
          if (
            stryMutAct_9fa48("566")
              ? snapshotRef.current !== null || currentState.status !== snapshotRef.current.status
              : stryMutAct_9fa48("565")
                ? false
                : stryMutAct_9fa48("564")
                  ? true
                  : (stryCov_9fa48("564", "565", "566"),
                    (stryMutAct_9fa48("568")
                      ? snapshotRef.current === null
                      : stryMutAct_9fa48("567")
                        ? true
                        : (stryCov_9fa48("567", "568"), snapshotRef.current !== null)) &&
                      (stryMutAct_9fa48("570")
                        ? currentState.status === snapshotRef.current.status
                        : stryMutAct_9fa48("569")
                          ? true
                          : (stryCov_9fa48("569", "570"),
                            currentState.status !== snapshotRef.current.status)))
          ) {
            if (stryMutAct_9fa48("571")) {
              {
              }
            } else {
              stryCov_9fa48("571");
              snapshotRef.current = null;
              onStoreChange();
            }
          }
          return unsubscribe;
        }
      },
      stryMutAct_9fa48("572") ? [] : (stryCov_9fa48("572"), [observer])
    );
    const getSnapshot = useCallback(
      (): QueryState<TData, TError> => {
        if (stryMutAct_9fa48("573")) {
          {
          }
        } else {
          stryCov_9fa48("573");
          if (
            stryMutAct_9fa48("576")
              ? snapshotRef.current === null
              : stryMutAct_9fa48("575")
                ? false
                : stryMutAct_9fa48("574")
                  ? true
                  : (stryCov_9fa48("574", "575", "576"), snapshotRef.current !== null)
          ) {
            if (stryMutAct_9fa48("577")) {
              {
              }
            } else {
              stryCov_9fa48("577");
              return snapshotRef.current;
            }
          }
          const state = observer.getState();
          snapshotRef.current = state;
          return state;
        }
      },
      stryMutAct_9fa48("578") ? [] : (stryCov_9fa48("578"), [observer])
    );

    // Use useSyncExternalStore for the raw state (no throws inside getSnapshot)
    const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    // Suspense protocol: throw during render

    // If we have data, return success state immediately
    if (
      stryMutAct_9fa48("581")
        ? state.data === undefined
        : stryMutAct_9fa48("580")
          ? false
          : stryMutAct_9fa48("579")
            ? true
            : (stryCov_9fa48("579", "580", "581"), state.data !== undefined)
    ) {
      if (stryMutAct_9fa48("582")) {
        {
        }
      } else {
        stryCov_9fa48("582");
        return stryMutAct_9fa48("583")
          ? {}
          : (stryCov_9fa48("583"),
            {
              status: stryMutAct_9fa48("584") ? "" : (stryCov_9fa48("584"), "success"),
              data: state.data,
              isSuccess: stryMutAct_9fa48("585") ? false : (stryCov_9fa48("585"), true),
              isFetching: state.isFetching,
              isRefetching: state.isRefetching,
              dataUpdatedAt: state.dataUpdatedAt,
            });
      }
    }

    // No data available -- use suspense cache to track fetch state
    const cacheKey =
      port.__portName +
      (stryMutAct_9fa48("586") ? "" : (stryCov_9fa48("586"), "\0")) +
      JSON.stringify(params);
    const existing = suspenseCache.get(cacheKey);
    if (
      stryMutAct_9fa48("589")
        ? existing === undefined
        : stryMutAct_9fa48("588")
          ? false
          : stryMutAct_9fa48("587")
            ? true
            : (stryCov_9fa48("587", "588", "589"), existing !== undefined)
    ) {
      if (stryMutAct_9fa48("590")) {
        {
        }
      } else {
        stryCov_9fa48("590");
        if (
          stryMutAct_9fa48("593")
            ? existing.result !== "success"
            : stryMutAct_9fa48("592")
              ? false
              : stryMutAct_9fa48("591")
                ? true
                : (stryCov_9fa48("591", "592", "593"),
                  existing.result ===
                    (stryMutAct_9fa48("594") ? "" : (stryCov_9fa48("594"), "success")))
        ) {
          // Data should be in the observer/cache now; wait for re-render
          // to pick it up via useSyncExternalStore
        } else if (
          stryMutAct_9fa48("597")
            ? existing.result === "pending"
            : stryMutAct_9fa48("596")
              ? false
              : stryMutAct_9fa48("595")
                ? true
                : (stryCov_9fa48("595", "596", "597"),
                  existing.result !==
                    (stryMutAct_9fa48("598") ? "" : (stryCov_9fa48("598"), "pending")))
        ) {
          if (stryMutAct_9fa48("599")) {
            {
            }
          } else {
            stryCov_9fa48("599");
            // Error case: throw for ErrorBoundary
            const { error } = existing.result;
            suspenseCache.delete(cacheKey);
            throw error;
          }
        }
        // Still pending or success-but-not-yet-propagated: re-throw the same promise
        throw existing.promise;
      }
    }

    // Create a new suspense entry with a fetch promise
    const mutableEntry: {
      result: SuspenseEntry["result"];
    } = stryMutAct_9fa48("600")
      ? {}
      : (stryCov_9fa48("600"),
        {
          result: stryMutAct_9fa48("601") ? "" : (stryCov_9fa48("601"), "pending"),
        });
    const fetchPromise = new Promise<void>(resolve => {
      if (stryMutAct_9fa48("602")) {
        {
        }
      } else {
        stryCov_9fa48("602");
        void client.fetchQuery(port, params).then(result => {
          if (stryMutAct_9fa48("603")) {
            {
            }
          } else {
            stryCov_9fa48("603");
            if (
              stryMutAct_9fa48("605")
                ? false
                : stryMutAct_9fa48("604")
                  ? true
                  : (stryCov_9fa48("604", "605"), result.isOk())
            ) {
              if (stryMutAct_9fa48("606")) {
                {
                }
              } else {
                stryCov_9fa48("606");
                mutableEntry.result = stryMutAct_9fa48("607")
                  ? ""
                  : (stryCov_9fa48("607"), "success");
                suspenseCache.delete(cacheKey);
              }
            } else {
              if (stryMutAct_9fa48("608")) {
                {
                }
              } else {
                stryCov_9fa48("608");
                mutableEntry.result = stryMutAct_9fa48("609")
                  ? {}
                  : (stryCov_9fa48("609"),
                    {
                      error: result.error,
                    });
              }
            }
            resolve();
          }
        });
      }
    });
    const entry: SuspenseEntry = stryMutAct_9fa48("610")
      ? {}
      : (stryCov_9fa48("610"),
        {
          promise: fetchPromise,
          get result() {
            if (stryMutAct_9fa48("611")) {
              {
              }
            } else {
              stryCov_9fa48("611");
              return mutableEntry.result;
            }
          },
          set result(v) {
            if (stryMutAct_9fa48("612")) {
              {
              }
            } else {
              stryCov_9fa48("612");
              mutableEntry.result = v;
            }
          },
        });
    suspenseCache.set(cacheKey, entry);
    throw fetchPromise;
  }
}
