/**
 * Lifetime Map Operations for Captive Dependency Detection.
 *
 * This module provides type utilities for building and querying the
 * type-level lifetime map. The map tracks each port's lifetime level,
 * enabling captive dependency detection at compile time.
 *
 * @packageDocumentation
 */

import type { Lifetime } from "../../../adapter/types/adapter-types.js";
import type { Prettify } from "../../../types/type-utilities.js";
import type { LifetimeLevel } from "./lifetime-level.js";

/**
 * Adds a port's lifetime level to the lifetime map.
 *
 * Uses a simple intersection to extend the map. The key insight is that
 * we use a branded object type `{ [TPortName]: level }` which TypeScript
 * properly narrows when indexing.
 *
 * If TLifetime is not a valid lifetime (e.g., an error message string),
 * the lifetime map entry will have `never` as the level, which naturally
 * propagates through downstream validations.
 *
 * @typeParam TMap - The current lifetime map
 * @typeParam TPortName - The port name to add
 * @typeParam TLifetime - The lifetime of the adapter providing this port
 *
 * @example
 * ```typescript
 * type Map1 = {}; // Empty map
 * type Map2 = AddLifetime<Map1, "Logger", "singleton">; // { Logger: 1 }
 * type Map3 = AddLifetime<Map2, "Database", "scoped">; // { Logger: 1, Database: 2 }
 * ```
 *
 * @internal
 */
export type AddLifetime<
  TLifetimeMap,
  TPortName extends string,
  TLifetime,
> = TLifetime extends Lifetime
  ? Prettify<TLifetimeMap & { [K in TPortName]: LifetimeLevel<TLifetime> }>
  : TLifetimeMap;

/**
 * Gets the lifetime level for a port from the lifetime map.
 *
 * ## `never` Semantics: Not Found / Forward Reference
 *
 * When this type returns `never`, it means **"port not found in map"**.
 * This typically indicates a forward reference - the port hasn't been
 * registered yet and will be validated later.
 *
 * This is distinct from "empty set" `never`: here `never` indicates
 * **absence of data** rather than an empty collection.
 *
 * @typeParam TMap - The lifetime map
 * @typeParam TPortName - The port name to look up
 * @returns The lifetime level (1, 2, or 3); `never` if port not in map
 *
 * @example Port found
 * ```typescript
 * type Map = { Logger: 1; Database: 2 };
 * type Level = GetLifetimeLevel<Map, "Logger">; // 1
 * ```
 *
 * @example Port not found (forward reference)
 * ```typescript
 * type Map = { Logger: 1 };
 * type Level = GetLifetimeLevel<Map, "Database">; // never
 * ```
 *
 * @internal
 */
export type GetLifetimeLevel<
  TLifetimeMap,
  TPortName extends string,
> = TPortName extends keyof TLifetimeMap
  ? TLifetimeMap[TPortName] extends number
    ? TLifetimeMap[TPortName]
    : never
  : never;

/**
 * Merges two lifetime maps together.
 * Used when merging GraphBuilders.
 *
 * Uses Prettify to flatten the intersection for proper indexing.
 *
 * @typeParam TMap1 - First lifetime map
 * @typeParam TMap2 - Second lifetime map
 *
 * @internal
 */
export type MergeLifetimeMaps<TMap1, TMap2> = Prettify<TMap1 & TMap2>;
