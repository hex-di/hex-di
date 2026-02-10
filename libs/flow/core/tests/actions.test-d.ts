/**
 * Type-level tests for defineAction and composeActions.
 *
 * These tests verify compile-time type inference for:
 * 1. Action type is (context, event) => context
 * 2. NamedAction extends Action with actionName property
 * 3. defineAction returns NamedAction with correct type params
 * 4. composeActions returns NamedAction with correct type params
 * 5. Context and event types are preserved through composition
 */

import { describe, expectTypeOf, it } from "vitest";
import {
  defineAction,
  composeActions,
  type Action,
  type NamedAction,
} from "../src/machine/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface TestContext {
  readonly count: number;
  readonly label: string;
}

type TestEvent = { readonly type: "INCREMENT" } | { readonly type: "RESET" };

// =============================================================================
// Test 1: Action type signature
// =============================================================================

describe("Action type signature", () => {
  it("Action is a function of (context, event) => context", () => {
    type TestAction = Action<TestContext, TestEvent>;
    expectTypeOf<TestAction>().toBeFunction();
    expectTypeOf<TestAction>().returns.toEqualTypeOf<TestContext>();
  });

  it("Action with different context type", () => {
    type NumberAction = Action<number, { readonly type: "INC" }>;
    expectTypeOf<NumberAction>().toBeFunction();
    expectTypeOf<NumberAction>().returns.toEqualTypeOf<number>();
  });
});

// =============================================================================
// Test 2: NamedAction type signature
// =============================================================================

describe("NamedAction type signature", () => {
  it("NamedAction extends function with actionName property", () => {
    type TestNamedAction = NamedAction<TestContext, TestEvent>;
    expectTypeOf<TestNamedAction>().toBeFunction();
    expectTypeOf<TestNamedAction["actionName"]>().toBeString();
  });

  it("NamedAction return type matches context type", () => {
    type TestNamedAction = NamedAction<TestContext, TestEvent>;
    expectTypeOf<TestNamedAction>().returns.toEqualTypeOf<TestContext>();
  });
});

// =============================================================================
// Test 3: defineAction type inference
// =============================================================================

describe("defineAction type inference", () => {
  it("returns NamedAction with inferred types", () => {
    const action = defineAction("test", (ctx: TestContext, _evt: TestEvent) => ctx);
    expectTypeOf(action).toMatchTypeOf<NamedAction<TestContext, TestEvent>>();
    expectTypeOf(action.actionName).toBeString();
  });

  it("infers context type from callback", () => {
    const action = defineAction("inc", (ctx: TestContext) => ({
      ...ctx,
      count: ctx.count + 1,
    }));
    expectTypeOf(action).toMatchTypeOf<NamedAction<TestContext, unknown>>();
  });

  it("result is callable with correct signature", () => {
    const action = defineAction("test", (ctx: TestContext, _evt: TestEvent) => ctx);
    const result = action({ count: 0, label: "a" }, { type: "INCREMENT" });
    expectTypeOf(result).toEqualTypeOf<TestContext>();
  });
});

// =============================================================================
// Test 4: composeActions type inference
// =============================================================================

describe("composeActions type inference", () => {
  it("returns NamedAction with same type params", () => {
    const a1 = defineAction<TestContext, TestEvent>("a", ctx => ctx);
    const a2 = defineAction<TestContext, TestEvent>("b", ctx => ctx);
    const composed = composeActions(a1, a2);
    expectTypeOf(composed).toMatchTypeOf<NamedAction<TestContext, TestEvent>>();
    expectTypeOf(composed.actionName).toBeString();
  });

  it("composed action is callable", () => {
    const a1 = defineAction<TestContext, TestEvent>("a", ctx => ctx);
    const composed = composeActions(a1);
    const result = composed({ count: 0, label: "x" }, { type: "RESET" });
    expectTypeOf(result).toEqualTypeOf<TestContext>();
  });

  it("preserves context type through composition", () => {
    const increment = defineAction<TestContext, TestEvent>("inc", ctx => ({
      ...ctx,
      count: ctx.count + 1,
    }));
    const setLabel = defineAction<TestContext, TestEvent>("label", ctx => ({
      ...ctx,
      label: "done",
    }));
    const composed = composeActions(increment, setLabel);
    expectTypeOf(composed).returns.toEqualTypeOf<TestContext>();
  });
});
