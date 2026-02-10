/**
 * Mutation Port Factory
 *
 * createMutationPort creates mutation port definitions using the curried
 * generics pattern matching createQueryPort.
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
import type { MutationExecutor, MutationEffects } from "./types.js";
import type { MutationDefaults } from "../types/options.js";

// =============================================================================
// Brand Symbols
// =============================================================================

/**
 * Runtime symbol for identifying mutation ports.
 */
export const MUTATION_PORT_SYMBOL = Symbol.for(
  stryMutAct_9fa48("1299") ? "" : (stryCov_9fa48("1299"), "@hex-di/query/MutationPort")
);

/**
 * Unique type-level symbols for phantom branding.
 */
declare const __mutationErrorType: unique symbol;
declare const __mutationContextType: unique symbol;

// =============================================================================
// MutationPortConfig
// =============================================================================

export interface MutationPortConfig<_TData, _TInput, _TError, _TContext, TName extends string> {
  /** Unique name -- identifier for the mutation */
  readonly name: TName;

  /** Cache side effects triggered on successful mutation */
  readonly effects?: MutationEffects;

  /** Default mutation options */
  readonly defaults?: Partial<MutationDefaults>;
}

// =============================================================================
// MutationPort Type
// =============================================================================

export interface MutationPort<
  TName extends string = string,
  TData = unknown,
  TInput = void,
  TError = Error,
  TContext = unknown,
> extends DirectedPort<MutationExecutor<TData, TInput, TError>, TName, "inbound"> {
  /** Phantom: compile-time error type */
  readonly [__mutationErrorType]: TError;

  /** Phantom: compile-time optimistic update context type */
  readonly [__mutationContextType]: TContext;

  /** Runtime brand: identifies this as a MutationPort */
  readonly [MUTATION_PORT_SYMBOL]: true;

  /** Mutation-specific configuration */
  readonly config: MutationPortConfig<TData, TInput, TError, TContext, TName>;
}

/** Convenience alias for mutation ports with erased type parameters */
export type AnyMutationPort = MutationPort<string, unknown, unknown, unknown, unknown>;

// =============================================================================
// createMutationPort Factory
// =============================================================================

/**
 * BRAND_CAST: Single documented coercion point for MutationPort branded types.
 * Object.freeze() loses phantom type info; this helper restores it.
 */
function brandAsMutationPort<TName extends string, TData, TInput, TError, TContext>(
  obj: unknown
): MutationPort<TName, TData, TInput, TError, TContext> {
  if (stryMutAct_9fa48("1300")) {
    {
    }
  } else {
    stryCov_9fa48("1300");
    return obj as MutationPort<TName, TData, TInput, TError, TContext>;
  }
}

/**
 * Creates a mutation port definition using curried generics.
 *
 * Stage 1: Explicit type parameters (data, input, error, context).
 * Stage 2: Inferred configuration (name, effects, defaults).
 */
export function createMutationPort<TData, TInput = void, TError = Error, TContext = unknown>(): <
  const TName extends string,
>(
  config: MutationPortConfig<TData, TInput, TError, TContext, TName>
) => MutationPort<TName, TData, TInput, TError, TContext> {
  if (stryMutAct_9fa48("1301")) {
    {
    }
  } else {
    stryCov_9fa48("1301");
    return <const TName extends string>(
      config: MutationPortConfig<TData, TInput, TError, TContext, TName>
    ): MutationPort<TName, TData, TInput, TError, TContext> => {
      if (stryMutAct_9fa48("1302")) {
        {
        }
      } else {
        stryCov_9fa48("1302");
        // BRAND_CAST: Branded type boundary -- frozen object structurally matches
        // MutationPort but needs phantom type branding.
        return brandAsMutationPort<TName, TData, TInput, TError, TContext>(
          Object.freeze(
            stryMutAct_9fa48("1303")
              ? {}
              : (stryCov_9fa48("1303"),
                {
                  __portName: config.name,
                  [MUTATION_PORT_SYMBOL]: stryMutAct_9fa48("1304")
                    ? false
                    : (stryCov_9fa48("1304"), true),
                  config: Object.freeze(
                    stryMutAct_9fa48("1305")
                      ? {}
                      : (stryCov_9fa48("1305"),
                        {
                          ...config,
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

export function isMutationPort(value: unknown): value is MutationPort {
  if (stryMutAct_9fa48("1306")) {
    {
    }
  } else {
    stryCov_9fa48("1306");
    return stryMutAct_9fa48("1309")
      ? (typeof value === "object" && value !== null && MUTATION_PORT_SYMBOL in value) ||
          value[MUTATION_PORT_SYMBOL] === true
      : stryMutAct_9fa48("1308")
        ? false
        : stryMutAct_9fa48("1307")
          ? true
          : (stryCov_9fa48("1307", "1308", "1309"),
            (stryMutAct_9fa48("1311")
              ? (typeof value === "object" && value !== null) || MUTATION_PORT_SYMBOL in value
              : stryMutAct_9fa48("1310")
                ? true
                : (stryCov_9fa48("1310", "1311"),
                  (stryMutAct_9fa48("1313")
                    ? typeof value === "object" || value !== null
                    : stryMutAct_9fa48("1312")
                      ? true
                      : (stryCov_9fa48("1312", "1313"),
                        (stryMutAct_9fa48("1315")
                          ? typeof value !== "object"
                          : stryMutAct_9fa48("1314")
                            ? true
                            : (stryCov_9fa48("1314", "1315"),
                              typeof value ===
                                (stryMutAct_9fa48("1316")
                                  ? ""
                                  : (stryCov_9fa48("1316"), "object")))) &&
                          (stryMutAct_9fa48("1318")
                            ? value === null
                            : stryMutAct_9fa48("1317")
                              ? true
                              : (stryCov_9fa48("1317", "1318"), value !== null)))) &&
                    MUTATION_PORT_SYMBOL in value)) &&
              (stryMutAct_9fa48("1320")
                ? value[MUTATION_PORT_SYMBOL] !== true
                : stryMutAct_9fa48("1319")
                  ? true
                  : (stryCov_9fa48("1319", "1320"),
                    value[MUTATION_PORT_SYMBOL] ===
                      (stryMutAct_9fa48("1321") ? false : (stryCov_9fa48("1321"), true)))));
  }
}
