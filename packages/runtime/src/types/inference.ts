/**
 * Type inference utilities for Container and Scope types.
 *
 * These utility types extract type information from Container and Scope types,
 * enabling type-safe generic programming with DI containers.
 *
 * @packageDocumentation
 */

import type { Port, InferService } from "@hex-di/core";
import type { Container } from "./container.js";
import type { Scope } from "./scope.js";
import type { ContainerPhase } from "./options.js";

// =============================================================================
// Type Utility Functions
// =============================================================================

/**
 * Extracts the TProvides type parameter from a Container type.
 *
 * Uses conditional type inference to extract the port union from Container.
 * Returns `never` if the input type is not a Container.
 *
 * @typeParam T - The type to extract TProvides from
 *
 * @returns The TProvides type parameter, or `never` if T is not a Container
 *
 * @remarks
 * This utility is useful for:
 * - Generic functions that need to work with Container types
 * - Type-level validation that a container provides certain ports
 * - Extracting the available ports from an existing container type
 *
 * @see {@link InferScopeProvides} - Similar utility for Scope types
 * @see {@link Container} - The Container type this utility extracts from
 *
 * @example Basic extraction
 * ```typescript
 * type MyContainer = Container<typeof LoggerPort | typeof DatabasePort>;
 * type Provides = InferContainerProvides<MyContainer>;
 * // typeof LoggerPort | typeof DatabasePort
 * ```
 *
 * @example Child container includes extends
 * ```typescript
 * type ChildContainer = Container<ParentPorts, ExtendPorts>;
 * type Provides = InferContainerProvides<ChildContainer>;
 * // ParentPorts (TProvides only, use InferContainerEffectiveProvides for full)
 * ```
 */
export type InferContainerProvides<T> =
  T extends Container<infer P, infer _E, infer _A, infer _Ph> ? P : never;

/**
 * Extracts the effective provides (TProvides | TExtends) from a Container type.
 *
 * For root containers, this is the same as TProvides.
 * For child containers, this includes both inherited and extended ports.
 *
 * @typeParam T - The Container type to extract from
 */
export type InferContainerEffectiveProvides<T> =
  T extends Container<infer P, infer E, infer _A, infer _Ph> ? P | E : never;

/**
 * Extracts the TProvides type parameter from a Scope type.
 *
 * Uses conditional type inference to extract the port union from Scope.
 * Returns `never` if the input type is not a Scope.
 *
 * @typeParam T - The type to extract TProvides from
 *
 * @returns The TProvides type parameter, or `never` if T is not a Scope
 *
 * @remarks
 * This utility is useful for:
 * - Generic functions that need to work with Scope types
 * - Type-level validation that a scope provides certain ports
 * - Extracting the available ports from an existing scope type
 *
 * @see {@link InferContainerProvides} - Similar utility for Container types
 * @see {@link Scope} - The Scope type this utility extracts from
 *
 * @example Basic extraction
 * ```typescript
 * type MyScope = Scope<typeof LoggerPort | typeof DatabasePort>;
 * type Provides = InferScopeProvides<MyScope>;
 * // typeof LoggerPort | typeof DatabasePort
 * ```
 *
 * @example Non-scope type returns never
 * ```typescript
 * type NotScope = { foo: string };
 * type Provides = InferScopeProvides<NotScope>;
 * // never
 * ```
 */
export type InferScopeProvides<T> = T extends Scope<infer P, infer _A, infer _Ph> ? P : never;

/**
 * Type predicate that returns `true` if a port is resolvable from a container or scope.
 *
 * Checks whether TPort extends the effective provides of the given container or scope type.
 * Works with both Container and Scope types.
 *
 * @typeParam TContainer - A Container or Scope type to check against
 * @typeParam TPort - The port type to check for resolvability
 *
 * @returns `true` if TPort is in TContainer's effective provides, `false` otherwise
 *
 * @remarks
 * For Container types, this checks against `TProvides | TExtends`.
 * For Scope types, this checks against `TProvides`.
 *
 * @see {@link InferContainerEffectiveProvides} - Extracts TProvides | TExtends from Container
 * @see {@link InferScopeProvides} - Extracts TProvides from Scope
 * @see {@link ServiceFromContainer} - Extracts service type if resolvable
 *
 * @example Container with resolvable port
 * ```typescript
 * type MyContainer = Container<typeof LoggerPort | typeof DatabasePort>;
 *
 * type CanResolveLogger = IsResolvable<MyContainer, typeof LoggerPort>;
 * // true
 *
 * type CanResolveConfig = IsResolvable<MyContainer, typeof ConfigPort>;
 * // false
 * ```
 *
 * @example Works with Scope types
 * ```typescript
 * type MyScope = Scope<typeof LoggerPort>;
 *
 * type CanResolveLogger = IsResolvable<MyScope, typeof LoggerPort>;
 * // true
 * ```
 */
export type IsResolvable<TContainer, TPort extends Port<unknown, string>> = TPort extends
  | InferContainerEffectiveProvides<TContainer>
  | InferScopeProvides<TContainer>
  ? true
  : false;

/**
 * Extracts the service type for a given port from a container or scope.
 *
 * Returns the service type (via InferService) if the port is resolvable,
 * or `never` if the port is not in the container's or scope's effective provides.
 *
 * @typeParam TContainer - A Container or Scope type to extract from
 * @typeParam TPort - The port type to get the service type for
 *
 * @returns The service type if TPort is resolvable, `never` otherwise
 *
 * @remarks
 * This utility combines IsResolvable and InferService to provide a safe way
 * to extract service types. It works with both Container and Scope types.
 *
 * @see {@link IsResolvable} - Checks if port is in effective provides
 * @see {@link InferService} - Extracts service type from port
 * @see {@link InferContainerEffectiveProvides} - Extracts TProvides | TExtends from Container
 * @see {@link InferScopeProvides} - Extracts TProvides from Scope
 *
 * @example Resolvable port returns service type
 * ```typescript
 * interface Logger { log(msg: string): void; }
 * const LoggerPort = port<Logger>()({ name: 'Logger' });
 *
 * type MyContainer = Container<typeof LoggerPort>;
 * type LoggerService = ServiceFromContainer<MyContainer, typeof LoggerPort>;
 * // Logger
 * ```
 *
 * @example Non-resolvable port returns never
 * ```typescript
 * type MyContainer = Container<typeof LoggerPort>;
 * type ConfigService = ServiceFromContainer<MyContainer, typeof ConfigPort>;
 * // never
 * ```
 *
 * @example Works with child containers
 * ```typescript
 * type ChildContainer = Container<ParentPorts, ExtendPorts>;
 * type ExtendService = ServiceFromContainer<ChildContainer, typeof ExtendPort>;
 * // ExtendService type
 * ```
 */
export type ServiceFromContainer<TContainer, TPort extends Port<unknown, string>> =
  IsResolvable<TContainer, TPort> extends true ? InferService<TPort> : never;

/**
 * Checks if a container is a root container (TExtends = never).
 *
 * @typeParam T - The Container type to check
 * @returns `true` if root container, `false` if child container
 */
// NOTE: Using [E] extends [never] to prevent distribution over the never type.
export type IsRootContainer<T> =
  T extends Container<infer _P, infer E, infer _A, infer _Ph>
    ? [E] extends [never]
      ? true
      : false
    : false;

/**
 * Checks if a container is a child container (TExtends is not never).
 *
 * @typeParam T - The Container type to check
 * @returns `true` if child container, `false` if root container
 */
// NOTE: Using [E] extends [never] to prevent distribution over the never type.
export type IsChildContainer<T> =
  T extends Container<infer _P, infer E, infer _A, infer _Ph>
    ? [E] extends [never]
      ? false
      : true
    : false;
