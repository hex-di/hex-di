/**
 * QueryClient - Core orchestrator for queries and mutations.
 *
 * The QueryClient resolves fetchers and executors from a DI container,
 * making query/mutation adapters standard HexDI adapters that participate
 * in the dependency graph, tracing, and inspection.
 *
 * @packageDocumentation
 */

import { ResultAsync, ok, err, fromThrowable } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { Port } from "@hex-di/core";
import type { QueryPort } from "../ports/query-port.js";
import type { MutationPort } from "../ports/mutation-port.js";
import type { FetchContext, MutationContext } from "../ports/types.js";
import type { QueryTracingHook, TracerLike } from "../tracing/types.js";
import { createQueryTracingHook } from "../tracing/query-tracing-hook.js";
import type { QueryCache, Clock, CacheListener, Unsubscribe } from "../cache/query-cache.js";
import { createQueryCache } from "../cache/query-cache.js";
import type { CacheEntry } from "../cache/cache-entry.js";
import { hasSubscribers } from "../cache/cache-entry.js";
import type { CacheKey } from "../cache/cache-key.js";
import { createCacheKeyFromName, serializeCacheKey } from "../cache/cache-key.js";
import type { RetryConfig } from "../cache/retry.js";
import { fetchWithRetry } from "../cache/retry.js";
import { createDeduplicationMap } from "./deduplication.js";
import {
  narrowCacheData,
  narrowResult,
  narrowCallback,
  narrowResultAsync,
  narrowUndefinedAsParams,
} from "./type-boundary.js";
import { stableStringify } from "../cache/stable-stringify.js";
import type { CachePersister } from "../persistence/cache-persister.js";
import { createPersistenceManager } from "../persistence/persistence-manager.js";
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
  queryFetchFailed,
  queryInvalidationCycle,
  type QueryResolutionError,
} from "../types/errors.js";
import type { QueryState } from "../types/state.js";
import type { QueryObserver, QueryObserverOptions } from "./query-observer.js";
import { createQueryObserver } from "./query-observer.js";

// =============================================================================
// QueryContainer — minimal container interface for resolving adapters
// =============================================================================

/**
 * Minimal container interface that the QueryClient requires for resolving
 * fetchers and executors from the DI container.
 *
 * This avoids a hard dependency on the full runtime container type,
 * allowing the QueryClient to work with any object that satisfies
 * the resolve protocol.
 *
 * Uses a non-generic signature so that typed containers (whose resolve
 * constrains the port parameter to known ports) are structurally
 * compatible without requiring casts.
 */
export interface QueryContainer {
  resolve(port: Port<string, unknown>): unknown;
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
  ): ResultAsync<void, TError | QueryResolutionError>;

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
    dataOrUpdater: TData | ((prev: TData | undefined) => TData)
  ): void;

  mutate<TData, TInput, TError, TContext, TName extends string>(
    port: MutationPort<TName, TData, TInput, TError, TContext>,
    input: TInput,
    options?: MutateOptions<TData, TInput, TError, TContext>
  ): ResultAsync<TData, TError | QueryResolutionError>;

  getQueryState<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams
  ): QueryState<TData, TError> | undefined;

  invalidateQueries<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params?: TParams
  ): ResultAsync<void, QueryResolutionError>;

  invalidateMatching(
    predicate: (entry: CacheEntry<unknown, unknown>, key: CacheKey) => boolean
  ): ResultAsync<void, QueryResolutionError>;

  invalidateAll(): ResultAsync<void, QueryResolutionError>;

  removeQueries<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params?: TParams
  ): void;

  cancelQueries<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params?: TParams
  ): ResultAsync<void, never>;

  cancelAll(): ResultAsync<void, never>;

  reset<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params?: TParams
  ): void;

  clear(): void;

  observe<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams,
    options?: QueryObserverOptions<TData, TError>
  ): QueryObserver<TData, TError>;

  subscribeToQuery<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams,
    callback: (state: QueryState<TData, TError>) => void
  ): () => void;

  readonly cache: QueryCache;

  subscribe(listener: CacheListener): Unsubscribe;

  createChild(): QueryClient;

  dispose(): void;

  readonly isDisposed: boolean;

  readonly defaults: QueryDefaults;

  /** Count of currently in-flight fetch operations */
  isFetching(filters?: { readonly port?: { readonly __portName: string } }): number;

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
}

// =============================================================================
// Fetch Trigger
// =============================================================================

export type FetchTrigger =
  | "mount"
  | "refetch-manual"
  | "refetch-focus"
  | "refetch-interval"
  | "refetch-reconnect"
  | "invalidation"
  | "mutation-effect"
  | "prefetch"
  | "ensure";

// =============================================================================
// QueryClient Events
// =============================================================================

export type QueryClientEvent =
  | {
      readonly type: "fetch-started";
      readonly portName: string;
      readonly params: unknown;
      readonly trigger: FetchTrigger;
    }
  | {
      readonly type: "fetch-completed";
      readonly portName: string;
      readonly params: unknown;
      readonly durationMs: number;
    }
  | {
      readonly type: "fetch-error";
      readonly portName: string;
      readonly params: unknown;
      readonly durationMs: number;
      readonly errorTag?: string;
    }
  | { readonly type: "fetch-cancelled"; readonly portName: string; readonly params: unknown }
  | { readonly type: "cache-hit"; readonly portName: string; readonly params: unknown }
  | { readonly type: "deduplicated"; readonly portName: string; readonly params: unknown }
  | {
      readonly type: "invalidated";
      readonly portName: string;
      readonly params: unknown | undefined;
    }
  | { readonly type: "observer-added"; readonly portName: string; readonly params: unknown }
  | { readonly type: "observer-removed"; readonly portName: string; readonly params: unknown }
  | {
      readonly type: "retry";
      readonly portName: string;
      readonly params: unknown;
      readonly attempt: number;
    }
  | { readonly type: "mutation-started"; readonly portName: string; readonly input: unknown }
  | {
      readonly type: "mutation-completed";
      readonly portName: string;
      readonly input: unknown;
      readonly success: boolean;
    }
  | {
      readonly type: "mutation-effect-applied";
      readonly mutationPortName: string;
      readonly targetPortName: string;
      readonly effect: "invalidates" | "removes";
      readonly entriesAffected: number;
    };

// =============================================================================
// QueryClient Configuration
// =============================================================================

export interface QueryClientConfig {
  /** DI container for resolving query/mutation adapters */
  readonly container: QueryContainer;
  readonly clock?: Clock;
  readonly defaults?: Partial<QueryDefaults>;
  readonly maxInvalidationDepth?: number;
  /** Optional tracing hook for distributed tracing integration.
   * Takes precedence over `tracer` if both are provided. */
  readonly tracingHook?: QueryTracingHook;
  /**
   * Shorthand: pass a TracerLike and a QueryTracingHook is auto-created.
   * Ignored when `tracingHook` is already provided.
   */
  readonly tracer?: TracerLike;
  /** Optional persistence configuration for durable cache storage */
  readonly persister?: {
    readonly persister: CachePersister;
    readonly buster: string;
    readonly maxAge: number;
  };
}

// =============================================================================
// createQueryClient Factory
// =============================================================================

export function createQueryClient(config: QueryClientConfig): QueryClient {
  const { container } = config;
  const clock: Clock = config.clock ?? { now: () => Date.now() };
  const defaults: QueryDefaults = { ...DEFAULT_QUERY_OPTIONS, ...config.defaults };

  // Resolve tracing: explicit tracingHook takes precedence over tracer shorthand
  const tracingHook =
    config.tracingHook ??
    (config.tracer !== undefined ? createQueryTracingHook({ tracer: config.tracer }) : undefined);

  const cache = createQueryCache({ clock });
  const dedup = createDeduplicationMap();

  // Persistence wiring
  let persistenceUnsubscribe: Unsubscribe | undefined;
  const persistenceManager = config.persister
    ? createPersistenceManager(config.persister, cache, clock)
    : undefined;
  if (persistenceManager) {
    persistenceUnsubscribe = cache.subscribe(persistenceManager.createListener());
    void persistenceManager.restore();
  }

  const cancellationControllers = new Map<string, AbortController>();

  // Fetching/mutating counters
  const fetchingCounts = new Map<string, number>();
  let mutatingCount = 0;

  // Invalidation depth tracking
  const maxInvalidationDepth = config.maxInvalidationDepth ?? 10;
  let invalidationDepth = 0;

  // Pause state
  let paused = false;

  // Event listeners
  const eventListeners = new Set<(event: QueryClientEvent) => void>();

  let disposed = false;

  // =========================================================================
  // Window focus / network reconnect refetch
  // =========================================================================

  /**
   * Closure-based observer record for focus/reconnect refetch triggers.
   * Captures the typed port and params from the observe() call site,
   * avoiding the need for type-erased storage or casts.
   */
  interface ObserverRecord {
    readonly getStaleTime: () => number;
    readonly getRefetchOnWindowFocus: () => boolean | "always";
    readonly getRefetchOnReconnect: () => boolean | "always";
    readonly getEntry: () => CacheEntry<unknown, unknown> | undefined;
    readonly invalidate: () => void;
    readonly refetch: (trigger: FetchTrigger) => void;
  }

  const activeObservers = new Set<ObserverRecord>();

  function triggerRefetch(
    getSetting: (record: ObserverRecord) => boolean | "always",
    trigger: FetchTrigger
  ): void {
    if (disposed || paused) return;

    for (const record of activeObservers) {
      const setting = getSetting(record);
      if (!setting) continue;

      const entry = record.getEntry();
      if (!entry) continue;

      const shouldRefetch =
        setting === "always" || isStale(entry.dataUpdatedAt, record.getStaleTime());

      if (shouldRefetch) {
        if (setting === "always" && !isStale(entry.dataUpdatedAt, record.getStaleTime())) {
          record.invalidate();
        }
        record.refetch(trigger);
      }
    }
  }

  function onWindowFocus(): void {
    triggerRefetch(r => r.getRefetchOnWindowFocus(), "refetch-focus");
  }

  function onNetworkReconnect(): void {
    triggerRefetch(r => r.getRefetchOnReconnect(), "refetch-reconnect");
  }

  const hasWindow = typeof globalThis.window !== "undefined";
  if (hasWindow) {
    globalThis.window.addEventListener("focus", onWindowFocus);
    globalThis.window.addEventListener("online", onNetworkReconnect);
  }

  function emitEvent(event: QueryClientEvent): void {
    for (const listener of eventListeners) {
      listener(event);
    }
  }

  function incrementFetching(portName: string): void {
    fetchingCounts.set(portName, (fetchingCounts.get(portName) ?? 0) + 1);
  }

  function decrementFetching(portName: string): void {
    const current = fetchingCounts.get(portName) ?? 0;
    if (current <= 1) {
      fetchingCounts.delete(portName);
    } else {
      fetchingCounts.set(portName, current - 1);
    }
  }

  function assertNotDisposed(portName: string): Result<void, QueryResolutionError> {
    if (disposed) {
      return err(queryDisposed(portName));
    }
    return ok(undefined);
  }

  function getRetryConfig(portDefaults?: Partial<QueryDefaults>): RetryConfig {
    return {
      retry: portDefaults?.retry ?? defaults.retry,
      retryDelay: portDefaults?.retryDelay ?? defaults.retryDelay,
    };
  }

  function isStale(dataUpdatedAt: number | undefined, staleTime: number): boolean {
    if (dataUpdatedAt === undefined) return true;
    if (staleTime === 0) return true;
    return clock.now() - dataUpdatedAt > staleTime;
  }

  /**
   * Safely invoke a user-provided callback, swallowing any thrown exceptions.
   * This prevents user callbacks from breaking the never-reject invariant.
   */
  function safeCall(fn: () => void): void {
    fromThrowable(fn, () => undefined);
  }

  /**
   * Safely invoke an async user-provided callback, wrapping the result
   * in a ResultAsync that captures thrown exceptions as Err values.
   */
  function safeCallAsync<T>(fn: () => T | Promise<T>): ResultAsync<T, unknown> {
    return ResultAsync.fromPromise(Promise.resolve().then(fn), cause => cause);
  }

  /**
   * Resolve a service from the DI container.
   * Returns undefined if resolution fails (adapter not registered).
   */
  function resolveService(port: Port<string, unknown>): unknown {
    return fromThrowable(
      () => container.resolve(port),
      () => undefined
    ).unwrapOr(undefined);
  }

  function doFetch<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams,
    options?: FetchOptions,
    trigger: FetchTrigger = "refetch-manual"
  ): ResultAsync<TData, TError | QueryResolutionError> {
    const disposed_ = assertNotDisposed(port.__portName);
    if (disposed_.isErr()) {
      return ResultAsync.err(disposed_.error);
    }

    const fetcher = resolveService(port);
    if (!fetcher) {
      const missingErr = queryAdapterMissing(port.__portName);
      emitEvent({
        type: "fetch-error",
        portName: port.__portName,
        params,
        durationMs: 0,
        errorTag: missingErr._tag,
      });
      return ResultAsync.err(missingErr);
    }

    const cacheKey = createCacheKeyFromName(port.__portName, params);
    const serialized = serializeCacheKey(cacheKey);

    // Check if we have fresh data in cache
    const existing = cache.get(port, params);
    const staleTime = port.config.defaults?.staleTime ?? defaults.staleTime;
    if (
      existing?.result?.isOk() &&
      !existing.isInvalidated &&
      !isStale(existing.dataUpdatedAt, staleTime)
    ) {
      emitEvent({ type: "cache-hit", portName: port.__portName, params });
      tracingHook?.onFetchStart(port.__portName, stableStringify(params), {
        cacheHit: true,
        deduplicated: false,
        staleTimeMs: staleTime,
      });
      tracingHook?.onFetchEnd(port.__portName, true);
      return ResultAsync.ok(narrowCacheData<TData>(existing.data));
    }

    // Network mode enforcement
    const networkMode = port.config.defaults?.networkMode ?? defaults.networkMode;
    if (
      networkMode === "online" &&
      typeof navigator !== "undefined" &&
      navigator.onLine === false
    ) {
      // Set fetchStatus to "paused" and return existing data if available
      return ResultAsync.ok(narrowCacheData<TData>(existing?.data));
    }

    // Ensure entry exists in cache
    cache.getOrCreate(port, params);

    // Deduplicate in-flight requests
    if (dedup.has(serialized)) {
      emitEvent({ type: "deduplicated", portName: port.__portName, params });
    }
    return dedup.dedupe(serialized, () => {
      const controller = new AbortController();
      cancellationControllers.set(serialized, controller);

      const signal = options?.signal
        ? combineSignals(options.signal, controller.signal)
        : controller.signal;

      const fetchContext: FetchContext = {
        signal,
        meta: options?.meta,
        onProgress: (intermediateData: unknown) => {
          cache.set(port, params, intermediateData);
        },
      };

      const retryConfig = getRetryConfig(port.config.defaults);
      const startTime = clock.now();

      incrementFetching(port.__portName);
      emitEvent({ type: "fetch-started", portName: port.__portName, params, trigger });
      tracingHook?.onFetchStart(port.__portName, stableStringify(params), {
        cacheHit: false,
        deduplicated: false,
        staleTimeMs: staleTime,
      });

      return fetchWithRetry<TData, TError>(
        port.__portName,
        params,
        () => {
          // BRAND_CAST: The container resolved the fetcher as `unknown`;
          // the public API boundary guarantees it matches QueryFetcher<TData, TParams, TError>.
          const fn =
            narrowCallback<(p: TParams, ctx: FetchContext) => ResultAsync<unknown, unknown>>(
              fetcher
            );
          return narrowResultAsync<TData, TError>(fn(params, fetchContext));
        },
        retryConfig,
        signal,
        attempt => {
          emitEvent({ type: "retry", portName: port.__portName, params, attempt });
        }
      )
        .map(data => {
          cache.set(port, params, data, {
            structuralSharing:
              port.config.defaults?.structuralSharing ?? defaults.structuralSharing,
          });
          cancellationControllers.delete(serialized);
          decrementFetching(port.__portName);
          emitEvent({
            type: "fetch-completed",
            portName: port.__portName,
            params,
            durationMs: clock.now() - startTime,
          });
          tracingHook?.onFetchEnd(port.__portName, true);
          return data;
        })
        .mapErr(error => {
          decrementFetching(port.__portName);
          if (isAbortError(error)) {
            cancellationControllers.delete(serialized);
            emitEvent({ type: "fetch-cancelled", portName: port.__portName, params });
            tracingHook?.onFetchEnd(port.__portName, false);
            return queryCancelled(port.__portName, params);
          }
          cancellationControllers.delete(serialized);
          cache.setError(port, params, error);
          emitEvent({
            type: "fetch-error",
            portName: port.__portName,
            params,
            durationMs: clock.now() - startTime,
            errorTag: extractErrorTag(error),
          });
          tracingHook?.onFetchEnd(port.__portName, false);
          return error;
        });
    });
  }

  const client: QueryClient = {
    fetchQuery<TData, TParams, TError, TName extends string>(
      port: QueryPort<TName, TData, TParams, TError>,
      params: TParams,
      options?: FetchOptions
    ): ResultAsync<TData, TError | QueryResolutionError> {
      return doFetch(port, params, options, "refetch-manual");
    },

    prefetchQuery<TData, TParams, TError, TName extends string>(
      port: QueryPort<TName, TData, TParams, TError>,
      params: TParams,
      options?: PrefetchOptions
    ): ResultAsync<void, TError | QueryResolutionError> {
      return doFetch(port, params, options, "prefetch").map(() => undefined);
    },

    ensureQueryData<TData, TParams, TError, TName extends string>(
      port: QueryPort<TName, TData, TParams, TError>,
      params: TParams,
      options?: FetchOptions
    ): ResultAsync<TData, TError | QueryResolutionError> {
      const existing = cache.get(port, params);
      if (existing?.data !== undefined && !existing.isInvalidated) {
        return ResultAsync.ok(narrowCacheData<TData>(existing.data));
      }
      return doFetch(port, params, options, "ensure");
    },

    getQueryData<TData, TParams, TError, TName extends string>(
      port: QueryPort<TName, TData, TParams, TError>,
      params: TParams
    ): TData | undefined {
      const entry = cache.get(port, params);
      if (entry?.data === undefined) return undefined;
      return narrowCacheData<TData>(entry.data);
    },

    getQueryState<TData, TParams, TError, TName extends string>(
      port: QueryPort<TName, TData, TParams, TError>,
      params: TParams
    ): QueryState<TData, TError> | undefined {
      const entry = cache.get(port, params);
      if (!entry) return undefined;

      const staleTime = port.config.defaults?.staleTime ?? defaults.staleTime;
      const isFetchingNow = dedup.has(
        serializeCacheKey(createCacheKeyFromName(port.__portName, params))
      );

      const state: QueryState<TData, TError> = {
        status: entry.status,
        fetchStatus: isFetchingNow ? "fetching" : "idle",
        isPending: entry.status === "pending",
        isSuccess: entry.status === "success",
        isError: entry.status === "error",
        isFetching: isFetchingNow,
        isRefetching: isFetchingNow && entry.status !== "pending",
        isLoading: isFetchingNow && entry.status === "pending",
        isStale: isStale(entry.dataUpdatedAt, staleTime),
        isPlaceholderData: false,
        isPaused: false,
        result: narrowResult<TData, TError>(entry.result),
        data: entry.data !== undefined ? narrowCacheData<TData>(entry.data) : undefined,
        error: entry.error !== null ? narrowCacheData<TError>(entry.error) : null,
        dataUpdatedAt: entry.dataUpdatedAt,
        errorUpdatedAt: entry.errorUpdatedAt,
        refetch: _options => doFetch(port, params),
      };

      return state;
    },

    setQueryData<TData, TParams, TError, TName extends string>(
      port: QueryPort<TName, TData, TParams, TError>,
      params: TParams,
      dataOrUpdater: TData | ((prev: TData | undefined) => TData)
    ): void {
      if (typeof dataOrUpdater === "function") {
        const updater = narrowCallback<(prev: TData | undefined) => TData>(dataOrUpdater);
        const existing = cache.get(port, params);
        const prev =
          existing?.data !== undefined ? narrowCacheData<TData>(existing.data) : undefined;
        cache.set(port, params, updater(prev));
      } else {
        cache.set(port, params, dataOrUpdater);
      }
    },

    mutate<TData, TInput, TError, TContext, TName extends string>(
      port: MutationPort<TName, TData, TInput, TError, TContext>,
      input: TInput,
      options?: MutateOptions<TData, TInput, TError, TContext>
    ): ResultAsync<TData, TError | QueryResolutionError> {
      const disposed_ = assertNotDisposed(port.__portName);
      if (disposed_.isErr()) {
        return ResultAsync.err(disposed_.error);
      }

      const executor = resolveService(port);
      if (!executor) {
        return ResultAsync.err(queryAdapterMissing(port.__portName));
      }

      const controller = new AbortController();
      const signal = options?.signal
        ? combineSignals(options.signal, controller.signal)
        : controller.signal;

      const mutationContext: MutationContext = {
        signal,
        meta: options?.meta,
      };

      const onMutate = options?.onMutate;
      const onSuccess = options?.onSuccess;
      const onError = options?.onError;
      const onSettled = options?.onSettled;

      mutatingCount++;
      emitEvent({ type: "mutation-started", portName: port.__portName, input });
      tracingHook?.onMutationStart(port.__portName, stableStringify(input), {
        portName: port.__portName,
      });

      return ResultAsync.fromResult(
        (async (): Promise<Result<TData, TError | QueryResolutionError>> => {
          let context: TContext | undefined;
          if (onMutate) {
            const contextResult = await safeCallAsync<TContext>(() => onMutate(input));
            if (contextResult.isErr()) {
              mutatingCount--;
              emitEvent({
                type: "mutation-completed",
                portName: port.__portName,
                input,
                success: false,
              });
              tracingHook?.onMutationEnd(port.__portName, false);
              return err(queryFetchFailed(port.__portName, input, 0, contextResult.error));
            }
            context = contextResult.value;
          }

          // BRAND_CAST: The container resolved the executor as `unknown`;
          // the public API boundary guarantees it matches MutationExecutor<TData, TInput, TError>.
          const fn =
            narrowCallback<(i: TInput, ctx: MutationContext) => ResultAsync<unknown, unknown>>(
              executor
            );
          const raw = fn(input, mutationContext);
          const result = await narrowResultAsync<TData, TError>(raw);
          return result.match(
            (value): Result<TData, TError | QueryResolutionError> => {
              safeCall(() => onSuccess?.(value, input, context));
              safeCall(() => onSettled?.(value, undefined, input, context));

              // Process mutation effects from port config
              const effects = port.config.effects;
              if (effects) {
                if (effects.invalidates) {
                  for (const queryPort of effects.invalidates) {
                    const beforeCount = cache.findByPort(queryPort).length;
                    cache.invalidate(queryPort);
                    emitEvent({
                      type: "mutation-effect-applied",
                      mutationPortName: port.__portName,
                      targetPortName: queryPort.__portName,
                      effect: "invalidates",
                      entriesAffected: beforeCount,
                    });
                  }
                }
                if (effects.removes) {
                  for (const queryPort of effects.removes) {
                    const beforeCount = cache.findByPort(queryPort).length;
                    cache.remove(queryPort);
                    emitEvent({
                      type: "mutation-effect-applied",
                      mutationPortName: port.__portName,
                      targetPortName: queryPort.__portName,
                      effect: "removes",
                      entriesAffected: beforeCount,
                    });
                  }
                }
              }

              mutatingCount--;
              emitEvent({
                type: "mutation-completed",
                portName: port.__portName,
                input,
                success: true,
              });
              tracingHook?.onMutationEnd(port.__portName, true);
              return ok(value);
            },
            (error): Result<TData, TError | QueryResolutionError> => {
              safeCall(() => onError?.(error, input, context));
              safeCall(() => onSettled?.(undefined, error, input, context));
              mutatingCount--;
              emitEvent({
                type: "mutation-completed",
                portName: port.__portName,
                input,
                success: false,
              });
              tracingHook?.onMutationEnd(port.__portName, false);
              return err(error);
            }
          );
        })()
      );
    },

    invalidateQueries<TData, TParams, TError, TName extends string>(
      port: QueryPort<TName, TData, TParams, TError>,
      params?: TParams
    ): ResultAsync<void, QueryResolutionError> {
      // Enforce max invalidation depth
      if (invalidationDepth >= maxInvalidationDepth) {
        return ResultAsync.err(queryInvalidationCycle([port.__portName], invalidationDepth));
      }

      invalidationDepth++;
      return ResultAsync.fromResult(
        (async (): Promise<Result<void, QueryResolutionError>> => {
          try {
            cache.invalidate(port, params);
            emitEvent({ type: "invalidated", portName: port.__portName, params });

            // Refetch active queries (those with subscribers)
            if (params !== undefined) {
              const reactiveEntry = cache.getEntry(port, params);
              if (reactiveEntry && hasSubscribers(reactiveEntry)) {
                // Intentionally discard refetch errors — invalidation succeeds regardless
                await doFetch(port, params, undefined, "invalidation")
                  .map(() => undefined)
                  .orElse(() => ResultAsync.ok(undefined));
              }
            } else {
              const portEntries = cache.findByPort(port);
              const refetchResults = portEntries
                .filter(([key]) => {
                  // Only refetch entries that have active subscribers.
                  // Parse params from cache key hash. For `undefined` params, key[1]
                  // is "undefined" which JSON.parse rejects — the catch returns undefined.
                  let parsedParams: unknown;
                  try {
                    parsedParams = JSON.parse(key[1]);
                  } catch {
                    parsedParams = undefined;
                  }
                  const reactiveEntry = cache.getEntry(port, parsedParams);
                  return reactiveEntry !== undefined && hasSubscribers(reactiveEntry);
                })
                .map(([_key]) => {
                  return doFetch(
                    port,
                    narrowUndefinedAsParams<TParams>(undefined),
                    undefined,
                    "invalidation"
                  )
                    .map(() => undefined)
                    .orElse(() => ResultAsync.ok(undefined));
                });
              // Wait for all refetches to complete (errors already recovered above via orElse)
              await Promise.all(refetchResults);
            }

            return ok(undefined);
          } finally {
            invalidationDepth--;
          }
        })()
      );
    },

    invalidateMatching(
      predicate: (entry: CacheEntry<unknown, unknown>, key: CacheKey) => boolean
    ): ResultAsync<void, QueryResolutionError> {
      const matching = cache.find(predicate);
      const portNames = new Set<string>();
      for (const [key] of matching) {
        portNames.add(key[0]);
      }
      for (const portName of portNames) {
        cache.invalidate({ __portName: portName });
      }
      return ResultAsync.ok(undefined);
    },

    invalidateAll(): ResultAsync<void, QueryResolutionError> {
      const all = cache.find(() => true);
      const portNames = new Set<string>();
      for (const [key] of all) {
        portNames.add(key[0]);
      }
      for (const portName of portNames) {
        cache.invalidate({ __portName: portName });
      }
      return ResultAsync.ok(undefined);
    },

    removeQueries<TData, TParams, TError, TName extends string>(
      port: QueryPort<TName, TData, TParams, TError>,
      params?: TParams
    ): void {
      cache.remove(port, params);
    },

    cancelQueries<TData, TParams, TError, TName extends string>(
      port: QueryPort<TName, TData, TParams, TError>,
      params?: TParams
    ): ResultAsync<void, never> {
      if (params !== undefined) {
        const cacheKey = createCacheKeyFromName(port.__portName, params);
        const serialized = serializeCacheKey(cacheKey);
        const controller = cancellationControllers.get(serialized);
        if (controller) {
          controller.abort();
          cancellationControllers.delete(serialized);
        }
      } else {
        for (const [key, controller] of cancellationControllers) {
          if (key.startsWith(port.__portName + "\0")) {
            controller.abort();
            cancellationControllers.delete(key);
          }
        }
      }
      return ResultAsync.ok(undefined);
    },

    cancelAll(): ResultAsync<void, never> {
      for (const [, controller] of cancellationControllers) {
        controller.abort();
      }
      cancellationControllers.clear();
      return ResultAsync.ok(undefined);
    },

    reset<TData, TParams, TError, TName extends string>(
      port: QueryPort<TName, TData, TParams, TError>,
      params?: TParams
    ): void {
      cache.remove(port, params);
    },

    clear(): void {
      cache.clear();
    },

    observe<TData, TParams, TError, TName extends string>(
      port: QueryPort<TName, TData, TParams, TError>,
      params: TParams,
      options?: QueryObserverOptions<TData, TError>
    ): QueryObserver<TData, TError> {
      const inner = createQueryObserver(client, port, params, options);

      const record: ObserverRecord = {
        getStaleTime: () => port.config.defaults?.staleTime ?? defaults.staleTime,
        getRefetchOnWindowFocus: () =>
          port.config.defaults?.refetchOnWindowFocus ?? defaults.refetchOnWindowFocus,
        getRefetchOnReconnect: () =>
          port.config.defaults?.refetchOnReconnect ?? defaults.refetchOnReconnect,
        getEntry: () => cache.get(port, params),
        invalidate: () => cache.invalidate(port, params),
        refetch: trigger => {
          void doFetch(port, params, undefined, trigger);
        },
      };
      activeObservers.add(record);

      return {
        subscribe: listener => inner.subscribe(listener),
        getState: () => inner.getState(),
        refetch: opts => inner.refetch(opts),
        destroy() {
          activeObservers.delete(record);
          inner.destroy();
        },
        get isDestroyed() {
          return inner.isDestroyed;
        },
      };
    },

    subscribeToQuery<TData, TParams, TError, TName extends string>(
      port: QueryPort<TName, TData, TParams, TError>,
      params: TParams,
      callback: (state: QueryState<TData, TError>) => void
    ): () => void {
      const observer = client.observe(port, params, { enabled: false });
      const unsub = observer.subscribe(callback);
      return () => {
        unsub();
        observer.destroy();
      };
    },

    cache,

    subscribe(listener: CacheListener): Unsubscribe {
      return cache.subscribe(listener);
    },

    createChild(): QueryClient {
      return createQueryClient({
        container,
        clock,
        defaults: config.defaults,
        maxInvalidationDepth: config.maxInvalidationDepth,
        tracingHook,
        persister: config.persister,
      });
    },

    dispose(): void {
      if (disposed) return;
      disposed = true;
      persistenceUnsubscribe?.();
      persistenceManager?.dispose();
      if (hasWindow) {
        globalThis.window.removeEventListener("focus", onWindowFocus);
        globalThis.window.removeEventListener("online", onNetworkReconnect);
      }
      activeObservers.clear();
      dedup.cancelAll();
      for (const [, controller] of cancellationControllers) {
        controller.abort();
      }
      cancellationControllers.clear();
      cache.dispose();
    },

    get isDisposed(): boolean {
      return disposed;
    },

    defaults,

    isFetching(filters?: { readonly port?: { readonly __portName: string } }): number {
      if (filters?.port) {
        return fetchingCounts.get(filters.port.__portName) ?? 0;
      }
      let total = 0;
      for (const count of fetchingCounts.values()) {
        total += count;
      }
      return total;
    },

    isMutating(): number {
      return mutatingCount;
    },

    pause(): void {
      paused = true;
    },

    resume(): void {
      paused = false;
    },

    get isPaused(): boolean {
      return paused;
    },

    subscribeToEvents(listener: (event: QueryClientEvent) => void): Unsubscribe {
      eventListeners.add(listener);
      return () => {
        eventListeners.delete(listener);
      };
    },
  };

  return client;
}

// =============================================================================
// Helpers
// =============================================================================

function combineSignals(signal1: AbortSignal, signal2: AbortSignal): AbortSignal {
  const controller = new AbortController();

  const onAbort = (): void => {
    controller.abort();
  };

  if (signal1.aborted || signal2.aborted) {
    controller.abort();
    return controller.signal;
  }

  signal1.addEventListener("abort", onAbort, { once: true });
  signal2.addEventListener("abort", onAbort, { once: true });

  return controller.signal;
}

function extractErrorTag(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "_tag" in error) {
    const tagged = error;
    if (typeof tagged._tag === "string") {
      return tagged._tag;
    }
  }
  return undefined;
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  // fetchWithRetry wraps errors in QueryFetchFailed — check the cause
  if (typeof error === "object" && error !== null && "_tag" in error && "cause" in error) {
    const tagged = error;
    if (tagged._tag === "QueryFetchFailed") {
      return isAbortError(tagged.cause);
    }
  }
  return false;
}
