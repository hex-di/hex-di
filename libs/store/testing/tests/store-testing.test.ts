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
} from "../src/index.js";
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

  it("toMatch asserts partial match", () => {
    const mock = createMockStateAdapter({
      initial: { count: 5, label: "test" },
      actions: counterActions,
    });

    expectState(mock).toMatch({ count: 5 });
  });

  it("toSatisfy asserts predicate", () => {
    const mock = createMockStateAdapter({
      initial: { count: 5, label: "test" },
      actions: counterActions,
    });

    expectState(mock).toSatisfy(s => s.count > 0);
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

  it("toSatisfy asserts predicate", () => {
    const mock = createMockAtomAdapter({ initial: 42 });
    expectAtom(mock).toSatisfy(v => (v as number) > 0);
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
      subscribe(): Unsubscribe {
        return () => {};
      },
    };
  }

  it("toBe asserts derived value", () => {
    const derived = createMockDerived({ total: 100 });
    expectDerived(derived).toBe({ total: 100 });
  });

  it("toMatch asserts partial match", () => {
    const derived = createMockDerived({ total: 100, tax: 10 });
    expectDerived(derived).toMatch({ total: 100 });
  });

  it("toSatisfy asserts predicate", () => {
    const derived = createMockDerived(42);
    expectDerived(derived).toSatisfy(v => (v as number) > 0);
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

  it("toBeError asserts error state", () => {
    const service = createMockAsyncDerived<string>({
      status: "error",
      data: undefined,
      error: new Error("fail"),
      isLoading: false,
    });
    expectAsyncDerived(service).toBeError();
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

    await waitForState(mock, s => s.count === 5);
  });

  it("resolves after state change satisfies predicate", async () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });

    const promise = waitForState(mock, s => s.count >= 3);

    mock.actions.increment();
    mock.actions.increment();
    mock.actions.increment();

    await promise;
    expect(mock.state.count).toBe(3);
  });

  it("rejects on timeout", async () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });

    await expect(waitForState(mock, s => s.count > 100, 50)).rejects.toThrow(
      "waitForState timed out"
    );
  });
});
