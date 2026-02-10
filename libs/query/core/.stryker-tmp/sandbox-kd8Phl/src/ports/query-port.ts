/**
 * Query Port Factory
 *
 * createQueryPort creates query port definitions using the curried generics
 * pattern. Type parameters are explicit in the first call; configuration
 * is inferred in the second call.
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
import type { DirectedPort } from "@hex-di/core";
import type { QueryFetcher } from "./types.js";
import type { QueryDefaults } from "../types/options.js";

// =============================================================================
// Brand Symbols
// =============================================================================

/**
 * Runtime symbol for identifying query ports.
 * Uses Symbol.for() for cross-module stability.
 */
export const QUERY_PORT_SYMBOL = Symbol.for(
  stryMutAct_9fa48("1322") ? "" : (stryCov_9fa48("1322"), "@hex-di/query/QueryPort")
);

/**
 * Unique type-level symbol for phantom error type branding.
 */
declare const __queryErrorType: unique symbol;

// =============================================================================
// QueryPortConfig
// =============================================================================

export interface QueryPortConfig<
  _TData,
  _TParams,
  _TError,
  TName extends string,
  TDependsOn extends ReadonlyArray<AnyQueryPort> = [],
> {
  /** Unique name -- becomes the cache key prefix and port identifier */
  readonly name: TName;

  /** Structural data dependencies on other query ports */
  readonly dependsOn?: TDependsOn;

  /** Default query options (can be overridden per-use) */
  readonly defaults?: Partial<QueryDefaults>;
}

// =============================================================================
// QueryPort Type
// =============================================================================

export interface QueryPort<
  TName extends string = string,
  TData = unknown,
  TParams = void,
  TError = Error,
  TDependsOn extends ReadonlyArray<AnyQueryPort> = [],
> extends DirectedPort<QueryFetcher<TData, TParams, TError>, TName, "inbound"> {
  /** Phantom: compile-time error type */
  readonly [__queryErrorType]: TError;

  /** Runtime brand: identifies this as a QueryPort */
  readonly [QUERY_PORT_SYMBOL]: true;

  /** Query-specific configuration */
  readonly config: QueryPortConfig<TData, TParams, TError, TName, TDependsOn>;
}

/**
 * Convenience alias for query ports with erased type parameters.
 *
 * Uses `never` for TParams because TParams is in a contravariant position
 * (function parameter in QueryFetcher). For a QueryPort<..., TParams, ...>
 * to be assignable to AnyQueryPort, AnyQueryPort's TParams must be a subtype
 * of every possible TParams — which is `never`.
 */
export type AnyQueryPort = QueryPort<string, unknown, never, unknown>;

// =============================================================================
// createQueryPort Factory
// =============================================================================

/**
 * BRAND_CAST: Single documented coercion point for QueryPort branded types.
 * Object.freeze() loses phantom type info; this helper restores it.
 */
function brandAsQueryPort<
  TName extends string,
  TData,
  TParams,
  TError,
  TDependsOn extends ReadonlyArray<AnyQueryPort>,
>(obj: unknown): QueryPort<TName, TData, TParams, TError, TDependsOn> {
  if (stryMutAct_9fa48("1323")) {
    {
    }
  } else {
    stryCov_9fa48("1323");
    return obj as QueryPort<TName, TData, TParams, TError, TDependsOn>;
  }
}

/**
 * Creates a query port definition using curried generics.
 *
 * Stage 1: Explicit type parameters (data, params, error).
 * Stage 2: Inferred configuration (name, defaults, dependsOn).
 */
export function createQueryPort<TData, TParams = void, TError = Error>(): <
  TName extends string,
  TDependsOn extends ReadonlyArray<AnyQueryPort> = [],
>(
  config: QueryPortConfig<TData, TParams, TError, TName, TDependsOn>
) => QueryPort<TName, TData, TParams, TError, TDependsOn> {
  if (stryMutAct_9fa48("1324")) {
    {
    }
  } else {
    stryCov_9fa48("1324");
    return <TName extends string, TDependsOn extends ReadonlyArray<AnyQueryPort> = []>(
      config: QueryPortConfig<TData, TParams, TError, TName, TDependsOn>
    ): QueryPort<TName, TData, TParams, TError, TDependsOn> => {
      if (stryMutAct_9fa48("1325")) {
        {
        }
      } else {
        stryCov_9fa48("1325");
        // BRAND_CAST: Branded type boundary -- frozen object structurally matches
        // QueryPort but needs phantom type branding (error type, port symbol).
        return brandAsQueryPort<TName, TData, TParams, TError, TDependsOn>(
          Object.freeze(
            stryMutAct_9fa48("1326")
              ? {}
              : (stryCov_9fa48("1326"),
                {
                  __portName: config.name,
                  [QUERY_PORT_SYMBOL]: stryMutAct_9fa48("1327")
                    ? false
                    : (stryCov_9fa48("1327"), true),
                  config: Object.freeze(
                    stryMutAct_9fa48("1328")
                      ? {}
                      : (stryCov_9fa48("1328"),
                        {
                          ...config,
                          dependsOn: stryMutAct_9fa48("1329")
                            ? config.dependsOn && []
                            : (stryCov_9fa48("1329"),
                              config.dependsOn ??
                                (stryMutAct_9fa48("1330")
                                  ? ["Stryker was here"]
                                  : (stryCov_9fa48("1330"), []))),
                        })
                  ),
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

export function isQueryPort(value: unknown): value is QueryPort {
  if (stryMutAct_9fa48("1331")) {
    {
    }
  } else {
    stryCov_9fa48("1331");
    return stryMutAct_9fa48("1334")
      ? (typeof value === "object" && value !== null && QUERY_PORT_SYMBOL in value) ||
          value[QUERY_PORT_SYMBOL] === true
      : stryMutAct_9fa48("1333")
        ? false
        : stryMutAct_9fa48("1332")
          ? true
          : (stryCov_9fa48("1332", "1333", "1334"),
            (stryMutAct_9fa48("1336")
              ? (typeof value === "object" && value !== null) || QUERY_PORT_SYMBOL in value
              : stryMutAct_9fa48("1335")
                ? true
                : (stryCov_9fa48("1335", "1336"),
                  (stryMutAct_9fa48("1338")
                    ? typeof value === "object" || value !== null
                    : stryMutAct_9fa48("1337")
                      ? true
                      : (stryCov_9fa48("1337", "1338"),
                        (stryMutAct_9fa48("1340")
                          ? typeof value !== "object"
                          : stryMutAct_9fa48("1339")
                            ? true
                            : (stryCov_9fa48("1339", "1340"),
                              typeof value ===
                                (stryMutAct_9fa48("1341")
                                  ? ""
                                  : (stryCov_9fa48("1341"), "object")))) &&
                          (stryMutAct_9fa48("1343")
                            ? value === null
                            : stryMutAct_9fa48("1342")
                              ? true
                              : (stryCov_9fa48("1342", "1343"), value !== null)))) &&
                    QUERY_PORT_SYMBOL in value)) &&
              (stryMutAct_9fa48("1345")
                ? value[QUERY_PORT_SYMBOL] !== true
                : stryMutAct_9fa48("1344")
                  ? true
                  : (stryCov_9fa48("1344", "1345"),
                    value[QUERY_PORT_SYMBOL] ===
                      (stryMutAct_9fa48("1346") ? false : (stryCov_9fa48("1346"), true)))));
  }
}
