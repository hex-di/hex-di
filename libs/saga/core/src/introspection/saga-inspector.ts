/**
 * Saga Inspector Factory
 *
 * Creates a SagaInspector that provides pull-based queries and
 * push-based subscriptions for saga introspection.
 *
 * @packageDocumentation
 */

import { ResultAsync } from "@hex-di/result";
import type { PersistenceError } from "../ports/types.js";
import type { SagaPersister, SagaExecutionState, PersisterFilters } from "../ports/types.js";
import type { AnySagaDefinition } from "../saga/types.js";
import type { AnyStepDefinition } from "../step/types.js";
import type {
  SagaEventListener,
  Unsubscribe,
  ExecutionTrace,
  SagaEvent,
} from "../runtime/types.js";
import type {
  SagaInspector,
  SagaDefinitionInfo,
  StepDefinitionInfo,
  RetryPolicyInfo,
  InspectorSagaExecutionSummary,
  CompensationStats,
  SagaCompensationBreakdown,
  SagaSuggestion,
} from "./types.js";

// =============================================================================
// Configuration
// =============================================================================

export interface SagaInspectorConfig {
  /** Registered saga definitions */
  readonly definitions: readonly AnySagaDefinition[];
  /** Persister for execution history (optional) */
  readonly persister?: SagaPersister;
  /** Active execution traces tracked by the runner */
  readonly activeTraces?: Readonly<Record<string, ExecutionTrace>>;
}

// =============================================================================
// Internal registry: maps inspector instances to their listener sets
// =============================================================================

const inspectorListenerRegistry = new WeakMap<SagaInspector, Set<SagaEventListener>>();

// =============================================================================
// Factory
// =============================================================================

export function createSagaInspector(config: SagaInspectorConfig): SagaInspector {
  const { definitions, persister, activeTraces } = config;
  const listeners = new Set<SagaEventListener>();

  function extractDefinitionInfo(saga: AnySagaDefinition): SagaDefinitionInfo {
    const steps = saga.steps.map(step => extractStepInfo(step));
    const portDependencies = saga.steps.map(step => step.port.__portName);

    return Object.freeze({
      name: saga.name,
      steps,
      options: {
        compensationStrategy: saga.options.compensationStrategy,
        timeout: saga.options.timeout,
        retryPolicy: undefined,
      },
      portDependencies,
    });
  }

  function extractStepInfo(step: AnyStepDefinition): StepDefinitionInfo {
    let retryPolicy: RetryPolicyInfo | undefined;

    if (step.options?.retry) {
      const delay = step.options.retry.delay;
      retryPolicy = {
        maxAttempts: step.options.retry.maxAttempts,
        backoffStrategy: typeof delay === "function" ? "exponential" : "fixed",
        initialDelay: typeof delay === "number" ? delay : 0,
      };
    }

    return Object.freeze({
      name: step.name,
      port: step.port.__portName,
      hasCompensation: step.compensate !== null,
      isConditional: step.condition !== null,
      retryPolicy,
      timeout: step.options?.timeout,
    });
  }

  function executionStateToSummary(
    state: SagaExecutionState,
    totalSteps: number
  ): InspectorSagaExecutionSummary {
    const completedAt = state.timestamps.completedAt;
    const startedAt = state.timestamps.startedAt;
    const durationMs =
      completedAt !== null ? new Date(completedAt).getTime() - new Date(startedAt).getTime() : null;

    let errorInfo: InspectorSagaExecutionSummary["error"] = null;
    if (state.error) {
      const fields = state.error.fields ?? {};
      const stepName = typeof fields.stepName === "string" ? fields.stepName : "";
      errorInfo = {
        _tag: state.error._tag,
        stepName,
        causeTags: extractCauseTags(fields.cause),
      };
    }

    return Object.freeze({
      executionId: state.executionId,
      sagaName: state.sagaName,
      status: state.status,
      currentStepName: (() => {
        const def = findDefinitionForSaga(state.sagaName);
        if (!def || state.currentStep >= def.steps.length) return null;
        return def.steps[state.currentStep]?.name ?? null;
      })(),
      currentStepIndex: state.currentStep,
      totalSteps,
      completedStepCount: state.completedSteps.length,
      startedAt,
      updatedAt: state.timestamps.updatedAt,
      completedAt,
      durationMs,
      error: errorInfo,
      compensationState: {
        active: state.compensation.active,
        compensatedSteps: [...state.compensation.compensatedSteps],
        failedSteps: [...state.compensation.failedSteps],
      },
      metadata: { ...state.metadata },
    });
  }

  function extractCauseTags(cause: unknown): readonly string[] {
    if (cause === null || cause === undefined) return [];
    if (typeof cause !== "object" || !("_tag" in cause)) return [];
    const tag = cause._tag;
    if (typeof tag !== "string") return [];
    const tags: string[] = [tag];
    if ("cause" in cause && cause.cause !== undefined) {
      tags.push(...extractCauseTags(cause.cause));
    }
    return tags;
  }

  function findDefinitionForSaga(sagaName: string): AnySagaDefinition | undefined {
    return definitions.find(d => d.name === sagaName);
  }

  function computeCompensationStats(executions: readonly SagaExecutionState[]): CompensationStats {
    const compensated = executions.filter(
      e =>
        e.compensation.compensatedSteps.length > 0 ||
        e.compensation.failedSteps.length > 0 ||
        e.compensation.active ||
        e.compensation.triggeringStepIndex !== null
    );

    const bySagaMap = new Map<string, SagaExecutionState[]>();
    for (const exec of compensated) {
      const existing = bySagaMap.get(exec.sagaName) ?? [];
      existing.push(exec);
      bySagaMap.set(exec.sagaName, existing);
    }

    let mostCompensatedSaga: string | null = null;
    let mostCompensatedCount = 0;
    const bySaga: SagaCompensationBreakdown[] = [];

    for (const [sagaName, sagaExecutions] of bySagaMap) {
      const successful = sagaExecutions.filter(
        e => !e.compensation.active && e.compensation.failedSteps.length === 0
      );
      const failed = sagaExecutions.filter(
        e => !e.compensation.active && e.compensation.failedSteps.length > 0
      );

      const errorTagDist: Record<string, number> = {};
      for (const exec of sagaExecutions) {
        if (exec.error) {
          const tag = exec.error._tag;
          errorTagDist[tag] = (errorTagDist[tag] ?? 0) + 1;
        }
      }

      // Find most failed step
      const stepFailCounts = new Map<string, number>();
      for (const exec of failed) {
        for (const step of exec.compensation.failedSteps) {
          const count = stepFailCounts.get(step) ?? 0;
          stepFailCounts.set(step, count + 1);
        }
      }

      let mostFailedStep: string | null = null;
      let maxFails = 0;
      for (const [step, count] of stepFailCounts) {
        if (count > maxFails) {
          maxFails = count;
          mostFailedStep = step;
        }
      }

      const executionsWithDuration = sagaExecutions.filter(
        e => e.compensation.durationMs !== undefined
      );
      const avgCompTime =
        executionsWithDuration.length > 0
          ? executionsWithDuration.reduce((sum, e) => sum + (e.compensation.durationMs ?? 0), 0) /
            executionsWithDuration.length
          : 0;

      bySaga.push({
        sagaName,
        totalCompensations: sagaExecutions.length,
        successRate: sagaExecutions.length > 0 ? successful.length / sagaExecutions.length : 0,
        averageCompensationTime: avgCompTime,
        mostFailedStep,
        errorTagDistribution: errorTagDist,
      });

      if (sagaExecutions.length > mostCompensatedCount) {
        mostCompensatedCount = sagaExecutions.length;
        mostCompensatedSaga = sagaName;
      }
    }

    const successfulTotal = compensated.filter(
      e => !e.compensation.active && e.compensation.failedSteps.length === 0
    ).length;
    const failedTotal = compensated.filter(
      e => !e.compensation.active && e.compensation.failedSteps.length > 0
    ).length;

    const allWithDuration = compensated.filter(e => e.compensation.durationMs !== undefined);
    const globalAvgCompTime =
      allWithDuration.length > 0
        ? allWithDuration.reduce((sum, e) => sum + (e.compensation.durationMs ?? 0), 0) /
          allWithDuration.length
        : 0;

    return Object.freeze({
      totalCompensations: compensated.length,
      successfulCompensations: successfulTotal,
      failedCompensations: failedTotal,
      averageCompensationTime: globalAvgCompTime,
      mostCompensatedSaga,
      bySaga,
    });
  }

  const inspector: SagaInspector = {
    getDefinitions(): readonly SagaDefinitionInfo[] {
      return definitions.map(extractDefinitionInfo);
    },

    getActiveExecutions(): readonly InspectorSagaExecutionSummary[] {
      if (!activeTraces) return [];

      const activeStatuses = new Set(["pending", "running", "compensating"]);
      const result: InspectorSagaExecutionSummary[] = [];

      for (const trace of Object.values(activeTraces)) {
        if (activeStatuses.has(trace.status)) {
          const def = findDefinitionForSaga(trace.sagaName);
          const totalSteps = def?.steps.length ?? 0;

          result.push(
            Object.freeze({
              executionId: trace.executionId,
              sagaName: trace.sagaName,
              status: trace.status,
              currentStepName: getCurrentStepName(trace),
              currentStepIndex: trace.steps.filter(s => s.status === "completed").length,
              totalSteps,
              completedStepCount: trace.steps.filter(s => s.status === "completed").length,
              startedAt: new Date(trace.startedAt).toISOString(),
              updatedAt: new Date(Date.now()).toISOString(),
              completedAt: null,
              durationMs: null,
              error: null,
              compensationState: {
                active: trace.status === "compensating",
                compensatedSteps: trace.compensation
                  ? trace.compensation.steps
                      .filter(s => s.status === "completed")
                      .map(s => s.stepName)
                  : [],
                failedSteps: trace.compensation
                  ? trace.compensation.steps.filter(s => s.status === "failed").map(s => s.stepName)
                  : [],
              },
              metadata: trace.metadata ?? {},
            })
          );
        }
      }

      return result;
    },

    getHistory(
      filters?: PersisterFilters
    ): ResultAsync<readonly InspectorSagaExecutionSummary[], PersistenceError> {
      if (!persister) return ResultAsync.ok([]);

      return persister.list(filters).map(states =>
        states.map(state => {
          const def = findDefinitionForSaga(state.sagaName);
          const totalSteps = def?.steps.length ?? 0;
          return executionStateToSummary(state, totalSteps);
        })
      );
    },

    getTrace(executionId: string): ExecutionTrace | null {
      if (!activeTraces) return null;
      return activeTraces[executionId] ?? null;
    },

    getCompensationStats(): CompensationStats {
      // Without async access to persister, return stats from active traces
      if (!activeTraces) {
        return Object.freeze({
          totalCompensations: 0,
          successfulCompensations: 0,
          failedCompensations: 0,
          averageCompensationTime: 0,
          mostCompensatedSaga: null,
          bySaga: [],
        });
      }

      // Convert active traces to execution states for stats computation
      const states: SagaExecutionState[] = [];
      for (const trace of Object.values(activeTraces)) {
        states.push(traceToExecutionState(trace));
      }

      return computeCompensationStats(states);
    },

    getSuggestions(): readonly SagaSuggestion[] {
      const suggestions: SagaSuggestion[] = [];
      const defInfos = definitions.map(extractDefinitionInfo);

      for (const def of defInfos) {
        // Steps without compensation handlers
        for (const step of def.steps) {
          if (!step.hasCompensation) {
            suggestions.push({
              type: "saga_step_without_compensation",
              sagaName: def.name,
              stepName: step.name,
              message: `Step "${step.name}" in saga "${def.name}" has no compensation handler`,
              action: `Add a .compensate() handler to step "${step.name}" to ensure rollback on failure`,
            });
          }

          // Steps without retry configuration
          if (!step.retryPolicy) {
            suggestions.push({
              type: "saga_no_retry_on_external_port",
              sagaName: def.name,
              stepName: step.name,
              message: `Step "${step.name}" in saga "${def.name}" has no retry configuration`,
              action: `Add .retry({ maxAttempts: N }) to step "${step.name}" for resilience against transient failures`,
            });
          }
        }

        // Long timeouts without persistence
        const LONG_TIMEOUT_MS = 30_000;
        const sagaTimeout = def.options.timeout;
        if (sagaTimeout !== undefined && sagaTimeout > LONG_TIMEOUT_MS && !persister) {
          suggestions.push({
            type: "saga_long_timeout_without_persistence",
            sagaName: def.name,
            message: `Saga "${def.name}" has a ${sagaTimeout}ms timeout but no persistence adapter`,
            action: `Configure a SagaPersister to enable resume after crashes for long-running sagas`,
          });
        }

        for (const step of def.steps) {
          if (step.timeout !== undefined && step.timeout > LONG_TIMEOUT_MS && !persister) {
            suggestions.push({
              type: "saga_long_timeout_without_persistence",
              sagaName: def.name,
              stepName: step.name,
              message: `Step "${step.name}" in saga "${def.name}" has a ${step.timeout}ms timeout but no persistence adapter`,
              action: `Configure a SagaPersister to enable resume after crashes for long-running steps`,
            });
          }
        }
      }

      // Check for high compensation failure rates from stats
      if (activeTraces) {
        const states: SagaExecutionState[] = [];
        for (const trace of Object.values(activeTraces)) {
          states.push(traceToExecutionState(trace));
        }
        const stats = computeCompensationStats(states);
        for (const sagaStats of stats.bySaga) {
          if (sagaStats.totalCompensations > 0 && sagaStats.successRate < 0.5) {
            suggestions.push({
              type: "saga_step_without_compensation",
              sagaName: sagaStats.sagaName,
              message: `Saga "${sagaStats.sagaName}" has a compensation success rate of ${(sagaStats.successRate * 100).toFixed(0)}%`,
              action: `Review compensation handlers for reliability, consider adding retry logic to compensation steps`,
            });
          }
        }
      }

      return suggestions;
    },

    subscribe(listener: SagaEventListener): Unsubscribe {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  // Register for emitToInspector bridge
  inspectorListenerRegistry.set(inspector, listeners);

  return inspector;
}

// =============================================================================
// Helpers
// =============================================================================

function getCurrentStepName(trace: ExecutionTrace): string | null {
  if (trace.status === "compensating" && trace.compensation) {
    const pendingComp = trace.compensation.steps.find(
      s => s.status !== "completed" && s.status !== "failed"
    );
    return pendingComp?.stepName ?? null;
  }

  const lastCompleted = trace.steps.filter(s => s.status === "completed").length;
  if (lastCompleted < trace.steps.length) {
    return trace.steps[lastCompleted]?.stepName ?? null;
  }

  return null;
}

function traceToExecutionState(trace: ExecutionTrace): SagaExecutionState {
  const failedStep = trace.steps.find(s => s.status === "failed");
  return {
    executionId: trace.executionId,
    sagaName: trace.sagaName,
    input: trace.input,
    currentStep: trace.steps.filter(s => s.status === "completed").length,
    totalSteps: trace.steps.length,
    pendingStep: null,
    completedSteps: trace.steps
      .filter(s => s.status === "completed")
      .map(s => ({
        name: s.stepName,
        index: s.stepIndex,
        output: undefined,
        skipped: false,
        completedAt: s.completedAt ? new Date(s.completedAt).toISOString() : "",
      })),
    status: trace.status,
    error: failedStep
      ? {
          _tag: "StepFailed",
          name: "StepFailed",
          message: "Step failed",
          stack: null,
          code: null,
          fields: {
            stepName: failedStep.stepName,
            stepIndex: failedStep.stepIndex,
            error: failedStep.error,
          },
        }
      : null,
    compensation: trace.compensation
      ? {
          active:
            trace.compensation.status !== "completed" && trace.compensation.status !== "failed",
          compensatedSteps: trace.compensation.steps
            .filter(s => s.status === "completed")
            .map(s => s.stepName),
          failedSteps: trace.compensation.steps
            .filter(s => s.status === "failed")
            .map(s => s.stepName),
          triggeringStepIndex: trace.compensation.triggeredByIndex,
        }
      : { active: false, compensatedSteps: [], failedSteps: [], triggeringStepIndex: null },
    timestamps: {
      startedAt: new Date(trace.startedAt).toISOString(),
      updatedAt: new Date(trace.completedAt ?? Date.now()).toISOString(),
      completedAt: trace.completedAt ? new Date(trace.completedAt).toISOString() : null,
    },
    metadata: trace.metadata ?? {},
  };
}

/**
 * Emit a saga event to all inspector subscribers.
 *
 * Called by the integration layer to bridge runner events
 * to inspector subscriptions.
 */
export function emitToInspector(inspector: SagaInspector, event: SagaEvent): void {
  const listeners = inspectorListenerRegistry.get(inspector);
  if (!listeners) return;

  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // Swallow listener errors to prevent event emission from breaking the saga
    }
  }
}
