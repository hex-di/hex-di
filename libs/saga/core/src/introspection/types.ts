/**
 * Saga Introspection Types
 *
 * Types for the SagaInspector API providing pull-based queries
 * and push-based subscriptions for saga state.
 *
 * @packageDocumentation
 */

import type { ResultAsync } from "@hex-di/result";
import type { SagaStatusType } from "../errors/types.js";
import type { SagaEventListener, Unsubscribe, ExecutionTrace } from "../runtime/types.js";
import type { PersistenceError, PersisterFilters } from "../ports/types.js";

// =============================================================================
// SagaDefinitionInfo
// =============================================================================

/** Structural metadata for a registered saga definition */
export interface SagaDefinitionInfo {
  /** Saga name from defineSaga("name") */
  readonly name: string;
  /** Ordered list of steps with their structural metadata */
  readonly steps: readonly StepDefinitionInfo[];
  /** Saga-level configuration */
  readonly options: {
    readonly compensationStrategy: "sequential" | "parallel" | "best-effort";
    readonly timeout: number | undefined;
    readonly retryPolicy: RetryPolicyInfo | undefined;
  };
  /** All ports that this saga's steps depend on */
  readonly portDependencies: readonly string[];
}

/** Structural metadata for a step within a saga definition */
export interface StepDefinitionInfo {
  /** Step name from defineStep("name") */
  readonly name: string;
  /** Port name this step invokes */
  readonly port: string;
  /** Whether a compensation handler is defined for this step */
  readonly hasCompensation: boolean;
  /** Whether this step has a condition (may be skipped at runtime) */
  readonly isConditional: boolean;
  /** Step-level retry policy, if any */
  readonly retryPolicy: RetryPolicyInfo | undefined;
  /** Step-level timeout, if any */
  readonly timeout: number | undefined;
}

/** Retry policy information for display/diagnostics */
export interface RetryPolicyInfo {
  readonly maxAttempts: number;
  readonly backoffStrategy: "fixed" | "exponential" | "linear";
  readonly initialDelay: number;
}

// =============================================================================
// InspectorSagaExecutionSummary
// =============================================================================

/**
 * Extended execution summary for introspection.
 *
 * This is the rich version used by the SagaInspector, distinct from
 * the simpler SagaExecutionSummary in ports/types.ts.
 */
export interface InspectorSagaExecutionSummary {
  readonly executionId: string;
  readonly sagaName: string;
  readonly status: SagaStatusType;
  readonly currentStepName: string | null;
  readonly currentStepIndex: number;
  readonly totalSteps: number;
  readonly completedStepCount: number;
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly completedAt: string | null;
  readonly durationMs: number | null;
  readonly error: {
    readonly _tag: string;
    readonly stepName: string;
    readonly causeTags: readonly string[];
  } | null;
  readonly compensationState: {
    readonly active: boolean;
    readonly compensatedSteps: readonly string[];
    readonly failedSteps: readonly string[];
  };
  readonly metadata: Record<string, unknown>;
}

// =============================================================================
// CompensationStats
// =============================================================================

/** Aggregated compensation metrics across all saga executions */
export interface CompensationStats {
  /** Total number of compensation events triggered */
  readonly totalCompensations: number;
  /** Compensations that completed all steps successfully */
  readonly successfulCompensations: number;
  /** Compensations where one or more steps failed */
  readonly failedCompensations: number;
  /** Average time (ms) to complete a full compensation chain */
  readonly averageCompensationTime: number;
  /** Saga definition with the most compensation events */
  readonly mostCompensatedSaga: string | null;
  /** Per-saga breakdown */
  readonly bySaga: readonly SagaCompensationBreakdown[];
}

/** Per-saga compensation breakdown */
export interface SagaCompensationBreakdown {
  readonly sagaName: string;
  readonly totalCompensations: number;
  readonly successRate: number;
  readonly averageCompensationTime: number;
  readonly mostFailedStep: string | null;
  /** Distribution of error _tag values across compensations for this saga */
  readonly errorTagDistribution: Readonly<Record<string, number>>;
}

// =============================================================================
// SagaInspector
// =============================================================================

// =============================================================================
// SagaSuggestion
// =============================================================================

/** Suggestion types aligned with GraphSuggestion type union */
export type SagaSuggestionType =
  | "saga_step_without_compensation"
  | "saga_long_timeout_without_persistence"
  | "saga_no_retry_on_external_port"
  | "saga_singleton_with_scoped_deps";

/** MAPE-K suggestion for saga definition improvement */
export interface SagaSuggestion {
  readonly type: SagaSuggestionType;
  readonly sagaName: string;
  readonly stepName?: string;
  readonly message: string;
  readonly action: string;
}

/** Pull-based + push-based introspection API for saga state */
export interface SagaInspector {
  /** List all registered saga definitions with their step topology */
  getDefinitions(): readonly SagaDefinitionInfo[];

  /** Get all currently active (pending, running, compensating) executions */
  getActiveExecutions(): readonly InspectorSagaExecutionSummary[];

  /** Get execution history with optional filters (delegates to SagaPersister.list) */
  getHistory(
    filters?: PersisterFilters
  ): ResultAsync<readonly InspectorSagaExecutionSummary[], PersistenceError>;

  /** Get the detailed execution trace for a specific execution */
  getTrace(executionId: string): ExecutionTrace | null;

  /** Get aggregated compensation statistics */
  getCompensationStats(): CompensationStats;

  /** Get actionable suggestions for improving saga definitions */
  getSuggestions(): readonly SagaSuggestion[];

  /** Subscribe to saga lifecycle events across all executions */
  subscribe(listener: SagaEventListener): Unsubscribe;
}

// =============================================================================
// SagaRegistry Types
// =============================================================================

/** Entry representing a live saga execution in the registry */
export interface SagaRegistryEntry {
  readonly sagaName: string;
  readonly executionId: string;
  readonly status: () => SagaStatusType;
  readonly currentStep: () => number;
  readonly trace: () => ExecutionTrace;
  readonly startedAt: number;
}

/** Event emitted by the SagaRegistry when executions are registered/unregistered */
export type SagaRegistryEvent =
  | { readonly type: "execution-registered"; readonly entry: SagaRegistryEntry }
  | { readonly type: "execution-unregistered"; readonly executionId: string };

/** Listener callback for registry events */
export type SagaRegistryListener = (event: SagaRegistryEvent) => void;

/** Registry for tracking live saga executions */
export interface SagaRegistry {
  register(entry: SagaRegistryEntry): void;
  unregister(executionId: string): void;
  getAllExecutions(): readonly SagaRegistryEntry[];
  getExecution(executionId: string): SagaRegistryEntry | undefined;
  getExecutionsBySaga(sagaName: string): readonly SagaRegistryEntry[];
  getExecutionsByStatus(status: SagaStatusType): readonly SagaRegistryEntry[];
  subscribe(listener: SagaRegistryListener): Unsubscribe;
  dispose(): void;
}

// =============================================================================
// SagaTracingHook Types (re-exported from shared/tracing-types.ts)
// =============================================================================

export type {
  TracerLike,
  SagaTracingHookOptions,
  SagaTracingHook,
} from "../shared/tracing-types.js";
