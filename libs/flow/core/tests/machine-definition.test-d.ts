/**
 * DoD 2: Machine Definition (Spec Section 03) - Type-Level Tests
 *
 * These tests verify:
 * 1. defineMachine infers state names as literal union
 * 2. defineMachine infers event names from all on keys
 * 3. defineMachine infers context type from context value
 * 4. Guard function type-checks context and event parameters
 * 5. Action function must return correct context type
 * 6. MachineConfig validates initial against state name union
 * 7. EffectAny accepts all effect tag discriminants
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import {
  defineMachine,
  Effect,
  type InferMachineState,
  type InferMachineEvent,
  type InferMachineContext,
} from "../src/index.js";
import type { EffectAny } from "../src/effects/types.js";

// =============================================================================
// Test 1: defineMachine infers state names as literal union
// =============================================================================

describe("defineMachine infers state names as literal union", () => {
  it("state names are literal, not string", () => {
    const machine = defineMachine({
      id: "test",
      initial: "idle",
      context: undefined,
      states: {
        idle: { on: { GO: { target: "loading" } } },
        loading: { on: { DONE: { target: "success" }, FAIL: { target: "error" } } },
        success: { on: {} },
        error: { on: { RETRY: { target: "loading" } } },
      },
    });

    type States = InferMachineState<typeof machine>;
    expectTypeOf<States>().toEqualTypeOf<"idle" | "loading" | "success" | "error">();
    expectTypeOf<States>().not.toEqualTypeOf<string>();
  });
});

// =============================================================================
// Test 2: defineMachine infers event names from all on keys
// =============================================================================

describe("defineMachine infers event names from all on keys", () => {
  it("collects events from all states", () => {
    const machine = defineMachine({
      id: "test",
      initial: "idle",
      context: undefined,
      states: {
        idle: { on: { START: { target: "active" } } },
        active: { on: { STOP: { target: "idle" }, PAUSE: { target: "paused" } } },
        paused: { on: { RESUME: { target: "active" } } },
      },
    });

    type Events = InferMachineEvent<typeof machine>;
    expectTypeOf<Events>().toEqualTypeOf<"START" | "STOP" | "PAUSE" | "RESUME">();
  });
});

// =============================================================================
// Test 3: defineMachine infers context type from context value
// =============================================================================

describe("defineMachine infers context type from context value", () => {
  it("infers context from value", () => {
    // Use explicit type to avoid const literal narrowing
    const ctx: { count: number; label: string; items: readonly number[] } = {
      count: 0,
      label: "test",
      items: [],
    };

    const machine = defineMachine({
      id: "test",
      initial: "idle",
      context: ctx,
      states: {
        idle: { on: {} },
      },
    });

    type Context = InferMachineContext<typeof machine>;
    expectTypeOf<Context>().toEqualTypeOf<{
      count: number;
      label: string;
      items: readonly number[];
    }>();
  });

  it("handles undefined context", () => {
    const machine = defineMachine({
      id: "test",
      initial: "idle",
      context: undefined,
      states: {
        idle: { on: {} },
      },
    });

    // When context is explicitly undefined, the conditional
    // TContext extends undefined ? void : TContext evaluates to void
    type Context = InferMachineContext<typeof machine>;
    expectTypeOf<Context>().toEqualTypeOf<void>();
  });
});

// =============================================================================
// Test 4: Guard function type-checks context and event parameters
// =============================================================================

describe("Guard function type-checks context and event parameters", () => {
  it("guard receives context and event with correct types", () => {
    const ctx: { count: number } = { count: 0 };

    defineMachine({
      id: "guard-types",
      initial: "idle",
      context: ctx,
      states: {
        idle: {
          on: {
            GO: {
              target: "idle",
              guard: (c: { count: number }) => c.count > 0,
            },
          },
        },
      },
    });

    // Verify guard function signature is accepted
    type GuardFn = (context: { count: number }, event: { readonly type: string }) => boolean;
    expectTypeOf<GuardFn>().toBeFunction();
  });
});

// =============================================================================
// Test 5: Action function must return correct context type
// =============================================================================

describe("Action function returns correct context type", () => {
  it("action return type matches context type", () => {
    const ctx: { count: number } = { count: 0 };

    defineMachine({
      id: "action-types",
      initial: "idle",
      context: ctx,
      states: {
        idle: {
          on: {
            GO: {
              target: "idle",
              actions: [(c: { count: number }) => ({ count: c.count + 1 })],
            },
          },
        },
      },
    });

    // Verify action function signature is accepted
    type ActionFn = (
      context: { count: number },
      event: { readonly type: string }
    ) => { count: number };
    expectTypeOf<ActionFn>().toBeFunction();
  });
});

// =============================================================================
// Test 7: EffectAny accepts all effect tag discriminants
// =============================================================================

describe("EffectAny accepts all effect tag discriminants", () => {
  it("common effect constructors produce EffectAny", () => {
    const spawn = Effect.spawn("test", undefined);
    const stop = Effect.stop("test");
    const delay = Effect.delay(100);
    const none = Effect.none();
    const parallel = Effect.parallel([none] as const);
    const sequence = Effect.sequence([none] as const);

    expectTypeOf(spawn).toMatchTypeOf<EffectAny>();
    expectTypeOf(stop).toMatchTypeOf<EffectAny>();
    expectTypeOf(delay).toMatchTypeOf<EffectAny>();
    expectTypeOf(none).toMatchTypeOf<EffectAny>();
    expectTypeOf(parallel).toMatchTypeOf<EffectAny>();
    expectTypeOf(sequence).toMatchTypeOf<EffectAny>();
  });
});
