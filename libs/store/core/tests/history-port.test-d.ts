/**
 * Type-level tests for history port
 */

import { describe, expectTypeOf, it } from "vitest";
import type {
  StatePortDef,
  InferStateType,
  InferActionsType,
  ActionMap,
  HistoryState,
  HistoryActions,
} from "../src/index.js";
import { createStatePort, createHistoryPort, createHistoryActions } from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface CounterState {
  count: number;
}

interface CounterActions extends ActionMap<CounterState> {
  increment: (state: CounterState) => CounterState;
  add: (state: CounterState, payload: number) => CounterState;
}

const CounterPort = createStatePort<CounterState, CounterActions>()({ name: "Counter" });
type CounterHistoryPort = ReturnType<
  typeof createHistoryPort<"Counter", CounterState, CounterActions>
>;

// =============================================================================
// createHistoryPort type inference
// =============================================================================

describe("createHistoryPort type inference", () => {
  it("InferStateType resolves to HistoryState<TState>", () => {
    expectTypeOf<InferStateType<CounterHistoryPort>>().toEqualTypeOf<HistoryState<CounterState>>();
  });

  it("InferActionsType resolves to HistoryActions<TState>", () => {
    expectTypeOf<InferActionsType<CounterHistoryPort>>().toEqualTypeOf<
      HistoryActions<CounterState>
    >();
  });

  it("port type has template literal name", () => {
    expectTypeOf<CounterHistoryPort>().toMatchTypeOf<
      StatePortDef<"CounterHistory", HistoryState<CounterState>, HistoryActions<CounterState>>
    >();
  });

  it("HistoryActions satisfies ActionMap constraint", () => {
    expectTypeOf<HistoryActions<CounterState>>().toMatchTypeOf<
      ActionMap<HistoryState<CounterState>>
    >();
  });

  it("createHistoryPort accepts StatePortDef and returns correctly typed port", () => {
    const port = createHistoryPort(CounterPort);
    expectTypeOf(port).toEqualTypeOf<CounterHistoryPort>();
  });
});

// =============================================================================
// createHistoryActions type inference
// =============================================================================

describe("createHistoryActions type inference", () => {
  it("returns correctly typed HistoryActions", () => {
    const actions = createHistoryActions<CounterState>();
    expectTypeOf(actions).toEqualTypeOf<HistoryActions<CounterState>>();
  });

  it("undo accepts HistoryState and returns HistoryState", () => {
    const actions = createHistoryActions<CounterState>();
    expectTypeOf(actions.undo).toEqualTypeOf<
      (state: HistoryState<CounterState>) => HistoryState<CounterState>
    >();
  });

  it("push accepts HistoryState and payload TState", () => {
    const actions = createHistoryActions<CounterState>();
    expectTypeOf(actions.push).toEqualTypeOf<
      (state: HistoryState<CounterState>, payload: CounterState) => HistoryState<CounterState>
    >();
  });
});
