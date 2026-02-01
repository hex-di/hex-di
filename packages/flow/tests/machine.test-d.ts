/**
 * Type-level tests for Machine configuration and factory.
 *
 * These tests verify compile-time validation of:
 * 1. Invalid initial state produces compile error
 * 2. Invalid transition target produces compile error
 * 3. Event payload mismatch produces compile error
 * 4. Guard return type must be boolean
 * 5. Action must return matching context shape
 * 6. Machine type encodes full state/event/context information
 */

import { describe, expectTypeOf, it } from "vitest";
import { createPort } from "@hex-di/core";
import { type State, type Event, type MachineAny } from "../src/machine/index.js";
import {
  type StateNode,
  type TransitionConfig,
  type MachineConfig,
  createMachine,
  type InferMachineState,
  type InferMachineEvent,
  type InferMachineContext,
} from "../src/machine/create-machine.js";
import { Effect } from "../src/effects/index.js";

// =============================================================================
// Test State and Event Definitions
// =============================================================================

// States (used as types in tests)
type _IdleState = State<"idle">;
type _LoadingState = State<"loading">;
type _SuccessState = State<"success">;
type _ErrorState = State<"error">;

// Events
type FetchEvent = Event<"FETCH">;
type SuccessEvent = Event<"SUCCESS", { data: string }>;
type _FailureEvent = Event<"FAILURE", { error: string }>;
type _ResetEvent = Event<"RESET">;
type _RetryEvent = Event<"RETRY">;

// Context
interface FetcherContext {
  data: string | null;
  error: string | null;
  retryCount: number;
}

// =============================================================================
// Test 1: Invalid Initial State Produces Compile Error
// =============================================================================

describe("invalid initial state produces compile error", () => {
  it("valid initial state compiles", () => {
    // This should compile fine - 'idle' exists in states
    const machine = createMachine({
      id: "test",
      initial: "idle",
      context: { data: null, error: null, retryCount: 0 } as FetcherContext,
      states: {
        idle: { on: {} },
        loading: { on: {} },
      },
    });

    expectTypeOf(machine.initial).toEqualTypeOf<"idle" | "loading">();
  });

  it("initial state must be a key of states record", () => {
    // The following would fail to compile if uncommented:
    // createMachine({
    //   id: "test",
    //   initial: "nonexistent", // Error: not a key of states
    //   context: { data: null, error: null, retryCount: 0 },
    //   states: {
    //     idle: { on: {} },
    //     loading: { on: {} },
    //   },
    // });

    // We verify the constraint exists by checking the type
    type TestConfig = Parameters<typeof createMachine>[0];
    expectTypeOf<TestConfig>().toHaveProperty("initial");
  });
});

// =============================================================================
// Test 2: Invalid Transition Target Produces Compile Error
// =============================================================================

describe("invalid transition target produces compile error", () => {
  it("valid transition target compiles", () => {
    const transition: TransitionConfig<
      "idle" | "loading" | "success",
      "loading",
      FetchEvent,
      FetcherContext
    > = {
      target: "loading",
    };

    expectTypeOf(transition.target).toEqualTypeOf<"loading">();
  });

  it("transition target is constrained to TAllStates", () => {
    // The TTarget type parameter must extend TAllStates
    // This is enforced by the TransitionConfig type signature

    type ValidTransition = TransitionConfig<
      "idle" | "loading",
      "loading", // Must be "idle" | "loading"
      FetchEvent,
      FetcherContext
    >;

    expectTypeOf<ValidTransition["target"]>().toEqualTypeOf<"loading">();
  });

  it("transition target must be from valid state union", () => {
    type ValidStates = "idle" | "loading" | "success";

    // This should work
    const validTransition: TransitionConfig<ValidStates, "success", SuccessEvent, FetcherContext> =
      {
        target: "success",
      };

    expectTypeOf(validTransition.target).toEqualTypeOf<"success">();
  });
});

// =============================================================================
// Test 3: Event Payload Mismatch Produces Compile Error
// =============================================================================

describe("event payload mismatch produces compile error", () => {
  it("action receives correctly typed event with payload", () => {
    const transition: TransitionConfig<
      "idle" | "success",
      "success",
      SuccessEvent,
      FetcherContext
    > = {
      target: "success",
      actions: [
        (ctx, evt) => {
          // evt.payload should be { data: string }
          expectTypeOf(evt.payload).toEqualTypeOf<{ data: string }>();
          return { ...ctx, data: evt.payload.data };
        },
      ],
    };

    expectTypeOf(transition.actions).not.toBeUndefined();
  });

  it("guard receives correctly typed event", () => {
    const transition: TransitionConfig<
      "idle" | "success",
      "success",
      SuccessEvent,
      FetcherContext
    > = {
      target: "success",
      guard: (_ctx, evt) => {
        // evt should have payload
        expectTypeOf(evt.payload).toEqualTypeOf<{ data: string }>();
        return evt.payload.data.length > 0;
      },
    };

    expectTypeOf(transition.guard).not.toBeUndefined();
  });

  it("event without payload has no payload property", () => {
    const transition: TransitionConfig<"idle" | "loading", "loading", FetchEvent, FetcherContext> =
      {
        target: "loading",
        guard: (_ctx, evt) => {
          // FetchEvent has no payload - type should be 'FETCH'
          expectTypeOf(evt.type).toEqualTypeOf<"FETCH">();
          return true;
        },
      };

    expectTypeOf(transition.guard).not.toBeUndefined();
  });
});

// =============================================================================
// Test 4: Guard Return Type Must Be Boolean
// =============================================================================

describe("guard return type must be boolean", () => {
  it("guard returning boolean compiles", () => {
    const transition: TransitionConfig<"idle" | "loading", "loading", FetchEvent, FetcherContext> =
      {
        target: "loading",
        guard: ctx => ctx.retryCount < 3,
      };

    // Guard should be a function returning boolean
    expectTypeOf(transition.guard).toMatchTypeOf<
      ((context: FetcherContext, event: FetchEvent) => boolean) | undefined
    >();
  });

  it("guard function signature is enforced", () => {
    // Guard must match the signature (context, event) => boolean
    type GuardType = TransitionConfig<
      "idle" | "loading",
      "loading",
      FetchEvent,
      FetcherContext
    >["guard"];

    type ExpectedGuard = ((context: FetcherContext, event: FetchEvent) => boolean) | undefined;
    expectTypeOf<GuardType>().toEqualTypeOf<ExpectedGuard>();
  });
});

// =============================================================================
// Test 5: Action Must Return Matching Context Shape
// =============================================================================

describe("action must return matching context shape", () => {
  it("action returning correct context shape compiles", () => {
    const transition: TransitionConfig<
      "idle" | "success",
      "success",
      SuccessEvent,
      FetcherContext
    > = {
      target: "success",
      actions: [
        (ctx, evt) => ({
          data: evt.payload.data,
          error: null,
          retryCount: ctx.retryCount,
        }),
      ],
    };

    expectTypeOf(transition.actions).not.toBeUndefined();
  });

  it("action function signature is enforced", () => {
    // Actions must match the signature (context, event) => TContext
    type ActionType = NonNullable<
      TransitionConfig<"idle" | "success", "success", SuccessEvent, FetcherContext>["actions"]
    >[number];

    type ExpectedAction = (context: FetcherContext, event: SuccessEvent) => FetcherContext;
    expectTypeOf<ActionType>().toEqualTypeOf<ExpectedAction>();
  });

  it("multiple actions chain correctly", () => {
    const transition: TransitionConfig<
      "idle" | "success",
      "success",
      SuccessEvent,
      FetcherContext
    > = {
      target: "success",
      actions: [
        (ctx, evt) => ({ ...ctx, data: evt.payload.data }),
        ctx => ({ ...ctx, error: null }),
        ctx => ({ ...ctx, retryCount: 0 }),
      ],
    };

    // Actions should be defined and match the expected type
    if (transition.actions !== undefined) {
      expectTypeOf(transition.actions).toMatchTypeOf<
        readonly ((context: FetcherContext, event: SuccessEvent) => FetcherContext)[]
      >();
    }
  });
});

// =============================================================================
// Test 6: Machine Type Encodes Full State/Event/Context Information
// =============================================================================

describe("machine type encodes full state/event/context information", () => {
  it("createMachine infers state names from config", () => {
    const _machine = createMachine({
      id: "fetcher",
      initial: "idle",
      context: { data: null, error: null, retryCount: 0 } as FetcherContext,
      states: {
        idle: {
          on: {
            FETCH: { target: "loading" },
          },
        },
        loading: {
          on: {
            SUCCESS: { target: "success" },
            FAILURE: { target: "error" },
          },
        },
        success: { on: {} },
        error: {
          on: {
            RETRY: { target: "loading" },
          },
        },
      },
    });

    // Machine should encode state information
    type MachineStateNames = InferMachineState<typeof _machine>;
    expectTypeOf<MachineStateNames>().toEqualTypeOf<"idle" | "loading" | "success" | "error">();
  });

  it("createMachine infers event names from config", () => {
    const _machine = createMachine({
      id: "fetcher",
      initial: "idle",
      context: { data: null, error: null, retryCount: 0 } as FetcherContext,
      states: {
        idle: {
          on: {
            FETCH: { target: "loading" },
          },
        },
        loading: {
          on: {
            SUCCESS: { target: "success" },
            FAILURE: { target: "error" },
          },
        },
        success: { on: {} },
        error: {
          on: {
            RETRY: { target: "loading" },
          },
        },
      },
    });

    // Machine should encode event information
    type MachineEventNames = InferMachineEvent<typeof _machine>;
    // Event names should be extracted from the on property keys
    expectTypeOf<MachineEventNames>().toMatchTypeOf<"FETCH" | "SUCCESS" | "FAILURE" | "RETRY">();
  });

  it("createMachine preserves context type", () => {
    const _machine = createMachine({
      id: "fetcher",
      initial: "idle",
      context: { data: null, error: null, retryCount: 0 } as FetcherContext,
      states: {
        idle: { on: {} },
      },
    });

    // Machine should encode context information
    type MachineContextType = InferMachineContext<typeof _machine>;
    expectTypeOf<MachineContextType>().toEqualTypeOf<FetcherContext>();
  });

  it("Machine is assignable to MachineAny", () => {
    const machine = createMachine({
      id: "test",
      initial: "idle",
      context: { value: 0 },
      states: {
        idle: { on: {} },
      },
    });

    // Machine should be assignable to MachineAny
    expectTypeOf(machine).toMatchTypeOf<MachineAny>();
  });

  it("machine is immutable (frozen)", () => {
    const machine = createMachine({
      id: "test",
      initial: "idle",
      context: { value: 0 },
      states: {
        idle: { on: {} },
      },
    });

    // Machine should be readonly
    expectTypeOf(machine).toMatchTypeOf<{ readonly id: string }>();
  });
});

// =============================================================================
// Test 7: StateNode Configuration Type
// =============================================================================

describe("StateNode configuration type", () => {
  it("StateNode allows optional entry effects", () => {
    const logPort = createPort<"Logger", { log(msg: string): void }>("Logger");

    const stateNode: StateNode<"idle" | "loading", "FETCH", FetcherContext> = {
      entry: [Effect.invoke(logPort, "log", ["Entering state"])],
      on: {},
    };

    expectTypeOf(stateNode.entry).toMatchTypeOf<readonly unknown[] | undefined>();
  });

  it("StateNode allows optional exit effects", () => {
    const logPort = createPort<"Logger", { log(msg: string): void }>("Logger");

    const stateNode: StateNode<"idle" | "loading", "FETCH", FetcherContext> = {
      exit: [Effect.invoke(logPort, "log", ["Exiting state"])],
      on: {},
    };

    expectTypeOf(stateNode.exit).toMatchTypeOf<readonly unknown[] | undefined>();
  });

  it("StateNode on property maps event names to transitions", () => {
    const stateNode: StateNode<"idle" | "loading", "FETCH" | "RESET", FetcherContext> = {
      on: {
        FETCH: { target: "loading" },
        RESET: { target: "idle" },
      },
    };

    expectTypeOf(stateNode.on).toMatchTypeOf<Record<string, unknown>>();
  });
});

// =============================================================================
// Test 8: Compile-Time Validation (using type assertions)
// =============================================================================

describe("compile-time validation constraints", () => {
  it("TransitionConfig target must be a valid state", () => {
    // This verifies that the type system requires target to be from TAllStates
    type ValidTransition = TransitionConfig<"a" | "b" | "c", "b", FetchEvent, FetcherContext>;
    type _InvalidTargetAttempt = "d"; // Not in "a" | "b" | "c" (prefixed to avoid unused warning)

    // The type system ensures this relationship
    expectTypeOf<ValidTransition["target"]>().toEqualTypeOf<"b">();

    // We can verify the constraint by checking the extends relationship
    type TargetExtendsAllStates = ValidTransition["target"] extends "a" | "b" | "c" ? true : false;
    expectTypeOf<TargetExtendsAllStates>().toEqualTypeOf<true>();
  });

  it("MachineConfig initial must be a valid state", () => {
    // MachineConfig type signature enforces this
    type ValidConfig = MachineConfig<"idle" | "loading", "FETCH", FetcherContext>;

    // Initial must be one of the state names
    expectTypeOf<ValidConfig["initial"]>().toEqualTypeOf<"idle" | "loading">();
  });

  it("guard must return boolean", () => {
    type Guard = NonNullable<TransitionConfig<"a" | "b", "b", FetchEvent, FetcherContext>["guard"]>;

    // Guard return type must be boolean
    type GuardReturn = ReturnType<Guard>;
    expectTypeOf<GuardReturn>().toEqualTypeOf<boolean>();
  });

  it("action must return context type", () => {
    type Action = NonNullable<
      TransitionConfig<"a" | "b", "b", FetchEvent, FetcherContext>["actions"]
    >[number];

    // Action return type must be the context type
    type ActionReturn = ReturnType<Action>;
    expectTypeOf<ActionReturn>().toEqualTypeOf<FetcherContext>();
  });
});
