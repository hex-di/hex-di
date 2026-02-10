/**
 * useInfiniteQuery Hook
 *
 * Provides pagination support via page-based fetching. Manages an
 * InfiniteData structure in the query cache and exposes helpers
 * for fetching next/previous pages.
 *
 * @packageDocumentation
 */

import { useRef, useCallback, useEffect, useState } from "react";
import { ResultAsync } from "@hex-di/result";
import type { QueryPort, QueryResolutionError, QueryStatus } from "@hex-di/query";
import { useQueryClient } from "../context/query-client-context.js";

// =============================================================================
// InfiniteData
// =============================================================================

export interface InfiniteData<TData> {
  readonly pages: readonly TData[];
  readonly pageParams: readonly unknown[];
}

// =============================================================================
// UseInfiniteQueryOptions
// =============================================================================

export interface UseInfiniteQueryOptions<TData, _TParams, _TError> {
  readonly enabled?: boolean;
  readonly getNextPageParam: (lastPage: TData, allPages: readonly TData[]) => unknown | undefined;
  readonly getPreviousPageParam?: (
    firstPage: TData,
    allPages: readonly TData[]
  ) => unknown | undefined;
  readonly initialPageParam: unknown;
  readonly maxPages?: number;
}

// =============================================================================
// InfiniteQueryState
// =============================================================================

export interface InfiniteQueryState<TData, TError> {
  readonly status: QueryStatus;
  readonly data: InfiniteData<TData> | undefined;
  readonly error: (TError | QueryResolutionError) | null;
  readonly isPending: boolean;
  readonly isSuccess: boolean;
  readonly isError: boolean;
  readonly isFetching: boolean;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
  readonly isFetchingNextPage: boolean;
  readonly isFetchingPreviousPage: boolean;
  readonly fetchNextPage: () => ResultAsync<void, TError | QueryResolutionError>;
  readonly fetchPreviousPage: () => ResultAsync<void, TError | QueryResolutionError>;
}

// =============================================================================
// Type-safe page param merging (no casts)
// =============================================================================

/**
 * Merges a page parameter into the params object without casting.
 * The overload signature preserves TParams while the implementation
 * performs the structural merge at runtime.
 */
function mergePageParam<TParams>(params: TParams, pageParam: unknown): TParams;
function mergePageParam(params: unknown, pageParam: unknown): unknown {
  if (typeof params === "object" && params !== null) {
    return { ...params, __pageParam: pageParam };
  }
  return { __pageParam: pageParam };
}

// =============================================================================
// useInfiniteQuery Hook
// =============================================================================

/**
 * Subscribe to a paginated query with automatic page management.
 */
export function useInfiniteQuery<TData, TParams, TError, TName extends string>(
  port: QueryPort<TName, TData, TParams, TError>,
  params: TParams,
  options: UseInfiniteQueryOptions<TData, TParams, TError>
): InfiniteQueryState<TData, TError> {
  const client = useQueryClient();

  const infiniteDataRef = useRef<InfiniteData<TData>>({
    pages: [],
    pageParams: [],
  });

  const [state, setState] = useState<{
    status: QueryStatus;
    error: (TError | QueryResolutionError) | null;
    isFetching: boolean;
    isFetchingNextPage: boolean;
    isFetchingPreviousPage: boolean;
  }>({
    status: "pending",
    error: null,
    isFetching: false,
    isFetchingNextPage: false,
    isFetchingPreviousPage: false,
  });

  // Track mounted state to avoid state updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchPage = useCallback(
    (
      pageParam: unknown,
      direction: "next" | "previous"
    ): ResultAsync<void, TError | QueryResolutionError> => {
      if (!mountedRef.current) return ResultAsync.ok(undefined);

      setState(prev => ({
        ...prev,
        isFetching: true,
        isFetchingNextPage: direction === "next" ? true : prev.isFetchingNextPage,
        isFetchingPreviousPage: direction === "previous" ? true : prev.isFetchingPreviousPage,
      }));

      const fetchParams = mergePageParam<TParams>(params, pageParam);

      return client
        .fetchQuery(port, fetchParams)
        .andTee(pageData => {
          if (!mountedRef.current) return;

          const current = infiniteDataRef.current;

          let newPages: readonly TData[];
          let newPageParams: readonly unknown[];

          if (direction === "next") {
            newPages = [...current.pages, pageData];
            newPageParams = [...current.pageParams, pageParam];
          } else {
            newPages = [pageData, ...current.pages];
            newPageParams = [pageParam, ...current.pageParams];
          }

          // Enforce maxPages limit
          if (options.maxPages !== undefined && newPages.length > options.maxPages) {
            if (direction === "next") {
              newPages = newPages.slice(newPages.length - options.maxPages);
              newPageParams = newPageParams.slice(newPageParams.length - options.maxPages);
            } else {
              newPages = newPages.slice(0, options.maxPages);
              newPageParams = newPageParams.slice(0, options.maxPages);
            }
          }

          infiniteDataRef.current = { pages: newPages, pageParams: newPageParams };

          setState({
            status: "success",
            error: null,
            isFetching: false,
            isFetchingNextPage: false,
            isFetchingPreviousPage: false,
          });
        })
        .orTee(error => {
          if (!mountedRef.current) return;

          setState({
            status: "error",
            error,
            isFetching: false,
            isFetchingNextPage: false,
            isFetchingPreviousPage: false,
          });
        })
        .map(() => undefined);
    },
    [client, port, params, options.maxPages]
  );

  // Initial fetch
  const initialFetchedRef = useRef(false);
  useEffect(() => {
    const enabled = options.enabled ?? true;
    if (!enabled || initialFetchedRef.current) return;
    initialFetchedRef.current = true;

    setState(prev => ({ ...prev, isFetching: true }));
    void fetchPage(options.initialPageParam, "next");
  }, [options.enabled, options.initialPageParam, fetchPage]);

  const infiniteData = infiniteDataRef.current;

  const hasNextPage =
    infiniteData.pages.length > 0
      ? options.getNextPageParam(
          infiniteData.pages[infiniteData.pages.length - 1],
          infiniteData.pages
        ) !== undefined
      : false;

  const hasPreviousPage =
    infiniteData.pages.length > 0 && options.getPreviousPageParam !== undefined
      ? options.getPreviousPageParam(infiniteData.pages[0], infiniteData.pages) !== undefined
      : false;

  const fetchNextPage = useCallback((): ResultAsync<void, TError | QueryResolutionError> => {
    if (infiniteDataRef.current.pages.length === 0) return ResultAsync.ok(undefined);
    const current = infiniteDataRef.current;
    const nextPageParam = options.getNextPageParam(
      current.pages[current.pages.length - 1],
      current.pages
    );
    if (nextPageParam === undefined) return ResultAsync.ok(undefined);
    return fetchPage(nextPageParam, "next");
  }, [fetchPage, options]);

  const fetchPreviousPage = useCallback((): ResultAsync<void, TError | QueryResolutionError> => {
    if (infiniteDataRef.current.pages.length === 0 || !options.getPreviousPageParam)
      return ResultAsync.ok(undefined);
    const current = infiniteDataRef.current;
    const prevPageParam = options.getPreviousPageParam(current.pages[0], current.pages);
    if (prevPageParam === undefined) return ResultAsync.ok(undefined);
    return fetchPage(prevPageParam, "previous");
  }, [fetchPage, options]);

  return {
    status: state.status,
    data: infiniteData.pages.length > 0 ? infiniteData : undefined,
    error: state.error,
    isPending: state.status === "pending",
    isSuccess: state.status === "success",
    isError: state.status === "error",
    isFetching: state.isFetching,
    hasNextPage,
    hasPreviousPage,
    isFetchingNextPage: state.isFetchingNextPage,
    isFetchingPreviousPage: state.isFetchingPreviousPage,
    fetchNextPage,
    fetchPreviousPage,
  };
}
