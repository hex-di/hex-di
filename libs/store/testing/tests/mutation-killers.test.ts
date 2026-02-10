import { describe, it, expect, vi, afterEach } from "vitest";
import {
  createMockStateAdapter,
  createMockAtomAdapter,
  expectState,
  expectAtom,
  expectDerived,
  expectAsyncDerived,
  waitForState,
  createStateTestContainer,
  createActionRecorder,
} from "../src/index.js";
import {
  createAtomPort,
  createAtomAdapter,
  createStatePort,
  createStateAdapter,
} from "@hex-di/store";
import type {
  DerivedService,
  AsyncDerivedService,
  AsyncDerivedSnapshot,
  DeepReadonly,
  Unsubscribe,
  ActionMap,
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
// waitForState — Mutation Killers
// =============================================================================

describe("waitForState — mutation killers", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("error mapper wraps plain Error thrown by predicate in WaitForStateTimeout", async () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });

    // Predicate throws on initial check → goes through error mapper's else branch
    const result = await waitForState(
      "ErrPort",
      mock,
      () => {
        throw new Error("predicate boom");
      },
      500
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("WaitForStateTimeout");
      expect(result.error.portName).toBe("ErrPort");
      expect(result.error.timeoutMs).toBe(500);
    }
  });

  it("error mapper wraps string thrown by predicate", async () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });

    // Throwing a string (non-object) — exercises typeof check in isWaitForStateTimeout
    const result = await waitForState(
      "StrPort",
      mock,
      () => {
        throw "string error";
      },
      100
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("WaitForStateTimeout");
      expect(result.error.portName).toBe("StrPort");
      expect(result.error.timeoutMs).toBe(100);
    }
  });

  it("error mapper wraps null thrown by predicate", async () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });

    // Throwing null — exercises value !== null check in isWaitForStateTimeout
    const result = await waitForState(
      "NullPort",
      mock,
      () => {
        throw null;
      },
      100
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("WaitForStateTimeout");
      expect(result.error.portName).toBe("NullPort");
    }
  });

  it("error mapper wraps object without _tag thrown by predicate", async () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });

    // Throwing object without _tag — exercises "_tag" in value check
    const result = await waitForState(
      "NoTagPort",
      mock,
      () => {
        throw { code: "CUSTOM" };
      },
      100
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("WaitForStateTimeout");
      expect(result.error.portName).toBe("NoTagPort");
    }
  });

  it("error mapper wraps object with wrong _tag thrown by predicate", async () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });

    // Throwing object with wrong _tag — exercises value._tag === "WaitForStateTimeout" check
    const result = await waitForState(
      "WrongTagPort",
      mock,
      () => {
        throw { _tag: "SomethingElse" };
      },
      100
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("WaitForStateTimeout");
      expect(result.error.portName).toBe("WrongTagPort");
    }
  });

  it("clearTimeout is called when predicate is satisfied after timer is set", async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });

    const promise = waitForState("ClearPort", mock, s => s.count === 1, 5000);

    // Satisfy predicate — timer.id should already be set by now
    mock.actions.increment();

    const result = await promise;
    expect(result.isOk()).toBe(true);
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });

  it("unsubscribes after predicate satisfaction (no dangling listener)", async () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });

    // Record how many listeners exist through subscription tracking
    const recorder = createActionRecorder(mock);

    const promise = waitForState("UnsubPort", mock, s => s.count === 1, 5000);
    mock.actions.increment();

    const result = await promise;
    expect(result.isOk()).toBe(true);

    // After resolution, further state changes should only go to recorder
    mock.actions.increment();
    expect(recorder.actionCount).toBe(2);
    expect(mock.state.count).toBe(2);

    recorder.dispose();
  });

  it("unsubscribes after timeout (no dangling listener)", async () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });

    const result = await waitForState("UnsubTimeoutPort", mock, () => false, 10);
    expect(result.isErr()).toBe(true);

    // After timeout, state changes should not cause issues
    mock.actions.increment();
    expect(mock.state.count).toBe(1);
  });

  it("uses default timeout of 5000ms", async () => {
    vi.useFakeTimers();

    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });

    const promise = waitForState("DefaultPort", mock, () => false);

    // Advance past default 5000ms timeout
    vi.advanceTimersByTime(5001);

    const result = await promise;
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.timeoutMs).toBe(5000);
    }
  });

  it("timeout error includes portName and timeoutMs", async () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });

    const result = await waitForState("DetailPort", mock, () => false, 15);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.portName).toBe("DetailPort");
      expect(result.error.timeoutMs).toBe(15);
      expect(result.error.code).toBe("WAIT_FOR_STATE_TIMEOUT");
      expect(result.error.isProgrammingError).toBe(false);
      expect(result.error.message).toContain("DetailPort");
      expect(result.error.message).toContain("15ms");
    }
  });

  it("resolves when predicate becomes true during subscription (not initial check)", async () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });

    let predicateCallCount = 0;
    const promise = waitForState(
      "SubResolve",
      mock,
      s => {
        predicateCallCount++;
        return s.count === 2;
      },
      5000
    );

    mock.actions.increment(); // count=1, predicate false
    mock.actions.increment(); // count=2, predicate true

    const result = await promise;
    expect(result.isOk()).toBe(true);
    // Initial check (count=0) + 2 subscription calls
    expect(predicateCallCount).toBe(3);
  });
});

// =============================================================================
// assertions — Mutation Killers
// =============================================================================

describe("expectState — mutation killers", () => {
  it("toBe reads service.state (not service itself)", () => {
    const mock = createMockStateAdapter({
      initial: { count: 7, label: "x" },
      actions: counterActions,
    });

    expectState(mock).toBe({ count: 7, label: "x" });
    // Verify wrong state actually fails
    expect(() => expectState(mock).toBe({ count: 0, label: "x" })).toThrow();
  });

  it("toMatch reads service.state for partial matching", () => {
    const mock = createMockStateAdapter({
      initial: { count: 3, label: "partial" },
      actions: counterActions,
    });

    expectState(mock).toMatch({ label: "partial" });
    expect(() => expectState(mock).toMatch({ label: "wrong" })).toThrow();
  });

  it("toSatisfy passes service.state to predicate and checks for true", () => {
    const mock = createMockStateAdapter({
      initial: { count: 10, label: "test" },
      actions: counterActions,
    });

    // Must pass when predicate returns true
    expectState(mock).toSatisfy(s => s.count === 10);
    // Must fail when predicate returns false
    expect(() => expectState(mock).toSatisfy(s => s.count === 999)).toThrow();
  });
});

describe("expectAtom — mutation killers", () => {
  it("toBe reads service.value for comparison", () => {
    const mock = createMockAtomAdapter({ initial: 77 });
    expectAtom(mock).toBe(77);
    expect(() => expectAtom(mock).toBe(0)).toThrow();
  });

  it("toSatisfy checks predicate result is true", () => {
    const mock = createMockAtomAdapter({ initial: 50 });
    expectAtom(mock).toSatisfy(v => (v as number) === 50);
    expect(() => expectAtom(mock).toSatisfy(v => (v as number) === 0)).toThrow();
  });
});

describe("expectDerived — mutation killers", () => {
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

  it("toBe reads service.value", () => {
    const derived = createMockDerived({ x: 1, y: 2 });
    expectDerived(derived).toBe({ x: 1, y: 2 });
    expect(() => expectDerived(derived).toBe({ x: 0, y: 0 })).toThrow();
  });

  it("toMatch reads service.value for partial matching", () => {
    const derived = createMockDerived({ a: "hello", b: "world" });
    expectDerived(derived).toMatch({ a: "hello" });
    expect(() => expectDerived(derived).toMatch({ a: "wrong" })).toThrow();
  });

  it("toSatisfy passes service.value to predicate", () => {
    const derived = createMockDerived(99);
    expectDerived(derived).toSatisfy(v => (v as number) > 50);
    expect(() => expectDerived(derived).toSatisfy(v => (v as number) < 0)).toThrow();
  });
});

describe("expectAsyncDerived — mutation killers", () => {
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

  it("toBeLoading checks both status and isLoading", () => {
    const loading = createMockAsyncDerived<string>({
      status: "loading",
      data: undefined,
      error: undefined,
      isLoading: true,
    });
    expectAsyncDerived(loading).toBeLoading();

    // Not loading should fail
    const idle = createMockAsyncDerived<string>({
      status: "idle",
      data: undefined,
      error: undefined,
      isLoading: false,
    });
    expect(() => expectAsyncDerived(idle).toBeLoading()).toThrow();
  });

  it("toBeSuccess without data only checks status", () => {
    const svc = createMockAsyncDerived<string>({
      status: "success",
      data: "anything",
      error: undefined,
      isLoading: false,
    });
    expectAsyncDerived(svc).toBeSuccess();
  });

  it("toBeSuccess with data checks both status and data equality", () => {
    const svc = createMockAsyncDerived<string>({
      status: "success",
      data: "expected-data",
      error: undefined,
      isLoading: false,
    });
    expectAsyncDerived(svc).toBeSuccess("expected-data");
    expect(() => expectAsyncDerived(svc).toBeSuccess("wrong-data")).toThrow();
  });

  it("toBeSuccess with undefined data parameter skips data check", () => {
    const svc = createMockAsyncDerived<string>({
      status: "success",
      data: "some-data",
      error: undefined,
      isLoading: false,
    });
    // Explicit undefined should skip data check (same as no argument)
    expectAsyncDerived(svc).toBeSuccess(undefined);
  });

  it("toBeError checks status is error", () => {
    const svc = createMockAsyncDerived<string>({
      status: "error",
      data: undefined,
      error: new Error("fail"),
      isLoading: false,
    });
    expectAsyncDerived(svc).toBeError();

    const success = createMockAsyncDerived<string>({
      status: "success",
      data: "ok",
      error: undefined,
      isLoading: false,
    });
    expect(() => expectAsyncDerived(success).toBeError()).toThrow();
  });

  it("toHaveStatus checks exact status string", () => {
    const svc = createMockAsyncDerived<string>({
      status: "idle",
      data: undefined,
      error: undefined,
      isLoading: false,
    });
    expectAsyncDerived(svc).toHaveStatus("idle");
    expect(() => expectAsyncDerived(svc).toHaveStatus("loading")).toThrow();
    expect(() => expectAsyncDerived(svc).toHaveStatus("success")).toThrow();
    expect(() => expectAsyncDerived(svc).toHaveStatus("error")).toThrow();
  });
});

// =============================================================================
// createStateTestContainer — Mutation Killers
// =============================================================================

describe("createStateTestContainer — mutation killers", () => {
  const ThemePort = createAtomPort<string>()({ name: "MutTheme" });
  const themeAdapter = createAtomAdapter({
    provides: ThemePort,
    initial: "light",
  });

  const MutCounterPort = createStatePort<
    { count: number },
    { increment: (s: { count: number }) => { count: number } }
  >()({ name: "MutCounter" });
  const mutCounterAdapter = createStateAdapter({
    provides: MutCounterPort,
    initial: { count: 0 },
    actions: {
      increment: (s: { count: number }) => ({ count: s.count + 1 }),
    },
  });

  it("skips overrides for services without set() method (StateService)", () => {
    const container = createStateTestContainer({
      adapters: [mutCounterAdapter],
      overrides: [[MutCounterPort, { count: 99 }]],
    });
    const svc = container.resolve(MutCounterPort);
    // StateService doesn't have set(), so override should be silently skipped
    expect(svc.state.count).toBe(0);
  });

  it("applies override for services with set() method (AtomService)", () => {
    const container = createStateTestContainer({
      adapters: [themeAdapter],
      overrides: [[ThemePort, "dark"]],
    });
    const svc = container.resolve(ThemePort);
    expect(svc.value).toBe("dark");
  });

  it("handles mixed overrides — applies set-able, skips non-set-able", () => {
    const container = createStateTestContainer({
      adapters: [themeAdapter, mutCounterAdapter],
      overrides: [
        [ThemePort, "ocean"],
        [MutCounterPort, { count: 50 }], // skipped — no set()
      ],
    });
    expect(container.resolve(ThemePort).value).toBe("ocean");
    expect(container.resolve(MutCounterPort).state.count).toBe(0);
  });

  it("config without overrides does not error", () => {
    const container = createStateTestContainer({
      adapters: [themeAdapter],
    });
    expect(container.resolve(ThemePort).value).toBe("light");
  });

  it("bare array form creates valid container", () => {
    const container = createStateTestContainer([themeAdapter, mutCounterAdapter]);
    expect(container.resolve(ThemePort).value).toBe("light");
    expect(container.resolve(MutCounterPort).state.count).toBe(0);
  });

  it("config with empty overrides array works", () => {
    const container = createStateTestContainer({
      adapters: [themeAdapter],
      overrides: [],
    });
    expect(container.resolve(ThemePort).value).toBe("light");
  });
});

// =============================================================================
// createActionRecorder — Mutation Killers
// =============================================================================

describe("createActionRecorder — mutation killers", () => {
  it("stateHistory starts with initial state", () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "init" },
      actions: counterActions,
    });
    const recorder = createActionRecorder(mock);

    expect(recorder.stateHistory).toHaveLength(1);
    expect(recorder.stateHistory[0]).toEqual({ count: 0, label: "init" });

    recorder.dispose();
  });

  it("recorded action includes prevState and nextState", () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });
    const recorder = createActionRecorder(mock);

    mock.actions.increment();

    expect(recorder.actions[0].prevState).toEqual({ count: 0, label: "test" });
    expect(recorder.actions[0].nextState).toEqual({ count: 1, label: "test" });

    recorder.dispose();
  });

  it("reset clears actions and resets stateHistory to current state", () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });
    const recorder = createActionRecorder(mock);

    mock.actions.increment();
    mock.actions.increment();
    expect(recorder.actionCount).toBe(2);
    expect(recorder.stateHistory).toHaveLength(3);

    recorder.reset();
    expect(recorder.actionCount).toBe(0);
    expect(recorder.actions).toHaveLength(0);
    expect(recorder.stateHistory).toHaveLength(1);
    // stateHistory after reset should contain current state
    expect(recorder.stateHistory[0]).toEqual({ count: 2, label: "test" });

    recorder.dispose();
  });

  it("getEventsForPort returns only matching events", () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });
    const recorder = createActionRecorder(mock, "MyPort");

    mock.actions.increment();

    const matching = recorder.getEventsForPort("MyPort");
    const nonMatching = recorder.getEventsForPort("OtherPort");

    expect(matching).toHaveLength(1);
    expect(matching[0].portName).toBe("MyPort");
    expect(nonMatching).toHaveLength(0);

    recorder.dispose();
  });

  it("recorded action has timestamp", () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });
    const recorder = createActionRecorder(mock);

    mock.actions.increment();

    expect(typeof recorder.actions[0].timestamp).toBe("number");
    expect(recorder.actions[0].timestamp).toBeGreaterThan(0);

    recorder.dispose();
  });
});

// =============================================================================
// createMockStateAdapter — Mutation Killers
// =============================================================================

describe("createMockStateAdapter — mutation killers", () => {
  it("isDisposed returns false", () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });
    expect(mock.isDisposed).toBe(false);
  });

  it("selector subscription with custom equality function", () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });

    const values: number[] = [];
    mock.subscribe(
      (s: DeepReadonly<CounterState>) => s.count,
      (value: number) => {
        values.push(value);
      },
      (a: number, b: number) => Math.abs(a - b) < 5 // Consider equal if diff < 5
    );

    mock.actions.increment(); // count=1, diff from 0 is 1 < 5 → equal → no notify
    mock.actions.increment(); // count=2
    mock.actions.increment(); // count=3
    mock.actions.increment(); // count=4
    mock.actions.increment(); // count=5, diff from 0 is 5 → NOT equal → notify

    expect(values).toEqual([5]);
  });

  it("setState notifies subscribers with new and previous state", () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });

    const received: Array<{ next: CounterState; prev: CounterState }> = [];
    mock.subscribe((state: DeepReadonly<CounterState>, prev: DeepReadonly<CounterState>) => {
      received.push({ next: { ...state }, prev: { ...prev } });
    });

    mock.setState({ count: 10, label: "forced" });

    expect(received).toHaveLength(1);
    expect(received[0].prev).toEqual({ count: 0, label: "test" });
    expect(received[0].next).toEqual({ count: 10, label: "forced" });
  });

  it("actionSpies include timestamp", () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "test" },
      actions: counterActions,
    });

    mock.actions.increment();

    expect(typeof mock.actionSpies[0].timestamp).toBe("number");
    expect(mock.actionSpies[0].timestamp).toBeGreaterThan(0);
  });

  it("reset restores initial state (not current state)", () => {
    const mock = createMockStateAdapter({
      initial: { count: 0, label: "initial" },
      actions: counterActions,
    });

    mock.actions.increment();
    mock.actions.increment();
    mock.actions.setLabel("changed");
    expect(mock.state.count).toBe(2);
    expect(mock.state.label).toBe("changed");

    mock.reset();
    expect(mock.state.count).toBe(0);
    expect(mock.state.label).toBe("initial");
  });
});

// =============================================================================
// createMockAtomAdapter — Mutation Killers
// =============================================================================

describe("createMockAtomAdapter — mutation killers", () => {
  it("isDisposed returns false", () => {
    const mock = createMockAtomAdapter({ initial: 0 });
    expect(mock.isDisposed).toBe(false);
  });

  it("subscribe receives both new and previous value", () => {
    const mock = createMockAtomAdapter({ initial: "a" });

    const received: Array<{ next: string; prev: string }> = [];
    mock.subscribe((value: DeepReadonly<string>, prev: DeepReadonly<string>) => {
      received.push({ next: value as string, prev: prev as string });
    });

    mock.set("b");

    expect(received).toHaveLength(1);
    expect(received[0].prev).toBe("a");
    expect(received[0].next).toBe("b");
  });

  it("update receives current value and produces new value", () => {
    const mock = createMockAtomAdapter({ initial: 10 });

    mock.update(v => v + 5);
    expect(mock.value).toBe(15);

    mock.update(v => v * 2);
    expect(mock.value).toBe(30);
  });

  it("reset restores to initial value", () => {
    const mock = createMockAtomAdapter({ initial: "start" });

    mock.set("changed");
    mock.set("again");
    expect(mock.value).toBe("again");

    mock.reset();
    expect(mock.value).toBe("start");
    expect(mock.spyCount).toBe(0);
    expect(mock.spies).toHaveLength(0);
  });

  it("spy records operation type correctly", () => {
    const mock = createMockAtomAdapter({ initial: 0 });

    mock.set(5);
    mock.update(v => v + 1);

    expect(mock.spies[0].operation).toBe("set");
    expect(mock.spies[0].value).toBe(5);
    expect(mock.spies[1].operation).toBe("update");
    expect(mock.spies[1].value).toBe(6);
  });
});
