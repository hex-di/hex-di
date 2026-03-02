/**
 * Compensation Engine
 *
 * Executes compensation plans in three strategies:
 * - sequential: Reverse-order, one at a time, stops on first failure
 * - parallel: All compensations run concurrently, collects all errors
 * - best-effort: Reverse-order, continues even if some fail
 *
 * S6: Supports per-step compensation timeout via Promise.race.
 * S2: Accumulates DeadLetterEntry on compensation failure.
 *
 * @packageDocumentation
 */

import { tryCatch } from "@hex-di/result";
import type { ResultAsync } from "@hex-di/result";
import type { CompensationContext } from "../step/types.js";
import type {
  CompensationPlanStep,
  CompensationResult,
  CompensationStepError,
  DeadLetterEntry,
} from "./types.js";
import type { SagaEvent } from "../runtime/types.js";

// =============================================================================
// Context Builder
// =============================================================================

type EngineCompensationContext = CompensationContext<unknown, unknown, unknown, unknown>;

/**
 * Safely invokes a step's compensation function and captures errors.
 * @internal
 */
function buildCompensationParams(
  step: CompensationPlanStep,
  ctx: EngineCompensationContext
): ReturnType<typeof tryCatch<unknown, Error>> {
  return tryCatch(
    () => step.compensateFn(ctx),
    (error: unknown) => (error instanceof Error ? error : new Error(String(error)))
  );
}

function buildCompensationContext(
  step: CompensationPlanStep,
  sagaInput: unknown,
  accumulatedResults: Record<string, unknown>,
  originalError: unknown,
  failedStepIndex: number,
  failedStepName: string,
  executionId: string
): EngineCompensationContext {
  return {
    input: sagaInput,
    results: accumulatedResults,
    stepResult: step.result,
    error: originalError,
    failedStepIndex,
    failedStepName,
    stepIndex: step.stepIndex,
    executionId,
  };
}

// =============================================================================
// Port Resolver Type
// =============================================================================

/** Callback to resolve a port and invoke the compensation action */
export type CompensationInvoker = (
  step: CompensationPlanStep,
  params: unknown
) => ResultAsync<unknown, unknown>;

// =============================================================================
// S6: Compensation Timeout Helper
// =============================================================================

function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs: number | undefined,
  stepName: string
): Promise<T> {
  const resolved = Promise.resolve(promise);
  if (timeoutMs === undefined || timeoutMs <= 0) {
    return resolved;
  }

  return Promise.race([
    resolved,
    new Promise<never>((_resolve, reject) => {
      setTimeout(() => {
        reject(new Error(`Compensation for step "${stepName}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
}

// =============================================================================
// S2: Dead-Letter Entry Creator
// =============================================================================

function createDeadLetterEntry(
  executionId: string,
  sagaName: string,
  step: CompensationPlanStep,
  error: unknown
): DeadLetterEntry {
  return Object.freeze({
    executionId,
    sagaName,
    stepName: step.stepName,
    stepIndex: step.stepIndex,
    originalError: error,
    failedAt: new Date().toISOString(),
    retryCount: 0,
  });
}

// =============================================================================
// Event Emission Helper
// =============================================================================

function emitCompensationStepEvent(
  emitEvent: ((event: SagaEvent) => void) | undefined,
  executionId: string,
  sagaName: string,
  step: CompensationPlanStep,
  success: boolean,
  error: unknown,
  durationMs: number
): void {
  if (emitEvent) {
    emitEvent({
      type: "compensation:step",
      executionId,
      sagaName,
      stepName: step.stepName,
      stepIndex: step.stepIndex,
      success,
      error,
      durationMs,
      timestamp: Date.now(),
    });
  }
}

function emitCompensationCompleted(
  emitEvent: ((event: SagaEvent) => void) | undefined,
  executionId: string,
  sagaName: string,
  compensatedSteps: readonly string[],
  startTime: number
): void {
  if (emitEvent) {
    emitEvent({
      type: "compensation:completed",
      executionId,
      sagaName,
      compensatedSteps,
      totalDurationMs: Date.now() - startTime,
      timestamp: Date.now(),
    });
  }
}

function emitCompensationFailed(
  emitEvent: ((event: SagaEvent) => void) | undefined,
  executionId: string,
  sagaName: string,
  failedCompensationStep: string,
  error: unknown,
  compensatedSteps: readonly string[],
  remainingSteps: readonly string[]
): void {
  if (emitEvent) {
    emitEvent({
      type: "compensation:failed",
      executionId,
      sagaName,
      failedCompensationStep,
      error,
      compensatedSteps,
      remainingSteps,
      timestamp: Date.now(),
    });
  }
}

// =============================================================================
// Compensation Step Outcome
// =============================================================================

type CompensationStepOutcome =
  | { readonly step: CompensationPlanStep; readonly ok: true }
  | { readonly step: CompensationPlanStep; readonly ok: false; readonly cause: unknown };

function stepCompensated(step: CompensationPlanStep): CompensationStepOutcome {
  return { step, ok: true };
}

function stepCompensationFailed(
  step: CompensationPlanStep,
  cause: unknown
): CompensationStepOutcome {
  return { step, ok: false, cause };
}

// =============================================================================
// Strategy Implementations
// =============================================================================

async function executeSequential(
  steps: readonly CompensationPlanStep[],
  invoker: CompensationInvoker,
  sagaInput: unknown,
  accumulatedResults: Record<string, unknown>,
  originalError: unknown,
  failedStepIndex: number,
  failedStepName: string,
  executionId: string,
  sagaName: string,
  emitEvent: ((event: SagaEvent) => void) | undefined
): Promise<CompensationResult> {
  const compensatedSteps: string[] = [];
  const failedSteps: string[] = [];
  const errors: CompensationStepError[] = [];
  const deadLetterEntries: DeadLetterEntry[] = [];
  const strategyStart = Date.now();

  // Execute in reverse order
  const reversed = [...steps].reverse();

  for (let i = 0; i < reversed.length; i++) {
    const step = reversed[i];
    const stepStart = Date.now();

    const ctx = buildCompensationContext(
      step,
      sagaInput,
      accumulatedResults,
      originalError,
      failedStepIndex,
      failedStepName,
      executionId
    );

    const paramsResult = buildCompensationParams(step, ctx);

    if (paramsResult.isErr()) {
      failedSteps.push(step.stepName);
      errors.push({
        stepName: step.stepName,
        stepIndex: step.stepIndex,
        cause: paramsResult.error,
      });
      deadLetterEntries.push(
        createDeadLetterEntry(executionId, sagaName, step, paramsResult.error)
      );
      emitCompensationStepEvent(
        emitEvent,
        executionId,
        sagaName,
        step,
        false,
        paramsResult.error,
        Date.now() - stepStart
      );
      const remaining = reversed.slice(i + 1).map(s => s.stepName);
      emitCompensationFailed(
        emitEvent,
        executionId,
        sagaName,
        step.stepName,
        paramsResult.error,
        compensatedSteps,
        remaining
      );
      // Sequential strategy stops on first failure
      break;
    }

    try {
      const result = await withTimeout(
        invoker(step, paramsResult.value).then(r => r),
        step.timeout,
        step.stepName
      );
      if (result.isOk()) {
        compensatedSteps.push(step.stepName);
        emitCompensationStepEvent(
          emitEvent,
          executionId,
          sagaName,
          step,
          true,
          undefined,
          Date.now() - stepStart
        );
      } else {
        failedSteps.push(step.stepName);
        errors.push({
          stepName: step.stepName,
          stepIndex: step.stepIndex,
          cause: result.error,
        });
        deadLetterEntries.push(createDeadLetterEntry(executionId, sagaName, step, result.error));
        emitCompensationStepEvent(
          emitEvent,
          executionId,
          sagaName,
          step,
          false,
          result.error,
          Date.now() - stepStart
        );
        const remaining = reversed.slice(i + 1).map(s => s.stepName);
        emitCompensationFailed(
          emitEvent,
          executionId,
          sagaName,
          step.stepName,
          result.error,
          compensatedSteps,
          remaining
        );
        // Sequential strategy stops on first failure
        break;
      }
    } catch (timeoutError: unknown) {
      failedSteps.push(step.stepName);
      errors.push({
        stepName: step.stepName,
        stepIndex: step.stepIndex,
        cause: timeoutError,
      });
      deadLetterEntries.push(createDeadLetterEntry(executionId, sagaName, step, timeoutError));
      emitCompensationStepEvent(
        emitEvent,
        executionId,
        sagaName,
        step,
        false,
        timeoutError,
        Date.now() - stepStart
      );
      const remaining = reversed.slice(i + 1).map(s => s.stepName);
      emitCompensationFailed(
        emitEvent,
        executionId,
        sagaName,
        step.stepName,
        timeoutError,
        compensatedSteps,
        remaining
      );
      break;
    }
  }

  if (failedSteps.length === 0) {
    emitCompensationCompleted(emitEvent, executionId, sagaName, compensatedSteps, strategyStart);
  }

  return {
    compensatedSteps,
    failedSteps,
    errors,
    allSucceeded: failedSteps.length === 0,
    deadLetterEntries: deadLetterEntries.length > 0 ? deadLetterEntries : undefined,
  };
}

async function executeParallel(
  steps: readonly CompensationPlanStep[],
  invoker: CompensationInvoker,
  sagaInput: unknown,
  accumulatedResults: Record<string, unknown>,
  originalError: unknown,
  failedStepIndex: number,
  failedStepName: string,
  executionId: string,
  sagaName: string,
  emitEvent: ((event: SagaEvent) => void) | undefined
): Promise<CompensationResult> {
  const compensatedSteps: string[] = [];
  const failedSteps: string[] = [];
  const errors: CompensationStepError[] = [];
  const deadLetterEntries: DeadLetterEntry[] = [];
  const strategyStart = Date.now();

  const outcomes = await Promise.all(
    steps.map(async step => {
      const stepStart = Date.now();
      const ctx = buildCompensationContext(
        step,
        sagaInput,
        accumulatedResults,
        originalError,
        failedStepIndex,
        failedStepName,
        executionId
      );

      const paramsResult = buildCompensationParams(step, ctx);

      if (paramsResult.isErr()) {
        emitCompensationStepEvent(
          emitEvent,
          executionId,
          sagaName,
          step,
          false,
          paramsResult.error,
          Date.now() - stepStart
        );
        return stepCompensationFailed(step, paramsResult.error);
      }

      try {
        return await withTimeout(
          invoker(step, paramsResult.value).then(r =>
            r.match(
              (): CompensationStepOutcome => {
                emitCompensationStepEvent(
                  emitEvent,
                  executionId,
                  sagaName,
                  step,
                  true,
                  undefined,
                  Date.now() - stepStart
                );
                return stepCompensated(step);
              },
              (error): CompensationStepOutcome => {
                emitCompensationStepEvent(
                  emitEvent,
                  executionId,
                  sagaName,
                  step,
                  false,
                  error,
                  Date.now() - stepStart
                );
                return stepCompensationFailed(step, error);
              }
            )
          ),
          step.timeout,
          step.stepName
        );
      } catch (timeoutError: unknown) {
        emitCompensationStepEvent(
          emitEvent,
          executionId,
          sagaName,
          step,
          false,
          timeoutError,
          Date.now() - stepStart
        );
        return stepCompensationFailed(step, timeoutError);
      }
    })
  );

  let firstFailedStep: string | undefined;
  let firstError: unknown;

  for (const outcome of outcomes) {
    if (outcome.ok) {
      compensatedSteps.push(outcome.step.stepName);
    } else {
      failedSteps.push(outcome.step.stepName);
      errors.push({
        stepName: outcome.step.stepName,
        stepIndex: outcome.step.stepIndex,
        cause: outcome.cause,
      });
      deadLetterEntries.push(
        createDeadLetterEntry(executionId, sagaName, outcome.step, outcome.cause)
      );
      if (firstFailedStep === undefined) {
        firstFailedStep = outcome.step.stepName;
        firstError = outcome.cause;
      }
    }
  }

  if (failedSteps.length === 0) {
    emitCompensationCompleted(emitEvent, executionId, sagaName, compensatedSteps, strategyStart);
  } else {
    emitCompensationFailed(
      emitEvent,
      executionId,
      sagaName,
      firstFailedStep ?? "",
      firstError,
      compensatedSteps,
      []
    );
  }

  return {
    compensatedSteps,
    failedSteps,
    errors,
    allSucceeded: failedSteps.length === 0,
    deadLetterEntries: deadLetterEntries.length > 0 ? deadLetterEntries : undefined,
  };
}

async function executeBestEffort(
  steps: readonly CompensationPlanStep[],
  invoker: CompensationInvoker,
  sagaInput: unknown,
  accumulatedResults: Record<string, unknown>,
  originalError: unknown,
  failedStepIndex: number,
  failedStepName: string,
  executionId: string,
  sagaName: string,
  emitEvent: ((event: SagaEvent) => void) | undefined
): Promise<CompensationResult> {
  const compensatedSteps: string[] = [];
  const failedSteps: string[] = [];
  const errors: CompensationStepError[] = [];
  const deadLetterEntries: DeadLetterEntry[] = [];
  const strategyStart = Date.now();

  // Execute in reverse order, but continue on failure
  const reversed = [...steps].reverse();

  let firstFailedStep: string | undefined;
  let firstError: unknown;

  for (const step of reversed) {
    const stepStart = Date.now();
    const ctx = buildCompensationContext(
      step,
      sagaInput,
      accumulatedResults,
      originalError,
      failedStepIndex,
      failedStepName,
      executionId
    );

    const paramsResult = buildCompensationParams(step, ctx);

    if (paramsResult.isErr()) {
      failedSteps.push(step.stepName);
      errors.push({
        stepName: step.stepName,
        stepIndex: step.stepIndex,
        cause: paramsResult.error,
      });
      deadLetterEntries.push(
        createDeadLetterEntry(executionId, sagaName, step, paramsResult.error)
      );
      emitCompensationStepEvent(
        emitEvent,
        executionId,
        sagaName,
        step,
        false,
        paramsResult.error,
        Date.now() - stepStart
      );
      if (firstFailedStep === undefined) {
        firstFailedStep = step.stepName;
        firstError = paramsResult.error;
      }
      // Best-effort: continue to next step despite failure
      continue;
    }

    try {
      const result = await withTimeout(
        invoker(step, paramsResult.value).then(r => r),
        step.timeout,
        step.stepName
      );
      if (result.isOk()) {
        compensatedSteps.push(step.stepName);
        emitCompensationStepEvent(
          emitEvent,
          executionId,
          sagaName,
          step,
          true,
          undefined,
          Date.now() - stepStart
        );
      } else {
        failedSteps.push(step.stepName);
        errors.push({
          stepName: step.stepName,
          stepIndex: step.stepIndex,
          cause: result.error,
        });
        deadLetterEntries.push(createDeadLetterEntry(executionId, sagaName, step, result.error));
        emitCompensationStepEvent(
          emitEvent,
          executionId,
          sagaName,
          step,
          false,
          result.error,
          Date.now() - stepStart
        );
        if (firstFailedStep === undefined) {
          firstFailedStep = step.stepName;
          firstError = result.error;
        }
        // Best-effort: continue to next step despite failure
      }
    } catch (timeoutError: unknown) {
      failedSteps.push(step.stepName);
      errors.push({
        stepName: step.stepName,
        stepIndex: step.stepIndex,
        cause: timeoutError,
      });
      deadLetterEntries.push(createDeadLetterEntry(executionId, sagaName, step, timeoutError));
      emitCompensationStepEvent(
        emitEvent,
        executionId,
        sagaName,
        step,
        false,
        timeoutError,
        Date.now() - stepStart
      );
      if (firstFailedStep === undefined) {
        firstFailedStep = step.stepName;
        firstError = timeoutError;
      }
      // Best-effort: continue to next step despite failure
    }
  }

  if (failedSteps.length === 0) {
    emitCompensationCompleted(emitEvent, executionId, sagaName, compensatedSteps, strategyStart);
  } else {
    emitCompensationFailed(
      emitEvent,
      executionId,
      sagaName,
      firstFailedStep ?? "",
      firstError,
      compensatedSteps,
      []
    );
  }

  return {
    compensatedSteps,
    failedSteps,
    errors,
    allSucceeded: failedSteps.length === 0,
    deadLetterEntries: deadLetterEntries.length > 0 ? deadLetterEntries : undefined,
  };
}

// =============================================================================
// Public API
// =============================================================================

export interface CompensationEngineInput {
  readonly plan: {
    readonly completedSteps: readonly CompensationPlanStep[];
    readonly strategy: "sequential" | "parallel" | "best-effort";
  };
  readonly invoker: CompensationInvoker;
  readonly sagaInput: unknown;
  readonly accumulatedResults: Record<string, unknown>;
  readonly originalError: unknown;
  readonly failedStepIndex: number;
  readonly failedStepName: string;
  readonly executionId: string;
  readonly sagaName: string;
  readonly emitEvent?: (event: SagaEvent) => void;
}

/**
 * Execute a compensation plan using the specified strategy.
 *
 * @param input - All context needed for the compensation execution
 * @returns The compensation result with status of each step
 */
export async function executeCompensation(
  input: CompensationEngineInput
): Promise<CompensationResult> {
  const {
    plan,
    invoker,
    sagaInput,
    accumulatedResults,
    originalError,
    failedStepIndex,
    failedStepName,
    executionId,
    sagaName,
    emitEvent,
  } = input;

  const stepsToCompensate = plan.completedSteps.filter(s => s.compensateFn !== null);

  if (stepsToCompensate.length === 0) {
    return {
      compensatedSteps: [],
      failedSteps: [],
      errors: [],
      allSucceeded: true,
    };
  }

  switch (plan.strategy) {
    case "sequential":
      return executeSequential(
        stepsToCompensate,
        invoker,
        sagaInput,
        accumulatedResults,
        originalError,
        failedStepIndex,
        failedStepName,
        executionId,
        sagaName,
        emitEvent
      );
    case "parallel":
      return executeParallel(
        stepsToCompensate,
        invoker,
        sagaInput,
        accumulatedResults,
        originalError,
        failedStepIndex,
        failedStepName,
        executionId,
        sagaName,
        emitEvent
      );
    case "best-effort":
      return executeBestEffort(
        stepsToCompensate,
        invoker,
        sagaInput,
        accumulatedResults,
        originalError,
        failedStepIndex,
        failedStepName,
        executionId,
        sagaName,
        emitEvent
      );
  }
}
