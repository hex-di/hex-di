/**
 * Runtime interface conformance checking.
 *
 * Verifies that an adapter factory output structurally conforms to the
 * port's expected interface by enumerating expected members and validating
 * their presence and type category.
 *
 * @see {@link https://hex-di.dev/spec/core/behaviors/10-contract-validation | BEH-CO-10-001}
 *
 * @packageDocumentation
 */

import type { ConformanceCheckResult, ContractViolation, PortMemberSpec } from "./types.js";

// =============================================================================
// checkConformance
// =============================================================================

/**
 * Checks whether an instance structurally conforms to a port's member specs.
 *
 * Algorithm:
 * 1. For each expected member in the port spec:
 *    a. Check if the member exists on the instance (`memberName in instance`)
 *    b. If missing, record a `MissingMethod` or `MissingProperty` violation
 *    c. If present, check the type category (`typeof instance[memberName]`)
 *    d. If the type category does not match, record a `TypeMismatch` violation
 * 2. If `violations.length > 0`, `conforms` is `false`
 * 3. `Object.freeze()` the result and all violation objects
 *
 * @param instance - The value produced by the adapter factory
 * @param memberSpecs - Array of expected member specifications
 * @returns A frozen `ConformanceCheckResult`
 */
export function checkConformance(
  instance: unknown,
  memberSpecs: ReadonlyArray<PortMemberSpec>
): ConformanceCheckResult {
  const violations: ContractViolation[] = [];

  // If instance is not an object, every member is missing
  if (instance === null || instance === undefined || typeof instance !== "object") {
    for (const spec of memberSpecs) {
      const violation: ContractViolation =
        spec.typeCategory === "function"
          ? Object.freeze({
              _tag: "MissingMethod" as const,
              memberName: spec.name,
              expected: spec.typeCategory,
              actual: instance === null ? "null" : typeof instance,
            })
          : Object.freeze({
              _tag: "MissingProperty" as const,
              memberName: spec.name,
              expected: spec.typeCategory,
              actual: instance === null ? "null" : typeof instance,
            });
      violations.push(violation);
    }
    return Object.freeze({
      conforms: false,
      violations: Object.freeze(violations),
    });
  }

  const obj = instance as Record<string, unknown>;

  for (const spec of memberSpecs) {
    if (!(spec.name in obj)) {
      // Member is missing
      const violation: ContractViolation =
        spec.typeCategory === "function"
          ? Object.freeze({
              _tag: "MissingMethod" as const,
              memberName: spec.name,
              expected: spec.typeCategory,
              actual: "undefined",
            })
          : Object.freeze({
              _tag: "MissingProperty" as const,
              memberName: spec.name,
              expected: spec.typeCategory,
              actual: "undefined",
            });
      violations.push(violation);
    } else {
      // Member present — check type category
      const actualType = typeof obj[spec.name];
      if (actualType !== spec.typeCategory) {
        violations.push(
          Object.freeze({
            _tag: "TypeMismatch" as const,
            memberName: spec.name,
            expected: spec.typeCategory,
            actual: actualType,
          })
        );
      }
    }
  }

  if (violations.length === 0) {
    return Object.freeze({
      conforms: true,
      violations: Object.freeze([]),
    });
  }

  return Object.freeze({
    conforms: false,
    violations: Object.freeze(violations),
  });
}

// =============================================================================
// Helpers: derive PortMemberSpec from port metadata
// =============================================================================

/**
 * Derives `PortMemberSpec[]` from a port's `methods` metadata.
 *
 * When a port specifies `methods: ["send", "validate"]`, each method name
 * becomes a `PortMemberSpec` with `typeCategory: "function"`. This is the
 * default derivation; the methods metadata only records method names so the
 * expected type is always `"function"`.
 *
 * @param methods - Array of method names from `PortMetadata.methods`
 * @returns Array of `PortMemberSpec` objects (frozen)
 */
export function deriveMethodSpecs(methods: readonly string[]): ReadonlyArray<PortMemberSpec> {
  return Object.freeze(
    methods.map(name =>
      Object.freeze({
        name,
        typeCategory: "function",
      })
    )
  );
}
