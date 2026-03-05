/**
 * Contract validation types for runtime interface conformance checking.
 *
 * These types support runtime verification that adapter factory outputs
 * structurally conform to the port's expected interface.
 *
 * @see {@link https://hex-di.dev/spec/core/behaviors/10-contract-validation | BEH-CO-10}
 *
 * @packageDocumentation
 */

// =============================================================================
// ContractViolation — Discriminated Union
// =============================================================================

/**
 * A single contract violation detected during conformance checking.
 *
 * Each violation has a unique `_tag` for discriminated union pattern matching:
 * - `"MissingMethod"` — Expected function member is absent
 * - `"TypeMismatch"` — Member exists but has wrong type category
 * - `"MissingProperty"` — Expected non-function member is absent
 */
export type ContractViolation =
  | {
      readonly _tag: "MissingMethod";
      readonly memberName: string;
      readonly expected: string;
      readonly actual: string;
    }
  | {
      readonly _tag: "TypeMismatch";
      readonly memberName: string;
      readonly expected: string;
      readonly actual: string;
    }
  | {
      readonly _tag: "MissingProperty";
      readonly memberName: string;
      readonly expected: string;
      readonly actual: string;
    };

// =============================================================================
// ConformanceCheckResult
// =============================================================================

/**
 * Result of a runtime interface conformance check.
 *
 * `conforms` is `true` when no violations are found.
 * Both the result and all violation objects are frozen.
 */
export interface ConformanceCheckResult {
  readonly conforms: boolean;
  readonly violations: ReadonlyArray<ContractViolation>;
}

// =============================================================================
// SignatureCheck
// =============================================================================

/**
 * Result of arity verification for a single method.
 */
export interface SignatureCheck {
  readonly memberName: string;
  readonly expectedArity: number;
  readonly actualArity: number;
  readonly arityMatch: boolean;
}

// =============================================================================
// PortMethodSpec
// =============================================================================

/**
 * Specification for a single method on a port's expected interface.
 *
 * Used by `checkSignatures` to verify function arity and optionally
 * return type category.
 */
export interface PortMethodSpec {
  readonly name: string;
  readonly arity: number;
  readonly isAsync: boolean;
  readonly returnTypeHint?: "void" | "promise" | "result" | "value";
}

// =============================================================================
// PortMemberSpec
// =============================================================================

/**
 * Specification for a single member (method or property) on a port's
 * expected interface. Used by `checkConformance` to verify structural
 * conformance.
 */
export interface PortMemberSpec {
  readonly name: string;
  /** The expected `typeof` category: "function", "string", "number", "object", etc. */
  readonly typeCategory: string;
}

// =============================================================================
// ContractCheckMode
// =============================================================================

/**
 * Configuration for contract checking behavior.
 *
 * - `"off"` — No contract checking (default, zero performance cost)
 * - `"warn"` — Log warnings for violations but do not throw
 * - `"strict"` — Throw `ContractViolationError` on violations
 */
export type ContractCheckMode = "off" | "warn" | "strict";
