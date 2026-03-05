/**
 * Contract violation error with blame context integration.
 *
 * When a conformance or signature check fails, a `ContractViolationError`
 * is raised carrying full blame context: which adapter violated which port
 * contract, the specific violations, and the resolution path.
 *
 * @see {@link https://hex-di.dev/spec/core/behaviors/10-contract-validation | BEH-CO-10-003}
 *
 * @packageDocumentation
 */

import type { BlameContext } from "../errors/blame.js";
import { ContainerError } from "../errors/base.js";
import type { ContractViolation } from "./types.js";

// =============================================================================
// ContractViolationError
// =============================================================================

/**
 * Error raised when an adapter's factory output does not conform to the port's
 * expected interface contract.
 *
 * Carries `BlameContext` from the blame-aware error system (TG-03).
 * The error is frozen per INV-CO-6.
 */
export class ContractViolationError extends ContainerError {
  readonly _tag = "ContractViolationError" as const;
  readonly code = "CONTRACT_VIOLATION" as const;
  readonly isProgrammingError = true as const;

  /** The port whose contract was violated. */
  readonly portName: string;

  /** The adapter that produced the non-conforming instance. */
  readonly adapterName: string;

  /** All detected violations. */
  readonly violations: ReadonlyArray<ContractViolation>;

  /**
   * Creates a new `ContractViolationError`.
   *
   * @param portName - Name of the port whose contract was violated
   * @param adapterName - Name of the adapter that violated the contract
   * @param violations - Array of specific violations detected
   * @param blame - Blame context for error attribution
   */
  constructor(
    portName: string,
    adapterName: string,
    violations: ReadonlyArray<ContractViolation>,
    blame?: BlameContext
  ) {
    const details = formatViolationDetails(portName, violations);
    super(details, blame);

    this.portName = portName;
    this.adapterName = adapterName;
    this.violations = Object.freeze([...violations]);

    Object.freeze(this);
  }
}

// =============================================================================
// Formatting Helpers
// =============================================================================

/**
 * Formats a human-readable details string summarizing all violations.
 */
function formatViolationDetails(
  portName: string,
  violations: ReadonlyArray<ContractViolation>
): string {
  if (violations.length === 1) {
    const v = violations[0];
    switch (v._tag) {
      case "MissingMethod":
        return `Missing method '${v.memberName}' on adapter for port '${portName}'`;
      case "MissingProperty":
        return `Missing property '${v.memberName}' on adapter for port '${portName}'`;
      case "TypeMismatch":
        return `Type mismatch on '${v.memberName}' for port '${portName}': expected ${v.expected}, got ${v.actual}`;
    }
  }

  const summaries = violations.map(v => {
    switch (v._tag) {
      case "MissingMethod":
        return `missing '${v.memberName}'`;
      case "MissingProperty":
        return `missing '${v.memberName}'`;
      case "TypeMismatch":
        return `type mismatch on '${v.memberName}'`;
    }
  });

  return `${violations.length} contract violations on port '${portName}': ${summaries.join(", ")}`;
}
