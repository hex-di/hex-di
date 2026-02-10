/**
 * Type-level tests for createMachineBuilder
 *
 * These tests verify compile-time validation of:
 * 1. TStates union grows on addState
 * 2. Transition targets are constrained to known states
 * 3. Event names are inferred and accumulated
 * 4. Context type flows through guards and actions
 * 5. Build produces correct Machine type
 * 6. Undefined context maps to void
 */

import { describe, expectTypeOf, it } from "vitest";
import { createMachineBuilder } from "../src/machine/builder.js";
import type { Machine } from "../src/machine/define-machine.js";
import type {
  InferMachineStateNames,
  InferMachineEventNames,
  InferMachineContextType,
  MachineAny,
} from "../src/machine/types.js";

// =============================================================================
// Test 1: TStates Union Grows on addState
// =============================================================================

describe("TStates union grows on addState", () => {
  it("single addState creates a single-member union", () => {
    const builder = createMachineBuilder({ id: "test", context: undefined }).addState("idle");

    // After addState("idle"), transitions() should constrain to "idle"
    const transBuilder = builder.transitions();
    // on() from/to should accept "idle"
    const withTransition = transBuilder.on("idle", "SELF", "idle");
    const machine = withTransition.build();

    type States = InferMachineStateNames<typeof machine>;
    expectTypeOf<States>().toEqualTypeOf<"idle">();
  });

  it("multiple addState calls grow the union", () => {
    const machine = createMachineBuilder({ id: "test", context: undefined })
      .addState("idle")
      .addState("loading")
      .addState("success")
      .transitions()
      .on("idle", "FETCH", "loading")
      .on("loading", "DONE", "success")
      .build();

    type States = InferMachineStateNames<typeof machine>;
    expectTypeOf<States>().toEqualTypeOf<"idle" | "loading" | "success">();
  });
});

// =============================================================================
// Test 2: Transition Targets Constrained to Known States
// =============================================================================

describe("transition targets constrained to known states", () => {
  it("from and to parameters are constrained to TStates", () => {
    const builder = createMachineBuilder({ id: "test", context: undefined })
      .addState("a")
      .addState("b")
      .transitions();

    // These should compile - "a" and "b" are valid states
    builder.on("a", "GO", "b");
    builder.on("b", "BACK", "a");
    builder.on("a", "SELF", "a");
  });

  it("self-transitions are valid", () => {
    const machine = createMachineBuilder({ id: "test", context: { count: 0 } })
      .addState("active")
      .transitions()
      .on("active", "INCREMENT", "active")
      .build();

    type States = InferMachineStateNames<typeof machine>;
    expectTypeOf<States>().toEqualTypeOf<"active">();
  });
});

// =============================================================================
// Test 3: Event Names Are Inferred and Accumulated
// =============================================================================

describe("event names are inferred and accumulated", () => {
  it("single transition creates a single-member event union", () => {
    const machine = createMachineBuilder({ id: "test", context: undefined })
      .addState("a")
      .addState("b")
      .transitions()
      .on("a", "GO", "b")
      .build();

    type Events = InferMachineEventNames<typeof machine>;
    expectTypeOf<Events>().toEqualTypeOf<"GO">();
  });

  it("multiple transitions accumulate event names", () => {
    const machine = createMachineBuilder({ id: "test", context: undefined })
      .addState("idle")
      .addState("loading")
      .addState("success")
      .transitions()
      .on("idle", "FETCH", "loading")
      .on("loading", "SUCCESS", "success")
      .on("success", "RESET", "idle")
      .build();

    type Events = InferMachineEventNames<typeof machine>;
    expectTypeOf<Events>().toEqualTypeOf<"FETCH" | "SUCCESS" | "RESET">();
  });

  it("duplicate event names are deduplicated in the union", () => {
    const machine = createMachineBuilder({ id: "test", context: undefined })
      .addState("a")
      .addState("b")
      .transitions()
      .on("a", "TOGGLE", "b")
      .on("b", "TOGGLE", "a")
      .build();

    type Events = InferMachineEventNames<typeof machine>;
    expectTypeOf<Events>().toEqualTypeOf<"TOGGLE">();
  });
});

// =============================================================================
// Test 4: Context Type Flows Through Guards and Actions
// =============================================================================

describe("context type flows through guards and actions", () => {
  it("guard receives correct context type", () => {
    interface CounterCtx {
      count: number;
    }

    // This should compile without errors - guard gets CounterCtx
    createMachineBuilder({ id: "test", context: { count: 0 } as CounterCtx })
      .addState("active")
      .addState("maxed")
      .transitions()
      .on("active", "INC", "active", {
        guard: ctx => {
          // ctx should be CounterCtx
          expectTypeOf(ctx).toEqualTypeOf<CounterCtx>();
          return ctx.count < 10;
        },
      })
      .build();
  });

  it("actions receive and return correct context type", () => {
    interface AppCtx {
      value: string;
      count: number;
    }

    // This should compile without errors - action gets and returns AppCtx
    createMachineBuilder({ id: "test", context: { value: "", count: 0 } as AppCtx })
      .addState("active")
      .transitions()
      .on("active", "UPDATE", "active", {
        actions: [
          ctx => {
            expectTypeOf(ctx).toEqualTypeOf<AppCtx>();
            return { ...ctx, count: ctx.count + 1 };
          },
        ],
      })
      .build();
  });
});

// =============================================================================
// Test 5: Build Produces Correct Machine Type
// =============================================================================

describe("build produces correct Machine type", () => {
  it("machine type encodes states, events, and context", () => {
    const machine = createMachineBuilder({
      id: "typed",
      context: { data: null as string | null },
    })
      .addState("idle")
      .addState("loading")
      .addState("done")
      .transitions()
      .on("idle", "FETCH", "loading")
      .on("loading", "COMPLETE", "done")
      .build();

    expectTypeOf(machine).toMatchTypeOf<
      Machine<"idle" | "loading" | "done", "FETCH" | "COMPLETE", { data: string | null }>
    >();
  });

  it("machine is assignable to MachineAny", () => {
    const machine = createMachineBuilder({ id: "test", context: undefined })
      .addState("a")
      .transitions()
      .build();

    expectTypeOf(machine).toMatchTypeOf<MachineAny>();
  });
});

// =============================================================================
// Test 6: Undefined Context Maps to Void
// =============================================================================

describe("undefined context maps to void", () => {
  it("undefined context becomes void in Machine type", () => {
    const machine = createMachineBuilder({ id: "test", context: undefined })
      .addState("a")
      .transitions()
      .build();

    type Ctx = InferMachineContextType<typeof machine>;
    expectTypeOf<Ctx>().toEqualTypeOf<void>();
  });

  it("explicit context is preserved", () => {
    const machine = createMachineBuilder({ id: "test", context: { x: 1 } })
      .addState("a")
      .transitions()
      .build();

    type Ctx = InferMachineContextType<typeof machine>;
    expectTypeOf<Ctx>().toEqualTypeOf<{ x: number }>();
  });
});

// =============================================================================
// Test 7: No Transitions Produces never Event Union
// =============================================================================

describe("no transitions produces never event union", () => {
  it("machine with no transitions has never events", () => {
    const machine = createMachineBuilder({ id: "test", context: undefined })
      .addState("terminal")
      .transitions()
      .build();

    type Events = InferMachineEventNames<typeof machine>;
    expectTypeOf<Events>().toEqualTypeOf<never>();
  });
});
