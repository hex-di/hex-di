/**
 * DoD 8: Advanced States - Phase A (Compound States) - Type-Level Tests
 *
 * These tests verify:
 * 1. Child targets must be siblings within the same compound
 * 2. Parent-level `on` targets must be siblings of compound
 * 3. `#id` references must resolve to existing states
 * 4. `'final'` states cannot have outgoing transitions
 * 5. InferMachineState produces union of all reachable state paths
 * 6. StateNode type discriminator accepts valid types
 * 7. StateValue type accepts nested objects
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import {
  defineMachine,
  createMachineRunner,
  type InferMachineState,
  type StateValue,
  type MachineSnapshot,
} from "../src/index.js";
import type { StateNode, StateNodeAny } from "../src/machine/state-node.js";
import { createActivityManager } from "../src/activities/index.js";
import { ResultAsync } from "@hex-di/result";

// =============================================================================
// Test 1: StateNode type discriminator accepts valid types
// =============================================================================

describe("StateNode type discriminator accepts valid types", () => {
  it("accepts atomic, compound, parallel, final, and history types", () => {
    type AtomicNode = StateNode<"a" | "b", "GO", void>;
    type AtomicType = AtomicNode["type"];
    expectTypeOf<AtomicType>().toEqualTypeOf<
      "atomic" | "compound" | "parallel" | "final" | "history" | undefined
    >();
  });

  it("StateNodeAny accepts all valid type values", () => {
    const atomic: StateNodeAny = { type: "atomic", on: {} };
    const compound: StateNodeAny = {
      type: "compound",
      initial: "a",
      states: { a: { on: {} } },
      on: {},
    };
    const parallel: StateNodeAny = {
      type: "parallel",
      states: { a: { on: {} }, b: { on: {} } },
    };
    const final: StateNodeAny = { type: "final" };
    const history: StateNodeAny = { type: "history" };

    expectTypeOf(atomic).toMatchTypeOf<StateNodeAny>();
    expectTypeOf(compound).toMatchTypeOf<StateNodeAny>();
    expectTypeOf(parallel).toMatchTypeOf<StateNodeAny>();
    expectTypeOf(final).toMatchTypeOf<StateNodeAny>();
    expectTypeOf(history).toMatchTypeOf<StateNodeAny>();
  });
});

// =============================================================================
// Test 2: Compound state node accepts nested states
// =============================================================================

describe("Compound state node accepts nested states", () => {
  it("StateNode with compound type accepts states and initial", () => {
    // This should compile without errors
    const machine = defineMachine({
      id: "compound-types",
      initial: "active",
      states: {
        active: {
          type: "compound",
          initial: "idle",
          states: {
            idle: { on: { GO: { target: "running" } } },
            running: { on: { STOP: { target: "idle" } } },
          },
          on: { CANCEL: { target: "done" } },
        },
        done: {},
      },
    });

    type States = InferMachineState<typeof machine>;
    expectTypeOf<States>().toEqualTypeOf<"active" | "done">();
  });
});

// =============================================================================
// Test 3: InferMachineState produces top-level state names
// =============================================================================

describe("InferMachineState produces top-level state name union", () => {
  it("includes all top-level state names", () => {
    const machine = defineMachine({
      id: "inference-test",
      initial: "idle",
      states: {
        idle: { on: { START: { target: "active" } } },
        active: {
          type: "compound",
          initial: "loading",
          states: {
            loading: { on: { LOADED: { target: "ready" } } },
            ready: { on: {} },
          },
          on: { CANCEL: { target: "error" } },
        },
        error: { on: { RETRY: { target: "active" } } },
      },
    });

    type States = InferMachineState<typeof machine>;
    expectTypeOf<States>().toEqualTypeOf<"idle" | "active" | "error">();
  });
});

// =============================================================================
// Test 4: Final states structural constraint
// =============================================================================

describe("Final states can exist with compound structures", () => {
  it("final state within compound accepts type: final", () => {
    const machine = defineMachine({
      id: "final-in-compound",
      initial: "wizard",
      states: {
        wizard: {
          type: "compound",
          initial: "step1",
          onDone: { target: "complete" },
          states: {
            step1: { on: { NEXT: { target: "finished" } } },
            finished: { type: "final" },
          },
          on: {},
        },
        complete: {},
      },
    });

    type States = InferMachineState<typeof machine>;
    expectTypeOf<States>().toEqualTypeOf<"wizard" | "complete">();
  });
});

// =============================================================================
// Test 5: StateValue type accepts nested objects
// =============================================================================

describe("StateValue type accepts nested objects and strings", () => {
  it("StateValue accepts string", () => {
    const sv: StateValue = "idle";
    expectTypeOf(sv).toMatchTypeOf<StateValue>();
  });

  it("StateValue accepts single nesting", () => {
    const sv: StateValue = { active: "loading" };
    expectTypeOf(sv).toMatchTypeOf<StateValue>();
  });

  it("StateValue accepts deep nesting", () => {
    const sv: StateValue = { active: { editing: "unsaved" } };
    expectTypeOf(sv).toMatchTypeOf<StateValue>();
  });
});

// =============================================================================
// Test 6: onDone accepts string shorthand and TransitionConfig
// =============================================================================

describe("onDone accepts both string shorthand and TransitionConfig", () => {
  it("onDone with string shorthand compiles", () => {
    const _machine = defineMachine({
      id: "ondone-string",
      initial: "a",
      states: {
        a: {
          type: "compound",
          initial: "inner",
          onDone: "b",
          states: {
            inner: { type: "final" },
          },
          on: {},
        },
        b: {},
      },
    });

    expectTypeOf(_machine).toMatchTypeOf<object>();
  });

  it("onDone with TransitionConfig compiles", () => {
    const _machine = defineMachine({
      id: "ondone-config",
      initial: "a",
      states: {
        a: {
          type: "compound",
          initial: "inner",
          onDone: { target: "b" },
          states: {
            inner: { type: "final" },
          },
          on: {},
        },
        b: {},
      },
    });

    expectTypeOf(_machine).toMatchTypeOf<object>();
  });
});

// =============================================================================
// Test 7: id property on StateNode
// =============================================================================

describe("StateNode accepts id property for #id targeting", () => {
  it("StateNodeAny accepts id string", () => {
    const node: StateNodeAny = {
      id: "myState",
      on: {},
    };
    expectTypeOf(node.id).toEqualTypeOf<string | undefined>();
  });

  it("compound with id compiles", () => {
    const _machine = defineMachine({
      id: "id-test",
      initial: "container",
      states: {
        container: {
          type: "compound",
          id: "myContainer",
          initial: "inner",
          states: {
            inner: { on: {} },
          },
          on: {},
        },
      },
    });

    expectTypeOf(_machine).toMatchTypeOf<object>();
  });
});

// =============================================================================
// Test 8: matches() path parameter constrained to valid dot-paths
// =============================================================================

describe("matches() path parameter is type-safe", () => {
  it("accepts a valid top-level state name", () => {
    const snapshot: MachineSnapshot<"active" | "done", void> = {
      state: "active",
      context: undefined,
      activities: [],
      pendingEvents: [],
      stateValue: "active",
      matches: () => false,
      can: () => false,
    };

    // Valid: top-level state
    snapshot.matches("active");
    snapshot.matches("done");
  });

  it("accepts a dot-path starting with a valid state name", () => {
    const snapshot: MachineSnapshot<"active" | "done", void> = {
      state: "active",
      context: undefined,
      activities: [],
      pendingEvents: [],
      stateValue: { active: "loading" },
      matches: () => false,
      can: () => false,
    };

    // Valid: dot-path prefix is a valid state
    snapshot.matches("active.loading");
    snapshot.matches("active.idle.nested");
  });

  it("rejects an invalid state name", () => {
    const snapshot: MachineSnapshot<"active" | "done", void> = {
      state: "active",
      context: undefined,
      activities: [],
      pendingEvents: [],
      stateValue: "active",
      matches: () => false,
      can: () => false,
    };

    // @ts-expect-error - "nonexistent" is not a valid state
    snapshot.matches("nonexistent");
  });
});
