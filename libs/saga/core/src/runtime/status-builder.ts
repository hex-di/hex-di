/**
 * Saga Status Builder
 *
 * Constructs the SagaStatus discriminated union from
 * internal execution state.
 *
 * @packageDocumentation
 */

import { assertNever } from "@hex-di/result";
import type { SagaStatus, SagaError } from "../errors/types.js";
import type { ExecutionState } from "./execution-state.js";

// =============================================================================
// Status Builder
// =============================================================================

export function buildSagaStatus(
  internalStatus: ExecutionState["status"],
  executionId: string,
  sagaName: string,
  completedSteps: readonly string[],
  now: number
): SagaStatus {
  switch (internalStatus) {
    case "running":
      return {
        state: "running",
        executionId,
        sagaName,
        currentStepIndex: completedSteps.length,
        currentStepName: "",
        completedSteps,
        startedAt: now,
      };
    case "completed":
      return {
        state: "completed",
        executionId,
        sagaName,
        completedSteps,
        startedAt: now,
        completedAt: now,
        durationMs: 0,
      };
    case "compensating":
      return {
        state: "compensating",
        executionId,
        sagaName,
        failedStepName: "",
        failedStepIndex: completedSteps.length,
        compensatingStepIndex: 0,
        compensatingStepName: "",
        compensatedSteps: [],
        startedAt: now,
        error: {
          _tag: "StepFailed",
          executionId,
          sagaName,
          stepName: "",
          stepIndex: -1,
          message: "Compensation in progress",
          completedSteps,
          compensatedSteps: [],
          cause: undefined,
        } satisfies SagaError<unknown>,
      };
    case "failed":
      return {
        state: "failed",
        executionId,
        sagaName,
        failedStepName: "",
        compensated: false,
        compensatedSteps: [],
        startedAt: now,
        failedAt: now,
        durationMs: 0,
        error: {
          _tag: "StepFailed",
          executionId,
          sagaName,
          stepName: "",
          stepIndex: -1,
          message: "Saga failed",
          completedSteps,
          compensatedSteps: [],
          cause: undefined,
        } satisfies SagaError<unknown>,
      };
    case "cancelled":
      return {
        state: "cancelled",
        executionId,
        sagaName,
        stepName: "",
        compensated: false,
        compensatedSteps: [],
        cancelledAt: now,
        startedAt: now,
      };
    default:
      return assertNever(internalStatus);
  }
}
