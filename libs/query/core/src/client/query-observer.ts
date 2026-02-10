/**
 * QueryObserver - Subscribes to a single query and tracks state changes.
 *
 * @packageDocumentation
 */

import type { ResultAsync } from "@hex-di/result";
import type { QueryPort } from "../ports/query-port.js";
import type { CacheEntry } from "../cache/cache-entry.js";
import type { QueryState, QueryStatus, FetchStatus } from "../types/state.js";
import type { QueryResolutionError } from "../types/errors.js";
import type { RefetchOptions } from "../types/options.js";
import {
  narrowEntryData,
  narrowEntryError,
  narrowEntryResult,
  narrowSelectedData,
} from "./type-boundary.js";

// Forward reference to QueryClient-like (avoid circular import)
interface QueryClientLike {
  fetchQuery<TData, TParams, TError, TName extends string>(
    port: QueryPort<TName, TData, TParams, TError>,
    params: TParams
  ): ResultAsync<TData, TError | QueryResolutionError>;
  readonly cache: {
    get(
      port: { readonly __portName: string },
      params: unknown
    ): CacheEntry<unknown, unknown> | undefined;
    getOrCreate(
      port: { readonly __portName: string },
      params: unknown
    ): CacheEntry<unknown, unknown>;
    incrementObservers(port: { readonly __portName: string }, params: unknown): void;
    decrementObservers(port: { readonly __portName: string }, params: unknown): void;
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
// Observer Factory
// =============================================================================

const DEFAULT_STATUS: QueryStatus = "pending";

export function createQueryObserver<TData, TParams, TError, TName extends string>(
  client: QueryClientLike,
  port: QueryPort<TName, TData, TParams, TError>,
  params: TParams,
  options?: QueryObserverOptions<TData, TError>
): QueryObserver<TData, TError> {
  const listeners = new Set<(state: QueryState<TData, TError>) => void>();
  let destroyed = false;
  let isFetching = false;

  // Cached state for referential stability: getState() returns the same
  // object when the underlying data hasn't changed (required by
  // React's useSyncExternalStore).
  let currentState: QueryState<TData, TError>;

  // Cache for select results: avoids re-running select on unchanged raw data,
  // which would produce new object references and break referential stability.
  let cachedSelectRawData: TData | undefined;
  let cachedSelectResult: TData | undefined;

  // Register as observer
  client.cache.getOrCreate(port, params);
  client.cache.incrementObservers(port, params);

  function deriveState(entry: CacheEntry<unknown, unknown> | undefined): QueryState<TData, TError> {
    const status: QueryStatus = entry?.status ?? DEFAULT_STATUS;
    const fetchStatus: FetchStatus = isFetching ? "fetching" : "idle";
    let data = narrowEntryData<TData>(entry?.data);
    const error = narrowEntryError<TError>(entry?.error ?? null);

    // Apply select transform if configured and data is present.
    // Cache the result so that unchanged raw data produces the same reference.
    if (options?.select && data !== undefined) {
      if (!Object.is(data, cachedSelectRawData)) {
        cachedSelectRawData = data;
        cachedSelectResult = narrowSelectedData<TData>(options.select(data));
      }
      data = cachedSelectResult;
    }

    return {
      status,
      fetchStatus,
      isPending: status === "pending",
      isSuccess: status === "success",
      isError: status === "error",
      isFetching: fetchStatus === "fetching",
      isRefetching: status === "success" && fetchStatus === "fetching",
      isLoading: status === "pending" && fetchStatus === "fetching",
      isStale: entry?.isInvalidated ?? true,
      isPlaceholderData: false,
      isPaused: false,
      result: narrowEntryResult<TData, TError>(entry?.result),
      data,
      error,
      dataUpdatedAt: entry?.dataUpdatedAt,
      errorUpdatedAt: entry?.errorUpdatedAt,
      refetch: (opts?: RefetchOptions) => observer.refetch(opts),
    };
  }

  /**
   * Compares two states by their meaningful data fields (ignoring function fields).
   * Returns true if the states differ.
   */
  function stateChanged(prev: QueryState<TData, TError>, next: QueryState<TData, TError>): boolean {
    return (
      prev.status !== next.status ||
      prev.fetchStatus !== next.fetchStatus ||
      !Object.is(prev.data, next.data) ||
      !Object.is(prev.error, next.error) ||
      prev.dataUpdatedAt !== next.dataUpdatedAt ||
      prev.errorUpdatedAt !== next.errorUpdatedAt ||
      prev.isStale !== next.isStale
    );
  }

  /**
   * Checks whether any of the tracked properties changed between
   * the previous state and the next state using Object.is per-key.
   */
  function hasRelevantChanges(
    prev: QueryState<TData, TError>,
    next: QueryState<TData, TError>,
    trackedProps: ReadonlyArray<keyof QueryState<TData, TError>>
  ): boolean {
    for (const prop of trackedProps) {
      if (!Object.is(prev[prop], next[prop])) {
        return true;
      }
    }
    return false;
  }

  /**
   * Refreshes currentState from the cache and isFetching flag.
   * Returns true if the state actually changed.
   */
  function refreshState(): boolean {
    const entry = client.cache.get(port, params);
    const nextState = deriveState(entry);
    if (stateChanged(currentState, nextState)) {
      currentState = nextState;
      return true;
    }
    return false;
  }

  function notify(): void {
    if (destroyed) return;

    const prevState = currentState;
    if (!refreshState()) return; // No meaningful change — skip notification

    // notifyOnChangeProps: skip notification when no tracked property changed
    if (options?.notifyOnChangeProps) {
      if (!hasRelevantChanges(prevState, currentState, options.notifyOnChangeProps)) {
        return;
      }
    }

    for (const listener of listeners) {
      listener(currentState);
    }
  }

  // Initialize currentState from the cache
  const initialEntry = client.cache.get(port, params);
  currentState = deriveState(initialEntry);

  // Subscribe to cache events
  const unsubscribeCache = client.cache.subscribe(() => {
    notify();
  });

  // Initial fetch if enabled
  const enabled = options?.enabled ?? true;
  if (enabled) {
    isFetching = true;
    // Update currentState to reflect isFetching=true
    refreshState();
    void client
      .fetchQuery(port, params)
      .map(() => {
        isFetching = false;
        notify();
      })
      .mapErr(() => {
        isFetching = false;
        notify();
      });
  }

  const observer: QueryObserver<TData, TError> = {
    subscribe(listener: (state: QueryState<TData, TError>) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    getState(): QueryState<TData, TError> {
      // Refresh from cache to pick up any changes not yet notified
      refreshState();
      return currentState;
    },

    refetch(_options?: RefetchOptions): ResultAsync<TData, TError | QueryResolutionError> {
      isFetching = true;
      notify();
      const result = client.fetchQuery(port, params);
      void result
        .map(() => {
          isFetching = false;
          notify();
        })
        .mapErr(() => {
          isFetching = false;
          notify();
        });
      return result;
    },

    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      unsubscribeCache();
      client.cache.decrementObservers(port, params);
      listeners.clear();
    },

    get isDestroyed(): boolean {
      return destroyed;
    },
  };

  return observer;
}
