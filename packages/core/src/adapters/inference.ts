/**
 * Adapter type inference utilities.
 *
 * This module provides type-level utilities for extracting type information
 * from Adapter instances. These utilities enable type-safe operations on
 * adapters without knowing their exact type parameters.
 *
 * @packageDocumentation
 */

import type { Port } from "../ports/types.js";
import type { Adapter, Lifetime, FactoryKind } from "./types.js";
import type { InferenceError } from "../utils/type-utilities.js";

// =============================================================================
// Type Inference Utilities
// =============================================================================

// Type placeholder for inference patterns - more explicit than `any`
type InferPlaceholder = Port<unknown, string>;
type LifetimePlaceholder = Lifetime;
type FactoryKindPlaceholder = FactoryKind;
type ClonablePlaceholder = boolean;

/**
 * Structural shape for extracting TProvides from an adapter without matching
 * the contravariant `factory` field.
 *
 * When `dts-bundle-generator` creates flat type bundles for the playground,
 * each package gets its own copy of the `Adapter` type. Pattern-matching
 * `TAdapter extends Adapter<infer TProvides, Port<unknown, string>, ...>` fixes
 * `TRequires` at a concrete type, which causes `ResolvedDeps<Port<unknown, string>>`
 * to resolve to `{ [key: string]: unknown }`. The `factory` field becomes
 * `(deps: { [key: string]: unknown }) => ...`, and function parameter contravariance
 * prevents matching against concrete deps like `{ Config: Config; Logger: Logger }`.
 *
 * This structural type extracts TProvides from the `provides` property only
 * (covariant, non-optional), avoiding the factory field entirely.
 *
 * Note: Only used for TProvides extraction. Other extractors (TRequires, TLifetime, etc.)
 * fix TProvides (not TRequires) as the placeholder, so the factory return type becomes
 * `unknown` (covariant-compatible) and no contravariance issue occurs.
 *
 * @internal
 */
type AdapterProvidesShape<TProvides> = {
  readonly provides: TProvides;
  readonly requires: readonly unknown[];
  readonly lifetime: string;
  readonly factoryKind: FactoryKind;
  readonly clonable: boolean;
};

/**
 * Extracts the **Port type** from an Adapter's `provides` property.
 *
 * Returns the full `Port<TService, TName>` type, not just the name string.
 *
 * @typeParam A - The Adapter type to extract from
 * @returns The Port type that the adapter provides, or `never` if not an adapter
 *
 * @example
 * ```typescript
 * const LoggerAdapter = createAdapter({
 *   provides: LoggerPort,  // Port<Logger, "Logger">
 *   requires: [],
 *   factory: () => ({ log: () => {} }),
 * });
 *
 * type Provided = InferAdapterProvides<typeof LoggerAdapter>;
 * // Result: Port<Logger, "Logger">
 * ```
 */
export type InferAdapterProvides<TAdapter> =
  TAdapter extends AdapterProvidesShape<infer TProvides> ? TProvides : never;

/**
 * Extracts the **Port type union** from an Adapter's `requires` array.
 *
 * Returns the union of all Port types that the adapter requires as dependencies.
 *
 * @typeParam A - The Adapter type to extract from
 * @returns Union of Port types the adapter requires, or `never` if none
 *
 * @example
 * ```typescript
 * const UserServiceAdapter = createAdapter({
 *   provides: UserServicePort,
 *   requires: [LoggerPort, DatabasePort],
 *   factory: (deps) => ({ ... }),
 * });
 *
 * type Required = InferAdapterRequires<typeof UserServiceAdapter>;
 * // Result: Port<Logger, "Logger"> | Port<Database, "Database">
 * ```
 */
export type InferAdapterRequires<TAdapter> =
  TAdapter extends Adapter<
    InferPlaceholder,
    infer TRequires,
    LifetimePlaceholder,
    FactoryKindPlaceholder,
    ClonablePlaceholder
  >
    ? TRequires
    : never;

/**
 * Extracts the **union of Port types** provided by an array of adapters.
 *
 * Iterates through each adapter in the array and collects all provided ports
 * into a single union type.
 *
 * @typeParam A - Tuple or readonly array of Adapter types
 * @returns Union of all Port types provided by the adapters
 *
 * @example
 * ```typescript
 * const adapters = [LoggerAdapter, DatabaseAdapter] as const;
 *
 * type AllProvided = InferManyProvides<typeof adapters>;
 * // Result: Port<Logger, "Logger"> | Port<Database, "Database">
 * ```
 */
export type InferManyProvides<TAdapters> = TAdapters extends readonly (infer TElement)[]
  ? TElement extends AdapterProvidesShape<infer TProvides>
    ? TProvides
    : never
  : never;

/**
 * Extracts the **union of Port types** required by an array of adapters.
 *
 * Iterates through each adapter in the array and collects all required ports
 * into a single union type.
 *
 * @typeParam A - Tuple or readonly array of Adapter types
 * @returns Union of all Port types required by the adapters
 *
 * @example
 * ```typescript
 * const adapters = [UserServiceAdapter, CacheAdapter] as const;
 *
 * type AllRequired = InferManyRequires<typeof adapters>;
 * // Result: Port<Logger, "Logger"> | Port<Database, "Database"> | ...
 * ```
 */
export type InferManyRequires<TAdapters> = TAdapters extends readonly (infer TElement)[]
  ? TElement extends Adapter<
      InferPlaceholder,
      infer TRequires,
      LifetimePlaceholder,
      FactoryKindPlaceholder,
      ClonablePlaceholder
    >
    ? TRequires
    : never
  : never;

/**
 * Extracts the union of async provided ports from an array of adapters.
 * Only includes ports from async adapters.
 *
 * @typeParam A - Tuple of adapters
 */
export type InferManyAsyncPorts<TAdapters> = TAdapters extends readonly (infer TElement)[]
  ? TElement extends AdapterProvidesShape<infer TProvides> & { readonly factoryKind: "async" }
    ? TProvides
    : never
  : never;

/**
 * Helper to extract the Lifetime level from an Adapter.
 *
 * @typeParam A - The Adapter type
 */
export type InferAdapterLifetime<TAdapter> =
  TAdapter extends Adapter<
    InferPlaceholder,
    InferPlaceholder,
    infer TLifetime,
    FactoryKindPlaceholder,
    ClonablePlaceholder
  >
    ? TLifetime
    : never;

/**
 * Extracts the **error channel type** from an Adapter.
 *
 * Returns the `TError` type parameter, which represents the error type
 * that the adapter's factory can produce via `Result<T, E>` returns.
 *
 * - `never` means the factory is infallible (returns `T` directly)
 * - Any other type means the factory is fallible and must be handled
 *   via `adapterOrDie()` or `adapterOrElse()` before providing to a graph
 *
 * @typeParam TAdapter - The Adapter type to extract from
 * @returns The error channel type, or `never` if infallible
 */
export type InferAdapterError<TAdapter> =
  TAdapter extends Adapter<
    InferPlaceholder,
    InferPlaceholder,
    LifetimePlaceholder,
    FactoryKindPlaceholder,
    ClonablePlaceholder,
    readonly unknown[],
    infer TError
  >
    ? TError
    : never;

/**
 * Extracts the union of error channel types from an array of adapters.
 *
 * @typeParam TAdapters - Tuple or readonly array of Adapter types
 * @returns Union of all error types, or `never` if all are infallible
 */
export type InferManyErrors<TAdapters> = TAdapters extends readonly (infer TElement)[]
  ? TElement extends Adapter<
      InferPlaceholder,
      InferPlaceholder,
      LifetimePlaceholder,
      FactoryKindPlaceholder,
      ClonablePlaceholder,
      readonly unknown[],
      infer TError
    >
    ? TError
    : never
  : never;

/**
 * Extracts the clonable status from an adapter type.
 *
 * @typeParam TAdapter - The adapter type to extract from
 * @returns `true` if the adapter is clonable, `false` otherwise
 *
 * @example
 * ```typescript
 * type IsClonable = InferClonable<typeof LoggerAdapter>; // true | false
 * ```
 */
export type InferClonable<TAdapter> =
  TAdapter extends Adapter<
    InferPlaceholder,
    InferPlaceholder,
    LifetimePlaceholder,
    FactoryKindPlaceholder,
    infer TClonable
  >
    ? TClonable
    : false;

/**
 * Type predicate that checks if an adapter is clonable at the type level.
 *
 * @typeParam TAdapter - The adapter type to check
 * @returns `true` if the adapter is clonable, `false` otherwise
 *
 * @example
 * ```typescript
 * type Check = IsClonableAdapter<typeof LoggerAdapter>; // true | false
 * ```
 */
export type IsClonableAdapter<TAdapter> = InferClonable<TAdapter> extends true ? true : false;

// =============================================================================
// Debug Inference Types
// =============================================================================

/**
 * Debug version of `InferAdapterProvides` that returns an `InferenceError`
 * instead of `never` when the input is not a valid Adapter type.
 *
 * Use this when debugging type inference issues. The IDE tooltip will show
 * exactly what went wrong instead of just `never`.
 *
 * @typeParam TAdapter - The type to extract from
 * @returns The provided Port, or `InferenceError` with details if not an adapter
 *
 * @example
 * ```typescript
 * // Normal type shows just `never` on hover:
 * type A = InferAdapterProvides<{ notAdapter: true }>;
 *
 * // Debug type shows descriptive error on hover:
 * type B = DebugInferAdapterProvides<{ notAdapter: true }>;
 * // { __inferenceError: true; __source: "InferAdapterProvides"; __message: "...", ... }
 * ```
 */
export type DebugInferAdapterProvides<TAdapter> =
  TAdapter extends AdapterProvidesShape<infer TProvides>
    ? TProvides
    : InferenceError<
        "InferAdapterProvides",
        "Input is not a valid Adapter type. Expected Adapter<TProvides, TRequires, TLifetime, TFactoryKind, TClonable>.",
        TAdapter
      >;

/**
 * Debug version of `InferAdapterRequires` that returns an `InferenceError`
 * instead of `never` when the input is not a valid Adapter type.
 *
 * Note: Returns `never` for adapters with no requirements (intentional empty case).
 * Only returns `InferenceError` when the input is not an adapter at all.
 *
 * @typeParam TAdapter - The type to extract from
 * @returns The required Ports union, `never` if no requirements, or `InferenceError` if not an adapter
 */
export type DebugInferAdapterRequires<TAdapter> =
  TAdapter extends Adapter<
    InferPlaceholder,
    infer TRequires,
    LifetimePlaceholder,
    FactoryKindPlaceholder,
    ClonablePlaceholder
  >
    ? TRequires
    : InferenceError<
        "InferAdapterRequires",
        "Input is not a valid Adapter type. Expected Adapter<TProvides, TRequires, TLifetime, TFactoryKind, TClonable>.",
        TAdapter
      >;

/**
 * Debug version of `InferAdapterLifetime` that returns an `InferenceError`
 * instead of `never` when the input is not a valid Adapter type.
 *
 * @typeParam TAdapter - The type to extract from
 * @returns The Lifetime, or `InferenceError` if not an adapter
 */
export type DebugInferAdapterLifetime<TAdapter> =
  TAdapter extends Adapter<
    InferPlaceholder,
    InferPlaceholder,
    infer TLifetime,
    FactoryKindPlaceholder,
    ClonablePlaceholder
  >
    ? TLifetime
    : InferenceError<
        "InferAdapterLifetime",
        "Input is not a valid Adapter type. Expected Adapter<TProvides, TRequires, TLifetime, TFactoryKind, TClonable>.",
        TAdapter
      >;

/**
 * Debug version of `InferManyProvides` that returns an `InferenceError`
 * instead of `never` when the input is not a valid array of Adapters.
 *
 * @typeParam TAdapters - The array type to extract from
 * @returns Union of provided Ports, or `InferenceError` if not a valid adapter array
 */
export type DebugInferManyProvides<TAdapters> = TAdapters extends readonly (infer TElement)[]
  ? TElement extends AdapterProvidesShape<infer TProvides>
    ? TProvides
    : InferenceError<"InferManyProvides", "Array element is not a valid Adapter type.", TElement>
  : InferenceError<
      "InferManyProvides",
      "Input is not a readonly array. Expected readonly Adapter[].",
      TAdapters
    >;

/**
 * Debug version of `InferManyRequires` that returns an `InferenceError`
 * instead of `never` when the input is not a valid array of Adapters.
 *
 * @typeParam TAdapters - The array type to extract from
 * @returns Union of required Ports, or `InferenceError` if not a valid adapter array
 */
export type DebugInferManyRequires<TAdapters> = TAdapters extends readonly (infer TElement)[]
  ? TElement extends Adapter<
      InferPlaceholder,
      infer TRequires,
      LifetimePlaceholder,
      FactoryKindPlaceholder,
      ClonablePlaceholder
    >
    ? TRequires
    : InferenceError<"InferManyRequires", "Array element is not a valid Adapter type.", TElement>
  : InferenceError<
      "InferManyRequires",
      "Input is not a readonly array. Expected readonly Adapter[].",
      TAdapters
    >;
