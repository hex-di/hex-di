/**
 * Saga Runner
 *
 * Core runtime that executes saga definitions step-by-step,
 * handles retries, timeouts, compensation, and produces
 * typed Result values.
 *
 * @packageDocumentation
 */

import { ResultAsync, ok, err, safeTry } from "@hex-di/result";
import type { SagaSuccess, SagaError } from "../errors/types.js";
import {
  extractNodes,
  narrowRunnerExecute,
  createResumeNotImplemented,
  okVoidManagement,
  errVoidManagement,
  okStatusManagement,
  errStatusManagement,
} from "./runner-bridges.js";
import type {
  AnySagaDefinition,
  InferSagaInput,
  InferSagaOutput,
  InferSagaErrors,
} from "../saga/types.js";
import type { SagaRunner, SagaRunnerConfig, ExecuteOptions, PortResolver } from "./types.js";
import { createSagaTracingHook } from "../introspection/saga-tracing-hook.js";
import type { SagaExecutionState } from "../ports/types.js";
import { generateExecutionId } from "./id.js";
import type { ExecutionState, CompletedStepInfo, SagaResult } from "./execution-state.js";
import { emit, buildExecutionTrace } from "./events.js";
import { buildSagaStatus } from "./status-builder.js";
import { executeSagaInternal, resolveStepByName } from "./saga-executor.js";
import { createValidationFailedError } from "../errors/factories.js";

// =============================================================================
// GxP Tracing Warning (warnOnce)
// =============================================================================

let gxpTracingWarned = false;

// =============================================================================
// Public API
// =============================================================================

/**
 * Creates a SagaRunner that executes saga definitions.
 *
 * @param resolver - Port resolver (typically wraps a container)
 * @param config - Optional configuration (persister for resume support)
 * @returns A SagaRunner instance
 */
export function createSagaRunner(resolver: PortResolver, config?: SagaRunnerConfig): SagaRunner {
  const executions = new Map<string, ExecutionState>();
  const sagaRegistry = new Map<string, AnySagaDefinition>();
  const persister = config?.persister;

  // Resolve tracing: explicit tracingHook takes precedence over tracer shorthand
  const tracingHook =
    config?.tracingHook ??
    (config?.tracer !== undefined ? createSagaTracingHook({ tracer: config.tracer }) : undefined);

  return {
    execute(saga, input, options) {
      // Register saga for resume lookup
      sagaRegistry.set(saga.name, saga);

      const executionId = options?.executionId ?? generateExecutionId();
      const abortController = new AbortController();

      if (options?.signal) {
        options.signal.addEventListener("abort", () => abortController.abort(), { once: true });
      }

      // GxP tracing warning: warn once if no tracing listeners
      if (
        !gxpTracingWarned &&
        !tracingHook &&
        !config?.suppressGxpWarnings &&
        (!options?.listeners || options.listeners.length === 0)
      ) {
        gxpTracingWarned = true;
        globalThis.console.warn(
          "[GxP] Saga execute() called without tracing listeners. " +
            "Consider configuring a tracingHook or event listeners for audit compliance."
        );
      }

      const nodes = extractNodes(saga);
      const state: ExecutionState = {
        executionId,
        sagaName: saga.name,
        input,
        accumulatedResults: {},
        completedSteps: [],
        sagaOptions: saga.options,
        persister,
        sagaDefinition: saga,
        status: "running",
        abortController,
        listeners: options?.listeners ? [...options.listeners] : [],
        sagaStartTime: Date.now(),
        stepsExecuted: 0,
        stepsSkipped: 0,
        metadata: options?.metadata,
        trace: { stepTraces: [], compensationTrace: undefined },
        tracingHook,
      };

      executions.set(executionId, state);

      const globalTimeout = options?.timeout ?? saga.options?.timeout;

      // S4: Runtime input validation + persistence + execution
      const executeWithValidation = async (): Promise<SagaResult> => {
        // S4: Runtime input validation
        if (saga.options.inputValidator) {
          const isValid = saga.options.inputValidator(input);
          if (!isValid) {
            return err(
              createValidationFailedError(
                {
                  executionId,
                  sagaName: saga.name,
                  stepName: "",
                  stepIndex: -1,
                  message: "Input validation failed",
                  completedSteps: [],
                  compensatedSteps: [],
                },
                new Error("Input validation failed")
              )
            );
          }
        }

        // Save initial state to persister if available
        if (persister) {
          const initialState: SagaExecutionState = {
            executionId,
            sagaName: saga.name,
            input,
            currentStep: 0,
            totalSteps: nodes.length,
            pendingStep: null,
            completedSteps: [],
            status: "running",
            error: null,
            compensation: {
              active: false,
              compensatedSteps: [],
              failedSteps: [],
              triggeringStepIndex: null,
            },
            timestamps: {
              startedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              completedAt: null,
            },
            metadata: options?.metadata ?? {},
            sagaVersion: saga.version,
          };
          await persister.save(initialState).orTee(error => {
            emit(state, {
              type: "step:failed",
              executionId,
              sagaName: saga.name,
              stepName: "__persistence_init",
              stepIndex: -1,
              error,
              attemptCount: 1,
              timestamp: Date.now(),
              retriesExhausted: true,
            });
          });
        }

        return executeSagaInternal(
          saga,
          input,
          resolver,
          state,
          globalTimeout,
          abortController.signal
        );
      };

      return ResultAsync.fromResult(executeWithValidation());
    },

    resume(executionId) {
      if (!persister) {
        return createResumeNotImplemented(executionId);
      }

      const resumeAsync = async (): Promise<SagaResult> =>
        safeTry(async function* () {
          const persistedState = yield* await persister
            .load(executionId)
            .mapErr(
              (cause): SagaError<unknown> => ({
                _tag: "PersistenceFailed",
                executionId,
                sagaName: "",
                stepName: "",
                stepIndex: -1,
                message: `Failed to load execution state for ${executionId}`,
                completedSteps: [],
                compensatedSteps: [],
                operation: "load",
                cause,
              })
            )
            .andThen(state =>
              state !== null
                ? ok(state)
                : err<SagaError<unknown>>({
                    _tag: "PersistenceFailed",
                    executionId,
                    sagaName: "",
                    stepName: "",
                    stepIndex: -1,
                    message: `No persisted state found for execution ${executionId}`,
                    completedSteps: [],
                    compensatedSteps: [],
                    operation: "load",
                    cause: undefined,
                  })
            );

          const saga = sagaRegistry.get(persistedState.sagaName);
          if (!saga) {
            return err<SagaError<unknown>>({
              _tag: "StepFailed",
              executionId,
              sagaName: persistedState.sagaName,
              stepName: "",
              stepIndex: -1,
              message: `Saga "${persistedState.sagaName}" not found in registry. Register it by calling execute() first or use registerSaga().`,
              completedSteps: [],
              compensatedSteps: [],
              cause: new Error(`Saga "${persistedState.sagaName}" not registered`),
            });
          }

          const nodes = extractNodes(saga);
          const totalSteps = nodes.length;

          // S10: Validate currentStep bounds
          if (persistedState.currentStep < 0 || persistedState.currentStep > totalSteps) {
            return err<SagaError<unknown>>(
              createValidationFailedError(
                {
                  executionId,
                  sagaName: persistedState.sagaName,
                  stepName: "",
                  stepIndex: persistedState.currentStep,
                  message: `Resume state validation failed: currentStep ${persistedState.currentStep} is out of bounds [0, ${totalSteps}]`,
                  completedSteps: persistedState.completedSteps.map(s => s.name),
                  compensatedSteps: [],
                },
                new Error(
                  `currentStep ${persistedState.currentStep} out of bounds [0, ${totalSteps}]`
                )
              )
            );
          }

          // S10: Validate all completedSteps[].name exist in the saga definition
          for (const persisted of persistedState.completedSteps) {
            const stepDef = resolveStepByName(nodes, persisted.name);
            if (!stepDef) {
              return err<SagaError<unknown>>(
                createValidationFailedError(
                  {
                    executionId,
                    sagaName: persistedState.sagaName,
                    stepName: persisted.name,
                    stepIndex: persisted.index,
                    message: `Resume state validation failed: completed step "${persisted.name}" does not exist in saga definition`,
                    completedSteps: persistedState.completedSteps.map(s => s.name),
                    compensatedSteps: [],
                  },
                  new Error(`Step "${persisted.name}" not found in saga definition`)
                )
              );
            }
          }

          // S7: Version mismatch warning
          if (
            saga.version !== undefined &&
            persistedState.sagaVersion !== undefined &&
            saga.version !== persistedState.sagaVersion
          ) {
            globalThis.console.warn(
              `[GxP] Saga "${saga.name}" version mismatch: persisted=${persistedState.sagaVersion}, current=${saga.version}`
            );
          }

          // Reconstruct accumulated results from completed steps
          const accumulatedResults: Record<string, unknown> = {};
          const completedSteps: CompletedStepInfo[] = [];

          for (const persisted of persistedState.completedSteps) {
            accumulatedResults[persisted.name] = persisted.output;

            // S10: Resolve the step definition; return error if not found (no dangerous fallback)
            const stepDef = resolveStepByName(nodes, persisted.name);
            if (!stepDef) {
              return err<SagaError<unknown>>(
                createValidationFailedError(
                  {
                    executionId,
                    sagaName: persistedState.sagaName,
                    stepName: persisted.name,
                    stepIndex: persisted.index,
                    message: `Step "${persisted.name}" not found in saga definition`,
                    completedSteps: persistedState.completedSteps.map(s => s.name),
                    compensatedSteps: [],
                  },
                  new Error(`Step "${persisted.name}" not found in saga definition`)
                )
              );
            }
            completedSteps.push({
              stepName: persisted.name,
              stepIndex: persisted.index,
              result: persisted.output,
              step: stepDef,
            });
          }

          const abortController = new AbortController();
          const state: ExecutionState = {
            executionId,
            sagaName: saga.name,
            input: persistedState.input,
            accumulatedResults,
            completedSteps,
            sagaOptions: saga.options,
            persister,
            sagaDefinition: saga,
            status: "running",
            abortController,
            listeners: [],
            sagaStartTime: Date.now(),
            stepsExecuted: 0,
            stepsSkipped: 0,
            metadata: persistedState.metadata ?? undefined,
            trace: { stepTraces: [], compensationTrace: undefined },
            tracingHook,
          };

          executions.set(executionId, state);

          // S1: If pendingStep is set and not in completedSteps, re-execute from that step
          let startFromStep = persistedState.currentStep;
          if (persistedState.pendingStep !== null) {
            const pendingName = persistedState.pendingStep.name;
            const alreadyCompleted = persistedState.completedSteps.some(
              s => s.name === pendingName
            );
            if (!alreadyCompleted) {
              startFromStep = persistedState.pendingStep.index;
            }
          }

          return executeSagaInternal(
            saga,
            persistedState.input,
            resolver,
            state,
            undefined,
            abortController.signal,
            startFromStep
          );
        });

      return ResultAsync.fromResult(resumeAsync());
    },

    cancel(executionId) {
      const state = executions.get(executionId);
      if (!state) {
        return errVoidManagement({
          _tag: "ExecutionNotFound",
          message: `Execution ${executionId} not found`,
          executionId,
        });
      }

      state.abortController.abort();
      return okVoidManagement();
    },

    getStatus(executionId) {
      const state = executions.get(executionId);
      if (!state) {
        return errStatusManagement({
          _tag: "ExecutionNotFound",
          message: `Execution ${executionId} not found`,
          executionId,
        });
      }

      const now = Date.now();
      const completedStepNames = state.completedSteps.map(s => s.stepName);

      const status = buildSagaStatus(
        state.status,
        executionId,
        state.sagaName,
        completedStepNames,
        now
      );
      return okStatusManagement(status);
    },

    subscribe(executionId, listener) {
      const state = executions.get(executionId);
      if (!state) {
        return () => {};
      }

      state.listeners.push(listener);
      return () => {
        const idx = state.listeners.indexOf(listener);
        if (idx !== -1) {
          state.listeners.splice(idx, 1);
        }
      };
    },

    getTrace(executionId) {
      const state = executions.get(executionId);
      if (!state) {
        return null;
      }
      return buildExecutionTrace(state);
    },
  };
}

// =============================================================================
// Type-Safe Execution Helper
// =============================================================================

/**
 * Type-safe saga execution helper.
 *
 * Provides full generic type inference for saga input/output/error types
 * while delegating to the type-erased SagaRunner. This is the primary
 * entry point for executing sagas with typed results.
 *
 * @example
 * ```typescript
 * const result = await executeSaga(runner, OrderSaga, orderInput);
 * // result: Result<SagaSuccess<OrderOutput>, SagaError<OrderErrors>>
 * ```
 */
export function executeSaga<TSaga extends AnySagaDefinition>(
  runner: SagaRunner,
  saga: TSaga,
  input: InferSagaInput<TSaga>,
  options?: ExecuteOptions
): ResultAsync<SagaSuccess<InferSagaOutput<TSaga>>, SagaError<InferSagaErrors<TSaga>>> {
  return narrowRunnerExecute<InferSagaOutput<TSaga>, InferSagaErrors<TSaga>>(
    runner.execute(saga, input, options)
  );
}
