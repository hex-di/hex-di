/**
 * Contract validation module.
 *
 * Runtime interface conformance checks when an adapter binds to a port,
 * with blame-aware error attribution when contracts are violated.
 *
 * Behavioral port specifications: pre/postconditions and invariants
 * with runtime verification via Proxy interception.
 *
 * @packageDocumentation
 */

// Types
export type {
  ContractViolation,
  ConformanceCheckResult,
  SignatureCheck,
  PortMethodSpec,
  PortMemberSpec,
  ContractCheckMode,
} from "./types.js";

// Conformance checking
export { checkConformance, deriveMethodSpecs } from "./conformance.js";

// Signature checking
export { checkSignatures } from "./signatures.js";

// Errors
export { ContractViolationError } from "./errors.js";

// Behavioral port specifications
export type {
  Predicate,
  NamedCondition,
  MethodContract,
  BehavioralPortSpec,
  StateInvariant,
  StatefulPortSpec,
  VerificationConfig,
  VerificationViolation,
} from "./behavioral.js";

// Runtime behavioral verification
export {
  wrapWithVerification,
  PreconditionViolationError,
  PostconditionViolationError,
  InvariantViolationError,
} from "./verification.js";
