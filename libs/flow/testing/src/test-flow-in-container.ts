/**
 * Flow Integration Test Utility
 *
 * Creates a real machine runner with mock port implementations,
 * simulating a DI container environment. This enables integration-level
 * testing of state machines with their effects and activities.
 *
 * @packageDocumentation
 */

import {
  type MachineAny,
  type MachineRunner,
  type MachineSnapshot,
  type EffectExecutor,
  type EffectAny,
  createMachineRunner,
  createActivityManager,
} from "@hex-di/flow";
import { ResultAsync } from "@hex-di/result";
import type { EffectExecutionError } from "@hex-di/flow";
import { InvokeError } from "@hex-di/flow";

// =============================================================================
// Types
// =============================================================================

/**
 * Mock port implementations keyed by port name.
 *
 * Each key is a port's `__portName`, and the value is a mock
 * service implementation for that port.
 */
export type ContainerMocks = Record<string, unknown>;

/**
 * Configuration for creating a flow integration test.
 */
export interface TestFlowInContainerConfig {
  /** The machine definition to test */
  readonly machine: MachineAny;
  /** Mock port implementations keyed by port name */
  readonly mocks?: ContainerMocks;
  /** Optional initial context override */
  readonly context?: unknown;
}

/**
 * Result from creating a flow integration test.
 *
 * Provides a real MachineRunner backed by a mock effect executor
 * that resolves ports from the provided mocks.
 */
export interface TestFlowInContainerResult {
  /** The machine runner */
  readonly runner: MachineRunner<string, { readonly type: string }, unknown>;
  /** Get the current snapshot */
  snapshot(): MachineSnapshot<string, unknown>;
  /** Send an event and execute all effects */
  send(event: { readonly type: string }): Promise<void>;
  /** Get the current state name */
  state(): string;
  /** Get the current context */
  context(): unknown;
  /** All effects that were executed */
  readonly effects: ReadonlyArray<EffectAny>;
  /** All invoke calls that were made, with details */
  readonly invocations: ReadonlyArray<InvocationRecord>;
  /** Dispose the runner and clean up */
  dispose(): Promise<void>;
}

/**
 * Record of a single invoke effect execution.
 */
export interface InvocationRecord {
  /** The port name that was invoked */
  readonly portName: string;
  /** The method name that was called */
  readonly method: string;
  /** The arguments passed to the method */
  readonly args: readonly unknown[];
  /** The return value from the mock */
  readonly returnValue: unknown;
  /** Whether the invocation threw */
  readonly threw: boolean;
  /** The error if the invocation threw */
  readonly error: unknown;
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Safely accesses an additional property on an EffectAny value.
 * @internal
 */
function getEffectProperty(effect: EffectAny, prop: string): unknown {
  if (typeof effect === "object" && effect !== null && prop in effect) {
    const desc = Object.getOwnPropertyDescriptor(effect, prop);
    return desc !== undefined ? desc.value : undefined;
  }
  return undefined;
}

/**
 * Safely accesses a property on an unknown object value.
 * @internal
 */
function getOwnProp(obj: unknown, prop: string): unknown {
  if (typeof obj === "object" && obj !== null && prop in obj) {
    const desc = Object.getOwnPropertyDescriptor(obj, prop);
    return desc !== undefined ? desc.value : undefined;
  }
  return undefined;
}

/**
 * Extracts a callable mock function from mocks, given an Invoke effect.
 * Returns undefined if the effect structure is invalid or no matching mock exists.
 * @internal
 */
function findContainerMock(
  effect: EffectAny,
  mocks: ContainerMocks
):
  | { fn: (...a: unknown[]) => unknown; portName: string; method: string; callArgs: unknown[] }
  | undefined {
  const port = getEffectProperty(effect, "port");
  const method = getEffectProperty(effect, "method");
  if (typeof port !== "object" || port === null || typeof method !== "string") return undefined;

  const portName = getOwnProp(port, "__portName");
  if (typeof portName !== "string") return undefined;

  const service = mocks[portName];
  if (typeof service !== "object" || service === null) return undefined;

  const fn = getOwnProp(service, method);
  if (typeof fn !== "function") return undefined;

  const args = getEffectProperty(effect, "args");
  return {
    fn: fn as (...a: unknown[]) => unknown,
    portName,
    method,
    callArgs: Array.isArray(args) ? args : [],
  };
}

/**
 * Creates a mock effect executor that resolves Invoke effects from mocks.
 * Records all effects and invocations for test assertions.
 * @internal
 */
function createContainerExecutor(
  mocks: ContainerMocks,
  recordedEffects: EffectAny[],
  invocations: InvocationRecord[]
): EffectExecutor {
  return {
    execute(effect: EffectAny): ResultAsync<void, EffectExecutionError> {
      recordedEffects.push(effect);

      const match = effect._tag === "Invoke" ? findContainerMock(effect, mocks) : undefined;
      if (match === undefined) {
        return ResultAsync.ok(undefined);
      }

      const { fn, portName, method, callArgs } = match;
      return ResultAsync.fromPromise(
        Promise.resolve()
          .then(() => {
            const returnValue = fn(...callArgs);
            invocations.push({
              portName,
              method,
              args: callArgs,
              returnValue,
              threw: false,
              error: undefined,
            });
            return returnValue;
          })
          .then(() => undefined),
        cause => {
          invocations.push({
            portName,
            method,
            args: callArgs,
            returnValue: undefined,
            threw: true,
            error: cause,
          });
          return InvokeError({ portName, method, cause });
        }
      );
    },
  };
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Creates a real machine runner with mock port implementations for
 * integration testing.
 *
 * Unlike `createFlowTestHarness` which provides a high-level test API,
 * this function creates a runner that simulates a DI container environment.
 * Invoke effects resolve ports from the provided mocks, making it possible
 * to verify that the machine correctly orchestrates port method calls.
 *
 * @param config - Machine, mocks, and optional context override
 * @returns An integration test result with runner and tracking
 *
 * @example Basic integration test
 * ```typescript
 * const test = testFlowInContainer({
 *   machine: fetcherMachine,
 *   mocks: {
 *     ApiService: {
 *       fetchData: async (id: string) => ({ id, name: 'Test' }),
 *     },
 *   },
 * });
 *
 * await test.send({ type: 'FETCH', payload: { id: '123' } });
 * expect(test.state()).toBe('loading');
 * expect(test.invocations).toHaveLength(1);
 * expect(test.invocations[0].portName).toBe('ApiService');
 *
 * await test.dispose();
 * ```
 *
 * @example Testing error paths
 * ```typescript
 * const test = testFlowInContainer({
 *   machine: fetcherMachine,
 *   mocks: {
 *     ApiService: {
 *       fetchData: () => { throw new Error('Network error'); },
 *     },
 *   },
 * });
 *
 * await test.send({ type: 'FETCH' });
 * expect(test.invocations[0].threw).toBe(true);
 *
 * await test.dispose();
 * ```
 */
export function testFlowInContainer(config: TestFlowInContainerConfig): TestFlowInContainerResult {
  const mocks = config.mocks ?? {};
  const recordedEffects: EffectAny[] = [];
  const invocations: InvocationRecord[] = [];

  const executor = createContainerExecutor(mocks, recordedEffects, invocations);
  const activityManager = createActivityManager();

  // Apply context override if provided
  const machine =
    config.context !== undefined ? { ...config.machine, context: config.context } : config.machine;

  const runner = createMachineRunner(machine, { executor, activityManager });

  return {
    runner,
    snapshot(): MachineSnapshot<string, unknown> {
      return runner.snapshot();
    },
    async send(event: { readonly type: string }): Promise<void> {
      await runner.sendAndExecute(event);
    },
    state(): string {
      return runner.state();
    },
    context(): unknown {
      return runner.context();
    },
    get effects(): ReadonlyArray<EffectAny> {
      return recordedEffects;
    },
    get invocations(): ReadonlyArray<InvocationRecord> {
      return invocations;
    },
    async dispose(): Promise<void> {
      await runner.dispose();
    },
  };
}
