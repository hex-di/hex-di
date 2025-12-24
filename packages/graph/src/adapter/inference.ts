import type { Port } from "@hex-di/ports";
import type { Adapter, Lifetime, FactoryKind } from "./types";

// Type placeholder for inference patterns - more explicit than `any`
type InferPlaceholder = Port<unknown, string> | never;
type LifetimePlaceholder = Lifetime;
type FactoryKindPlaceholder = FactoryKind;
type ClonablePlaceholder = boolean;

/**
 * Helper to extract the Provided port type from an Adapter.
 *
 * @typeParam A - The Adapter type
 * @internal
 */
export type InferAdapterProvides<A> =
  A extends Adapter<
    infer P,
    InferPlaceholder,
    LifetimePlaceholder,
    FactoryKindPlaceholder,
    ClonablePlaceholder
  >
    ? P
    : never;

/**
 * Helper to extract the Required port types from an Adapter.
 *
 * @typeParam A - The Adapter type
 * @internal
 */
export type InferAdapterRequires<A> =
  A extends Adapter<
    InferPlaceholder,
    infer R,
    LifetimePlaceholder,
    FactoryKindPlaceholder,
    ClonablePlaceholder
  >
    ? R
    : never;

/**
 * Extracts the union of provided ports from an array of adapters.
 *
 * @typeParam A - Tuple of adapters
 * @internal
 */
export type InferManyProvides<A> = A extends readonly (infer Element)[]
  ? Element extends Adapter<
      infer P,
      InferPlaceholder,
      LifetimePlaceholder,
      FactoryKindPlaceholder,
      ClonablePlaceholder
    >
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
  ? Element extends Adapter<
      InferPlaceholder,
      infer R,
      LifetimePlaceholder,
      FactoryKindPlaceholder,
      ClonablePlaceholder
    >
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
  ? Element extends Adapter<
      infer P,
      InferPlaceholder,
      LifetimePlaceholder,
      "async",
      ClonablePlaceholder
    >
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
  A extends Adapter<
    InferPlaceholder,
    InferPlaceholder,
    infer L,
    FactoryKindPlaceholder,
    ClonablePlaceholder
  >
    ? L
    : never;
