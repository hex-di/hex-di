/**
 * DoD 2: Machine Definition (Spec Section 03) - Unit Tests
 *
 * These tests verify:
 * 1. defineMachine creates a valid Machine from config
 * 2. defineMachine uses explicit initial when provided
 * 3. defineMachine normalizes full TransitionConfig objects correctly
 * 4. defineMachine produces deeply frozen Machine objects
 * 5. Attempted mutation of frozen machine throws in strict mode
 * 6. Machine id is immutable after creation
 * 7. Transition with guard, actions, and effects is preserved in machine
 * 8. Multiple transitions for same event (guarded array) are preserved
 * 9. Empty on: {} defines a final/terminal state
 * 10. MachineConfig accepts undefined as context
 * 11. Machine composition via Effect.spawn references child machine
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { expectOk, expectErr } from "@hex-di/result-testing";
import {
  defineMachine,
  Effect,
  transition,
  computeFlowMetadata,
  isFlowMetadata,
  serializeMachineState,
  restoreMachineState,
} from "../src/index.js";
import { createMachineRunner } from "../src/runner/create-runner.js";
import { createActivityManager } from "../src/activities/manager.js";
import { createBasicExecutor } from "../src/runner/executor.js";

// =============================================================================
// DoD 2: Machine Definition Tests
// =============================================================================

describe("DoD 2: Machine Definition", () => {
  // =========================================================================
  // Test 1: defineMachine creates a valid Machine from config
  // =========================================================================
  it("defineMachine creates a valid Machine from config", () => {
    const machine = defineMachine({
      id: "toggle",
      initial: "off",
      context: undefined,
      states: {
        off: { on: { TOGGLE: { target: "on" } } },
        on: { on: { TOGGLE: { target: "off" } } },
      },
    });

    expect(machine.id).toBe("toggle");
    expect(machine.initial).toBe("off");
    expect(Object.keys(machine.states)).toEqual(["off", "on"]);
  });

  // =========================================================================
  // Test 2: defineMachine uses explicit initial when provided
  // =========================================================================
  it("defineMachine uses explicit initial when provided", () => {
    const machine = defineMachine({
      id: "test",
      initial: "active",
      context: undefined,
      states: {
        idle: { on: { GO: { target: "active" } } },
        active: { on: { STOP: { target: "idle" } } },
      },
    });

    expect(machine.initial).toBe("active");
  });

  // =========================================================================
  // Test 3: defineMachine normalizes full TransitionConfig objects correctly
  // =========================================================================
  it("defineMachine normalizes full TransitionConfig objects correctly", () => {
    const machine = defineMachine({
      id: "transition-test",
      initial: "idle",
      context: { count: 0 },
      states: {
        idle: {
          on: {
            GO: {
              target: "active",
              guard: (ctx: { count: number }) => ctx.count > 0,
              actions: [(ctx: { count: number }) => ({ count: ctx.count + 1 })],
              effects: [Effect.none()],
            },
          },
        },
        active: { on: {} },
      },
    });

    const stateNode = machine.states.idle;
    const goTransition = stateNode.on?.GO;

    expect(goTransition).toBeDefined();
    expect(typeof goTransition).toBe("object");
  });

  // =========================================================================
  // Test 4: defineMachine produces deeply frozen Machine objects
  // =========================================================================
  it("defineMachine produces deeply frozen Machine objects", () => {
    const machine = defineMachine({
      id: "frozen-test",
      initial: "a",
      context: { nested: { value: 42 } },
      states: {
        a: { on: { GO: { target: "b" } } },
        b: { on: {} },
      },
    });

    expect(Object.isFrozen(machine)).toBe(true);
    expect(Object.isFrozen(machine.states)).toBe(true);
    expect(Object.isFrozen(machine.states.a)).toBe(true);
    expect(Object.isFrozen(machine.states.a.on)).toBe(true);
    expect(Object.isFrozen(machine.context)).toBe(true);
  });

  // =========================================================================
  // Test 5: Attempted mutation of frozen machine throws in strict mode
  // =========================================================================
  it("Attempted mutation of frozen machine throws in strict mode", () => {
    const machine = defineMachine({
      id: "immutable-test",
      initial: "a",
      context: undefined,
      states: {
        a: { on: { GO: { target: "b" } } },
        b: { on: {} },
      },
    });

    // In strict mode (ESM modules use strict mode by default), assigning to
    // a frozen object throws TypeError
    expect(() => {
      (machine as Record<string, unknown>).id = "mutated";
    }).toThrow(TypeError);
  });

  // =========================================================================
  // Test 6: Machine id is immutable after creation
  // =========================================================================
  it("Machine id is immutable after creation", () => {
    const machine = defineMachine({
      id: "stable-id",
      initial: "a",
      context: undefined,
      states: {
        a: { on: {} },
      },
    });

    expect(machine.id).toBe("stable-id");

    expect(() => {
      (machine as Record<string, unknown>).id = "changed";
    }).toThrow(TypeError);

    expect(machine.id).toBe("stable-id");
  });

  // =========================================================================
  // Test 7: Transition with guard, actions, and effects is preserved
  // =========================================================================
  it("Transition with guard, actions, and effects is preserved in machine", () => {
    const guardFn = (ctx: { count: number }) => ctx.count > 0;
    const actionFn = (ctx: { count: number }) => ({ count: ctx.count + 1 });
    const effect = Effect.delay(100);

    const machine = defineMachine({
      id: "full-transition",
      initial: "idle",
      context: { count: 0 },
      states: {
        idle: {
          on: {
            GO: {
              target: "active",
              guard: guardFn,
              actions: [actionFn],
              effects: [effect],
            },
          },
        },
        active: { on: {} },
      },
    });

    const idleOn = machine.states.idle.on as Record<string, unknown>;
    const goConfig = idleOn.GO as {
      target: string;
      guard: unknown;
      actions: unknown[];
      effects: unknown[];
    };

    expect(goConfig.target).toBe("active");
    expect(goConfig.guard).toBe(guardFn);
    expect(goConfig.actions).toHaveLength(1);
    expect(goConfig.effects).toHaveLength(1);
  });

  // =========================================================================
  // Test 8: Multiple transitions for same event (guarded array) are preserved
  // =========================================================================
  it("Multiple transitions for same event (guarded array) are preserved", () => {
    const machine = defineMachine({
      id: "multi-guard",
      initial: "idle",
      context: { count: 0 },
      states: {
        idle: {
          on: {
            GO: [
              {
                target: "high",
                guard: (ctx: { count: number }) => ctx.count > 10,
              },
              {
                target: "low",
              },
            ],
          },
        },
        high: { on: {} },
        low: { on: {} },
      },
    });

    const idleOn = machine.states.idle.on as Record<string, unknown>;
    const goConfig = idleOn.GO;

    expect(Array.isArray(goConfig)).toBe(true);
    expect((goConfig as unknown[]).length).toBe(2);

    // Verify first passing guard wins
    const result = transition("idle", { count: 20 }, { type: "GO" }, machine);
    expect(result.newState).toBe("high");

    const result2 = transition("idle", { count: 5 }, { type: "GO" }, machine);
    expect(result2.newState).toBe("low");
  });

  // =========================================================================
  // Test 9: Empty on: {} defines a final/terminal state
  // =========================================================================
  it("Empty on: {} defines a final state in defineMachine", () => {
    const machine = defineMachine({
      id: "final-state",
      initial: "running",
      context: undefined,
      states: {
        running: {
          on: {
            DONE: { target: "completed" },
          },
        },
        completed: {
          on: {},
        },
      },
    });

    // Completed state has no transitions
    const completedOn = machine.states.completed.on ?? {};
    expect(Object.keys(completedOn)).toHaveLength(0);

    // Sending an event while in completed state should not transition
    const result = transition("completed", undefined, { type: "DONE" }, machine);
    expect(result.transitioned).toBe(false);
  });

  // =========================================================================
  // Test 10: MachineConfig accepts undefined as context
  // =========================================================================
  it("MachineConfig accepts undefined as context", () => {
    const machine = defineMachine({
      id: "no-context",
      initial: "idle",
      states: {
        idle: { on: { GO: { target: "active" } } },
        active: { on: {} },
      },
    });

    expect(machine.context).toBeUndefined();
  });

  // =========================================================================
  // Test 11: Machine composition via Effect.spawn references child machine
  // =========================================================================
  it("Machine composition via Effect.spawn references child machine", () => {
    const machine = defineMachine({
      id: "parent",
      initial: "idle",
      context: undefined,
      states: {
        idle: {
          on: {
            START: {
              target: "running",
              effects: [Effect.spawn("childProcess", { data: "input" })],
            },
          },
        },
        running: {
          on: {
            DONE: { target: "completed" },
          },
        },
        completed: { on: {} },
      },
    });

    // Verify the spawn effect is in the transition config
    const result = transition("idle", undefined, { type: "START" }, machine);
    expect(result.transitioned).toBe(true);
    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]._tag).toBe("Spawn");
  });

  // =========================================================================
  // Test 12: String shorthand transitions are normalized
  // =========================================================================
  it("String shorthand transitions are normalized to TransitionConfig", () => {
    const machine = defineMachine({
      id: "shorthand-test",
      initial: "off",
      context: undefined,
      states: {
        off: { on: { TOGGLE: "on" } },
        on: { on: { TOGGLE: "off" } },
      },
    });

    // Transition should work through the string shorthand
    const result = transition("off", undefined, { type: "TOGGLE" }, machine);
    expect(result.transitioned).toBe(true);
    expect(result.newState).toBe("on");

    // Reverse transition
    const result2 = transition("on", undefined, { type: "TOGGLE" }, machine);
    expect(result2.transitioned).toBe(true);
    expect(result2.newState).toBe("off");
  });

  // =========================================================================
  // Test 13: String shorthand in guarded arrays is normalized
  // =========================================================================
  it("String shorthand in guarded arrays is normalized", () => {
    const machine = defineMachine({
      id: "shorthand-array",
      initial: "idle",
      context: { count: 0 },
      states: {
        idle: {
          on: {
            GO: [
              {
                target: "high",
                guard: (ctx: { count: number }) => ctx.count > 10,
              },
              "low",
            ],
          },
        },
        high: { on: {} },
        low: { on: {} },
      },
    });

    // Default (no guard match) should go to "low" via string shorthand
    const result = transition("idle", { count: 5 }, { type: "GO" }, machine);
    expect(result.transitioned).toBe(true);
    expect(result.newState).toBe("low");

    // Guard match should go to "high"
    const result2 = transition("idle", { count: 20 }, { type: "GO" }, machine);
    expect(result2.transitioned).toBe(true);
    expect(result2.newState).toBe("high");
  });

  // =========================================================================
  // Test 14: type: 'final' states reject events
  // =========================================================================
  it("type: 'final' states reject events", () => {
    const machine = defineMachine({
      id: "final-type-test",
      initial: "running",
      context: undefined,
      states: {
        running: {
          on: { DONE: { target: "completed" } },
        },
        completed: {
          type: "final",
        },
      },
    });

    // Transition to final state
    const result = transition("running", undefined, { type: "DONE" }, machine);
    expect(result.transitioned).toBe(true);
    expect(result.newState).toBe("completed");

    // Sending event to final state should not transition
    const result2 = transition("completed", undefined, { type: "DONE" }, machine);
    expect(result2.transitioned).toBe(false);
  });

  // =========================================================================
  // Test 15: States without on property are valid
  // =========================================================================
  it("States without on property are valid terminal states", () => {
    const machine = defineMachine({
      id: "no-on-test",
      initial: "running",
      context: undefined,
      states: {
        running: {
          on: { DONE: { target: "completed" } },
        },
        completed: {},
      },
    });

    // Transition to state without on
    const result = transition("running", undefined, { type: "DONE" }, machine);
    expect(result.transitioned).toBe(true);
    expect(result.newState).toBe("completed");

    // No transitions from state without on
    const result2 = transition("completed", undefined, { type: "DONE" }, machine);
    expect(result2.transitioned).toBe(false);
  });

  // =========================================================================
  // Test 16: Initial state inferred from first key when omitted
  // =========================================================================
  it("Initial state inferred from first key when omitted", () => {
    const machine = defineMachine({
      id: "infer-initial",
      context: undefined,
      states: {
        idle: { on: { GO: { target: "active" } } },
        active: { on: { STOP: { target: "idle" } } },
      },
    });

    // initial should be "idle" (first key in states)
    expect(machine.initial).toBe("idle");
  });

  it("Explicit initial overrides first key inference", () => {
    const machine = defineMachine({
      id: "explicit-initial",
      initial: "active",
      context: undefined,
      states: {
        idle: { on: { GO: { target: "active" } } },
        active: { on: { STOP: { target: "idle" } } },
      },
    });

    // initial should be "active" (explicitly set)
    expect(machine.initial).toBe("active");
  });

  // =========================================================================
  // Test: after (delayed) transitions are normalized
  // =========================================================================
  it("after transitions are normalized to entry effects and $$AFTER_* handlers", () => {
    const machine = defineMachine({
      id: "after-test",
      initial: "waiting",
      context: undefined,
      states: {
        waiting: {
          after: {
            3000: { target: "timeout" },
          },
          on: {
            CANCEL: { target: "cancelled" },
          },
        },
        timeout: { on: {} },
        cancelled: { on: {} },
      },
    });

    const waitingState = machine.states.waiting;

    // The $$AFTER_3000 handler should be in the normalized `on`
    const onRecord = waitingState.on as Record<string, unknown>;
    expect(onRecord["$$AFTER_3000"]).toEqual({ target: "timeout" });

    // The CANCEL handler should still be there
    expect(onRecord["CANCEL"]).toBeDefined();

    // Entry effects should contain the sequence
    expect(waitingState.entry).toBeDefined();
    expect(waitingState.entry).toHaveLength(1);

    const entryEffect = waitingState.entry![0];
    expect(entryEffect._tag).toBe("Sequence");

    // The $$AFTER_3000 event should trigger a transition
    const result = transition("waiting", undefined, { type: "$$AFTER_3000" }, machine);
    expect(result.transitioned).toBe(true);
    expect(result.newState).toBe("timeout");
  });

  it("after with string shorthand target is normalized", () => {
    const machine = defineMachine({
      id: "after-shorthand",
      initial: "waiting",
      context: undefined,
      states: {
        waiting: {
          after: {
            5000: "expired",
          },
        },
        expired: { on: {} },
      },
    });

    const onRecord = machine.states.waiting.on as Record<string, unknown>;
    expect(onRecord["$$AFTER_5000"]).toEqual({ target: "expired" });

    const result = transition("waiting", undefined, { type: "$$AFTER_5000" }, machine);
    expect(result.transitioned).toBe(true);
    expect(result.newState).toBe("expired");
  });

  it("after with multiple delays creates multiple handlers and entry effects", () => {
    const machine = defineMachine({
      id: "after-multi",
      initial: "waiting",
      context: undefined,
      states: {
        waiting: {
          after: {
            1000: { target: "warning" },
            5000: { target: "timeout" },
          },
        },
        warning: { on: {} },
        timeout: { on: {} },
      },
    });

    const waitingState = machine.states.waiting;
    const onRecord = waitingState.on as Record<string, unknown>;

    expect(onRecord["$$AFTER_1000"]).toEqual({ target: "warning" });
    expect(onRecord["$$AFTER_5000"]).toEqual({ target: "timeout" });

    // Two entry effects (one per delay), in ascending ms order
    expect(waitingState.entry).toHaveLength(2);
    expect(waitingState.entry![0]._tag).toBe("Sequence");
    expect(waitingState.entry![1]._tag).toBe("Sequence");
  });

  it("after preserves existing entry effects", () => {
    const existingEffect = Effect.delay(0);

    const machine = defineMachine({
      id: "after-preserve",
      initial: "waiting",
      context: undefined,
      states: {
        waiting: {
          entry: [existingEffect],
          after: {
            2000: { target: "done" },
          },
        },
        done: { on: {} },
      },
    });

    const waitingState = machine.states.waiting;

    // Should have: existing effect + the after sequence
    expect(waitingState.entry).toHaveLength(2);
    expect(waitingState.entry![0]._tag).toBe("Delay");
    expect(waitingState.entry![1]._tag).toBe("Sequence");
  });

  it("after with guarded transitions is normalized correctly", () => {
    const guardFn = (ctx: { retries: number }) => ctx.retries === 0;

    const machine = defineMachine({
      id: "after-guarded",
      initial: "waiting",
      context: { retries: 0 },
      states: {
        waiting: {
          after: {
            3000: {
              target: "timeout",
              guard: guardFn,
            },
          },
        },
        timeout: { on: {} },
      },
    });

    const onRecord = machine.states.waiting.on as Record<string, unknown>;
    const afterHandler = onRecord["$$AFTER_3000"] as { target: string; guard: unknown };
    expect(afterHandler.target).toBe("timeout");
    expect(afterHandler.guard).toBe(guardFn);

    // Guard passes: retries === 0
    const result = transition("waiting", { retries: 0 }, { type: "$$AFTER_3000" }, machine);
    expect(result.transitioned).toBe(true);
    expect(result.newState).toBe("timeout");

    // Guard fails: retries > 0
    const result2 = transition("waiting", { retries: 1 }, { type: "$$AFTER_3000" }, machine);
    expect(result2.transitioned).toBe(false);
  });

  // =========================================================================
  // Test 17: computeFlowMetadata extracts machine structure
  // =========================================================================
  it("computeFlowMetadata extracts machine structure", () => {
    const machine = defineMachine({
      id: "metadata-test",
      initial: "idle",
      context: { count: 0 },
      states: {
        idle: {
          on: {
            FETCH: { target: "loading" },
            RESET: { target: "idle" },
          },
        },
        loading: {
          on: {
            SUCCESS: { target: "success" },
            FAILURE: { target: "error" },
          },
        },
        success: { type: "final" },
        error: {
          on: {
            RETRY: { target: "loading" },
          },
        },
      },
    });

    const result = computeFlowMetadata(machine, ["TaskActivity"]);

    const metadata = expectOk(result);
    expect(metadata.machineId).toBe("metadata-test");
    expect(metadata.stateNames).toEqual(["idle", "loading", "success", "error"]);
    expect(metadata.eventNames).toEqual(["FAILURE", "FETCH", "RESET", "RETRY", "SUCCESS"]);
    expect(metadata.finalStates).toEqual(["success"]);
    expect(metadata.transitionsPerState).toEqual({
      idle: [
        { event: "FETCH", target: "loading", hasGuard: false, hasEffects: false },
        { event: "RESET", target: "idle", hasGuard: false, hasEffects: false },
      ],
      loading: [
        { event: "SUCCESS", target: "success", hasGuard: false, hasEffects: false },
        { event: "FAILURE", target: "error", hasGuard: false, hasEffects: false },
      ],
      success: [],
      error: [{ event: "RETRY", target: "loading", hasGuard: false, hasEffects: false }],
    });
    expect(metadata.activityPortNames).toEqual(["TaskActivity"]);
  });

  // =========================================================================
  // Test 17: isFlowMetadata type guard
  // =========================================================================
  it("isFlowMetadata type guard works", () => {
    const machine = defineMachine({
      id: "guard-test",
      initial: "a",
      context: undefined,
      states: {
        a: { on: { GO: { target: "b" } } },
        b: { on: {} },
      },
    });

    const result = computeFlowMetadata(machine);
    const value = expectOk(result);
    expect(isFlowMetadata(value)).toBe(true);

    // Non-metadata objects
    expect(isFlowMetadata(null)).toBe(false);
    expect(isFlowMetadata({})).toBe(false);
    expect(isFlowMetadata({ machineId: "test" })).toBe(false);
  });

  // =========================================================================
  // Test 18: serializeMachineState creates a serialized snapshot
  // =========================================================================
  it("serializeMachineState creates a serialized snapshot", () => {
    const machine = defineMachine({
      id: "serialize-test",
      initial: "idle",
      context: { count: 0, name: "test" },
      states: {
        idle: { on: { GO: { target: "active" } } },
        active: { on: {} },
      },
    });

    const executor = createBasicExecutor();
    const activityManager = createActivityManager();
    const runner = createMachineRunner(machine, { executor, activityManager });

    const result = serializeMachineState(runner, "serialize-test");

    const value = expectOk(result);
    expect(value.version).toBe(1);
    expect(value.machineId).toBe("serialize-test");
    expect(value.state).toBe("idle");
    expect(value.context).toEqual({ count: 0, name: "test" });
    expect(typeof value.timestamp).toBe("number");

    activityManager.dispose();
  });

  // =========================================================================
  // Test 19: serializeMachineState detects non-serializable context
  // =========================================================================
  it("serializeMachineState detects non-serializable context", () => {
    const machine = defineMachine({
      id: "non-serializable",
      initial: "idle",
      context: { callback: () => {} },
      states: {
        idle: { on: {} },
      },
    });

    const executor = createBasicExecutor();
    const activityManager = createActivityManager();
    const runner = createMachineRunner(machine, { executor, activityManager });

    const result = serializeMachineState(runner, "non-serializable");

    const error = expectErr(result);
    expect(error._tag).toBe("NonSerializableContext");

    activityManager.dispose();
  });

  // =========================================================================
  // Test 20: restoreMachineState validates state and machine ID
  // =========================================================================
  it("restoreMachineState validates state and machine ID", () => {
    const machine = defineMachine({
      id: "restore-test",
      initial: "idle",
      context: { count: 0 },
      states: {
        idle: { on: { GO: { target: "active" } } },
        active: { on: {} },
      },
    });

    // Valid restore
    const validResult = restoreMachineState(
      {
        version: 1,
        machineId: "restore-test",
        state: "active",
        context: { count: 5 },
        timestamp: Date.now(),
      },
      machine
    );
    const validValue = expectOk(validResult);
    expect(validValue.state).toBe("active");
    expect(validValue.context).toEqual({ count: 5 });

    // Invalid machine ID
    const mismatchResult = restoreMachineState(
      { version: 1, machineId: "wrong-id", state: "idle", context: {}, timestamp: Date.now() },
      machine
    );
    const mismatchError = expectErr(mismatchResult);
    expect(mismatchError._tag).toBe("MachineIdMismatch");

    // Invalid state
    const invalidStateResult = restoreMachineState(
      {
        version: 1,
        machineId: "restore-test",
        state: "nonexistent",
        context: {},
        timestamp: Date.now(),
      },
      machine
    );
    const invalidStateError = expectErr(invalidStateResult);
    expect(invalidStateError._tag).toBe("InvalidState");
  });
});
