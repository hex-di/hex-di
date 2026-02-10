/**
 * Type-level tests for store effect types
 */

import { describe, expectTypeOf, it } from "vitest";
import type {
  EffectMap,
  EffectContext,
  ActionEvent,
  ActionMap,
  DeepReadonly,
} from "../src/index.js";
import type { ResultAsync } from "@hex-di/result";

// =============================================================================
// Test Fixtures
// =============================================================================

interface TodoState {
  items: string[];
  filter: "all" | "active" | "done";
}

interface TodoActions extends ActionMap<TodoState> {
  addItem: (state: TodoState, payload: string) => TodoState;
  setFilter: (state: TodoState, payload: "all" | "active" | "done") => TodoState;
  clear: (state: TodoState) => TodoState;
}

// =============================================================================
// EffectMap
// =============================================================================

describe("EffectMap", () => {
  it("keys match action names", () => {
    type Effects = EffectMap<TodoState, TodoActions>;
    expectTypeOf<keyof Effects>().toEqualTypeOf<keyof TodoActions>();
  });

  it("values return void or ResultAsync", () => {
    type Effects = EffectMap<TodoState, TodoActions>;
    type AddItemEffect = Effects["addItem"];
    type ReturnType_ = ReturnType<AddItemEffect>;
    expectTypeOf<ReturnType_>().toMatchTypeOf<void | ResultAsync<void, unknown>>();
  });
});

// =============================================================================
// EffectContext
// =============================================================================

describe("EffectContext", () => {
  it("payload matches action payload type", () => {
    type Ctx = EffectContext<TodoState, TodoActions, "addItem">;
    expectTypeOf<Ctx["payload"]>().toEqualTypeOf<string>();
  });

  it("state is DeepReadonly", () => {
    type Ctx = EffectContext<TodoState, TodoActions, "addItem">;
    expectTypeOf<Ctx["state"]>().toEqualTypeOf<DeepReadonly<TodoState>>();
  });
});

// =============================================================================
// ActionEvent
// =============================================================================

describe("ActionEvent", () => {
  it("phase is 'action' | 'effect-error'", () => {
    expectTypeOf<ActionEvent["phase"]>().toEqualTypeOf<"action" | "effect-error">();
  });

  it("has all required fields typed", () => {
    expectTypeOf<ActionEvent["portName"]>().toEqualTypeOf<string>();
    expectTypeOf<ActionEvent["actionName"]>().toEqualTypeOf<string>();
    expectTypeOf<ActionEvent["payload"]>().toEqualTypeOf<unknown>();
    expectTypeOf<ActionEvent["prevState"]>().toEqualTypeOf<unknown>();
    expectTypeOf<ActionEvent["nextState"]>().toEqualTypeOf<unknown>();
    expectTypeOf<ActionEvent["timestamp"]>().toEqualTypeOf<number>();
  });
});
