/**
 * Mock Effect Executor
 *
 * Records effect calls and provides configurable responses for testing.
 *
 * @packageDocumentation
 */

import type { EffectExecutor, EffectAny, EffectExecutionError } from "@hex-di/flow";
import { ResultAsync } from "@hex-di/result";
import { InvokeError } from "@hex-di/flow";

// =============================================================================
// Types
// =============================================================================

/** A recorded effect execution */
export interface RecordedEffect {
  readonly effect: EffectAny;
  readonly timestamp: number;
}

/** Configuration for mock effect responses */
export interface MockEffectResponse {
  /** Match effects by _tag */
  readonly tag: EffectAny["_tag"];
  /** Handler to call when effect matches */
  readonly handler?: (effect: EffectAny) => void | Promise<void>;
  /** Error to throw when effect matches */
  readonly error?: Error;
}

/** Result from creating a mock effect executor */
export interface MockEffectExecutorResult {
  /** The executor instance */
  readonly executor: EffectExecutor;
  /** All recorded effects */
  readonly effects: ReadonlyArray<RecordedEffect>;
  /** Number of effects executed */
  readonly callCount: number;
  /** Get effects matching a specific tag */
  getByTag(tag: EffectAny["_tag"]): ReadonlyArray<RecordedEffect>;
  /** Reset all recorded effects */
  reset(): void;
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Creates a mock effect executor that records all executed effects.
 *
 * @example
 * ```typescript
 * const mock = createMockEffectExecutor();
 * await mock.executor.execute({ _tag: 'Delay', milliseconds: 100 });
 * expect(mock.callCount).toBe(1);
 * expect(mock.getByTag('Delay')).toHaveLength(1);
 * ```
 */
export function createMockEffectExecutor(
  responses?: ReadonlyArray<MockEffectResponse>
): MockEffectExecutorResult {
  const recorded: RecordedEffect[] = [];

  const executor: EffectExecutor = {
    execute(effect: EffectAny): ResultAsync<void, EffectExecutionError> {
      return ResultAsync.fromPromise(
        (async () => {
          recorded.push({ effect, timestamp: Date.now() });

          if (responses) {
            for (const response of responses) {
              if (response.tag === effect._tag) {
                if (response.error) {
                  throw response.error;
                }
                if (response.handler) {
                  await response.handler(effect);
                }
                return;
              }
            }
          }
        })(),
        cause => InvokeError({ portName: "", method: "", cause })
      );
    },
  };

  return {
    executor,
    get effects(): ReadonlyArray<RecordedEffect> {
      return recorded;
    },
    get callCount(): number {
      return recorded.length;
    },
    getByTag(tag: EffectAny["_tag"]): ReadonlyArray<RecordedEffect> {
      return recorded.filter(r => r.effect._tag === tag);
    },
    reset(): void {
      recorded.length = 0;
    },
  };
}
