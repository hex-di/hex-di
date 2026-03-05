/**
 * Type inference utilities for Container and Scope types.
 *
 * These utility types extract type information from Container and Scope types,
 * enabling type-safe generic programming with DI containers.
 *
 * @packageDocumentation
 */

import type { Port, InferService } from "@hex-di/core";
import { ContainerBrand } from "./brands.js";
import { ScopeBrand } from "./brands.js";

// =============================================================================
// Type Utility Functions
// =============================================================================

/**
 * Extracts the TProvides type parameter from a Container type.
 *
 * Uses the ContainerBrand property to extract the port union from Container.
 * Works with both active and disposed containers since both have the brand.
 * Returns `never` if the input type is not a Container.
 *
 * @typeParam T - The type to extract TProvides from
 */
export type InferContainerProvides<T> = T extends {
  readonly [ContainerBrand]: { provides: infer P };
}
  ? P extends Port<string, unknown>
    ? P
    : never
  : never;

/**
 * Extracts the effective provides (TProvides | TExtends) from a Container type.
 *
 * For root containers, this is the same as TProvides.
 * For child containers, this includes both inherited and extended ports.
 *
 * @typeParam T - The Container type to extract from
 */
export type InferContainerEffectiveProvides<T> = T extends {
  readonly [ContainerBrand]: { provides: infer P; extends: infer E };
}
  ? (P extends Port<string, unknown> ? P : never) | (E extends Port<string, unknown> ? E : never)
  : never;

/**
 * Extracts the TProvides type parameter from a Scope type.
 *
 * Uses the ScopeBrand property to extract the port union from Scope.
 * Works with both active and disposed scopes since both have the brand.
 * Returns `never` if the input type is not a Scope.
 *
 * @typeParam T - The type to extract TProvides from
 */
export type InferScopeProvides<T> = T extends { readonly [ScopeBrand]: { provides: infer P } }
  ? P extends Port<string, unknown>
    ? P
    : never
  : never;

/**
 * Type predicate that returns `true` if a port is resolvable from a container or scope.
 *
 * @typeParam TContainer - A Container or Scope type to check against
 * @typeParam TPort - The port type to check for resolvability
 */
export type IsResolvable<TContainer, TPort extends Port<string, unknown>> = TPort extends
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
 */
export type ServiceFromContainer<TContainer, TPort extends Port<string, unknown>> =
  IsResolvable<TContainer, TPort> extends true ? InferService<TPort> : never;

/**
 * Checks if a container is a root container (TExtends = never).
 *
 * @typeParam T - The Container type to check
 * @returns `true` if root container, `false` if child container
 */
// NOTE: Using [E] extends [never] to prevent distribution over the never type.
export type IsRootContainer<T> = T extends { readonly [ContainerBrand]: { extends: infer E } }
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
export type IsChildContainer<T> = T extends { readonly [ContainerBrand]: { extends: infer E } }
  ? [E] extends [never]
    ? false
    : true
  : false;
