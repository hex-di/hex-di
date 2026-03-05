/**
 * Capability Types Module
 *
 * Provides type-level unification of port injection and guard policies.
 * Ports ARE capabilities. This module defines capability tokens, constrained
 * capabilities, and type-level utilities for checking capability availability.
 *
 * @packageDocumentation
 */

// =============================================================================
// Brand Symbols
// =============================================================================

/**
 * Unique symbol for Capability branding.
 * Exists purely at the type level for nominal typing.
 * @internal
 */
declare const __capabilityBrand: unique symbol;

/**
 * Unique symbol for ConstrainedCapability branding.
 * Exists purely at the type level for nominal typing.
 * @internal
 */
declare const __constrainedCapabilityBrand: unique symbol;

/**
 * Unique symbol for carrying the service phantom type.
 * @internal
 */
declare const __servicePhantom: unique symbol;

/**
 * Unique symbol for carrying constraints at the type level.
 * @internal
 */
declare const __constraintsPhantom: unique symbol;

// =============================================================================
// Method Constraint
// =============================================================================

/**
 * A constraint on a single method of a capability.
 *
 * Method constraints describe policy restrictions that must be satisfied
 * before a method can be invoked.
 */
export interface MethodConstraint {
  readonly _tag: string;
  readonly description: string;
}

// =============================================================================
// Capability Constraints
// =============================================================================

/**
 * Map of method names to their constraint predicates.
 *
 * @typeParam TService - The service interface whose methods can be constrained
 */
export type CapabilityConstraints<TService> = {
  readonly [K in keyof TService]?: MethodConstraint;
};

// =============================================================================
// Capability Type
// =============================================================================

/**
 * A capability token - a port reference IS a capability.
 *
 * Capabilities are branded tokens that carry a name and a phantom service type.
 * They serve as compile-time contracts for what a component can do.
 *
 * @typeParam TName - The literal string name of this capability
 * @typeParam TService - The service interface type (phantom type)
 */
export interface Capability<TName extends string, TService> {
  readonly [__capabilityBrand]: TName;
  readonly [__servicePhantom]: TService;
  readonly name: TName;
}

// =============================================================================
// Constrained Capability Type
// =============================================================================

/**
 * A constrained capability - a capability with policy restrictions.
 *
 * Constrained capabilities carry additional type-level information about
 * which methods have policy constraints that must be satisfied.
 *
 * @typeParam TName - The literal string name of this capability
 * @typeParam TService - The service interface type (phantom type)
 * @typeParam TConstraints - Map of method names to their constraints
 */
export interface ConstrainedCapability<TName extends string, TService, TConstraints> {
  readonly [__constrainedCapabilityBrand]: TName;
  readonly [__servicePhantom]: TService;
  readonly [__constraintsPhantom]: TConstraints;
  readonly name: TName;
  readonly _brand: "ConstrainedCapability";
  readonly _constraints: TConstraints;
}

// =============================================================================
// Type-Level Utilities
// =============================================================================

/**
 * Extract the service type from a capability.
 *
 * @typeParam C - A Capability or ConstrainedCapability type
 * @returns The service interface type, or `never` if C is not a capability
 */
export type ServiceOf<C> = C extends { readonly [__servicePhantom]: infer S } ? S : never;

/**
 * Extract the name from a capability.
 *
 * @typeParam C - A Capability or ConstrainedCapability type
 * @returns The name literal type, or `never` if C is not a capability
 */
export type NameOf<C> =
  C extends Capability<infer N, unknown>
    ? N
    : C extends ConstrainedCapability<infer N, unknown, unknown>
      ? N
      : never;

/**
 * Check if a capability has constraints.
 *
 * @typeParam C - A Capability or ConstrainedCapability type
 * @returns `true` if C is a ConstrainedCapability, `false` otherwise
 */
export type IsConstrained<C> =
  C extends ConstrainedCapability<string, unknown, unknown> ? true : false;

/**
 * Extract constraints from a constrained capability.
 *
 * @typeParam C - A ConstrainedCapability type
 * @returns The constraints map, or `never` if C is not constrained
 */
export type ConstraintsOf<C> =
  C extends ConstrainedCapability<string, unknown, infer Cs> ? Cs : never;

// =============================================================================
// Capability Availability Check
// =============================================================================

/**
 * Helper type that finds missing capabilities from a required list
 * against a provided list.
 *
 * @internal
 */
type FindMissing<
  Required extends ReadonlyArray<Capability<string, unknown>>,
  Provided extends ReadonlyArray<Capability<string, unknown>>,
> = {
  [I in keyof Required]: Required[I] extends Capability<infer N, unknown>
    ? N extends NameOf<Provided[number]>
      ? never
      : { readonly _error: "MISSING_CAPABILITY"; readonly name: N }
    : never;
}[number];

/**
 * Verify that all capabilities in a requirements list are available.
 *
 * Returns `true` if all required capabilities are provided, or an error type
 * describing the missing capabilities.
 *
 * @typeParam Required - Tuple of required capability tokens
 * @typeParam Provided - Tuple of provided capability tokens
 * @returns `true` if satisfied, or `{ _error: "MISSING_CAPABILITY"; name: string }` for each missing capability
 */
export type CapabilitiesAvailable<
  Required extends ReadonlyArray<Capability<string, unknown>>,
  Provided extends ReadonlyArray<Capability<string, unknown>>,
> =
  Extract<FindMissing<Required, Provided>, { readonly _error: string }> extends never
    ? true
    : Extract<FindMissing<Required, Provided>, { readonly _error: string }>;
