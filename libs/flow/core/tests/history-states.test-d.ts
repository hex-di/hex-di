/**
 * History Pseudo-States Type-Level Tests
 *
 * Validates type-level behavior of history pseudo-states:
 * - StateNode accepts `history` field
 * - StateNode accepts `target` field
 * - StateNodeAny includes history and target
 * - HistoryMap interface structure
 *
 * @packageDocumentation
 */

import { describe, it, expectTypeOf } from "vitest";
import { defineMachine } from "../src/machine/define-machine.js";
import type { StateNode, StateNodeAny } from "../src/machine/state-node.js";
import type { HistoryMap } from "../src/runner/interpreter.js";

// =============================================================================
// Type-level machine definitions
// =============================================================================

const historyMachine = defineMachine({
  id: "history-typed",
  initial: "idle",
  context: { count: 0 },
  states: {
    idle: {
      on: {
        START: { target: "editor" },
      },
    },
    editor: {
      type: "compound" as const,
      initial: "editing",
      states: {
        editing: {
          on: {
            REVIEW: { target: "reviewing" },
          },
        },
        reviewing: {
          on: {},
        },
        hist: {
          type: "history" as const,
          history: "shallow" as const,
          target: "editing",
        },
        deepHist: {
          type: "history" as const,
          history: "deep" as const,
        },
      },
    },
  },
});

// =============================================================================
// Type-Level Tests
// =============================================================================

describe("History State Type-Level Validation", () => {
  it("StateNode type field includes 'history'", () => {
    type TestNode = StateNode<"a" | "b", "EV", { count: number }>;
    expectTypeOf<TestNode["type"]>().toEqualTypeOf<
      "atomic" | "compound" | "parallel" | "final" | "history" | undefined
    >();
  });

  it("StateNode accepts history field with shallow or deep", () => {
    type TestNode = StateNode<"a" | "b", "EV", { count: number }>;
    expectTypeOf<TestNode["history"]>().toEqualTypeOf<"shallow" | "deep" | undefined>();
  });

  it("StateNode accepts target field for history fallback", () => {
    type TestNode = StateNode<"a" | "b", "EV", { count: number }>;
    expectTypeOf<TestNode["target"]>().toEqualTypeOf<string | undefined>();
  });

  it("StateNodeAny includes history field", () => {
    expectTypeOf<StateNodeAny["history"]>().toEqualTypeOf<"shallow" | "deep" | undefined>();
  });

  it("StateNodeAny includes target field", () => {
    expectTypeOf<StateNodeAny["target"]>().toEqualTypeOf<string | undefined>();
  });

  it("HistoryMap has get method", () => {
    expectTypeOf<HistoryMap>().toHaveProperty("get");
    expectTypeOf<HistoryMap["get"]>().toBeFunction();
  });

  it("HistoryMap.get returns readonly string[] or undefined", () => {
    type GetReturn = ReturnType<HistoryMap["get"]>;
    expectTypeOf<GetReturn>().toEqualTypeOf<readonly string[] | undefined>();
  });

  it("defineMachine accepts history state configuration", () => {
    // This is a compile-time check: if the machine compiles, the type accepts history
    expectTypeOf(historyMachine).toHaveProperty("id");
    expectTypeOf(historyMachine).toHaveProperty("initial");
    expectTypeOf(historyMachine).toHaveProperty("states");
    expectTypeOf(historyMachine).toHaveProperty("context");
  });
});
