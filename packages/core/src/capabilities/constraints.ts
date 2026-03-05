/**
 * Capability Constraints Module
 *
 * Provides runtime utility functions for creating and inspecting
 * constrained capabilities.
 *
 * @packageDocumentation
 */

import type { MethodConstraint, ConstrainedCapability } from "./types.js";

// =============================================================================
// Method Constraint Factory
// =============================================================================

/**
 * Create a frozen method constraint.
 *
 * @param tag - A discriminator tag for the constraint type (e.g., "permission", "role")
 * @param description - Human-readable description of the constraint
 * @returns A frozen MethodConstraint object
 */
export function methodConstraint(tag: string, description: string): MethodConstraint {
  return Object.freeze({ _tag: tag, description });
}

// =============================================================================
// Constrained Capability Factory
// =============================================================================

/**
 * Internal runtime shape for a constrained capability.
 * The phantom type properties (unique symbols) have no runtime representation.
 * @internal
 */
interface ConstrainedCapabilityRuntime {
  readonly _brand: "ConstrainedCapability";
  readonly name: string;
  readonly _constraints: Record<string, MethodConstraint | undefined>;
}

/**
 * Creates a ConstrainedCapability value with phantom type parameters.
 *
 * ## SAFETY DOCUMENTATION
 *
 * The ConstrainedCapability type has branded properties (unique symbols) that
 * exist at the type level for nominal typing. This function uses overloads
 * to bridge the gap between the runtime representation and the phantom-branded type.
 *
 * This is safe because:
 * 1. **Brands are for type discrimination**: The unique symbols are used
 *    exclusively for compile-time type discrimination.
 * 2. **Immutability guaranteed**: `Object.freeze()` prevents any mutation.
 * 3. **Single creation point**: All constrained capabilities flow through this function.
 *
 * @internal
 */
function createConstrainedCapabilityImpl<
  TName extends string,
  TService,
  TConstraints extends Partial<Record<keyof TService & string, MethodConstraint>>,
>(runtime: ConstrainedCapabilityRuntime): ConstrainedCapability<TName, TService, TConstraints>;
function createConstrainedCapabilityImpl(runtime: ConstrainedCapabilityRuntime): object {
  return Object.freeze(runtime);
}

/**
 * Create a constrained capability from a name and constraint map.
 *
 * The service type is carried as a phantom type parameter and has
 * no runtime representation. Supply `TName` and `TService` explicitly;
 * `TConstraints` is inferred from the constraints argument.
 *
 * @typeParam TName - The literal string name of the capability
 * @typeParam TService - The service interface type (phantom)
 * @param name - The capability name
 * @param constraints - A map of method names to their constraints
 * @returns A frozen ConstrainedCapability token
 *
 * @example
 * ```typescript
 * const cap = constrainCapability<"Payment", PaymentService>(
 *   "Payment",
 *   { charge: methodConstraint("permission", "billing:charge") },
 * );
 * ```
 */
export function constrainCapability<TName extends string, TService>(
  name: TName,
  constraints: Partial<Record<keyof TService & string, MethodConstraint>>
): ConstrainedCapability<TName, TService, typeof constraints> {
  const runtime: ConstrainedCapabilityRuntime = {
    _brand: "ConstrainedCapability",
    name,
    _constraints: constraints,
  };

  return createConstrainedCapabilityImpl<TName, TService, typeof constraints>(runtime);
}

// =============================================================================
// Constrained Methods Inspector
// =============================================================================

/**
 * A method-constraint pair extracted from a constrained capability.
 */
interface ConstrainedMethodEntry {
  readonly method: string;
  readonly constraint: MethodConstraint;
}

/**
 * List all constrained methods of a capability.
 *
 * @param capability - A constrained capability to inspect
 * @returns A frozen array of method-constraint pairs
 */
export function getConstrainedMethods(
  capability: ConstrainedCapability<string, unknown, Record<string, MethodConstraint | undefined>>
): ReadonlyArray<ConstrainedMethodEntry> {
  const constraints = capability._constraints;
  const entries: Array<ConstrainedMethodEntry> = [];

  for (const [method, constraint] of Object.entries(constraints)) {
    if (constraint !== undefined) {
      entries.push({ method, constraint });
    }
  }

  return Object.freeze(entries);
}
