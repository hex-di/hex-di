/**
 * Fetch operations for QueryClient.
 *
 * @packageDocumentation
 */

import { ResultAsync } from "@hex-di/result";
import type { Port } from "@hex-di/core";
import type { QueryPort } from "../ports/query-port.js";
import type { FetchContext } from "../ports/types.js";
import type { QueryCache, Clock } from "../cache/query-cache.js";
import { createCacheKeyFromName, serializeCacheKey } from "../cache/cache-key.js";
import type { RetryConfig } from "../cache/retry.js";
import { fetchWithRetry } from "../cache/retry.js";
import type { DeduplicationMap } from "./deduplication.js";
import { narrowCacheData, narrowCallback, narrowResultAsync } from "./type-boundary.js";
import { stableStringify } from "../cache/stable-stringify.js";
import type { QueryDefaults, FetchOptions } from "../types/options.js";
import { queryAdapterMissing, queryCancelled } from "../types/errors.js";
import type { QueryResolutionError } from "../types/errors.js";
import type { QueryClientEvent, FetchTrigger, QueryContainer } from "./query-client-types.js";
import { combineSignals, extractErrorTag, isAbortError } from "./query-client-helpers.js";

export interface QueryClientOperationsContext {
  readonly cache: QueryCache;
  readonly dedup: DeduplicationMap;
  readonly container: QueryContainer;
  readonly clock: Clock;
  readonly defaults: QueryDefaults;
  readonly cancellationControllers: Map<string, AbortController>;
  readonly mutatingCountRef: { current: number };
  emitEvent(event: QueryClientEvent): void;
  readonly tracingHook?: import("../tracing/types.js").QueryTracingHook;
  assertNotDisposed(portName: string): import("@hex-di/result").Result<void, QueryResolutionError>;
  getRetryConfig(portDefaults?: Partial<QueryDefaults>): RetryConfig;
  isStale(dataUpdatedAt: number | undefined, staleTime: number): boolean;
  resolveService(port: Port<string, unknown>): unknown;
  incrementFetching(portName: string): void;
  decrementFetching(portName: string): void;
}

function handleFetchSuccess<TData, TParams, TError, TName extends string>(
  ctx: QueryClientOperationsContext,
  port: QueryPort<TName, TData, TParams, TError>,
  params: TParams,
  serialized: string,
  startTime: number,
  data: TData
): TData {
  ctx.cache.set(port, params, data, {
    structuralSharing: port.config.defaults?.structuralSharing ?? ctx.defaults.structuralSharing,
  });
  ctx.cancellationControllers.delete(serialized);
  ctx.decrementFetching(port.__portName);
  ctx.emitEvent({
    type: "fetch-completed",
    portName: port.__portName,
    params,
    durationMs: ctx.clock.now() - startTime,
  });
  ctx.tracingHook?.onFetchEnd(port.__portName, true);
  return data;
}

function handleFetchError<TData, TParams, TError, TName extends string>(
  ctx: QueryClientOperationsContext,
  port: QueryPort<TName, TData, TParams, TError>,
  params: TParams,
  serialized: string,
  startTime: number,
  error: TError
): TError | QueryResolutionError {
  ctx.decrementFetching(port.__portName);
  if (isAbortError(error)) {
    ctx.cancellationControllers.delete(serialized);
    ctx.emitEvent({ type: "fetch-cancelled", portName: port.__portName, params });
    ctx.tracingHook?.onFetchEnd(port.__portName, false);
    return queryCancelled(port.__portName, params);
  }
  ctx.cancellationControllers.delete(serialized);
  ctx.cache.setError(port, params, error);
  ctx.emitEvent({
    type: "fetch-error",
    portName: port.__portName,
    params,
    durationMs: ctx.clock.now() - startTime,
    errorTag: extractErrorTag(error),
  });
  ctx.tracingHook?.onFetchEnd(port.__portName, false);
  return error;
}

function isCacheFresh(
  existing:
    | { result?: { isOk(): boolean }; isInvalidated: boolean; dataUpdatedAt?: number }
    | undefined,
  staleTime: number,
  isStale: (dataUpdatedAt: number | undefined, staleTime: number) => boolean
): boolean {
  return (
    existing?.result?.isOk() === true &&
    !existing.isInvalidated &&
    !isStale(existing.dataUpdatedAt, staleTime)
  );
}

function isOfflineBlocked(networkMode: string): boolean {
  return networkMode === "online" && typeof navigator !== "undefined" && navigator.onLine === false;
}

function startFetchPipeline<TData, TParams, TError, TName extends string>(
  ctx: QueryClientOperationsContext,
  port: QueryPort<TName, TData, TParams, TError>,
  params: TParams,
  options: FetchOptions | undefined,
  serialized: string,
  staleTime: number,
  trigger: FetchTrigger,
  fetcher: unknown
): ResultAsync<TData, TError | QueryResolutionError> {
  const controller = new AbortController();
  ctx.cancellationControllers.set(serialized, controller);

  const signal = options?.signal
    ? combineSignals(options.signal, controller.signal)
    : controller.signal;

  const fetchContext: FetchContext = {
    signal,
    meta: options?.meta,
    onProgress: (intermediateData: unknown) => {
      ctx.cache.set(port, params, intermediateData);
    },
  };

  const retryConfig = ctx.getRetryConfig(port.config.defaults);
  const startTime = ctx.clock.now();

  ctx.incrementFetching(port.__portName);
  ctx.emitEvent({ type: "fetch-started", portName: port.__portName, params, trigger });
  ctx.tracingHook?.onFetchStart(port.__portName, stableStringify(params), {
    cacheHit: false,
    deduplicated: false,
    staleTimeMs: staleTime,
  });

  return fetchWithRetry<TData, TError>(
    port.__portName,
    params,
    () => {
      const fn =
        narrowCallback<
          (p: TParams, c: FetchContext) => import("@hex-di/result").ResultAsync<unknown, unknown>
        >(fetcher);
      return narrowResultAsync<TData, TError>(fn(params, fetchContext));
    },
    retryConfig,
    signal,
    attempt => {
      ctx.emitEvent({ type: "retry", portName: port.__portName, params, attempt });
    }
  )
    .map(data => handleFetchSuccess(ctx, port, params, serialized, startTime, data))
    .mapErr(error => handleFetchError(ctx, port, params, serialized, startTime, error));
}

export function executeFetch<TData, TParams, TError, TName extends string>(
  ctx: QueryClientOperationsContext,
  port: QueryPort<TName, TData, TParams, TError>,
  params: TParams,
  options?: FetchOptions,
  trigger: FetchTrigger = "refetch-manual"
): ResultAsync<TData, TError | QueryResolutionError> {
  const disposed = ctx.assertNotDisposed(port.__portName);
  if (disposed.isErr()) {
    return ResultAsync.err(disposed.error);
  }

  const fetcher = ctx.resolveService(port);
  if (!fetcher) {
    const missingErr = queryAdapterMissing(port.__portName);
    ctx.emitEvent({
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

  const existing = ctx.cache.get(port, params);
  const staleTime = port.config.defaults?.staleTime ?? ctx.defaults.staleTime;
  if (isCacheFresh(existing, staleTime, ctx.isStale)) {
    ctx.emitEvent({ type: "cache-hit", portName: port.__portName, params });
    ctx.tracingHook?.onFetchStart(port.__portName, stableStringify(params), {
      cacheHit: true,
      deduplicated: false,
      staleTimeMs: staleTime,
    });
    ctx.tracingHook?.onFetchEnd(port.__portName, true);
    return ResultAsync.ok(narrowCacheData<TData>(existing!.data));
  }

  const networkMode = port.config.defaults?.networkMode ?? ctx.defaults.networkMode;
  if (isOfflineBlocked(networkMode)) {
    return ResultAsync.ok(narrowCacheData<TData>(existing?.data));
  }

  ctx.cache.getOrCreate(port, params);

  if (ctx.dedup.has(serialized)) {
    ctx.emitEvent({ type: "deduplicated", portName: port.__portName, params });
  }
  return ctx.dedup.dedupe(serialized, () =>
    startFetchPipeline(ctx, port, params, options, serialized, staleTime, trigger, fetcher)
  );
}
