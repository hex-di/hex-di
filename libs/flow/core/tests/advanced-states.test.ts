/**
 * Advanced States Tests - Phase A (Compound States)
 *
 * DoD 8: Tests covering compound state support including:
 * - Compound state creation and auto-entry
 * - Event bubbling through hierarchy
 * - onDone transitions for final child states
 * - #id absolute state references
 * - stateValue, matches(), can() on snapshots
 * - Exit/entry effect ordering for compound transitions
 * - Active state path computation
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { expectOk } from "@hex-di/result-testing";
import { defineMachine } from "../src/machine/define-machine.js";
import { Effect } from "../src/effects/constructors.js";
import {
  transition,
  transitionSafe,
  computeInitialPath,
  canTransition,
  createMachineRunner,
  type EffectExecutor,
} from "../src/runner/index.js";
import { createActivityManager } from "../src/activities/index.js";

// =============================================================================
// Test Helpers
// =============================================================================

function noopExecutor(): EffectExecutor {
  return {
    execute() {
      return ResultAsync.ok(undefined);
    },
  };
}

// Marker effects for tracking entry/exit ordering
const entryEffect = (name: string) => Effect.delay(name.length);
const exitEffect = (name: string) => Effect.delay(name.length * 10);
const _transitionEffect = () => Effect.delay(999);

// =============================================================================
// DoD 8.1: Compound state with type: 'compound' and nested states
// =============================================================================

describe("DoD 8.1: Compound state with type: compound and nested states", () => {
  it("creates a machine with compound states", () => {
    const machine = defineMachine({
      id: "compound-basic",
      initial: "active",
      states: {
        active: {
          type: "compound",
          initial: "idle",
          states: {
            idle: {
              on: { START: { target: "running" } },
            },
            running: {
              on: { STOP: { target: "idle" } },
            },
          },
          on: { CANCEL: { target: "cancelled" } },
        },
        cancelled: {},
      },
    });

    expect(machine.id).toBe("compound-basic");
    expect(machine.initial).toBe("active");
  });
});

// =============================================================================
// DoD 8.2: Entering a compound state automatically enters initial child
// =============================================================================

describe("DoD 8.2: Entering a compound state automatically enters initial child", () => {
  it("auto-enters initial child on machine creation", () => {
    const machine = defineMachine({
      id: "auto-enter",
      initial: "active",
      states: {
        active: {
          type: "compound",
          initial: "idle",
          states: {
            idle: { on: {} },
            running: { on: {} },
          },
          on: {},
        },
      },
    });

    const path = computeInitialPath(machine);
    expect(path).toEqual(["active", "idle"]);
  });

  it("auto-enters nested compound states recursively", () => {
    const machine = defineMachine({
      id: "deep-auto-enter",
      initial: "outer",
      states: {
        outer: {
          type: "compound",
          initial: "inner",
          states: {
            inner: {
              type: "compound",
              initial: "leaf",
              states: {
                leaf: { on: {} },
              },
              on: {},
            },
          },
          on: {},
        },
      },
    });

    const path = computeInitialPath(machine);
    expect(path).toEqual(["outer", "inner", "leaf"]);
  });

  it("auto-enters initial child when transitioning into a compound state", () => {
    const machine = defineMachine({
      id: "enter-compound",
      initial: "idle",
      states: {
        idle: { on: { GO: { target: "active" } } },
        active: {
          type: "compound",
          initial: "loading",
          states: {
            loading: { on: {} },
            ready: { on: {} },
          },
          on: {},
        },
      },
    });

    const result = transition("idle", undefined, { type: "GO" }, machine);
    expect(result.transitioned).toBe(true);
    expect(result.newStatePath).toEqual(["active", "loading"]);
    expect(result.newState).toBe("active");
  });
});

// =============================================================================
// DoD 8.3: Exiting a compound state exits the active child first (bottom-up)
// =============================================================================

describe("DoD 8.3: Exiting a compound state exits the active child first (bottom-up)", () => {
  it("fires exit effects bottom-up when leaving compound state", () => {
    const machine = defineMachine({
      id: "exit-order",
      initial: "active",
      states: {
        active: {
          type: "compound",
          initial: "child",
          exit: [exitEffect("active")],
          states: {
            child: {
              exit: [exitEffect("child")],
              on: {},
            },
          },
          on: { LEAVE: { target: "done" } },
        },
        done: {},
      },
    });

    // Start in ['active', 'child'], send LEAVE to go to 'done'
    const result = transition(["active", "child"], undefined, { type: "LEAVE" }, machine);
    expect(result.transitioned).toBe(true);
    expect(result.newStatePath).toEqual(["done"]);

    // Exit effects should be child first, then parent (bottom-up)
    expect(result.effects.length).toBeGreaterThanOrEqual(2);
    // child exit (length * 10 = 50) should come before active exit (length * 10 = 60)
    expect(result.effects[0]).toEqual(exitEffect("child"));
    expect(result.effects[1]).toEqual(exitEffect("active"));
  });
});

// =============================================================================
// DoD 8.4: Child state transitions target siblings within compound
// =============================================================================

describe("DoD 8.4: Child state transitions target siblings within compound", () => {
  it("transitions between sibling states within a compound", () => {
    const machine = defineMachine({
      id: "sibling-transition",
      initial: "active",
      states: {
        active: {
          type: "compound",
          initial: "idle",
          states: {
            idle: { on: { START: { target: "running" } } },
            running: { on: { STOP: { target: "idle" } } },
          },
          on: {},
        },
      },
    });

    const result = transition(["active", "idle"], undefined, { type: "START" }, machine);
    expect(result.transitioned).toBe(true);
    expect(result.newStatePath).toEqual(["active", "running"]);
  });
});

// =============================================================================
// DoD 8.5: onDone transition fires when a child reaches final state
// =============================================================================

describe("DoD 8.5: onDone transition fires when a child reaches final state", () => {
  it("fires onDone when child transitions to a final state", () => {
    const machine = defineMachine({
      id: "ondone-test",
      initial: "wizard",
      states: {
        wizard: {
          type: "compound",
          initial: "step1",
          onDone: { target: "complete" },
          states: {
            step1: { on: { NEXT: { target: "step2" } } },
            step2: { on: { FINISH: { target: "done" } } },
            done: { type: "final" },
          },
          on: {},
        },
        complete: {},
      },
    });

    // Go through the wizard
    const r1 = transition(["wizard", "step1"], undefined, { type: "NEXT" }, machine);
    expect(r1.newStatePath).toEqual(["wizard", "step2"]);

    // Finishing goes to done (final), which triggers onDone -> complete
    const r2 = transition(["wizard", "step2"], undefined, { type: "FINISH" }, machine);
    expect(r2.transitioned).toBe(true);
    expect(r2.newStatePath).toEqual(["complete"]);
  });
});

// =============================================================================
// DoD 8.6: Event bubbling: unhandled event propagates from child to parent
// =============================================================================

describe("DoD 8.6: Event bubbling: unhandled event propagates from child to parent", () => {
  it("bubbles unhandled events from child to parent compound state", () => {
    const machine = defineMachine({
      id: "bubble-test",
      initial: "active",
      states: {
        active: {
          type: "compound",
          initial: "idle",
          states: {
            idle: {
              on: { START: { target: "running" } },
            },
            running: {
              on: {},
            },
          },
          on: { CANCEL: { target: "cancelled" } },
        },
        cancelled: {},
      },
    });

    // CANCEL is not handled by 'running' child, should bubble to 'active' parent
    const result = transition(["active", "running"], undefined, { type: "CANCEL" }, machine);
    expect(result.transitioned).toBe(true);
    expect(result.newStatePath).toEqual(["cancelled"]);
  });
});

// =============================================================================
// DoD 8.7: Event bubbling: first matching handler at deepest level wins
// =============================================================================

describe("DoD 8.7: Event bubbling: first matching handler at deepest level wins", () => {
  it("child handler takes precedence over parent for same event", () => {
    const machine = defineMachine({
      id: "deepest-wins",
      initial: "outer",
      states: {
        outer: {
          type: "compound",
          initial: "inner",
          states: {
            inner: {
              on: { ACT: { target: "innerResult" } },
            },
            innerResult: { on: {} },
          },
          // Parent also handles ACT, but child should win
          on: { ACT: { target: "outerResult" } },
        },
        outerResult: {},
      },
    });

    const result = transition(["outer", "inner"], undefined, { type: "ACT" }, machine);
    expect(result.transitioned).toBe(true);
    // Child handler should win — target is sibling 'innerResult' within outer
    expect(result.newStatePath).toEqual(["outer", "innerResult"]);
  });
});

// =============================================================================
// DoD 8.8: Event bubbling stops at root if no match found
// =============================================================================

describe("DoD 8.8: Event bubbling stops at root if no match found", () => {
  it("returns no-transition when event is not handled anywhere", () => {
    const machine = defineMachine({
      id: "no-bubble-match",
      initial: "active",
      states: {
        active: {
          type: "compound",
          initial: "idle",
          states: {
            idle: { on: {} },
          },
          on: {},
        },
      },
    });

    const result = transition(["active", "idle"], undefined, { type: "UNKNOWN" }, machine);
    expect(result.transitioned).toBe(false);
    expect(result.newState).toBeUndefined();
  });
});

// =============================================================================
// DoD 8.9: #id state reference targets state outside compound
// =============================================================================

describe("DoD 8.9: #id state reference targets state outside compound", () => {
  it("resolves #id target to state with matching id property", () => {
    const machine = defineMachine({
      id: "id-ref-test",
      initial: "main",
      states: {
        main: {
          type: "compound",
          initial: "working",
          states: {
            working: {
              on: { ABORT: { target: "#root.error" } },
            },
          },
          on: {},
        },
        error: {
          id: "errorState",
          on: {},
        },
      },
    });

    const result = transition(["main", "working"], undefined, { type: "ABORT" }, machine);
    expect(result.transitioned).toBe(true);
    expect(result.newStatePath).toEqual(["error"]);
  });
});

// =============================================================================
// DoD 8.10: Relative target resolves within same compound state
// =============================================================================

describe("DoD 8.10: Relative target resolves within same compound state", () => {
  it("relative targets resolve as siblings of the handler state", () => {
    const machine = defineMachine({
      id: "relative-target",
      initial: "active",
      states: {
        active: {
          type: "compound",
          initial: "a",
          states: {
            a: { on: { GO: { target: "b" } } },
            b: { on: { BACK: { target: "a" } } },
          },
          on: {},
        },
      },
    });

    const r1 = transition(["active", "a"], undefined, { type: "GO" }, machine);
    expect(r1.newStatePath).toEqual(["active", "b"]);

    const r2 = transition(["active", "b"], undefined, { type: "BACK" }, machine);
    expect(r2.newStatePath).toEqual(["active", "a"]);
  });
});

// =============================================================================
// DoD 8.11: snapshot.stateValue returns nested object for compound states
// =============================================================================

describe("DoD 8.11: snapshot.stateValue returns nested object for compound states", () => {
  it("stateValue is a nested object for compound states", () => {
    const machine = defineMachine({
      id: "state-value-test",
      initial: "active",
      states: {
        active: {
          type: "compound",
          initial: "loading",
          states: {
            loading: { on: {} },
            ready: { on: {} },
          },
          on: {},
        },
      },
    });

    const activityManager = createActivityManager();
    const runner = createMachineRunner(machine, {
      executor: noopExecutor(),
      activityManager,
    });

    const snapshot = runner.snapshot();
    expect(snapshot.stateValue).toEqual({ active: "loading" });

    activityManager.dispose();
  });

  it("stateValue is a plain string for flat states", () => {
    const machine = defineMachine({
      id: "flat-sv",
      initial: "idle",
      states: {
        idle: { on: { GO: { target: "done" } } },
        done: {},
      },
    });

    const activityManager = createActivityManager();
    const runner = createMachineRunner(machine, {
      executor: noopExecutor(),
      activityManager,
    });

    expect(runner.snapshot().stateValue).toBe("idle");
    activityManager.dispose();
  });
});

// =============================================================================
// DoD 8.12: snapshot.matches('active.loading') checks dot-path
// =============================================================================

describe("DoD 8.12: snapshot.matches checks dot-path", () => {
  it("matches exact dot-path", () => {
    const machine = defineMachine({
      id: "matches-test",
      initial: "active",
      states: {
        active: {
          type: "compound",
          initial: "loading",
          states: {
            loading: { on: {} },
            ready: { on: {} },
          },
          on: {},
        },
      },
    });

    const activityManager = createActivityManager();
    const runner = createMachineRunner(machine, {
      executor: noopExecutor(),
      activityManager,
    });

    expect(runner.snapshot().matches("active.loading")).toBe(true);
    expect(runner.snapshot().matches("active.ready")).toBe(false);

    activityManager.dispose();
  });
});

// =============================================================================
// DoD 8.13: snapshot.matches('active') returns true when in any child of active
// =============================================================================

describe("DoD 8.13: snapshot.matches with partial path", () => {
  it("matches parent path when in a child state", () => {
    const machine = defineMachine({
      id: "matches-partial",
      initial: "active",
      states: {
        active: {
          type: "compound",
          initial: "loading",
          states: {
            loading: { on: {} },
          },
          on: {},
        },
      },
    });

    const activityManager = createActivityManager();
    const runner = createMachineRunner(machine, {
      executor: noopExecutor(),
      activityManager,
    });

    // In ['active', 'loading'], matches('active') should be true
    expect(runner.snapshot().matches("active")).toBe(true);
    expect(runner.snapshot().matches("active.loading")).toBe(true);
    // @ts-expect-error - "other" is intentionally not a valid state name (runtime false check)
    expect(runner.snapshot().matches("other")).toBe(false);

    activityManager.dispose();
  });
});

// =============================================================================
// DoD 8.14: snapshot.can(event) includes events handled by parent compound
// =============================================================================

describe("DoD 8.14: snapshot.can includes parent compound events", () => {
  it("can() returns true for events handled by parent compound", () => {
    const machine = defineMachine({
      id: "can-bubble",
      initial: "active",
      states: {
        active: {
          type: "compound",
          initial: "child",
          states: {
            child: {
              on: { LOCAL: { target: "child" } },
            },
          },
          on: { GLOBAL: { target: "done" } },
        },
        done: {},
      },
    });

    const activityManager = createActivityManager();
    const runner = createMachineRunner(machine, {
      executor: noopExecutor(),
      activityManager,
    });

    const snap = runner.snapshot();
    expect(snap.can({ type: "LOCAL" })).toBe(true);
    expect(snap.can({ type: "GLOBAL" })).toBe(true);
    expect(snap.can({ type: "UNKNOWN" })).toBe(false);

    activityManager.dispose();
  });
});

// =============================================================================
// DoD 8.15: Exit/entry effect ordering for sibling transition (child-only)
// =============================================================================

describe("DoD 8.15: Exit/entry effect ordering for sibling transition", () => {
  it("only exits the old child and enters the new child for sibling transitions", () => {
    const machine = defineMachine({
      id: "sibling-effects",
      initial: "parent",
      states: {
        parent: {
          type: "compound",
          initial: "a",
          entry: [entryEffect("parent")],
          exit: [exitEffect("parent")],
          states: {
            a: {
              entry: [entryEffect("a")],
              exit: [exitEffect("a")],
              on: { GO: { target: "b" } },
            },
            b: {
              entry: [entryEffect("b")],
              exit: [exitEffect("b")],
              on: {},
            },
          },
          on: {},
        },
      },
    });

    // Transition from sibling a -> b within parent
    const result = transition(["parent", "a"], undefined, { type: "GO" }, machine);
    expect(result.transitioned).toBe(true);
    expect(result.newStatePath).toEqual(["parent", "b"]);

    // Should only exit child 'a' and enter child 'b'
    // Parent's exit/entry should NOT fire for sibling transitions
    const _effectTags = result.effects.map(e => e._tag);
    expect(result.effects).toEqual([
      exitEffect("a"), // exit old child
      entryEffect("b"), // enter new child
    ]);
  });
});

// =============================================================================
// DoD 8.16: Exit/entry effect ordering for breaking out of compound (bottom-up exit)
// =============================================================================

describe("DoD 8.16: Exit/entry effect ordering for breaking out of compound", () => {
  it("exits bottom-up from leaf through compound when leaving", () => {
    const machine = defineMachine({
      id: "breakout-effects",
      initial: "compound",
      states: {
        compound: {
          type: "compound",
          initial: "child",
          exit: [exitEffect("compound")],
          states: {
            child: {
              exit: [exitEffect("child")],
              on: {},
            },
          },
          on: { LEAVE: { target: "outside" } },
        },
        outside: {
          entry: [entryEffect("outside")],
          on: {},
        },
      },
    });

    const result = transition(["compound", "child"], undefined, { type: "LEAVE" }, machine);
    expect(result.transitioned).toBe(true);
    expect(result.newStatePath).toEqual(["outside"]);

    // Bottom-up exit: child first, then compound, then entry of outside
    expect(result.effects).toEqual([
      exitEffect("child"),
      exitEffect("compound"),
      entryEffect("outside"),
    ]);
  });
});

// =============================================================================
// DoD 8.17: Exit/entry effect ordering for entering compound from outside (top-down entry)
// =============================================================================

describe("DoD 8.17: Exit/entry effect ordering for entering compound from outside", () => {
  it("enters top-down from compound to child when entering compound from outside", () => {
    const machine = defineMachine({
      id: "enter-from-outside",
      initial: "outside",
      states: {
        outside: {
          exit: [exitEffect("outside")],
          on: { ENTER: { target: "compound" } },
        },
        compound: {
          type: "compound",
          initial: "child",
          entry: [entryEffect("compound")],
          states: {
            child: {
              entry: [entryEffect("child")],
              on: {},
            },
          },
          on: {},
        },
      },
    });

    const result = transition(["outside"], undefined, { type: "ENTER" }, machine);
    expect(result.transitioned).toBe(true);
    expect(result.newStatePath).toEqual(["compound", "child"]);

    // Exit outside, then top-down entry: compound first, then child
    expect(result.effects).toEqual([
      exitEffect("outside"),
      entryEffect("compound"),
      entryEffect("child"),
    ]);
  });
});

// =============================================================================
// DoD 8.18: Self-transition on compound resets to initial child
// =============================================================================

describe("DoD 8.18: Self-transition on compound resets to initial child", () => {
  it("self-transition on compound state re-enters from initial", () => {
    const machine = defineMachine({
      id: "self-transition",
      initial: "active",
      states: {
        active: {
          type: "compound",
          initial: "idle",
          states: {
            idle: { on: { START: { target: "running" } } },
            running: { on: {} },
          },
          on: { RESET: { target: "active" } },
        },
      },
    });

    // Currently in ['active', 'running'], self-transition on 'active' -> resets to initial
    const result = transition(["active", "running"], undefined, { type: "RESET" }, machine);
    expect(result.transitioned).toBe(true);
    // Should auto-enter the initial child 'idle'
    expect(result.newStatePath).toEqual(["active", "idle"]);
  });
});

// =============================================================================
// DoD 8.19: Active state path computation for nested compounds
// =============================================================================

describe("DoD 8.19: Active state path computation for nested compounds", () => {
  it("computes correct initial path for deeply nested compounds", () => {
    const machine = defineMachine({
      id: "deep-path",
      initial: "l1",
      states: {
        l1: {
          type: "compound",
          initial: "l2",
          states: {
            l2: {
              type: "compound",
              initial: "l3",
              states: {
                l3: { on: {} },
              },
              on: {},
            },
          },
          on: {},
        },
      },
    });

    expect(computeInitialPath(machine)).toEqual(["l1", "l2", "l3"]);
  });

  it("computeInitialPath works for flat machines", () => {
    const machine = defineMachine({
      id: "flat",
      initial: "idle",
      states: {
        idle: { on: {} },
      },
    });

    expect(computeInitialPath(machine)).toEqual(["idle"]);
  });
});

// =============================================================================
// DoD 8.20: StateValue computation from active state path
// =============================================================================

describe("DoD 8.20: StateValue computation from active state path", () => {
  it("stateValue() returns nested object matching the active path", () => {
    const machine = defineMachine({
      id: "sv-computation",
      initial: "a",
      states: {
        a: {
          type: "compound",
          initial: "b",
          states: {
            b: {
              type: "compound",
              initial: "c",
              states: {
                c: { on: {} },
              },
              on: {},
            },
          },
          on: {},
        },
      },
    });

    const activityManager = createActivityManager();
    const runner = createMachineRunner(machine, {
      executor: noopExecutor(),
      activityManager,
    });

    // Path is ['a', 'b', 'c'], stateValue should be { a: { b: 'c' } }
    expect(runner.stateValue()).toEqual({ a: { b: "c" } });

    activityManager.dispose();
  });
});

// =============================================================================
// Additional integration tests
// =============================================================================

describe("Compound states: runner integration", () => {
  it("runner tracks compound state path through transitions", () => {
    const machine = defineMachine({
      id: "runner-compound",
      initial: "idle",
      states: {
        idle: { on: { GO: { target: "active" } } },
        active: {
          type: "compound",
          initial: "loading",
          states: {
            loading: { on: { LOADED: { target: "ready" } } },
            ready: { on: {} },
          },
          on: { CANCEL: { target: "idle" } },
        },
      },
    });

    const activityManager = createActivityManager();
    const runner = createMachineRunner(machine, {
      executor: noopExecutor(),
      activityManager,
    });

    expect(runner.state()).toBe("idle");
    expect(runner.stateValue()).toBe("idle");

    // Transition to compound state
    runner.send({ type: "GO" });
    expect(runner.state()).toBe("active");
    expect(runner.stateValue()).toEqual({ active: "loading" });
    expect(runner.snapshot().matches("active")).toBe(true);
    expect(runner.snapshot().matches("active.loading")).toBe(true);

    // Transition within compound
    runner.send({ type: "LOADED" });
    expect(runner.stateValue()).toEqual({ active: "ready" });
    expect(runner.snapshot().matches("active.ready")).toBe(true);
    expect(runner.snapshot().matches("active.loading")).toBe(false);

    // Bubble event to parent compound
    runner.send({ type: "CANCEL" });
    expect(runner.state()).toBe("idle");
    expect(runner.stateValue()).toBe("idle");

    activityManager.dispose();
  });

  it("transitionSafe works with compound state paths", () => {
    const machine = defineMachine({
      id: "safe-compound",
      initial: "active",
      states: {
        active: {
          type: "compound",
          initial: "a",
          states: {
            a: { on: { GO: { target: "b" } } },
            b: { on: {} },
          },
          on: {},
        },
      },
    });

    const result = transitionSafe(["active", "a"], undefined, { type: "GO" }, machine);
    const value = expectOk(result);
    expect(value.transitioned).toBe(true);
    expect(value.newStatePath).toEqual(["active", "b"]);
  });

  it("canTransition checks through event bubbling", () => {
    const machine = defineMachine({
      id: "can-test",
      initial: "active",
      states: {
        active: {
          type: "compound",
          initial: "child",
          states: {
            child: { on: { LOCAL: { target: "child" } } },
          },
          on: { GLOBAL: { target: "done" } },
        },
        done: {},
      },
    });

    expect(canTransition(["active", "child"], { type: "LOCAL" }, undefined, machine)).toBe(true);
    expect(canTransition(["active", "child"], { type: "GLOBAL" }, undefined, machine)).toBe(true);
    expect(canTransition(["active", "child"], { type: "NOPE" }, undefined, machine)).toBe(false);
  });
});

describe("Compound states: defineMachine normalization", () => {
  it("infers type: compound when states property is present", () => {
    const machine = defineMachine({
      id: "infer-compound",
      initial: "active",
      states: {
        active: {
          // No explicit type: 'compound' — should be inferred from states
          initial: "idle",
          states: {
            idle: { on: {} },
          },
          on: {},
        },
      },
    });

    const path = computeInitialPath(machine);
    expect(path).toEqual(["active", "idle"]);
  });

  it("infers initial from first child key when not provided", () => {
    const machine = defineMachine({
      id: "infer-initial",
      initial: "active",
      states: {
        active: {
          type: "compound",
          // No initial specified — should use first key
          states: {
            first: { on: {} },
            second: { on: {} },
          },
          on: {},
        },
      },
    });

    const path = computeInitialPath(machine);
    expect(path).toEqual(["active", "first"]);
  });

  it("normalizes onDone string shorthand", () => {
    const machine = defineMachine({
      id: "ondone-shorthand",
      initial: "wizard",
      states: {
        wizard: {
          type: "compound",
          initial: "step",
          onDone: "complete",
          states: {
            step: { on: { DONE: { target: "end" } } },
            end: { type: "final" },
          },
          on: {},
        },
        complete: {},
      },
    });

    // Transition to final child triggers onDone -> complete
    const result = transition(["wizard", "step"], undefined, { type: "DONE" }, machine);
    expect(result.transitioned).toBe(true);
    expect(result.newStatePath).toEqual(["complete"]);
  });
});

// =============================================================================
// Additional Advanced States Tests
// =============================================================================

describe("Event bubbling from nested child to parent handler", () => {
  it("bubbles through multiple levels to find the handler", () => {
    const machine = defineMachine({
      id: "deep-bubble",
      initial: "l1",
      states: {
        l1: {
          type: "compound",
          initial: "l2",
          states: {
            l2: {
              type: "compound",
              initial: "l3",
              states: {
                l3: {
                  on: { LOCAL: { target: "l3" } },
                },
              },
              on: {},
            },
          },
          on: { ESCAPE: { target: "exited" } },
        },
        exited: {},
      },
    });

    // ESCAPE is not handled by l3 or l2, should bubble to l1
    const result = transition(["l1", "l2", "l3"], undefined, { type: "ESCAPE" }, machine);
    expect(result.transitioned).toBe(true);
    expect(result.newStatePath).toEqual(["exited"]);
  });
});

describe("Exit/entry action ordering for sibling transitions", () => {
  it("exits old child then enters new child without touching parent", () => {
    const machine = defineMachine({
      id: "sibling-ordering",
      initial: "parent",
      states: {
        parent: {
          type: "compound",
          initial: "alpha",
          entry: [entryEffect("parent")],
          exit: [exitEffect("parent")],
          states: {
            alpha: {
              entry: [entryEffect("alpha")],
              exit: [exitEffect("alpha")],
              on: { NEXT: { target: "beta" } },
            },
            beta: {
              entry: [entryEffect("beta")],
              exit: [exitEffect("beta")],
              on: { NEXT: { target: "gamma" } },
            },
            gamma: {
              entry: [entryEffect("gamma")],
              exit: [exitEffect("gamma")],
              on: {},
            },
          },
          on: {},
        },
      },
    });

    // alpha -> beta: only exit alpha, entry beta
    const r1 = transition(["parent", "alpha"], undefined, { type: "NEXT" }, machine);
    expect(r1.transitioned).toBe(true);
    expect(r1.effects).toEqual([exitEffect("alpha"), entryEffect("beta")]);

    // beta -> gamma: only exit beta, entry gamma
    const r2 = transition(["parent", "beta"], undefined, { type: "NEXT" }, machine);
    expect(r2.transitioned).toBe(true);
    expect(r2.effects).toEqual([exitEffect("beta"), entryEffect("gamma")]);
  });
});

describe("Self-transition on compound state resets to initial child", () => {
  it("resets from non-initial child back to initial child", () => {
    const machine = defineMachine({
      id: "self-reset",
      initial: "parent",
      states: {
        parent: {
          type: "compound",
          initial: "first",
          states: {
            first: { on: { NEXT: { target: "second" } } },
            second: { on: { NEXT: { target: "third" } } },
            third: { on: {} },
          },
          on: { RESET: { target: "parent" } },
        },
      },
    });

    // Start in third child, self-transition should reset to first
    const result = transition(["parent", "third"], undefined, { type: "RESET" }, machine);
    expect(result.transitioned).toBe(true);
    expect(result.newStatePath).toEqual(["parent", "first"]);
  });
});

describe("Active state path computation for nested states", () => {
  it("computes correct path for 4 levels of nesting", () => {
    const machine = defineMachine({
      id: "four-deep",
      initial: "a",
      states: {
        a: {
          type: "compound",
          initial: "b",
          states: {
            b: {
              type: "compound",
              initial: "c",
              states: {
                c: {
                  type: "compound",
                  initial: "d",
                  states: {
                    d: { on: {} },
                  },
                  on: {},
                },
              },
              on: {},
            },
          },
          on: {},
        },
      },
    });

    expect(computeInitialPath(machine)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("StateValue computation for nested compound states", () => {
  it("stateValue computes nested object for 3 levels", () => {
    const machine = defineMachine({
      id: "sv-3-level",
      initial: "outer",
      states: {
        outer: {
          type: "compound",
          initial: "middle",
          states: {
            middle: {
              type: "compound",
              initial: "inner",
              states: {
                inner: { on: {} },
              },
              on: {},
            },
          },
          on: {},
        },
      },
    });

    const activityManager = createActivityManager();
    const runner = createMachineRunner(machine, {
      executor: noopExecutor(),
      activityManager,
    });

    expect(runner.stateValue()).toEqual({ outer: { middle: "inner" } });
    activityManager.dispose();
  });
});

describe("Multiple levels of nesting (3+ deep) with transitions", () => {
  it("transitions work correctly at the deepest level", () => {
    const machine = defineMachine({
      id: "deep-transition",
      initial: "l1",
      states: {
        l1: {
          type: "compound",
          initial: "l2",
          states: {
            l2: {
              type: "compound",
              initial: "l3a",
              states: {
                l3a: { on: { GO: { target: "l3b" } } },
                l3b: { on: {} },
              },
              on: {},
            },
          },
          on: {},
        },
      },
    });

    const result = transition(["l1", "l2", "l3a"], undefined, { type: "GO" }, machine);
    expect(result.transitioned).toBe(true);
    expect(result.newStatePath).toEqual(["l1", "l2", "l3b"]);
  });
});

describe("Final state transitions with onDone", () => {
  it("nested final states trigger onDone at the correct compound level", () => {
    const machine = defineMachine({
      id: "nested-final",
      initial: "outer",
      states: {
        outer: {
          type: "compound",
          initial: "inner",
          onDone: { target: "finished" },
          states: {
            inner: {
              type: "compound",
              initial: "step1",
              onDone: { target: "innerDone" },
              states: {
                step1: { on: { COMPLETE: { target: "end" } } },
                end: { type: "final" },
              },
              on: {},
            },
            innerDone: { on: { FINISH: { target: "outerEnd" } } },
            outerEnd: { type: "final" },
          },
          on: {},
        },
        finished: {},
      },
    });

    // step1 -> end (final) triggers inner onDone -> innerDone
    const r1 = transition(["outer", "inner", "step1"], undefined, { type: "COMPLETE" }, machine);
    expect(r1.transitioned).toBe(true);
    expect(r1.newStatePath).toEqual(["outer", "innerDone"]);

    // innerDone -> outerEnd (final) triggers outer onDone -> finished
    const r2 = transition(["outer", "innerDone"], undefined, { type: "FINISH" }, machine);
    expect(r2.transitioned).toBe(true);
    expect(r2.newStatePath).toEqual(["finished"]);
  });
});
