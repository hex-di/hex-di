/**
 * Method signature compatibility verification.
 *
 * Performs arity verification on function members by comparing
 * `Function.prototype.length` against expected arity from port method specs.
 *
 * @see {@link https://hex-di.dev/spec/core/behaviors/10-contract-validation | BEH-CO-10-002}
 *
 * @packageDocumentation
 */

import type { SignatureCheck, PortMethodSpec } from "./types.js";

// =============================================================================
// checkSignatures
// =============================================================================

/**
 * Verifies arity of function members on an instance against port method specs.
 *
 * Algorithm:
 * 1. For each method spec:
 *    a. Access the corresponding member on the instance
 *    b. If the member is a function, compare `fn.length` to `expectedArity`
 *    c. Record whether the arity matches
 * 2. Return the array of `SignatureCheck` results (frozen)
 *
 * Arity mismatches are informational; the caller decides whether to treat
 * them as warnings or errors based on the contract check mode.
 *
 * @param instance - The resolved service instance (must be an object)
 * @param methodSpecs - Array of method specifications with expected arity
 * @returns Frozen array of `SignatureCheck` results
 */
export function checkSignatures(
  instance: Record<string, unknown>,
  methodSpecs: ReadonlyArray<PortMethodSpec>
): ReadonlyArray<SignatureCheck> {
  const results: SignatureCheck[] = [];

  for (const spec of methodSpecs) {
    const member = instance[spec.name];
    if (typeof member !== "function") {
      // Skip non-function members; conformance check handles missing methods
      continue;
    }

    const actualArity = member.length;
    results.push(
      Object.freeze({
        memberName: spec.name,
        expectedArity: spec.arity,
        actualArity,
        arityMatch: actualArity === spec.arity,
      })
    );
  }

  return Object.freeze(results);
}
