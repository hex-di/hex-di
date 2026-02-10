/**
 * useSuspenseQuery Hook
 *
 * Integrates with React Suspense to throw Promises when data is
 * loading and errors for ErrorBoundary. When the data is ready,
 * the returned state always has `status: "success"` with `TData`.
 *
 * @packageDocumentation
 */

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
  result: "pending" | "success" | { readonly error: unknown };
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
  const client = useQueryClient();

  const observerRef = useRef<QueryObserver<TData, TError> | null>(null);
  const snapshotRef = useRef<QueryState<TData, TError> | null>(null);

  // Lazily create/recreate observer
  if (observerRef.current === null || observerRef.current.isDestroyed) {
    const observerOptions: QueryObserverOptions<TData, TError> = {
      enabled: options?.enabled,
    };
    observerRef.current = client.observe(port, params, observerOptions);
    snapshotRef.current = null;
  }

  const observer = observerRef.current;

  // Cleanup observer and suspense cache entry on unmount
  useEffect(() => {
    return () => {
      observer.destroy();
    };
  }, [observer]);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const unsubscribe = observer.subscribe(() => {
        snapshotRef.current = null;
        onStoreChange();
      });
      // Check for missed notifications between getSnapshot and subscribe
      const currentState = observer.getState();
      if (snapshotRef.current !== null && currentState.status !== snapshotRef.current.status) {
        snapshotRef.current = null;
        onStoreChange();
      }
      return unsubscribe;
    },
    [observer]
  );

  const getSnapshot = useCallback((): QueryState<TData, TError> => {
    if (snapshotRef.current !== null) {
      return snapshotRef.current;
    }
    const state = observer.getState();
    snapshotRef.current = state;
    return state;
  }, [observer]);

  // Use useSyncExternalStore for the raw state (no throws inside getSnapshot)
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Suspense protocol: throw during render

  // If we have data, return success state immediately
  if (state.data !== undefined) {
    return {
      status: "success",
      data: state.data,
      isSuccess: true,
      isFetching: state.isFetching,
      isRefetching: state.isRefetching,
      dataUpdatedAt: state.dataUpdatedAt,
    };
  }

  // No data available -- use suspense cache to track fetch state
  const cacheKey = port.__portName + "\0" + JSON.stringify(params);
  const existing = suspenseCache.get(cacheKey);

  if (existing !== undefined) {
    if (existing.result === "success") {
      // Data should be in the observer/cache now; wait for re-render
      // to pick it up via useSyncExternalStore
    } else if (existing.result !== "pending") {
      // Error case: throw for ErrorBoundary
      const { error } = existing.result;
      suspenseCache.delete(cacheKey);
      throw error;
    }
    // Still pending or success-but-not-yet-propagated: re-throw the same promise
    throw existing.promise;
  }

  // Create a new suspense entry with a fetch promise
  const mutableEntry: { result: SuspenseEntry["result"] } = { result: "pending" };

  const fetchPromise = new Promise<void>(resolve => {
    void client.fetchQuery(port, params).then(result => {
      if (result.isOk()) {
        mutableEntry.result = "success";
        suspenseCache.delete(cacheKey);
      } else {
        mutableEntry.result = { error: result.error };
      }
      resolve();
    });
  });

  const entry: SuspenseEntry = {
    promise: fetchPromise,
    get result() {
      return mutableEntry.result;
    },
    set result(v) {
      mutableEntry.result = v;
    },
  };

  suspenseCache.set(cacheKey, entry);
  throw fetchPromise;
}
