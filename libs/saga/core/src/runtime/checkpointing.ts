/**
 * Checkpointing
 *
 * Persists saga execution state to the configured persister.
 * Persistence errors are swallowed (emitted as events) to
 * avoid aborting the saga.
 *
 * @packageDocumentation
 */

import type { CompletedStepState, SagaExecutionState } from "../ports/types.js";
import type { ExecutionState, CompletedStepInfo } from "./execution-state.js";
import { emit } from "./events.js";

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
): Promise<void> {
  if (!state.persister) return;

  // Swallow persistence errors — emit event but don't abort saga
  await state.persister
    .update(state.executionId, {
      ...update,
      timestamps: {
        startedAt: update.timestamps?.startedAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: update.timestamps?.completedAt ?? null,
      },
    })
    .orTee(error => {
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
    });
}
