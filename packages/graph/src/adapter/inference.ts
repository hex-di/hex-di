import type { Port } from "@hex-di/ports";
import type { Adapter, Lifetime, FactoryKind } from "./types.js";

// =============================================================================
// Type Inference Utilities
// =============================================================================
//
// NAMING CONVENTION:
//
// These types extract different aspects from Adapter types:
//
// | Type                    | Returns           | Example Output          |
// |-------------------------|-------------------|-------------------------|
// | InferAdapterProvides    | Port<T, Name>     | Port<Logger, "Logger">  |
// | InferAdapterRequires    | Port union        | Port<A> | Port<B>       |
// | InferAdapterLifetime    | Lifetime string   | "singleton"             |
// | InferManyProvides       | Port union        | Port<A> | Port<B>       |
// | InferManyRequires       | Port union        | Port<C> | Port<D>       |
//
// Note: AdapterProvidesName (in cycle-detection.ts) returns the port NAME
// as a string literal ("Logger"), not the Port type itself.
//

// Type placeholder for inference patterns - more explicit than `any`
type InferPlaceholder = Port<unknown, string> | never;
type LifetimePlaceholder = Lifetime;
type FactoryKindPlaceholder = FactoryKind;
type ClonablePlaceholder = boolean;

/**
 * Extracts the **Port type** from an Adapter's `provides` property.
 *
 * Returns the full `Port<TService, TName>` type, not just the name string.
 * For extracting the port name as a string, see `AdapterProvidesName` in
 * `validation/cycle-detection.ts`.
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
 *
 * @internal
 */
export type InferAdapterProvides<TAdapter> =
  TAdapter extends Adapter<
    infer TProvides,
    InferPlaceholder,
    LifetimePlaceholder,
    FactoryKindPlaceholder,
    ClonablePlaceholder
  >
    ? TProvides
    : never;

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
 *
 * @internal
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
 *
 * @internal
 */
export type InferManyProvides<TAdapters> = TAdapters extends readonly (infer TElement)[]
  ? TElement extends Adapter<
      infer TProvides,
      InferPlaceholder,
      LifetimePlaceholder,
      FactoryKindPlaceholder,
      ClonablePlaceholder
    >
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
 *
 * @internal
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
 * @internal
 */
export type InferManyAsyncPorts<TAdapters> = TAdapters extends readonly (infer TElement)[]
  ? TElement extends Adapter<
      infer TProvides,
      InferPlaceholder,
      LifetimePlaceholder,
      "async",
      ClonablePlaceholder
    >
    ? TProvides
    : never
  : never;

/**
 * Helper to extract the Lifetime level from an Adapter.
 *
 * @typeParam A - The Adapter type
 * @internal
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
