/**
 * Saga Test Harness
 *
 * Wraps a saga runner with mock port resolver for isolated testing.
 * The saga definition is bound at creation time — call execute(input) to run.
 *
 * @packageDocumentation
 */

import type { ResultAsync } from "@hex-di/result";
import {
  type AnySagaDefinition,
  type SagaSuccess,
  type SagaError,
  type SagaEvent,
  type SagaPersister,
  type SagaRunnerConfig,
  type ExecutionTrace,
  createSagaRunner,
} from "@hex-di/saga";

// =============================================================================
// Types
// =============================================================================

/** Response config for a mock step executor */
export interface MockStepResponse {
  /** Static value to return */
  readonly value?: unknown;
  /** Dynamic value based on input */
  readonly valueFn?: (params: unknown) => unknown;
  /** Error to throw */
  readonly error?: unknown;
  /** Delay in ms before responding */
  readonly delay?: number;
}

/** Config for a saga test harness */
export interface SagaTestHarnessConfig {
  /** Mock port responses keyed by port name */
  readonly mocks: Record<string, MockStepResponse>;
  /** Optional persister for testing resume flows */
  readonly persister?: SagaPersister;
}

/** A saga test harness wrapping a runner with mock dependencies */
export interface SagaTestHarness {
  /** Execute the saga with given input and return the result */
  execute(input: unknown): ResultAsync<SagaSuccess<unknown>, SagaError<unknown>>;
  /** All recorded saga events */
  readonly events: ReadonlyArray<SagaEvent>;
  /** Reset event recordings */
  resetEvents(): void;
  /** Get recorded calls for a port name */
  getCalls(portName: string): ReadonlyArray<unknown>;
  /** Get the execution trace from the last execution */
  getTrace(): ExecutionTrace | null;
  /** Dispose and clear all internal state */
  dispose(): Promise<void>;
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Creates a saga test harness bound to a specific saga definition.
 *
 * @param saga - The saga definition to test
 * @param config - Mock port responses and optional persister
 *
 * @example
 * ```typescript
 * const harness = createSagaTestHarness(createUserSaga, {
 *   mocks: {
 *     UserService: { value: { id: '1', name: 'Alice' } },
 *     EmailService: { value: undefined },
 *   },
 * });
 *
 * const result = await harness.execute({ name: 'Alice' });
 * expect(result.isOk()).toBe(true);
 * ```
 */
export function createSagaTestHarness(
  saga: AnySagaDefinition,
  config: SagaTestHarnessConfig
): SagaTestHarness {
  const calls = new Map<string, unknown[]>();
  const events: SagaEvent[] = [];
  let lastExecutionId: string | null = null;
  let executionCounter = 0;

  function getOrCreateCalls(portName: string): unknown[] {
    const existing = calls.get(portName);
    if (existing) {
      return existing;
    }
    const newCalls: unknown[] = [];
    calls.set(portName, newCalls);
    return newCalls;
  }

  const resolver = {
    resolve(portName: string): unknown {
      const mockConfig = config.mocks[portName];

      return {
        execute(params: unknown): unknown {
          getOrCreateCalls(portName).push(params);

          if (mockConfig?.error !== undefined) {
            throw mockConfig.error;
          }

          if (mockConfig?.delay !== undefined && mockConfig.delay > 0) {
            return new Promise(resolve => {
              setTimeout(() => {
                if (mockConfig.valueFn) {
                  resolve(mockConfig.valueFn(params));
                } else {
                  resolve(mockConfig.value);
                }
              }, mockConfig.delay);
            });
          }

          if (mockConfig?.valueFn) {
            return mockConfig.valueFn(params);
          }

          return mockConfig?.value;
        },
      };
    },
  };

  const runnerConfig: SagaRunnerConfig | undefined = config.persister
    ? { persister: config.persister }
    : undefined;

  const runner = createSagaRunner(resolver, runnerConfig);

  const eventListener = (event: SagaEvent): void => {
    events.push(event);
  };

  return {
    execute(input: unknown): ResultAsync<SagaSuccess<unknown>, SagaError<unknown>> {
      executionCounter++;
      const executionId = `test-exec-${executionCounter}`;
      lastExecutionId = executionId;
      return runner.execute(saga, input, {
        executionId,
        listeners: [eventListener],
      });
    },
    get events(): ReadonlyArray<SagaEvent> {
      return events;
    },
    resetEvents(): void {
      events.length = 0;
    },
    getCalls(portName: string): ReadonlyArray<unknown> {
      return calls.get(portName) ?? [];
    },
    getTrace(): ExecutionTrace | null {
      if (!lastExecutionId) return null;
      return runner.getTrace(lastExecutionId);
    },
    async dispose(): Promise<void> {
      calls.clear();
      events.length = 0;
      lastExecutionId = null;
      executionCounter = 0;
    },
  };
}
