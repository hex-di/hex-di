/**
 * Type-level tests for service interfaces
 */

import { describe, expectTypeOf, it } from "vitest";
import type {
  StateService,
  AtomService,
  DerivedService,
  AsyncDerivedService,
  LinkedDerivedService,
  AsyncDerivedSnapshot,
  DeepReadonly,
  BoundActions,
  Unsubscribe,
} from "../src/index.js";

// =============================================================================
// StateService
// =============================================================================

describe("StateService types", () => {
  type TestState = { count: number; name: string };
  type TestActions = {
    increment: (state: TestState) => TestState;
    setName: (state: TestState, payload: string) => TestState;
  };
  type Svc = StateService<TestState, TestActions>;

  it("state is DeepReadonly<TState>", () => {
    expectTypeOf<Svc["state"]>().toEqualTypeOf<DeepReadonly<TestState>>();
  });

  it("actions are BoundActions<TState, TActions>", () => {
    expectTypeOf<Svc["actions"]>().toEqualTypeOf<BoundActions<TestState, TestActions>>();
  });

  it("subscribe returns Unsubscribe", () => {
    type SubReturn = ReturnType<Svc["subscribe"]>;
    expectTypeOf<SubReturn>().toEqualTypeOf<Unsubscribe>();
  });
});

// =============================================================================
// AtomService
// =============================================================================

describe("AtomService types", () => {
  type Svc = AtomService<number>;

  it("value is DeepReadonly<TValue>", () => {
    expectTypeOf<Svc["value"]>().toEqualTypeOf<DeepReadonly<number>>();
  });

  it("set accepts TValue", () => {
    expectTypeOf<Svc["set"]>().toBeCallableWith(42);
  });

  it("update accepts fn: (current: TValue) => TValue", () => {
    expectTypeOf<Svc["update"]>().toBeCallableWith((n: number) => n + 1);
  });
});

// =============================================================================
// DerivedService
// =============================================================================

describe("DerivedService types", () => {
  type Svc = DerivedService<{ total: number }>;

  it("value is DeepReadonly<TResult>", () => {
    expectTypeOf<Svc["value"]>().toEqualTypeOf<DeepReadonly<{ total: number }>>();
  });
});

// =============================================================================
// AsyncDerivedService
// =============================================================================

describe("AsyncDerivedService types", () => {
  type Svc = AsyncDerivedService<string, Error>;

  it("snapshot is AsyncDerivedSnapshot<TResult, E>", () => {
    expectTypeOf<Svc["snapshot"]>().toEqualTypeOf<AsyncDerivedSnapshot<string, Error>>();
  });

  it("status is narrowed union", () => {
    expectTypeOf<Svc["status"]>().toEqualTypeOf<"idle" | "loading" | "success" | "error">();
  });

  it("isLoading is boolean", () => {
    expectTypeOf<Svc["isLoading"]>().toEqualTypeOf<boolean>();
  });

  it("refresh is callable", () => {
    expectTypeOf<Svc["refresh"]>().toBeCallableWith();
  });
});

// =============================================================================
// LinkedDerivedService
// =============================================================================

describe("LinkedDerivedService types", () => {
  type Svc = LinkedDerivedService<number>;

  it("extends DerivedService", () => {
    expectTypeOf<Svc>().toMatchTypeOf<DerivedService<number>>();
  });

  it("has set method", () => {
    expectTypeOf<Svc["set"]>().toBeCallableWith(42);
  });
});

// =============================================================================
// AsyncDerivedSnapshot narrowing
// =============================================================================

describe("AsyncDerivedSnapshot narrowing", () => {
  it("success variant narrows data and error", () => {
    const snap: AsyncDerivedSnapshot<string, Error> = {
      status: "success",
      data: "ok",
      error: undefined,
      isLoading: false,
    };
    if (snap.status === "success") {
      expectTypeOf(snap.data).toEqualTypeOf<DeepReadonly<string>>();
      expectTypeOf(snap.error).toEqualTypeOf<undefined>();
    }
  });

  it("error variant narrows data and error", () => {
    const snap: AsyncDerivedSnapshot<string, Error> = {
      status: "error",
      data: undefined,
      error: new Error("fail"),
      isLoading: false,
    };
    if (snap.status === "error") {
      expectTypeOf(snap.error).toEqualTypeOf<Error>();
      expectTypeOf(snap.data).toEqualTypeOf<undefined>();
    }
  });

  it("loading variant may have previous data", () => {
    type Loading = Extract<AsyncDerivedSnapshot<string, Error>, { status: "loading" }>;
    expectTypeOf<Loading["data"]>().toEqualTypeOf<DeepReadonly<string> | undefined>();
  });
});
