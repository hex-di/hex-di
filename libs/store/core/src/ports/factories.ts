/**
 * Port Factory Functions
 *
 * Creates typed port tokens for state, atom, derived, async derived,
 * and linked derived ports.
 *
 * Each factory uses function overloads: the public signature returns
 * the phantom-branded port type, while the implementation works with
 * the base DirectedPort from createPort. The phantom brands exist only
 * at the type level for inference — they have no runtime representation.
 *
 * @packageDocumentation
 */

import { createPort } from "@hex-di/core";
import type {
  StatePortDef,
  AtomPortDef,
  DerivedPortDef,
  AsyncDerivedPortDef,
  LinkedDerivedPortDef,
} from "./port-types.js";
import type { ActionMap } from "../types/index.js";

// =============================================================================
// Port Config Interface
// =============================================================================

interface PortConfig<TName extends string> {
  readonly name: TName;
  readonly description?: string;
  readonly category?: string;
  readonly tags?: readonly string[];
}

// =============================================================================
// createStatePort
// =============================================================================

/**
 * Creates a state port with typed state and actions.
 *
 * Uses curried form to allow explicit TState/TActions with inferred TName.
 *
 * @example
 * ```typescript
 * const CounterPort = createStatePort<CounterState, CounterActions>()({
 *   name: "Counter",
 * });
 * ```
 */
export function createStatePort<TState, TActions extends ActionMap<TState>>(): <
  const TName extends string,
>(
  config: PortConfig<TName>
) => StatePortDef<TName, TState, TActions> {
  function factory<const TName extends string>(
    config: PortConfig<TName>
  ): StatePortDef<TName, TState, TActions>;
  function factory<const TName extends string>(config: PortConfig<TName>): unknown {
    return createPort<TName, unknown>(config);
  }
  return factory;
}

// =============================================================================
// createAtomPort
// =============================================================================

/**
 * Creates an atom port for a single reactive value.
 *
 * @example
 * ```typescript
 * const ThemePort = createAtomPort<"light" | "dark">()({
 *   name: "Theme",
 * });
 * ```
 */
export function createAtomPort<TValue>(): <const TName extends string>(
  config: PortConfig<TName>
) => AtomPortDef<TName, TValue> {
  function factory<const TName extends string>(
    config: PortConfig<TName>
  ): AtomPortDef<TName, TValue>;
  function factory<const TName extends string>(config: PortConfig<TName>): unknown {
    return createPort<TName, unknown>(config);
  }
  return factory;
}

// =============================================================================
// createDerivedPort
// =============================================================================

/**
 * Creates a derived port for computed values.
 *
 * @example
 * ```typescript
 * const CartTotalPort = createDerivedPort<CartTotal>()({
 *   name: "CartTotal",
 * });
 * ```
 */
export function createDerivedPort<TResult>(): <const TName extends string>(
  config: PortConfig<TName>
) => DerivedPortDef<TName, TResult> {
  function factory<const TName extends string>(
    config: PortConfig<TName>
  ): DerivedPortDef<TName, TResult>;
  function factory<const TName extends string>(config: PortConfig<TName>): unknown {
    return createPort<TName, unknown>(config);
  }
  return factory;
}

// =============================================================================
// createAsyncDerivedPort
// =============================================================================

/**
 * Creates an async derived port for async computed values.
 *
 * @example
 * ```typescript
 * const RatePort = createAsyncDerivedPort<ExchangeRate>()({
 *   name: "ExchangeRate",
 * });
 * ```
 */
export function createAsyncDerivedPort<TResult, E = never>(): <const TName extends string>(
  config: PortConfig<TName>
) => AsyncDerivedPortDef<TName, TResult, E> {
  function factory<const TName extends string>(
    config: PortConfig<TName>
  ): AsyncDerivedPortDef<TName, TResult, E>;
  function factory<const TName extends string>(config: PortConfig<TName>): unknown {
    return createPort<TName, unknown>(config);
  }
  return factory;
}

// =============================================================================
// createLinkedDerivedPort
// =============================================================================

/**
 * Creates a linked (bidirectional) derived port.
 *
 * @example
 * ```typescript
 * const FahrenheitPort = createLinkedDerivedPort<number>()({
 *   name: "Fahrenheit",
 * });
 * ```
 */
export function createLinkedDerivedPort<TResult>(): <const TName extends string>(
  config: PortConfig<TName>
) => LinkedDerivedPortDef<TName, TResult> {
  function factory<const TName extends string>(
    config: PortConfig<TName>
  ): LinkedDerivedPortDef<TName, TResult>;
  function factory<const TName extends string>(config: PortConfig<TName>): unknown {
    return createPort<TName, unknown>(config);
  }
  return factory;
}
