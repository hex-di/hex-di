/**
 * Test Machine Harness
 *
 * Creates a test-oriented machine runner with mocked dependencies
 * and synchronous test controls.
 *
 * @packageDocumentation
 */

import {
  type MachineRunner,
  type MachineSnapshot,
  type EffectExecutor,
  type EffectAny,
  type EffectExecutionError,
  InvokeError,
  createMachineRunner,
  createActivityManager,
} from "@hex-di/flow";
import { ResultAsync } from "@hex-di/result";

// =============================================================================
// Types
// =============================================================================

/** Options for creating a test machine harness */
export interface TestMachineOptions<TContext = unknown> {
  /** Initial context override */
  readonly context?: TContext;
  /** Mocked port implementations keyed by port name */
  readonly mocks?: Record<string, unknown>;
}

/** Result of creating a test machine harness */
export interface TestMachineHarness<
  TState extends string,
  TEvent extends { readonly type: string },
  TContext,
> {
  /** The underlying machine runner */
  readonly runner: MachineRunner<TState, TEvent, TContext>;
  /** Get the current snapshot */
  snapshot(): MachineSnapshot<TState, TContext>;
  /** Send an event and execute all effects */
  send(event: TEvent): Promise<void>;
  /** Wait for the machine to enter a specific state */
  waitForState(stateName: TState, timeout?: number): Promise<void>;
  /** Wait for a specific event type to be sent through the harness */
  waitForEvent(eventType: string, timeout?: number): Promise<{ readonly type: string }>;
  /** Cleanup the harness */
  cleanup(): Promise<void>;
  /** All recorded effects */
  readonly effects: ReadonlyArray<EffectAny>;
}

// =============================================================================
// Mock Effect Executor
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
function findMockFn(
  effect: EffectAny,
  mocks: Record<string, unknown>
): { fn: (...a: unknown[]) => unknown; callArgs: unknown[] } | undefined {
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
  // @ts-expect-error - typeof narrowing produces Function which lacks call signature.
  // At runtime, fn is always a mock method from the mocks record.
  return { fn, callArgs: Array.isArray(args) ? args : [] };
}

/**
 * Creates a mock executor that resolves Invoke effects against mock services.
 * All other effects are recorded but not executed.
 * @internal
 */
function createMockExecutor(
  mocks: Record<string, unknown>,
  recordedEffects: EffectAny[]
): EffectExecutor {
  return {
    execute(effect: EffectAny): ResultAsync<void, EffectExecutionError> {
      recordedEffects.push(effect);
      const match = effect._tag === "Invoke" ? findMockFn(effect, mocks) : undefined;
      if (match === undefined) {
        return ResultAsync.ok(undefined);
      }
      return ResultAsync.fromPromise(
        Promise.resolve()
          .then(() => match.fn(...match.callArgs))
          .then(() => undefined),
        cause => InvokeError({ portName: "unknown", method: "unknown", cause })
      );
    },
  };
}

// =============================================================================
// Factory
// =============================================================================

declare function setTimeout(callback: () => void, ms: number): unknown;
declare function clearTimeout(id: unknown): void;

/**
 * Creates a test machine harness for unit testing state machines.
 *
 * @example
 * ```typescript
 * const harness = createFlowTestHarness(machine);
 * await harness.send({ type: 'FETCH' });
 * expect(harness.snapshot().state).toBe('loading');
 * await harness.cleanup();
 * ```
 */
export function createFlowTestHarness<
  TState extends string,
  TEvent extends { readonly type: string },
  TContext,
>(
  machine: {
    readonly id: string;
    readonly initial: TState;
    readonly states: Record<TState, unknown>;
    readonly context: TContext;
  },
  options?: TestMachineOptions<TContext>
): TestMachineHarness<TState, TEvent, TContext> {
  const mocks = options?.mocks ?? {};
  const recordedEffects: EffectAny[] = [];

  const executor = createMockExecutor(mocks, recordedEffects);
  const activityManager = createActivityManager();

  // Apply context override if provided
  const effectiveMachine =
    options?.context !== undefined ? { ...machine, context: options.context } : machine;

  const runner = createMachineRunner<TState, string, TContext>(effectiveMachine, {
    executor,
    activityManager,
  });

  // Track pending event waiters for waitForEvent()
  interface EventWaiter {
    readonly eventType: string;
    readonly resolve: (event: { readonly type: string }) => void;
    readonly reject: (error: Error) => void;
    readonly timerId: ReturnType<typeof setTimeout> | undefined;
  }
  let eventWaiters: EventWaiter[] = [];

  return {
    runner,
    snapshot(): MachineSnapshot<TState, TContext> {
      return runner.snapshot();
    },
    async send(event: TEvent): Promise<void> {
      const eventAsRecord: { readonly type: string } = event;
      await runner.sendAndExecute(eventAsRecord);

      // Resolve any matching event waiters
      const matching: EventWaiter[] = [];
      const remaining: EventWaiter[] = [];
      for (const waiter of eventWaiters) {
        if (waiter.eventType === eventAsRecord.type) {
          matching.push(waiter);
        } else {
          remaining.push(waiter);
        }
      }
      eventWaiters = remaining;
      for (const waiter of matching) {
        if (waiter.timerId !== undefined) {
          clearTimeout(waiter.timerId);
        }
        waiter.resolve(eventAsRecord);
      }
    },
    waitForState(stateName: TState, timeout = 5000): Promise<void> {
      return new Promise((resolve, reject) => {
        if (runner.state() === stateName) {
          resolve();
          return;
        }

        // Use an object to hold the mutable timeout reference
        const timer: { id: ReturnType<typeof setTimeout> | undefined } = { id: undefined };
        const unsub = runner.subscribe(snap => {
          if (snap.state === stateName) {
            if (timer.id !== undefined) {
              clearTimeout(timer.id);
            }
            unsub();
            resolve();
          }
        });

        timer.id = setTimeout(() => {
          unsub();
          reject(
            new Error(`Timed out waiting for state "${stateName}" (current: "${runner.state()}")`)
          );
        }, timeout);
      });
    },
    waitForEvent(eventType: string, timeout = 5000): Promise<{ readonly type: string }> {
      return new Promise((resolve, reject) => {
        const timerId = setTimeout(() => {
          eventWaiters = eventWaiters.filter(w => w !== waiter);
          reject(new Error(`Timed out waiting for event "${eventType}"`));
        }, timeout);

        const waiter: EventWaiter = { eventType, resolve, reject, timerId };
        eventWaiters.push(waiter);
      });
    },
    async cleanup(): Promise<void> {
      // Reject any pending event waiters
      for (const waiter of eventWaiters) {
        if (waiter.timerId !== undefined) {
          clearTimeout(waiter.timerId);
        }
        waiter.reject(new Error("Harness cleanup while waiting for event"));
      }
      eventWaiters = [];
      await runner.dispose();
    },
    get effects(): ReadonlyArray<EffectAny> {
      return recordedEffects;
    },
  };
}
