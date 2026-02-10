/**
 * DoD 3: States & Guards (Spec Section 04) - Unit Tests
 *
 * These tests verify:
 * 1. State with type: 'atomic' is default when type is omitted
 * 2. State with type: 'final' has no outgoing transitions
 * 3. Self-transition fires exit and entry effects
 * 4. Guard returning true allows transition
 * 5. Guard returning false blocks transition
 * 6. Multiple guarded transitions: first passing guard wins
 * 7. Transition without guard is always taken (fallback)
 * 8. Actions execute in array order, threading context
 * 9. Effect ordering: exit -> transition -> entry
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { defineMachine, Effect, transition, guard, and, or, not } from "../src/index.js";

// =============================================================================
// DoD 3: States & Guards Tests
// =============================================================================

describe("DoD 3: States & Guards", () => {
  // =========================================================================
  // Test 1: State with type: 'atomic' is the default when type is omitted
  // =========================================================================
  it("State with type: 'atomic' is the default when type is omitted", () => {
    // States without explicit type field are atomic by default
    const machine = defineMachine({
      id: "atomic-default",
      initial: "idle",
      context: undefined,
      states: {
        idle: {
          on: { GO: { target: "active" } },
        },
        active: { on: {} },
      },
    });

    // Atomic states accept events and transition normally
    const result = transition("idle", undefined, { type: "GO" }, machine);
    expect(result.transitioned).toBe(true);
    expect(result.newState).toBe("active");
  });

  // =========================================================================
  // Test 2: State with type: 'final' has no outgoing transitions
  // =========================================================================
  it("State with empty on: {} has no outgoing transitions (final)", () => {
    const machine = defineMachine({
      id: "final-test",
      initial: "running",
      context: undefined,
      states: {
        running: {
          on: { DONE: { target: "completed" } },
        },
        completed: {
          on: {},
        },
      },
    });

    // Cannot transition out of final state
    const result = transition("completed", undefined, { type: "DONE" }, machine);
    expect(result.transitioned).toBe(false);
    expect(result.newState).toBeUndefined();
    expect(result.effects).toHaveLength(0);
  });

  // =========================================================================
  // Test 3: Self-transition fires exit and entry effects
  // =========================================================================
  it("Self-transition fires exit and entry effects", () => {
    const exitEffect = Effect.delay(10);
    const entryEffect = Effect.delay(20);
    const transitionEffect = Effect.delay(30);

    const machine = defineMachine({
      id: "self-transition",
      initial: "idle",
      context: { count: 0 },
      states: {
        idle: {
          entry: [entryEffect],
          exit: [exitEffect],
          on: {
            REFRESH: {
              target: "idle",
              effects: [transitionEffect],
              actions: [(ctx: { count: number }) => ({ count: ctx.count + 1 })],
            },
          },
        },
      },
    });

    const result = transition("idle", { count: 0 }, { type: "REFRESH" }, machine);
    expect(result.transitioned).toBe(true);
    expect(result.newState).toBe("idle");
    expect(result.newContext).toEqual({ count: 1 });

    // Effects should be: exit(idle) + transition + entry(idle)
    expect(result.effects).toHaveLength(3);
    expect(result.effects[0]).toBe(exitEffect);
    expect(result.effects[1]).toBe(transitionEffect);
    expect(result.effects[2]).toBe(entryEffect);
  });

  // =========================================================================
  // Test 4: Guard returning true allows transition
  // =========================================================================
  it("Guard returning true allows transition", () => {
    const machine = defineMachine({
      id: "guard-true",
      initial: "idle",
      context: { enabled: true },
      states: {
        idle: {
          on: {
            GO: {
              target: "active",
              guard: (ctx: { enabled: boolean }) => ctx.enabled,
            },
          },
        },
        active: { on: {} },
      },
    });

    const result = transition("idle", { enabled: true }, { type: "GO" }, machine);
    expect(result.transitioned).toBe(true);
    expect(result.newState).toBe("active");
  });

  // =========================================================================
  // Test 5: Guard returning false blocks transition
  // =========================================================================
  it("Guard returning false blocks transition", () => {
    const machine = defineMachine({
      id: "guard-false",
      initial: "idle",
      context: { enabled: false },
      states: {
        idle: {
          on: {
            GO: {
              target: "active",
              guard: (ctx: { enabled: boolean }) => ctx.enabled,
            },
          },
        },
        active: { on: {} },
      },
    });

    const result = transition("idle", { enabled: false }, { type: "GO" }, machine);
    expect(result.transitioned).toBe(false);
    expect(result.newState).toBeUndefined();
  });

  // =========================================================================
  // Test 6: Multiple guarded transitions: first passing guard wins
  // =========================================================================
  it("Multiple guarded transitions: first passing guard wins", () => {
    const machine = defineMachine({
      id: "multi-guard",
      initial: "idle",
      context: { score: 75 },
      states: {
        idle: {
          on: {
            EVALUATE: [
              {
                target: "excellent",
                guard: (ctx: { score: number }) => ctx.score >= 90,
              },
              {
                target: "good",
                guard: (ctx: { score: number }) => ctx.score >= 70,
              },
              {
                target: "poor",
              },
            ],
          },
        },
        excellent: { on: {} },
        good: { on: {} },
        poor: { on: {} },
      },
    });

    // Score 75 -> first guard (>=90) fails, second guard (>=70) passes
    const result1 = transition("idle", { score: 75 }, { type: "EVALUATE" }, machine);
    expect(result1.newState).toBe("good");

    // Score 95 -> first guard (>=90) passes
    const result2 = transition("idle", { score: 95 }, { type: "EVALUATE" }, machine);
    expect(result2.newState).toBe("excellent");

    // Score 50 -> all guards fail, fallback (no guard) taken
    const result3 = transition("idle", { score: 50 }, { type: "EVALUATE" }, machine);
    expect(result3.newState).toBe("poor");
  });

  // =========================================================================
  // Test 7: Transition without guard is always taken (fallback)
  // =========================================================================
  it("Transition without guard is always taken (fallback)", () => {
    const machine = defineMachine({
      id: "no-guard-fallback",
      initial: "idle",
      context: undefined,
      states: {
        idle: {
          on: {
            GO: { target: "active" }, // No guard - always taken
          },
        },
        active: { on: {} },
      },
    });

    const result = transition("idle", undefined, { type: "GO" }, machine);
    expect(result.transitioned).toBe(true);
    expect(result.newState).toBe("active");
  });

  // =========================================================================
  // Test 8: Actions execute in array order, threading context
  // =========================================================================
  it("Actions execute in array order, threading context", () => {
    const machine = defineMachine({
      id: "action-threading",
      initial: "idle",
      context: { value: 0 },
      states: {
        idle: {
          on: {
            COMPUTE: {
              target: "idle",
              actions: [
                // Action 1: add 10
                (ctx: { value: number }) => ({ value: ctx.value + 10 }),
                // Action 2: multiply by 2
                (ctx: { value: number }) => ({ value: ctx.value * 2 }),
                // Action 3: subtract 5
                (ctx: { value: number }) => ({ value: ctx.value - 5 }),
              ],
            },
          },
        },
      },
    });

    // Starting with 0: (0+10) = 10, (10*2) = 20, (20-5) = 15
    const result = transition("idle", { value: 0 }, { type: "COMPUTE" }, machine);
    expect(result.newContext).toEqual({ value: 15 });

    // Starting with 5: (5+10) = 15, (15*2) = 30, (30-5) = 25
    const result2 = transition("idle", { value: 5 }, { type: "COMPUTE" }, machine);
    expect(result2.newContext).toEqual({ value: 25 });
  });

  // =========================================================================
  // Test 9: Effect ordering: exit -> transition -> entry
  // =========================================================================
  it("Effect ordering: exit -> transition -> entry", () => {
    const exitEffect = Effect.delay(1);
    const transitionEffect = Effect.delay(2);
    const entryEffect = Effect.delay(3);

    const machine = defineMachine({
      id: "effect-ordering",
      initial: "a",
      context: undefined,
      states: {
        a: {
          exit: [exitEffect],
          on: {
            GO: {
              target: "b",
              effects: [transitionEffect],
            },
          },
        },
        b: {
          entry: [entryEffect],
          on: {},
        },
      },
    });

    const result = transition("a", undefined, { type: "GO" }, machine);
    expect(result.transitioned).toBe(true);
    expect(result.effects).toHaveLength(3);

    // Order must be: exit(a) -> transition -> entry(b)
    expect(result.effects[0]).toBe(exitEffect);
    expect(result.effects[1]).toBe(transitionEffect);
    expect(result.effects[2]).toBe(entryEffect);
  });

  // =========================================================================
  // Test 10: Guard receives both context and event
  // =========================================================================
  it("Guard receives both context and event", () => {
    const machine = defineMachine({
      id: "guard-context-event",
      initial: "idle",
      context: { threshold: 10 },
      states: {
        idle: {
          on: {
            CHECK: {
              target: "passed",
              guard: (ctx: { threshold: number }, evt: { type: "CHECK"; value: number }) =>
                evt.value > ctx.threshold,
            },
          },
        },
        passed: { on: {} },
      },
    });

    // Event value (15) > context threshold (10) -> passes
    // Assign to a variable to avoid excess property check on object literal
    const checkHigh = { type: "CHECK", value: 15 };
    const result1 = transition("idle", { threshold: 10 }, checkHigh, machine);
    expect(result1.transitioned).toBe(true);

    // Event value (5) <= context threshold (10) -> blocked
    const checkLow = { type: "CHECK", value: 5 };
    const result2 = transition("idle", { threshold: 10 }, checkLow, machine);
    expect(result2.transitioned).toBe(false);
  });

  // =========================================================================
  // Test 11: Action receives both context and event
  // =========================================================================
  it("Action receives both context and event", () => {
    const machine = defineMachine({
      id: "action-context-event",
      initial: "idle",
      context: { items: [] as readonly string[] },
      states: {
        idle: {
          on: {
            ADD: {
              target: "idle",
              actions: [
                (ctx: { items: readonly string[] }, evt: { type: "ADD"; item: string }) => ({
                  items: [...ctx.items, evt.item],
                }),
              ],
            },
          },
        },
      },
    });

    // Assign to a variable to avoid excess property check on object literal
    const addEvent = { type: "ADD", item: "c" };
    const result = transition("idle", { items: ["a", "b"] }, addEvent, machine);
    expect(result.newContext).toEqual({ items: ["a", "b", "c"] });
  });

  // =========================================================================
  // Test 12: Unrecognized event does not cause transition
  // =========================================================================
  it("Unrecognized event does not cause transition", () => {
    const machine = defineMachine({
      id: "unrecognized-event",
      initial: "idle",
      context: undefined,
      states: {
        idle: {
          on: {
            GO: { target: "active" },
          },
        },
        active: { on: {} },
      },
    });

    const result = transition("idle", undefined, { type: "UNKNOWN" }, machine);
    expect(result.transitioned).toBe(false);
    expect(result.newState).toBeUndefined();
  });

  // =========================================================================
  // Test 13: Multiple exit effects from current state
  // =========================================================================
  it("Multiple exit effects from current state are all collected", () => {
    const exit1 = Effect.delay(1);
    const exit2 = Effect.delay(2);

    const machine = defineMachine({
      id: "multi-exit",
      initial: "a",
      context: undefined,
      states: {
        a: {
          exit: [exit1, exit2],
          on: {
            GO: { target: "b" },
          },
        },
        b: { on: {} },
      },
    });

    const result = transition("a", undefined, { type: "GO" }, machine);
    expect(result.effects[0]).toBe(exit1);
    expect(result.effects[1]).toBe(exit2);
  });

  // =========================================================================
  // Test 14: Transition with no effects produces empty effects array
  // =========================================================================
  it("Transition with no effects produces empty effects array", () => {
    const machine = defineMachine({
      id: "no-effects",
      initial: "a",
      context: undefined,
      states: {
        a: { on: { GO: { target: "b" } } },
        b: { on: {} },
      },
    });

    const result = transition("a", undefined, { type: "GO" }, machine);
    expect(result.transitioned).toBe(true);
    expect(result.effects).toHaveLength(0);
  });

  // =========================================================================
  // Test 15: Named guards carry guardName
  // =========================================================================
  it("Named guards carry guardName property", () => {
    const canRetry = guard("canRetry", (ctx: { retries: number }) => ctx.retries < 3);

    expect(canRetry.guardName).toBe("canRetry");
    expect(canRetry({ retries: 1 }, {})).toBe(true);
    expect(canRetry({ retries: 5 }, {})).toBe(false);
  });

  // =========================================================================
  // Test 16: Named guards work in machine transitions
  // =========================================================================
  it("Named guards work in machine transitions", () => {
    const canRetry = guard("canRetry", (ctx: { retries: number }) => ctx.retries < 3);

    const machine = defineMachine({
      id: "named-guard-machine",
      initial: "error",
      context: { retries: 0 },
      states: {
        error: {
          on: {
            RETRY: {
              target: "loading",
              guard: canRetry,
            },
          },
        },
        loading: { on: {} },
      },
    });

    const result = transition("error", { retries: 1 }, { type: "RETRY" }, machine);
    expect(result.transitioned).toBe(true);

    const result2 = transition("error", { retries: 5 }, { type: "RETRY" }, machine);
    expect(result2.transitioned).toBe(false);
  });

  // =========================================================================
  // Test 17: Guard combinator - and()
  // =========================================================================
  it("Guard combinator and() requires both guards to pass", () => {
    const isAdmin = guard("isAdmin", (ctx: { role: string }) => ctx.role === "admin");
    const isActive = guard("isActive", (ctx: { active: boolean }) => ctx.active);

    type Ctx = { role: string; active: boolean };
    const canAccess = and<Ctx, unknown>(isAdmin, isActive);

    expect(canAccess.guardName).toBe("and(isAdmin, isActive)");
    expect(canAccess({ role: "admin", active: true }, {})).toBe(true);
    expect(canAccess({ role: "admin", active: false }, {})).toBe(false);
    expect(canAccess({ role: "user", active: true }, {})).toBe(false);
  });

  // =========================================================================
  // Test 18: Guard combinator - or()
  // =========================================================================
  it("Guard combinator or() requires either guard to pass", () => {
    const isAdmin = guard("isAdmin", (ctx: { role: string }) => ctx.role === "admin");
    const isOwner = guard("isOwner", (ctx: { isOwner: boolean }) => ctx.isOwner);

    type Ctx = { role: string; isOwner: boolean };
    const canEdit = or<Ctx, unknown>(isAdmin, isOwner);

    expect(canEdit.guardName).toBe("or(isAdmin, isOwner)");
    expect(canEdit({ role: "admin", isOwner: false }, {})).toBe(true);
    expect(canEdit({ role: "user", isOwner: true }, {})).toBe(true);
    expect(canEdit({ role: "user", isOwner: false }, {})).toBe(false);
  });

  // =========================================================================
  // Test 19: Guard combinator - not()
  // =========================================================================
  it("Guard combinator not() negates a guard", () => {
    const isLocked = guard("isLocked", (ctx: { locked: boolean }) => ctx.locked);
    const isUnlocked = not(isLocked);

    expect(isUnlocked.guardName).toBe("not(isLocked)");
    expect(isUnlocked({ locked: false }, {})).toBe(true);
    expect(isUnlocked({ locked: true }, {})).toBe(false);
  });

  // =========================================================================
  // Test 20: Nested guard combinators
  // =========================================================================
  it("Nested guard combinators compose correctly", () => {
    type Ctx = { role: string; active: boolean; level: number };

    const isAdmin = guard("isAdmin", (ctx: Ctx) => ctx.role === "admin");
    const isActive = guard("isActive", (ctx: Ctx) => ctx.active);
    const isHighLevel = guard("isHighLevel", (ctx: Ctx) => ctx.level >= 5);

    // (isAdmin AND isActive) OR isHighLevel
    const canAccess = or(and<Ctx, unknown>(isAdmin, isActive), isHighLevel);

    expect(canAccess.guardName).toBe("or(and(isAdmin, isActive), isHighLevel)");
    expect(canAccess({ role: "admin", active: true, level: 1 }, {})).toBe(true);
    expect(canAccess({ role: "user", active: true, level: 7 }, {})).toBe(true);
    expect(canAccess({ role: "user", active: false, level: 2 }, {})).toBe(false);
  });

  // =========================================================================
  // Test 21: Internal transitions skip entry/exit effects
  // =========================================================================
  it("Internal transitions skip entry and exit effects", () => {
    const exitEffect = Effect.delay(10);
    const entryEffect = Effect.delay(20);
    const transitionEffect = Effect.delay(30);

    const machine = defineMachine({
      id: "internal-transition",
      initial: "active",
      context: { count: 0 },
      states: {
        active: {
          entry: [entryEffect],
          exit: [exitEffect],
          on: {
            INCREMENT: {
              target: "active",
              internal: true,
              effects: [transitionEffect],
              actions: [(ctx: { count: number }) => ({ count: ctx.count + 1 })],
            },
          },
        },
      },
    });

    const result = transition("active", { count: 0 }, { type: "INCREMENT" }, machine);
    expect(result.transitioned).toBe(true);
    expect(result.newState).toBe("active");
    expect(result.newContext).toEqual({ count: 1 });

    // Internal transition: only transition effects, no exit/entry
    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]).toBe(transitionEffect);
  });

  // =========================================================================
  // Test 22: Always transitions are followed automatically
  // =========================================================================
  it("Always transitions are followed after entering a state", () => {
    const machine = defineMachine({
      id: "always-test",
      initial: "idle",
      context: { role: "admin" },
      states: {
        idle: {
          on: { CHECK: { target: "checking" } },
        },
        checking: {
          always: [
            {
              target: "authorized",
              guard: (ctx: { role: string }) => ctx.role === "admin",
            },
            { target: "unauthorized" },
          ],
        },
        authorized: { on: {} },
        unauthorized: { on: {} },
      },
    });

    // Admin should go through checking -> authorized
    const result = transition("idle", { role: "admin" }, { type: "CHECK" }, machine);
    expect(result.transitioned).toBe(true);
    expect(result.newState).toBe("authorized");

    // Non-admin should go through checking -> unauthorized
    const result2 = transition("idle", { role: "user" }, { type: "CHECK" }, machine);
    expect(result2.transitioned).toBe(true);
    expect(result2.newState).toBe("unauthorized");
  });

  // =========================================================================
  // Test 23: Always transitions chain through multiple states
  // =========================================================================
  it("Always transitions chain through multiple transient states", () => {
    const machine = defineMachine({
      id: "always-chain",
      initial: "start",
      context: { level: 3 },
      states: {
        start: {
          on: { GO: { target: "check1" } },
        },
        check1: {
          always: { target: "check2" },
        },
        check2: {
          always: [
            {
              target: "high",
              guard: (ctx: { level: number }) => ctx.level > 5,
            },
            { target: "low" },
          ],
        },
        high: { on: {} },
        low: { on: {} },
      },
    });

    const result = transition("start", { level: 3 }, { type: "GO" }, machine);
    expect(result.transitioned).toBe(true);
    expect(result.newState).toBe("low");

    const result2 = transition("start", { level: 7 }, { type: "GO" }, machine);
    expect(result2.transitioned).toBe(true);
    expect(result2.newState).toBe("high");
  });

  // =========================================================================
  // Test 24: Always transitions accumulate effects
  // =========================================================================
  it("Always transitions accumulate effects from all traversed states", () => {
    const transEffect = Effect.delay(1);
    const checkEntry = Effect.delay(2);
    const checkExit = Effect.delay(3);
    const finalEntry = Effect.delay(4);

    const machine = defineMachine({
      id: "always-effects",
      initial: "start",
      context: undefined,
      states: {
        start: {
          on: {
            GO: {
              target: "checking",
              effects: [transEffect],
            },
          },
        },
        checking: {
          entry: [checkEntry],
          exit: [checkExit],
          always: { target: "done" },
        },
        done: {
          entry: [finalEntry],
          on: {},
        },
      },
    });

    const result = transition("start", undefined, { type: "GO" }, machine);
    expect(result.transitioned).toBe(true);
    expect(result.newState).toBe("done");

    // Effects: transition(GO) + entry(checking) + exit(checking) + entry(done)
    expect(result.effects).toHaveLength(4);
    expect(result.effects[0]).toBe(transEffect);
    expect(result.effects[1]).toBe(checkEntry);
    expect(result.effects[2]).toBe(checkExit);
    expect(result.effects[3]).toBe(finalEntry);
  });

  // =========================================================================
  // Test 25: External self-transition includes entry/exit effects
  // =========================================================================
  it("External self-transition (default) includes entry and exit effects", () => {
    const exitEffect = Effect.delay(10);
    const entryEffect = Effect.delay(20);
    const transitionEffect = Effect.delay(30);

    const machine = defineMachine({
      id: "external-self-transition",
      initial: "active",
      context: { count: 0 },
      states: {
        active: {
          entry: [entryEffect],
          exit: [exitEffect],
          on: {
            INCREMENT: {
              target: "active",
              // internal not set -> defaults to external
              effects: [transitionEffect],
              actions: [(ctx: { count: number }) => ({ count: ctx.count + 1 })],
            },
          },
        },
      },
    });

    const result = transition("active", { count: 0 }, { type: "INCREMENT" }, machine);
    expect(result.transitioned).toBe(true);

    // External: exit + transition + entry
    expect(result.effects).toHaveLength(3);
    expect(result.effects[0]).toBe(exitEffect);
    expect(result.effects[1]).toBe(transitionEffect);
    expect(result.effects[2]).toBe(entryEffect);
  });
});
