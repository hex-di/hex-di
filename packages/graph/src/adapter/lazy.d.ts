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
 * The graph automatically generates lazy adapters - users only provide original adapters.
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
 *
 * // Build - only provide the ORIGINAL adapters
 * const container = GraphBuilder.create()
 *   .provide(UserServiceAdapter)
 *   .provide(NotificationServiceAdapter)
 *   .build();
 * ```
 *
 * @packageDocumentation
 */
import type { Port, InferService, InferPortName } from "@hex-di/ports";
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
export type LazyPort<TPort extends Port<unknown, string>> = Port<() => InferService<TPort>, `Lazy${InferPortName<TPort>}`> & {
    readonly [__lazyPortBrand]: true;
    readonly [__originalPort]: TPort;
};
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
export type IsLazyPort<TPort> = TPort extends {
    readonly [__lazyPortBrand]: true;
} ? true : false;
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
export type UnwrapLazyPort<TPort> = TPort extends {
    readonly [__originalPort]: infer TOriginal;
} ? TOriginal : never;
/**
 * Creates a lazy port token for use in adapter requires.
 *
 * @pure No side effects - same port input always produces the same frozen LazyPort object.
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
 *   requires: [LazyUserService] as const, // or inline: [lazyPort(UserServicePort)]
 *   factory: ({ LazyUserService }) => ({
 *     notify: (userId) => {
 *       const users = LazyUserService(); // Deferred resolution
 *       return users.getUser(userId);
 *     },
 *   }),
 * });
 * ```
 */
export declare function lazyPort<TName extends string, TPort extends Port<unknown, TName>>(port: TPort): LazyPort<TPort>;
/**
 * Extracts the original port from a lazy port at runtime.
 *
 * @param lazy - The lazy port
 * @returns The original port
 *
 * @internal
 */
export declare function getOriginalPort<TPort extends Port<unknown, string>>(lazy: LazyPort<TPort>): TPort;
/**
 * Runtime check if a port is a lazy port.
 *
 * @pure No side effects - same input always produces the same boolean result.
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
export declare function isLazyPort(port: Port<unknown, string>): port is LazyPort<Port<unknown, string>>;
export {};
