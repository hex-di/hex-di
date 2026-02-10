/**
 * Query Assertion Helpers
 *
 * Fluent assertion helpers for QueryState, cache entries, and query results.
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
import { expect } from "vitest";
import type { Result } from "@hex-di/result";
import type { QueryState } from "@hex-di/query";

// =============================================================================
// expectQueryState
// =============================================================================

/**
 * Fluent assertions for QueryState.
 *
 * @example
 * ```typescript
 * const state = observer.getCurrentState();
 * expectQueryState(state).toBeSuccess([{ id: "1", name: "Alice" }]);
 * ```
 */
export function expectQueryState<TData, TError>(
  state: QueryState<TData, TError>
): QueryStateAssertions<TData, TError> {
  if (stryMutAct_9fa48("0")) {
    {
    }
  } else {
    stryCov_9fa48("0");
    return stryMutAct_9fa48("1")
      ? {}
      : (stryCov_9fa48("1"),
        {
          toBeLoading() {
            if (stryMutAct_9fa48("2")) {
              {
              }
            } else {
              stryCov_9fa48("2");
              expect(state.isFetching).toBe(
                stryMutAct_9fa48("3") ? false : (stryCov_9fa48("3"), true)
              );
              expect(state.status).toBe(
                stryMutAct_9fa48("4") ? "" : (stryCov_9fa48("4"), "pending")
              );
            }
          },
          toBeSuccess(data?: TData) {
            if (stryMutAct_9fa48("5")) {
              {
              }
            } else {
              stryCov_9fa48("5");
              expect(state.status).toBe(
                stryMutAct_9fa48("6") ? "" : (stryCov_9fa48("6"), "success")
              );
              expect(state.isSuccess).toBe(
                stryMutAct_9fa48("7") ? false : (stryCov_9fa48("7"), true)
              );
              if (
                stryMutAct_9fa48("10")
                  ? data === undefined
                  : stryMutAct_9fa48("9")
                    ? false
                    : stryMutAct_9fa48("8")
                      ? true
                      : (stryCov_9fa48("8", "9", "10"), data !== undefined)
              ) {
                if (stryMutAct_9fa48("11")) {
                  {
                  }
                } else {
                  stryCov_9fa48("11");
                  expect(state.data).toEqual(data);
                }
              }
            }
          },
          toBeError(error?: TError) {
            if (stryMutAct_9fa48("12")) {
              {
              }
            } else {
              stryCov_9fa48("12");
              expect(state.status).toBe(
                stryMutAct_9fa48("13") ? "" : (stryCov_9fa48("13"), "error")
              );
              expect(state.isError).toBe(
                stryMutAct_9fa48("14") ? false : (stryCov_9fa48("14"), true)
              );
              if (
                stryMutAct_9fa48("17")
                  ? error === undefined
                  : stryMutAct_9fa48("16")
                    ? false
                    : stryMutAct_9fa48("15")
                      ? true
                      : (stryCov_9fa48("15", "16", "17"), error !== undefined)
              ) {
                if (stryMutAct_9fa48("18")) {
                  {
                  }
                } else {
                  stryCov_9fa48("18");
                  expect(state.error).toEqual(error);
                }
              }
            }
          },
          toBeRefetching() {
            if (stryMutAct_9fa48("19")) {
              {
              }
            } else {
              stryCov_9fa48("19");
              expect(state.isRefetching).toBe(
                stryMutAct_9fa48("20") ? false : (stryCov_9fa48("20"), true)
              );
              expect(state.isFetching).toBe(
                stryMutAct_9fa48("21") ? false : (stryCov_9fa48("21"), true)
              );
            }
          },
          toBeFresh() {
            if (stryMutAct_9fa48("22")) {
              {
              }
            } else {
              stryCov_9fa48("22");
              expect(state.isStale).toBe(
                stryMutAct_9fa48("23") ? true : (stryCov_9fa48("23"), false)
              );
            }
          },
          toBeStale() {
            if (stryMutAct_9fa48("24")) {
              {
              }
            } else {
              stryCov_9fa48("24");
              expect(state.isStale).toBe(
                stryMutAct_9fa48("25") ? false : (stryCov_9fa48("25"), true)
              );
            }
          },
        });
  }
}
export interface QueryStateAssertions<TData, TError> {
  /** Assert state is loading (pending + fetching) */
  toBeLoading(): void;
  /** Assert state is success, optionally checking data */
  toBeSuccess(data?: TData): void;
  /** Assert state is error, optionally checking error value */
  toBeError(error?: TError): void;
  /** Assert state is refetching */
  toBeRefetching(): void;
  /** Assert data is fresh (not stale) */
  toBeFresh(): void;
  /** Assert data is stale */
  toBeStale(): void;
}

// =============================================================================
// expectQueryResult
// =============================================================================

/**
 * Fluent assertions for query Results.
 *
 * @example
 * ```typescript
 * const result = await queryClient.fetch(UsersPort, {});
 * expectQueryResult(result).toBeOk([{ id: "1", name: "Alice" }]);
 * ```
 */
export function expectQueryResult<TData, TError>(
  result: Result<TData, TError> | undefined
): QueryResultAssertions<TData, TError> {
  if (stryMutAct_9fa48("26")) {
    {
    }
  } else {
    stryCov_9fa48("26");
    return stryMutAct_9fa48("27")
      ? {}
      : (stryCov_9fa48("27"),
        {
          toBeOk(data?: TData) {
            if (stryMutAct_9fa48("28")) {
              {
              }
            } else {
              stryCov_9fa48("28");
              expect(result).toBeDefined();
              if (
                stryMutAct_9fa48("31")
                  ? result !== undefined
                  : stryMutAct_9fa48("30")
                    ? false
                    : stryMutAct_9fa48("29")
                      ? true
                      : (stryCov_9fa48("29", "30", "31"), result === undefined)
              )
                return;
              expect(result._tag).toBe(stryMutAct_9fa48("32") ? "" : (stryCov_9fa48("32"), "Ok"));
              if (
                stryMutAct_9fa48("35")
                  ? data !== undefined || result._tag === "Ok"
                  : stryMutAct_9fa48("34")
                    ? false
                    : stryMutAct_9fa48("33")
                      ? true
                      : (stryCov_9fa48("33", "34", "35"),
                        (stryMutAct_9fa48("37")
                          ? data === undefined
                          : stryMutAct_9fa48("36")
                            ? true
                            : (stryCov_9fa48("36", "37"), data !== undefined)) &&
                          (stryMutAct_9fa48("39")
                            ? result._tag !== "Ok"
                            : stryMutAct_9fa48("38")
                              ? true
                              : (stryCov_9fa48("38", "39"),
                                result._tag ===
                                  (stryMutAct_9fa48("40") ? "" : (stryCov_9fa48("40"), "Ok")))))
              ) {
                if (stryMutAct_9fa48("41")) {
                  {
                  }
                } else {
                  stryCov_9fa48("41");
                  expect(result.value).toEqual(data);
                }
              }
            }
          },
          toBeErr(error?: TError) {
            if (stryMutAct_9fa48("42")) {
              {
              }
            } else {
              stryCov_9fa48("42");
              expect(result).toBeDefined();
              if (
                stryMutAct_9fa48("45")
                  ? result !== undefined
                  : stryMutAct_9fa48("44")
                    ? false
                    : stryMutAct_9fa48("43")
                      ? true
                      : (stryCov_9fa48("43", "44", "45"), result === undefined)
              )
                return;
              expect(result._tag).toBe(stryMutAct_9fa48("46") ? "" : (stryCov_9fa48("46"), "Err"));
              if (
                stryMutAct_9fa48("49")
                  ? error !== undefined || result._tag === "Err"
                  : stryMutAct_9fa48("48")
                    ? false
                    : stryMutAct_9fa48("47")
                      ? true
                      : (stryCov_9fa48("47", "48", "49"),
                        (stryMutAct_9fa48("51")
                          ? error === undefined
                          : stryMutAct_9fa48("50")
                            ? true
                            : (stryCov_9fa48("50", "51"), error !== undefined)) &&
                          (stryMutAct_9fa48("53")
                            ? result._tag !== "Err"
                            : stryMutAct_9fa48("52")
                              ? true
                              : (stryCov_9fa48("52", "53"),
                                result._tag ===
                                  (stryMutAct_9fa48("54") ? "" : (stryCov_9fa48("54"), "Err")))))
              ) {
                if (stryMutAct_9fa48("55")) {
                  {
                  }
                } else {
                  stryCov_9fa48("55");
                  expect(result.error).toEqual(error);
                }
              }
            }
          },
          toBeUndefined() {
            if (stryMutAct_9fa48("56")) {
              {
              }
            } else {
              stryCov_9fa48("56");
              expect(result).toBeUndefined();
            }
          },
        });
  }
}
export interface QueryResultAssertions<TData, TError> {
  /** Assert result is Ok, optionally checking value */
  toBeOk(data?: TData): void;
  /** Assert result is Err, optionally checking error */
  toBeErr(error?: TError): void;
  /** Assert result is undefined */
  toBeUndefined(): void;
}
