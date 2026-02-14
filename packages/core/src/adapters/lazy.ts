/**
 * Lazy Port Types and Utilities.
 *
 * This module provides support for lazy (deferred) dependencies, enabling
 * bidirectional dependencies without circular dependency errors.
 *
 * ## Problem
 *
 * Circular dependencies like `A -> B -> A` cause compile-time errors.
 * Sometimes these are legitimate design patterns (e.g., mutually-dependent services).
 *
 * ## Solution
 *
 * Use `lazyPort(OriginalPort)` in an adapter's `requires` array. The factory
 * receives a thunk `() => T` instead of `T`, deferring resolution until called.
 *
 * @example
 * ```typescript
 * // NotificationService depends on LAZY UserService
 * const NotificationServiceAdapter = createAdapter({
 *   provides: NotificationServicePort,
 *   requires: [lazyPort(UserServicePort)] as const,
 *   lifetime: "singleton",
 *   factory: ({ LazyUserService }) => ({
 *     send: (userId, message) => {
 *       const userService = LazyUserService(); // Thunk: () => UserService
 *       const user = userService.getUser(userId);
 *       console.log(`Sending "${message}" to ${user.name}`);
 *     },
 *   }),
 * });
 * ```
 *
 * @packageDocumentation
 */

import type { Port, InferService, InferPortName } from "../ports/types.js";

// =============================================================================
// Type Brands
// =============================================================================

/**
 * Brand symbol for lazy ports. Used for type discrimination.
 * @internal
 */
declare const __lazyPortBrand: unique symbol;

/**
 * Symbol key for storing the original port reference.
 * @internal
 */
declare const __originalPort: unique symbol;

// =============================================================================
// LazyPort Type
// =============================================================================

/**
 * A lazy wrapper port that provides a thunk `() => T` instead of `T`.
 *
 * Lazy ports break circular dependencies by deferring resolution.
 * When an adapter requires `LazyPort<SomePort>`, its factory receives
 * `{ LazySomeName: () => SomeService }` instead of `{ SomeName: SomeService }`.
 *
 * @typeParam TPort - The original port being wrapped
 *
 * @example
 * ```typescript
 * const LazyUserService = lazyPort(UserServicePort);
 * // type: LazyPort<typeof UserServicePort>
 * // provides: () => UserService (a thunk)
 * // name: "LazyUserService"
 * ```
 */
export type LazyPort<TPort extends Port<unknown, string>> = Port<
  () => InferService<TPort>,
  `Lazy${InferPortName<TPort>}`
> & {
  readonly [__lazyPortBrand]: true;
  readonly [__originalPort]: TPort;
};

// =============================================================================
// Type Predicates
// =============================================================================

/**
 * Checks if a type is a LazyPort.
 *
 * @typeParam TPort - The type to check
 * @returns `true` if TPort is a LazyPort, `false` otherwise
 *
 * @example
 * ```typescript
 * type A = IsLazyPort<LazyPort<UserServicePort>>; // true
 * type B = IsLazyPort<UserServicePort>;            // false
 * ```
 */
export type IsLazyPort<TPort> = TPort extends { readonly [__lazyPortBrand]: true } ? true : false;

/**
 * Extracts the original port from a LazyPort.
 *
 * @typeParam TPort - A LazyPort type
 * @returns The original port type, or `never` if not a LazyPort
 *
 * @example
 * ```typescript
 * type Original = UnwrapLazyPort<LazyPort<UserServicePort>>;
 * // UserServicePort
 * ```
 */
export type UnwrapLazyPort<TPort> = TPort extends { readonly [__originalPort]: infer TOriginal }
  ? TOriginal
  : never;

// =============================================================================
// Runtime Functions
// =============================================================================

/**
 * Symbol for the lazy port brand (runtime).
 * @internal
 */
const LAZY_PORT_BRAND = Symbol.for("@hex-di/core/LazyPort");

/**
 * Symbol for storing the original port (runtime).
 * @internal
 */
const ORIGINAL_PORT = Symbol.for("@hex-di/core/OriginalPort");

/**
 * Runtime representation of a LazyPort.
 * @internal
 */
interface LazyPortRuntime<TName extends string, TPort extends Port<unknown, string>> {
  readonly __portName: `Lazy${TName}`;
  readonly [LAZY_PORT_BRAND]: true;
  readonly [ORIGINAL_PORT]: TPort;
}

/**
 * Internal helper to create a LazyPort with proper typing.
 * @internal
 */
function createLazyPortImpl<TName extends string, TPort extends Port<unknown, TName>>(
  runtime: LazyPortRuntime<TName, TPort>
): LazyPort<TPort>;
function createLazyPortImpl<TName extends string, TPort extends Port<unknown, TName>>(
  runtime: LazyPortRuntime<TName, TPort>
): object {
  return runtime;
}

/**
 * Creates a lazy port token for use in adapter requires.
 *
 * The graph will auto-generate the lazy adapter; you only provide the original adapter.
 * The factory receives a thunk `() => T` that resolves the dependency when called.
 *
 * @param port - The port to wrap lazily
 * @returns A lazy port that provides `() => T` instead of `T`
 *
 * @example
 * ```typescript
 * const LazyUserService = lazyPort(UserServicePort);
 *
 * const NotificationAdapter = createAdapter({
 *   provides: NotificationPort,
 *   requires: [LazyUserService] as const,
 *   factory: ({ LazyUserService }) => ({
 *     notify: (userId) => {
 *       const users = LazyUserService(); // Deferred resolution
 *       return users.getUser(userId);
 *     },
 *   }),
 * });
 * ```
 */
export function lazyPort<TName extends string, TPort extends Port<unknown, TName>>(
  port: TPort
): LazyPort<TPort> {
  if (isLazyPort(port)) {
    throw new TypeError(
      `ERROR[HEX026]: Cannot create a lazy port from an already-lazy port '${port.__portName}'. ` +
        `Use the original port instead: getOriginalPort(${port.__portName}).`
    );
  }

  const portName: TName = port.__portName;
  const lazyPortName: `Lazy${TName}` = `Lazy${portName}`;

  const runtime: LazyPortRuntime<TName, TPort> = Object.freeze({
    __portName: lazyPortName,
    [LAZY_PORT_BRAND]: true as const,
    [ORIGINAL_PORT]: port,
  });

  return createLazyPortImpl(runtime);
}

/**
 * Type guard that checks if an object has the lazy port brand symbol.
 * @internal
 */
function hasLazyBrand(obj: object): obj is { readonly [LAZY_PORT_BRAND]: true } {
  return LAZY_PORT_BRAND in obj;
}

/**
 * Type guard that checks if an object has the original port symbol.
 * @internal
 */
function hasOriginalPort<TPort extends Port<unknown, string>>(
  obj: object
): obj is { readonly [ORIGINAL_PORT]: TPort } {
  return ORIGINAL_PORT in obj;
}

/**
 * Extracts the original port from a lazy port at runtime.
 *
 * @param lazy - The lazy port
 * @returns The original port
 */
export function getOriginalPort<TPort extends Port<unknown, string>>(lazy: LazyPort<TPort>): TPort {
  if (hasOriginalPort<TPort>(lazy)) {
    return lazy[ORIGINAL_PORT];
  }
  throw new Error("ERROR[HEX019]: Invalid lazy port: missing original port reference");
}

/**
 * Runtime check if a port is a lazy port.
 *
 * @param port - The port to check
 * @returns `true` if the port is a lazy port
 *
 * @example
 * ```typescript
 * const lazy = lazyPort(UserServicePort);
 * isLazyPort(lazy); // true
 * isLazyPort(UserServicePort); // false
 * ```
 */
export function isLazyPort(port: Port<unknown, string>): port is LazyPort<Port<unknown, string>> {
  return hasLazyBrand(port) && port[LAZY_PORT_BRAND] === true;
}
