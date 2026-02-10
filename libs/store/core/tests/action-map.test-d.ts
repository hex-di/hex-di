/**
 * Type-level tests for ActionMap and BoundActions
 */

import { describe, expectTypeOf, it } from "vitest";
import type { ActionMap, BoundActions, ActionReducer } from "../src/index.js";

// =============================================================================
// BoundActions
// =============================================================================

describe("BoundActions", () => {
  type State = { count: number };
  type Actions = {
    increment: (state: State) => State;
    add: (state: State, payload: number) => State;
    reset: (state: State) => State;
  };
  type Bound = BoundActions<State, Actions>;

  it("no-payload action becomes () => void", () => {
    expectTypeOf<Bound["increment"]>().toEqualTypeOf<() => void>();
  });

  it("payload action becomes (payload: P) => void", () => {
    expectTypeOf<Bound["add"]>().toEqualTypeOf<(payload: number) => void>();
  });

  it("preserves all action names as keys", () => {
    expectTypeOf<keyof Bound>().toEqualTypeOf<"increment" | "add" | "reset">();
  });

  it("all properties are readonly", () => {
    expectTypeOf<Bound>().toMatchTypeOf<Readonly<Record<string, (...args: never[]) => void>>>();
  });
});

// =============================================================================
// ActionReducer with NoPayload
// =============================================================================

describe("ActionReducer", () => {
  it("NoPayload default produces unary function", () => {
    type R = ActionReducer<number>;
    expectTypeOf<R>().toEqualTypeOf<(state: number) => number>();
  });

  it("explicit payload produces binary function", () => {
    type R = ActionReducer<number, string>;
    expectTypeOf<R>().toEqualTypeOf<(state: number, payload: string) => number>();
  });

  it("object payload works", () => {
    type Payload = { x: number; y: number };
    type R = ActionReducer<string, Payload>;
    expectTypeOf<R>().toEqualTypeOf<(state: string, payload: Payload) => string>();
  });
});

// =============================================================================
// ActionMap constraint
// =============================================================================

describe("ActionMap", () => {
  it("accepts no-payload reducers", () => {
    type M = ActionMap<number>;
    const m: M = { increment: (state: number) => state + 1 };
    expectTypeOf(m).toMatchTypeOf<ActionMap<number>>();
  });

  it("accepts payload reducers", () => {
    type M = ActionMap<number>;
    const m: M = { add: (state: number, _amount: never) => state };
    expectTypeOf(m).toMatchTypeOf<ActionMap<number>>();
  });
});
