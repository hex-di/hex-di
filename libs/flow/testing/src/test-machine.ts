/**
 * Test Machine Harness
 *
 * Creates a test-oriented machine runner with mocked dependencies
 * and synchronous test controls.
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

// =============================================================================
// Types
// =============================================================================

/** Options for creating a test machine harness */
export interface TestMachineOptions {
  /** Initial context override */
  readonly context?: unknown;
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
  /** Cleanup the harness */
  cleanup(): Promise<void>;
  /** All recorded effects */
  readonly effects: ReadonlyArray<EffectAny>;
}

// =============================================================================
// Mock Effect Executor
// =============================================================================

function createMockExecutor(
  mocks: Record<string, unknown>,
  recordedEffects: EffectAny[]
): EffectExecutor {
  return {
    async execute(effect: EffectAny): Promise<void> {
      recordedEffects.push(effect);

      if (effect._tag === "Invoke") {
        const invoke = effect as {
          readonly _tag: "Invoke";
          readonly port: { readonly __portName: string };
          readonly method: string;
          readonly args: readonly unknown[];
        };
        const service = mocks[invoke.port.__portName];
        if (service && typeof service === "object" && service !== null) {
          const record = service as Record<string, unknown>;
          const method = record[invoke.method];
          if (typeof method === "function") {
            await (method as (...args: unknown[]) => unknown)(...invoke.args);
          }
        }
      }
      // DelayEffect, NoneEffect, etc. are no-ops in test
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
  options?: TestMachineOptions
): TestMachineHarness<TState, TEvent, TContext> {
  const mocks = options?.mocks ?? {};
  const recordedEffects: EffectAny[] = [];

  const executor = createMockExecutor(mocks, recordedEffects);
  const activityManager = createActivityManager();

  // Apply context override if provided
  const effectiveMachine =
    options?.context !== undefined ? { ...machine, context: options.context as TContext } : machine;

  const runner = createMachineRunner<TState, string, TContext>(
    effectiveMachine as MachineAny as Parameters<
      typeof createMachineRunner<TState, string, TContext>
    >[0],
    { executor, activityManager }
  );

  return {
    runner: runner as unknown as MachineRunner<TState, TEvent, TContext>,
    snapshot(): MachineSnapshot<TState, TContext> {
      return runner.snapshot();
    },
    async send(event: TEvent): Promise<void> {
      await runner.sendAndExecute(event as { readonly type: string });
    },
    waitForState(stateName: TState, timeout = 5000): Promise<void> {
      return new Promise((resolve, reject) => {
        if (runner.state() === stateName) {
          resolve();
          return;
        }

        // Use an object to hold the mutable timeout reference
        const timer = { id: undefined as ReturnType<typeof setTimeout> | undefined };
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
    async cleanup(): Promise<void> {
      await runner.dispose();
    },
    get effects(): ReadonlyArray<EffectAny> {
      return recordedEffects;
    },
  };
}
