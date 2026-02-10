import { describe, it, expectTypeOf } from "vitest";
import {
  useStateValue,
  useActions,
  useStatePort,
  useAtom,
  useDerived,
  useAsyncDerived,
  useAsyncDerivedSuspense,
} from "../src/index.js";
import type {
  UseStatePortResult,
  UseAsyncDerivedResult,
  UseAsyncDerivedSuspenseResult,
} from "../src/index.js";
import {
  createStatePort,
  createAtomPort,
  createDerivedPort,
  createAsyncDerivedPort,
} from "@hex-di/store";
import type { DeepReadonly, ActionMap, BoundActions, AsyncDerivedSnapshot } from "@hex-di/store";

// =============================================================================
// Test Types
// =============================================================================

interface TestState {
  readonly count: number;
  readonly label: string;
}

interface TestActions extends ActionMap<TestState> {
  increment: (state: TestState) => TestState;
  add: (state: TestState, amount: number) => TestState;
}

const TestStatePort = createStatePort<TestState, TestActions>()({ name: "TestState" });
const TestAtomPort = createAtomPort<string>()({ name: "TestAtom" });
const TestDerivedPort = createDerivedPort<number>()({ name: "TestDerived" });
const TestAsyncPort = createAsyncDerivedPort<string>()({ name: "TestAsync" });

// =============================================================================
// Tests
// =============================================================================

describe("React hook type-level tests", () => {
  it("useStateValue returns DeepReadonly<TState>", () => {
    expectTypeOf(useStateValue(TestStatePort)).toEqualTypeOf<DeepReadonly<TestState>>();
  });

  it("useStateValue with selector returns selected type", () => {
    expectTypeOf(useStateValue(TestStatePort, s => s.count)).toEqualTypeOf<number>();
  });

  it("useActions returns BoundActions", () => {
    expectTypeOf(useActions(TestStatePort)).toEqualTypeOf<BoundActions<TestState, TestActions>>();
  });

  it("useStatePort returns state and actions", () => {
    expectTypeOf(useStatePort(TestStatePort)).toEqualTypeOf<
      UseStatePortResult<TestState, TestActions>
    >();
  });

  it("useAtom returns [DeepReadonly<TValue>, setter]", () => {
    const result = useAtom(TestAtomPort);
    expectTypeOf(result[0]).toEqualTypeOf<string>();
    expectTypeOf(result[1]).toBeFunction();
  });

  it("useAtom setter accepts TValue or updater function", () => {
    const [, setter] = useAtom(TestAtomPort);
    expectTypeOf(setter).toBeFunction();
    expectTypeOf(setter).parameter(0).toEqualTypeOf<string | ((prev: string) => string)>();
  });

  it("useDerived returns DeepReadonly<TResult>", () => {
    expectTypeOf(useDerived(TestDerivedPort)).toEqualTypeOf<number>();
  });

  it("useAsyncDerived returns snapshot and refresh", () => {
    const result = useAsyncDerived(TestAsyncPort);
    expectTypeOf(result.snapshot).toEqualTypeOf<AsyncDerivedSnapshot<string, never>>();
    expectTypeOf(result.refresh).toEqualTypeOf<() => void>();
  });

  it("useAsyncDerivedSuspense returns data and refresh", () => {
    expectTypeOf(useAsyncDerivedSuspense(TestAsyncPort)).toEqualTypeOf<
      UseAsyncDerivedSuspenseResult<string>
    >();
  });

  it("useAsyncDerivedSuspense data is non-optional DeepReadonly<TResult>", () => {
    const result = useAsyncDerivedSuspense(TestAsyncPort);
    expectTypeOf(result.data).toEqualTypeOf<DeepReadonly<string>>();
    // Verify it's NOT optional
    expectTypeOf<undefined>().not.toMatchTypeOf<typeof result.data>();
  });
});
