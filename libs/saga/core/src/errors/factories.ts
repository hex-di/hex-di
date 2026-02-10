/**
 * Error Factory Functions
 *
 * Pure factory functions for creating SagaError variants.
 * Each factory returns a frozen plain object with the correct _tag discriminant.
 *
 * @packageDocumentation
 */

import type {
  SagaErrorBase,
  StepFailedError,
  CompensationFailedError,
  TimeoutError,
  CancelledError,
  ValidationFailedError,
  PortNotFoundError,
  PersistenceFailedError,
} from "./types.js";

// =============================================================================
// Base fields helper
// =============================================================================

interface SagaErrorBaseInput {
  readonly executionId: string;
  readonly sagaName: string;
  readonly stepName: string;
  readonly stepIndex: number;
  readonly message: string;
  readonly completedSteps: readonly string[];
  readonly compensatedSteps: readonly string[];
}

function createBase(input: SagaErrorBaseInput): SagaErrorBase {
  return {
    executionId: input.executionId,
    sagaName: input.sagaName,
    stepName: input.stepName,
    stepIndex: input.stepIndex,
    message: input.message,
    completedSteps: input.completedSteps,
    compensatedSteps: input.compensatedSteps,
  };
}

// =============================================================================
// Factory Functions
// =============================================================================

export function createStepFailedError<TCause>(
  base: SagaErrorBaseInput,
  cause: TCause
): StepFailedError<TCause> {
  return Object.freeze<StepFailedError<TCause>>({
    ...createBase(base),
    _tag: "StepFailed",
    cause,
  });
}

export function createCompensationFailedError<TCause>(
  base: SagaErrorBaseInput,
  cause: TCause,
  compensationCause: unknown,
  failedCompensationSteps: readonly string[]
): CompensationFailedError<TCause> {
  return Object.freeze<CompensationFailedError<TCause>>({
    ...createBase(base),
    _tag: "CompensationFailed",
    cause,
    compensationCause,
    failedCompensationSteps,
  });
}

export function createTimeoutError(base: SagaErrorBaseInput, timeoutMs: number): TimeoutError {
  return Object.freeze<TimeoutError>({
    ...createBase(base),
    _tag: "Timeout",
    timeoutMs,
  });
}

export function createCancelledError(base: SagaErrorBaseInput): CancelledError {
  return Object.freeze<CancelledError>({
    ...createBase(base),
    _tag: "Cancelled",
  });
}

export function createValidationFailedError(
  base: SagaErrorBaseInput,
  cause: unknown
): ValidationFailedError {
  return Object.freeze<ValidationFailedError>({
    ...createBase(base),
    _tag: "ValidationFailed",
    cause,
  });
}

export function createPortNotFoundError(
  base: SagaErrorBaseInput,
  portName: string
): PortNotFoundError {
  return Object.freeze<PortNotFoundError>({
    ...createBase(base),
    _tag: "PortNotFound",
    portName,
  });
}

export function createPersistenceFailedError(
  base: SagaErrorBaseInput,
  operation: "save" | "load" | "delete" | "update",
  cause: unknown
): PersistenceFailedError {
  return Object.freeze<PersistenceFailedError>({
    ...createBase(base),
    _tag: "PersistenceFailed",
    operation,
    cause,
  });
}
