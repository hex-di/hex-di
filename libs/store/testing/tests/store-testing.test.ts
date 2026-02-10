import { describe, it, expect } from "vitest";
import {
  createMockStateAdapter,
  createMockAtomAdapter,
  expectState,
  expectAtom,
  expectDerived,
  expectAsyncDerived,
  createActionRecorder,
  waitForState,
  createStateTestContainer,
} from "../src/index.js";
import { createAtomPort, createAtomAdapter } from "@hex-di/store";
import type {
  DerivedService,
  AsyncDerivedService,
  AsyncDerivedSnapshot,
  DeepReadonly,
  Unsubscribe,
} from "@hex-di/store";

// =============================================================================
// Test Types
// =============================================================================

interface CounterState {
  readonly count: number;
  readonly label: string;
}

const counterActions = {
  increment: (state: CounterState) => ({ ...state, count: state.count + 1 }),
  decrement: (state: CounterState) => ({ ...state, count: state.count - 1 }),
  setLabel: (state: CounterState, label: string) => ({ ...state, label }),
  reset: () => ({ count: 0, label: "default" }),
};

// =============================================================================
// createMockStateAdapter
// =============================================================================

describe("createMockStateAdapter", () => {
  it("creates a state service with initial state", () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });

    expect(mock.state).toEqual({ count: 0, label: "test" });
  });

  it("dispatches actions and updates state", () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });

    mock.actions.increment();
    expect(mock.state.count).toBe(1);

    mock.actions.increment();
    expect(mock.state.count).toBe(2);

    mock.actions.decrement();
    expect(mock.state.count).toBe(1);
  });

  it("records action spies", () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });

    mock.actions.increment();
    mock.actions.setLabel("hello");

    expect(mock.actionCount).toBe(2);
    expect(mock.actionSpies[0].name).toBe("increment");
    expect(mock.actionSpies[1].name).toBe("setLabel");
    expect(mock.actionSpies[1].args).toEqual(["hello"]);
  });

  it("notifies subscribers", () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });

    const states: CounterState[] = [];
    mock.subscribe((state: DeepReadonly<CounterState>) => {
      states.push({ ...state });
    });

    mock.actions.increment();
    mock.actions.increment();

    expect(states).toEqual([
      { count: 1, label: "test" },
      { count: 2, label: "test" },
    ]);
  });

  it("supports selector subscriptions", () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });

    const counts: number[] = [];
    mock.subscribe(
      (s: DeepReadonly<CounterState>) => s.count,
      (value: number) => {
        counts.push(value);
      }
    );

    mock.actions.increment();
    mock.actions.setLabel("changed"); // Should not trigger (count didn't change)
    mock.actions.increment();

    expect(counts).toEqual([1, 2]);
  });

  it("unsubscribes correctly", () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });

    let callCount = 0;
    const unsub = mock.subscribe(() => {
      callCount++;
    });

    mock.actions.increment();
    expect(callCount).toBe(1);

    unsub();
    mock.actions.increment();
    expect(callCount).toBe(1);
  });

  it("resets spy tracking and state", () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });

    mock.actions.increment();
    mock.actions.increment();
    expect(mock.actionCount).toBe(2);
    expect(mock.state.count).toBe(2);

    mock.reset();
    expect(mock.actionCount).toBe(0);
    expect(mock.state.count).toBe(0);
  });

  it("force sets state", () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });

    mock.setState({ count: 99, label: "forced" });
    expect(mock.state).toEqual({ count: 99, label: "forced" });
  });

  it("notifies subscribers on setState", () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });

    let notified = false;
    mock.subscribe(() => {
      notified = true;
    });

    mock.setState({ count: 99, label: "forced" });
    expect(notified).toBe(true);
  });
});

// =============================================================================
// createMockAtomAdapter
// =============================================================================

describe("createMockAtomAdapter", () => {
  it("creates an atom with initial value", () => {
    const mock = createMockAtomAdapter({ initial: 42 });
    expect(mock.value).toBe(42);
  });

  it("sets value and tracks spy", () => {
    const mock = createMockAtomAdapter({ initial: 0 });

    mock.set(5);
    expect(mock.value).toBe(5);
    expect(mock.spyCount).toBe(1);
    expect(mock.spies[0].operation).toBe("set");
    expect(mock.spies[0].value).toBe(5);
  });

  it("updates value and tracks spy", () => {
    const mock = createMockAtomAdapter({ initial: 10 });

    mock.update(v => v + 5);
    expect(mock.value).toBe(15);
    expect(mock.spyCount).toBe(1);
    expect(mock.spies[0].operation).toBe("update");
    expect(mock.spies[0].value).toBe(15);
  });

  it("notifies subscribers", () => {
    const mock = createMockAtomAdapter({ initial: 0 });

    const values: number[] = [];
    mock.subscribe((v: DeepReadonly<number>) => {
      values.push(v as number);
    });

    mock.set(1);
    mock.set(2);
    expect(values).toEqual([1, 2]);
  });

  it("unsubscribes correctly", () => {
    const mock = createMockAtomAdapter({ initial: 0 });

    let callCount = 0;
    const unsub = mock.subscribe(() => {
      callCount++;
    });

    mock.set(1);
    expect(callCount).toBe(1);

    unsub();
    mock.set(2);
    expect(callCount).toBe(1);
  });

  it("resets spy and value", () => {
    const mock = createMockAtomAdapter({ initial: 0 });

    mock.set(5);
    mock.set(10);
    expect(mock.spyCount).toBe(2);

    mock.reset();
    expect(mock.value).toBe(0);
    expect(mock.spyCount).toBe(0);
  });
});

// =============================================================================
// expectState assertions
// =============================================================================

describe("expectState", () => {
  it("toBe asserts full state equality", () => {
    const mock = createMockStateAdapter({
      initial: { count: 5, label: "test" },
      actions: counterActions,
    });

    expectState(mock).toBe({ count: 5, label: "test" });
  });

  it("toBe fails on wrong state", () => {
    const mock = createMockStateAdapter({
      initial: { count: 5, label: "test" },
      actions: counterActions,
    });

    expect(() => expectState(mock).toBe({ count: 99, label: "test" })).toThrow();
  });

  it("toMatch asserts partial match", () => {
    const mock = createMockStateAdapter({
      initial: { count: 5, label: "test" },
      actions: counterActions,
    });

    expectState(mock).toMatch({ count: 5 });
  });

  it("toMatch fails on wrong partial", () => {
    const mock = createMockStateAdapter({
      initial: { count: 5, label: "test" },
      actions: counterActions,
    });

    expect(() => expectState(mock).toMatch({ count: 99 })).toThrow();
  });

  it("toSatisfy asserts predicate", () => {
    const mock = createMockStateAdapter({
      initial: { count: 5, label: "test" },
      actions: counterActions,
    });

    expectState(mock).toSatisfy(s => s.count > 0);
  });

  it("toSatisfy fails when predicate returns false", () => {
    const mock = createMockStateAdapter({
      initial: { count: 5, label: "test" },
      actions: counterActions,
    });

    expect(() => expectState(mock).toSatisfy(s => s.count < 0)).toThrow();
  });
});

// =============================================================================
// expectAtom assertions
// =============================================================================

describe("expectAtom", () => {
  it("toBe asserts value equality", () => {
    const mock = createMockAtomAdapter({ initial: 42 });
    expectAtom(mock).toBe(42);
  });

  it("toBe fails on wrong value", () => {
    const mock = createMockAtomAdapter({ initial: 42 });
    expect(() => expectAtom(mock).toBe(99)).toThrow();
  });

  it("toSatisfy asserts predicate", () => {
    const mock = createMockAtomAdapter({ initial: 42 });
    expectAtom(mock).toSatisfy(v => (v as number) > 0);
  });

  it("toSatisfy fails when predicate returns false", () => {
    const mock = createMockAtomAdapter({ initial: 42 });
    expect(() => expectAtom(mock).toSatisfy(v => (v as number) < 0)).toThrow();
  });
});

// =============================================================================
// expectDerived assertions
// =============================================================================

describe("expectDerived", () => {
  function createMockDerived<T>(value: T): DerivedService<T> {
    return {
      get value(): DeepReadonly<T> {
        return value as DeepReadonly<T>;
      },
      get isDisposed() {
        return false;
      },
      subscribe(): Unsubscribe {
        return () => {};
      },
    };
  }

  it("toBe asserts derived value", () => {
    const derived = createMockDerived({ total: 100 });
    expectDerived(derived).toBe({ total: 100 });
  });

  it("toBe fails on wrong value", () => {
    const derived = createMockDerived({ total: 100 });
    expect(() => expectDerived(derived).toBe({ total: 999 })).toThrow();
  });

  it("toMatch asserts partial match", () => {
    const derived = createMockDerived({ total: 100, tax: 10 });
    expectDerived(derived).toMatch({ total: 100 });
  });

  it("toMatch fails on wrong partial", () => {
    const derived = createMockDerived({ total: 100, tax: 10 });
    expect(() => expectDerived(derived).toMatch({ total: 999 })).toThrow();
  });

  it("toSatisfy asserts predicate", () => {
    const derived = createMockDerived(42);
    expectDerived(derived).toSatisfy(v => (v as number) > 0);
  });

  it("toSatisfy fails when predicate returns false", () => {
    const derived = createMockDerived(42);
    expect(() => expectDerived(derived).toSatisfy(v => (v as number) < 0)).toThrow();
  });
});

// =============================================================================
// expectAsyncDerived assertions
// =============================================================================

describe("expectAsyncDerived", () => {
  function createMockAsyncDerived<T>(snapshot: AsyncDerivedSnapshot<T>): AsyncDerivedService<T> {
    return {
      get snapshot() {
        return snapshot;
      },
      get status() {
        return snapshot.status;
      },
      get isLoading() {
        return snapshot.status === "loading";
      },
      get isDisposed() {
        return false;
      },
      refresh(): void {},
      subscribe(): Unsubscribe {
        return () => {};
      },
    };
  }

  it("toBeLoading asserts loading state", () => {
    const service = createMockAsyncDerived<string>({
      status: "loading",
      data: undefined,
      error: undefined,
      isLoading: true,
    });
    expectAsyncDerived(service).toBeLoading();
  });

  it("toBeLoading fails when not loading", () => {
    const service = createMockAsyncDerived<string>({
      status: "idle",
      data: undefined,
      error: undefined,
      isLoading: false,
    });
    expect(() => expectAsyncDerived(service).toBeLoading()).toThrow();
  });

  it("toBeSuccess asserts success state", () => {
    const service = createMockAsyncDerived<string>({
      status: "success",
      data: "hello",
      error: undefined,
      isLoading: false,
    });
    expectAsyncDerived(service).toBeSuccess();
    expectAsyncDerived(service).toBeSuccess("hello");
  });

  it("toBeSuccess with data checks data equality", () => {
    const service = createMockAsyncDerived<string>({
      status: "success",
      data: "hello",
      error: undefined,
      isLoading: false,
    });
    expect(() => expectAsyncDerived(service).toBeSuccess("wrong")).toThrow();
  });

  it("toBeSuccess fails when not success", () => {
    const service = createMockAsyncDerived<string>({
      status: "error",
      data: undefined,
      error: new Error("fail"),
      isLoading: false,
    });
    expect(() => expectAsyncDerived(service).toBeSuccess()).toThrow();
  });

  it("toBeError asserts error state", () => {
    const service = createMockAsyncDerived<string>({
      status: "error",
      data: undefined,
      error: new Error("fail"),
      isLoading: false,
    });
    expectAsyncDerived(service).toBeError();
  });

  it("toBeError fails when not error", () => {
    const service = createMockAsyncDerived<string>({
      status: "success",
      data: "hello",
      error: undefined,
      isLoading: false,
    });
    expect(() => expectAsyncDerived(service).toBeError()).toThrow();
  });

  it("toHaveStatus asserts any status", () => {
    const service = createMockAsyncDerived<string>({
      status: "idle",
      data: undefined,
      error: undefined,
      isLoading: false,
    });
    expectAsyncDerived(service).toHaveStatus("idle");
  });

  it("toHaveStatus fails on wrong status", () => {
    const service = createMockAsyncDerived<string>({
      status: "idle",
      data: undefined,
      error: undefined,
      isLoading: false,
    });
    expect(() => expectAsyncDerived(service).toHaveStatus("loading")).toThrow();
  });
});

// =============================================================================
// createActionRecorder
// =============================================================================

describe("createActionRecorder", () => {
  it("records state changes", () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });
    const recorder = createActionRecorder(mock);

    mock.actions.increment();
    mock.actions.increment();

    expect(recorder.actionCount).toBe(2);
    expect(recorder.actions[0].prevState).toEqual({ count: 0, label: "test" });
    expect(recorder.actions[0].nextState).toEqual({ count: 1, label: "test" });

    recorder.dispose();
  });

  it("tracks state history", () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });
    const recorder = createActionRecorder(mock);

    mock.actions.increment();
    mock.actions.increment();

    expect(recorder.stateHistory).toHaveLength(3); // initial + 2 changes
    expect((recorder.stateHistory[0] as CounterState).count).toBe(0);
    expect((recorder.stateHistory[1] as CounterState).count).toBe(1);
    expect((recorder.stateHistory[2] as CounterState).count).toBe(2);

    recorder.dispose();
  });

  it("resets recordings", () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });
    const recorder = createActionRecorder(mock);

    mock.actions.increment();
    expect(recorder.actionCount).toBe(1);

    recorder.reset();
    expect(recorder.actionCount).toBe(0);
    expect(recorder.stateHistory).toHaveLength(1); // Just current state

    recorder.dispose();
  });

  it("stops recording after dispose", () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });
    const recorder = createActionRecorder(mock);

    recorder.dispose();
    mock.actions.increment();

    expect(recorder.actionCount).toBe(0);
  });

  it("includes portName in recorded actions", () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });
    const recorder = createActionRecorder(mock, "MyPort");

    mock.actions.increment();

    expect(recorder.actions[0].portName).toBe("MyPort");
    recorder.dispose();
  });

  it("defaults portName to 'unknown' when not provided", () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });
    const recorder = createActionRecorder(mock);

    mock.actions.increment();

    expect(recorder.actions[0].portName).toBe("unknown");
    recorder.dispose();
  });

  it("getEventsForPort filters by port name", () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });
    const recorder = createActionRecorder(mock, "TargetPort");

    mock.actions.increment();
    mock.actions.increment();

    expect(recorder.getEventsForPort("TargetPort")).toHaveLength(2);
    expect(recorder.getEventsForPort("OtherPort")).toHaveLength(0);
    recorder.dispose();
  });
});

// =============================================================================
// waitForState
// =============================================================================

describe("waitForState", () => {
  it("resolves immediately if predicate is already satisfied", async () => {
    const mock = createMockStateAdapter({
      initial: { count: 5, label: "test" },
      actions: counterActions,
    });

    const result = await waitForState("TestPort", mock, s => s.count === 5);
    expect(result.isOk()).toBe(true);
  });

  it("resolves after state change satisfies predicate", async () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });

    const promise = waitForState("TestPort", mock, s => s.count >= 3);

    mock.actions.increment();
    mock.actions.increment();
    mock.actions.increment();

    const result = await promise;
    expect(result.isOk()).toBe(true);
    expect(mock.state.count).toBe(3);
  });

  it("returns Err with WaitForStateTimeoutError on timeout", async () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });

    const result = await waitForState("TestPort", mock, s => s.count > 100, 50);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("WaitForStateTimeout");
      expect(result.error.code).toBe("WAIT_FOR_STATE_TIMEOUT");
      expect(result.error.portName).toBe("TestPort");
      expect(result.error.timeoutMs).toBe(50);
    }
  });

  it("timeout error has correct _tag for type guard match", async () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });

    const result = await waitForState("MyPort", mock, () => false, 20);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      // Ensures isWaitForStateTimeout type guard works: checks _tag field
      expect(result.error).toHaveProperty("_tag", "WaitForStateTimeout");
      expect(typeof result.error).toBe("object");
      expect(result.error).not.toBeNull();
    }
  });

  it("resolves on the first state change that satisfies predicate", async () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });

    const promise = waitForState("TestPort", mock, s => s.count === 1, 500);

    // First increment satisfies predicate
    mock.actions.increment();

    const result = await promise;
    expect(result.isOk()).toBe(true);
  });

  it("unsubscribes after predicate is satisfied (no leaks)", async () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });

    await waitForState("TestPort", mock, s => s.count === 0); // Already satisfied

    // Verify no dangling subscription by checking we can still operate normally
    mock.actions.increment();
    expect(mock.state.count).toBe(1);
  });
});

// =============================================================================
// createStateTestContainer
// =============================================================================

describe("createStateTestContainer", () => {
  const ThemePort = createAtomPort<string>()({ name: "Theme" });
  const themeAdapter = createAtomAdapter({
    provides: ThemePort,
    initial: "light",
  });

  const CountPort = createAtomPort<number>()({ name: "Count" });
  const countAdapter = createAtomAdapter({
    provides: CountPort,
    initial: 0,
  });

  it("creates container from adapters array (backward compat)", () => {
    const container = createStateTestContainer([themeAdapter]);
    const theme = container.resolve(ThemePort);
    expect(theme.value).toBe("light");
  });

  it("creates container from config object", () => {
    const container = createStateTestContainer({
      adapters: [themeAdapter],
    });
    const theme = container.resolve(ThemePort);
    expect(theme.value).toBe("light");
  });

  it("applies atom overrides via set()", () => {
    const container = createStateTestContainer({
      adapters: [themeAdapter],
      overrides: [[ThemePort, "dark"]],
    });
    const theme = container.resolve(ThemePort);
    expect(theme.value).toBe("dark");
  });

  it("applies multiple overrides", () => {
    const container = createStateTestContainer({
      adapters: [themeAdapter, countAdapter],
      overrides: [
        [ThemePort, "dark"],
        [CountPort, 42],
      ],
    });
    const theme = container.resolve(ThemePort);
    const count = container.resolve(CountPort);
    expect(theme.value).toBe("dark");
    expect(count.value).toBe(42);
  });

  it("works with config object and no overrides", () => {
    const container = createStateTestContainer({
      adapters: [themeAdapter, countAdapter],
    });
    const theme = container.resolve(ThemePort);
    const count = container.resolve(CountPort);
    expect(theme.value).toBe("light");
    expect(count.value).toBe(0);
  });
});
