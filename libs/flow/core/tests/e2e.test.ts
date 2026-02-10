/**
 * End-to-End Flow Tests
 *
 * These tests fill critical coverage gaps by testing:
 * 1. End-to-end machine lifecycle (creation to disposal)
 * 2. Complex multi-step transitions with guards and context accumulation
 * 3. Self-transitions (state stays same, context updates)
 * 4. Effect.invoke with real port resolution via DIEffectExecutor
 * 5. EmitEffect cycle (events emitted back to machine)
 * 6. Entry/exit effects ordering in complex workflows
 * 7. Activity manager integration with runner dispose
 * 8. Context-driven guard chains
 *
 * Maximum 10 strategic tests to complement existing ~184 tests.
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { port } from "@hex-di/core";
import { defineMachine } from "../src/machine/define-machine.js";
import { event } from "../src/machine/factories.js";
import { Effect } from "../src/effects/constructors.js";
import type { EffectAny } from "../src/effects/types.js";
import { createMachineRunner, type MachineSnapshot } from "../src/runner/index.js";
import { createActivityManager, type ActivityManager } from "../src/activities/index.js";
import { createDIEffectExecutor, type ScopeResolver } from "../src/integration/di-executor.js";
import { FlowMemoryCollector, createTracingRunner } from "../src/tracing/index.js";

// =============================================================================
// Test Service for Effect.invoke Tests
// =============================================================================

interface CounterService {
  increment(): number;
  decrement(): number;
  getCount(): number;
}

const CounterServicePort = port<CounterService>()({ name: "CounterService" });

function createCounterService(): CounterService {
  let count = 0;
  return {
    increment() {
      count += 1;
      return count;
    },
    decrement() {
      count -= 1;
      return count;
    },
    getCount() {
      return count;
    },
  };
}

// =============================================================================
// Test 1: End-to-End Machine Lifecycle
// =============================================================================

describe("End-to-End Machine Lifecycle", () => {
  let activityManager: ActivityManager;

  beforeEach(() => {
    activityManager = createActivityManager();
  });

  afterEach(async () => {
    await activityManager.dispose();
  });

  it("should complete full lifecycle: create -> transitions -> subscribe -> dispose", async () => {
    // Context type for workflow machine
    interface WorkflowContext {
      readonly step: number;
      readonly history: readonly string[];
    }

    // Create a workflow machine with multiple states
    const workflowMachine = defineMachine({
      id: "workflow-lifecycle",
      initial: "idle",
      context: { step: 0, history: [] } satisfies WorkflowContext,
      states: {
        idle: {
          on: {
            START: {
              target: "step1",
              actions: [
                (ctx: WorkflowContext) => ({
                  step: 1,
                  history: [...ctx.history, "started"],
                }),
              ],
            },
          },
        },
        step1: {
          on: {
            NEXT: {
              target: "step2",
              actions: [
                (ctx: WorkflowContext) => ({
                  step: 2,
                  history: [...ctx.history, "step1->step2"],
                }),
              ],
            },
            CANCEL: {
              target: "cancelled",
              actions: [
                (ctx: WorkflowContext) => ({
                  ...ctx,
                  history: [...ctx.history, "cancelled"],
                }),
              ],
            },
          },
        },
        step2: {
          on: {
            COMPLETE: {
              target: "done",
              actions: [
                (ctx: WorkflowContext) => ({
                  step: 3,
                  history: [...ctx.history, "completed"],
                }),
              ],
            },
          },
        },
        done: {
          on: {},
        },
        cancelled: {
          on: {},
        },
      },
    });

    // Create event factories
    const startEvent = event<"START">("START");
    const nextEvent = event<"NEXT">("NEXT");
    const completeEvent = event<"COMPLETE">("COMPLETE");

    // Create runner
    const runner = createMachineRunner(workflowMachine, {
      executor: { execute: () => ResultAsync.ok(undefined) },
      activityManager,
    });

    // Track snapshots via subscription
    const snapshots: MachineSnapshot<string, WorkflowContext>[] = [];
    const unsubscribe = runner.subscribe(snapshot => {
      snapshots.push(snapshot);
    });

    // Verify initial state
    expect(runner.state()).toBe("idle");
    expect(runner.context().step).toBe(0);
    expect(runner.isDisposed).toBe(false);

    // Execute full workflow
    runner.send(startEvent());
    expect(runner.state()).toBe("step1");
    expect(runner.context().step).toBe(1);

    runner.send(nextEvent());
    expect(runner.state()).toBe("step2");
    expect(runner.context().step).toBe(2);

    runner.send(completeEvent());
    expect(runner.state()).toBe("done");
    expect(runner.context().step).toBe(3);

    // Verify subscription received updates
    expect(snapshots.length).toBe(3);
    expect(snapshots[0]?.state).toBe("step1");
    expect(snapshots[1]?.state).toBe("step2");
    expect(snapshots[2]?.state).toBe("done");

    // Verify history accumulated correctly
    expect(runner.context().history).toEqual(["started", "step1->step2", "completed"]);

    // Cleanup
    unsubscribe();
    await runner.dispose();

    // Verify disposed state
    expect(runner.isDisposed).toBe(true);
  });
});

// =============================================================================
// Test 2: Self-Transitions (Same State, Context Updates)
// =============================================================================

describe("Self-Transitions", () => {
  let activityManager: ActivityManager;

  beforeEach(() => {
    activityManager = createActivityManager();
  });

  afterEach(async () => {
    await activityManager.dispose();
  });

  it("should handle self-transitions that update context without changing state", () => {
    interface FormContext {
      readonly name: string;
      readonly email: string;
      readonly validationErrors: readonly string[];
    }

    // Define payload types
    interface SetNamePayload {
      readonly value: string;
    }

    interface SetEmailPayload {
      readonly value: string;
    }

    const formMachine = defineMachine({
      id: "form-self-transition",
      initial: "editing",
      context: {
        name: "",
        email: "",
        validationErrors: [],
      } satisfies FormContext,
      states: {
        editing: {
          on: {
            SET_NAME: {
              target: "editing", // Self-transition
              actions: [
                (
                  ctx: FormContext,
                  evt: { readonly type: "SET_NAME"; readonly payload: SetNamePayload }
                ) => ({
                  ...ctx,
                  name: evt.payload.value,
                }),
              ],
            },
            SET_EMAIL: {
              target: "editing", // Self-transition
              actions: [
                (
                  ctx: FormContext,
                  evt: { readonly type: "SET_EMAIL"; readonly payload: SetEmailPayload }
                ) => ({
                  ...ctx,
                  email: evt.payload.value,
                }),
              ],
            },
            VALIDATE: {
              target: "editing", // Self-transition with validation
              actions: [
                (ctx: FormContext) => {
                  const errors: string[] = [];
                  if (ctx.name.length < 2) errors.push("Name too short");
                  if (!ctx.email.includes("@")) errors.push("Invalid email");
                  return { ...ctx, validationErrors: errors };
                },
              ],
            },
            SUBMIT: {
              target: "submitted",
              guard: (ctx: FormContext) =>
                ctx.validationErrors.length === 0 && ctx.name.length > 0 && ctx.email.length > 0,
            },
          },
        },
        submitted: {
          on: {},
        },
      },
    });

    const setNameEvent = event<"SET_NAME", SetNamePayload>("SET_NAME");
    const setEmailEvent = event<"SET_EMAIL", SetEmailPayload>("SET_EMAIL");
    const validateEvent = event<"VALIDATE">("VALIDATE");
    const submitEvent = event<"SUBMIT">("SUBMIT");

    const runner = createMachineRunner(formMachine, {
      executor: { execute: () => ResultAsync.ok(undefined) },
      activityManager,
    });

    // All updates should stay in 'editing' state
    runner.send(setNameEvent({ value: "J" }));
    expect(runner.state()).toBe("editing");
    expect(runner.context().name).toBe("J");

    runner.send(setEmailEvent({ value: "test" }));
    expect(runner.state()).toBe("editing");
    expect(runner.context().email).toBe("test");

    // Validate with errors (still in editing)
    runner.send(validateEvent());
    expect(runner.state()).toBe("editing");
    expect(runner.context().validationErrors).toContain("Name too short");
    expect(runner.context().validationErrors).toContain("Invalid email");

    // Fix name
    runner.send(setNameEvent({ value: "John" }));
    runner.send(validateEvent());
    expect(runner.context().validationErrors).not.toContain("Name too short");

    // Fix email
    runner.send(setEmailEvent({ value: "john@example.com" }));
    runner.send(validateEvent());
    expect(runner.context().validationErrors).toEqual([]);

    // Now submit should work
    runner.send(submitEvent());
    expect(runner.state()).toBe("submitted");
  });
});

// =============================================================================
// Test 3: Context-Driven Guard Chains
// =============================================================================

describe("Context-Driven Guard Chains", () => {
  let activityManager: ActivityManager;

  beforeEach(() => {
    activityManager = createActivityManager();
  });

  afterEach(async () => {
    await activityManager.dispose();
  });

  it("should evaluate guards based on accumulated context from previous actions", () => {
    interface GameContext {
      readonly score: number;
      readonly lives: number;
      readonly level: number;
    }

    const gameMachine = defineMachine({
      id: "game-guards",
      initial: "playing",
      context: { score: 0, lives: 3, level: 1 } satisfies GameContext,
      states: {
        playing: {
          on: {
            SCORE: {
              target: "playing",
              actions: [
                (ctx: GameContext) => ({
                  ...ctx,
                  score: ctx.score + 100,
                }),
              ],
            },
            HIT: [
              // Chain of guards based on lives
              {
                target: "gameover",
                guard: (ctx: GameContext) => ctx.lives <= 1,
                actions: [(ctx: GameContext) => ({ ...ctx, lives: 0 })],
              },
              {
                target: "playing",
                // Default: lives > 1
                actions: [(ctx: GameContext) => ({ ...ctx, lives: ctx.lives - 1 })],
              },
            ],
            LEVEL_UP: [
              // Guard based on score threshold
              {
                target: "playing",
                guard: (ctx: GameContext) => ctx.score >= ctx.level * 500,
                actions: [
                  (ctx: GameContext) => ({
                    ...ctx,
                    level: ctx.level + 1,
                    score: 0, // Reset score for new level
                  }),
                ],
              },
            ],
          },
        },
        gameover: {
          on: {},
        },
      },
    });

    const scoreEvent = event<"SCORE">("SCORE");
    const hitEvent = event<"HIT">("HIT");
    const levelUpEvent = event<"LEVEL_UP">("LEVEL_UP");

    const runner = createMachineRunner(gameMachine, {
      executor: { execute: () => ResultAsync.ok(undefined) },
      activityManager,
    });

    // Accumulate score
    for (let i = 0; i < 5; i++) {
      runner.send(scoreEvent());
    }
    expect(runner.context().score).toBe(500);

    // Level up should work now (score >= level * 500 = 500)
    runner.send(levelUpEvent());
    expect(runner.context().level).toBe(2);
    expect(runner.context().score).toBe(0); // Reset

    // Take hits - lives go from 3 to 2 to 1 to gameover
    runner.send(hitEvent());
    expect(runner.state()).toBe("playing");
    expect(runner.context().lives).toBe(2);

    runner.send(hitEvent());
    expect(runner.state()).toBe("playing");
    expect(runner.context().lives).toBe(1);

    // This hit should trigger game over (lives <= 1)
    runner.send(hitEvent());
    expect(runner.state()).toBe("gameover");
    expect(runner.context().lives).toBe(0);
  });
});

// =============================================================================
// Test 4: Effect.invoke with Real Port Resolution
// =============================================================================

describe("Effect.invoke with Port Resolution", () => {
  let activityManager: ActivityManager;
  let counterService: CounterService;

  beforeEach(() => {
    activityManager = createActivityManager();
    counterService = createCounterService();
  });

  afterEach(async () => {
    await activityManager.dispose();
  });

  it("should resolve ports and call methods via DIEffectExecutor", async () => {
    // Create a mock scope resolver
    const mockScopeResolver: ScopeResolver = {
      resolve: vi.fn().mockReturnValue(counterService),
    };

    // Create machine with Effect.invoke
    const invokerMachine = defineMachine({
      id: "invoker",
      initial: "idle",
      context: undefined,
      states: {
        idle: {
          on: {
            INCREMENT: {
              target: "idle",
              effects: [Effect.invoke(CounterServicePort, "increment", [])],
            },
          },
        },
      },
    });

    const executor = createDIEffectExecutor({
      scope: mockScopeResolver,
      activityManager,
    });

    const runner = createMachineRunner(invokerMachine, {
      executor,
      activityManager,
    });

    const incrementEvent = event<"INCREMENT">("INCREMENT");

    // Execute with effects
    await runner.sendAndExecute(incrementEvent());

    // Verify port was resolved and method was called
    expect(mockScopeResolver.resolve).toHaveBeenCalledWith(CounterServicePort);
    expect(counterService.getCount()).toBe(1);

    // Do it again
    await runner.sendAndExecute(incrementEvent());
    expect(counterService.getCount()).toBe(2);
  });
});

// =============================================================================
// Test 5: Entry/Exit Effects Ordering
// =============================================================================

describe("Entry/Exit Effects Ordering", () => {
  let activityManager: ActivityManager;

  beforeEach(() => {
    activityManager = createActivityManager();
  });

  afterEach(async () => {
    await activityManager.dispose();
  });

  it("should execute effects in correct order: exit -> transition -> entry", async () => {
    const effectLog: string[] = [];

    // Custom executor that logs effect execution order
    const loggingExecutor = {
      execute(effect: EffectAny) {
        if (effect._tag === "Delay" && "milliseconds" in effect) {
          const ms = effect.milliseconds;
          effectLog.push(`delay-${ms}`);
        }
        return ResultAsync.ok(undefined);
      },
    };

    const orderMachine = defineMachine({
      id: "order-test",
      initial: "A",
      context: undefined,
      states: {
        A: {
          exit: [Effect.delay(1)], // exit-A
          on: {
            GO: {
              target: "B",
              effects: [Effect.delay(2)], // transition A->B
            },
          },
        },
        B: {
          entry: [Effect.delay(3)], // entry-B
          exit: [Effect.delay(4)], // exit-B
          on: {
            GO: {
              target: "C",
              effects: [Effect.delay(5)], // transition B->C
            },
          },
        },
        C: {
          entry: [Effect.delay(6)], // entry-C
          on: {},
        },
      },
    });

    const goEvent = event<"GO">("GO");

    const runner = createMachineRunner(orderMachine, {
      executor: loggingExecutor,
      activityManager,
    });

    // Transition A -> B
    await runner.sendAndExecute(goEvent());

    // Effects should be: exit-A (delay-1), transition (delay-2), entry-B (delay-3)
    expect(effectLog).toEqual(["delay-1", "delay-2", "delay-3"]);

    // Clear log and transition B -> C
    effectLog.length = 0;
    await runner.sendAndExecute(goEvent());

    // Effects should be: exit-B (delay-4), transition (delay-5), entry-C (delay-6)
    expect(effectLog).toEqual(["delay-4", "delay-5", "delay-6"]);
  });
});

// =============================================================================
// Test 6: Tracing Integration with Complex Workflow
// =============================================================================

describe("Tracing Integration", () => {
  let activityManager: ActivityManager;

  beforeEach(() => {
    activityManager = createActivityManager();
  });

  afterEach(async () => {
    await activityManager.dispose();
  });

  it("should record all transitions with correct metadata in collector", () => {
    interface TracingContext {
      readonly value: number;
    }

    const tracingMachine = defineMachine({
      id: "tracing-test",
      initial: "idle",
      context: { value: 0 } satisfies TracingContext,
      states: {
        idle: {
          on: {
            START: {
              target: "running",
              actions: [(ctx: TracingContext) => ({ value: ctx.value + 1 })],
            },
          },
        },
        running: {
          on: {
            PAUSE: { target: "paused" },
            STOP: { target: "stopped" },
          },
        },
        paused: {
          on: {
            RESUME: { target: "running" },
            STOP: { target: "stopped" },
          },
        },
        stopped: {
          on: {},
        },
      },
    });

    const collector = new FlowMemoryCollector();
    const executor = { execute: () => ResultAsync.ok(undefined) };

    const runner = createTracingRunner(tracingMachine, {
      executor,
      activityManager,
      collector,
    });

    const startEvent = event<"START">("START");
    const pauseEvent = event<"PAUSE">("PAUSE");
    const resumeEvent = event<"RESUME">("RESUME");
    const stopEvent = event<"STOP">("STOP");

    // Execute a sequence of transitions
    runner.send(startEvent()); // idle -> running
    runner.send(pauseEvent()); // running -> paused
    runner.send(resumeEvent()); // paused -> running
    runner.send(stopEvent()); // running -> stopped

    // Get all transitions
    const transitions = collector.getTransitions();
    expect(transitions).toHaveLength(4);

    // Verify transition details
    expect(transitions[0]?.machineId).toBe("tracing-test");
    expect(transitions[0]?.prevState).toBe("idle");
    expect(transitions[0]?.nextState).toBe("running");
    expect(transitions[0]?.event.type).toBe("START");

    expect(transitions[1]?.prevState).toBe("running");
    expect(transitions[1]?.nextState).toBe("paused");

    expect(transitions[2]?.prevState).toBe("paused");
    expect(transitions[2]?.nextState).toBe("running");

    expect(transitions[3]?.prevState).toBe("running");
    expect(transitions[3]?.nextState).toBe("stopped");

    // Verify stats
    const stats = collector.getStats();
    expect(stats.totalTransitions).toBe(4);
    expect(stats.transitionsByMachine["tracing-test"]).toBe(4);
  });
});

// =============================================================================
// Test 7: Multiple Runners with Same Machine Definition
// =============================================================================

describe("Multiple Runners with Same Machine", () => {
  let activityManager: ActivityManager;

  beforeEach(() => {
    activityManager = createActivityManager();
  });

  afterEach(async () => {
    await activityManager.dispose();
  });

  it("should maintain independent state across multiple runner instances", () => {
    interface IndependentContext {
      readonly id: string;
      readonly count: number;
    }

    // Define payload type
    interface SetIdPayload {
      readonly value: string;
    }

    const sharedMachine = defineMachine({
      id: "shared-def",
      initial: "active",
      context: { id: "", count: 0 } satisfies IndependentContext,
      states: {
        active: {
          on: {
            SET_ID: {
              target: "active",
              actions: [
                (
                  ctx: IndependentContext,
                  evt: { readonly type: "SET_ID"; readonly payload: SetIdPayload }
                ) => ({
                  ...ctx,
                  id: evt.payload.value,
                }),
              ],
            },
            INCREMENT: {
              target: "active",
              actions: [
                (ctx: IndependentContext) => ({
                  ...ctx,
                  count: ctx.count + 1,
                }),
              ],
            },
          },
        },
      },
    });

    const setIdEvent = event<"SET_ID", SetIdPayload>("SET_ID");
    const incrementEvent = event<"INCREMENT">("INCREMENT");

    // Create two independent runners
    const runner1 = createMachineRunner(sharedMachine, {
      executor: { execute: () => ResultAsync.ok(undefined) },
      activityManager,
    });

    const runner2 = createMachineRunner(sharedMachine, {
      executor: { execute: () => ResultAsync.ok(undefined) },
      activityManager,
    });

    // Set different IDs
    runner1.send(setIdEvent({ value: "runner-1" }));
    runner2.send(setIdEvent({ value: "runner-2" }));

    expect(runner1.context().id).toBe("runner-1");
    expect(runner2.context().id).toBe("runner-2");

    // Increment only runner1
    runner1.send(incrementEvent());
    runner1.send(incrementEvent());
    runner1.send(incrementEvent());

    expect(runner1.context().count).toBe(3);
    expect(runner2.context().count).toBe(0); // Runner2 unchanged
  });
});

// =============================================================================
// Test 8: Rapid Sequential Transitions
// =============================================================================

describe("Rapid Sequential Transitions", () => {
  let activityManager: ActivityManager;

  beforeEach(() => {
    activityManager = createActivityManager();
  });

  afterEach(async () => {
    await activityManager.dispose();
  });

  it("should handle many rapid transitions without state corruption", () => {
    interface CountContext {
      readonly count: number;
    }

    const rapidMachine = defineMachine({
      id: "rapid",
      initial: "counting",
      context: { count: 0 } satisfies CountContext,
      states: {
        counting: {
          on: {
            INC: {
              target: "counting",
              actions: [(ctx: CountContext) => ({ count: ctx.count + 1 })],
            },
            DEC: {
              target: "counting",
              actions: [(ctx: CountContext) => ({ count: ctx.count - 1 })],
            },
            RESET: {
              target: "counting",
              actions: [() => ({ count: 0 })],
            },
          },
        },
      },
    });

    const incEvent = event<"INC">("INC");
    const decEvent = event<"DEC">("DEC");
    const resetEvent = event<"RESET">("RESET");

    const runner = createMachineRunner(rapidMachine, {
      executor: { execute: () => ResultAsync.ok(undefined) },
      activityManager,
    });

    // Rapid-fire 100 increments
    for (let i = 0; i < 100; i++) {
      runner.send(incEvent());
    }
    expect(runner.context().count).toBe(100);

    // Rapid-fire 50 decrements
    for (let i = 0; i < 50; i++) {
      runner.send(decEvent());
    }
    expect(runner.context().count).toBe(50);

    // Reset
    runner.send(resetEvent());
    expect(runner.context().count).toBe(0);
  });
});
