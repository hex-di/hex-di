/**
 * Saga Error Types
 *
 * Defines the SagaError tagged union and all error variants.
 * All saga failures are represented as tagged union members with
 * full diagnostic context.
 *
 * @packageDocumentation
 */

// =============================================================================
// SagaErrorBase - shared fields across all variants
// =============================================================================

/**
 * Base interface shared by all SagaError variants.
 * Provides diagnostic context for every saga failure.
 */
export interface SagaErrorBase {
  /** Unique execution ID for correlating with tracing spans and persistence records */
  readonly executionId: string;
  /** Name of the saga definition that failed */
  readonly sagaName: string;
  /** Name of the step that caused the failure */
  readonly stepName: string;
  /** Zero-based position of the failing step in the saga */
  readonly stepIndex: number;
  /** Human-readable error message describing the failure */
  readonly message: string;
  /** Names of steps that completed successfully before the failure */
  readonly completedSteps: readonly string[];
  /** Names of steps that were successfully compensated after the failure */
  readonly compensatedSteps: readonly string[];
}

// =============================================================================
// Error Variants
// =============================================================================

/** A forward step failed after retries exhausted; compensation succeeded fully */
export interface StepFailedError<TCause = unknown> extends SagaErrorBase {
  readonly _tag: "StepFailed";
  readonly cause: TCause;
}

/** A compensation handler itself failed -- system is in an inconsistent state */
export interface CompensationFailedError<TCause = unknown> extends SagaErrorBase {
  readonly _tag: "CompensationFailed";
  /** The original error that triggered the compensation chain */
  readonly cause: TCause;
  /** The error thrown by the compensation handler */
  readonly compensationCause: unknown;
  /** Steps whose compensation failed (includes the failing step) */
  readonly failedCompensationSteps: readonly string[];
}

/** A step or the entire saga exceeded its configured timeout */
export interface TimeoutError extends SagaErrorBase {
  readonly _tag: "Timeout";
  /** The configured timeout in milliseconds that was exceeded */
  readonly timeoutMs: number;
}

/** The saga was explicitly cancelled via the runtime API */
export interface CancelledError extends SagaErrorBase {
  readonly _tag: "Cancelled";
}

/** Input validation failed before any steps ran */
export interface ValidationFailedError extends SagaErrorBase {
  readonly _tag: "ValidationFailed";
  /** Validation error details */
  readonly cause: unknown;
}

/** A step references a port not registered in the container */
export interface PortNotFoundError extends SagaErrorBase {
  readonly _tag: "PortNotFound";
  /** The port name that was not found */
  readonly portName: string;
}

/** The persistence layer failed to save or load saga state */
export interface PersistenceFailedError extends SagaErrorBase {
  readonly _tag: "PersistenceFailed";
  /** The persistence operation that failed */
  readonly operation: "save" | "load" | "delete" | "update";
  /** The underlying persistence error */
  readonly cause: unknown;
}

// =============================================================================
// SagaError Tagged Union
// =============================================================================

/** Tagged union of all saga error variants */
export type SagaError<TCause = unknown> =
  | StepFailedError<TCause>
  | CompensationFailedError<TCause>
  | TimeoutError
  | CancelledError
  | ValidationFailedError
  | PortNotFoundError
  | PersistenceFailedError;

// =============================================================================
// SagaSuccess
// =============================================================================

/** Successful saga execution result */
export interface SagaSuccess<TOutput> {
  readonly output: TOutput;
  readonly executionId: string;
}

// =============================================================================
// ManagementError
// =============================================================================

/** Tagged union for management operation failures */
export type ManagementError =
  | {
      readonly _tag: "ExecutionNotFound";
      readonly message: string;
      readonly executionId: string;
    }
  | {
      readonly _tag: "InvalidOperation";
      readonly message: string;
      readonly executionId: string;
      readonly currentState: SagaStatusType;
      readonly attemptedOperation: string;
    }
  | {
      readonly _tag: "PersistenceFailed";
      readonly message: string;
      readonly operation: string;
      readonly cause: unknown;
    };

// =============================================================================
// SagaStatus
// =============================================================================

export type SagaStatusType =
  | "pending"
  | "running"
  | "compensating"
  | "completed"
  | "failed"
  | "cancelled";

export type SagaStatus =
  | {
      readonly state: "pending";
      readonly executionId: string;
      readonly sagaName: string;
      readonly createdAt: number;
    }
  | {
      readonly state: "running";
      readonly executionId: string;
      readonly sagaName: string;
      readonly currentStepIndex: number;
      readonly currentStepName: string;
      readonly completedSteps: ReadonlyArray<string>;
      readonly startedAt: number;
    }
  | {
      readonly state: "compensating";
      readonly executionId: string;
      readonly sagaName: string;
      readonly failedStepName: string;
      readonly failedStepIndex: number;
      readonly compensatingStepIndex: number;
      readonly compensatingStepName: string;
      readonly compensatedSteps: ReadonlyArray<string>;
      readonly startedAt: number;
      readonly error: SagaError<unknown>;
    }
  | {
      readonly state: "completed";
      readonly executionId: string;
      readonly sagaName: string;
      readonly completedSteps: ReadonlyArray<string>;
      readonly startedAt: number;
      readonly completedAt: number;
      readonly durationMs: number;
    }
  | {
      readonly state: "failed";
      readonly executionId: string;
      readonly sagaName: string;
      readonly error: SagaError<unknown>;
      readonly failedStepName: string;
      readonly compensated: boolean;
      readonly compensatedSteps: ReadonlyArray<string>;
      readonly startedAt: number;
      readonly failedAt: number;
      readonly durationMs: number;
    }
  | {
      readonly state: "cancelled";
      readonly executionId: string;
      readonly sagaName: string;
      readonly stepName: string;
      readonly compensated: boolean;
      readonly compensatedSteps: ReadonlyArray<string>;
      readonly startedAt: number;
      readonly cancelledAt: number;
    };
