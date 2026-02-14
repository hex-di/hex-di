/**
 * Mutation Port Factory
 *
 * createMutationPort creates mutation port definitions using the curried
 * generics pattern matching createQueryPort.
 *
 * @packageDocumentation
 */

import { createPort } from "@hex-di/core";
import type { DirectedPort } from "@hex-di/core";
import type { MutationExecutor } from "./types.js";
import type { MutationEffects } from "./mutation-effects.js";
import type { MutationDefaults } from "../types/options.js";

// =============================================================================
// Brand Symbols
// =============================================================================

/**
 * Runtime symbol for identifying mutation ports.
 */
export const MUTATION_PORT_SYMBOL = Symbol.for("@hex-di/query/MutationPort");

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

/**
 * Convenience alias for mutation ports with erased type parameters.
 *
 * Uses `never` for TInput because TInput is in a contravariant position
 * (function parameter in MutationExecutor). For a MutationPort<..., TInput, ...>
 * to be assignable to AnyMutationPort, AnyMutationPort's TInput must be a subtype
 * of every possible TInput — which is `never`.
 */
export type AnyMutationPort = MutationPort<string, unknown, never, unknown, unknown>;

// =============================================================================
// createMutationPort Factory
// =============================================================================

/**
 * BRAND_CAST: Single documented coercion point for MutationPort branded types.
 * Object.freeze() loses phantom type info; the typed overload restores it.
 */
function brandAsMutationPort<TName extends string, TData, TInput, TError, TContext>(obj: {
  readonly __portName: TName;
  readonly [MUTATION_PORT_SYMBOL]: boolean;
  readonly config: {
    readonly name: TName;
    readonly effects?: MutationEffects;
    readonly defaults?: Partial<MutationDefaults>;
  };
}): MutationPort<TName, TData, TInput, TError, TContext>;
function brandAsMutationPort(obj: object): object {
  return obj;
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
  return <const TName extends string>(
    config: MutationPortConfig<TData, TInput, TError, TContext, TName>
  ): MutationPort<TName, TData, TInput, TError, TContext> => {
    // Create a proper DirectedPort base so metadata (including category)
    // flows through to VisualizableAdapter for library detection.
    const base = createPort<TName, MutationExecutor<TData, TInput, TError>, "inbound">({
      name: config.name,
      direction: "inbound",
      category: "query/mutation",
    });
    // BRAND_CAST: Branded type boundary -- merge DirectedPort base with
    // MutationPort-specific fields (phantom types, port symbol, config).
    return brandAsMutationPort<TName, TData, TInput, TError, TContext>(
      Object.freeze({
        ...base,
        [MUTATION_PORT_SYMBOL]: true,
        config: Object.freeze({ ...config }),
      })
    );
  };
}

// =============================================================================
// Type Guard
// =============================================================================

export function isMutationPort(value: unknown): value is MutationPort {
  return (
    typeof value === "object" &&
    value !== null &&
    MUTATION_PORT_SYMBOL in value &&
    value[MUTATION_PORT_SYMBOL] === true
  );
}
