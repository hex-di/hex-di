/**
 * Query Port Factory
 *
 * createQueryPort creates query port definitions using the curried generics
 * pattern. Type parameters are explicit in the first call; configuration
 * is inferred in the second call.
 *
 * @packageDocumentation
 */

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
export const QUERY_PORT_SYMBOL = Symbol.for("@hex-di/query/QueryPort");

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
 * Object.freeze() loses phantom type info; the typed overload restores it.
 */
function brandAsQueryPort<
  TName extends string,
  TData,
  TParams,
  TError,
  TDependsOn extends ReadonlyArray<AnyQueryPort>,
>(obj: {
  readonly __portName: TName;
  readonly [QUERY_PORT_SYMBOL]: boolean;
  readonly config: {
    readonly name: TName;
    readonly dependsOn?: TDependsOn | ReadonlyArray<AnyQueryPort>;
    readonly defaults?: Partial<QueryDefaults>;
  };
}): QueryPort<TName, TData, TParams, TError, TDependsOn>;
function brandAsQueryPort(obj: object): object {
  return obj;
}

/**
 * Creates a query port definition using curried generics.
 *
 * Stage 1: Explicit type parameters (data, params, error).
 * Stage 2: Inferred configuration (name, defaults, dependsOn).
 */
export function createQueryPort<TData, TParams = void, TError = Error>(): <
  const TName extends string,
  const TDependsOn extends ReadonlyArray<AnyQueryPort> = [],
>(
  config: QueryPortConfig<TData, TParams, TError, TName, TDependsOn>
) => QueryPort<TName, TData, TParams, TError, TDependsOn> {
  return <const TName extends string, const TDependsOn extends ReadonlyArray<AnyQueryPort> = []>(
    config: QueryPortConfig<TData, TParams, TError, TName, TDependsOn>
  ): QueryPort<TName, TData, TParams, TError, TDependsOn> => {
    // BRAND_CAST: Branded type boundary -- frozen object structurally matches
    // QueryPort but needs phantom type branding (error type, port symbol).
    return brandAsQueryPort<TName, TData, TParams, TError, TDependsOn>(
      Object.freeze({
        __portName: config.name,
        [QUERY_PORT_SYMBOL]: true,
        config: Object.freeze({
          ...config,
          dependsOn: config.dependsOn ?? [],
        }),
      })
    );
  };
}

// =============================================================================
// Type Guard
// =============================================================================

export function isQueryPort(value: unknown): value is QueryPort {
  return (
    typeof value === "object" &&
    value !== null &&
    QUERY_PORT_SYMBOL in value &&
    value[QUERY_PORT_SYMBOL] === true
  );
}
