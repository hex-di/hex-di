/**
 * Mutation Adapter Factory
 *
 * createMutationAdapter binds an executor function to a mutation port.
 * Supports optimistic updates via onMutate/onSuccess/onError/onSettled callbacks.
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
import type { MutationPort } from "../ports/mutation-port.js";
import type { MutationContext, MutationExecutor } from "../ports/types.js";
import type { MutationDefaults } from "../types/options.js";

// =============================================================================
// Brand Symbol
// =============================================================================

export const MUTATION_ADAPTER_SYMBOL = Symbol.for(
  stryMutAct_9fa48("0") ? "" : (stryCov_9fa48("0"), "@hex-di/query/MutationAdapter")
);

// =============================================================================
// MutationAdapter Type
// =============================================================================

export interface MutationAdapter<
  TName extends string = string,
  TData = unknown,
  TInput = unknown,
  TError = unknown,
  TContext = unknown,
> {
  readonly [MUTATION_ADAPTER_SYMBOL]: true;
  readonly port: MutationPort<TName, TData, TInput, TError, TContext>;
  readonly executor: MutationExecutor<TData, TInput, TError>;
  readonly defaults: Partial<MutationDefaults>;

  /** Optimistic update callbacks defined at adapter level */
  readonly onMutate?: (input: TInput) => TContext | Promise<TContext>;
  readonly onSuccess?: (data: TData, input: TInput, context: TContext | undefined) => void;
  readonly onError?: (error: TError, input: TInput, context: TContext | undefined) => void;
  readonly onSettled?: (
    data: TData | undefined,
    error: TError | undefined,
    input: TInput,
    context: TContext | undefined
  ) => void;
}

// =============================================================================
// MutationAdapterConfig
// =============================================================================

export interface MutationAdapterConfig<TData, TInput, TError, TContext> {
  readonly executor: (input: TInput, context: MutationContext) => ResultAsync<TData, TError>;
  readonly defaults?: Partial<MutationDefaults>;
  readonly onMutate?: (input: TInput) => TContext | Promise<TContext>;
  readonly onSuccess?: (data: TData, input: TInput, context: TContext | undefined) => void;
  readonly onError?: (error: TError, input: TInput, context: TContext | undefined) => void;
  readonly onSettled?: (
    data: TData | undefined,
    error: TError | undefined,
    input: TInput,
    context: TContext | undefined
  ) => void;
}

// =============================================================================
// createMutationAdapter Factory
// =============================================================================

/**
 * BRAND_CAST: Single documented coercion point for MutationAdapter branded types.
 */
function brandAsMutationAdapter<TName extends string, TData, TInput, TError, TContext>(obj: {
  readonly [MUTATION_ADAPTER_SYMBOL]: true;
  readonly port: MutationPort<TName, TData, TInput, TError, TContext>;
  readonly executor: MutationExecutor<TData, TInput, TError>;
  readonly defaults: Partial<MutationDefaults>;
  readonly onMutate?: (input: TInput) => TContext | Promise<TContext>;
  readonly onSuccess?: (data: TData, input: TInput, context: TContext | undefined) => void;
  readonly onError?: (error: TError, input: TInput, context: TContext | undefined) => void;
  readonly onSettled?: (
    data: TData | undefined,
    error: TError | undefined,
    input: TInput,
    context: TContext | undefined
  ) => void;
}): MutationAdapter<TName, TData, TInput, TError, TContext> {
  if (stryMutAct_9fa48("1")) {
    {
    }
  } else {
    stryCov_9fa48("1");
    return obj as MutationAdapter<TName, TData, TInput, TError, TContext>;
  }
}

/**
 * Creates a mutation adapter binding an executor to a mutation port.
 */
export function createMutationAdapter<TName extends string, TData, TInput, TError, TContext>(
  port: MutationPort<TName, TData, TInput, TError, TContext>
): (
  config: MutationAdapterConfig<TData, TInput, TError, TContext>
) => MutationAdapter<TName, TData, TInput, TError, TContext> {
  if (stryMutAct_9fa48("2")) {
    {
    }
  } else {
    stryCov_9fa48("2");
    return config => {
      if (stryMutAct_9fa48("3")) {
        {
        }
      } else {
        stryCov_9fa48("3");
        // BRAND_CAST: Branded type boundary for MutationAdapter
        return brandAsMutationAdapter<TName, TData, TInput, TError, TContext>(
          Object.freeze(
            stryMutAct_9fa48("4")
              ? {}
              : (stryCov_9fa48("4"),
                {
                  [MUTATION_ADAPTER_SYMBOL]: true as const,
                  port,
                  executor: config.executor,
                  defaults: stryMutAct_9fa48("5")
                    ? config.defaults && {}
                    : (stryCov_9fa48("5"), config.defaults ?? {}),
                  onMutate: config.onMutate,
                  onSuccess: config.onSuccess,
                  onError: config.onError,
                  onSettled: config.onSettled,
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

export function isMutationAdapter(value: unknown): value is MutationAdapter {
  if (stryMutAct_9fa48("6")) {
    {
    }
  } else {
    stryCov_9fa48("6");
    return stryMutAct_9fa48("9")
      ? (typeof value === "object" && value !== null && MUTATION_ADAPTER_SYMBOL in value) ||
          value[MUTATION_ADAPTER_SYMBOL] === true
      : stryMutAct_9fa48("8")
        ? false
        : stryMutAct_9fa48("7")
          ? true
          : (stryCov_9fa48("7", "8", "9"),
            (stryMutAct_9fa48("11")
              ? (typeof value === "object" && value !== null) || MUTATION_ADAPTER_SYMBOL in value
              : stryMutAct_9fa48("10")
                ? true
                : (stryCov_9fa48("10", "11"),
                  (stryMutAct_9fa48("13")
                    ? typeof value === "object" || value !== null
                    : stryMutAct_9fa48("12")
                      ? true
                      : (stryCov_9fa48("12", "13"),
                        (stryMutAct_9fa48("15")
                          ? typeof value !== "object"
                          : stryMutAct_9fa48("14")
                            ? true
                            : (stryCov_9fa48("14", "15"),
                              typeof value ===
                                (stryMutAct_9fa48("16") ? "" : (stryCov_9fa48("16"), "object")))) &&
                          (stryMutAct_9fa48("18")
                            ? value === null
                            : stryMutAct_9fa48("17")
                              ? true
                              : (stryCov_9fa48("17", "18"), value !== null)))) &&
                    MUTATION_ADAPTER_SYMBOL in value)) &&
              (stryMutAct_9fa48("20")
                ? value[MUTATION_ADAPTER_SYMBOL] !== true
                : stryMutAct_9fa48("19")
                  ? true
                  : (stryCov_9fa48("19", "20"),
                    value[MUTATION_ADAPTER_SYMBOL] ===
                      (stryMutAct_9fa48("21") ? false : (stryCov_9fa48("21"), true)))));
  }
}
