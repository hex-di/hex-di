/**
 * Core Saga Execution Logic
 *
 * Orchestrates step-by-step execution of a saga definition,
 * including sequential steps, parallel steps, branching,
 * sub-sagas, compensation, and timeouts.
 *
 * @packageDocumentation
 */

import { ok, err, tryCatch } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { SagaError } from "../errors/types.js";
import type { AnySagaDefinition, SagaNode } from "../saga/types.js";
import type { AnyStepDefinition } from "../step/types.js";
import { isBranchSelector, isInputMapper, extractNodes } from "./runner-bridges.js";
import {
  createPortNotFoundError,
  createStepFailedError,
  createTimeoutError,
  createValidationFailedError,
} from "../errors/factories.js";
import type { PortResolver } from "./types.js";
import type { ExecutionState, SagaResult } from "./execution-state.js";
import { emit } from "./events.js";
import { executeStepWithRetry, TimeoutSignal } from "./step-executor.js";
import { checkpoint, checkpointBeforeStep, toCompletedStepState } from "./checkpointing.js";
import { handleStepFailure, makeCancelledResult } from "./compensation-handler.js";

// =============================================================================
// Core Execution
// =============================================================================

export async function executeSagaInternal(
  saga: AnySagaDefinition,
  input: unknown,
  resolver: PortResolver,
  executionState: ExecutionState,
  globalTimeout: number | undefined,
  signal: AbortSignal,
  startFromStep = 0
): Promise<SagaResult> {
  const nodes = getNodes(saga);
  const { executionId, sagaName, accumulatedResults, completedSteps } = executionState;

  executionState.sagaStartTime = Date.now();

  emit(executionState, {
    type: "saga:started",
    executionId,
    sagaName,
    timestamp: executionState.sagaStartTime,
    input: executionState.input,
    stepCount: nodes.length,
    metadata: executionState.metadata,
  });

  const execPromise = (async (): Promise<SagaResult> => {
    let stepIndex = 0;

    for (const node of nodes) {
      if (signal.aborted) {
        return makeCancelledResult(executionState, stepIndex);
      }

      if (node._type === "step") {
        if (stepIndex < startFromStep) {
          // S3: Emit step:resumed events for skipped (previously completed) steps
          const completedInfo = executionState.completedSteps.find(
            s => s.stepName === node.step.name
          );
          if (completedInfo) {
            emit(executionState, {
              type: "step:resumed",
              executionId,
              sagaName,
              stepName: node.step.name,
              stepIndex,
              output: accumulatedResults[node.step.name],
              originalCompletedAt: new Date().toISOString(),
              timestamp: Date.now(),
            });
          }
          stepIndex++;
          continue;
        }

        // S1: Write-ahead checkpoint before step execution
        const wacResult = await checkpointBeforeStep(executionState, node.step.name, stepIndex);
        if (wacResult.isErr()) {
          return err(
            createStepFailedError(
              {
                executionId,
                sagaName,
                stepName: node.step.name,
                stepIndex,
                message: `Write-ahead checkpoint failed: ${wacResult.error.message}`,
                completedSteps: completedSteps.map(s => s.stepName),
                compensatedSteps: [],
              },
              wacResult.error.cause
            )
          );
        }

        // Re-check abort after checkpoint await (signal may have fired during yield)
        if (signal.aborted) {
          return makeCancelledResult(executionState, stepIndex);
        }

        const result = await executeStepNode(
          node.step,
          stepIndex,
          resolver,
          executionState,
          signal
        );

        if (result.isErr()) {
          const cpResult = await checkpoint(executionState, { status: "failed" });
          if (cpResult.isErr()) {
            // Checkpoint abort -- return checkpoint error
            return err(
              createStepFailedError(
                {
                  executionId,
                  sagaName,
                  stepName: "__checkpoint",
                  stepIndex: -1,
                  message: `Checkpoint failed during error handling: ${cpResult.error.message}`,
                  completedSteps: completedSteps.map(s => s.stepName),
                  compensatedSteps: [],
                },
                cpResult.error.cause
              )
            );
          }
          return err(result.error);
        }

        // S1: Clear pendingStep after step completes
        const cpResult = await checkpoint(executionState, {
          currentStep: stepIndex + 1,
          completedSteps: completedSteps.map(toCompletedStepState),
          pendingStep: null,
        });
        if (cpResult.isErr()) {
          return err(
            createStepFailedError(
              {
                executionId,
                sagaName,
                stepName: node.step.name,
                stepIndex,
                message: `Checkpoint failed after step completion: ${cpResult.error.message}`,
                completedSteps: completedSteps.map(s => s.stepName),
                compensatedSteps: [],
              },
              cpResult.error.cause
            )
          );
        }

        stepIndex++;
      } else if (node._type === "parallel") {
        const baseIndex = stepIndex;

        if (baseIndex + node.steps.length <= startFromStep) {
          // S3: Emit step:resumed events for parallel skipped steps
          for (let pi = 0; pi < node.steps.length; pi++) {
            const pStep = node.steps[pi];
            const completedInfo = executionState.completedSteps.find(
              s => s.stepName === pStep.name
            );
            if (completedInfo) {
              emit(executionState, {
                type: "step:resumed",
                executionId,
                sagaName,
                stepName: pStep.name,
                stepIndex: baseIndex + pi,
                output: accumulatedResults[pStep.name],
                originalCompletedAt: new Date().toISOString(),
                timestamp: Date.now(),
              });
            }
          }
          stepIndex += node.steps.length;
          continue;
        }

        const results = await Promise.all(
          node.steps.map((step, i) =>
            executeStepNode(step, baseIndex + i, resolver, executionState, signal)
          )
        );

        for (const result of results) {
          if (result.isErr()) {
            await checkpoint(executionState, { status: "failed" });
            return err(result.error);
          }
        }

        const cpResult = await checkpoint(executionState, {
          currentStep: stepIndex + node.steps.length,
          completedSteps: completedSteps.map(toCompletedStepState),
          pendingStep: null,
        });
        if (cpResult.isErr()) {
          return err(
            createStepFailedError(
              {
                executionId,
                sagaName,
                stepName: "__checkpoint",
                stepIndex: -1,
                message: `Checkpoint failed after parallel steps: ${cpResult.error.message}`,
                completedSteps: completedSteps.map(s => s.stepName),
                compensatedSteps: [],
              },
              cpResult.error.cause
            )
          );
        }

        stepIndex += node.steps.length;
      } else if (node._type === "branch") {
        if (stepIndex < startFromStep) {
          stepIndex++;
          continue;
        }

        const ctx = {
          input,
          results: { ...accumulatedResults },
          stepIndex,
          executionId,
        };
        if (!isBranchSelector(node.selector)) {
          return err(
            createValidationFailedError(
              {
                executionId,
                sagaName,
                stepName: "",
                stepIndex,
                message: "Branch node has invalid selector",
                completedSteps: completedSteps.map(s => s.stepName),
                compensatedSteps: [],
              },
              new Error("Branch node has invalid selector")
            )
          );
        }
        const selectedKey = node.selector(ctx);
        const branchSteps = node.branches[selectedKey];

        if (branchSteps) {
          const branchResults: Record<string, unknown> = {
            __selectedBranch: selectedKey,
          };

          for (const step of branchSteps) {
            const result = await executeStepNode(step, stepIndex, resolver, executionState, signal);

            if (result.isErr()) {
              return err(result.error);
            }
            branchResults[step.name] = accumulatedResults[step.name];
          }

          Object.assign(accumulatedResults, branchResults);
        }
        stepIndex++;
      } else if (node._type === "subSaga") {
        if (stepIndex < startFromStep) {
          stepIndex++;
          continue;
        }

        if (!isInputMapper(node.inputMapper)) {
          return err(
            createValidationFailedError(
              {
                executionId,
                sagaName,
                stepName: node.saga.name,
                stepIndex,
                message: "SubSaga node has invalid inputMapper",
                completedSteps: completedSteps.map(s => s.stepName),
                compensatedSteps: [],
              },
              new Error("SubSaga node has invalid inputMapper")
            )
          );
        }
        const subInput = node.inputMapper({
          input,
          results: { ...accumulatedResults },
          stepIndex,
          executionId,
        });
        const subState: ExecutionState = {
          executionId,
          sagaName: node.saga.name,
          input: subInput,
          accumulatedResults: {},
          completedSteps: [],
          sagaOptions: node.saga.options,
          status: "running",
          abortController: executionState.abortController,
          listeners: [],
          sagaStartTime: Date.now(),
          stepsExecuted: 0,
          stepsSkipped: 0,
          metadata: undefined,
          trace: { stepTraces: [], compensationTrace: undefined },
        };
        const subResult = await executeSagaInternal(
          node.saga,
          subInput,
          resolver,
          subState,
          undefined,
          signal
        );
        if (subResult.isErr()) {
          return subResult;
        }
        accumulatedResults[node.saga.name] = subResult.value.output;
        stepIndex++;
      }
    }

    // All steps completed successfully
    const outputResult = tryCatch(
      () => saga.outputMapper(accumulatedResults),
      (error: unknown) =>
        createStepFailedError(
          {
            executionId,
            sagaName,
            stepName: "",
            stepIndex: -1,
            message: `Output mapper failed: ${String(error)}`,
            completedSteps: completedSteps.map(s => s.stepName),
            compensatedSteps: [],
          },
          error
        )
    );

    if (outputResult.isErr()) {
      return err(outputResult.error);
    }

    const output = outputResult.value;
    executionState.status = "completed";

    await checkpoint(executionState, {
      status: "completed",
      pendingStep: null,
      timestamps: {
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
    });

    emit(executionState, {
      type: "saga:completed",
      executionId,
      sagaName,
      timestamp: Date.now(),
      totalDurationMs: Date.now() - executionState.sagaStartTime,
      stepsExecuted: executionState.stepsExecuted,
      stepsSkipped: executionState.stepsSkipped,
    });

    return ok({ output, executionId });
  })();

  if (globalTimeout) {
    const timeoutPromise = new Promise<SagaResult>(resolve => {
      const timer = setTimeout(() => {
        executionState.abortController.abort();
        resolve(
          err(
            createTimeoutError(
              {
                executionId,
                sagaName,
                stepName: "",
                stepIndex: -1,
                message: `Saga timed out after ${globalTimeout}ms`,
                completedSteps: completedSteps.map(s => s.stepName),
                compensatedSteps: [],
              },
              globalTimeout
            )
          )
        );
      }, globalTimeout);

      signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
    });

    return Promise.race([execPromise, timeoutPromise]);
  }

  return execPromise;
}

// =============================================================================
// Step Node Execution
// =============================================================================

async function executeStepNode(
  step: AnyStepDefinition,
  stepIndex: number,
  resolver: PortResolver,
  executionState: ExecutionState,
  signal: AbortSignal
): Promise<Result<void, SagaError<unknown>>> {
  const { executionId, sagaName, input, accumulatedResults, completedSteps } = executionState;

  // Check condition
  if (step.condition) {
    const ctx = {
      input,
      results: { ...accumulatedResults },
      stepIndex,
      executionId,
    };
    if (!step.condition(ctx)) {
      executionState.stepsSkipped++;
      emit(executionState, {
        type: "step:skipped",
        executionId,
        sagaName,
        stepName: step.name,
        stepIndex,
        timestamp: Date.now(),
        reason: "condition-false",
      });
      return ok(undefined);
    }
  }

  // Call beforeStep hook
  const beforeStepHook = executionState.sagaOptions.hooks?.beforeStep;
  if (beforeStepHook) {
    tryCatch(
      () =>
        beforeStepHook({
          stepName: step.name,
          stepIndex,
          executionId,
          sagaName,
          isCompensation: false,
          metadata: executionState.metadata,
        }),
      () => undefined
    );
  }

  const stepStartTime = Date.now();

  emit(executionState, {
    type: "step:started",
    executionId,
    sagaName,
    stepName: step.name,
    stepIndex,
    timestamp: stepStartTime,
  });

  // Tracing: step start span
  if (executionState.tracingHook) {
    tryCatch(
      () => executionState.tracingHook?.onStepStart(sagaName, step.name, stepIndex),
      () => undefined
    );
  }

  // Resolve port
  const resolveResult = tryCatch(
    () => resolver.resolve(step.port.__portName),
    () => step.port.__portName
  );

  if (resolveResult.isErr()) {
    return err(
      createPortNotFoundError(
        {
          executionId,
          sagaName,
          stepName: step.name,
          stepIndex,
          message: `Port "${step.port.__portName}" not found in container`,
          completedSteps: completedSteps.map(s => s.stepName),
          compensatedSteps: [],
        },
        step.port.__portName
      )
    );
  }

  const portService = resolveResult.value;

  // Build invoke params
  const ctx = {
    input,
    results: { ...accumulatedResults },
    stepIndex,
    executionId,
  };
  const params = step.invoke(ctx);

  const stepResult = await executeStepWithRetry(
    step,
    params,
    portService,
    step.options?.retry,
    step.options?.timeout,
    signal
  );

  if (stepResult.isErr()) {
    const error = stepResult.error;

    const attemptCount = step.options?.retry ? step.options.retry.maxAttempts + 1 : 1;
    const stepDuration = Date.now() - stepStartTime;

    // Call afterStep hook for failure
    const afterStepHookErr = executionState.sagaOptions.hooks?.afterStep;
    if (afterStepHookErr) {
      tryCatch(
        () =>
          afterStepHookErr({
            stepName: step.name,
            stepIndex,
            result: undefined,
            error,
            durationMs: stepDuration,
            attemptCount,
            executionId,
            sagaName,
            isCompensation: false,
            metadata: executionState.metadata,
          }),
        () => undefined
      );
    }

    // Tracing: step end span (error)
    if (executionState.tracingHook) {
      tryCatch(
        () => executionState.tracingHook?.onStepEnd(sagaName, false),
        () => undefined
      );
    }

    if (error instanceof TimeoutSignal) {
      return handleStepFailure(
        executionState,
        step,
        stepIndex,
        error,
        resolver,
        true,
        error.timeoutMs
      );
    }

    emit(executionState, {
      type: "step:failed",
      executionId,
      sagaName,
      stepName: step.name,
      stepIndex,
      error,
      attemptCount,
      timestamp: Date.now(),
      retriesExhausted: true,
    });

    return handleStepFailure(executionState, step, stepIndex, error, resolver, false, undefined);
  }

  accumulatedResults[step.name] = stepResult.value;
  completedSteps.push({
    stepName: step.name,
    stepIndex,
    result: stepResult.value,
    step,
  });

  executionState.stepsExecuted++;

  emit(executionState, {
    type: "step:completed",
    executionId,
    sagaName,
    stepName: step.name,
    stepIndex,
    timestamp: Date.now(),
    durationMs: Date.now() - stepStartTime,
  });

  // Tracing: step end span (success)
  if (executionState.tracingHook) {
    tryCatch(
      () => executionState.tracingHook?.onStepEnd(sagaName, true),
      () => undefined
    );
  }

  // Call afterStep hook for success
  const afterStepHookOk = executionState.sagaOptions.hooks?.afterStep;
  if (afterStepHookOk) {
    tryCatch(
      () =>
        afterStepHookOk({
          stepName: step.name,
          stepIndex,
          result: stepResult.value,
          error: undefined,
          durationMs: Date.now() - stepStartTime,
          attemptCount: 1,
          executionId,
          sagaName,
          isCompensation: false,
          metadata: executionState.metadata,
        }),
      () => undefined
    );
  }

  return ok(undefined);
}

// =============================================================================
// Node Helpers
// =============================================================================

function getNodes(saga: AnySagaDefinition): readonly SagaNode[] {
  return extractNodes(saga);
}

export function resolveStepByName(
  nodes: readonly SagaNode[],
  stepName: string
): AnyStepDefinition | undefined {
  for (const node of nodes) {
    if (node._type === "step" && node.step.name === stepName) {
      return node.step;
    }
    if (node._type === "parallel") {
      const found = node.steps.find(s => s.name === stepName);
      if (found) return found;
    }
    if (node._type === "branch") {
      for (const branchSteps of Object.values(node.branches)) {
        const found = branchSteps.find(s => s.name === stepName);
        if (found) return found;
      }
    }
  }
  return undefined;
}
