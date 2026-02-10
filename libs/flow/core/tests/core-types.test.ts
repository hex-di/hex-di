/**
 * DoD 1: Core Concepts (Spec Section 02) - Unit Tests
 *
 * These tests verify:
 * 1. Machine has MachineBrandSymbol property (at type level; frozen at runtime)
 * 2. Machine is deeply frozen after creation
 * 3. Machine id matches the config id
 * 4. Machine initial matches the explicit initial
 * 5. Machine states record contains all declared state names
 * 6. Machine context holds the initial context value
 * 7. StateNode has entry, exit, and on properties
 * 8. Event factory creates a frozen event with type property
 * 9. Event with payload includes payload field
 * 10. Event without payload has no payload field
 * 11. Event has EventBrandSymbol for nominal typing (type-level only)
 * 12. State factory creates a frozen state with name property
 * 13. State has StateBrandSymbol for nominal typing (type-level only)
 * 14. Snapshot contains state, context, and activities
 * 15. Snapshot is frozen
 * 16. Guard function receives context and event, returns boolean
 * 17. Action function receives context and event, returns new context
 * 18. Transition with guard evaluates guard predicate
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { defineMachine, state, event, Effect, transition } from "../src/index.js";
import { createMachineRunner } from "../src/runner/create-runner.js";
import { createActivityManager } from "../src/activities/manager.js";
import { createBasicExecutor } from "../src/runner/executor.js";

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestMachine() {
  return defineMachine({
    id: "test-machine",
    initial: "idle",
    context: { count: 0, data: null as string | null },
    states: {
      idle: {
        entry: [Effect.none()],
        exit: [Effect.none()],
        on: {
          START: { target: "active" },
          INCREMENT: {
            target: "idle",
            actions: [
              (ctx: { count: number; data: string | null }) => ({
                ...ctx,
                count: ctx.count + 1,
              }),
            ],
          },
        },
      },
      active: {
        on: {
          STOP: { target: "idle" },
          FINISH: { target: "done" },
        },
      },
      done: {
        on: {},
      },
    },
  });
}

// =============================================================================
// DoD 1: Core Concepts Tests
// =============================================================================

describe("DoD 1: Core Concepts", () => {
  // =========================================================================
  // Test 1: Machine has a MachineBrandSymbol property for nominal typing
  // =========================================================================
  it("Machine has MachineBrandSymbol at type level (runtime is frozen config)", () => {
    const machine = createTestMachine();
    // Brand exists at type level only. At runtime, the machine object is a frozen config.
    // We verify it has the expected runtime shape.
    expect(machine).toHaveProperty("id");
    expect(machine).toHaveProperty("initial");
    expect(machine).toHaveProperty("states");
    expect(machine).toHaveProperty("context");
  });

  // =========================================================================
  // Test 2: Machine is deeply frozen after creation
  // =========================================================================
  it("Machine is deeply frozen after creation", () => {
    const machine = createTestMachine();

    expect(Object.isFrozen(machine)).toBe(true);
    expect(Object.isFrozen(machine.states)).toBe(true);
    expect(Object.isFrozen(machine.states.idle)).toBe(true);
    expect(Object.isFrozen(machine.states.idle.on)).toBe(true);
    expect(Object.isFrozen(machine.context)).toBe(true);
  });

  // =========================================================================
  // Test 3: Machine id matches the config id
  // =========================================================================
  it("Machine id matches the config id", () => {
    const machine = createTestMachine();
    expect(machine.id).toBe("test-machine");
  });

  // =========================================================================
  // Test 4: Machine initial matches the explicit initial
  // =========================================================================
  it("Machine initial matches the explicit initial", () => {
    const machine = createTestMachine();
    expect(machine.initial).toBe("idle");
  });

  // =========================================================================
  // Test 5: Machine states record contains all declared state names
  // =========================================================================
  it("Machine states record contains all declared state names", () => {
    const machine = createTestMachine();
    const stateNames = Object.keys(machine.states);
    expect(stateNames).toContain("idle");
    expect(stateNames).toContain("active");
    expect(stateNames).toContain("done");
    expect(stateNames).toHaveLength(3);
  });

  // =========================================================================
  // Test 6: Machine context holds the initial context value
  // =========================================================================
  it("Machine context holds the initial context value", () => {
    const machine = createTestMachine();
    expect(machine.context).toEqual({ count: 0, data: null });
  });

  // =========================================================================
  // Test 7: StateNode has entry, exit, and on properties
  // =========================================================================
  it("StateNode has entry, exit, and on properties", () => {
    const machine = createTestMachine();
    const idleNode = machine.states.idle;

    expect(idleNode).toHaveProperty("entry");
    expect(idleNode).toHaveProperty("exit");
    expect(idleNode).toHaveProperty("on");
    expect(Array.isArray(idleNode.entry)).toBe(true);
    expect(Array.isArray(idleNode.exit)).toBe(true);
    expect(typeof idleNode.on).toBe("object");
  });

  // =========================================================================
  // Test 8: Event factory creates a frozen event with type property
  // =========================================================================
  it("Event factory creates a frozen event with type property", () => {
    const createReset = event<"RESET">("RESET");
    const resetEvent = createReset();

    expect(Object.isFrozen(resetEvent)).toBe(true);
    expect(resetEvent.type).toBe("RESET");
  });

  // =========================================================================
  // Test 9: Event with payload includes payload field
  // =========================================================================
  it("Event with payload includes payload field", () => {
    const createSubmit = event<"SUBMIT", { formId: string }>("SUBMIT");
    const submitEvent = createSubmit({ formId: "login" });

    expect(submitEvent.type).toBe("SUBMIT");
    expect(submitEvent.payload).toEqual({ formId: "login" });
  });

  // =========================================================================
  // Test 10: Event without payload has no payload field
  // =========================================================================
  it("Event without payload has no payload field", () => {
    const createReset = event<"RESET">("RESET");
    const resetEvent = createReset();

    expect(resetEvent.type).toBe("RESET");
    expect("payload" in resetEvent).toBe(false);
  });

  // =========================================================================
  // Test 11: Event has EventBrandSymbol for nominal typing (type-level)
  // =========================================================================
  it("Event brand exists at type level (runtime is frozen object)", () => {
    const createFetch = event<"FETCH">("FETCH");
    const fetchEvent = createFetch();

    // Brand exists only at type level. Runtime object has type property.
    expect(Object.isFrozen(fetchEvent)).toBe(true);
    expect(fetchEvent.type).toBe("FETCH");
  });

  // =========================================================================
  // Test 12: State factory creates a frozen state with name property
  // =========================================================================
  it("State factory creates a frozen state with name property", () => {
    const createIdle = state<"idle">("idle");
    const idleState = createIdle();

    expect(Object.isFrozen(idleState)).toBe(true);
    expect(idleState.name).toBe("idle");
  });

  // =========================================================================
  // Test 13: State has StateBrandSymbol for nominal typing (type-level)
  // =========================================================================
  it("State brand exists at type level (runtime is frozen object)", () => {
    const createLoading = state<"loading", { progress: number }>("loading");
    const loadingState = createLoading({ progress: 50 });

    expect(Object.isFrozen(loadingState)).toBe(true);
    expect(loadingState.name).toBe("loading");
    expect(loadingState.context).toEqual({ progress: 50 });
  });

  // =========================================================================
  // Test 14: Snapshot contains state, context, and activities
  // =========================================================================
  it("Snapshot contains state, context, and activities", () => {
    const machine = createTestMachine();
    const activityManager = createActivityManager();
    const executor = createBasicExecutor();
    const runner = createMachineRunner(machine, { executor, activityManager });

    const snapshot = runner.snapshot();
    expect(snapshot).toHaveProperty("state");
    expect(snapshot).toHaveProperty("context");
    expect(snapshot).toHaveProperty("activities");
    expect(snapshot.state).toBe("idle");
    expect(snapshot.context).toEqual({ count: 0, data: null });
    expect(Array.isArray(snapshot.activities)).toBe(true);
  });

  // =========================================================================
  // Test 15: Snapshot is frozen
  // =========================================================================
  it("Snapshot is frozen", () => {
    const machine = createTestMachine();
    const activityManager = createActivityManager();
    const executor = createBasicExecutor();
    const runner = createMachineRunner(machine, { executor, activityManager });

    const snapshot = runner.snapshot();
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  // =========================================================================
  // Test 16: Guard function receives context and event, returns boolean
  // =========================================================================
  it("Guard function receives context and event, returns boolean", () => {
    const machine = defineMachine({
      id: "guard-test",
      initial: "idle",
      context: { count: 5 },
      states: {
        idle: {
          on: {
            GO: [
              {
                target: "high",
                guard: (ctx: { count: number }) => ctx.count > 3,
              },
              { target: "low" },
            ],
          },
        },
        high: { on: {} },
        low: { on: {} },
      },
    });

    // With count=5, guard should pass -> go to "high"
    const result = transition("idle", { count: 5 }, { type: "GO" }, machine);
    expect(result.transitioned).toBe(true);
    expect(result.newState).toBe("high");

    // With count=1, guard should fail -> fallback to "low"
    const result2 = transition("idle", { count: 1 }, { type: "GO" }, machine);
    expect(result2.transitioned).toBe(true);
    expect(result2.newState).toBe("low");
  });

  // =========================================================================
  // Test 17: Action function receives context and event, returns new context
  // =========================================================================
  it("Action function receives context and event, returns new context", () => {
    const machine = defineMachine({
      id: "action-test",
      initial: "idle",
      context: { count: 0 },
      states: {
        idle: {
          on: {
            ADD: {
              target: "idle",
              actions: [
                (ctx: { count: number }, evt: { type: "ADD"; amount: number }) => ({
                  count: ctx.count + evt.amount,
                }),
              ],
            },
          },
        },
      },
    });

    // Assign to a variable to avoid excess property check on object literal
    const addEvent = { type: "ADD", amount: 5 };
    const result = transition("idle", { count: 10 }, addEvent, machine);
    expect(result.transitioned).toBe(true);
    expect(result.newContext).toEqual({ count: 15 });
  });

  // =========================================================================
  // Test 18: Transition with guard evaluates guard predicate
  // =========================================================================
  it("Transition with guard evaluates guard predicate", () => {
    const machine = defineMachine({
      id: "guard-eval",
      initial: "idle",
      context: { allowed: false },
      states: {
        idle: {
          on: {
            TRY: {
              target: "active",
              guard: (ctx: { allowed: boolean }) => ctx.allowed,
            },
          },
        },
        active: { on: {} },
      },
    });

    // Guard blocks
    const blocked = transition("idle", { allowed: false }, { type: "TRY" }, machine);
    expect(blocked.transitioned).toBe(false);

    // Guard passes
    const passed = transition("idle", { allowed: true }, { type: "TRY" }, machine);
    expect(passed.transitioned).toBe(true);
    expect(passed.newState).toBe("active");
  });
});
