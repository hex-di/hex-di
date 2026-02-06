/**
 * Machine Runner Runtime Tests
 *
 * These tests verify the MachineRunner behavior including:
 * - Initial state is set correctly
 * - send() returns effects without executing
 * - sendAndExecute() executes effects
 * - Subscriptions receive snapshot updates
 * - Guards are evaluated in definition order
 * - Actions update context immutably
 * - Dispose stops all activities
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createMachine } from "../src/machine/create-machine.js";
import { event } from "../src/machine/factories.js";
import { Effect } from "../src/effects/constructors.js";
import {
  createMachineRunner,
  type MachineSnapshot,
  type EffectExecutor,
} from "../src/runner/index.js";
import { createActivityManager, type ActivityManager } from "../src/activities/index.js";

// =============================================================================
// Context Type Definitions for Test Machines
// =============================================================================

interface CounterContext {
  readonly count: number;
}

interface GuardedContext {
  readonly retryCount: number;
  readonly maxRetries: number;
}

interface SetEventPayload {
  readonly value: number;
}

interface MultiActionContext {
  readonly value: number;
  readonly log: readonly string[];
}

interface StrictGuardContext {
  readonly value: number;
}

// =============================================================================
// Test Machine Definitions
// =============================================================================

/**
 * Simple toggle machine for basic tests.
 */
const toggleMachine = createMachine({
  id: "toggle",
  initial: "off",
  context: undefined,
  states: {
    off: {
      on: {
        TOGGLE: { target: "on" },
      },
    },
    on: {
      on: {
        TOGGLE: { target: "off" },
      },
    },
  },
});

/**
 * Counter machine for context update tests.
 */
const counterMachine = createMachine({
  id: "counter",
  initial: "active",
  context: { count: 0 } satisfies CounterContext,
  states: {
    active: {
      on: {
        INCREMENT: {
          target: "active",
          actions: [(ctx: CounterContext) => ({ count: ctx.count + 1 })],
        },
        DECREMENT: {
          target: "active",
          actions: [(ctx: CounterContext) => ({ count: ctx.count - 1 })],
        },
        SET: {
          target: "active",
          actions: [
            (
              _ctx: CounterContext,
              evt: { readonly type: "SET"; readonly payload: SetEventPayload }
            ) => ({
              count: evt.payload.value,
            }),
          ],
        },
        RESET: {
          target: "active",
          actions: [() => ({ count: 0 })],
        },
      },
    },
  },
});

/**
 * Machine with guards for testing guard evaluation order.
 */
const guardedMachine = createMachine({
  id: "guarded",
  initial: "idle",
  context: { retryCount: 0, maxRetries: 3 } satisfies GuardedContext,
  states: {
    idle: {
      on: {
        // Multiple guarded transitions - evaluated in order
        RETRY: [
          {
            target: "loading",
            guard: (ctx: GuardedContext) => ctx.retryCount < ctx.maxRetries,
            actions: [(ctx: GuardedContext) => ({ ...ctx, retryCount: ctx.retryCount + 1 })],
          },
          {
            target: "error",
            // No guard - fallback
          },
        ],
      },
    },
    loading: {
      on: {
        SUCCESS: { target: "success" },
        FAILURE: { target: "idle" },
      },
    },
    success: {
      on: {},
    },
    error: {
      on: {},
    },
  },
});

/**
 * Machine with effects for testing effect collection.
 */
const effectMachine = createMachine({
  id: "effects",
  initial: "idle",
  context: undefined,
  states: {
    idle: {
      entry: [Effect.delay(10)],
      exit: [Effect.delay(5)],
      on: {
        START: {
          target: "loading",
          effects: [Effect.delay(100)],
        },
      },
    },
    loading: {
      entry: [Effect.delay(20)],
      on: {
        DONE: { target: "done" },
      },
    },
    done: {
      on: {},
    },
  },
});

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create event helpers for counter machine.
 */
const incrementEvent = event<"INCREMENT">("INCREMENT");
const _decrementEvent = event<"DECREMENT">("DECREMENT");
const setEvent = event<"SET", SetEventPayload>("SET");
const _resetEvent = event<"RESET">("RESET");

/**
 * Create event helpers for toggle machine.
 */
const toggleEvent = event<"TOGGLE">("TOGGLE");

/**
 * Create event helpers for guarded machine.
 */
const retryEvent = event<"RETRY">("RETRY");
const successEvent = event<"SUCCESS">("SUCCESS");
const failureEvent = event<"FAILURE">("FAILURE");

/**
 * Create event helpers for effect machine.
 */
const startEvent = event<"START">("START");
const _doneEvent = event<"DONE">("DONE");

/**
 * Creates a mock EffectExecutor that tracks executed effects.
 */
function createMockExecutor(): EffectExecutor & {
  executedEffects: ReadonlyArray<{ readonly _tag: string }>;
} {
  const executedEffects: Array<{ readonly _tag: string }> = [];
  return {
    async execute(effect): Promise<void> {
      executedEffects.push(effect);
      // Simulate async execution
      await Promise.resolve();
    },
    get executedEffects(): ReadonlyArray<{ readonly _tag: string }> {
      return executedEffects;
    },
  };
}

/**
 * Creates a no-op EffectExecutor.
 */
function createNoOpExecutor(): EffectExecutor {
  return {
    async execute(): Promise<void> {
      // No-op
    },
  };
}

// =============================================================================
// Machine Runner Tests
// =============================================================================

describe("MachineRunner", () => {
  let activityManager: ActivityManager;

  beforeEach(() => {
    activityManager = createActivityManager();
  });

  afterEach(async () => {
    await activityManager.dispose();
  });

  describe("Initial State", () => {
    it("should set initial state correctly", () => {
      const runner = createMachineRunner(toggleMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      expect(runner.state()).toBe("off");
      expect(runner.isDisposed).toBe(false);

      const snapshot = runner.snapshot();
      expect(snapshot.state).toBe("off");
      expect(snapshot.context).toBeUndefined();
    });

    it("should set initial context correctly", () => {
      const runner = createMachineRunner(counterMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      expect(runner.state()).toBe("active");
      expect(runner.context()).toEqual({ count: 0 });

      const snapshot = runner.snapshot();
      expect(snapshot.state).toBe("active");
      expect(snapshot.context).toEqual({ count: 0 });
    });
  });

  describe("send() - Pure Transition", () => {
    it("should return effects without executing them", () => {
      const mockExecutor = createMockExecutor();
      const runner = createMachineRunner(effectMachine, {
        executor: mockExecutor,
        activityManager,
      });

      // send() should return effects but NOT execute them
      const effects = runner.send(startEvent());

      // Effects should include: exit(idle) + transition + entry(loading)
      // Exit: [Effect.delay(5)]
      // Transition: [Effect.delay(100)]
      // Entry: [Effect.delay(20)]
      expect(effects.length).toBeGreaterThan(0);

      // The executor should NOT have been called
      expect(mockExecutor.executedEffects).toHaveLength(0);

      // State should have transitioned
      expect(runner.state()).toBe("loading");
    });

    it("should transition state on valid event", () => {
      const runner = createMachineRunner(toggleMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      expect(runner.state()).toBe("off");

      runner.send(toggleEvent());
      expect(runner.state()).toBe("on");

      runner.send(toggleEvent());
      expect(runner.state()).toBe("off");
    });

    it("should return empty array when no valid transition exists", () => {
      const runner = createMachineRunner(guardedMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Go to success state (terminal)
      runner.send(retryEvent());
      runner.send(successEvent());
      expect(runner.state()).toBe("success");

      // No transitions defined from success state for SUCCESS event
      const effects = runner.send(successEvent());
      expect(effects).toEqual([]);
      expect(runner.state()).toBe("success"); // State unchanged
    });
  });

  describe("sendAndExecute() - Transition + Execute Effects", () => {
    it("should execute effects after transition", async () => {
      const mockExecutor = createMockExecutor();
      const runner = createMachineRunner(effectMachine, {
        executor: mockExecutor,
        activityManager,
      });

      await runner.sendAndExecute(startEvent());

      // All effects should have been executed
      expect(mockExecutor.executedEffects.length).toBeGreaterThan(0);

      // Should include the delay effects
      const delayEffects = mockExecutor.executedEffects.filter(e => e._tag === "Delay");
      expect(delayEffects.length).toBeGreaterThan(0);

      // State should have transitioned
      expect(runner.state()).toBe("loading");
    });

    it("should await effect execution", async () => {
      let effectExecuted = false;
      const slowExecutor: EffectExecutor = {
        async execute(): Promise<void> {
          await new Promise(resolve => setTimeout(resolve, 50));
          effectExecuted = true;
        },
      };

      const runner = createMachineRunner(effectMachine, {
        executor: slowExecutor,
        activityManager,
      });

      const promise = runner.sendAndExecute(startEvent());

      // Should not be executed yet
      expect(effectExecuted).toBe(false);

      await promise;

      // Should be executed after awaiting
      expect(effectExecuted).toBe(true);
    });
  });

  describe("Subscription", () => {
    it("should receive snapshot updates on state change", () => {
      const runner = createMachineRunner(toggleMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      const snapshots: Array<MachineSnapshot<string, void>> = [];
      const unsubscribe = runner.subscribe(snapshot => {
        snapshots.push(snapshot);
      });

      runner.send(toggleEvent());
      runner.send(toggleEvent());

      expect(snapshots).toHaveLength(2);
      expect(snapshots[0]?.state).toBe("on");
      expect(snapshots[1]?.state).toBe("off");

      unsubscribe();
    });

    it("should not receive updates after unsubscribe", () => {
      const runner = createMachineRunner(toggleMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      const snapshots: Array<MachineSnapshot<string, void>> = [];
      const unsubscribe = runner.subscribe(snapshot => {
        snapshots.push(snapshot);
      });

      runner.send(toggleEvent());
      expect(snapshots).toHaveLength(1);

      unsubscribe();

      runner.send(toggleEvent());
      expect(snapshots).toHaveLength(1); // Still 1, not 2
    });

    it("should support multiple subscribers", () => {
      const runner = createMachineRunner(toggleMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      const snapshots1: Array<MachineSnapshot<string, void>> = [];
      const snapshots2: Array<MachineSnapshot<string, void>> = [];

      const unsub1 = runner.subscribe(s => snapshots1.push(s));
      const unsub2 = runner.subscribe(s => snapshots2.push(s));

      runner.send(toggleEvent());

      expect(snapshots1).toHaveLength(1);
      expect(snapshots2).toHaveLength(1);

      unsub1();

      runner.send(toggleEvent());

      expect(snapshots1).toHaveLength(1); // Unsubscribed
      expect(snapshots2).toHaveLength(2); // Still subscribed

      unsub2();
    });
  });

  describe("Guard Evaluation", () => {
    it("should evaluate guards in definition order", () => {
      const runner = createMachineRunner(guardedMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Initial context: { retryCount: 0, maxRetries: 3 }
      expect(runner.state()).toBe("idle");
      expect(runner.context().retryCount).toBe(0);

      // First retry: guard passes (0 < 3)
      runner.send(retryEvent());
      expect(runner.state()).toBe("loading");
      expect(runner.context().retryCount).toBe(1);

      // Go back to idle via failure
      runner.send(failureEvent());
      expect(runner.state()).toBe("idle");

      // Retry again: guard still passes (1 < 3)
      runner.send(retryEvent());
      expect(runner.state()).toBe("loading");
      expect(runner.context().retryCount).toBe(2);

      runner.send(failureEvent());
      runner.send(retryEvent()); // retryCount becomes 3
      expect(runner.context().retryCount).toBe(3);

      runner.send(failureEvent());

      // Now retryCount === 3, so guard (ctx.retryCount < ctx.maxRetries) fails
      // Should fall through to error state
      runner.send(retryEvent());
      expect(runner.state()).toBe("error");
    });

    it("should skip transition when guard returns false and no fallback exists", () => {
      // Create a machine with only guarded transitions (no fallback)
      const strictGuardedMachine = createMachine({
        id: "strictGuarded",
        initial: "idle",
        context: { value: 10 } satisfies StrictGuardContext,
        states: {
          idle: {
            on: {
              GO: {
                target: "next",
                guard: (ctx: StrictGuardContext) => ctx.value > 100, // Will fail
              },
            },
          },
          next: {
            on: {},
          },
        },
      });

      const runner = createMachineRunner(strictGuardedMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      const goEvent = event<"GO">("GO");

      expect(runner.state()).toBe("idle");

      const effects = runner.send(goEvent());

      // Guard failed, no transition
      expect(effects).toEqual([]);
      expect(runner.state()).toBe("idle");
    });
  });

  describe("Actions and Context Updates", () => {
    it("should update context immutably via actions", () => {
      const runner = createMachineRunner(counterMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      const originalContext = runner.context();
      expect(originalContext).toEqual({ count: 0 });

      runner.send(incrementEvent());

      const newContext = runner.context();
      expect(newContext).toEqual({ count: 1 });

      // Original context should be unchanged (immutability)
      expect(originalContext).toEqual({ count: 0 });
      expect(newContext).not.toBe(originalContext);
    });

    it("should chain multiple actions", () => {
      // Create a machine with multiple actions per transition
      const multiActionMachine = createMachine({
        id: "multiAction",
        initial: "idle",
        context: { value: 0, log: [] as readonly string[] } satisfies MultiActionContext,
        states: {
          idle: {
            on: {
              PROCESS: {
                target: "idle",
                actions: [
                  (ctx: MultiActionContext) => ({ ...ctx, value: ctx.value + 10 }),
                  (ctx: MultiActionContext) => ({ ...ctx, value: ctx.value * 2 }),
                  (ctx: MultiActionContext) => ({
                    ...ctx,
                    log: [...ctx.log, `Final: ${ctx.value}`],
                  }),
                ],
              },
            },
          },
        },
      });

      const runner = createMachineRunner(multiActionMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      const processEvent = event<"PROCESS">("PROCESS");

      // Initial: value = 0
      // After action 1: value = 0 + 10 = 10
      // After action 2: value = 10 * 2 = 20
      // After action 3: log = ["Final: 20"]
      runner.send(processEvent());

      expect(runner.context().value).toBe(20);
      expect(runner.context().log).toEqual(["Final: 20"]);
    });

    it("should pass event to actions", () => {
      const runner = createMachineRunner(counterMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      runner.send(setEvent({ value: 42 }));

      expect(runner.context()).toEqual({ count: 42 });
    });
  });

  describe("Disposal", () => {
    it("should stop all activities on dispose", async () => {
      const runner = createMachineRunner(toggleMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      expect(runner.isDisposed).toBe(false);

      await runner.dispose();

      expect(runner.isDisposed).toBe(true);
    });

    it("should mark runner as disposed", async () => {
      const runner = createMachineRunner(toggleMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      await runner.dispose();

      expect(runner.isDisposed).toBe(true);
    });

    it("should allow multiple dispose calls without error", async () => {
      const runner = createMachineRunner(toggleMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      await runner.dispose();
      await runner.dispose();
      await runner.dispose();

      expect(runner.isDisposed).toBe(true);
    });
  });

  describe("Activity Status", () => {
    it("should return activity status from manager", () => {
      const runner = createMachineRunner(toggleMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // No activities spawned yet
      expect(runner.getActivityStatus("nonexistent")).toBeUndefined();
    });
  });

  describe("Snapshot", () => {
    it("should return immutable snapshot", () => {
      const runner = createMachineRunner(counterMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      const snapshot1 = runner.snapshot();

      runner.send(incrementEvent());

      const snapshot2 = runner.snapshot();

      // Snapshots should be different objects
      expect(snapshot1).not.toBe(snapshot2);
      expect(snapshot1.state).toBe("active");
      expect(snapshot1.context).toEqual({ count: 0 });
      expect(snapshot2.state).toBe("active");
      expect(snapshot2.context).toEqual({ count: 1 });
    });

    it("should include activities in snapshot", () => {
      const runner = createMachineRunner(toggleMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      const snapshot = runner.snapshot();

      expect(snapshot.activities).toBeDefined();
      expect(Array.isArray(snapshot.activities)).toBe(true);
    });
  });
});
