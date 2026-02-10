/**
 * Type-level tests for States and Guards (DoD 3).
 *
 * These tests verify compile-time validation of:
 * 1. StateNode type discriminators (atomic, compound, parallel, final, history)
 * 2. Guard and NamedGuard type signatures
 * 3. Guard combinator type inference (and, or, not)
 * 4. TransitionConfig target validation
 * 5. StateNode compound state constraints
 */

import { describe, expectTypeOf, it } from "vitest";
import type {
  StateNode,
  StateNodeAny,
  TransitionConfig,
  TransitionConfigAny,
} from "../src/machine/index.js";
import { guard, and, or, not, type Guard, type NamedGuard } from "../src/machine/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

type TestStates = "idle" | "loading" | "success" | "error";
type TestEvents = "FETCH" | "SUCCESS" | "FAILURE" | "RESET";
interface TestContext {
  data: string | null;
  retryCount: number;
}

// =============================================================================
// Test 1: StateNode type discriminators
// =============================================================================

describe("StateNode type discriminators", () => {
  it("type field accepts 'atomic', 'compound', 'parallel', 'final', 'history'", () => {
    type Atomic = StateNode<TestStates, TestEvents, TestContext> & { readonly type: "atomic" };
    type Compound = StateNode<TestStates, TestEvents, TestContext> & { readonly type: "compound" };
    type Parallel = StateNode<TestStates, TestEvents, TestContext> & { readonly type: "parallel" };
    type Final = StateNode<TestStates, TestEvents, TestContext> & { readonly type: "final" };
    type History = StateNode<TestStates, TestEvents, TestContext> & { readonly type: "history" };

    expectTypeOf<Atomic["type"]>().toEqualTypeOf<"atomic">();
    expectTypeOf<Compound["type"]>().toEqualTypeOf<"compound">();
    expectTypeOf<Parallel["type"]>().toEqualTypeOf<"parallel">();
    expectTypeOf<Final["type"]>().toEqualTypeOf<"final">();
    expectTypeOf<History["type"]>().toEqualTypeOf<"history">();
  });

  it("type field is optional and defaults conceptually to 'atomic'", () => {
    type TypeField = StateNode<TestStates, TestEvents, TestContext>["type"];
    expectTypeOf<TypeField>().toEqualTypeOf<
      "atomic" | "compound" | "parallel" | "final" | "history" | undefined
    >();
  });

  it("StateNode is assignable to StateNodeAny", () => {
    const node: StateNode<TestStates, TestEvents, TestContext> = {
      on: { FETCH: { target: "loading" } },
    };
    expectTypeOf(node).toMatchTypeOf<StateNodeAny>();
  });

  it("compound StateNode has initial and states properties", () => {
    type CompoundNode = StateNode<TestStates, TestEvents, TestContext>;
    expectTypeOf<CompoundNode["initial"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<CompoundNode["states"]>().toEqualTypeOf<
      Record<string, StateNode<string, string, TestContext>> | undefined
    >();
  });

  it("StateNode has always and onDone optional properties", () => {
    type Node = StateNode<TestStates, TestEvents, TestContext>;
    expectTypeOf<Node["always"]>().not.toBeNever();
    expectTypeOf<Node["onDone"]>().not.toBeNever();
  });
});

// =============================================================================
// Test 2: Guard and NamedGuard type signatures
// =============================================================================

describe("Guard and NamedGuard type signatures", () => {
  it("Guard is a function of (context, event) => boolean", () => {
    type TestGuard = Guard<TestContext, { readonly type: "FETCH" }>;
    expectTypeOf<TestGuard>().toBeFunction();
    expectTypeOf<TestGuard>().returns.toBeBoolean();
  });

  it("NamedGuard extends Guard with guardName property", () => {
    type TestNamedGuard = NamedGuard<TestContext, { readonly type: "FETCH" }>;
    expectTypeOf<TestNamedGuard>().toBeFunction();
    expectTypeOf<TestNamedGuard["guardName"]>().toBeString();
  });

  it("guard factory returns NamedGuard", () => {
    const g = guard("test", (ctx: TestContext) => ctx.retryCount < 3);
    expectTypeOf(g).toMatchTypeOf<NamedGuard<TestContext, unknown>>();
    expectTypeOf(g.guardName).toBeString();
  });
});

// =============================================================================
// Test 3: Guard combinator type inference
// =============================================================================

describe("Guard combinator type inference", () => {
  it("and() returns NamedGuard with same type params", () => {
    const g1 = guard("a", (ctx: TestContext) => ctx.retryCount > 0);
    const g2 = guard("b", (ctx: TestContext) => ctx.data !== null);
    const combined = and(g1, g2);
    expectTypeOf(combined).toMatchTypeOf<NamedGuard<TestContext, unknown>>();
    expectTypeOf(combined.guardName).toBeString();
  });

  it("or() returns NamedGuard with same type params", () => {
    const g1 = guard("a", (ctx: TestContext) => ctx.retryCount > 0);
    const g2 = guard("b", (ctx: TestContext) => ctx.data !== null);
    const combined = or(g1, g2);
    expectTypeOf(combined).toMatchTypeOf<NamedGuard<TestContext, unknown>>();
  });

  it("not() returns NamedGuard with same type params", () => {
    const g = guard("a", (ctx: TestContext) => ctx.retryCount > 0);
    const negated = not(g);
    expectTypeOf(negated).toMatchTypeOf<NamedGuard<TestContext, unknown>>();
  });
});

// =============================================================================
// Test 4: TransitionConfig target validation
// =============================================================================

describe("TransitionConfig target validation", () => {
  it("target must be a member of TAllStates", () => {
    type ValidTransition = TransitionConfig<
      TestStates,
      "loading",
      { readonly type: "FETCH" },
      TestContext
    >;
    expectTypeOf<ValidTransition["target"]>().toEqualTypeOf<"loading">();
  });

  it("guard receives context and event", () => {
    type TC = TransitionConfig<TestStates, "loading", { readonly type: "FETCH" }, TestContext>;
    type GuardFn = NonNullable<TC["guard"]>;
    expectTypeOf<GuardFn>().toBeFunction();
    expectTypeOf<GuardFn>().returns.toBeBoolean();
  });

  it("actions receive context and event, return context", () => {
    type TC = TransitionConfig<TestStates, "loading", { readonly type: "FETCH" }, TestContext>;
    type ActionFn = NonNullable<TC["actions"]>[number];
    expectTypeOf<ActionFn>().toBeFunction();
    expectTypeOf<ReturnType<ActionFn>>().toEqualTypeOf<TestContext>();
  });

  it("TransitionConfig is assignable to TransitionConfigAny", () => {
    const config: TransitionConfig<TestStates, "loading", { readonly type: "FETCH" }, TestContext> =
      { target: "loading" };
    expectTypeOf(config).toMatchTypeOf<TransitionConfigAny>();
  });

  it("internal property is optional boolean", () => {
    type TC = TransitionConfig<TestStates, "idle", { readonly type: "RESET" }, TestContext>;
    expectTypeOf<TC["internal"]>().toEqualTypeOf<boolean | undefined>();
  });
});

// =============================================================================
// Test 5: StateNode on property transition typing
// =============================================================================

describe("StateNode on property typing", () => {
  it("on maps event names to TransitionConfigOrArray", () => {
    const node: StateNode<TestStates, TestEvents, TestContext> = {
      on: {
        FETCH: { target: "loading" },
        RESET: "idle",
      },
    };
    expectTypeOf(node.on).not.toBeUndefined();
  });

  it("on is optional (terminal states)", () => {
    const node: StateNode<TestStates, TestEvents, TestContext> = {};
    expectTypeOf(node).toMatchTypeOf<StateNodeAny>();
  });

  it("string shorthand is valid for on transitions", () => {
    const node: StateNode<TestStates, TestEvents, TestContext> = {
      on: {
        FETCH: "loading",
        RESET: "idle",
      },
    };
    expectTypeOf(node).toMatchTypeOf<StateNodeAny>();
  });
});
