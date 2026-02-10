/**
 * Parallel States Type-Level Tests
 *
 * Validates type-level behavior of parallel state machines:
 * - StateValue type includes Record<string, StateValue> for parallel regions
 * - MachineRunner typed correctly with parallel state machines
 * - ParallelRegionPaths type structure
 *
 * @packageDocumentation
 */

import { describe, it, expectTypeOf } from "vitest";
import { defineMachine } from "../src/machine/define-machine.js";
import type { StateValue } from "../src/runner/types.js";
import type { ParallelRegionPaths, ParallelTransitionResult } from "../src/runner/interpreter.js";

// =============================================================================
// Type-level machine definitions
// =============================================================================

const parallelMachine = defineMachine({
  id: "parallel-typed",
  initial: "dashboard",
  context: { count: 0 },
  states: {
    dashboard: {
      type: "parallel" as const,
      states: {
        panel1: {
          type: "compound" as const,
          initial: "idle",
          states: {
            idle: {
              on: {
                START: { target: "active" },
              },
            },
            active: {
              on: {},
            },
          },
        },
        panel2: {
          type: "compound" as const,
          initial: "loading",
          states: {
            loading: {
              on: {
                LOADED: { target: "ready" },
              },
            },
            ready: {
              on: {},
            },
          },
        },
      },
    },
    done: {
      on: {},
    },
  },
});

// =============================================================================
// Type-Level Tests
// =============================================================================

describe("Parallel State Type-Level Validation", () => {
  it("StateValue type allows string for flat states", () => {
    const sv: StateValue = "idle";
    expectTypeOf(sv).toMatchTypeOf<StateValue>();
  });

  it("StateValue type allows nested object for compound states", () => {
    const sv: StateValue = { active: "loading" };
    expectTypeOf(sv).toMatchTypeOf<StateValue>();
  });

  it("StateValue type allows nested object for parallel states", () => {
    const sv: StateValue = {
      dashboard: {
        panel1: "idle",
        panel2: "loading",
      },
    };
    expectTypeOf(sv).toMatchTypeOf<StateValue>();
  });

  it("StateValue type allows deeply nested parallel+compound", () => {
    const sv: StateValue = {
      dashboard: {
        panel1: { sub: "deep" },
        panel2: "flat",
      },
    };
    expectTypeOf(sv).toMatchTypeOf<StateValue>();
  });

  it("ParallelRegionPaths has correct structure", () => {
    expectTypeOf<ParallelRegionPaths>().toHaveProperty("parallelPath");
    expectTypeOf<ParallelRegionPaths>().toHaveProperty("regions");

    expectTypeOf<ParallelRegionPaths["parallelPath"]>().toEqualTypeOf<readonly string[]>();
    expectTypeOf<ParallelRegionPaths["regions"]>().toMatchTypeOf<
      Readonly<Record<string, readonly string[]>>
    >();
  });

  it("ParallelTransitionResult has correct structure", () => {
    expectTypeOf<ParallelTransitionResult>().toHaveProperty("newContext");
    expectTypeOf<ParallelTransitionResult>().toHaveProperty("effects");
    expectTypeOf<ParallelTransitionResult>().toHaveProperty("transitioned");
    expectTypeOf<ParallelTransitionResult>().toHaveProperty("newRegions");
    expectTypeOf<ParallelTransitionResult>().toHaveProperty("newState");
    expectTypeOf<ParallelTransitionResult>().toHaveProperty("onDoneResult");
  });

  it("defineMachine accepts parallel state configuration", () => {
    // This is a compile-time check: if the machine compiles, the type accepts parallel
    expectTypeOf(parallelMachine).toHaveProperty("id");
    expectTypeOf(parallelMachine).toHaveProperty("initial");
    expectTypeOf(parallelMachine).toHaveProperty("states");
    expectTypeOf(parallelMachine).toHaveProperty("context");
  });
});
