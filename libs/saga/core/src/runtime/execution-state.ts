/**
 * Internal Execution State Types
 *
 * Mutable trace types and the ExecutionState record
 * used during saga execution.
 *
 * @packageDocumentation
 */

import type { Result } from "@hex-di/result";
import type { SagaSuccess, SagaError } from "../errors/types.js";
import type { AnyStepDefinition } from "../step/types.js";
import type { SagaOptions, AnySagaDefinition } from "../saga/types.js";
import type { SagaPersister } from "../ports/types.js";
import type { SagaEventListener } from "./types.js";
import type { SagaTracingHook } from "../introspection/types.js";

// =============================================================================
// Mutable Trace Types (internal bookkeeping during execution)
// =============================================================================

export interface MutableStepTrace {
  stepName: string;
  stepIndex: number;
  status: "completed" | "failed" | "skipped";
  startedAt: number | undefined;
  completedAt: number | undefined;
  durationMs: number | undefined;
  attemptCount: number;
  error: unknown | undefined;
  skippedReason: string | undefined;
}

export interface MutableCompensationStepTrace {
  stepName: string;
  stepIndex: number;
  status: "completed" | "failed";
  startedAt: number;
  completedAt: number;
  durationMs: number;
  error: unknown | undefined;
}

export interface MutableCompensationTrace {
  triggeredBy: string;
  triggeredByIndex: number;
  steps: MutableCompensationStepTrace[];
  status: "completed" | "failed";
  startedAt: number;
  completedAt: number;
  totalDurationMs: number;
}

export interface MutableExecutionTrace {
  stepTraces: MutableStepTrace[];
  compensationTrace: MutableCompensationTrace | undefined;
}

// =============================================================================
// ExecutionState
// =============================================================================

export interface ExecutionState {
  readonly executionId: string;
  readonly sagaName: string;
  readonly input: unknown;
  readonly accumulatedResults: Record<string, unknown>;
  readonly completedSteps: CompletedStepInfo[];
  readonly sagaOptions: SagaOptions;
  readonly persister?: SagaPersister;
  readonly sagaDefinition?: AnySagaDefinition;
  status: "running" | "compensating" | "completed" | "failed" | "cancelled";
  abortController: AbortController;
  listeners: SagaEventListener[];
  sagaStartTime: number;
  stepsExecuted: number;
  stepsSkipped: number;
  metadata: Record<string, unknown> | undefined;
  trace: MutableExecutionTrace;
  readonly tracingHook?: SagaTracingHook;
}

// =============================================================================
// CompletedStepInfo
// =============================================================================

export interface CompletedStepInfo {
  readonly stepName: string;
  readonly stepIndex: number;
  readonly result: unknown;
  readonly step: AnyStepDefinition;
}

// =============================================================================
// Internal Result Alias
// =============================================================================

export type SagaResult = Result<SagaSuccess<unknown>, SagaError<unknown>>;
