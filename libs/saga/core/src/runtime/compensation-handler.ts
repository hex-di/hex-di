/**
 * Compensation Handler
 *
 * Handles step failure compensation logic: builds the compensation plan,
 * orchestrates the compensation engine, invokes hooks, and interprets results.
 *
 * Extracted from saga-executor.ts for maintainability.
 *
 * @packageDocumentation
 */

import { err, tryCatch, fromPromise } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { SagaError } from "../errors/types.js";
import type { AnyStepDefinition } from "../step/types.js";
import type { CompensationPlanStep } from "../compensation/types.js";
import type { CompensationInvoker } from "../compensation/engine.js";
import { executeCompensation } from "../compensation/engine.js";
import {
  createStepFailedError,
  createCompensationFailedError,
  createTimeoutError,
  createCancelledError,
} from "../errors/factories.js";
import type { PortResolver } from "./types.js";
import type { ExecutionState, SagaResult } from "./execution-state.js";
import { emit } from "./events.js";
import { invokePort } from "./step-executor.js";
import { checkpoint } from "./checkpointing.js";

// =============================================================================
// Step Failure Handling
// =============================================================================

export async function handleStepFailure(
  executionState: ExecutionState,
  failedStep: AnyStepDefinition,
  failedStepIndex: number,
  error: unknown,
  resolver: PortResolver,
  isTimeout: boolean,
  timeoutMs: number | undefined
): Promise<Result<void, SagaError<unknown>>> {
  const { executionId, sagaName, input, accumulatedResults, completedSteps, sagaOptions } =
    executionState;

  // Build compensation plan from completed steps
  const compensationPlanSteps: CompensationPlanStep[] = [];
  for (const completed of completedSteps) {
    if (completed.step.compensate && !completed.step.options?.skipCompensation) {
      compensationPlanSteps.push({
        stepName: completed.stepName,
        stepIndex: completed.stepIndex,
        result: completed.result,
        compensateFn: completed.step.compensate,
      });
    }
  }

  const compensationStrategy = sagaOptions.compensationStrategy;

  // Execute compensation
  executionState.status = "compensating";

  await checkpoint(executionState, {
    status: "compensating",
    compensation: {
      active: true,
      compensatedSteps: [],
      failedSteps: [],
      triggeringStepIndex: failedStepIndex,
    },
  });

  // Call beforeCompensation hook
  const compensationStartTime = Date.now();
  const beforeCompHook = sagaOptions.hooks?.beforeCompensation;
  if (beforeCompHook) {
    tryCatch(
      () =>
        beforeCompHook({
          failedStepName: failedStep.name,
          stepsToCompensate: compensationPlanSteps.length,
          executionId,
          sagaName,
          metadata: executionState.metadata,
        }),
      () => undefined
    );
  }

  emit(executionState, {
    type: "compensation:started",
    executionId,
    sagaName,
    failedStepName: failedStep.name,
    failedStepIndex,
    stepsToCompensate: compensationPlanSteps.map(s => s.stepName),
    timestamp: Date.now(),
  });

  // Tracing: compensation start span
  if (executionState.tracingHook) {
    tryCatch(
      () => executionState.tracingHook?.onCompensationStart(sagaName, failedStep.name),
      () => undefined
    );
  }

  const invoker: CompensationInvoker = (planStep, params) => {
    const completed = completedSteps.find(s => s.stepName === planStep.stepName);
    const portName = completed?.step.port.__portName ?? "";
    return fromPromise(
      Promise.resolve().then(() => {
        const service = resolver.resolve(portName);
        const result = invokePort(service, params);
        if (result.isErr()) {
          throw result.error;
        }
        return result.value;
      }),
      (error: unknown) => (error instanceof Error ? error : new Error(String(error)))
    );
  };

  const compensationResult = await executeCompensation({
    plan: {
      completedSteps: compensationPlanSteps,
      strategy: compensationStrategy,
    },
    invoker,
    sagaInput: input,
    accumulatedResults: { ...accumulatedResults },
    originalError: error,
    failedStepIndex,
    failedStepName: failedStep.name,
    executionId,
    sagaName,
    emitEvent: event => emit(executionState, event),
  });

  // Tracing: compensation end span
  if (executionState.tracingHook) {
    tryCatch(
      () =>
        executionState.tracingHook?.onCompensationEnd(sagaName, compensationResult.allSucceeded),
      () => undefined
    );
  }

  // Call afterCompensation hook
  const compensationEndTime = Date.now();
  const compensationDurationMs = compensationEndTime - compensationStartTime;
  const afterCompHook = sagaOptions.hooks?.afterCompensation;
  if (afterCompHook) {
    tryCatch(
      () =>
        afterCompHook({
          compensatedSteps: compensationResult.compensatedSteps,
          failedSteps: compensationResult.failedSteps,
          executionId,
          sagaName,
          metadata: executionState.metadata,
        }),
      () => undefined
    );
  }

  executionState.status = "failed";

  const compensationStartedAtISO = new Date(compensationStartTime).toISOString();
  const compensationCompletedAtISO = new Date(compensationEndTime).toISOString();

  await checkpoint(executionState, {
    status: "failed",
    compensation: {
      active: false,
      compensatedSteps: compensationResult.compensatedSteps,
      failedSteps: compensationResult.failedSteps,
      triggeringStepIndex: failedStepIndex,
      startedAt: compensationStartedAtISO,
      completedAt: compensationCompletedAtISO,
      durationMs: compensationDurationMs,
    },
    timestamps: {
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
  });

  const baseFields = {
    executionId,
    sagaName,
    stepName: failedStep.name,
    stepIndex: failedStepIndex,
    message: isTimeout
      ? `Step "${failedStep.name}" timed out after ${timeoutMs ?? 0}ms`
      : `Step "${failedStep.name}" failed`,
    completedSteps: completedSteps.map(s => s.stepName),
    compensatedSteps: compensationResult.compensatedSteps,
  };

  const sagaFailedBase = {
    executionId,
    sagaName,
    error,
    failedStepName: failedStep.name,
    totalDurationMs: Date.now() - executionState.sagaStartTime,
    timestamp: Date.now(),
  };

  if (isTimeout && timeoutMs !== undefined) {
    emit(executionState, {
      type: "saga:failed",
      ...sagaFailedBase,
      compensated: compensationResult.allSucceeded,
    });

    return err(createTimeoutError(baseFields, timeoutMs));
  }

  if (compensationResult.allSucceeded) {
    emit(executionState, {
      type: "saga:failed",
      ...sagaFailedBase,
      compensated: true,
    });

    return err(createStepFailedError(baseFields, error));
  }

  emit(executionState, {
    type: "saga:failed",
    ...sagaFailedBase,
    compensated: false,
  });

  return err(
    createCompensationFailedError(
      baseFields,
      error,
      compensationResult.errors.length > 0 ? compensationResult.errors[0].cause : undefined,
      compensationResult.failedSteps
    )
  );
}

// =============================================================================
// Cancelled Result
// =============================================================================

export function makeCancelledResult(executionState: ExecutionState, stepIndex: number): SagaResult {
  const { executionId, sagaName, completedSteps } = executionState;
  executionState.status = "cancelled";

  emit(executionState, {
    type: "saga:cancelled",
    executionId,
    sagaName,
    timestamp: Date.now(),
    stepName: "",
    compensated: false,
  });

  return err(
    createCancelledError({
      executionId,
      sagaName,
      stepName: "",
      stepIndex,
      message: "Saga was cancelled",
      completedSteps: completedSteps.map(s => s.stepName),
      compensatedSteps: [],
    })
  );
}
