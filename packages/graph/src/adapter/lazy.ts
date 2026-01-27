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
const LAZY_PORT_BRAND = Symbol.for("@hex-di/graph/LazyPort");

/**
 * Symbol for storing the original port (runtime).
 * @internal
 */
const ORIGINAL_PORT = Symbol.for("@hex-di/graph/OriginalPort");

/**
 * Runtime representation of a LazyPort.
 *
 * This interface describes the actual shape of lazy port objects at runtime.
 * The compile-time `LazyPort<TPort>` type uses phantom branded symbols, but
 * at runtime we use real `Symbol.for()` keys for the brand and original port.
 *
 * ## Why This Interface Exists
 *
 * The `LazyPort<TPort>` type uses `declare const` symbols for compile-time
 * nominal typing (phantom types). These symbols don't exist at runtime.
 * Instead, we use `Symbol.for()` keys which are real runtime values.
 *
 * This interface bridges that gap by describing what actually exists at runtime,
 * allowing type-safe access without casts.
 *
 * @internal
 */
interface LazyPortRuntime<TName extends string, TPort extends Port<unknown, string>> {
  readonly __portName: `Lazy${TName}`;
  readonly [LAZY_PORT_BRAND]: true;
  readonly [ORIGINAL_PORT]: TPort;
}

// =============================================================================
// CRITICAL: Type-Level vs Runtime Symbol Mismatch
// =============================================================================
//
// WARNING: The symbols used at the TYPE level are DIFFERENT from runtime!
//
// TYPE LEVEL (compile-time only, never exist at runtime):
//   - __lazyPortBrand: unique symbol (declared, never defined)
//   - __originalPort: unique symbol (declared, never defined)
//
// RUNTIME (actual symbols used in code):
//   - LAZY_PORT_BRAND = Symbol.for("@hex-di/graph/LazyPort")
//   - ORIGINAL_PORT = Symbol.for("@hex-di/graph/OriginalPort")
//
// This mismatch is INTENTIONAL and SAFE because:
// 1. Type-level brands are phantom types - they affect type checking only
// 2. Runtime code uses the real Symbol.for() keys
// 3. Type guards (isLazyPort, getOriginalPort) bridge both worlds safely
//
// DO NOT manually construct LazyPort objects:
//    const fake = { [LAZY_PORT_BRAND]: true }; // Will fail type checking
//
// ALWAYS use the lazyPort() function:
//    const lazy = lazyPort(UserServicePort);
//
// =============================================================================

/**
 * Internal helper to create a LazyPort with proper typing.
 *
 * ## SAFETY DOCUMENTATION
 *
 * The LazyPort type has branded properties `[__lazyPortBrand]` and `[__originalPort]`
 * that exist ONLY at the type level for nominal typing. At runtime, we use
 * `Symbol.for()` keys instead (`LAZY_PORT_BRAND` and `ORIGINAL_PORT`).
 *
 * This is safe because:
 * 1. **Brands are never accessed by external code**: The phantom symbols are used
 *    exclusively for compile-time type discrimination. No runtime code outside this
 *    module reads these properties via the phantom symbols.
 *
 * 2. **Runtime access uses real symbols**: This module's runtime functions
 *    (`getOriginalPort`, `isLazyPort`) use the real `Symbol.for()` keys.
 *
 * 3. **Immutability guaranteed**: `Object.freeze()` prevents any mutation,
 *    ensuring the runtime object cannot be modified to invalidate type assumptions.
 *
 * 4. **Phantom type pattern**: This follows the well-established phantom type
 *    pattern used in `@hex-di/ports` (see `createPort` function), where type
 *    parameters carry compile-time information without runtime representation.
 *
 * ## Type Safety via Overloads
 *
 * This function uses overloads to bridge the phantom type gap:
 * - The public signature returns `LazyPort<TPort>` (phantom-branded type)
 * - The implementation signature returns `object` (supertype of runtime object)
 *
 * This is type-safe because:
 * - `LazyPortRuntime` structurally contains all runtime properties
 * - The phantom brands are only used for compile-time discrimination
 * - Runtime code uses `Symbol.for()` keys via type guards
 *
 * @internal
 */
function createLazyPortImpl<TName extends string, TPort extends Port<unknown, TName>>(
  runtime: LazyPortRuntime<TName, TPort>
): LazyPort<TPort>;
function createLazyPortImpl<TName extends string, TPort extends Port<unknown, TName>>(
  runtime: LazyPortRuntime<TName, TPort>
): object {
  // The runtime object has the same semantic meaning as LazyPort<TPort> but uses
  // different symbol keys. This is the phantom type pattern - the type-level brands
  // exist only for TypeScript's nominal typing, not at runtime.
  return runtime;
}

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
export function lazyPort<TName extends string, TPort extends Port<unknown, TName>>(
  port: TPort
): LazyPort<TPort> {
  // Extract port name - TypeScript knows port.__portName has the literal type TName
  const portName: TName = port.__portName;

  // Build the lazy port name with the literal type preserved
  const lazyPortName: `Lazy${TName}` = `Lazy${portName}`;

  // Create the runtime object. Using explicit types ensures type preservation.
  // The object is then frozen for immutability.
  const runtime: LazyPortRuntime<TName, TPort> = Object.freeze({
    __portName: lazyPortName,
    [LAZY_PORT_BRAND]: true as const,
    [ORIGINAL_PORT]: port,
  });

  return createLazyPortImpl(runtime);
}

/**
 * Type guard that checks if an object has the lazy port brand symbol.
 *
 * This uses the `in` operator which TypeScript recognizes for type narrowing.
 * After this check passes, we know the object has the LAZY_PORT_BRAND property.
 *
 * @internal
 */
function hasLazyBrand(obj: object): obj is { readonly [LAZY_PORT_BRAND]: true } {
  return LAZY_PORT_BRAND in obj;
}

/**
 * Type guard that checks if an object has the original port symbol.
 *
 * This uses the `in` operator which TypeScript recognizes for type narrowing.
 * After this check passes, we know the object has the ORIGINAL_PORT property.
 *
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
 *
 * @internal
 */
export function getOriginalPort<TPort extends Port<unknown, string>>(lazy: LazyPort<TPort>): TPort {
  // Access the original port via the runtime symbol.
  // LazyPort<TPort> at the type level uses phantom symbols, but at runtime
  // the object was created by lazyPort() with the ORIGINAL_PORT symbol.
  // We use a type guard to safely narrow the type.
  if (hasOriginalPort<TPort>(lazy)) {
    return lazy[ORIGINAL_PORT];
  }
  // This should never happen if lazy was created by lazyPort()
  throw new Error("ERROR[HEX019]: Invalid lazy port: missing original port reference");
}

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
export function isLazyPort(port: Port<unknown, string>): port is LazyPort<Port<unknown, string>> {
  // Check for the runtime brand symbol using a type guard.
  // The hasLazyBrand guard narrows the type to include the symbol property.
  return hasLazyBrand(port) && port[LAZY_PORT_BRAND] === true;
}
