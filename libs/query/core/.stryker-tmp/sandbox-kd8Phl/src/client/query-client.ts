/**
 * QueryClient - Core orchestrator for queries and mutations.
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
import { ResultAsync, ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { QueryPort } from "../ports/query-port.js";
import type { MutationPort } from "../ports/mutation-port.js";
import type { QueryAdapter } from "../adapters/query-adapter.js";
import type { MutationAdapter } from "../adapters/mutation-adapter.js";
import type { FetchContext, MutationContext } from "../ports/types.js";
import type { QueryCache, Clock, CacheListener, Unsubscribe } from "../cache/query-cache.js";
import { createQueryCache } from "../cache/query-cache.js";
import { createCacheKeyFromName, serializeCacheKey } from "../cache/cache-key.js";
import type { RetryConfig } from "../cache/retry.js";
import { fetchWithRetry } from "../cache/retry.js";
import { createDeduplicationMap } from "./deduplication.js";
import { DEFAULT_QUERY_OPTIONS } from "../types/options.js";
import type {
  QueryDefaults,
  FetchOptions,
  PrefetchOptions,
  MutateOptions,
} from "../types/options.js";
import {
  queryAdapterMissing,
  queryCancelled,
  queryDisposed,
  type QueryResolutionError,
} from "../types/errors.js";
import type { QueryObserver, QueryObserverOptions } from "./query-observer.js";
import { createQueryObserver } from "./query-observer.js";

// =============================================================================
// Internal erased adapter record (avoid branded type variance)
// Adapters are stored as plain records with property access at the call sites.
// =============================================================================

/**
 * Adapters are stored in type-erased form. The generic methods on QueryClient
 * ensure type safety at the public API boundary; internally we need to call
 * the fetcher/executor without knowing the concrete types.
 *
 * We extract only the fields we need into plain records, avoiding the
 * branded port types that cause variance issues.
 */
interface StoredQueryAdapter {
  readonly defaults: Partial<QueryDefaults>;
  // Fetcher stored as its original function reference.
  // Called via the erased `callFetcher` helper below.
  readonly fetcherRef: unknown;
}
interface StoredMutationAdapter {
  readonly defaults: Partial<QueryDefaults>;
  readonly executorRef: unknown;
  readonly onMutateRef: unknown;
  readonly onSuccessRef: unknown;
  readonly onErrorRef: unknown;
  readonly onSettledRef: unknown;
  readonly effects?: {
    readonly invalidates?: ReadonlyArray<{
      readonly __portName: string;
    }>;
    readonly removes?: ReadonlyArray<{
      readonly __portName: string;
    }>;
  };
}

/**
 * BRAND_CAST: Type-erased adapter call boundary.
 * The public API ensures type safety; this is the single point where
 * the erased function reference is called with its original types.
 */
function callFetcher(
  fetcherRef: unknown,
  params: unknown,
  context: FetchContext
): ResultAsync<unknown, unknown> {
  if (stryMutAct_9fa48("512")) {
    {
    }
  } else {
    stryCov_9fa48("512");
    const fn = fetcherRef as (
      params: unknown,
      context: FetchContext
    ) => ResultAsync<unknown, unknown>;
    return fn(params, context);
  }
}

/**
 * BRAND_CAST: Type-erased executor call boundary.
 */
function callExecutor(
  executorRef: unknown,
  input: unknown,
  context: MutationContext
): ResultAsync<unknown, unknown> {
  if (stryMutAct_9fa48("513")) {
    {
    }
  } else {
    stryCov_9fa48("513");
    const fn = executorRef as (
      input: unknown,
      context: MutationContext
    ) => ResultAsync<unknown, unknown>;
    return fn(input, context);
  }
}

/**
 * BRAND_CAST: Type-erased cache data accessor.
 * The cache stores `unknown` data; this accessor narrows to the port's
 * generic types at the single documented boundary.
 */
function narrowCacheData<TData>(data: unknown): TData {
  if (stryMutAct_9fa48("514")) {
    {
    }
  } else {
    stryCov_9fa48("514");
    return data as TData;
  }
}

/**
 * BRAND_CAST: Type-erased mutation callback accessor.
 * Stored callbacks have erased types; this narrows them at a single boundary.
 */
function narrowCallback<T>(ref: unknown): T {
  if (stryMutAct_9fa48("515")) {
    {
    }
  } else {
    stryCov_9fa48("515");
    return ref as T;
  }
}

// =============================================================================
// QueryClient Interface
// =============================================================================

export interface QueryClient {
  fetchQuery<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams,
    options?: FetchOptions
  ): ResultAsync<TData, TError | QueryResolutionError>;
  prefetchQuery<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams,
    options?: PrefetchOptions
  ): Promise<void>;
  ensureQueryData<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams,
    options?: FetchOptions
  ): ResultAsync<TData, TError | QueryResolutionError>;
  getQueryData<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams
  ): TData | undefined;
  setQueryData<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams,
    data: TData
  ): void;
  mutate<TData, TInput, TError, TContext, TName extends string>(
    port: MutationPort<TName, TData, TInput, TError, TContext>,
    input: TInput,
    options?: MutateOptions<TData, TInput, TError, TContext>
  ): ResultAsync<TData, TError | QueryResolutionError>;
  invalidateQueries<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params?: TParams
  ): Promise<void>;
  removeQueries<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params?: TParams
  ): void;
  cancelQueries<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params?: TParams
  ): void;
  observe<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams,
    options?: QueryObserverOptions<TData, TError>
  ): QueryObserver<TData, TError>;
  registerQueryAdapter<TName extends string, TData, TParams, TError>(
    adapter: QueryAdapter<TName, TData, TParams, TError>
  ): void;
  registerMutationAdapter<TName extends string, TData, TInput, TError, TContext>(
    adapter: MutationAdapter<TName, TData, TInput, TError, TContext>
  ): void;
  readonly cache: QueryCache;
  subscribe(listener: CacheListener): Unsubscribe;
  createChild(): QueryClient;
  dispose(): void;
  readonly isDisposed: boolean;
  readonly defaults: QueryDefaults;

  /** Count of currently in-flight fetch operations */
  isFetching(filters?: {
    readonly port?: {
      readonly __portName: string;
    };
  }): number;

  /** Count of currently in-flight mutation operations */
  isMutating(): number;

  /** Pause background operations (fetches, polling, GC) */
  pause(): void;

  /** Resume background operations */
  resume(): void;

  /** Whether the client is currently paused */
  readonly isPaused: boolean;

  /** Subscribe to query lifecycle events for instrumentation */
  subscribeToEvents(listener: (event: QueryClientEvent) => void): Unsubscribe;

  /** Get all registered query port names */
  getRegisteredQueryPorts(): ReadonlyArray<string>;

  /** Get all registered mutation port info */
  getRegisteredMutationPorts(): ReadonlyArray<{
    readonly name: string;
    readonly effects?: {
      readonly invalidates?: ReadonlyArray<{
        readonly __portName: string;
      }>;
      readonly removes?: ReadonlyArray<{
        readonly __portName: string;
      }>;
    };
  }>;
}

// =============================================================================
// QueryClient Events
// =============================================================================

export type QueryClientEvent =
  | {
      readonly type: "fetch-started";
      readonly portName: string;
      readonly params: unknown;
    }
  | {
      readonly type: "fetch-completed";
      readonly portName: string;
      readonly params: unknown;
      readonly durationMs: number;
    }
  | {
      readonly type: "fetch-cancelled";
      readonly portName: string;
      readonly params: unknown;
    }
  | {
      readonly type: "cache-hit";
      readonly portName: string;
      readonly params: unknown;
    }
  | {
      readonly type: "deduplicated";
      readonly portName: string;
      readonly params: unknown;
    }
  | {
      readonly type: "invalidated";
      readonly portName: string;
      readonly params: unknown | undefined;
    }
  | {
      readonly type: "observer-added";
      readonly portName: string;
      readonly params: unknown;
    }
  | {
      readonly type: "observer-removed";
      readonly portName: string;
      readonly params: unknown;
    }
  | {
      readonly type: "retry";
      readonly portName: string;
      readonly params: unknown;
      readonly attempt: number;
    }
  | {
      readonly type: "mutation-started";
      readonly portName: string;
      readonly input: unknown;
    }
  | {
      readonly type: "mutation-completed";
      readonly portName: string;
      readonly input: unknown;
      readonly success: boolean;
    };

// =============================================================================
// QueryClient Configuration
// =============================================================================

export interface QueryClientConfig {
  readonly clock?: Clock;
  readonly defaults?: Partial<QueryDefaults>;
  readonly maxInvalidationDepth?: number;
}

// =============================================================================
// createQueryClient Factory
// =============================================================================

export function createQueryClient(config?: QueryClientConfig): QueryClient {
  if (stryMutAct_9fa48("516")) {
    {
    }
  } else {
    stryCov_9fa48("516");
    const clock: Clock = stryMutAct_9fa48("517")
      ? config?.clock && {
          now: () => Date.now(),
        }
      : (stryCov_9fa48("517"),
        (stryMutAct_9fa48("518") ? config.clock : (stryCov_9fa48("518"), config?.clock)) ??
          (stryMutAct_9fa48("519")
            ? {}
            : (stryCov_9fa48("519"),
              {
                now: stryMutAct_9fa48("520")
                  ? () => undefined
                  : (stryCov_9fa48("520"), () => Date.now()),
              })));
    const defaults: QueryDefaults = stryMutAct_9fa48("521")
      ? {}
      : (stryCov_9fa48("521"),
        {
          ...DEFAULT_QUERY_OPTIONS,
          ...(stryMutAct_9fa48("522") ? config.defaults : (stryCov_9fa48("522"), config?.defaults)),
        });
    const cache = createQueryCache(
      stryMutAct_9fa48("523")
        ? {}
        : (stryCov_9fa48("523"),
          {
            clock,
          })
    );
    const dedup = createDeduplicationMap();

    // Adapter registries keyed by port name
    // These store adapters with erased types -- the public API ensures type safety
    const queryAdapters = new Map<string, StoredQueryAdapter>();
    const mutationAdapters = new Map<string, StoredMutationAdapter>();
    const cancellationControllers = new Map<string, AbortController>();

    // Fetching/mutating counters
    const fetchingCounts = new Map<string, number>();
    let mutatingCount = 0;

    // Pause state
    let paused = stryMutAct_9fa48("524") ? true : (stryCov_9fa48("524"), false);

    // Event listeners
    const eventListeners = new Set<(event: QueryClientEvent) => void>();
    let disposed = stryMutAct_9fa48("525") ? true : (stryCov_9fa48("525"), false);
    function emitEvent(event: QueryClientEvent): void {
      if (stryMutAct_9fa48("526")) {
        {
        }
      } else {
        stryCov_9fa48("526");
        for (const listener of eventListeners) {
          if (stryMutAct_9fa48("527")) {
            {
            }
          } else {
            stryCov_9fa48("527");
            listener(event);
          }
        }
      }
    }
    function incrementFetching(portName: string): void {
      if (stryMutAct_9fa48("528")) {
        {
        }
      } else {
        stryCov_9fa48("528");
        fetchingCounts.set(
          portName,
          stryMutAct_9fa48("529")
            ? (fetchingCounts.get(portName) ?? 0) - 1
            : (stryCov_9fa48("529"),
              (stryMutAct_9fa48("530")
                ? fetchingCounts.get(portName) && 0
                : (stryCov_9fa48("530"), fetchingCounts.get(portName) ?? 0)) + 1)
        );
      }
    }
    function decrementFetching(portName: string): void {
      if (stryMutAct_9fa48("531")) {
        {
        }
      } else {
        stryCov_9fa48("531");
        const current = stryMutAct_9fa48("532")
          ? fetchingCounts.get(portName) && 0
          : (stryCov_9fa48("532"), fetchingCounts.get(portName) ?? 0);
        if (
          stryMutAct_9fa48("536")
            ? current > 1
            : stryMutAct_9fa48("535")
              ? current < 1
              : stryMutAct_9fa48("534")
                ? false
                : stryMutAct_9fa48("533")
                  ? true
                  : (stryCov_9fa48("533", "534", "535", "536"), current <= 1)
        ) {
          if (stryMutAct_9fa48("537")) {
            {
            }
          } else {
            stryCov_9fa48("537");
            fetchingCounts.delete(portName);
          }
        } else {
          if (stryMutAct_9fa48("538")) {
            {
            }
          } else {
            stryCov_9fa48("538");
            fetchingCounts.set(
              portName,
              stryMutAct_9fa48("539") ? current + 1 : (stryCov_9fa48("539"), current - 1)
            );
          }
        }
      }
    }
    function assertNotDisposed(portName: string): Result<void, QueryResolutionError> {
      if (stryMutAct_9fa48("540")) {
        {
        }
      } else {
        stryCov_9fa48("540");
        if (
          stryMutAct_9fa48("542")
            ? false
            : stryMutAct_9fa48("541")
              ? true
              : (stryCov_9fa48("541", "542"), disposed)
        ) {
          if (stryMutAct_9fa48("543")) {
            {
            }
          } else {
            stryCov_9fa48("543");
            return err(queryDisposed(portName));
          }
        }
        return ok(undefined);
      }
    }
    function getRetryConfig(adapterDefaults?: Partial<QueryDefaults>): RetryConfig {
      if (stryMutAct_9fa48("544")) {
        {
        }
      } else {
        stryCov_9fa48("544");
        return stryMutAct_9fa48("545")
          ? {}
          : (stryCov_9fa48("545"),
            {
              retry: stryMutAct_9fa48("546")
                ? adapterDefaults?.retry && defaults.retry
                : (stryCov_9fa48("546"),
                  (stryMutAct_9fa48("547")
                    ? adapterDefaults.retry
                    : (stryCov_9fa48("547"), adapterDefaults?.retry)) ?? defaults.retry),
              retryDelay: stryMutAct_9fa48("548")
                ? adapterDefaults?.retryDelay && defaults.retryDelay
                : (stryCov_9fa48("548"),
                  (stryMutAct_9fa48("549")
                    ? adapterDefaults.retryDelay
                    : (stryCov_9fa48("549"), adapterDefaults?.retryDelay)) ?? defaults.retryDelay),
            });
      }
    }
    function isStale(dataUpdatedAt: number | undefined, staleTime: number): boolean {
      if (stryMutAct_9fa48("550")) {
        {
        }
      } else {
        stryCov_9fa48("550");
        if (
          stryMutAct_9fa48("553")
            ? dataUpdatedAt !== undefined
            : stryMutAct_9fa48("552")
              ? false
              : stryMutAct_9fa48("551")
                ? true
                : (stryCov_9fa48("551", "552", "553"), dataUpdatedAt === undefined)
        )
          return stryMutAct_9fa48("554") ? false : (stryCov_9fa48("554"), true);
        return stryMutAct_9fa48("558")
          ? clock.now() - dataUpdatedAt <= staleTime
          : stryMutAct_9fa48("557")
            ? clock.now() - dataUpdatedAt >= staleTime
            : stryMutAct_9fa48("556")
              ? false
              : stryMutAct_9fa48("555")
                ? true
                : (stryCov_9fa48("555", "556", "557", "558"),
                  (stryMutAct_9fa48("559")
                    ? clock.now() + dataUpdatedAt
                    : (stryCov_9fa48("559"), clock.now() - dataUpdatedAt)) > staleTime);
      }
    }
    function doFetch<TData, TParams, TError, TName extends string>(
      port: QueryPort<TName, TData, TParams, TError>,
      params: TParams,
      options?: FetchOptions
    ): ResultAsync<TData, TError | QueryResolutionError> {
      if (stryMutAct_9fa48("560")) {
        {
        }
      } else {
        stryCov_9fa48("560");
        const disposed_ = assertNotDisposed(port.__portName);
        if (
          stryMutAct_9fa48("562")
            ? false
            : stryMutAct_9fa48("561")
              ? true
              : (stryCov_9fa48("561", "562"), disposed_.isErr())
        ) {
          if (stryMutAct_9fa48("563")) {
            {
            }
          } else {
            stryCov_9fa48("563");
            return ResultAsync.err(disposed_.error);
          }
        }
        const adapter = queryAdapters.get(port.__portName);
        if (
          stryMutAct_9fa48("566")
            ? false
            : stryMutAct_9fa48("565")
              ? true
              : stryMutAct_9fa48("564")
                ? adapter
                : (stryCov_9fa48("564", "565", "566"), !adapter)
        ) {
          if (stryMutAct_9fa48("567")) {
            {
            }
          } else {
            stryCov_9fa48("567");
            return ResultAsync.err(queryAdapterMissing(port.__portName));
          }
        }
        const cacheKey = createCacheKeyFromName(port.__portName, params);
        const serialized = serializeCacheKey(cacheKey);

        // Check if we have fresh data in cache
        const existing = cache.get(port, params);
        const staleTime = stryMutAct_9fa48("568")
          ? port.config.defaults?.staleTime && defaults.staleTime
          : (stryCov_9fa48("568"),
            (stryMutAct_9fa48("569")
              ? port.config.defaults.staleTime
              : (stryCov_9fa48("569"), port.config.defaults?.staleTime)) ?? defaults.staleTime);
        if (
          stryMutAct_9fa48("572")
            ? (existing?.result?.isOk() && !existing.isInvalidated) ||
              !isStale(existing.dataUpdatedAt, staleTime)
            : stryMutAct_9fa48("571")
              ? false
              : stryMutAct_9fa48("570")
                ? true
                : (stryCov_9fa48("570", "571", "572"),
                  (stryMutAct_9fa48("574")
                    ? existing?.result?.isOk() || !existing.isInvalidated
                    : stryMutAct_9fa48("573")
                      ? true
                      : (stryCov_9fa48("573", "574"),
                        (stryMutAct_9fa48("576")
                          ? existing.result?.isOk()
                          : stryMutAct_9fa48("575")
                            ? existing?.result.isOk()
                            : (stryCov_9fa48("575", "576"), existing?.result?.isOk())) &&
                          (stryMutAct_9fa48("577")
                            ? existing.isInvalidated
                            : (stryCov_9fa48("577"), !existing.isInvalidated)))) &&
                    (stryMutAct_9fa48("578")
                      ? isStale(existing.dataUpdatedAt, staleTime)
                      : (stryCov_9fa48("578"), !isStale(existing.dataUpdatedAt, staleTime))))
        ) {
          if (stryMutAct_9fa48("579")) {
            {
            }
          } else {
            stryCov_9fa48("579");
            emitEvent(
              stryMutAct_9fa48("580")
                ? {}
                : (stryCov_9fa48("580"),
                  {
                    type: stryMutAct_9fa48("581") ? "" : (stryCov_9fa48("581"), "cache-hit"),
                    portName: port.__portName,
                    params,
                  })
            );
            return ResultAsync.ok(narrowCacheData<TData>(existing.data));
          }
        }

        // Ensure entry exists in cache
        cache.getOrCreate(port, params);

        // Deduplicate in-flight requests
        return dedup.dedupe(serialized, () => {
          if (stryMutAct_9fa48("582")) {
            {
            }
          } else {
            stryCov_9fa48("582");
            const controller = new AbortController();
            cancellationControllers.set(serialized, controller);
            const signal = (
              stryMutAct_9fa48("583") ? options.signal : (stryCov_9fa48("583"), options?.signal)
            )
              ? combineSignals(options.signal, controller.signal)
              : controller.signal;
            const fetchContext: FetchContext = stryMutAct_9fa48("584")
              ? {}
              : (stryCov_9fa48("584"),
                {
                  signal,
                  meta: stryMutAct_9fa48("585")
                    ? options.meta
                    : (stryCov_9fa48("585"), options?.meta),
                });
            const retryConfig = getRetryConfig(adapter.defaults);
            const startTime = clock.now();
            incrementFetching(port.__portName);
            emitEvent(
              stryMutAct_9fa48("586")
                ? {}
                : (stryCov_9fa48("586"),
                  {
                    type: stryMutAct_9fa48("587") ? "" : (stryCov_9fa48("587"), "fetch-started"),
                    portName: port.__portName,
                    params,
                  })
            );
            return fetchWithRetry<TData, TError>(
              port.__portName,
              params,
              () => {
                if (stryMutAct_9fa48("588")) {
                  {
                  }
                } else {
                  stryCov_9fa48("588");
                  // BRAND_CAST: callFetcher returns ResultAsync<unknown, unknown>;
                  // the public API boundary guarantees the stored fetcher matches <TData, TError>
                  const raw = callFetcher(adapter.fetcherRef, params, fetchContext);
                  return narrowResultAsync<TData, TError>(raw);
                }
              },
              retryConfig,
              signal
            )
              .map(data => {
                if (stryMutAct_9fa48("589")) {
                  {
                  }
                } else {
                  stryCov_9fa48("589");
                  cache.set(
                    port,
                    params,
                    data,
                    stryMutAct_9fa48("590")
                      ? {}
                      : (stryCov_9fa48("590"),
                        {
                          structuralSharing: stryMutAct_9fa48("591")
                            ? port.config.defaults?.structuralSharing && defaults.structuralSharing
                            : (stryCov_9fa48("591"),
                              (stryMutAct_9fa48("592")
                                ? port.config.defaults.structuralSharing
                                : (stryCov_9fa48("592"),
                                  port.config.defaults?.structuralSharing)) ??
                                defaults.structuralSharing),
                        })
                  );
                  cancellationControllers.delete(serialized);
                  decrementFetching(port.__portName);
                  emitEvent(
                    stryMutAct_9fa48("593")
                      ? {}
                      : (stryCov_9fa48("593"),
                        {
                          type: stryMutAct_9fa48("594")
                            ? ""
                            : (stryCov_9fa48("594"), "fetch-completed"),
                          portName: port.__portName,
                          params,
                          durationMs: stryMutAct_9fa48("595")
                            ? clock.now() + startTime
                            : (stryCov_9fa48("595"), clock.now() - startTime),
                        })
                  );
                  return data;
                }
              })
              .mapErr(error => {
                if (stryMutAct_9fa48("596")) {
                  {
                  }
                } else {
                  stryCov_9fa48("596");
                  decrementFetching(port.__portName);
                  if (
                    stryMutAct_9fa48("598")
                      ? false
                      : stryMutAct_9fa48("597")
                        ? true
                        : (stryCov_9fa48("597", "598"), isAbortError(error))
                  ) {
                    if (stryMutAct_9fa48("599")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("599");
                      cancellationControllers.delete(serialized);
                      emitEvent(
                        stryMutAct_9fa48("600")
                          ? {}
                          : (stryCov_9fa48("600"),
                            {
                              type: stryMutAct_9fa48("601")
                                ? ""
                                : (stryCov_9fa48("601"), "fetch-cancelled"),
                              portName: port.__portName,
                              params,
                            })
                      );
                      return queryCancelled(port.__portName, params);
                    }
                  }
                  cancellationControllers.delete(serialized);
                  cache.setError(port, params, error);
                  return error;
                }
              });
          }
        });
      }
    }
    const client: QueryClient = stryMutAct_9fa48("602")
      ? {}
      : (stryCov_9fa48("602"),
        {
          fetchQuery<TData, TParams, TError, TName extends string>(
            port: QueryPort<TName, TData, TParams, TError>,
            params: TParams,
            options?: FetchOptions
          ): ResultAsync<TData, TError | QueryResolutionError> {
            if (stryMutAct_9fa48("603")) {
              {
              }
            } else {
              stryCov_9fa48("603");
              return doFetch(port, params, options);
            }
          },
          async prefetchQuery<TData, TParams, TError, TName extends string>(
            port: QueryPort<TName, TData, TParams, TError>,
            params: TParams,
            options?: PrefetchOptions
          ): Promise<void> {
            if (stryMutAct_9fa48("604")) {
              {
              }
            } else {
              stryCov_9fa48("604");
              await doFetch(port, params, options);
            }
          },
          ensureQueryData<TData, TParams, TError, TName extends string>(
            port: QueryPort<TName, TData, TParams, TError>,
            params: TParams,
            options?: FetchOptions
          ): ResultAsync<TData, TError | QueryResolutionError> {
            if (stryMutAct_9fa48("605")) {
              {
              }
            } else {
              stryCov_9fa48("605");
              const existing = cache.get(port, params);
              if (
                stryMutAct_9fa48("608")
                  ? existing?.data !== undefined || !existing.isInvalidated
                  : stryMutAct_9fa48("607")
                    ? false
                    : stryMutAct_9fa48("606")
                      ? true
                      : (stryCov_9fa48("606", "607", "608"),
                        (stryMutAct_9fa48("610")
                          ? existing?.data === undefined
                          : stryMutAct_9fa48("609")
                            ? true
                            : (stryCov_9fa48("609", "610"),
                              (stryMutAct_9fa48("611")
                                ? existing.data
                                : (stryCov_9fa48("611"), existing?.data)) !== undefined)) &&
                          (stryMutAct_9fa48("612")
                            ? existing.isInvalidated
                            : (stryCov_9fa48("612"), !existing.isInvalidated)))
              ) {
                if (stryMutAct_9fa48("613")) {
                  {
                  }
                } else {
                  stryCov_9fa48("613");
                  return ResultAsync.ok(narrowCacheData<TData>(existing.data));
                }
              }
              return doFetch(port, params, options);
            }
          },
          getQueryData<TData, TParams, TError, TName extends string>(
            port: QueryPort<TName, TData, TParams, TError>,
            params: TParams
          ): TData | undefined {
            if (stryMutAct_9fa48("614")) {
              {
              }
            } else {
              stryCov_9fa48("614");
              const entry = cache.get(port, params);
              if (
                stryMutAct_9fa48("617")
                  ? entry?.data !== undefined
                  : stryMutAct_9fa48("616")
                    ? false
                    : stryMutAct_9fa48("615")
                      ? true
                      : (stryCov_9fa48("615", "616", "617"),
                        (stryMutAct_9fa48("618")
                          ? entry.data
                          : (stryCov_9fa48("618"), entry?.data)) === undefined)
              )
                return undefined;
              return narrowCacheData<TData>(entry.data);
            }
          },
          setQueryData<TData, TParams, TError, TName extends string>(
            port: QueryPort<TName, TData, TParams, TError>,
            params: TParams,
            data: TData
          ): void {
            if (stryMutAct_9fa48("619")) {
              {
              }
            } else {
              stryCov_9fa48("619");
              cache.set(port, params, data);
            }
          },
          mutate<TData, TInput, TError, TContext, TName extends string>(
            port: MutationPort<TName, TData, TInput, TError, TContext>,
            input: TInput,
            options?: MutateOptions<TData, TInput, TError, TContext>
          ): ResultAsync<TData, TError | QueryResolutionError> {
            if (stryMutAct_9fa48("620")) {
              {
              }
            } else {
              stryCov_9fa48("620");
              const disposed_ = assertNotDisposed(port.__portName);
              if (
                stryMutAct_9fa48("622")
                  ? false
                  : stryMutAct_9fa48("621")
                    ? true
                    : (stryCov_9fa48("621", "622"), disposed_.isErr())
              ) {
                if (stryMutAct_9fa48("623")) {
                  {
                  }
                } else {
                  stryCov_9fa48("623");
                  return ResultAsync.err(disposed_.error);
                }
              }
              const adapter = mutationAdapters.get(port.__portName);
              if (
                stryMutAct_9fa48("626")
                  ? false
                  : stryMutAct_9fa48("625")
                    ? true
                    : stryMutAct_9fa48("624")
                      ? adapter
                      : (stryCov_9fa48("624", "625", "626"), !adapter)
              ) {
                if (stryMutAct_9fa48("627")) {
                  {
                  }
                } else {
                  stryCov_9fa48("627");
                  return ResultAsync.err(queryAdapterMissing(port.__portName));
                }
              }
              const controller = new AbortController();
              const signal = (
                stryMutAct_9fa48("628") ? options.signal : (stryCov_9fa48("628"), options?.signal)
              )
                ? combineSignals(options.signal, controller.signal)
                : controller.signal;
              const mutationContext: MutationContext = stryMutAct_9fa48("629")
                ? {}
                : (stryCov_9fa48("629"),
                  {
                    signal,
                    meta: stryMutAct_9fa48("630")
                      ? options.meta
                      : (stryCov_9fa48("630"), options?.meta),
                  });
              type OnMutate = ((input: TInput) => TContext | Promise<TContext>) | undefined;
              type OnSuccess =
                | ((data: TData, input: TInput, context: TContext | undefined) => void)
                | undefined;
              type OnError =
                | ((error: TError, input: TInput, context: TContext | undefined) => void)
                | undefined;
              type OnSettled =
                | ((
                    data: TData | undefined,
                    error: TError | undefined,
                    input: TInput,
                    context: TContext | undefined
                  ) => void)
                | undefined;
              const onMutate: OnMutate = stryMutAct_9fa48("631")
                ? options?.onMutate && narrowCallback<OnMutate>(adapter.onMutateRef)
                : (stryCov_9fa48("631"),
                  (stryMutAct_9fa48("632")
                    ? options.onMutate
                    : (stryCov_9fa48("632"), options?.onMutate)) ??
                    narrowCallback<OnMutate>(adapter.onMutateRef));
              const onSuccess: OnSuccess = stryMutAct_9fa48("633")
                ? options?.onSuccess && narrowCallback<OnSuccess>(adapter.onSuccessRef)
                : (stryCov_9fa48("633"),
                  (stryMutAct_9fa48("634")
                    ? options.onSuccess
                    : (stryCov_9fa48("634"), options?.onSuccess)) ??
                    narrowCallback<OnSuccess>(adapter.onSuccessRef));
              const onError: OnError = stryMutAct_9fa48("635")
                ? options?.onError && narrowCallback<OnError>(adapter.onErrorRef)
                : (stryCov_9fa48("635"),
                  (stryMutAct_9fa48("636")
                    ? options.onError
                    : (stryCov_9fa48("636"), options?.onError)) ??
                    narrowCallback<OnError>(adapter.onErrorRef));
              const onSettled: OnSettled = stryMutAct_9fa48("637")
                ? options?.onSettled && narrowCallback<OnSettled>(adapter.onSettledRef)
                : (stryCov_9fa48("637"),
                  (stryMutAct_9fa48("638")
                    ? options.onSettled
                    : (stryCov_9fa48("638"), options?.onSettled)) ??
                    narrowCallback<OnSettled>(adapter.onSettledRef));
              stryMutAct_9fa48("639") ? mutatingCount-- : (stryCov_9fa48("639"), mutatingCount++);
              emitEvent(
                stryMutAct_9fa48("640")
                  ? {}
                  : (stryCov_9fa48("640"),
                    {
                      type: stryMutAct_9fa48("641")
                        ? ""
                        : (stryCov_9fa48("641"), "mutation-started"),
                      portName: port.__portName,
                      input,
                    })
              );
              return ResultAsync.fromPromise(
                (async (): Promise<TData> => {
                  if (stryMutAct_9fa48("642")) {
                    {
                    }
                  } else {
                    stryCov_9fa48("642");
                    let context: TContext | undefined;
                    if (
                      stryMutAct_9fa48("644")
                        ? false
                        : stryMutAct_9fa48("643")
                          ? true
                          : (stryCov_9fa48("643", "644"), onMutate)
                    ) {
                      if (stryMutAct_9fa48("645")) {
                        {
                        }
                      } else {
                        stryCov_9fa48("645");
                        context = await onMutate(input);
                      }
                    }
                    const raw = callExecutor(adapter.executorRef, input, mutationContext);
                    const result = await narrowResultAsync<TData, TError>(raw);
                    if (
                      stryMutAct_9fa48("647")
                        ? false
                        : stryMutAct_9fa48("646")
                          ? true
                          : (stryCov_9fa48("646", "647"), result.isOk())
                    ) {
                      if (stryMutAct_9fa48("648")) {
                        {
                        }
                      } else {
                        stryCov_9fa48("648");
                        stryMutAct_9fa48("649")
                          ? onSuccess(result.value, input, context)
                          : (stryCov_9fa48("649"), onSuccess?.(result.value, input, context));
                        stryMutAct_9fa48("650")
                          ? onSettled(result.value, undefined, input, context)
                          : (stryCov_9fa48("650"),
                            onSettled?.(result.value, undefined, input, context));

                        // Process mutation effects
                        const effects = port.config.effects;
                        if (
                          stryMutAct_9fa48("652")
                            ? false
                            : stryMutAct_9fa48("651")
                              ? true
                              : (stryCov_9fa48("651", "652"), effects)
                        ) {
                          if (stryMutAct_9fa48("653")) {
                            {
                            }
                          } else {
                            stryCov_9fa48("653");
                            if (
                              stryMutAct_9fa48("655")
                                ? false
                                : stryMutAct_9fa48("654")
                                  ? true
                                  : (stryCov_9fa48("654", "655"), effects.invalidates)
                            ) {
                              if (stryMutAct_9fa48("656")) {
                                {
                                }
                              } else {
                                stryCov_9fa48("656");
                                for (const queryPort of effects.invalidates) {
                                  if (stryMutAct_9fa48("657")) {
                                    {
                                    }
                                  } else {
                                    stryCov_9fa48("657");
                                    cache.invalidate(queryPort);
                                  }
                                }
                              }
                            }
                            if (
                              stryMutAct_9fa48("659")
                                ? false
                                : stryMutAct_9fa48("658")
                                  ? true
                                  : (stryCov_9fa48("658", "659"), effects.removes)
                            ) {
                              if (stryMutAct_9fa48("660")) {
                                {
                                }
                              } else {
                                stryCov_9fa48("660");
                                for (const queryPort of effects.removes) {
                                  if (stryMutAct_9fa48("661")) {
                                    {
                                    }
                                  } else {
                                    stryCov_9fa48("661");
                                    cache.remove(queryPort);
                                  }
                                }
                              }
                            }
                          }
                        }
                        stryMutAct_9fa48("662")
                          ? mutatingCount++
                          : (stryCov_9fa48("662"), mutatingCount--);
                        emitEvent(
                          stryMutAct_9fa48("663")
                            ? {}
                            : (stryCov_9fa48("663"),
                              {
                                type: stryMutAct_9fa48("664")
                                  ? ""
                                  : (stryCov_9fa48("664"), "mutation-completed"),
                                portName: port.__portName,
                                input,
                                success: stryMutAct_9fa48("665")
                                  ? false
                                  : (stryCov_9fa48("665"), true),
                              })
                        );
                        return result.value;
                      }
                    } else {
                      if (stryMutAct_9fa48("666")) {
                        {
                        }
                      } else {
                        stryCov_9fa48("666");
                        stryMutAct_9fa48("667")
                          ? onError(result.error, input, context)
                          : (stryCov_9fa48("667"), onError?.(result.error, input, context));
                        stryMutAct_9fa48("668")
                          ? onSettled(undefined, result.error, input, context)
                          : (stryCov_9fa48("668"),
                            onSettled?.(undefined, result.error, input, context));
                        stryMutAct_9fa48("669")
                          ? mutatingCount++
                          : (stryCov_9fa48("669"), mutatingCount--);
                        emitEvent(
                          stryMutAct_9fa48("670")
                            ? {}
                            : (stryCov_9fa48("670"),
                              {
                                type: stryMutAct_9fa48("671")
                                  ? ""
                                  : (stryCov_9fa48("671"), "mutation-completed"),
                                portName: port.__portName,
                                input,
                                success: stryMutAct_9fa48("672")
                                  ? true
                                  : (stryCov_9fa48("672"), false),
                              })
                        );
                        throw result.error;
                      }
                    }
                  }
                })(),
                narrowError<TError | QueryResolutionError>
              );
            }
          },
          async invalidateQueries<TData, TParams, TError, TName extends string>(
            port: QueryPort<TName, TData, TParams, TError>,
            params?: TParams
          ): Promise<void> {
            if (stryMutAct_9fa48("673")) {
              {
              }
            } else {
              stryCov_9fa48("673");
              cache.invalidate(port, params);
              emitEvent(
                stryMutAct_9fa48("674")
                  ? {}
                  : (stryCov_9fa48("674"),
                    {
                      type: stryMutAct_9fa48("675") ? "" : (stryCov_9fa48("675"), "invalidated"),
                      portName: port.__portName,
                      params,
                    })
              );

              // Refetch active queries (those with observers)
              if (
                stryMutAct_9fa48("678")
                  ? params === undefined
                  : stryMutAct_9fa48("677")
                    ? false
                    : stryMutAct_9fa48("676")
                      ? true
                      : (stryCov_9fa48("676", "677", "678"), params !== undefined)
              ) {
                if (stryMutAct_9fa48("679")) {
                  {
                  }
                } else {
                  stryCov_9fa48("679");
                  const entry = cache.get(port, params);
                  if (
                    stryMutAct_9fa48("682")
                      ? entry || entry.observerCount > 0
                      : stryMutAct_9fa48("681")
                        ? false
                        : stryMutAct_9fa48("680")
                          ? true
                          : (stryCov_9fa48("680", "681", "682"),
                            entry &&
                              (stryMutAct_9fa48("685")
                                ? entry.observerCount <= 0
                                : stryMutAct_9fa48("684")
                                  ? entry.observerCount >= 0
                                  : stryMutAct_9fa48("683")
                                    ? true
                                    : (stryCov_9fa48("683", "684", "685"),
                                      entry.observerCount > 0)))
                  ) {
                    if (stryMutAct_9fa48("686")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("686");
                      await doFetch(port, params).map(() => undefined);
                    }
                  }
                }
              } else {
                if (stryMutAct_9fa48("687")) {
                  {
                  }
                } else {
                  stryCov_9fa48("687");
                  const portEntries = cache.findByPort(port);
                  const refetchPromises = stryMutAct_9fa48("688")
                    ? portEntries.map(([_key]) => {
                        // Parse params from cache key is not needed -- we refetch the whole port
                        return doFetch(port, undefined as TParams);
                      })
                    : (stryCov_9fa48("688"),
                      portEntries
                        .filter(
                          stryMutAct_9fa48("689")
                            ? () => undefined
                            : (stryCov_9fa48("689"),
                              ([, entry]) =>
                                stryMutAct_9fa48("693")
                                  ? entry.observerCount <= 0
                                  : stryMutAct_9fa48("692")
                                    ? entry.observerCount >= 0
                                    : stryMutAct_9fa48("691")
                                      ? false
                                      : stryMutAct_9fa48("690")
                                        ? true
                                        : (stryCov_9fa48("690", "691", "692", "693"),
                                          entry.observerCount > 0))
                        )
                        .map(([_key]) => {
                          if (stryMutAct_9fa48("694")) {
                            {
                            }
                          } else {
                            stryCov_9fa48("694");
                            // Parse params from cache key is not needed -- we refetch the whole port
                            return doFetch(port, undefined as TParams);
                          }
                        }));
                  await Promise.allSettled(
                    refetchPromises.map(
                      stryMutAct_9fa48("695")
                        ? () => undefined
                        : (stryCov_9fa48("695"), r => r.map(() => undefined))
                    )
                  );
                }
              }
            }
          },
          removeQueries<TData, TParams, TError, TName extends string>(
            port: QueryPort<TName, TData, TParams, TError>,
            params?: TParams
          ): void {
            if (stryMutAct_9fa48("696")) {
              {
              }
            } else {
              stryCov_9fa48("696");
              cache.remove(port, params);
            }
          },
          cancelQueries<TData, TParams, TError, TName extends string>(
            port: QueryPort<TName, TData, TParams, TError>,
            params?: TParams
          ): void {
            if (stryMutAct_9fa48("697")) {
              {
              }
            } else {
              stryCov_9fa48("697");
              if (
                stryMutAct_9fa48("700")
                  ? params === undefined
                  : stryMutAct_9fa48("699")
                    ? false
                    : stryMutAct_9fa48("698")
                      ? true
                      : (stryCov_9fa48("698", "699", "700"), params !== undefined)
              ) {
                if (stryMutAct_9fa48("701")) {
                  {
                  }
                } else {
                  stryCov_9fa48("701");
                  const cacheKey = createCacheKeyFromName(port.__portName, params);
                  const serialized = serializeCacheKey(cacheKey);
                  const controller = cancellationControllers.get(serialized);
                  if (
                    stryMutAct_9fa48("703")
                      ? false
                      : stryMutAct_9fa48("702")
                        ? true
                        : (stryCov_9fa48("702", "703"), controller)
                  ) {
                    if (stryMutAct_9fa48("704")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("704");
                      controller.abort();
                      cancellationControllers.delete(serialized);
                    }
                  }
                }
              } else {
                if (stryMutAct_9fa48("705")) {
                  {
                  }
                } else {
                  stryCov_9fa48("705");
                  for (const [key, controller] of cancellationControllers) {
                    if (stryMutAct_9fa48("706")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("706");
                      if (
                        stryMutAct_9fa48("709")
                          ? key.endsWith(port.__portName + "\0")
                          : stryMutAct_9fa48("708")
                            ? false
                            : stryMutAct_9fa48("707")
                              ? true
                              : (stryCov_9fa48("707", "708", "709"),
                                key.startsWith(
                                  port.__portName +
                                    (stryMutAct_9fa48("710") ? "" : (stryCov_9fa48("710"), "\0"))
                                ))
                      ) {
                        if (stryMutAct_9fa48("711")) {
                          {
                          }
                        } else {
                          stryCov_9fa48("711");
                          controller.abort();
                          cancellationControllers.delete(key);
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          observe<TData, TParams, TError, TName extends string>(
            port: QueryPort<TName, TData, TParams, TError>,
            params: TParams,
            options?: QueryObserverOptions<TData, TError>
          ): QueryObserver<TData, TError> {
            if (stryMutAct_9fa48("712")) {
              {
              }
            } else {
              stryCov_9fa48("712");
              return createQueryObserver(client, port, params, options);
            }
          },
          registerQueryAdapter<TName extends string, TData, TParams, TError>(
            adapter: QueryAdapter<TName, TData, TParams, TError>
          ): void {
            if (stryMutAct_9fa48("713")) {
              {
              }
            } else {
              stryCov_9fa48("713");
              queryAdapters.set(
                adapter.port.__portName,
                stryMutAct_9fa48("714")
                  ? {}
                  : (stryCov_9fa48("714"),
                    {
                      defaults: adapter.defaults,
                      fetcherRef: adapter.fetcher,
                    })
              );
            }
          },
          registerMutationAdapter<TName extends string, TData, TInput, TError, TContext>(
            adapter: MutationAdapter<TName, TData, TInput, TError, TContext>
          ): void {
            if (stryMutAct_9fa48("715")) {
              {
              }
            } else {
              stryCov_9fa48("715");
              mutationAdapters.set(
                adapter.port.__portName,
                stryMutAct_9fa48("716")
                  ? {}
                  : (stryCov_9fa48("716"),
                    {
                      defaults: adapter.defaults,
                      executorRef: adapter.executor,
                      onMutateRef: adapter.onMutate,
                      onSuccessRef: adapter.onSuccess,
                      onErrorRef: adapter.onError,
                      onSettledRef: adapter.onSettled,
                      effects: adapter.port.config.effects,
                    })
              );
            }
          },
          cache,
          subscribe(listener: CacheListener): Unsubscribe {
            if (stryMutAct_9fa48("717")) {
              {
              }
            } else {
              stryCov_9fa48("717");
              return cache.subscribe(listener);
            }
          },
          createChild(): QueryClient {
            if (stryMutAct_9fa48("718")) {
              {
              }
            } else {
              stryCov_9fa48("718");
              return createQueryClient(
                stryMutAct_9fa48("719")
                  ? {}
                  : (stryCov_9fa48("719"),
                    {
                      clock,
                      defaults: stryMutAct_9fa48("720")
                        ? config.defaults
                        : (stryCov_9fa48("720"), config?.defaults),
                      maxInvalidationDepth: stryMutAct_9fa48("721")
                        ? config.maxInvalidationDepth
                        : (stryCov_9fa48("721"), config?.maxInvalidationDepth),
                    })
              );
            }
          },
          dispose(): void {
            if (stryMutAct_9fa48("722")) {
              {
              }
            } else {
              stryCov_9fa48("722");
              if (
                stryMutAct_9fa48("724")
                  ? false
                  : stryMutAct_9fa48("723")
                    ? true
                    : (stryCov_9fa48("723", "724"), disposed)
              )
                return;
              disposed = stryMutAct_9fa48("725") ? false : (stryCov_9fa48("725"), true);
              dedup.cancelAll();
              for (const [, controller] of cancellationControllers) {
                if (stryMutAct_9fa48("726")) {
                  {
                  }
                } else {
                  stryCov_9fa48("726");
                  controller.abort();
                }
              }
              cancellationControllers.clear();
              cache.dispose();
            }
          },
          get isDisposed(): boolean {
            if (stryMutAct_9fa48("727")) {
              {
              }
            } else {
              stryCov_9fa48("727");
              return disposed;
            }
          },
          defaults,
          isFetching(filters?: {
            readonly port?: {
              readonly __portName: string;
            };
          }): number {
            if (stryMutAct_9fa48("728")) {
              {
              }
            } else {
              stryCov_9fa48("728");
              if (
                stryMutAct_9fa48("731")
                  ? filters.port
                  : stryMutAct_9fa48("730")
                    ? false
                    : stryMutAct_9fa48("729")
                      ? true
                      : (stryCov_9fa48("729", "730", "731"), filters?.port)
              ) {
                if (stryMutAct_9fa48("732")) {
                  {
                  }
                } else {
                  stryCov_9fa48("732");
                  return stryMutAct_9fa48("733")
                    ? fetchingCounts.get(filters.port.__portName) && 0
                    : (stryCov_9fa48("733"), fetchingCounts.get(filters.port.__portName) ?? 0);
                }
              }
              let total = 0;
              for (const count of fetchingCounts.values()) {
                if (stryMutAct_9fa48("734")) {
                  {
                  }
                } else {
                  stryCov_9fa48("734");
                  stryMutAct_9fa48("735")
                    ? (total -= count)
                    : (stryCov_9fa48("735"), (total += count));
                }
              }
              return total;
            }
          },
          isMutating(): number {
            if (stryMutAct_9fa48("736")) {
              {
              }
            } else {
              stryCov_9fa48("736");
              return mutatingCount;
            }
          },
          pause(): void {
            if (stryMutAct_9fa48("737")) {
              {
              }
            } else {
              stryCov_9fa48("737");
              paused = stryMutAct_9fa48("738") ? false : (stryCov_9fa48("738"), true);
            }
          },
          resume(): void {
            if (stryMutAct_9fa48("739")) {
              {
              }
            } else {
              stryCov_9fa48("739");
              paused = stryMutAct_9fa48("740") ? true : (stryCov_9fa48("740"), false);
            }
          },
          get isPaused(): boolean {
            if (stryMutAct_9fa48("741")) {
              {
              }
            } else {
              stryCov_9fa48("741");
              return paused;
            }
          },
          subscribeToEvents(listener: (event: QueryClientEvent) => void): Unsubscribe {
            if (stryMutAct_9fa48("742")) {
              {
              }
            } else {
              stryCov_9fa48("742");
              eventListeners.add(listener);
              return () => {
                if (stryMutAct_9fa48("743")) {
                  {
                  }
                } else {
                  stryCov_9fa48("743");
                  eventListeners.delete(listener);
                }
              };
            }
          },
          getRegisteredQueryPorts(): ReadonlyArray<string> {
            if (stryMutAct_9fa48("744")) {
              {
              }
            } else {
              stryCov_9fa48("744");
              return stryMutAct_9fa48("745")
                ? []
                : (stryCov_9fa48("745"), [...queryAdapters.keys()]);
            }
          },
          getRegisteredMutationPorts(): ReadonlyArray<{
            readonly name: string;
            readonly effects?: {
              readonly invalidates?: ReadonlyArray<{
                readonly __portName: string;
              }>;
              readonly removes?: ReadonlyArray<{
                readonly __portName: string;
              }>;
            };
          }> {
            if (stryMutAct_9fa48("746")) {
              {
              }
            } else {
              stryCov_9fa48("746");
              const result: Array<{
                readonly name: string;
                readonly effects?: {
                  readonly invalidates?: ReadonlyArray<{
                    readonly __portName: string;
                  }>;
                  readonly removes?: ReadonlyArray<{
                    readonly __portName: string;
                  }>;
                };
              }> = stryMutAct_9fa48("747") ? ["Stryker was here"] : (stryCov_9fa48("747"), []);
              for (const [name, adapter] of mutationAdapters) {
                if (stryMutAct_9fa48("748")) {
                  {
                  }
                } else {
                  stryCov_9fa48("748");
                  result.push(
                    stryMutAct_9fa48("749")
                      ? {}
                      : (stryCov_9fa48("749"),
                        {
                          name,
                          effects: adapter.effects,
                        })
                  );
                }
              }
              return result;
            }
          },
        });
    return client;
  }
}

// =============================================================================
// Helpers
// =============================================================================

function combineSignals(signal1: AbortSignal, signal2: AbortSignal): AbortSignal {
  if (stryMutAct_9fa48("750")) {
    {
    }
  } else {
    stryCov_9fa48("750");
    const controller = new AbortController();
    const onAbort = (): void => {
      if (stryMutAct_9fa48("751")) {
        {
        }
      } else {
        stryCov_9fa48("751");
        controller.abort();
      }
    };
    if (
      stryMutAct_9fa48("754")
        ? signal1.aborted && signal2.aborted
        : stryMutAct_9fa48("753")
          ? false
          : stryMutAct_9fa48("752")
            ? true
            : (stryCov_9fa48("752", "753", "754"), signal1.aborted || signal2.aborted)
    ) {
      if (stryMutAct_9fa48("755")) {
        {
        }
      } else {
        stryCov_9fa48("755");
        controller.abort();
        return controller.signal;
      }
    }
    signal1.addEventListener(
      stryMutAct_9fa48("756") ? "" : (stryCov_9fa48("756"), "abort"),
      onAbort,
      stryMutAct_9fa48("757")
        ? {}
        : (stryCov_9fa48("757"),
          {
            once: stryMutAct_9fa48("758") ? false : (stryCov_9fa48("758"), true),
          })
    );
    signal2.addEventListener(
      stryMutAct_9fa48("759") ? "" : (stryCov_9fa48("759"), "abort"),
      onAbort,
      stryMutAct_9fa48("760")
        ? {}
        : (stryCov_9fa48("760"),
          {
            once: stryMutAct_9fa48("761") ? false : (stryCov_9fa48("761"), true),
          })
    );
    return controller.signal;
  }
}
function isAbortError(error: unknown): boolean {
  if (stryMutAct_9fa48("762")) {
    {
    }
  } else {
    stryCov_9fa48("762");
    return stryMutAct_9fa48("765")
      ? error instanceof DOMException || error.name === "AbortError"
      : stryMutAct_9fa48("764")
        ? false
        : stryMutAct_9fa48("763")
          ? true
          : (stryCov_9fa48("763", "764", "765"),
            error instanceof DOMException &&
              (stryMutAct_9fa48("767")
                ? error.name !== "AbortError"
                : stryMutAct_9fa48("766")
                  ? true
                  : (stryCov_9fa48("766", "767"),
                    error.name ===
                      (stryMutAct_9fa48("768") ? "" : (stryCov_9fa48("768"), "AbortError")))));
  }
}

/**
 * BRAND_CAST: Narrows ResultAsync<unknown, unknown> to the expected types.
 * Used at type-erased adapter call boundaries where the public API
 * guarantees type correctness.
 */
function narrowResultAsync<TData, TError>(
  raw: ResultAsync<unknown, unknown>
): ResultAsync<TData, TError> {
  if (stryMutAct_9fa48("769")) {
    {
    }
  } else {
    stryCov_9fa48("769");
    return raw as ResultAsync<TData, TError>;
  }
}

/**
 * BRAND_CAST: Error mapper for fromPromise boundaries.
 * Errors thrown from inside the mutation async block are already typed;
 * this is the identity mapper at the fromPromise boundary.
 */
function narrowError<TError>(e: unknown): TError {
  if (stryMutAct_9fa48("770")) {
    {
    }
  } else {
    stryCov_9fa48("770");
    return e as TError;
  }
}
