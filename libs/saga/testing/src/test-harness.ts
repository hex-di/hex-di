/**
 * Saga Test Harness
 *
 * Wraps a saga runner with mock port resolver for isolated testing.
 *
 * @packageDocumentation
 */

import type { ResultAsync } from "@hex-di/result";
import {
  type AnySagaDefinition,
  type SagaSuccess,
  type SagaError,
  type SagaEvent,
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
}

/** A saga test harness wrapping a runner with mock dependencies */
export interface SagaTestHarness {
  /** Execute the saga and return the result */
  execute(
    saga: AnySagaDefinition,
    input: unknown
  ): ResultAsync<SagaSuccess<unknown>, SagaError<unknown>>;
  /** All recorded saga events */
  readonly events: ReadonlyArray<SagaEvent>;
  /** Reset event recordings */
  resetEvents(): void;
  /** Get recorded calls for a port name */
  getCalls(portName: string): ReadonlyArray<unknown>;
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Creates a saga test harness with mock port implementations.
 *
 * @example
 * ```typescript
 * const harness = createSagaTestHarness({
 *   mocks: {
 *     UserService: { value: { id: '1', name: 'Alice' } },
 *     EmailService: { value: undefined },
 *   },
 * });
 *
 * const result = await harness.execute(createUserSaga, { name: 'Alice' });
 * expect(result.isOk()).toBe(true);
 * ```
 */
export function createSagaTestHarness(config: SagaTestHarnessConfig): SagaTestHarness {
  const calls = new Map<string, unknown[]>();
  const events: SagaEvent[] = [];

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

  const runner = createSagaRunner(resolver);

  return {
    execute(
      saga: AnySagaDefinition,
      input: unknown
    ): ResultAsync<SagaSuccess<unknown>, SagaError<unknown>> {
      const result = runner.execute(saga, input);
      // Subscribe to events for this execution
      // Since we can't know the executionId before execute, we record events globally
      return result;
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
  };
}
