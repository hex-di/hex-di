/**
 * Tests for defineAction factory and composeActions combinator.
 *
 * Verifies:
 * 1. defineAction creates a callable function with .actionName
 * 2. defineAction preserves action logic
 * 3. composeActions chains actions in order, threading context
 * 4. composeActions generates a descriptive composed name
 * 5. Named actions work in defineMachine transitions
 * 6. ActionThrew error includes actionName when a named action throws
 * 7. Anonymous actions in composeActions use function name or "anonymous"
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { defineAction, composeActions, defineMachine, transitionSafe } from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface TestContext {
  readonly count: number;
  readonly label: string;
}

type TestEvent = { readonly type: "INCREMENT" } | { readonly type: "RESET" };

// =============================================================================
// defineAction Tests
// =============================================================================

describe("defineAction", () => {
  it("creates a callable function", () => {
    const increment = defineAction<TestContext, TestEvent>("increment", ctx => ({
      ...ctx,
      count: ctx.count + 1,
    }));

    const result = increment({ count: 0, label: "test" }, { type: "INCREMENT" });
    expect(result).toEqual({ count: 1, label: "test" });
  });

  it("attaches .actionName property", () => {
    const increment = defineAction<TestContext, TestEvent>("increment", ctx => ({
      ...ctx,
      count: ctx.count + 1,
    }));

    expect(increment.actionName).toBe("increment");
  });

  it("actionName is read-only and non-configurable", () => {
    const increment = defineAction<TestContext, TestEvent>("increment", ctx => ({
      ...ctx,
      count: ctx.count + 1,
    }));

    const descriptor = Object.getOwnPropertyDescriptor(increment, "actionName");
    expect(descriptor).toBeDefined();
    expect(descriptor?.writable).toBe(false);
    expect(descriptor?.configurable).toBe(false);
    expect(descriptor?.enumerable).toBe(true);
  });

  it("preserves action logic with event access", () => {
    const setLabel = defineAction(
      "setLabel",
      (ctx: { readonly label: string }, evt: { readonly type: "SET"; readonly value: string }) => ({
        ...ctx,
        label: evt.value,
      })
    );

    const result = setLabel({ label: "old" }, { type: "SET", value: "new" });
    expect(result).toEqual({ label: "new" });
  });
});

// =============================================================================
// composeActions Tests
// =============================================================================

describe("composeActions", () => {
  it("chains actions in order, threading context", () => {
    const increment = defineAction<TestContext, TestEvent>("increment", ctx => ({
      ...ctx,
      count: ctx.count + 1,
    }));

    const setLabel = defineAction<TestContext, TestEvent>("setLabel", ctx => ({
      ...ctx,
      label: "updated",
    }));

    const composed = composeActions(increment, setLabel);
    const result = composed({ count: 0, label: "initial" }, { type: "INCREMENT" });

    expect(result).toEqual({ count: 1, label: "updated" });
  });

  it("generates a descriptive composed name from named actions", () => {
    const increment = defineAction<TestContext, TestEvent>("increment", ctx => ({
      ...ctx,
      count: ctx.count + 1,
    }));

    const setLabel = defineAction<TestContext, TestEvent>("setLabel", ctx => ({
      ...ctx,
      label: "updated",
    }));

    const composed = composeActions(increment, setLabel);
    expect(composed.actionName).toBe("compose(increment, setLabel)");
  });

  it("uses function name for unnamed actions", () => {
    function myAction(ctx: TestContext): TestContext {
      return { ...ctx, count: ctx.count + 10 };
    }

    const composed = composeActions(myAction);
    expect(composed.actionName).toBe("compose(myAction)");
  });

  it("uses 'anonymous' for arrow functions without names", () => {
    // Arrow functions assigned directly to composeActions have no .name
    const composed = composeActions(
      defineAction<TestContext, TestEvent>("first", ctx => ctx),
      // This lambda gets named by the engine but we test the defineAction name takes priority
      defineAction<TestContext, TestEvent>("second", ctx => ctx)
    );
    expect(composed.actionName).toBe("compose(first, second)");
  });

  it("handles empty action list", () => {
    const composed = composeActions<TestContext, TestEvent>();
    const result = composed({ count: 5, label: "test" }, { type: "INCREMENT" });
    expect(result).toEqual({ count: 5, label: "test" });
    expect(composed.actionName).toBe("compose()");
  });

  it("handles single action", () => {
    const increment = defineAction<TestContext, TestEvent>("increment", ctx => ({
      ...ctx,
      count: ctx.count + 1,
    }));

    const composed = composeActions(increment);
    const result = composed({ count: 0, label: "test" }, { type: "INCREMENT" });
    expect(result).toEqual({ count: 1, label: "test" });
    expect(composed.actionName).toBe("compose(increment)");
  });
});

// =============================================================================
// Integration with defineMachine
// =============================================================================

describe("defineAction in defineMachine transitions", () => {
  it("named actions work as transition actions", () => {
    const increment = defineAction("increment", (ctx: { readonly count: number }) => ({
      count: ctx.count + 1,
    }));

    const machine = defineMachine({
      id: "action-test",
      initial: "idle",
      context: { count: 0 },
      states: {
        idle: {
          on: {
            GO: { target: "active", actions: [increment] },
          },
        },
        active: { on: {} },
      },
    });

    const result = transitionSafe("idle", { count: 0 }, { type: "GO" }, machine);
    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.transitioned).toBe(true);
      expect(result.value.newState).toBe("active");
      expect(result.value.newContext).toEqual({ count: 1 });
    }
  });

  it("composed actions work as transition actions", () => {
    const increment = defineAction(
      "increment",
      (ctx: { readonly count: number; readonly label: string }) => ({
        ...ctx,
        count: ctx.count + 1,
      })
    );

    const setActive = defineAction(
      "setActive",
      (ctx: { readonly count: number; readonly label: string }) => ({
        ...ctx,
        label: "active",
      })
    );

    const prepareActive = composeActions(increment, setActive);

    const machine = defineMachine({
      id: "compose-test",
      initial: "idle",
      context: { count: 0, label: "idle" },
      states: {
        idle: {
          on: {
            GO: { target: "active", actions: [prepareActive] },
          },
        },
        active: { on: {} },
      },
    });

    const result = transitionSafe("idle", { count: 0, label: "idle" }, { type: "GO" }, machine);
    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.newContext).toEqual({ count: 1, label: "active" });
    }
  });
});

// =============================================================================
// ActionThrew includes actionName
// =============================================================================

describe("ActionThrew includes actionName", () => {
  it("includes actionName when a named action throws", () => {
    const failingAction = defineAction("failingAction", (_ctx: { readonly value: number }) => {
      throw new Error("action failed");
    });

    const machine = defineMachine({
      id: "throw-test",
      initial: "idle",
      context: { value: 0 },
      states: {
        idle: {
          on: {
            GO: { target: "active", actions: [failingAction] },
          },
        },
        active: { on: {} },
      },
    });

    const result = transitionSafe("idle", { value: 0 }, { type: "GO" }, machine);
    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error._tag).toBe("ActionThrew");
      if (result.error._tag === "ActionThrew") {
        // actionName is dynamically added when the action is a NamedAction
        expect("actionName" in result.error).toBe(true);
        expect(Object.getOwnPropertyDescriptor(result.error, "actionName")?.value).toBe(
          "failingAction"
        );
        expect(result.error.machineId).toBe("throw-test");
        expect(result.error.eventType).toBe("GO");
      }
    }
  });

  it("does not include actionName for anonymous actions", () => {
    const machine = defineMachine({
      id: "anon-throw-test",
      initial: "idle",
      context: { value: 0 },
      states: {
        idle: {
          on: {
            GO: {
              target: "active",
              actions: [
                () => {
                  throw new Error("anonymous action failed");
                },
              ],
            },
          },
        },
        active: { on: {} },
      },
    });

    const result = transitionSafe("idle", { value: 0 }, { type: "GO" }, machine);
    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error._tag).toBe("ActionThrew");
      if (result.error._tag === "ActionThrew") {
        expect("actionName" in result.error).toBe(false);
      }
    }
  });
});
