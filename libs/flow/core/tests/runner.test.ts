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
 * - Event queue for re-entrant send support
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { expectOk, expectErr } from "@hex-di/result-testing";
import { defineMachine } from "../src/machine/define-machine.js";
import { event } from "../src/machine/factories.js";
import { Effect } from "../src/effects/constructors.js";
import {
  createMachineRunner,
  type MachineSnapshot,
  type EffectExecutor,
} from "../src/runner/index.js";
import { createActivityManager, type ActivityManager } from "../src/activities/index.js";
import type { EffectExecutionError } from "../src/errors/index.js";

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
const toggleMachine = defineMachine({
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
const counterMachine = defineMachine({
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
const guardedMachine = defineMachine({
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
const effectMachine = defineMachine({
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
    execute(effect): ResultAsync<void, EffectExecutionError> {
      executedEffects.push(effect);
      return ResultAsync.ok(undefined);
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
    execute(): ResultAsync<void, EffectExecutionError> {
      return ResultAsync.ok(undefined);
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
      const result = runner.send(startEvent());

      // Effects should include: exit(idle) + transition + entry(loading)
      // Exit: [Effect.delay(5)]
      // Transition: [Effect.delay(100)]
      // Entry: [Effect.delay(20)]
      const value = expectOk(result);
      expect(value.length).toBeGreaterThan(0);

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
      const result = runner.send(successEvent());
      const value = expectOk(result);
      expect(value).toEqual([]);
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
        execute(): ResultAsync<void, EffectExecutionError> {
          return ResultAsync.fromSafePromise(
            new Promise<void>(resolve => setTimeout(resolve, 50)).then(() => {
              effectExecuted = true;
            })
          );
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
      const strictGuardedMachine = defineMachine({
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

      const result = runner.send(goEvent());

      // Guard failed, no transition
      const value = expectOk(result);
      expect(value).toEqual([]);
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
      const multiActionMachine = defineMachine({
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

    it("should include pendingEvents in snapshot", () => {
      const runner = createMachineRunner(toggleMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      const snapshot = runner.snapshot();

      expect(snapshot.pendingEvents).toBeDefined();
      expect(Array.isArray(snapshot.pendingEvents)).toBe(true);
      expect(snapshot.pendingEvents).toHaveLength(0);
    });
  });

  describe("Event Queue", () => {
    it("re-entrant send enqueues event instead of processing immediately", () => {
      const runner = createMachineRunner(toggleMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      const states: string[] = [];

      runner.subscribe(() => {
        states.push(runner.state());
        // Re-entrant send during notification
        if (runner.state() === "on") {
          runner.send(toggleEvent());
        }
      });

      runner.send(toggleEvent()); // off -> on, triggers subscriber which enqueues toggle

      // After queue drain: should be "off" (toggled back)
      expect(runner.state()).toBe("off");
      // Subscriber notified after first transition (state=on) and after drain (state=off)
      expect(states).toHaveLength(2);
      expect(states[0]).toBe("on");
      expect(states[1]).toBe("off");
    });

    it("queued events are drained after current transition completes", () => {
      const runner = createMachineRunner(toggleMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      let sendCount = 0;

      runner.subscribe(() => {
        sendCount++;
        // Enqueue two more events during first notification
        if (sendCount === 1 && runner.state() === "on") {
          runner.send(toggleEvent()); // enqueue: on -> off
          runner.send(toggleEvent()); // enqueue: off -> on
        }
      });

      runner.send(toggleEvent()); // off -> on

      // After queue drain: on -> off -> on = final state "on"
      expect(runner.state()).toBe("on");
    });

    it("bounded by maxQueueSize, exceeding returns QueueOverflow", () => {
      const runner = createMachineRunner(toggleMachine, {
        executor: createNoOpExecutor(),
        activityManager,
        maxQueueSize: 2,
      });

      let overflowResult: ReturnType<typeof runner.send> | undefined;
      let notifyCount = 0;

      runner.subscribe(() => {
        notifyCount++;
        // Only enqueue on the first notification to avoid infinite loop
        if (notifyCount === 1) {
          runner.send(toggleEvent()); // queue: 1
          runner.send(toggleEvent()); // queue: 2
          overflowResult = runner.send(toggleEvent()); // queue overflow
        }
      });

      runner.send(toggleEvent()); // off -> on, triggers subscriber

      // The third re-entrant send should have returned QueueOverflow
      expect(overflowResult).toBeDefined();
      if (overflowResult === undefined) throw new Error("Expected overflowResult");
      const overflowError = expectErr(overflowResult);
      expect(overflowError._tag).toBe("QueueOverflow");
    });

    it("pendingEvents field exists on snapshot and is an array", () => {
      const runner = createMachineRunner(toggleMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Verify the field exists at rest (empty)
      const snapshot = runner.snapshot();
      expect(snapshot.pendingEvents).toBeDefined();
      expect(Array.isArray(snapshot.pendingEvents)).toBe(true);
      expect(snapshot.pendingEvents).toHaveLength(0);
    });

    it("send returns ok with accumulated effects from all drained events", () => {
      const runner = createMachineRunner(effectMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // Start event produces effects (exit idle + transition + entry loading)
      const result = runner.send(startEvent());
      const value = expectOk(result);
      expect(value.length).toBeGreaterThan(0);
    });

    it("sendBatch works with event queue drain", () => {
      const runner = createMachineRunner(toggleMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      // sendBatch with multiple events
      const result = runner.sendBatch([toggleEvent(), toggleEvent()]);
      expectOk(result);
      // off -> on -> off
      expect(runner.state()).toBe("off");
    });
  });

  describe("PendingEvent source tagging", () => {
    it("direct send() re-entrant events are processed (default external source)", () => {
      const runner = createMachineRunner(toggleMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      runner.subscribe(() => {
        if (runner.state() === "on") {
          // Enqueue a re-entrant event (tagged as "external" by default)
          runner.send(toggleEvent());
        }
      });

      runner.send(toggleEvent()); // off -> on -> off (re-entrant toggle)
      expect(runner.state()).toBe("off");
    });

    it("_sendInternal exists as non-enumerable property", () => {
      const runner = createMachineRunner(toggleMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      const descriptor = Object.getOwnPropertyDescriptor(runner, "_sendInternal");
      expect(descriptor).toBeDefined();
      expect(typeof descriptor?.value).toBe("function");
      expect(descriptor?.enumerable).toBe(false);
    });

    it("_sendInternal tags re-entrant events with specified source", () => {
      const runner = createMachineRunner(toggleMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      const descriptor = Object.getOwnPropertyDescriptor(runner, "_sendInternal");
      const sendInternal = descriptor?.value;

      runner.subscribe(() => {
        if (runner.state() === "on") {
          // Use internal send to tag as "emit"
          sendInternal({ type: "TOGGLE" }, "emit");
        }
      });

      runner.send(toggleEvent()); // off -> on -> off (via re-entrant "emit" source)
      expect(runner.state()).toBe("off");
    });
  });

  describe("History Buffers", () => {
    it("history disabled by default - getTransitionHistory returns empty array", () => {
      const runner = createMachineRunner(toggleMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      runner.send(toggleEvent());
      runner.send(toggleEvent());

      expect(runner.getTransitionHistory()).toEqual([]);
      expect(runner.getEffectHistory()).toEqual([]);
    });

    it("records transitions when history is enabled", () => {
      const runner = createMachineRunner(toggleMachine, {
        executor: createNoOpExecutor(),
        activityManager,
        history: { enabled: true },
      });

      runner.send(toggleEvent()); // off -> on
      runner.send(toggleEvent()); // on -> off

      const history = runner.getTransitionHistory();
      expect(history).toHaveLength(2);

      expect(history[0].prevState).toBe("off");
      expect(history[0].nextState).toBe("on");
      expect(history[0].eventType).toBe("TOGGLE");
      expect(history[0].effectCount).toBe(0);
      expect(typeof history[0].timestamp).toBe("number");

      expect(history[1].prevState).toBe("on");
      expect(history[1].nextState).toBe("off");
      expect(history[1].eventType).toBe("TOGGLE");
    });

    it("records effect executions when history is enabled", async () => {
      const runner = createMachineRunner(effectMachine, {
        executor: createMockExecutor(),
        activityManager,
        history: { enabled: true },
      });

      // idle -> loading produces effects (exit delay(5), transition delay(100), entry delay(20))
      await runner.sendAndExecute(startEvent());

      const effectHistory = runner.getEffectHistory();
      expect(effectHistory.length).toBeGreaterThan(0);

      for (const entry of effectHistory) {
        expect(typeof entry.effectTag).toBe("string");
        expect(typeof entry.ok).toBe("boolean");
        expect(typeof entry.timestamp).toBe("number");
        expect(typeof entry.duration).toBe("number");
        expect(entry.ok).toBe(true);
      }
    });

    it("circular eviction when buffer is full", () => {
      const runner = createMachineRunner(toggleMachine, {
        executor: createNoOpExecutor(),
        activityManager,
        history: { enabled: true, transitionBufferSize: 3 },
      });

      // Perform 5 transitions (buffer only holds 3)
      runner.send(toggleEvent()); // off -> on (1)
      runner.send(toggleEvent()); // on -> off (2)
      runner.send(toggleEvent()); // off -> on (3)
      runner.send(toggleEvent()); // on -> off (4) - evicts (1)
      runner.send(toggleEvent()); // off -> on (5) - evicts (2)

      const history = runner.getTransitionHistory();
      expect(history).toHaveLength(3);

      // Only the last 3 transitions should remain
      expect(history[0].prevState).toBe("off");
      expect(history[0].nextState).toBe("on");

      expect(history[1].prevState).toBe("on");
      expect(history[1].nextState).toBe("off");

      expect(history[2].prevState).toBe("off");
      expect(history[2].nextState).toBe("on");
    });
  });

  // ===========================================================================
  // Error State Health Events
  // ===========================================================================

  describe("Error State Health Events", () => {
    const errorStateMachine = defineMachine({
      id: "error-state-machine",
      initial: "idle",
      context: undefined,
      states: {
        idle: {
          on: {
            FAIL: { target: "error" },
            DEGRADE: { target: "failed_validation" },
          },
        },
        error: {
          on: {
            RECOVER: { target: "idle" },
          },
        },
        failed_validation: {
          on: {
            FIX: { target: "idle" },
          },
        },
      },
    });

    const failEvent = event<"FAIL">("FAIL");
    const recoverEvent = event<"RECOVER">("RECOVER");

    it("emits flow-error when transitioning into an error state", () => {
      const healthEvents: Array<{ type: string; state?: string; machineId: string }> = [];
      const runner = createMachineRunner(errorStateMachine, {
        executor: createNoOpExecutor(),
        activityManager,
        onHealthEvent: event => {
          healthEvents.push(event);
        },
      });

      runner.send(failEvent());

      expect(healthEvents).toHaveLength(1);
      expect(healthEvents[0]?.type).toBe("flow-error");
      if (healthEvents[0]?.type === "flow-error") {
        expect(healthEvents[0].state).toBe("error");
        expect(healthEvents[0].machineId).toBe("error-state-machine");
      }
    });

    it("emits flow-recovered when leaving an error state", () => {
      const healthEvents: Array<{ type: string; fromState?: string; machineId: string }> = [];
      const runner = createMachineRunner(errorStateMachine, {
        executor: createNoOpExecutor(),
        activityManager,
        onHealthEvent: event => {
          healthEvents.push(event);
        },
      });

      runner.send(failEvent()); // idle -> error
      runner.send(recoverEvent()); // error -> idle

      expect(healthEvents).toHaveLength(2);
      expect(healthEvents[1]?.type).toBe("flow-recovered");
      if (healthEvents[1]?.type === "flow-recovered") {
        expect(healthEvents[1].fromState).toBe("error");
      }
    });

    it("uses custom errorStatePatterns when provided", () => {
      const customMachine = defineMachine({
        id: "custom-patterns",
        initial: "idle",
        context: undefined,
        states: {
          idle: {
            on: {
              BREAK: { target: "broken" },
            },
          },
          broken: {
            on: {
              FIX: { target: "idle" },
            },
          },
        },
      });

      const healthEvents: Array<{ type: string }> = [];
      const runner = createMachineRunner(customMachine, {
        executor: createNoOpExecutor(),
        activityManager,
        onHealthEvent: event => {
          healthEvents.push(event);
        },
        errorStatePatterns: ["broken"],
      });

      const breakEvent = event<"BREAK">("BREAK");
      runner.send(breakEvent());

      expect(healthEvents).toHaveLength(1);
      expect(healthEvents[0]?.type).toBe("flow-error");
    });

    it("does not emit health events without onHealthEvent callback", () => {
      const runner = createMachineRunner(errorStateMachine, {
        executor: createNoOpExecutor(),
        activityManager,
        // No onHealthEvent
      });

      // Should not throw
      runner.send(failEvent());
      expect(runner.state()).toBe("error");
    });

    it("does not emit health events between non-error states", () => {
      const nonErrorMachine = defineMachine({
        id: "non-error",
        initial: "idle",
        context: undefined,
        states: {
          idle: {
            on: {
              GO: { target: "active" },
            },
          },
          active: {
            on: {
              STOP: { target: "idle" },
            },
          },
        },
      });

      const healthEvents: Array<{ type: string }> = [];
      const runner = createMachineRunner(nonErrorMachine, {
        executor: createNoOpExecutor(),
        activityManager,
        onHealthEvent: event => {
          healthEvents.push(event);
        },
      });

      const goEvent = event<"GO">("GO");
      const stopEvent = event<"STOP">("STOP");

      runner.send(goEvent());
      runner.send(stopEvent());

      expect(healthEvents).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Additional Runner Edge Case Tests
  // ===========================================================================

  describe("Edge Cases: Non-Error throws and post-dispose behavior", () => {
    it("non-Error throws in guard (number) produces GuardThrew", () => {
      const throwNumberMachine = defineMachine({
        id: "throw-number-guard",
        initial: "idle",
        context: undefined,
        states: {
          idle: {
            on: {
              GO: {
                target: "done",
                guard: (): boolean => {
                  throw 42;
                },
              },
            },
          },
          done: { on: {} },
        },
      });

      const runner = createMachineRunner(throwNumberMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      const result = runner.send({ type: "GO" });
      const error = expectErr(result);
      expect(error._tag).toBe("GuardThrew");
    });

    it("non-Error throws in guard (string) produces GuardThrew", () => {
      const throwStringMachine = defineMachine({
        id: "throw-string-guard",
        initial: "idle",
        context: undefined,
        states: {
          idle: {
            on: {
              GO: {
                target: "done",
                guard: (): boolean => {
                  throw "oops";
                },
              },
            },
          },
          done: { on: {} },
        },
      });

      const runner = createMachineRunner(throwStringMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      const result = runner.send({ type: "GO" });
      const error = expectErr(result);
      expect(error._tag).toBe("GuardThrew");
    });

    it("non-Error throws in action produces ActionThrew", () => {
      const throwInActionMachine = defineMachine({
        id: "throw-in-action",
        initial: "idle",
        context: undefined,
        states: {
          idle: {
            on: {
              GO: {
                target: "done",
                actions: [
                  (): never => {
                    throw null;
                  },
                ],
              },
            },
          },
          done: { on: {} },
        },
      });

      const runner = createMachineRunner(throwInActionMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      const result = runner.send({ type: "GO" });
      const error = expectErr(result);
      expect(error._tag).toBe("ActionThrew");
    });

    it("send after dispose returns Disposed error", async () => {
      const runner = createMachineRunner(toggleMachine, {
        executor: createNoOpExecutor(),
        activityManager,
      });

      await runner.dispose();

      const result = runner.send(toggleEvent());
      const error = expectErr(result);
      expect(error._tag).toBe("Disposed");
    });
  });

  // ===========================================================================
  // Tracer Shorthand
  // ===========================================================================

  describe("tracer shorthand", () => {
    function createSpyTracerLike(): {
      pushSpan: (name: string, attributes?: Record<string, string>) => void;
      popSpan: (status: "ok" | "error") => void;
      calls: { push: unknown[][]; pop: unknown[][] };
    } {
      const calls = { push: [] as unknown[][], pop: [] as unknown[][] };
      return {
        pushSpan(name: string, attributes?: Record<string, string>): void {
          calls.push.push([name, attributes]);
        },
        popSpan(status: "ok" | "error"): void {
          calls.pop.push([status]);
        },
        calls,
      };
    }

    it("auto-creates FlowTracingHook when tracer option is provided", () => {
      const spyTracer = createSpyTracerLike();
      const runner = createMachineRunner(toggleMachine, {
        executor: createNoOpExecutor(),
        activityManager,
        tracer: spyTracer,
      });

      runner.send(toggleEvent()); // off -> on

      // The auto-created hook should have called pushSpan and popSpan
      expect(spyTracer.calls.push.length).toBeGreaterThan(0);
      expect(spyTracer.calls.pop.length).toBeGreaterThan(0);
      expect(spyTracer.calls.pop[0][0]).toBe("ok");
    });

    it("tracingHook takes precedence over tracer", () => {
      const spyTracer = createSpyTracerLike();
      const customHook = {
        onTransitionStart: vi.fn(),
        onTransitionEnd: vi.fn(),
        onEffectStart: vi.fn(),
        onEffectEnd: vi.fn(),
      };

      const runner = createMachineRunner(toggleMachine, {
        executor: createNoOpExecutor(),
        activityManager,
        tracingHook: customHook,
        tracer: spyTracer,
      });

      runner.send(toggleEvent()); // off -> on

      // Custom hook should be called, tracer should NOT
      expect(customHook.onTransitionStart).toHaveBeenCalled();
      expect(spyTracer.calls.push).toHaveLength(0);
    });
  });
});
