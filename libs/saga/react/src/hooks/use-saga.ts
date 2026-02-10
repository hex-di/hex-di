/**
 * useSaga Hook
 *
 * Primary hook for executing a saga from a React component.
 * Resolves the SagaPort from the container and provides a stateful
 * handle for execution, cancellation, and status tracking.
 *
 * @packageDocumentation
 */

import { useState, useCallback, useRef, useContext } from "react";
import { usePort } from "@hex-di/react";
import type { Port } from "@hex-di/core";
import { ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type {
  SagaPort,
  SagaExecutor,
  SagaSuccess,
  SagaError,
  InferSagaPortInput,
  InferSagaPortOutput,
  InferSagaPortError,
} from "@hex-di/saga";
import { SagaManagementContext } from "../context/saga-management-context.js";

// =============================================================================
// Types
// =============================================================================

export type UseSagaStatus = "idle" | "running" | "compensating" | "success" | "error";

export interface UseSagaResult<TInput, TOutput, TError> {
  readonly status: UseSagaStatus;
  readonly execute: (input: TInput) => Promise<Result<SagaSuccess<TOutput>, SagaError<TError>>>;
  readonly resume: (
    executionId: string
  ) => Promise<Result<SagaSuccess<TOutput>, SagaError<TError>>>;
  readonly cancel: () => Promise<Result<void, SagaError<TError>>>;
  readonly data: TOutput | undefined;
  readonly error: SagaError<TError> | null;
  readonly compensated: boolean;
  readonly executionId: string | undefined;
  readonly currentStep: string | undefined;
  readonly reset: () => Result<void, SagaError<never>>;
}

interface SagaState<TOutput, TError> {
  readonly status: UseSagaStatus;
  readonly data: TOutput | undefined;
  readonly error: SagaError<TError> | null;
  readonly executionId: string | undefined;
  readonly currentStep: string | undefined;
}

// =============================================================================
// Overloaded Port Resolution Helpers
// =============================================================================

/**
 * Resolves a SagaPort to a typed SagaExecutor using the overload pattern.
 */
function useSagaExecutor<P extends SagaPort<string, unknown, unknown, unknown>>(
  port: P
): SagaExecutor<InferSagaPortInput<P>, InferSagaPortOutput<P>, InferSagaPortError<P>>;
function useSagaExecutor(port: Port<unknown, string>): unknown {
  return usePort(port);
}

/**
 * Narrows a management executor Result from unknown to the expected types.
 * The management context is type-erased; this bridge restores type safety
 * at the call-site boundary using the overload pattern.
 */
function narrowManagementResult<TOutput, TError>(
  result: Result<SagaSuccess<unknown>, SagaError<unknown>>
): Result<SagaSuccess<TOutput>, SagaError<TError>>;
function narrowManagementResult(
  result: Result<SagaSuccess<unknown>, SagaError<unknown>>
): Result<SagaSuccess<unknown>, SagaError<unknown>> {
  return result;
}

// =============================================================================
// useSaga Hook
// =============================================================================

/**
 * Execute a saga from a React component.
 *
 * Resolves the SagaPort from the nearest HexDiContainerProvider
 * and provides a stateful handle for execution and status tracking.
 *
 * When wrapped in a SagaManagementProvider, `cancel()` and `resume()` are available.
 */
export function useSaga<P extends SagaPort<string, unknown, unknown, unknown>>(
  port: P
): UseSagaResult<InferSagaPortInput<P>, InferSagaPortOutput<P>, InferSagaPortError<P>> {
  type TInput = InferSagaPortInput<P>;
  type TOutput = InferSagaPortOutput<P>;
  type TError = InferSagaPortError<P>;

  const executor = useSagaExecutor(port);
  const managementExecutor = useContext(SagaManagementContext);

  const [state, setState] = useState<SagaState<TOutput, TError>>({
    status: "idle",
    data: undefined,
    error: null,
    executionId: undefined,
    currentStep: undefined,
  });

  const runningRef = useRef(false);

  const execute = useCallback(
    async (input: TInput): Promise<Result<SagaSuccess<TOutput>, SagaError<TError>>> => {
      if (runningRef.current) {
        return err(
          makePreconditionError(
            "Cannot execute saga while another execution is in progress. Cancel or wait for completion first.",
            state.executionId
          )
        );
      }

      runningRef.current = true;
      setState({
        status: "running",
        data: undefined,
        error: null,
        executionId: undefined,
        currentStep: undefined,
      });

      const resultAsync = executor.execute(input);
      const result = await resultAsync;

      runningRef.current = false;

      if (result.isOk()) {
        setState({
          status: "success",
          data: result.value.output,
          error: null,
          executionId: result.value.executionId,
          currentStep: undefined,
        });
      } else {
        const sagaError = result.error;
        setState({
          status: "error",
          data: undefined,
          error: sagaError,
          executionId: getExecutionIdFromError(sagaError),
          currentStep: sagaError.stepName || undefined,
        });
      }

      return result;
    },
    [executor, state.executionId]
  );

  const resume = useCallback(
    async (executionId: string): Promise<Result<SagaSuccess<TOutput>, SagaError<TError>>> => {
      if (!managementExecutor) {
        return err(
          makePreconditionError(
            "Cannot resume without a SagaManagementProvider. Wrap your component tree with <SagaManagementProvider>.",
            undefined
          )
        );
      }
      if (runningRef.current) {
        return err(
          makePreconditionError(
            "Cannot resume saga while another execution is in progress.",
            state.executionId
          )
        );
      }

      runningRef.current = true;
      setState({
        status: "running",
        data: undefined,
        error: null,
        executionId,
        currentStep: undefined,
      });

      const rawResult = await managementExecutor.resume(executionId);
      const result = narrowManagementResult<TOutput, TError>(rawResult);

      runningRef.current = false;

      if (result.isOk()) {
        setState({
          status: "success",
          data: result.value.output,
          error: null,
          executionId: result.value.executionId,
          currentStep: undefined,
        });
      } else {
        setState({
          status: "error",
          data: undefined,
          error: result.error,
          executionId: getExecutionIdFromError(result.error),
          currentStep: result.error.stepName || undefined,
        });
      }

      return result;
    },
    [managementExecutor, state.executionId]
  );

  const cancel = useCallback(async (): Promise<Result<void, SagaError<TError>>> => {
    if (!managementExecutor) {
      return err(
        makePreconditionError(
          "Cannot cancel without a SagaManagementProvider. Wrap your component tree with <SagaManagementProvider>.",
          undefined
        )
      );
    }
    if (!state.executionId) {
      return err(makePreconditionError("No active execution to cancel.", undefined));
    }

    const result = await managementExecutor.cancel(state.executionId);
    if (result.isErr()) {
      return err(makePreconditionError(`Cancel failed: ${result.error._tag}`, state.executionId));
    }

    runningRef.current = false;
    setState({
      status: "idle",
      data: undefined,
      error: null,
      executionId: undefined,
      currentStep: undefined,
    });
    return ok(undefined);
  }, [managementExecutor, state.executionId]);

  const reset = useCallback((): Result<void, SagaError<never>> => {
    if (runningRef.current) {
      return err(
        makePreconditionError(
          "Cannot reset while saga is running or compensating. Cancel first.",
          state.executionId
        )
      );
    }
    setState({
      status: "idle",
      data: undefined,
      error: null,
      executionId: undefined,
      currentStep: undefined,
    });
    return ok(undefined);
  }, [state.executionId]);

  const compensated = deriveCompensated(state.error);

  return {
    status: state.status,
    execute,
    resume,
    cancel,
    data: state.data,
    error: state.error,
    compensated,
    executionId: state.executionId,
    currentStep: state.currentStep,
    reset,
  };
}

// =============================================================================
// Helpers
// =============================================================================

function deriveCompensated(error: SagaError<unknown> | null): boolean {
  if (error === null) return false;

  if (error._tag === "StepFailed") return true;
  if (error._tag === "CompensationFailed") return false;

  // For other error types, check if compensatedSteps has entries
  return error.compensatedSteps.length > 0;
}

function getExecutionIdFromError(error: SagaError<unknown>): string | undefined {
  return error.executionId;
}

function makePreconditionError(message: string, executionId: string | undefined): SagaError<never> {
  return {
    _tag: "ValidationFailed",
    executionId: executionId ?? "",
    sagaName: "",
    stepName: "",
    stepIndex: -1,
    message,
    completedSteps: [],
    compensatedSteps: [],
    cause: new Error(message),
  };
}
