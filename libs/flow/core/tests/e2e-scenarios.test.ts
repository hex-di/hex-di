/**
 * DoD 13: Cross-Cutting E2E Scenarios
 *
 * These tests verify end-to-end scenarios that exercise multiple subsystems
 * together, ensuring that defineMachine -> transition -> runner -> effects
 * all work in concert.
 *
 * Scenarios:
 * 1. Counter machine: create, transition, verify context changes
 * 2. Traffic light: cyclic machine with guard-based transitions
 * 3. Form wizard: multi-step form with forward/back navigation
 * 4. Retry loop: guarded transitions with retry counter
 * 5. Full runner lifecycle: create, subscribe, send, dispose
 * 6. Runner with effect collection and execution
 * 7. Multiple subscribers with unsubscribe
 * 8. Self-transition preserves context correctness
 * 9. Final state prevents further transitions
 * 10. Complex guard arrays with fallback
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { defineMachine, Effect, transition } from "../src/index.js";
import { createMachineRunner } from "../src/runner/create-runner.js";
import { createActivityManager } from "../src/activities/manager.js";
import { createBasicExecutor } from "../src/runner/executor.js";
import type { ActivityManager } from "../src/activities/manager.js";

// =============================================================================
// Shared Setup
// =============================================================================

let activityManager: ActivityManager;

beforeEach(() => {
  activityManager = createActivityManager();
});

afterEach(async () => {
  await activityManager.dispose();
});

// =============================================================================
// Scenario 1: Counter Machine
// =============================================================================

describe("Scenario 1: Counter machine end-to-end", () => {
  const counterMachine = defineMachine({
    id: "counter",
    initial: "active",
    context: { count: 0 } as { count: number },
    states: {
      active: {
        on: {
          INCREMENT: {
            target: "active",
            actions: [(ctx: { count: number }) => ({ count: ctx.count + 1 })],
          },
          DECREMENT: {
            target: "active",
            actions: [(ctx: { count: number }) => ({ count: ctx.count - 1 })],
          },
          RESET: {
            target: "active",
            actions: [() => ({ count: 0 })],
          },
        },
      },
    },
  });

  it("increments and decrements via runner", () => {
    const executor = createBasicExecutor();
    const runner = createMachineRunner(counterMachine, { executor, activityManager });

    runner.send({ type: "INCREMENT" });
    runner.send({ type: "INCREMENT" });
    runner.send({ type: "INCREMENT" });

    expect(runner.context()).toEqual({ count: 3 });

    runner.send({ type: "DECREMENT" });
    expect(runner.context()).toEqual({ count: 2 });

    runner.send({ type: "RESET" });
    expect(runner.context()).toEqual({ count: 0 });
  });

  it("subscriber receives each state change", () => {
    const executor = createBasicExecutor();
    const runner = createMachineRunner(counterMachine, { executor, activityManager });

    const snapshots: Array<{ count: number }> = [];
    runner.subscribe(s => {
      snapshots.push({ count: s.context.count });
    });

    runner.send({ type: "INCREMENT" });
    runner.send({ type: "INCREMENT" });
    runner.send({ type: "DECREMENT" });

    expect(snapshots).toEqual([{ count: 1 }, { count: 2 }, { count: 1 }]);
  });
});

// =============================================================================
// Scenario 2: Traffic Light
// =============================================================================

describe("Scenario 2: Traffic light cyclic machine", () => {
  const trafficLightMachine = defineMachine({
    id: "traffic-light",
    initial: "red",
    context: { cycleCount: 0 } as { cycleCount: number },
    states: {
      red: {
        on: {
          NEXT: {
            target: "green",
            actions: [(ctx: { cycleCount: number }) => ({ cycleCount: ctx.cycleCount + 1 })],
          },
        },
      },
      green: {
        on: {
          NEXT: { target: "yellow" },
        },
      },
      yellow: {
        on: {
          NEXT: { target: "red" },
        },
      },
    },
  });

  it("cycles through states correctly", () => {
    const executor = createBasicExecutor();
    const runner = createMachineRunner(trafficLightMachine, { executor, activityManager });

    expect(runner.state()).toBe("red");

    runner.send({ type: "NEXT" });
    expect(runner.state()).toBe("green");

    runner.send({ type: "NEXT" });
    expect(runner.state()).toBe("yellow");

    runner.send({ type: "NEXT" });
    expect(runner.state()).toBe("red");
    expect(runner.context().cycleCount).toBe(1);
  });

  it("completes multiple cycles with correct cycle count", () => {
    const executor = createBasicExecutor();
    const runner = createMachineRunner(trafficLightMachine, { executor, activityManager });

    // 3 complete cycles = 9 NEXT events
    for (let i = 0; i < 9; i++) {
      runner.send({ type: "NEXT" });
    }

    expect(runner.state()).toBe("red");
    expect(runner.context().cycleCount).toBe(3);
  });
});

// =============================================================================
// Scenario 3: Form Wizard
// =============================================================================

describe("Scenario 3: Multi-step form wizard", () => {
  const wizardMachine = defineMachine({
    id: "wizard",
    initial: "step1",
    context: { currentStep: 1, data: {} as Record<string, string> },
    states: {
      step1: {
        on: {
          NEXT: {
            target: "step2",
            actions: [
              (ctx: { currentStep: number; data: Record<string, string> }) => ({
                ...ctx,
                currentStep: 2,
              }),
            ],
          },
        },
      },
      step2: {
        on: {
          BACK: {
            target: "step1",
            actions: [
              (ctx: { currentStep: number; data: Record<string, string> }) => ({
                ...ctx,
                currentStep: 1,
              }),
            ],
          },
          NEXT: {
            target: "step3",
            actions: [
              (ctx: { currentStep: number; data: Record<string, string> }) => ({
                ...ctx,
                currentStep: 3,
              }),
            ],
          },
        },
      },
      step3: {
        on: {
          BACK: {
            target: "step2",
            actions: [
              (ctx: { currentStep: number; data: Record<string, string> }) => ({
                ...ctx,
                currentStep: 2,
              }),
            ],
          },
          SUBMIT: { target: "submitted" },
        },
      },
      submitted: { on: {} },
    },
  });

  it("navigates forward and back through steps", () => {
    const executor = createBasicExecutor();
    const runner = createMachineRunner(wizardMachine, { executor, activityManager });

    expect(runner.state()).toBe("step1");

    runner.send({ type: "NEXT" });
    expect(runner.state()).toBe("step2");
    expect(runner.context().currentStep).toBe(2);

    runner.send({ type: "NEXT" });
    expect(runner.state()).toBe("step3");

    runner.send({ type: "BACK" });
    expect(runner.state()).toBe("step2");

    runner.send({ type: "BACK" });
    expect(runner.state()).toBe("step1");
    expect(runner.context().currentStep).toBe(1);
  });

  it("submitted state is final", () => {
    const executor = createBasicExecutor();
    const runner = createMachineRunner(wizardMachine, { executor, activityManager });

    runner.send({ type: "NEXT" }); // step1 -> step2
    runner.send({ type: "NEXT" }); // step2 -> step3
    runner.send({ type: "SUBMIT" }); // step3 -> submitted

    expect(runner.state()).toBe("submitted");

    // Cannot transition from submitted
    runner.send({ type: "BACK" });
    expect(runner.state()).toBe("submitted");

    runner.send({ type: "NEXT" });
    expect(runner.state()).toBe("submitted");
  });
});

// =============================================================================
// Scenario 4: Retry Loop with Guards
// =============================================================================

describe("Scenario 4: Retry loop with guards", () => {
  it("retries up to max then fails", () => {
    const machine = defineMachine({
      id: "retry",
      initial: "idle",
      context: { retries: 0, maxRetries: 3 } as { retries: number; maxRetries: number },
      states: {
        idle: {
          on: { START: { target: "loading" } },
        },
        loading: {
          on: {
            FAIL: [
              {
                target: "loading",
                guard: (ctx: { retries: number; maxRetries: number }) =>
                  ctx.retries < ctx.maxRetries,
                actions: [
                  (ctx: { retries: number; maxRetries: number }) => ({
                    ...ctx,
                    retries: ctx.retries + 1,
                  }),
                ],
              },
              { target: "failed" },
            ],
            SUCCESS: { target: "done" },
          },
        },
        done: { on: {} },
        failed: { on: {} },
      },
    });

    const executor = createBasicExecutor();
    const runner = createMachineRunner(machine, { executor, activityManager });

    runner.send({ type: "START" });
    expect(runner.state()).toBe("loading");

    // First 3 failures retry
    runner.send({ type: "FAIL" });
    expect(runner.state()).toBe("loading");
    expect(runner.context().retries).toBe(1);

    runner.send({ type: "FAIL" });
    expect(runner.state()).toBe("loading");
    expect(runner.context().retries).toBe(2);

    runner.send({ type: "FAIL" });
    expect(runner.state()).toBe("loading");
    expect(runner.context().retries).toBe(3);

    // 4th failure -> guard fails -> go to failed
    runner.send({ type: "FAIL" });
    expect(runner.state()).toBe("failed");
  });

  it("success before max retries goes to done", () => {
    const machine = defineMachine({
      id: "retry-success",
      initial: "loading",
      context: { retries: 2, maxRetries: 3 } as { retries: number; maxRetries: number },
      states: {
        loading: {
          on: {
            FAIL: [
              {
                target: "loading",
                guard: (ctx: { retries: number; maxRetries: number }) =>
                  ctx.retries < ctx.maxRetries,
                actions: [
                  (ctx: { retries: number; maxRetries: number }) => ({
                    ...ctx,
                    retries: ctx.retries + 1,
                  }),
                ],
              },
              { target: "failed" },
            ],
            SUCCESS: { target: "done" },
          },
        },
        done: { on: {} },
        failed: { on: {} },
      },
    });

    const executor = createBasicExecutor();
    const runner = createMachineRunner(machine, { executor, activityManager });

    runner.send({ type: "SUCCESS" });
    expect(runner.state()).toBe("done");
  });
});

// =============================================================================
// Scenario 5: Full Runner Lifecycle
// =============================================================================

describe("Scenario 5: Full runner lifecycle", () => {
  it("create -> subscribe -> send -> dispose", async () => {
    const machine = defineMachine({
      id: "lifecycle",
      initial: "a",
      context: undefined,
      states: {
        a: { on: { GO: { target: "b" } } },
        b: { on: { GO: { target: "c" } } },
        c: { on: {} },
      },
    });

    const executor = createBasicExecutor();
    const runner = createMachineRunner(machine, { executor, activityManager });

    // Subscribe
    const states: string[] = [];
    const unsub = runner.subscribe(s => states.push(s.state));

    // Send events
    runner.send({ type: "GO" });
    expect(runner.state()).toBe("b");
    expect(states).toEqual(["b"]);

    runner.send({ type: "GO" });
    expect(runner.state()).toBe("c");
    expect(states).toEqual(["b", "c"]);

    // In final state, no more transitions
    runner.send({ type: "GO" });
    expect(runner.state()).toBe("c");
    expect(states).toEqual(["b", "c"]); // No new notification

    // Unsubscribe
    unsub();

    // Dispose
    await runner.dispose();
    expect(runner.isDisposed).toBe(true);
  });
});

// =============================================================================
// Scenario 6: Runner with Effect Collection
// =============================================================================

describe("Scenario 6: Runner with effect collection and execution", () => {
  it("sendAndExecute calls executor for each effect", async () => {
    const entryEffect = Effect.delay(10);
    const exitEffect = Effect.delay(20);
    const transitionEffect = Effect.delay(30);

    const machine = defineMachine({
      id: "effect-exec",
      initial: "a",
      context: undefined,
      states: {
        a: {
          exit: [exitEffect],
          on: {
            GO: { target: "b", effects: [transitionEffect] },
          },
        },
        b: {
          entry: [entryEffect],
          on: {},
        },
      },
    });

    const executedEffects: unknown[] = [];
    const executor = {
      execute: vi.fn().mockImplementation((effect: unknown) => {
        executedEffects.push(effect);
        return ResultAsync.ok(undefined);
      }),
    };

    const runner = createMachineRunner(machine, { executor, activityManager });

    await runner.sendAndExecute({ type: "GO" });

    expect(executor.execute).toHaveBeenCalledTimes(3);
    expect(executedEffects[0]).toBe(exitEffect);
    expect(executedEffects[1]).toBe(transitionEffect);
    expect(executedEffects[2]).toBe(entryEffect);
  });
});

// =============================================================================
// Scenario 7: Multiple Subscribers
// =============================================================================

describe("Scenario 7: Multiple subscribers with unsubscribe", () => {
  it("multiple subscribers receive notifications independently", () => {
    const machine = defineMachine({
      id: "multi-sub",
      initial: "a",
      context: undefined,
      states: {
        a: { on: { GO: { target: "b" } } },
        b: { on: { GO: { target: "c" } } },
        c: { on: {} },
      },
    });

    const executor = createBasicExecutor();
    const runner = createMachineRunner(machine, { executor, activityManager });

    const sub1States: string[] = [];
    const sub2States: string[] = [];

    const unsub1 = runner.subscribe(s => sub1States.push(s.state));
    runner.subscribe(s => sub2States.push(s.state));

    runner.send({ type: "GO" }); // a -> b
    expect(sub1States).toEqual(["b"]);
    expect(sub2States).toEqual(["b"]);

    // Unsubscribe sub1
    unsub1();

    runner.send({ type: "GO" }); // b -> c
    expect(sub1States).toEqual(["b"]); // No update
    expect(sub2States).toEqual(["b", "c"]); // Still receives
  });
});

// =============================================================================
// Scenario 8: Self-Transition Context Correctness
// =============================================================================

describe("Scenario 8: Self-transition preserves context correctness", () => {
  it("accumulates context through multiple self-transitions", () => {
    const machine = defineMachine({
      id: "self-trans",
      initial: "counting",
      context: { total: 0 } as { total: number },
      states: {
        counting: {
          on: {
            ADD: {
              target: "counting",
              actions: [(ctx: { total: number }) => ({ total: ctx.total + 1 })],
            },
            DONE: { target: "finished" },
          },
        },
        finished: { on: {} },
      },
    });

    const executor = createBasicExecutor();
    const runner = createMachineRunner(machine, { executor, activityManager });

    // 100 self-transitions
    for (let i = 0; i < 100; i++) {
      runner.send({ type: "ADD" });
    }

    expect(runner.context().total).toBe(100);
    expect(runner.state()).toBe("counting");

    runner.send({ type: "DONE" });
    expect(runner.state()).toBe("finished");
    expect(runner.context().total).toBe(100);
  });
});

// =============================================================================
// Scenario 9: Collector Integration
// =============================================================================

describe("Scenario 9: Collector receives transition events", () => {
  it("collector.collect is called for each transition", () => {
    const machine = defineMachine({
      id: "collector-test",
      initial: "a",
      context: undefined,
      states: {
        a: { on: { GO: { target: "b" } } },
        b: { on: { GO: { target: "c" } } },
        c: { on: {} },
      },
    });

    const collectMock = vi.fn();
    const collector = { collect: collectMock };

    const executor = createBasicExecutor();
    const runner = createMachineRunner(machine, {
      executor,
      activityManager,
      collector,
    });

    runner.send({ type: "GO" }); // a -> b
    runner.send({ type: "GO" }); // b -> c

    expect(collectMock).toHaveBeenCalledTimes(2);

    // Verify first transition event shape
    const firstCall = collectMock.mock.calls[0][0];
    expect(firstCall.machineId).toBe("collector-test");
    expect(firstCall.prevState).toBe("a");
    expect(firstCall.nextState).toBe("b");
    expect(firstCall.event).toEqual({ type: "GO" });

    // Verify second transition event
    const secondCall = collectMock.mock.calls[1][0];
    expect(secondCall.prevState).toBe("b");
    expect(secondCall.nextState).toBe("c");
  });
});

// =============================================================================
// Scenario 10: Pure Interpreter Isolation
// =============================================================================

describe("Scenario 10: Pure interpreter produces consistent results", () => {
  it("same inputs always produce same outputs", () => {
    const machine = defineMachine({
      id: "pure-test",
      initial: "idle",
      context: { value: 42 } as { value: number },
      states: {
        idle: {
          exit: [Effect.delay(1)],
          on: {
            GO: {
              target: "active",
              actions: [(ctx: { value: number }) => ({ value: ctx.value * 2 })],
              effects: [Effect.delay(2)],
            },
          },
        },
        active: {
          entry: [Effect.delay(3)],
          on: {},
        },
      },
    });

    // Run transition 10 times with same inputs
    const results = Array.from({ length: 10 }, () =>
      transition("idle", { value: 42 }, { type: "GO" }, machine)
    );

    // All results should be identical
    for (const result of results) {
      expect(result.transitioned).toBe(true);
      expect(result.newState).toBe("active");
      expect(result.newContext).toEqual({ value: 84 });
      expect(result.effects).toHaveLength(3);
    }
  });
});
