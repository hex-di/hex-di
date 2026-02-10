/**
 * Mock Step Executor
 *
 * Creates mock port services with static or dynamic responses
 * for use in saga testing.
 *
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================

/** Configuration for a mock step executor */
export interface MockStepExecutorConfig<TOutput = unknown> {
  /** Static value to return */
  readonly value?: TOutput;
  /** Dynamic value based on input */
  readonly valueFn?: (params: unknown) => TOutput;
  /** Error to throw */
  readonly error?: unknown;
  /** Delay in ms before responding */
  readonly delay?: number;
}

/** A mock step executor that records invocations */
export interface MockStepExecutor<TOutput = unknown> {
  /** The mock service (has execute method) */
  readonly service: { execute(params: unknown): Promise<TOutput> };
  /** All recorded invocations */
  readonly calls: ReadonlyArray<unknown>;
  /** Number of invocations */
  readonly callCount: number;
  /** Reset recorded invocations */
  reset(): void;
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Creates a mock step executor that records invocations and returns
 * configured responses.
 *
 * @example
 * ```typescript
 * const executor = createMockStepExecutor({ value: { id: '1', name: 'Alice' } });
 * const result = await executor.service.execute({ name: 'Alice' });
 * expect(result).toEqual({ id: '1', name: 'Alice' });
 * expect(executor.callCount).toBe(1);
 * ```
 */
export function createMockStepExecutor<TOutput = unknown>(
  config?: MockStepExecutorConfig<TOutput>
): MockStepExecutor<TOutput> {
  const recorded: unknown[] = [];

  const service = {
    async execute(params: unknown): Promise<TOutput> {
      recorded.push(params);

      if (config?.error !== undefined) {
        throw config.error;
      }

      if (config?.delay !== undefined && config.delay > 0) {
        await new Promise<void>(resolve => {
          setTimeout(resolve, config.delay);
        });
      }

      if (config?.valueFn) {
        return config.valueFn(params);
      }

      if (config?.value !== undefined) {
        return config.value;
      }
      throw new Error("MockStepExecutor: no value, valueFn, or error configured");
    },
  };

  return {
    service,
    get calls(): ReadonlyArray<unknown> {
      return recorded;
    },
    get callCount(): number {
      return recorded.length;
    },
    reset(): void {
      recorded.length = 0;
    },
  };
}
