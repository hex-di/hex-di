/**
 * Brand symbols for nominal typing of Container and Scope types.
 *
 * These symbols provide true nominal typing, ensuring that Container and Scope
 * instances are distinct from structurally similar objects.
 *
 * @packageDocumentation
 */
// @ts-nocheck

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
export const ContainerBrand: unique symbol = Symbol("hex-di.Container");

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
export const ScopeBrand: unique symbol = Symbol("hex-di.Scope");
