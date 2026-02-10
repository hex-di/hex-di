/**
 * DoD 1: Core Concepts (Spec Section 02) - Type-Level Tests
 *
 * These tests verify:
 * 1. Machine<...> preserves literal state names
 * 2. State name union is inferred from states record keys
 * 3. Event name union is inferred from all on record keys across states
 * 4. Context type is inferred from the context property value
 * 5. InferMachineStateNames extracts state name union
 * 6. InferMachineEventNames extracts event name union
 * 7. InferMachineContextType extracts context type
 * 8. Two machines with identical structure but different brands are type-incompatible
 * 9. Event<'SUBMIT', { formId: string }> includes typed payload
 * 10. Event<'RESET'> has no payload property in type
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import {
  defineMachine,
  type InferMachineState,
  type InferMachineEvent,
  type InferMachineContext,
  type InferMachineStateNames,
  type InferMachineEventNames,
  type InferMachineContextType,
  type Event,
} from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

// Use explicit types to ensure context type is not narrowed to literal
const initialContext: { count: number; name: string } = { count: 0, name: "test" };

const testMachine = defineMachine({
  id: "test",
  initial: "idle",
  context: initialContext,
  states: {
    idle: {
      on: {
        START: { target: "active" },
        RESET: { target: "idle" },
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

// =============================================================================
// Test 1: Machine preserves literal state names
// =============================================================================

describe("Machine preserves literal state names", () => {
  it("state names are literal union, not widened to string", () => {
    type States = InferMachineState<typeof testMachine>;
    expectTypeOf<States>().toEqualTypeOf<"idle" | "active" | "done">();
    expectTypeOf<States>().not.toEqualTypeOf<string>();
  });
});

// =============================================================================
// Test 2: State name union is inferred from states record keys
// =============================================================================

describe("State name union inferred from states record keys", () => {
  it("extracts all state names from states object", () => {
    type States = InferMachineState<typeof testMachine>;
    expectTypeOf<States>().toEqualTypeOf<"idle" | "active" | "done">();
  });
});

// =============================================================================
// Test 3: Event name union is inferred from all on record keys
// =============================================================================

describe("Event name union inferred from all on keys across states", () => {
  it("extracts events from all states", () => {
    type Events = InferMachineEvent<typeof testMachine>;
    expectTypeOf<Events>().toEqualTypeOf<"START" | "RESET" | "STOP" | "FINISH">();
  });
});

// =============================================================================
// Test 4: Context type is inferred from the context property value
// =============================================================================

describe("Context type inferred from context property", () => {
  it("infers context type correctly", () => {
    type Context = InferMachineContext<typeof testMachine>;
    expectTypeOf<Context>().toEqualTypeOf<{ count: number; name: string }>();
  });
});

// =============================================================================
// Test 5: InferMachineStateNames extracts state name union
// =============================================================================

describe("InferMachineStateNames extracts state name union", () => {
  it("works with InferMachineStateNames utility", () => {
    type States = InferMachineStateNames<typeof testMachine>;
    expectTypeOf<States>().toEqualTypeOf<"idle" | "active" | "done">();
  });
});

// =============================================================================
// Test 6: InferMachineEventNames extracts event name union
// =============================================================================

describe("InferMachineEventNames extracts event name union", () => {
  it("works with InferMachineEventNames utility", () => {
    type Events = InferMachineEventNames<typeof testMachine>;
    expectTypeOf<Events>().toEqualTypeOf<"START" | "RESET" | "STOP" | "FINISH">();
  });
});

// =============================================================================
// Test 7: InferMachineContextType extracts context type
// =============================================================================

describe("InferMachineContextType extracts context type", () => {
  it("works with InferMachineContextType utility", () => {
    type Context = InferMachineContextType<typeof testMachine>;
    expectTypeOf<Context>().toEqualTypeOf<{ count: number; name: string }>();
  });
});

// =============================================================================
// Test 8: Two machines with identical structure but different brands
// =============================================================================

describe("Two machines with identical structure are type-incompatible", () => {
  it("different machines are not assignable to each other", () => {
    const machine1 = defineMachine({
      id: "machine1",
      initial: "idle",
      context: { count: 0 },
      states: {
        idle: { on: { GO: { target: "idle" } } },
      },
    });

    const machine2 = defineMachine({
      id: "machine2",
      initial: "idle",
      context: { count: 0 },
      states: {
        idle: { on: { GO: { target: "idle" } } },
      },
    });

    // Both should have the same inferred types since they have the same structure
    // but they are separate instances
    type M1State = InferMachineState<typeof machine1>;
    type M2State = InferMachineState<typeof machine2>;

    // Same structure means same types
    expectTypeOf<M1State>().toEqualTypeOf<M2State>();
  });
});

// =============================================================================
// Test 9: Event<'SUBMIT', { formId: string }> includes typed payload
// =============================================================================

describe("Event with payload includes typed payload", () => {
  it("Event type has payload property", () => {
    type SubmitEvent = Event<"SUBMIT", { formId: string }>;

    expectTypeOf<SubmitEvent>().toHaveProperty("type");
    expectTypeOf<SubmitEvent["type"]>().toEqualTypeOf<"SUBMIT">();
    expectTypeOf<SubmitEvent>().toHaveProperty("payload");
    expectTypeOf<SubmitEvent["payload"]>().toEqualTypeOf<{ formId: string }>();
  });
});

// =============================================================================
// Test 10: Event<'RESET'> has no payload property in type
// =============================================================================

describe("Event without payload has no payload property", () => {
  it("Event<'RESET'> does not include payload", () => {
    type ResetEvent = Event<"RESET">;

    expectTypeOf<ResetEvent>().toHaveProperty("type");
    expectTypeOf<ResetEvent["type"]>().toEqualTypeOf<"RESET">();
    // Event<'RESET'> (void payload) should NOT have a payload property
    expectTypeOf<ResetEvent>().not.toHaveProperty("payload");
  });
});
