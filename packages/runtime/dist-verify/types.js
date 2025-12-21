/**
 * Container and Scope branded types for @hex-di/runtime.
 *
 * These types define the core container and scope interfaces with nominal typing
 * via unique symbol brands. This ensures that:
 * - Containers and Scopes cannot be confused with structurally similar objects
 * - Different TProvides type parameters produce incompatible types
 * - Container and Scope are distinct types (not interchangeable)
 *
 * @packageDocumentation
 */
import { INTERNAL_ACCESS } from "./inspector-symbols.js";
// =============================================================================
// Brand Symbols
// =============================================================================
/**
 * Unique symbol used for nominal typing of Container types.
 *
 * This symbol is exported for use in the container implementation.
 * It provides true nominal typing, ensuring that Container instances
 * are distinct from structurally similar objects.
 *
 * @remarks
 * The `unique symbol` type guarantees that this brand cannot be
 * accidentally recreated elsewhere, providing true nominal typing.
 * This follows the same pattern as Port and Adapter branding.
 *
 * @internal - Exported for implementation use only, not for external consumers.
 */
export const ContainerBrand = Symbol("hex-di.Container");
/**
 * Unique symbol used for nominal typing of Scope types.
 *
 * This symbol is exported for use in the container implementation.
 * It provides true nominal typing, ensuring that Scope instances
 * are distinct from structurally similar objects and from Container instances.
 *
 * @remarks
 * The `unique symbol` type guarantees that this brand cannot be
 * accidentally recreated elsewhere, providing true nominal typing.
 * This follows the same pattern as Port and Adapter branding.
 *
 * @internal - Exported for implementation use only, not for external consumers.
 */
export const ScopeBrand = Symbol("hex-di.Scope");
/**
 * Unique symbol used for nominal typing of ChildContainer types.
 *
 * This symbol is exported for use in the container implementation.
 * It provides true nominal typing, ensuring that ChildContainer instances
 * are distinct from Container instances and structurally similar objects.
 *
 * @remarks
 * The `unique symbol` type guarantees that this brand cannot be
 * accidentally recreated elsewhere, providing true nominal typing.
 * This follows the same pattern as Container and Scope branding.
 *
 * @internal - Exported for implementation use only, not for external consumers.
 */
export const ChildContainerBrand = Symbol("hex-di.ChildContainer");
