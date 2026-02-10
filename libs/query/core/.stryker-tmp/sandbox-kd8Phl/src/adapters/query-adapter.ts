/**
 * Query Adapter Factory
 *
 * createQueryAdapter binds a fetcher function to a query port, producing
 * a QueryAdapter that the QueryClient uses for data retrieval.
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
import type { QueryPort, AnyQueryPort } from "../ports/query-port.js";
import type { FetchContext, QueryFetcher } from "../ports/types.js";
import type { QueryDefaults } from "../types/options.js";

// =============================================================================
// Brand Symbol
// =============================================================================

export const QUERY_ADAPTER_SYMBOL = Symbol.for(
  stryMutAct_9fa48("22") ? "" : (stryCov_9fa48("22"), "@hex-di/query/QueryAdapter")
);

// =============================================================================
// QueryAdapter Type
// =============================================================================

export interface QueryAdapter<
  TName extends string = string,
  TData = unknown,
  TParams = unknown,
  TError = Error,
  TDependsOn extends ReadonlyArray<AnyQueryPort> = [],
> {
  readonly [QUERY_ADAPTER_SYMBOL]: true;
  readonly port: QueryPort<TName, TData, TParams, TError, TDependsOn>;
  readonly fetcher: QueryFetcher<TData, TParams, TError>;
  readonly defaults: Partial<QueryDefaults>;
}

// =============================================================================
// QueryAdapterConfig
// =============================================================================

export interface QueryAdapterConfig<TData, TParams, TError> {
  readonly fetcher: (params: TParams, context: FetchContext) => ResultAsync<TData, TError>;
  readonly defaults?: Partial<QueryDefaults>;
}

// =============================================================================
// createQueryAdapter Factory
// =============================================================================

/**
 * BRAND_CAST: Single documented coercion point for QueryAdapter branded types.
 */
function brandAsQueryAdapter<
  TName extends string,
  TData,
  TParams,
  TError,
  TDependsOn extends ReadonlyArray<AnyQueryPort>,
>(obj: {
  readonly [QUERY_ADAPTER_SYMBOL]: true;
  readonly port: QueryPort<TName, TData, TParams, TError, TDependsOn>;
  readonly fetcher: QueryFetcher<TData, TParams, TError>;
  readonly defaults: Partial<QueryDefaults>;
}): QueryAdapter<TName, TData, TParams, TError, TDependsOn> {
  if (stryMutAct_9fa48("23")) {
    {
    }
  } else {
    stryCov_9fa48("23");
    return obj as QueryAdapter<TName, TData, TParams, TError, TDependsOn>;
  }
}

/**
 * Creates a query adapter binding a fetcher to a query port.
 *
 * Curried generics:
 * - Stage 1: Receives the query port (type parameters inferred).
 * - Stage 2: Receives the fetcher config.
 */
export function createQueryAdapter<
  TName extends string,
  TData,
  TParams,
  TError,
  TDependsOn extends ReadonlyArray<AnyQueryPort>,
>(
  port: QueryPort<TName, TData, TParams, TError, TDependsOn>
): (
  config: QueryAdapterConfig<TData, TParams, TError>
) => QueryAdapter<TName, TData, TParams, TError, TDependsOn> {
  if (stryMutAct_9fa48("24")) {
    {
    }
  } else {
    stryCov_9fa48("24");
    return config => {
      if (stryMutAct_9fa48("25")) {
        {
        }
      } else {
        stryCov_9fa48("25");
        // BRAND_CAST: Branded type boundary for QueryAdapter
        return brandAsQueryAdapter<TName, TData, TParams, TError, TDependsOn>(
          Object.freeze(
            stryMutAct_9fa48("26")
              ? {}
              : (stryCov_9fa48("26"),
                {
                  [QUERY_ADAPTER_SYMBOL]: true as const,
                  port,
                  fetcher: config.fetcher,
                  defaults: stryMutAct_9fa48("27")
                    ? config.defaults && {}
                    : (stryCov_9fa48("27"), config.defaults ?? {}),
                })
          )
        );
      }
    };
  }
}

// =============================================================================
// Type Guard
// =============================================================================

export function isQueryAdapter(value: unknown): value is QueryAdapter {
  if (stryMutAct_9fa48("28")) {
    {
    }
  } else {
    stryCov_9fa48("28");
    return stryMutAct_9fa48("31")
      ? (typeof value === "object" && value !== null && QUERY_ADAPTER_SYMBOL in value) ||
          value[QUERY_ADAPTER_SYMBOL] === true
      : stryMutAct_9fa48("30")
        ? false
        : stryMutAct_9fa48("29")
          ? true
          : (stryCov_9fa48("29", "30", "31"),
            (stryMutAct_9fa48("33")
              ? (typeof value === "object" && value !== null) || QUERY_ADAPTER_SYMBOL in value
              : stryMutAct_9fa48("32")
                ? true
                : (stryCov_9fa48("32", "33"),
                  (stryMutAct_9fa48("35")
                    ? typeof value === "object" || value !== null
                    : stryMutAct_9fa48("34")
                      ? true
                      : (stryCov_9fa48("34", "35"),
                        (stryMutAct_9fa48("37")
                          ? typeof value !== "object"
                          : stryMutAct_9fa48("36")
                            ? true
                            : (stryCov_9fa48("36", "37"),
                              typeof value ===
                                (stryMutAct_9fa48("38") ? "" : (stryCov_9fa48("38"), "object")))) &&
                          (stryMutAct_9fa48("40")
                            ? value === null
                            : stryMutAct_9fa48("39")
                              ? true
                              : (stryCov_9fa48("39", "40"), value !== null)))) &&
                    QUERY_ADAPTER_SYMBOL in value)) &&
              (stryMutAct_9fa48("42")
                ? value[QUERY_ADAPTER_SYMBOL] !== true
                : stryMutAct_9fa48("41")
                  ? true
                  : (stryCov_9fa48("41", "42"),
                    value[QUERY_ADAPTER_SYMBOL] ===
                      (stryMutAct_9fa48("43") ? false : (stryCov_9fa48("43"), true)))));
  }
}
