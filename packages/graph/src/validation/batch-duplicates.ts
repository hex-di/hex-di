/**
 * Batch Duplicate Detection Types.
 *
 * This module provides types for detecting duplicate port providers WITHIN
 * a batch of adapters passed to `provideMany()`.
 *
 * ## Problem
 *
 * `InferManyProvides<TAdapters>` returns a union of all provided ports.
 * Unions collapse duplicates: `A | A` becomes `A`. This means checking
 * `BatchHasOverlap<InferManyProvides<TAdapters>, TProvides>` only detects
 * batch-vs-graph duplicates, not within-batch duplicates.
 *
 * ## Solution
 *
 * Iterate the adapter array sequentially (not as a union) to detect when
 * the same port is provided by multiple adapters in the same batch.
 *
 * @packageDocumentation
 */

import type { InferAdapterProvides, InferManyProvides } from "../adapter/index.js";
import type { InferPortName } from "@hex-di/ports";

/**
 * Checks if an array of adapters contains duplicate provides.
 *
 * Iterates the array sequentially to detect when the same port
 * is provided by multiple adapters within the batch.
 *
 * @typeParam TAdapters - A readonly array of adapter types
 * @returns `true` if duplicates exist, `false` otherwise
 *
 * @example No duplicates
 * ```typescript
 * type Result = HasDuplicatesInBatch<readonly [LoggerAdapter, DatabaseAdapter]>;
 * // false
 * ```
 *
 * @example With duplicates
 * ```typescript
 * type Result = HasDuplicatesInBatch<readonly [LoggerAdapter, LoggerAdapter2]>;
 * // true (both provide LoggerPort)
 * ```
 *
 * @internal
 */
export type HasDuplicatesInBatch<TAdapters extends readonly unknown[]> =
  TAdapters extends readonly [infer Head, ...infer Tail]
    ? Tail extends readonly []
      ? false // Single adapter, no duplicates possible
      : HasOverlapWithRest<InferAdapterProvides<Head>, Tail> extends true
        ? true
        : HasDuplicatesInBatch<Tail>
    : false;

/**
 * Checks if a port overlaps with any port provided by the rest of the adapters.
 *
 * @typeParam TPort - The port to check
 * @typeParam TRest - The remaining adapters to check against
 * @returns `true` if TPort is provided by any adapter in TRest
 *
 * @internal
 */
type HasOverlapWithRest<TPort, TRest extends readonly unknown[]> = [TPort] extends [never]
  ? false
  : TPort extends InferManyProvides<TRest>
    ? true
    : false;

/**
 * Finds the first duplicate port within a batch of adapters.
 *
 * Returns the port that is provided by multiple adapters.
 * Returns `never` if no duplicates exist.
 *
 * @typeParam TAdapters - A readonly array of adapter types
 * @returns The first duplicate port type, or `never` if none
 *
 * @example No duplicates
 * ```typescript
 * type Result = FindBatchDuplicate<readonly [LoggerAdapter, DatabaseAdapter]>;
 * // never
 * ```
 *
 * @example With duplicates
 * ```typescript
 * type Result = FindBatchDuplicate<readonly [LoggerAdapter, LoggerAdapter2]>;
 * // LoggerPort
 * ```
 *
 * @internal
 */
export type FindBatchDuplicate<TAdapters extends readonly unknown[]> = TAdapters extends readonly [
  infer Head,
  ...infer Tail,
]
  ? Tail extends readonly []
    ? never // Single adapter, no duplicates
    : FindOverlapWithRest<InferAdapterProvides<Head>, Tail> extends never
      ? FindBatchDuplicate<Tail>
      : FindOverlapWithRest<InferAdapterProvides<Head>, Tail>
  : never;

/**
 * Finds a port that overlaps with ports provided by remaining adapters.
 *
 * @internal
 */
type FindOverlapWithRest<TPort, TRest extends readonly unknown[]> = [TPort] extends [never]
  ? never
  : TPort extends InferManyProvides<TRest>
    ? TPort
    : never;

/**
 * Error message for intra-batch duplicates.
 *
 * @typeParam TPort - The duplicate port type
 *
 * @internal
 */
export type BatchDuplicateErrorMessage<TPort> =
  `ERROR: Duplicate adapter in batch for '${InferPortName<TPort> & string}'. Fix: Remove one adapter from the provideMany() array.`;
