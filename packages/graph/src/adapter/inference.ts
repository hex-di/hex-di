import type { Port } from "@hex-di/ports";
import type { Adapter, Lifetime, FactoryKind } from "./types";

// Type placeholder for inference patterns - more explicit than `any`
type InferPlaceholder = Port<unknown, string> | never;
type LifetimePlaceholder = Lifetime;
type FactoryKindPlaceholder = FactoryKind;

/**
 * Helper to extract the Provided port type from an Adapter.
 *
 * @typeParam A - The Adapter type
 * @internal
 */
export type InferAdapterProvides<A> =
  A extends Adapter<infer P, InferPlaceholder, LifetimePlaceholder, FactoryKindPlaceholder>
    ? P
    : never;

/**
 * Helper to extract the Required port types from an Adapter.
 *
 * @typeParam A - The Adapter type
 * @internal
 */
export type InferAdapterRequires<A> =
  A extends Adapter<InferPlaceholder, infer R, LifetimePlaceholder, FactoryKindPlaceholder>
    ? R
    : never;

/**
 * Extracts the union of provided ports from an array of adapters.
 *
 * @typeParam A - Tuple of adapters
 * @internal
 */
export type InferManyProvides<A> = A extends readonly (infer Element)[]
  ? Element extends Adapter<infer P, InferPlaceholder, LifetimePlaceholder, FactoryKindPlaceholder>
    ? P
    : never
  : never;

/**
 * Extracts the union of required ports from an array of adapters.
 *
 * @typeParam A - Tuple of adapters
 * @internal
 */
export type InferManyRequires<A> = A extends readonly (infer Element)[]
  ? Element extends Adapter<InferPlaceholder, infer R, LifetimePlaceholder, FactoryKindPlaceholder>
    ? R
    : never
  : never;

/**
 * Extracts the union of async provided ports from an array of adapters.
 * Only includes ports from async adapters.
 *
 * @typeParam A - Tuple of adapters
 * @internal
 */
export type InferManyAsyncPorts<A> = A extends readonly (infer Element)[]
  ? Element extends Adapter<infer P, InferPlaceholder, LifetimePlaceholder, "async">
    ? P
    : never
  : never;

/**
 * Helper to extract the Lifetime level from an Adapter.
 *
 * @typeParam A - The Adapter type
 * @internal
 */
export type InferAdapterLifetime<A> =
  A extends Adapter<InferPlaceholder, InferPlaceholder, infer L, FactoryKindPlaceholder>
    ? L
    : never;
