/**
 * Adapter Brand Symbols and Shared Types
 *
 * Unique symbols for identifying adapter kinds at runtime,
 * plus the shared StoreAdapterResult type for adapter factories.
 *
 * @packageDocumentation
 */

import type { Adapter, Port, Lifetime } from "@hex-di/core";

/**
 * Return type for store adapter factories.
 *
 * Generic over TName to preserve the port name through the type system.
 * This enables GraphBuilder to distinguish adapters (avoiding false duplicate
 * and self-dependency detection) while erasing the service type and requires.
 *
 * Built on `Adapter<...>` (not `AdapterConstraint`) so the `__adapterBrand`
 * property is present — required for `InferAdapterProvides` / `InferAdapterRequires`
 * pattern matching to succeed in the GraphBuilder validation pipeline.
 *
 * TRequires = `never` maps to `requires: readonly []` via the Adapter's default
 * TRequiresTuple computation, preventing false self-dependency detection.
 */
export type StoreAdapterResult<TName extends string = string> = Adapter<
  Port<TName, unknown>,
  never,
  Lifetime,
  "sync",
  boolean
>;

/** Brand for state adapters */
export const __stateAdapterBrand: unique symbol = Symbol("__stateAdapterBrand");

/** Brand for atom adapters */
export const __atomAdapterBrand: unique symbol = Symbol("__atomAdapterBrand");

/** Brand for derived adapters */
export const __derivedAdapterBrand: unique symbol = Symbol("__derivedAdapterBrand");

/** Brand for async derived adapters */
export const __asyncDerivedAdapterBrand: unique symbol = Symbol("__asyncDerivedAdapterBrand");

/** Brand for linked derived adapters */
export const __linkedDerivedAdapterBrand: unique symbol = Symbol("__linkedDerivedAdapterBrand");

/** Brand for effect adapters */
export const __effectBrand: unique symbol = Symbol("__effectBrand");

/** Type for effect adapter branding */
export type EffectAdapterBrand = { readonly [__effectBrand]: true };
