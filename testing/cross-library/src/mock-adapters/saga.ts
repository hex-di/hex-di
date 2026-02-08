/**
 * Fake saga adapter and management adapter for integration testing.
 *
 * Simulates @hex-di/saga SagaPort and SagaManagementPort behavior without
 * requiring the actual package. These are pure TypeScript implementations
 * that mirror the spec'd API surface.
 *
 * When @hex-di/saga is implemented, the type stubs should be replaced with
 * imports from "@hex-di/saga".
 */

// ---------------------------------------------------------------------------
// Type stubs (will come from @hex-di/saga when implemented)
// ---------------------------------------------------------------------------

/** Saga status types */
type SagaStatusType = "pending" | "running" | "compensating" | "completed" | "failed" | "cancelled";

/** Saga success result */
interface SagaSuccess<TOutput> {
  readonly output: TOutput;
  readonly completedSteps: readonly string[];
  readonly executionId: string;
}

/** Saga error types */
type SagaError<TError> =
  | {
      readonly _tag: "StepFailed";
      readonly stepName: string;
      readonly cause: TError;
      readonly compensatedSteps: readonly string[];
    }
  | {
      readonly _tag: "CompensationFailed";
      readonly stepName: string;
      readonly cause: unknown;
      readonly failedCompensations: readonly string[];
    }
  | { readonly _tag: "SagaTimeout"; readonly executionId: string; readonly elapsedMs: number }
  | { readonly _tag: "SagaCancelled"; readonly executionId: string };

/** Saga execution status */
interface SagaStatus {
  readonly executionId: string;
  readonly status: SagaStatusType;
  readonly currentStep?: string;
  readonly completedSteps: readonly string[];
  readonly compensatedSteps: readonly string[];
  readonly startedAt: Date;
  readonly updatedAt: Date;
  readonly error?: SagaError<unknown>;
}

/** Saga execution summary */
interface SagaExecutionSummary {
  readonly executionId: string;
  readonly status: SagaStatusType;
  readonly startedAt: Date;
  readonly completedAt?: Date;
  readonly currentStep?: string;
}

/** Execution filters for listing */
interface ExecutionFilters {
  readonly status?: SagaStatusType;
  readonly startedAfter?: Date;
  readonly startedBefore?: Date;
  readonly limit?: number;
}

/** Management error types */
type ManagementError =
  | { readonly _tag: "ExecutionNotFound"; readonly executionId: string }
  | { readonly _tag: "InvalidOperation"; readonly message: string }
  | { readonly _tag: "PersistenceFailed"; readonly operation: string; readonly cause: unknown };

// ---------------------------------------------------------------------------
// FakeSagaAdapter
// ---------------------------------------------------------------------------

/** Step configuration for fake saga execution */
interface FakeSagaStep {
  readonly name: string;
  /** If true, this step will fail during execution */
  readonly shouldFail?: boolean;
  /** Error to produce when step fails */
  readonly failError?: unknown;
  /** Simulated step execution delay in ms (default: 0) */
  readonly delay?: number;
}

/** Configuration for creating a fake saga adapter */
interface FakeSagaAdapterConfig<_TInput, TOutput, TError> {
  /** Display name for the saga */
  readonly name: string;
  /** Steps that the saga will execute (in order) */
  readonly steps: readonly FakeSagaStep[];
  /** Fixed output to return on success */
  readonly output?: TOutput;
  /** Override: always fail with this error */
  readonly error?: SagaError<TError>;
  /** Step at which to fail (0-indexed). Overrides individual step shouldFail. */
  readonly failAtStep?: number;
  /** Simulated execution delay in ms (default: 0) */
  readonly delay?: number;
}

/** Record of a saga execution for test assertions */
interface ExecutionRecord<TInput> {
  readonly input: TInput;
  readonly executionId: string;
  readonly timestamp: number;
  readonly completedSteps: readonly string[];
  readonly compensatedSteps: readonly string[];
  readonly status: SagaStatusType;
}

/** The fake saga service */
interface FakeSagaService<TInput, TOutput, _TError> {
  /** Execute a saga */
  execute(input: TInput): Promise<SagaSuccess<TOutput>>;
  /** All recorded executions */
  readonly executions: ReadonlyArray<ExecutionRecord<TInput>>;
  /** Reset the adapter state and execution history */
  reset(): void;
  /** Override the step at which to fail (set to undefined to clear) */
  setFailAtStep(step: number | undefined): void;
  /** Override the output on success */
  setOutput(output: TOutput): void;
}

let executionCounter = 0;

function generateExecutionId(): string {
  executionCounter++;
  return `exec-${executionCounter}-${Date.now()}`;
}

/**
 * Creates a fake saga adapter for integration testing.
 *
 * Simulates @hex-di/saga SagaPort behavior:
 * - Executes steps in sequence
 * - Supports configurable step failure points
 * - Tracks compensation on failure
 * - Records all executions for assertions
 *
 * @example
 * ```typescript
 * const orderSaga = createFakeSagaAdapter<OrderInput, OrderOutput, OrderError>({
 *   name: "OrderSaga",
 *   steps: [
 *     { name: "validateOrder" },
 *     { name: "processPayment" },
 *     { name: "fulfillOrder" },
 *   ],
 *   output: { orderId: "123", trackingNumber: "TRACK-456" },
 * });
 *
 * const result = await orderSaga.execute({ items: [] });
 * expect(result.completedSteps).toEqual(["validateOrder", "processPayment", "fulfillOrder"]);
 * ```
 */
function createFakeSagaAdapter<TInput, TOutput, TError = never>(
  config: FakeSagaAdapterConfig<TInput, TOutput, TError>
): FakeSagaService<TInput, TOutput, TError> {
  const executionLog: Array<ExecutionRecord<TInput>> = [];
  let failAtStep = config.failAtStep;
  let currentOutput = config.output;

  const service: FakeSagaService<TInput, TOutput, TError> = {
    async execute(input: TInput): Promise<SagaSuccess<TOutput>> {
      const executionId = generateExecutionId();
      const delay = config.delay ?? 0;

      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // If a fixed error is set, fail immediately
      if (config.error) {
        executionLog.push({
          input,
          executionId,
          timestamp: Date.now(),
          completedSteps: [],
          compensatedSteps: [],
          status: "failed",
        });
        throw config.error;
      }

      const completedSteps: string[] = [];
      const compensatedSteps: string[] = [];

      // Execute steps in sequence
      for (let i = 0; i < config.steps.length; i++) {
        const step = config.steps[i];
        const shouldFail = failAtStep === i || step.shouldFail;

        if (step.delay && step.delay > 0) {
          await new Promise(resolve => setTimeout(resolve, step.delay));
        }

        if (shouldFail) {
          // Compensate completed steps in reverse
          for (let j = completedSteps.length - 1; j >= 0; j--) {
            compensatedSteps.push(completedSteps[j]);
          }

          executionLog.push({
            input,
            executionId,
            timestamp: Date.now(),
            completedSteps: [...completedSteps],
            compensatedSteps: [...compensatedSteps],
            status: "failed",
          });

          const error: SagaError<TError> = {
            _tag: "StepFailed",
            stepName: step.name,
            cause: (step.failError ?? new Error(`Step "${step.name}" failed`)) as TError,
            compensatedSteps: [...compensatedSteps],
          };
          throw error;
        }

        completedSteps.push(step.name);
      }

      executionLog.push({
        input,
        executionId,
        timestamp: Date.now(),
        completedSteps: [...completedSteps],
        compensatedSteps: [],
        status: "completed",
      });

      return {
        output: currentOutput as TOutput,
        completedSteps: [...completedSteps],
        executionId,
      };
    },

    get executions() {
      return [...executionLog];
    },

    reset(): void {
      executionLog.length = 0;
      failAtStep = config.failAtStep;
      currentOutput = config.output;
    },

    setFailAtStep(step: number | undefined): void {
      failAtStep = step;
    },

    setOutput(output: TOutput): void {
      currentOutput = output;
    },
  };

  return service;
}

// ---------------------------------------------------------------------------
// FakeSagaManagementAdapter
// ---------------------------------------------------------------------------

/** Configuration for creating a fake saga management adapter */
interface FakeSagaManagementAdapterConfig {
  /** Display name for the management adapter */
  readonly name: string;
}

/** The fake saga management service */
interface FakeSagaManagementService {
  /** Resume a previously persisted execution */
  resume(executionId: string): Promise<SagaSuccess<unknown>>;
  /** Cancel a running execution */
  cancel(executionId: string): Promise<void>;
  /** Get the status of an execution */
  getStatus(executionId: string): Promise<SagaStatus>;
  /** List executions with optional filters */
  listExecutions(filters?: ExecutionFilters): Promise<readonly SagaExecutionSummary[]>;
  /** Add an execution to the internal registry (for testing) */
  addExecution(execution: SagaStatus): void;
  /** All resume calls for assertions */
  readonly resumeCalls: ReadonlyArray<{ readonly executionId: string; readonly timestamp: number }>;
  /** All cancel calls for assertions */
  readonly cancelCalls: ReadonlyArray<{ readonly executionId: string; readonly timestamp: number }>;
  /** All getStatus calls for assertions */
  readonly statusCalls: ReadonlyArray<{ readonly executionId: string; readonly timestamp: number }>;
  /** Reset all tracked calls and registered executions */
  reset(): void;
}

/**
 * Creates a fake saga management adapter for integration testing.
 *
 * Simulates @hex-di/saga SagaManagementPort behavior:
 * - Tracks resume, cancel, and status calls for assertions
 * - Maintains an internal execution registry for test setup
 *
 * @example
 * ```typescript
 * const management = createFakeSagaManagementAdapter({ name: "OrderSagaManagement" });
 *
 * management.addExecution({
 *   executionId: "exec-1",
 *   status: "failed",
 *   completedSteps: ["validate"],
 *   compensatedSteps: [],
 *   startedAt: new Date(),
 *   updatedAt: new Date(),
 * });
 *
 * const status = await management.getStatus("exec-1");
 * expect(status.status).toBe("failed");
 * ```
 */
function createFakeSagaManagementAdapter(
  _config: FakeSagaManagementAdapterConfig
): FakeSagaManagementService {
  const executions = new Map<string, SagaStatus>();
  const resumeLog: Array<{ readonly executionId: string; readonly timestamp: number }> = [];
  const cancelLog: Array<{ readonly executionId: string; readonly timestamp: number }> = [];
  const statusLog: Array<{ readonly executionId: string; readonly timestamp: number }> = [];

  const service: FakeSagaManagementService = {
    async resume(executionId: string): Promise<SagaSuccess<unknown>> {
      await Promise.resolve();
      resumeLog.push({ executionId, timestamp: Date.now() });

      const execution = executions.get(executionId);
      if (!execution) {
        const error: ManagementError = { _tag: "ExecutionNotFound", executionId };
        throw error;
      }

      // Simulate resumption completing successfully
      const updated: SagaStatus = {
        ...execution,
        status: "completed",
        updatedAt: new Date(),
      };
      executions.set(executionId, updated);

      return {
        output: undefined,
        completedSteps: execution.completedSteps,
        executionId,
      };
    },

    async cancel(executionId: string): Promise<void> {
      await Promise.resolve();
      cancelLog.push({ executionId, timestamp: Date.now() });

      const execution = executions.get(executionId);
      if (!execution) {
        const error: ManagementError = { _tag: "ExecutionNotFound", executionId };
        throw error;
      }

      const updated: SagaStatus = {
        ...execution,
        status: "cancelled",
        updatedAt: new Date(),
      };
      executions.set(executionId, updated);
    },

    async getStatus(executionId: string): Promise<SagaStatus> {
      await Promise.resolve();
      statusLog.push({ executionId, timestamp: Date.now() });

      const execution = executions.get(executionId);
      if (!execution) {
        const error: ManagementError = { _tag: "ExecutionNotFound", executionId };
        throw error;
      }

      return execution;
    },

    async listExecutions(filters?: ExecutionFilters): Promise<readonly SagaExecutionSummary[]> {
      await Promise.resolve();
      let results = Array.from(executions.values());

      if (filters?.status) {
        results = results.filter(e => e.status === filters.status);
      }
      if (filters?.startedAfter) {
        results = results.filter(e => e.startedAt >= filters.startedAfter!);
      }
      if (filters?.startedBefore) {
        results = results.filter(e => e.startedAt <= filters.startedBefore!);
      }
      if (filters?.limit !== undefined) {
        results = results.slice(0, filters.limit);
      }

      return results.map(e => ({
        executionId: e.executionId,
        status: e.status,
        startedAt: e.startedAt,
        currentStep: e.currentStep,
      }));
    },

    addExecution(execution: SagaStatus): void {
      executions.set(execution.executionId, execution);
    },

    get resumeCalls() {
      return [...resumeLog];
    },

    get cancelCalls() {
      return [...cancelLog];
    },

    get statusCalls() {
      return [...statusLog];
    },

    reset(): void {
      executions.clear();
      resumeLog.length = 0;
      cancelLog.length = 0;
      statusLog.length = 0;
    },
  };

  return service;
}

export { createFakeSagaAdapter, createFakeSagaManagementAdapter };

export type {
  SagaStatusType,
  SagaSuccess,
  SagaError,
  SagaStatus,
  SagaExecutionSummary,
  ExecutionFilters,
  ManagementError,
  FakeSagaStep,
  FakeSagaAdapterConfig,
  ExecutionRecord,
  FakeSagaService,
  FakeSagaManagementAdapterConfig,
  FakeSagaManagementService,
};
