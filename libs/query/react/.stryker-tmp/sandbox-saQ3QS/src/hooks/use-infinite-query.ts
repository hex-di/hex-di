/**
 * useInfiniteQuery Hook
 *
 * Provides pagination support via page-based fetching. Manages an
 * InfiniteData structure in the query cache and exposes helpers
 * for fetching next/previous pages.
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
  if (stryMutAct_9fa48("0")) {
    {
    }
  } else {
    stryCov_9fa48("0");
    if (
      stryMutAct_9fa48("3")
        ? typeof params === "object" || params !== null
        : stryMutAct_9fa48("2")
          ? false
          : stryMutAct_9fa48("1")
            ? true
            : (stryCov_9fa48("1", "2", "3"),
              (stryMutAct_9fa48("5")
                ? typeof params !== "object"
                : stryMutAct_9fa48("4")
                  ? true
                  : (stryCov_9fa48("4", "5"),
                    typeof params ===
                      (stryMutAct_9fa48("6") ? "" : (stryCov_9fa48("6"), "object")))) &&
                (stryMutAct_9fa48("8")
                  ? params === null
                  : stryMutAct_9fa48("7")
                    ? true
                    : (stryCov_9fa48("7", "8"), params !== null)))
    ) {
      if (stryMutAct_9fa48("9")) {
        {
        }
      } else {
        stryCov_9fa48("9");
        return stryMutAct_9fa48("10")
          ? {}
          : (stryCov_9fa48("10"),
            {
              ...params,
              __pageParam: pageParam,
            });
      }
    }
    return stryMutAct_9fa48("11")
      ? {}
      : (stryCov_9fa48("11"),
        {
          __pageParam: pageParam,
        });
  }
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
  if (stryMutAct_9fa48("12")) {
    {
    }
  } else {
    stryCov_9fa48("12");
    const client = useQueryClient();
    const infiniteDataRef = useRef<InfiniteData<TData>>(
      stryMutAct_9fa48("13")
        ? {}
        : (stryCov_9fa48("13"),
          {
            pages: stryMutAct_9fa48("14") ? ["Stryker was here"] : (stryCov_9fa48("14"), []),
            pageParams: stryMutAct_9fa48("15") ? ["Stryker was here"] : (stryCov_9fa48("15"), []),
          })
    );
    const [state, setState] = useState<{
      status: QueryStatus;
      error: (TError | QueryResolutionError) | null;
      isFetching: boolean;
      isFetchingNextPage: boolean;
      isFetchingPreviousPage: boolean;
    }>(
      stryMutAct_9fa48("16")
        ? {}
        : (stryCov_9fa48("16"),
          {
            status: stryMutAct_9fa48("17") ? "" : (stryCov_9fa48("17"), "pending"),
            error: null,
            isFetching: stryMutAct_9fa48("18") ? true : (stryCov_9fa48("18"), false),
            isFetchingNextPage: stryMutAct_9fa48("19") ? true : (stryCov_9fa48("19"), false),
            isFetchingPreviousPage: stryMutAct_9fa48("20") ? true : (stryCov_9fa48("20"), false),
          })
    );

    // Track mounted state to avoid state updates after unmount
    const mountedRef = useRef(stryMutAct_9fa48("21") ? false : (stryCov_9fa48("21"), true));
    useEffect(
      () => {
        if (stryMutAct_9fa48("22")) {
          {
          }
        } else {
          stryCov_9fa48("22");
          mountedRef.current = stryMutAct_9fa48("23") ? false : (stryCov_9fa48("23"), true);
          return () => {
            if (stryMutAct_9fa48("24")) {
              {
              }
            } else {
              stryCov_9fa48("24");
              mountedRef.current = stryMutAct_9fa48("25") ? true : (stryCov_9fa48("25"), false);
            }
          };
        }
      },
      stryMutAct_9fa48("26") ? ["Stryker was here"] : (stryCov_9fa48("26"), [])
    );
    const fetchPage = useCallback(
      (
        pageParam: unknown,
        direction: "next" | "previous"
      ): ResultAsync<void, TError | QueryResolutionError> => {
        if (stryMutAct_9fa48("27")) {
          {
          }
        } else {
          stryCov_9fa48("27");
          if (
            stryMutAct_9fa48("30")
              ? false
              : stryMutAct_9fa48("29")
                ? true
                : stryMutAct_9fa48("28")
                  ? mountedRef.current
                  : (stryCov_9fa48("28", "29", "30"), !mountedRef.current)
          )
            return ResultAsync.ok(undefined);
          setState(
            stryMutAct_9fa48("31")
              ? () => undefined
              : (stryCov_9fa48("31"),
                prev =>
                  stryMutAct_9fa48("32")
                    ? {}
                    : (stryCov_9fa48("32"),
                      {
                        ...prev,
                        isFetching: stryMutAct_9fa48("33") ? false : (stryCov_9fa48("33"), true),
                        isFetchingNextPage: (
                          stryMutAct_9fa48("36")
                            ? direction !== "next"
                            : stryMutAct_9fa48("35")
                              ? false
                              : stryMutAct_9fa48("34")
                                ? true
                                : (stryCov_9fa48("34", "35", "36"),
                                  direction ===
                                    (stryMutAct_9fa48("37") ? "" : (stryCov_9fa48("37"), "next")))
                        )
                          ? stryMutAct_9fa48("38")
                            ? false
                            : (stryCov_9fa48("38"), true)
                          : prev.isFetchingNextPage,
                        isFetchingPreviousPage: (
                          stryMutAct_9fa48("41")
                            ? direction !== "previous"
                            : stryMutAct_9fa48("40")
                              ? false
                              : stryMutAct_9fa48("39")
                                ? true
                                : (stryCov_9fa48("39", "40", "41"),
                                  direction ===
                                    (stryMutAct_9fa48("42")
                                      ? ""
                                      : (stryCov_9fa48("42"), "previous")))
                        )
                          ? stryMutAct_9fa48("43")
                            ? false
                            : (stryCov_9fa48("43"), true)
                          : prev.isFetchingPreviousPage,
                      }))
          );
          const fetchParams = mergePageParam<TParams>(params, pageParam);
          return client
            .fetchQuery(port, fetchParams)
            .andTee(pageData => {
              if (stryMutAct_9fa48("44")) {
                {
                }
              } else {
                stryCov_9fa48("44");
                if (
                  stryMutAct_9fa48("47")
                    ? false
                    : stryMutAct_9fa48("46")
                      ? true
                      : stryMutAct_9fa48("45")
                        ? mountedRef.current
                        : (stryCov_9fa48("45", "46", "47"), !mountedRef.current)
                )
                  return;
                const current = infiniteDataRef.current;
                let newPages: readonly TData[];
                let newPageParams: readonly unknown[];
                if (
                  stryMutAct_9fa48("50")
                    ? direction !== "next"
                    : stryMutAct_9fa48("49")
                      ? false
                      : stryMutAct_9fa48("48")
                        ? true
                        : (stryCov_9fa48("48", "49", "50"),
                          direction ===
                            (stryMutAct_9fa48("51") ? "" : (stryCov_9fa48("51"), "next")))
                ) {
                  if (stryMutAct_9fa48("52")) {
                    {
                    }
                  } else {
                    stryCov_9fa48("52");
                    newPages = stryMutAct_9fa48("53")
                      ? []
                      : (stryCov_9fa48("53"), [...current.pages, pageData]);
                    newPageParams = stryMutAct_9fa48("54")
                      ? []
                      : (stryCov_9fa48("54"), [...current.pageParams, pageParam]);
                  }
                } else {
                  if (stryMutAct_9fa48("55")) {
                    {
                    }
                  } else {
                    stryCov_9fa48("55");
                    newPages = stryMutAct_9fa48("56")
                      ? []
                      : (stryCov_9fa48("56"), [pageData, ...current.pages]);
                    newPageParams = stryMutAct_9fa48("57")
                      ? []
                      : (stryCov_9fa48("57"), [pageParam, ...current.pageParams]);
                  }
                }

                // Enforce maxPages limit
                if (
                  stryMutAct_9fa48("60")
                    ? options.maxPages !== undefined || newPages.length > options.maxPages
                    : stryMutAct_9fa48("59")
                      ? false
                      : stryMutAct_9fa48("58")
                        ? true
                        : (stryCov_9fa48("58", "59", "60"),
                          (stryMutAct_9fa48("62")
                            ? options.maxPages === undefined
                            : stryMutAct_9fa48("61")
                              ? true
                              : (stryCov_9fa48("61", "62"), options.maxPages !== undefined)) &&
                            (stryMutAct_9fa48("65")
                              ? newPages.length <= options.maxPages
                              : stryMutAct_9fa48("64")
                                ? newPages.length >= options.maxPages
                                : stryMutAct_9fa48("63")
                                  ? true
                                  : (stryCov_9fa48("63", "64", "65"),
                                    newPages.length > options.maxPages)))
                ) {
                  if (stryMutAct_9fa48("66")) {
                    {
                    }
                  } else {
                    stryCov_9fa48("66");
                    if (
                      stryMutAct_9fa48("69")
                        ? direction !== "next"
                        : stryMutAct_9fa48("68")
                          ? false
                          : stryMutAct_9fa48("67")
                            ? true
                            : (stryCov_9fa48("67", "68", "69"),
                              direction ===
                                (stryMutAct_9fa48("70") ? "" : (stryCov_9fa48("70"), "next")))
                    ) {
                      if (stryMutAct_9fa48("71")) {
                        {
                        }
                      } else {
                        stryCov_9fa48("71");
                        newPages = stryMutAct_9fa48("72")
                          ? newPages
                          : (stryCov_9fa48("72"),
                            newPages.slice(
                              stryMutAct_9fa48("73")
                                ? newPages.length + options.maxPages
                                : (stryCov_9fa48("73"), newPages.length - options.maxPages)
                            ));
                        newPageParams = stryMutAct_9fa48("74")
                          ? newPageParams
                          : (stryCov_9fa48("74"),
                            newPageParams.slice(
                              stryMutAct_9fa48("75")
                                ? newPageParams.length + options.maxPages
                                : (stryCov_9fa48("75"), newPageParams.length - options.maxPages)
                            ));
                      }
                    } else {
                      if (stryMutAct_9fa48("76")) {
                        {
                        }
                      } else {
                        stryCov_9fa48("76");
                        newPages = stryMutAct_9fa48("77")
                          ? newPages
                          : (stryCov_9fa48("77"), newPages.slice(0, options.maxPages));
                        newPageParams = stryMutAct_9fa48("78")
                          ? newPageParams
                          : (stryCov_9fa48("78"), newPageParams.slice(0, options.maxPages));
                      }
                    }
                  }
                }
                infiniteDataRef.current = stryMutAct_9fa48("79")
                  ? {}
                  : (stryCov_9fa48("79"),
                    {
                      pages: newPages,
                      pageParams: newPageParams,
                    });
                setState(
                  stryMutAct_9fa48("80")
                    ? {}
                    : (stryCov_9fa48("80"),
                      {
                        status: stryMutAct_9fa48("81") ? "" : (stryCov_9fa48("81"), "success"),
                        error: null,
                        isFetching: stryMutAct_9fa48("82") ? true : (stryCov_9fa48("82"), false),
                        isFetchingNextPage: stryMutAct_9fa48("83")
                          ? true
                          : (stryCov_9fa48("83"), false),
                        isFetchingPreviousPage: stryMutAct_9fa48("84")
                          ? true
                          : (stryCov_9fa48("84"), false),
                      })
                );
              }
            })
            .orTee(error => {
              if (stryMutAct_9fa48("85")) {
                {
                }
              } else {
                stryCov_9fa48("85");
                if (
                  stryMutAct_9fa48("88")
                    ? false
                    : stryMutAct_9fa48("87")
                      ? true
                      : stryMutAct_9fa48("86")
                        ? mountedRef.current
                        : (stryCov_9fa48("86", "87", "88"), !mountedRef.current)
                )
                  return;
                setState(
                  stryMutAct_9fa48("89")
                    ? {}
                    : (stryCov_9fa48("89"),
                      {
                        status: stryMutAct_9fa48("90") ? "" : (stryCov_9fa48("90"), "error"),
                        error,
                        isFetching: stryMutAct_9fa48("91") ? true : (stryCov_9fa48("91"), false),
                        isFetchingNextPage: stryMutAct_9fa48("92")
                          ? true
                          : (stryCov_9fa48("92"), false),
                        isFetchingPreviousPage: stryMutAct_9fa48("93")
                          ? true
                          : (stryCov_9fa48("93"), false),
                      })
                );
              }
            })
            .map(() => undefined);
        }
      },
      stryMutAct_9fa48("94") ? [] : (stryCov_9fa48("94"), [client, port, params, options.maxPages])
    );

    // Initial fetch
    const initialFetchedRef = useRef(stryMutAct_9fa48("95") ? true : (stryCov_9fa48("95"), false));
    useEffect(
      () => {
        if (stryMutAct_9fa48("96")) {
          {
          }
        } else {
          stryCov_9fa48("96");
          const enabled = stryMutAct_9fa48("97")
            ? options.enabled && true
            : (stryCov_9fa48("97"),
              options.enabled ?? (stryMutAct_9fa48("98") ? false : (stryCov_9fa48("98"), true)));
          if (
            stryMutAct_9fa48("101")
              ? !enabled && initialFetchedRef.current
              : stryMutAct_9fa48("100")
                ? false
                : stryMutAct_9fa48("99")
                  ? true
                  : (stryCov_9fa48("99", "100", "101"),
                    (stryMutAct_9fa48("102") ? enabled : (stryCov_9fa48("102"), !enabled)) ||
                      initialFetchedRef.current)
          )
            return;
          initialFetchedRef.current = stryMutAct_9fa48("103")
            ? false
            : (stryCov_9fa48("103"), true);
          setState(
            stryMutAct_9fa48("104")
              ? () => undefined
              : (stryCov_9fa48("104"),
                prev =>
                  stryMutAct_9fa48("105")
                    ? {}
                    : (stryCov_9fa48("105"),
                      {
                        ...prev,
                        isFetching: stryMutAct_9fa48("106") ? false : (stryCov_9fa48("106"), true),
                      }))
          );
          void fetchPage(
            options.initialPageParam,
            stryMutAct_9fa48("107") ? "" : (stryCov_9fa48("107"), "next")
          );
        }
      },
      stryMutAct_9fa48("108")
        ? []
        : (stryCov_9fa48("108"), [options.enabled, options.initialPageParam, fetchPage])
    );
    const infiniteData = infiniteDataRef.current;
    const hasNextPage = (
      stryMutAct_9fa48("112")
        ? infiniteData.pages.length <= 0
        : stryMutAct_9fa48("111")
          ? infiniteData.pages.length >= 0
          : stryMutAct_9fa48("110")
            ? false
            : stryMutAct_9fa48("109")
              ? true
              : (stryCov_9fa48("109", "110", "111", "112"), infiniteData.pages.length > 0)
    )
      ? stryMutAct_9fa48("115")
        ? options.getNextPageParam(
            infiniteData.pages[infiniteData.pages.length - 1],
            infiniteData.pages
          ) === undefined
        : stryMutAct_9fa48("114")
          ? false
          : stryMutAct_9fa48("113")
            ? true
            : (stryCov_9fa48("113", "114", "115"),
              options.getNextPageParam(
                infiniteData.pages[
                  stryMutAct_9fa48("116")
                    ? infiniteData.pages.length + 1
                    : (stryCov_9fa48("116"), infiniteData.pages.length - 1)
                ],
                infiniteData.pages
              ) !== undefined)
      : stryMutAct_9fa48("117")
        ? true
        : (stryCov_9fa48("117"), false);
    const hasPreviousPage = (
      stryMutAct_9fa48("120")
        ? infiniteData.pages.length > 0 || options.getPreviousPageParam !== undefined
        : stryMutAct_9fa48("119")
          ? false
          : stryMutAct_9fa48("118")
            ? true
            : (stryCov_9fa48("118", "119", "120"),
              (stryMutAct_9fa48("123")
                ? infiniteData.pages.length <= 0
                : stryMutAct_9fa48("122")
                  ? infiniteData.pages.length >= 0
                  : stryMutAct_9fa48("121")
                    ? true
                    : (stryCov_9fa48("121", "122", "123"), infiniteData.pages.length > 0)) &&
                (stryMutAct_9fa48("125")
                  ? options.getPreviousPageParam === undefined
                  : stryMutAct_9fa48("124")
                    ? true
                    : (stryCov_9fa48("124", "125"), options.getPreviousPageParam !== undefined)))
    )
      ? stryMutAct_9fa48("128")
        ? options.getPreviousPageParam(infiniteData.pages[0], infiniteData.pages) === undefined
        : stryMutAct_9fa48("127")
          ? false
          : stryMutAct_9fa48("126")
            ? true
            : (stryCov_9fa48("126", "127", "128"),
              options.getPreviousPageParam(infiniteData.pages[0], infiniteData.pages) !== undefined)
      : stryMutAct_9fa48("129")
        ? true
        : (stryCov_9fa48("129"), false);
    const fetchNextPage = useCallback(
      (): ResultAsync<void, TError | QueryResolutionError> => {
        if (stryMutAct_9fa48("130")) {
          {
          }
        } else {
          stryCov_9fa48("130");
          if (
            stryMutAct_9fa48("133")
              ? infiniteDataRef.current.pages.length !== 0
              : stryMutAct_9fa48("132")
                ? false
                : stryMutAct_9fa48("131")
                  ? true
                  : (stryCov_9fa48("131", "132", "133"), infiniteDataRef.current.pages.length === 0)
          )
            return ResultAsync.ok(undefined);
          const current = infiniteDataRef.current;
          const nextPageParam = options.getNextPageParam(
            current.pages[
              stryMutAct_9fa48("134")
                ? current.pages.length + 1
                : (stryCov_9fa48("134"), current.pages.length - 1)
            ],
            current.pages
          );
          if (
            stryMutAct_9fa48("137")
              ? nextPageParam !== undefined
              : stryMutAct_9fa48("136")
                ? false
                : stryMutAct_9fa48("135")
                  ? true
                  : (stryCov_9fa48("135", "136", "137"), nextPageParam === undefined)
          )
            return ResultAsync.ok(undefined);
          return fetchPage(
            nextPageParam,
            stryMutAct_9fa48("138") ? "" : (stryCov_9fa48("138"), "next")
          );
        }
      },
      stryMutAct_9fa48("139") ? [] : (stryCov_9fa48("139"), [fetchPage, options])
    );
    const fetchPreviousPage = useCallback(
      (): ResultAsync<void, TError | QueryResolutionError> => {
        if (stryMutAct_9fa48("140")) {
          {
          }
        } else {
          stryCov_9fa48("140");
          if (
            stryMutAct_9fa48("143")
              ? infiniteDataRef.current.pages.length === 0 && !options.getPreviousPageParam
              : stryMutAct_9fa48("142")
                ? false
                : stryMutAct_9fa48("141")
                  ? true
                  : (stryCov_9fa48("141", "142", "143"),
                    (stryMutAct_9fa48("145")
                      ? infiniteDataRef.current.pages.length !== 0
                      : stryMutAct_9fa48("144")
                        ? false
                        : (stryCov_9fa48("144", "145"),
                          infiniteDataRef.current.pages.length === 0)) ||
                      (stryMutAct_9fa48("146")
                        ? options.getPreviousPageParam
                        : (stryCov_9fa48("146"), !options.getPreviousPageParam)))
          )
            return ResultAsync.ok(undefined);
          const current = infiniteDataRef.current;
          const prevPageParam = options.getPreviousPageParam(current.pages[0], current.pages);
          if (
            stryMutAct_9fa48("149")
              ? prevPageParam !== undefined
              : stryMutAct_9fa48("148")
                ? false
                : stryMutAct_9fa48("147")
                  ? true
                  : (stryCov_9fa48("147", "148", "149"), prevPageParam === undefined)
          )
            return ResultAsync.ok(undefined);
          return fetchPage(
            prevPageParam,
            stryMutAct_9fa48("150") ? "" : (stryCov_9fa48("150"), "previous")
          );
        }
      },
      stryMutAct_9fa48("151") ? [] : (stryCov_9fa48("151"), [fetchPage, options])
    );
    return stryMutAct_9fa48("152")
      ? {}
      : (stryCov_9fa48("152"),
        {
          status: state.status,
          data: (
            stryMutAct_9fa48("156")
              ? infiniteData.pages.length <= 0
              : stryMutAct_9fa48("155")
                ? infiniteData.pages.length >= 0
                : stryMutAct_9fa48("154")
                  ? false
                  : stryMutAct_9fa48("153")
                    ? true
                    : (stryCov_9fa48("153", "154", "155", "156"), infiniteData.pages.length > 0)
          )
            ? infiniteData
            : undefined,
          error: state.error,
          isPending: stryMutAct_9fa48("159")
            ? state.status !== "pending"
            : stryMutAct_9fa48("158")
              ? false
              : stryMutAct_9fa48("157")
                ? true
                : (stryCov_9fa48("157", "158", "159"),
                  state.status ===
                    (stryMutAct_9fa48("160") ? "" : (stryCov_9fa48("160"), "pending"))),
          isSuccess: stryMutAct_9fa48("163")
            ? state.status !== "success"
            : stryMutAct_9fa48("162")
              ? false
              : stryMutAct_9fa48("161")
                ? true
                : (stryCov_9fa48("161", "162", "163"),
                  state.status ===
                    (stryMutAct_9fa48("164") ? "" : (stryCov_9fa48("164"), "success"))),
          isError: stryMutAct_9fa48("167")
            ? state.status !== "error"
            : stryMutAct_9fa48("166")
              ? false
              : stryMutAct_9fa48("165")
                ? true
                : (stryCov_9fa48("165", "166", "167"),
                  state.status ===
                    (stryMutAct_9fa48("168") ? "" : (stryCov_9fa48("168"), "error"))),
          isFetching: state.isFetching,
          hasNextPage,
          hasPreviousPage,
          isFetchingNextPage: state.isFetchingNextPage,
          isFetchingPreviousPage: state.isFetchingPreviousPage,
          fetchNextPage,
          fetchPreviousPage,
        });
  }
}
