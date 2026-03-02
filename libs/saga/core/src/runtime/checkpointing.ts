/**
 * Checkpointing
 *
 * Persists saga execution state to the configured persister.
 * Supports three checkpoint failure policies:
 *   - "swallow" (default): emit event, continue
 *   - "abort": return error Result, caller halts saga
 *   - "warn": emit warning event + console.warn, continue
 *
 * @packageDocumentation
 */

import type { Result } from "@hex-di/result";
import { ok, err } from "@hex-di/result";
import type { CompletedStepState, SagaExecutionState } from "../ports/types.js";
import type { ExecutionState, CompletedStepInfo } from "./execution-state.js";
import type { CheckpointPolicy } from "../saga/types.js";
import { emit } from "./events.js";

// =============================================================================
// CheckpointError
// =============================================================================

export interface CheckpointError {
  readonly _tag: "CheckpointFailed";
  readonly message: string;
  readonly cause: unknown;
}

function createCheckpointError(cause: unknown): CheckpointError {
  return Object.freeze({
    _tag: "CheckpointFailed",
    message: "Checkpoint persistence failed",
    cause,
  });
}

// =============================================================================
// CompletedStepState Mapper
// =============================================================================

export function toCompletedStepState(info: CompletedStepInfo): CompletedStepState {
  return {
    name: info.stepName,
    index: info.stepIndex,
    output: info.result,
    skipped: false,
    completedAt: new Date().toISOString(),
  };
}

// =============================================================================
// Checkpoint
// =============================================================================

export async function checkpoint(
  state: ExecutionState,
  update: Partial<SagaExecutionState>
): Promise<Result<void, CheckpointError>> {
  if (!state.persister) return ok(undefined);

  const policy: CheckpointPolicy = state.sagaOptions.checkpointPolicy ?? "swallow";

  const result = await state.persister.update(state.executionId, {
    ...update,
    timestamps: {
      startedAt: update.timestamps?.startedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: update.timestamps?.completedAt ?? null,
    },
  });

  if (result.isErr()) {
    const error = result.error;
    const checkpointErr = createCheckpointError(error);

    switch (policy) {
      case "abort":
        return err(checkpointErr);
      case "warn":
        emit(state, {
          type: "checkpoint:warning",
          executionId: state.executionId,
          sagaName: state.sagaName,
          timestamp: Date.now(),
          error,
        });
        globalThis.console.warn(
          `[GxP] Checkpoint failed for execution ${state.executionId}: ${String(error)}`
        );
        return ok(undefined);
      case "swallow":
      default:
        emit(state, {
          type: "step:failed",
          executionId: state.executionId,
          sagaName: state.sagaName,
          stepName: "__checkpoint",
          stepIndex: -1,
          error,
          attemptCount: 1,
          timestamp: Date.now(),
          retriesExhausted: true,
        });
        return ok(undefined);
    }
  }

  return ok(undefined);
}

// =============================================================================
// S1: Write-Ahead Checkpoint (before step execution)
// =============================================================================

export async function checkpointBeforeStep(
  state: ExecutionState,
  stepName: string,
  stepIndex: number
): Promise<Result<void, CheckpointError>> {
  return checkpoint(state, {
    pendingStep: { name: stepName, index: stepIndex },
  });
}
