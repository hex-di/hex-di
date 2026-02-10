/**
 * Integration: Saga Executor Factories
 *
 * Creates typed SagaExecutor and SagaManagementExecutor instances from a SagaRunner
 * and saga definition. These are the objects that resolve from SagaPort and
 * SagaManagementPort respectively.
 *
 * @packageDocumentation
 */

import { ResultAsync } from "@hex-di/result";
import type {
  SagaExecutor,
  SagaManagementExecutor,
  SagaExecutionSummary,
  ExecutionFilters,
  SagaPersister,
  SagaExecutionState,
} from "../ports/types.js";
import type { SagaRunner, ExecuteOptions } from "../runtime/types.js";
import type { AnySagaDefinition } from "../saga/types.js";
import type { SagaSuccess, SagaError, SagaStatus, ManagementError } from "../errors/types.js";
import { narrowRunnerExecute, narrowRunnerResume } from "../runtime/runner-bridges.js";

/**
 * Creates a SagaExecutor<TInput, TOutput, TError> that wraps a SagaRunner
 * with a specific saga definition. This is the service that resolves from a SagaPort.
 *
 * The type-erasure boundary cast from `SagaRunner.execute()` (which uses `unknown`)
 * to the typed executor is safe because the runtime produces values matching
 * the saga definition's generic types.
 */
export function createSagaExecutor<TInput, TOutput, TError>(
  runner: SagaRunner,
  saga: AnySagaDefinition,
  defaultOptions?: Partial<ExecuteOptions>
): SagaExecutor<TInput, TOutput, TError> {
  return Object.freeze({
    execute(input: TInput): ResultAsync<SagaSuccess<TOutput>, SagaError<TError>> {
      return narrowRunnerExecute<TOutput, TError>(runner.execute(saga, input, defaultOptions));
    },
  });
}

/**
 * Creates a SagaManagementExecutor<TOutput, TError> that wraps a SagaRunner
 * with management operations. This is the service that resolves from a SagaManagementPort.
 *
 * @param runner - The saga runner instance
 * @param persister - Optional persistence adapter for listExecutions support
 */
export function createSagaManagementExecutor<TOutput, TError>(
  runner: SagaRunner,
  persister?: SagaPersister
): SagaManagementExecutor<TOutput, TError> {
  return Object.freeze({
    resume(executionId: string): ResultAsync<SagaSuccess<TOutput>, SagaError<TError>> {
      return narrowRunnerResume<TOutput, TError>(runner.resume(executionId));
    },
    cancel(executionId: string): ResultAsync<void, ManagementError> {
      return runner.cancel(executionId);
    },
    getStatus(executionId: string): ResultAsync<SagaStatus, ManagementError> {
      return runner.getStatus(executionId);
    },
    listExecutions(
      filters?: ExecutionFilters
    ): ResultAsync<SagaExecutionSummary[], ManagementError> {
      if (!persister) {
        return ResultAsync.ok([]);
      }

      const persisterFilters = filters
        ? { sagaName: filters.sagaName, status: filters.status, limit: filters.limit }
        : undefined;

      return persister
        .list(persisterFilters)
        .map(states => states.map(toSummary))
        .mapErr(
          (cause): ManagementError => ({
            _tag: "PersistenceFailed",
            message: "Failed to list executions",
            operation: "list",
            cause,
          })
        );
    },
  });
}

// =============================================================================
// Helpers
// =============================================================================

function toSummary(state: SagaExecutionState): SagaExecutionSummary {
  return {
    executionId: state.executionId,
    sagaName: state.sagaName,
    status: state.status,
    startedAt: new Date(state.timestamps.startedAt).getTime(),
    completedAt: state.timestamps.completedAt
      ? new Date(state.timestamps.completedAt).getTime()
      : null,
    stepCount: state.totalSteps ?? state.completedSteps.length,
    completedStepCount: state.completedSteps.filter(s => !s.skipped).length,
    compensated:
      state.compensation.compensatedSteps.length > 0 && state.compensation.failedSteps.length === 0,
  };
}
