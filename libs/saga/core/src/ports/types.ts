/**
 * Saga Port Types
 *
 * Defines SagaPort, SagaManagementPort, SagaExecutor, SagaManagementExecutor,
 * SagaPersister, and related port type utilities.
 *
 * @packageDocumentation
 */

import type { Port } from "@hex-di/core";
import type { ResultAsync } from "@hex-di/result";
import type {
  SagaSuccess,
  SagaError,
  ManagementError,
  SagaStatus,
  SagaStatusType,
} from "../errors/types.js";

// =============================================================================
// Brand Symbols
// =============================================================================

declare const SagaPortSymbol: unique symbol;
declare const SagaManagementPortSymbol: unique symbol;
declare const __sagaInputType: unique symbol;
declare const __sagaOutputType: unique symbol;
declare const __sagaErrorType: unique symbol;

// =============================================================================
// SagaExecutor - domain interface
// =============================================================================

/** Domain port interface - trigger a saga execution */
export interface SagaExecutor<TInput, TOutput, TError> {
  execute(input: TInput): ResultAsync<SagaSuccess<TOutput>, SagaError<TError>>;
}

// =============================================================================
// SagaManagementExecutor - management interface
// =============================================================================

/** Management/infrastructure port interface */
export interface SagaManagementExecutor<TOutput, TError> {
  resume(executionId: string): ResultAsync<SagaSuccess<TOutput>, SagaError<TError>>;
  cancel(executionId: string): ResultAsync<void, ManagementError>;
  getStatus(executionId: string): ResultAsync<SagaStatus, ManagementError>;
  listExecutions(filters?: ExecutionFilters): ResultAsync<SagaExecutionSummary[], ManagementError>;
}

export interface ExecutionFilters {
  readonly sagaName?: string;
  readonly status?: SagaStatusType;
  readonly limit?: number;
  readonly offset?: number;
}

export interface SagaExecutionSummary {
  readonly executionId: string;
  readonly sagaName: string;
  readonly status: SagaStatusType;
  readonly startedAt: number;
  readonly completedAt: number | null;
  readonly stepCount: number;
  readonly completedStepCount: number;
  readonly compensated: boolean;
}

// =============================================================================
// SagaPort
// =============================================================================

/** Branded saga port that resolves to SagaExecutor */
export type SagaPort<TName extends string, TInput, TOutput, TError> = Port<
  TName,
  SagaExecutor<TInput, TOutput, TError>
> & {
  readonly [SagaPortSymbol]: true;
  readonly [__sagaInputType]: TInput;
  readonly [__sagaOutputType]: TOutput;
  readonly [__sagaErrorType]: TError;
};

/** Branded management port that resolves to SagaManagementExecutor */
export type SagaManagementPort<TName extends string, TOutput, TError> = Port<
  TName,
  SagaManagementExecutor<TOutput, TError>
> & {
  readonly [SagaManagementPortSymbol]: true;
  readonly [__sagaOutputType]: TOutput;
  readonly [__sagaErrorType]: TError;
};

// =============================================================================
// SagaPortConfig
// =============================================================================

export interface SagaPortConfig<TName extends string> {
  /** Unique port name */
  readonly name: TName;
  /** Human-readable description */
  readonly description?: string;
  /** Custom metadata for tracing */
  readonly metadata?: Record<string, unknown>;
}

// =============================================================================
// Persistence Port Types
// =============================================================================

/** Tagged union of persistence operation errors */
export type PersistenceError =
  | { readonly _tag: "NotFound"; readonly executionId: string }
  | { readonly _tag: "StorageFailure"; readonly operation: string; readonly cause: unknown }
  | { readonly _tag: "SerializationFailure"; readonly cause: unknown };

export interface CompletedStepState {
  readonly name: string;
  readonly index: number;
  readonly output: unknown;
  readonly skipped: boolean;
  readonly completedAt: string;
}

export interface CompensationState {
  readonly active: boolean;
  readonly compensatedSteps: readonly string[];
  readonly failedSteps: readonly string[];
  readonly triggeringStepIndex: number | null;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly durationMs?: number;
}

export interface SerializedSagaError {
  readonly _tag: string;
  readonly name: string;
  readonly message: string;
  readonly stack: string | null;
  readonly code: string | null;
  readonly fields: Record<string, unknown>;
}

export interface SagaExecutionState {
  readonly executionId: string;
  readonly sagaName: string;
  readonly input: unknown;
  readonly currentStep: number;
  readonly completedSteps: readonly CompletedStepState[];
  readonly status: SagaStatusType;
  readonly error: SerializedSagaError | null;
  readonly compensation: CompensationState;
  readonly timestamps: {
    readonly startedAt: string;
    readonly updatedAt: string;
    readonly completedAt: string | null;
  };
  readonly metadata: Record<string, unknown>;
  readonly totalSteps: number;
  /** Write-ahead pending step: set before step execution, cleared after completion */
  readonly pendingStep: { readonly name: string; readonly index: number } | null;
  /** Saga definition version at execution time */
  readonly sagaVersion?: string;
}

/** Persistence interface for saga state */
export interface SagaPersister {
  save(state: SagaExecutionState): ResultAsync<void, PersistenceError>;
  load(executionId: string): ResultAsync<SagaExecutionState | null, PersistenceError>;
  delete(executionId: string): ResultAsync<void, PersistenceError>;
  list(filters?: PersisterFilters): ResultAsync<SagaExecutionState[], PersistenceError>;
  update(
    executionId: string,
    updates: Partial<SagaExecutionState>
  ): ResultAsync<void, PersistenceError>;
}

export interface PersisterFilters {
  readonly sagaName?: string;
  readonly status?: SagaStatusType;
  readonly limit?: number;
}

// =============================================================================
// Type Inference Utilities
// =============================================================================

/** Structured error for non-SagaPort types */
export type NotASagaPortError<T> = {
  readonly __errorBrand: "NotASagaPortError";
  readonly __message: "Expected a SagaPort type created with sagaPort()";
  readonly __received: T;
  readonly __hint: "Use InferSagaPortInput<typeof YourPort>, not InferSagaPortInput<YourPort>";
};

/** Structured error for non-SagaManagementPort types */
export type NotASagaManagementPortError<T> = {
  readonly __errorBrand: "NotASagaManagementPortError";
  readonly __message: "Expected a SagaManagementPort type created with sagaManagementPort()";
  readonly __received: T;
  readonly __hint: "Use InferSagaManagementPortOutput<typeof YourPort>, not InferSagaManagementPortOutput<YourPort>";
};

/** Extract the input type from a SagaPort */
export type InferSagaPortInput<T> = [T] extends [SagaPort<string, infer TInput, unknown, unknown>]
  ? TInput
  : NotASagaPortError<T>;

/** Extract the output type from a SagaPort */
export type InferSagaPortOutput<T> = [T] extends [SagaPort<string, unknown, infer TOutput, unknown>]
  ? TOutput
  : NotASagaPortError<T>;

/** Extract the error type from a SagaPort */
export type InferSagaPortError<T> = [T] extends [SagaPort<string, unknown, unknown, infer TError>]
  ? TError
  : NotASagaPortError<T>;

/** Extract the name literal type from a SagaPort */
export type InferSagaPortName<T> = [T] extends [SagaPort<infer TName, unknown, unknown, unknown>]
  ? TName
  : NotASagaPortError<T>;

/** Extract the output type from a SagaManagementPort */
export type InferSagaManagementPortOutput<T> = [T] extends [
  SagaManagementPort<string, infer TOutput, unknown>,
]
  ? TOutput
  : NotASagaManagementPortError<T>;

/** Extract the error type from a SagaManagementPort */
export type InferSagaManagementPortError<T> = [T] extends [
  SagaManagementPort<string, unknown, infer TError>,
]
  ? TError
  : NotASagaManagementPortError<T>;

/** Extract the name literal type from a SagaManagementPort */
export type InferSagaManagementPortName<T> = [T] extends [
  SagaManagementPort<infer TName, unknown, unknown>,
]
  ? TName
  : NotASagaManagementPortError<T>;

// =============================================================================
// Captive Dependency Validation
// =============================================================================

/** Error for singleton saga depending on scoped port */
export type CaptiveSagaDependencyError<TSagaName extends string, TPortName extends string> = {
  readonly __errorBrand: "CaptiveSagaDependencyError";
  readonly __message: "Saga is registered as singleton but depends on a scoped port";
  readonly __received: { sagaName: TSagaName; portName: TPortName };
  readonly __hint: "Either change the saga adapter to scoped lifetime or ensure all step ports are singleton or transient.";
};
