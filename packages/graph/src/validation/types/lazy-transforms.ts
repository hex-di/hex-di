/**
 * Lazy Port Transform Types.
 *
 * This module provides type utilities for transforming lazy port requirements
 * to their original ports, enabling the graph to track actual dependencies
 * while allowing lazy resolution patterns.
 *
 * ## Why Transform?
 *
 * When an adapter requires `lazyPort(UserServicePort)`:
 * - The factory receives `{ LazyUserService: () => UserService }`
 * - But the dependency graph should track `UserServicePort` (not `LazyUserServicePort`)
 * - The "missing adapters" error should say "UserService" not "LazyUserService"
 *
 * These transform types enable that translation at the type level.
 *
 * @packageDocumentation
 */

import type { IsLazyPort, UnwrapLazyPort } from "@hex-di/core";

/**
 * Transforms lazy ports in a requires union to their original ports.
 *
 * LazyPort<UserServicePort> → UserServicePort
 * Regular ports pass through unchanged.
 *
 * @typeParam T - A union of port types (may include LazyPorts)
 * @returns A union of original ports (LazyPorts are unwrapped)
 *
 * @example
 * ```typescript
 * type Requires = LazyPort<UserServicePort> | LoggerPort;
 * type Transformed = TransformLazyToOriginal<Requires>;
 * // UserServicePort | LoggerPort
 * ```
 *
 * @internal
 */
export type TransformLazyToOriginal<T> = T extends unknown
  ? IsLazyPort<T> extends true
    ? UnwrapLazyPort<T>
    : T
  : never;

/**
 * Extracts all lazy ports from a union of ports.
 *
 * Filters a union to include only LazyPort types, excluding regular ports.
 *
 * @typeParam T - A union of port types
 * @returns A union of only the LazyPort types, or `never` if none
 *
 * @example
 * ```typescript
 * type Requires = LazyPort<UserServicePort> | LoggerPort | LazyPort<CachePort>;
 * type Lazy = ExtractLazyPorts<Requires>;
 * // LazyPort<UserServicePort> | LazyPort<CachePort>
 * ```
 *
 * @internal
 */
export type ExtractLazyPorts<T> = T extends unknown
  ? IsLazyPort<T> extends true
    ? T
    : never
  : never;

/**
 * Checks if a union of ports contains any lazy ports.
 *
 * @typeParam T - A union of port types
 * @returns `true` if any port in the union is a LazyPort
 *
 * @example
 * ```typescript
 * type A = HasLazyPorts<LazyPort<UserServicePort> | LoggerPort>; // true
 * type B = HasLazyPorts<LoggerPort | DatabasePort>;              // false
 * ```
 *
 * @internal
 */
export type HasLazyPorts<T> = [ExtractLazyPorts<T>] extends [never] ? false : true;

/**
 * Transforms lazy port names to their original names by removing the "Lazy" prefix.
 *
 * When a port is wrapped with `lazyPort()`, its name gets prefixed with "Lazy".
 * This type removes that prefix to get back the original port name.
 *
 * @typeParam T - A string or union of strings (port names)
 * @returns The names with "Lazy" prefix removed, or unchanged if no prefix
 *
 * @example
 * ```typescript
 * type Names = "LazyUserService" | "LazyConfigService" | "Logger";
 * type Original = TransformLazyPortNamesToOriginal<Names>;
 * // "UserService" | "ConfigService" | "Logger"
 * ```
 *
 * @internal
 */
export type TransformLazyPortNamesToOriginal<T> = T extends `Lazy${infer TOriginal}`
  ? TOriginal
  : T;
