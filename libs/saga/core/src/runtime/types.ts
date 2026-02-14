/**
 * Runtime Types
 *
 * @packageDocumentation
 */

import type { ResultAsync } from "@hex-di/result";
import type { SagaSuccess, SagaError, ManagementError, SagaStatus } from "../errors/types.js";
import type { AnySagaDefinition } from "../saga/types.js";
import type { SagaPersister } from "../ports/types.js";
import type { SagaTracingHook, TracerLike } from "../shared/tracing-types.js";

// =============================================================================
// SagaEvent types
// =============================================================================

export interface SagaEventBase {
  readonly executionId: string;
  readonly sagaName: string;
  readonly timestamp: number;
}

export interface SagaStartedEvent extends SagaEventBase {
  readonly type: "saga:started";
  readonly input: unknown;
  readonly stepCount: number;
  readonly metadata: Record<string, unknown> | undefined;
}

export interface StepStartedEvent extends SagaEventBase {
  readonly type: "step:started";
  readonly stepName: string;
  readonly stepIndex: number;
}

export interface StepCompletedEvent extends SagaEventBase {
  readonly type: "step:completed";
  readonly stepName: string;
  readonly stepIndex: number;
  readonly durationMs: number;
}

export interface StepFailedEvent extends SagaEventBase {
  readonly type: "step:failed";
  readonly stepName: string;
  readonly stepIndex: number;
  readonly error: unknown;
  readonly attemptCount: number;
  readonly retriesExhausted: boolean;
}

export interface StepSkippedEvent extends SagaEventBase {
  readonly type: "step:skipped";
  readonly stepName: string;
  readonly stepIndex: number;
  readonly reason: string;
}

export interface CompensationStartedEvent extends SagaEventBase {
  readonly type: "compensation:started";
  readonly failedStepName: string;
  readonly failedStepIndex: number;
  readonly stepsToCompensate: ReadonlyArray<string>;
}

export interface CompensationStepEvent extends SagaEventBase {
  readonly type: "compensation:step";
  readonly stepName: string;
  readonly stepIndex: number;
  readonly success: boolean;
  readonly error: unknown;
  readonly durationMs: number;
}

export interface CompensationCompletedEvent extends SagaEventBase {
  readonly type: "compensation:completed";
  readonly compensatedSteps: readonly string[];
  readonly totalDurationMs: number;
}

export interface CompensationFailedEvent extends SagaEventBase {
  readonly type: "compensation:failed";
  readonly failedCompensationStep: string;
  readonly error: unknown;
  readonly compensatedSteps: readonly string[];
  readonly remainingSteps: readonly string[];
}

export interface SagaCompletedEvent extends SagaEventBase {
  readonly type: "saga:completed";
  readonly totalDurationMs: number;
  readonly stepsExecuted: number;
  readonly stepsSkipped: number;
}

export interface SagaFailedEvent extends SagaEventBase {
  readonly type: "saga:failed";
  readonly error: unknown;
  readonly compensated: boolean;
  readonly failedStepName: string;
  readonly totalDurationMs: number;
}

export interface SagaCancelledEvent extends SagaEventBase {
  readonly type: "saga:cancelled";
  readonly stepName: string;
  readonly compensated: boolean;
}

export type SagaEvent =
  | SagaStartedEvent
  | StepStartedEvent
  | StepCompletedEvent
  | StepFailedEvent
  | StepSkippedEvent
  | CompensationStartedEvent
  | CompensationStepEvent
  | CompensationCompletedEvent
  | CompensationFailedEvent
  | SagaCompletedEvent
  | SagaFailedEvent
  | SagaCancelledEvent;

export type SagaEventListener = (event: SagaEvent) => void;
export type Unsubscribe = () => void;

// =============================================================================
// SagaProgressEvent / SagaCompensationEvent (Flow integration)
// =============================================================================

export type SagaProgressEvent =
  | { readonly _tag: "StepStarted"; readonly stepName: string; readonly stepIndex: number }
  | {
      readonly _tag: "StepCompleted";
      readonly stepName: string;
      readonly stepIndex: number;
      readonly totalSteps: number;
    }
  | { readonly _tag: "CompensationStarted"; readonly stepName: string }
  | { readonly _tag: "CompensationCompleted"; readonly stepName: string };

export type SagaCompensationEvent =
  | {
      readonly _tag: "CompensationTriggered";
      readonly failedStepName: string;
      readonly stepsToCompensate: number;
    }
  | { readonly _tag: "CompensationStepFailed"; readonly stepName: string; readonly cause: unknown };

// =============================================================================
// ExecutionTrace
// =============================================================================

export interface StepTrace {
  readonly stepName: string;
  readonly stepIndex: number;
  readonly status: "completed" | "failed" | "skipped";
  readonly startedAt: number | undefined;
  readonly completedAt: number | undefined;
  readonly durationMs: number | undefined;
  readonly attemptCount: number;
  readonly error: unknown | undefined;
  readonly skippedReason: string | undefined;
}

export interface CompensationStepTrace {
  readonly stepName: string;
  readonly stepIndex: number;
  readonly status: "completed" | "failed";
  readonly startedAt: number;
  readonly completedAt: number;
  readonly durationMs: number;
  readonly error: unknown | undefined;
}

export interface CompensationTrace {
  readonly triggeredBy: string;
  readonly triggeredByIndex: number;
  readonly steps: ReadonlyArray<CompensationStepTrace>;
  readonly status: "completed" | "failed";
  readonly startedAt: number;
  readonly completedAt: number;
  readonly totalDurationMs: number;
}

export interface ExecutionTrace {
  readonly executionId: string;
  readonly sagaName: string;
  readonly input: unknown;
  readonly status: "pending" | "running" | "compensating" | "completed" | "failed" | "cancelled";
  readonly steps: ReadonlyArray<StepTrace>;
  readonly compensation: CompensationTrace | undefined;
  readonly startedAt: number;
  readonly completedAt: number | undefined;
  readonly totalDurationMs: number | undefined;
  readonly metadata: Record<string, unknown> | undefined;
}

// =============================================================================
// ExecuteOptions / SagaRunner
// =============================================================================

export interface ExecuteOptions {
  /** Custom execution ID (default: auto-generated) */
  readonly executionId?: string;
  /** Timeout in ms for the entire execution */
  readonly timeout?: number;
  /** AbortSignal for cancellation */
  readonly signal?: AbortSignal;
  /** Custom metadata attached to this execution */
  readonly metadata?: Record<string, unknown>;
  /** Pre-execution event listeners (captures events from the very start) */
  readonly listeners?: readonly SagaEventListener[];
}

/** Port resolver for the runtime */
export interface PortResolver {
  resolve(portName: string): unknown;
}

/** Configuration for createSagaRunner */
export interface SagaRunnerConfig {
  /** Optional persistence adapter for state checkpointing and resume */
  readonly persister?: SagaPersister;
  /** Optional tracing hook for distributed tracing spans.
   * Takes precedence over `tracer` if both are provided. */
  readonly tracingHook?: SagaTracingHook;
  /**
   * Shorthand: pass a TracerLike and a SagaTracingHook is auto-created.
   * Ignored when `tracingHook` is already provided.
   */
  readonly tracer?: TracerLike;
}

/**
 * Internal runner interface with erased types.
 * Use the typed `executeSaga()` wrapper for type-safe execution.
 */
export interface SagaRunner {
  execute(
    saga: AnySagaDefinition,
    input: unknown,
    options?: ExecuteOptions
  ): ResultAsync<SagaSuccess<unknown>, SagaError<unknown>>;

  resume(executionId: string): ResultAsync<SagaSuccess<unknown>, SagaError<unknown>>;
  cancel(executionId: string): ResultAsync<void, ManagementError>;
  getStatus(executionId: string): ResultAsync<SagaStatus, ManagementError>;
  subscribe(executionId: string, listener: SagaEventListener): Unsubscribe;
  getTrace(executionId: string): ExecutionTrace | null;
}
