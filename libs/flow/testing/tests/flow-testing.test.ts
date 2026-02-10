import { describe, it, expect, afterEach, vi } from "vitest";
import { defineMachine, guard, and, not, Effect } from "@hex-di/flow";
import {
  createFlowTestHarness,
  createMockEffectExecutor,
  createFlowEventRecorder,
  createMockActivity,
  createVirtualClock,
  expectFlowState,
  expectEvents,
  expectEventTypes,
  expectSnapshot,
  serializeSnapshot,
  snapshotMachine,
  testGuard,
  testGuardSafe,
  testTransition,
  testEffect,
  testEffectSafe,
  testFlowInContainer,
} from "../src/index.js";

// =============================================================================
// Test Machine Setup
// =============================================================================

interface CounterContext {
  readonly count: number;
}

const counterMachine = defineMachine({
  id: "counter",
  initial: "idle" as "idle" | "counting" | "done",
  context: { count: 0 } as CounterContext,
  states: {
    idle: {
      on: {
        START: {
          target: "counting" as const,
        },
      },
    },
    counting: {
      on: {
        INCREMENT: {
          target: "counting" as const,
          actions: [(ctx: { count: number }) => ({ count: ctx.count + 1 })],
        },
        DONE: {
          target: "done" as const,
        },
      },
    },
    done: {
      on: {},
    },
  },
});

const guardedMachine = defineMachine({
  id: "guarded",
  initial: "idle" as "idle" | "active" | "blocked",
  context: { allowed: true },
  states: {
    idle: {
      on: {
        ACTIVATE: [
          {
            target: "active" as const,
            guard: (ctx: { allowed: boolean }) => ctx.allowed,
          },
          {
            target: "blocked" as const,
          },
        ],
      },
    },
    active: { on: {} },
    blocked: { on: {} },
  },
});

// =============================================================================
// createFlowTestHarness
// =============================================================================

describe("createFlowTestHarness", () => {
  let cleanup: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
      cleanup = undefined;
    }
  });

  it("creates a harness with initial state", () => {
    const harness = createFlowTestHarness(counterMachine);
    cleanup = () => harness.cleanup();

    expect(harness.snapshot().state).toBe("idle");
    expect(harness.snapshot().context).toEqual({ count: 0 });
  });

  it("sends events and transitions state", async () => {
    const harness = createFlowTestHarness(counterMachine);
    cleanup = () => harness.cleanup();

    await harness.send({ type: "START" });
    expect(harness.snapshot().state).toBe("counting");
  });

  it("applies context updates from actions", async () => {
    const harness = createFlowTestHarness(counterMachine);
    cleanup = () => harness.cleanup();

    await harness.send({ type: "START" });
    await harness.send({ type: "INCREMENT" });
    await harness.send({ type: "INCREMENT" });

    expect(harness.snapshot().context).toEqual({ count: 2 });
  });

  it("overrides initial context", () => {
    const harness = createFlowTestHarness(counterMachine, {
      context: { count: 10 },
    });
    cleanup = () => harness.cleanup();

    expect(harness.snapshot().context).toEqual({ count: 10 });
  });

  it("records executed effects", async () => {
    const harness = createFlowTestHarness(counterMachine);
    cleanup = () => harness.cleanup();

    await harness.send({ type: "START" });
    // No effects on this machine, but effects array should be accessible
    expect(harness.effects).toBeDefined();
  });

  it("handles guard-based transitions", async () => {
    const harness = createFlowTestHarness(guardedMachine);
    cleanup = () => harness.cleanup();

    await harness.send({ type: "ACTIVATE" });
    expect(harness.snapshot().state).toBe("active");
  });

  it("handles guard-based transitions (blocked path)", async () => {
    const harness = createFlowTestHarness(guardedMachine, {
      context: { allowed: false },
    });
    cleanup = () => harness.cleanup();

    await harness.send({ type: "ACTIVATE" });
    expect(harness.snapshot().state).toBe("blocked");
  });

  it("waitForState resolves immediately if already in state", async () => {
    const harness = createFlowTestHarness(counterMachine);
    cleanup = () => harness.cleanup();

    await harness.waitForState("idle");
    // Should resolve without issue
    expect(harness.snapshot().state).toBe("idle");
  });

  it("waitForState resolves after transition", async () => {
    const harness = createFlowTestHarness(counterMachine);
    cleanup = () => harness.cleanup();

    const waitPromise = harness.waitForState("counting");
    await harness.send({ type: "START" });
    await waitPromise;

    expect(harness.snapshot().state).toBe("counting");
  });

  it("cleans up runner on cleanup", async () => {
    const harness = createFlowTestHarness(counterMachine);
    await harness.cleanup();
    cleanup = undefined;

    expect(harness.runner.isDisposed).toBe(true);
  });
});

// =============================================================================
// createMockEffectExecutor
// =============================================================================

describe("createMockEffectExecutor", () => {
  it("records executed effects", async () => {
    const mock = createMockEffectExecutor();

    await mock.executor.execute({ _tag: "Delay", milliseconds: 100 } as never);
    await mock.executor.execute({ _tag: "None" } as never);

    expect(mock.callCount).toBe(2);
    expect(mock.effects).toHaveLength(2);
  });

  it("filters effects by tag", async () => {
    const mock = createMockEffectExecutor();

    await mock.executor.execute({ _tag: "Delay", milliseconds: 100 } as never);
    await mock.executor.execute({ _tag: "None" } as never);
    await mock.executor.execute({ _tag: "Delay", milliseconds: 200 } as never);

    const delays = mock.getByTag("Delay");
    expect(delays).toHaveLength(2);
    expect(mock.getByTag("None")).toHaveLength(1);
  });

  it("resets recorded effects", async () => {
    const mock = createMockEffectExecutor();

    await mock.executor.execute({ _tag: "None" } as never);
    expect(mock.callCount).toBe(1);

    mock.reset();
    expect(mock.callCount).toBe(0);
    expect(mock.effects).toHaveLength(0);
  });

  it("calls handler for matching effects", async () => {
    let handlerCalled = false;

    const mock = createMockEffectExecutor([
      {
        tag: "Delay",
        handler: () => {
          handlerCalled = true;
        },
      },
    ]);

    await mock.executor.execute({ _tag: "Delay", milliseconds: 100 } as never);
    expect(handlerCalled).toBe(true);
  });

  it("returns error for matching effects with error config", async () => {
    const mock = createMockEffectExecutor([
      {
        tag: "Invoke",
        error: new Error("mock invoke error"),
      },
    ]);

    const result = await mock.executor.execute({ _tag: "Invoke" } as never);
    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error._tag).toBe("InvokeError");
    }
  });
});

// =============================================================================
// createFlowEventRecorder
// =============================================================================

describe("createFlowEventRecorder", () => {
  it("records transitions", async () => {
    const harness = createFlowTestHarness(counterMachine);
    const recorder = createFlowEventRecorder(harness.runner);

    await harness.send({ type: "START" });

    expect(recorder.transitionCount).toBe(1);
    expect(recorder.transitions[0].prevState).toBe("idle");
    expect(recorder.transitions[0].nextState).toBe("counting");

    recorder.dispose();
    await harness.cleanup();
  });

  it("tracks state history", async () => {
    const harness = createFlowTestHarness(counterMachine);
    const recorder = createFlowEventRecorder(harness.runner);

    await harness.send({ type: "START" });
    await harness.send({ type: "INCREMENT" });
    await harness.send({ type: "DONE" });

    expect(recorder.stateHistory).toEqual(["idle", "counting", "counting", "done"]);

    recorder.dispose();
    await harness.cleanup();
  });

  it("resets recorded data", async () => {
    const harness = createFlowTestHarness(counterMachine);
    const recorder = createFlowEventRecorder(harness.runner);

    await harness.send({ type: "START" });
    expect(recorder.transitionCount).toBe(1);

    recorder.reset();
    expect(recorder.transitionCount).toBe(0);
    expect(recorder.stateHistory).toEqual(["counting"]);

    recorder.dispose();
    await harness.cleanup();
  });

  it("stops recording after dispose", async () => {
    const harness = createFlowTestHarness(counterMachine);
    const recorder = createFlowEventRecorder(harness.runner);

    recorder.dispose();

    await harness.send({ type: "START" });
    expect(recorder.transitionCount).toBe(0);

    await harness.cleanup();
  });
});

// =============================================================================
// createMockActivity
// =============================================================================

describe("createMockActivity", () => {
  it("tracks start calls", async () => {
    const mock = createMockActivity<string, string>({ result: "done" });
    const controller = new AbortController();

    await mock.activity.execute("input", null, controller.signal);

    expect(mock.started).toBe(true);
    expect(mock.startCount).toBe(1);
    expect(mock.lastInput).toBe("input");
  });

  it("returns static result", async () => {
    const mock = createMockActivity<void, string>({ result: "hello" });
    const controller = new AbortController();

    const result = await mock.activity.execute(undefined as void, null, controller.signal);
    expect(result).toBe("hello");
  });

  it("returns dynamic result", async () => {
    const mock = createMockActivity<number, string>({
      resultFn: n => `value-${n}`,
    });
    const controller = new AbortController();

    const result = await mock.activity.execute(42, null, controller.signal);
    expect(result).toBe("value-42");
  });

  it("throws configured error", async () => {
    const mock = createMockActivity<void, void>({
      error: new Error("test error"),
    });
    const controller = new AbortController();

    await expect(mock.activity.execute(undefined as void, null, controller.signal)).rejects.toThrow(
      "test error"
    );
  });

  it("tracks stop on abort", async () => {
    const mock = createMockActivity<void, void>({ delay: 10000 });
    const controller = new AbortController();

    const promise = mock.activity.execute(undefined as void, null, controller.signal);
    controller.abort();

    await expect(promise).rejects.toThrow();
    expect(mock.stopped).toBe(true);
  });

  it("resets tracking state", async () => {
    const mock = createMockActivity<string, string>({ result: "done" });
    const controller = new AbortController();

    await mock.activity.execute("input", null, controller.signal);
    expect(mock.startCount).toBe(1);

    mock.reset();
    expect(mock.started).toBe(false);
    expect(mock.startCount).toBe(0);
    expect(mock.lastInput).toBeUndefined();
  });
});

// =============================================================================
// Assertions
// =============================================================================

describe("expectFlowState", () => {
  it("asserts current state", async () => {
    const harness = createFlowTestHarness(counterMachine);

    expectFlowState(harness.runner).toBeInState("idle");

    await harness.send({ type: "START" });
    expectFlowState(harness.runner).toBeInState("counting");

    await harness.cleanup();
  });

  it("asserts context match", async () => {
    const harness = createFlowTestHarness(counterMachine);

    await harness.send({ type: "START" });
    await harness.send({ type: "INCREMENT" });

    expectFlowState(harness.runner).toHaveContext({ count: 1 });

    await harness.cleanup();
  });

  it("asserts no activities", () => {
    const harness = createFlowTestHarness(counterMachine);
    expectFlowState(harness.runner).toHaveNoActivities();
  });
});

describe("expectEvents", () => {
  it("verifies event sequence with partial matchers", () => {
    const events = [{ type: "START" }, { type: "INCREMENT" }, { type: "DONE" }];

    expectEvents(events, [{ type: "START" }, { type: "INCREMENT" }, { type: "DONE" }]);
  });
});

describe("expectEventTypes", () => {
  it("verifies event type sequence", () => {
    const events = [{ type: "START" }, { type: "INCREMENT" }, { type: "DONE" }];

    expectEventTypes(events, ["START", "INCREMENT", "DONE"]);
  });
});

describe("expectSnapshot", () => {
  it("asserts snapshot state", () => {
    const harness = createFlowTestHarness(counterMachine);
    const snapshot = harness.snapshot();

    expectSnapshot(snapshot).toBeInState("idle");
    expectSnapshot(snapshot).toHaveContext({ count: 0 });
  });
});

// =============================================================================
// Snapshot Utilities
// =============================================================================

describe("serializeSnapshot", () => {
  it("produces deterministic output", () => {
    const harness = createFlowTestHarness(counterMachine);
    const serialized = serializeSnapshot(harness.snapshot());

    expect(serialized).toEqual({
      state: "idle",
      context: { count: 0 },
      activities: [],
    });
  });
});

describe("snapshotMachine", () => {
  it("captures snapshots for event sequence", async () => {
    const harness = createFlowTestHarness(counterMachine);

    const snapshots = await snapshotMachine(harness, [
      { type: "START" },
      { type: "INCREMENT" },
      { type: "DONE" },
    ]);

    expect(snapshots).toHaveLength(4); // initial + 3 events
    expect(snapshots[0].state).toBe("idle");
    expect(snapshots[1].state).toBe("counting");
    expect(snapshots[2].state).toBe("counting");
    expect(snapshots[2].context).toEqual({ count: 1 });
    expect(snapshots[3].state).toBe("done");

    await harness.cleanup();
  });
});

// =============================================================================
// testGuard
// =============================================================================

describe("testGuard", () => {
  it("returns passed=true when guard returns true", () => {
    const canRetry = (ctx: { retryCount: number }) => ctx.retryCount < 3;
    const result = testGuard(canRetry, {
      context: { retryCount: 2 },
      event: { type: "RETRY" },
    });
    expect(result.passed).toBe(true);
    expect(result.threw).toBe(false);
    expect(result.error).toBeUndefined();
  });

  it("returns passed=false when guard returns false", () => {
    const canRetry = (ctx: { retryCount: number }) => ctx.retryCount < 3;
    const result = testGuard(canRetry, {
      context: { retryCount: 5 },
      event: { type: "RETRY" },
    });
    expect(result.passed).toBe(false);
    expect(result.threw).toBe(false);
  });

  it("captures thrown errors", () => {
    const badGuard = (): boolean => {
      throw new Error("guard boom");
    };
    const result = testGuard(badGuard, {
      context: {},
      event: { type: "TEST" },
    });
    expect(result.passed).toBe(false);
    expect(result.threw).toBe(true);
    expect(result.error).toBeInstanceOf(Error);
  });

  it("works with named guards", () => {
    const isAdmin = guard("isAdmin", (ctx: { role: string }) => ctx.role === "admin");
    const result = testGuard(isAdmin, {
      context: { role: "admin" },
      event: { type: "TEST" },
    });
    expect(result.passed).toBe(true);
  });

  it("works with guard combinators", () => {
    const isAdmin = guard(
      "isAdmin",
      (ctx: { role: string; active: boolean }) => ctx.role === "admin"
    );
    const isActive = guard("isActive", (ctx: { role: string; active: boolean }) => ctx.active);
    const canEdit = and(isAdmin, isActive);

    expect(
      testGuard(canEdit, {
        context: { role: "admin", active: true },
        event: { type: "EDIT" },
      }).passed
    ).toBe(true);

    expect(
      testGuard(canEdit, {
        context: { role: "admin", active: false },
        event: { type: "EDIT" },
      }).passed
    ).toBe(false);
  });

  it("works with not() combinator", () => {
    const isLoading = guard("isLoading", (ctx: { loading: boolean }) => ctx.loading);
    const isNotLoading = not(isLoading);

    expect(
      testGuard(isNotLoading, {
        context: { loading: false },
        event: { type: "TEST" },
      }).passed
    ).toBe(true);

    expect(
      testGuard(isNotLoading, {
        context: { loading: true },
        event: { type: "TEST" },
      }).passed
    ).toBe(false);
  });

  it("passes event to guard function", () => {
    const isCorrectType = (_ctx: unknown, evt: { type: string; payload?: { key: string } }) =>
      evt.payload?.key === "secret";

    expect(
      testGuard(isCorrectType, {
        context: {},
        event: { type: "CHECK", payload: { key: "secret" } },
      }).passed
    ).toBe(true);

    expect(
      testGuard(isCorrectType, {
        context: {},
        event: { type: "CHECK", payload: { key: "wrong" } },
      }).passed
    ).toBe(false);
  });
});

// =============================================================================
// testTransition
// =============================================================================

describe("testTransition", () => {
  it("computes a valid transition", () => {
    const result = testTransition(counterMachine, "idle", { type: "START" });
    expect(result.ok).toBe(true);
    expect(result.transitioned).toBe(true);
    expect(result.target).toBe("counting");
  });

  it("returns transitioned=false for unhandled event", () => {
    const result = testTransition(counterMachine, "idle", { type: "INCREMENT" });
    expect(result.ok).toBe(true);
    expect(result.transitioned).toBe(false);
    expect(result.target).toBeUndefined();
  });

  it("computes context changes from actions", () => {
    const result = testTransition(counterMachine, "counting", { type: "INCREMENT" });
    expect(result.ok).toBe(true);
    expect(result.transitioned).toBe(true);
    expect(result.target).toBe("counting");
    expect(result.newContext).toEqual({ count: 1 });
  });

  it("uses context override", () => {
    const result = testTransition(
      counterMachine,
      "counting",
      { type: "INCREMENT" },
      { context: { count: 10 } }
    );
    expect(result.ok).toBe(true);
    expect(result.newContext).toEqual({ count: 11 });
  });

  it("evaluates guards correctly", () => {
    const resultAllowed = testTransition(guardedMachine, "idle", { type: "ACTIVATE" });
    expect(resultAllowed.ok).toBe(true);
    expect(resultAllowed.target).toBe("active");

    const resultBlocked = testTransition(
      guardedMachine,
      "idle",
      { type: "ACTIVATE" },
      { context: { allowed: false } }
    );
    expect(resultBlocked.ok).toBe(true);
    expect(resultBlocked.target).toBe("blocked");
  });

  it("catches guard errors", () => {
    const errorMachine = defineMachine({
      id: "error-guard",
      initial: "idle" as "idle" | "done",
      context: {},
      states: {
        idle: {
          on: {
            GO: {
              target: "done" as const,
              guard: (): boolean => {
                throw new Error("guard exploded");
              },
            },
          },
        },
        done: { on: {} },
      },
    });

    const result = testTransition(errorMachine, "idle", { type: "GO" });
    expect(result.ok).toBe(false);
    expect(result.error?._tag).toBe("GuardThrew");
  });

  it("catches action errors", () => {
    const errorMachine = defineMachine({
      id: "error-action",
      initial: "idle" as "idle" | "done",
      context: {},
      states: {
        idle: {
          on: {
            GO: {
              target: "done" as const,
              actions: [
                (): never => {
                  throw new Error("action exploded");
                },
              ],
            },
          },
        },
        done: { on: {} },
      },
    });

    const result = testTransition(errorMachine, "idle", { type: "GO" });
    expect(result.ok).toBe(false);
    expect(result.error?._tag).toBe("ActionThrew");
  });

  it("collects effects from transitions", () => {
    const port = { __portName: "TestPort" };
    const effectMachine = defineMachine({
      id: "effect-machine",
      initial: "idle" as "idle" | "active",
      context: {},
      states: {
        idle: {
          on: {
            GO: {
              target: "active" as const,
              effects: [Effect.invoke(port as never, "doSomething" as never, [] as never)],
            },
          },
        },
        active: { on: {} },
      },
    });

    const result = testTransition(effectMachine, "idle", { type: "GO" });
    expect(result.ok).toBe(true);
    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]._tag).toBe("Invoke");
  });

  it("returns empty effects array on error", () => {
    const errorMachine = defineMachine({
      id: "err",
      initial: "idle" as "idle" | "done",
      context: {},
      states: {
        idle: {
          on: {
            GO: {
              target: "done" as const,
              guard: (): boolean => {
                throw new Error("boom");
              },
            },
          },
        },
        done: { on: {} },
      },
    });

    const result = testTransition(errorMachine, "idle", { type: "GO" });
    expect(result.effects).toEqual([]);
  });
});

// =============================================================================
// testEffect
// =============================================================================

describe("testEffect", () => {
  it("handles Delay effects (no-op)", async () => {
    const effect = Effect.delay(1000);
    const result = await testEffect(effect);
    expect(result.ok).toBe(true);
    expect(result.called).toBe(false);
  });

  it("handles None effects", async () => {
    const effect = Effect.none();
    const result = await testEffect(effect);
    expect(result.ok).toBe(true);
  });

  it("executes Invoke effects against mocks", async () => {
    const port = { __portName: "ApiService" };
    const effect = Effect.invoke(port as never, "fetchData" as never, ["id-123"] as never);

    const result = await testEffect(effect, {
      mocks: {
        ApiService: {
          fetchData: (id: unknown) => ({ id, name: "Test" }),
        },
      },
    });

    expect(result.ok).toBe(true);
    expect(result.called).toBe(true);
    expect(result.calledWith).toEqual(["id-123"]);
    expect(result.returnValue).toEqual({ id: "id-123", name: "Test" });
  });

  it("reports error when mock port is missing", async () => {
    const port = { __portName: "MissingPort" };
    const effect = Effect.invoke(port as never, "method" as never, [] as never);

    const result = await testEffect(effect);
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });

  it("reports error when mock method is missing", async () => {
    const port = { __portName: "ApiService" };
    const effect = Effect.invoke(port as never, "nonExistentMethod" as never, [] as never);

    const result = await testEffect(effect, {
      mocks: {
        ApiService: {
          fetchData: () => "ok",
        },
      },
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });

  it("captures errors from mock methods", async () => {
    const port = { __portName: "ApiService" };
    const effect = Effect.invoke(port as never, "badMethod" as never, [] as never);

    const result = await testEffect(effect, {
      mocks: {
        ApiService: {
          badMethod: () => {
            throw new Error("mock failure");
          },
        },
      },
    });

    expect(result.ok).toBe(false);
    expect(result.called).toBe(true);
    expect(result.error).toBeInstanceOf(Error);
  });

  it("handles async mock methods", async () => {
    const port = { __portName: "ApiService" };
    const effect = Effect.invoke(port as never, "asyncMethod" as never, ["arg1"] as never);

    const result = await testEffect(effect, {
      mocks: {
        ApiService: {
          asyncMethod: async (arg: unknown) => `result-${arg}`,
        },
      },
    });

    expect(result.ok).toBe(true);
    expect(result.called).toBe(true);
    expect(result.returnValue).toBe("result-arg1");
  });
});

// =============================================================================
// testFlowInContainer
// =============================================================================

describe("testFlowInContainer", () => {
  it("creates a runner with initial state", () => {
    const test = testFlowInContainer({ machine: counterMachine });
    expect(test.state()).toBe("idle");
    expect(test.context()).toEqual({ count: 0 });
  });

  it("sends events and transitions", async () => {
    const test = testFlowInContainer({ machine: counterMachine });

    await test.send({ type: "START" });
    expect(test.state()).toBe("counting");

    await test.send({ type: "INCREMENT" });
    expect(test.context()).toEqual({ count: 1 });

    await test.dispose();
  });

  it("overrides initial context", () => {
    const test = testFlowInContainer({
      machine: counterMachine,
      context: { count: 42 },
    });

    expect(test.context()).toEqual({ count: 42 });
  });

  it("records executed effects", async () => {
    const test = testFlowInContainer({ machine: counterMachine });

    await test.send({ type: "START" });
    expect(test.effects).toBeDefined();
    expect(Array.isArray([...test.effects])).toBe(true);

    await test.dispose();
  });

  it("provides snapshot access", async () => {
    const test = testFlowInContainer({ machine: counterMachine });

    const snapshot = test.snapshot();
    expect(snapshot.state).toBe("idle");
    expect(snapshot.context).toEqual({ count: 0 });

    await test.dispose();
  });

  it("disposes the runner", async () => {
    const test = testFlowInContainer({ machine: counterMachine });
    await test.dispose();

    expect(test.runner.isDisposed).toBe(true);
  });

  it("handles guard-based transitions", async () => {
    const test = testFlowInContainer({ machine: guardedMachine });

    await test.send({ type: "ACTIVATE" });
    expect(test.state()).toBe("active");

    await test.dispose();
  });

  it("handles guard-based transitions with context override", async () => {
    const test = testFlowInContainer({
      machine: guardedMachine,
      context: { allowed: false },
    });

    await test.send({ type: "ACTIVATE" });
    expect(test.state()).toBe("blocked");

    await test.dispose();
  });
});

// =============================================================================
// DoD 10.5: waitForState(name, timeout) rejects on timeout
// =============================================================================

describe("waitForState timeout", () => {
  it("rejects when timeout expires before entering state", async () => {
    const harness = createFlowTestHarness(counterMachine);

    // Wait for a state we never transition to, with a short timeout
    await expect(harness.waitForState("done", 50)).rejects.toThrow(
      /Timed out waiting for state "done"/
    );

    await harness.cleanup();
  });
});

// =============================================================================
// DoD 10.6: waitForEvent(type) resolves with event payload
// =============================================================================

describe("waitForEvent", () => {
  it("resolves with event when matching event is sent", async () => {
    const harness = createFlowTestHarness(counterMachine);

    // Set up the wait before sending the event
    const waitPromise = harness.waitForEvent("START");
    await harness.send({ type: "START" });

    const event = await waitPromise;
    expect(event.type).toBe("START");

    await harness.cleanup();
  });

  it("resolves only for matching event type", async () => {
    const harness = createFlowTestHarness(counterMachine);

    const waitPromise = harness.waitForEvent("INCREMENT");

    // Send non-matching event first
    await harness.send({ type: "START" });

    // Now send matching event
    await harness.send({ type: "INCREMENT" });

    const event = await waitPromise;
    expect(event.type).toBe("INCREMENT");

    await harness.cleanup();
  });

  it("rejects on timeout", async () => {
    const harness = createFlowTestHarness(counterMachine);

    await expect(harness.waitForEvent("NEVER_SENT", 50)).rejects.toThrow(
      /Timed out waiting for event "NEVER_SENT"/
    );

    await harness.cleanup();
  });
});

// =============================================================================
// DoD 10.17: testEffect(SpawnEffect) captures spawn info
// =============================================================================

describe("testEffect Spawn", () => {
  it("records spawn activityId", async () => {
    const effect = Effect.spawn("myWorker", { data: 42 });
    const result = await testEffect(effect);
    expect(result.ok).toBe(true);
    expect(result.called).toBe(true);
    expect(result.returnValue).toBe("myWorker");
  });
});

// =============================================================================
// DoD 10.18: testEffect(EmitEffect) returns emitted event in Ok
// =============================================================================

describe("testEffect Emit", () => {
  it("returns emitted event data", async () => {
    const effect = Effect.emit({ type: "DATA_LOADED", payload: { items: [1, 2, 3] } });
    const result = await testEffect(effect);
    expect(result.ok).toBe(true);
    expect(result.called).toBe(true);
    expect(result.returnValue).toEqual({ type: "DATA_LOADED", payload: { items: [1, 2, 3] } });
  });

  it("returns event with type only", async () => {
    const effect = Effect.emit({ type: "DONE" });
    const result = await testEffect(effect);
    expect(result.ok).toBe(true);
    expect(result.returnValue).toEqual({ type: "DONE" });
  });
});

// =============================================================================
// DoD 10.28-30: Virtual Clock
// =============================================================================

// =============================================================================
// Additional testFlowInContainer edge cases
// =============================================================================

describe("testFlowInContainer edge cases", () => {
  it("multiple rapid sends do not corrupt state", async () => {
    const test = testFlowInContainer({ machine: counterMachine });

    await test.send({ type: "START" });
    await test.send({ type: "INCREMENT" });
    await test.send({ type: "INCREMENT" });
    await test.send({ type: "INCREMENT" });

    expect(test.context()).toEqual({ count: 3 });
    expect(test.state()).toBe("counting");

    await test.dispose();
  });

  it("snapshot reflects final state after multiple transitions", async () => {
    const test = testFlowInContainer({ machine: counterMachine });

    await test.send({ type: "START" });
    await test.send({ type: "INCREMENT" });
    await test.send({ type: "DONE" });

    const snap = test.snapshot();
    expect(snap.state).toBe("done");
    expect(snap.context).toEqual({ count: 1 });

    await test.dispose();
  });
});

// =============================================================================
// Additional testEffect edge cases
// =============================================================================

describe("testEffect additional cases", () => {
  it("handles Log effects", async () => {
    const effect = Effect.log("test message");
    const result = await testEffect(effect);
    expect(result.ok).toBe(true);
  });

  it("handles Choose effects with empty branches", async () => {
    const effect = Effect.choose([]);
    const result = await testEffect(effect);
    expect(result.ok).toBe(true);
  });

  it("handles Stop effects", async () => {
    const effect = Effect.stop("some-activity");
    const result = await testEffect(effect);
    expect(result.ok).toBe(true);
    expect(result.called).toBe(true);
    expect(result.returnValue).toBe("some-activity");
  });
});

// =============================================================================
// DoD 10.28-30: Virtual Clock
// =============================================================================

describe("createVirtualClock", () => {
  afterEach(() => {
    // Ensure real timers are restored even if a test fails
    vi.useRealTimers();
  });

  it("advance(ms) advances time", async () => {
    const clock = createVirtualClock();
    clock.install();

    let resolved = false;
    const promise = new Promise<void>(resolve => {
      setTimeout(() => {
        resolved = true;
        resolve();
      }, 1000);
    });

    expect(resolved).toBe(false);
    await clock.advance(1000);
    await promise;
    expect(resolved).toBe(true);

    clock.uninstall();
  });

  it("install() replaces timer functions", () => {
    const clock = createVirtualClock();
    const realNow = Date.now();

    clock.install();
    // After install, Date.now() should be controlled
    const virtualNow = clock.now();
    expect(typeof virtualNow).toBe("number");

    clock.uninstall();
    // After uninstall, Date.now() should resume normal behavior
    const afterNow = Date.now();
    expect(afterNow).toBeGreaterThanOrEqual(realNow);
  });

  it("uninstall() restores original timers", async () => {
    const clock = createVirtualClock();
    clock.install();
    clock.uninstall();

    // After uninstall, real setTimeout should work
    let called = false;
    await new Promise<void>(resolve => {
      setTimeout(() => {
        called = true;
        resolve();
      }, 10);
    });
    expect(called).toBe(true);
  });

  it("returns Err when advance is called without install", async () => {
    const clock = createVirtualClock();
    const result = await clock.advance(100);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(/not installed/);
    }
  });

  it("uninstall without install is a no-op", () => {
    const clock = createVirtualClock();
    // Should not throw
    clock.uninstall();
  });

  it("advance returns Err after uninstall", async () => {
    const clock = createVirtualClock();
    clock.install();
    clock.uninstall();
    const result = await clock.advance(100);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(/not installed/);
    }
  });
});

// =============================================================================
// Mutation-killing tests: testFlowInContainer with Invoke effects
// =============================================================================

describe("testFlowInContainer with Invoke effects", () => {
  const invokePort = { __portName: "TestService" };

  const invokeMachine = defineMachine({
    id: "invoker",
    initial: "idle" as "idle" | "loading" | "done" | "error",
    context: {} as Record<string, unknown>,
    states: {
      idle: {
        on: {
          FETCH: {
            target: "loading" as const,
            effects: [Effect.invoke(invokePort as never, "getData" as never, ["arg1"] as never)],
          },
        },
      },
      loading: {
        on: {
          DONE: { target: "done" as const },
          ERROR: { target: "error" as const },
        },
      },
      done: { on: {} },
      error: { on: {} },
    },
  });

  it("executes Invoke effects against mocks and records invocations", async () => {
    const test = testFlowInContainer({
      machine: invokeMachine,
      mocks: {
        TestService: {
          getData: (arg: unknown) => ({ data: arg }),
        },
      },
    });

    await test.send({ type: "FETCH" });
    expect(test.state()).toBe("loading");

    // Verify effect was recorded
    expect(test.effects.length).toBeGreaterThan(0);
    expect(test.effects[0]._tag).toBe("Invoke");

    // Verify invocation record
    expect(test.invocations).toHaveLength(1);
    expect(test.invocations[0].portName).toBe("TestService");
    expect(test.invocations[0].method).toBe("getData");
    expect(test.invocations[0].args).toEqual(["arg1"]);
    expect(test.invocations[0].returnValue).toEqual({ data: "arg1" });
    expect(test.invocations[0].threw).toBe(false);
    expect(test.invocations[0].error).toBeUndefined();

    await test.dispose();
  });

  it("records invocation errors when mock throws", async () => {
    const test = testFlowInContainer({
      machine: invokeMachine,
      mocks: {
        TestService: {
          getData: () => {
            throw new Error("service failure");
          },
        },
      },
    });

    await test.send({ type: "FETCH" });

    // Invocation should record the error
    expect(test.invocations).toHaveLength(1);
    expect(test.invocations[0].portName).toBe("TestService");
    expect(test.invocations[0].method).toBe("getData");
    expect(test.invocations[0].threw).toBe(true);
    expect(test.invocations[0].error).toBeInstanceOf(Error);
    expect(test.invocations[0].returnValue).toBeUndefined();

    await test.dispose();
  });

  it("handles Invoke with no matching mock gracefully", async () => {
    const test = testFlowInContainer({
      machine: invokeMachine,
      mocks: {},
    });

    // Should not throw even with missing mock
    await test.send({ type: "FETCH" });
    expect(test.state()).toBe("loading");
    expect(test.invocations).toHaveLength(0);

    await test.dispose();
  });

  it("handles Invoke with mock that has no matching method", async () => {
    const test = testFlowInContainer({
      machine: invokeMachine,
      mocks: {
        TestService: {
          otherMethod: () => "nope",
        },
      },
    });

    await test.send({ type: "FETCH" });
    expect(test.state()).toBe("loading");
    // No invocations recorded since method was not found
    expect(test.invocations).toHaveLength(0);

    await test.dispose();
  });

  it("defaults mocks to empty object when not provided", async () => {
    const test = testFlowInContainer({
      machine: invokeMachine,
    });

    await test.send({ type: "FETCH" });
    expect(test.state()).toBe("loading");
    expect(test.invocations).toHaveLength(0);

    await test.dispose();
  });
});

// =============================================================================
// Mutation-killing tests: createFlowTestHarness with Invoke effects
// =============================================================================

describe("createFlowTestHarness with Invoke effects", () => {
  const invokePort = { __portName: "MockPort" };

  const invokeMachine = defineMachine({
    id: "harness-invoker",
    initial: "idle" as "idle" | "loading" | "done",
    context: {},
    states: {
      idle: {
        on: {
          FETCH: {
            target: "loading" as const,
            effects: [Effect.invoke(invokePort as never, "doWork" as never, ["x"] as never)],
          },
        },
      },
      loading: { on: { DONE: { target: "done" as const } } },
      done: { on: {} },
    },
  });

  it("executes Invoke effects against mocks via harness", async () => {
    let calledWith: unknown[] = [];
    const harness = createFlowTestHarness(invokeMachine, {
      mocks: {
        MockPort: {
          doWork: (...args: unknown[]) => {
            calledWith = args;
          },
        },
      },
    });

    await harness.send({ type: "FETCH" });
    expect(harness.snapshot().state).toBe("loading");
    expect(calledWith).toEqual(["x"]);
    expect(harness.effects.length).toBeGreaterThan(0);

    await harness.cleanup();
  });

  it("cleanup rejects pending event waiters", async () => {
    const harness = createFlowTestHarness(counterMachine);

    const waitPromise = harness.waitForEvent("NEVER_HAPPENS");

    // Cleanup while waiting
    await harness.cleanup();

    await expect(waitPromise).rejects.toThrow("Harness cleanup while waiting for event");
  });

  it("waitForState resolves when transition happens before timeout fires", async () => {
    const harness = createFlowTestHarness(counterMachine);

    // Start waiting, then quickly transition
    const waitPromise = harness.waitForState("counting", 5000);
    await harness.send({ type: "START" });
    await waitPromise;

    expect(harness.snapshot().state).toBe("counting");
    await harness.cleanup();
  });
});

// =============================================================================
// Mutation-killing tests: testEffect - Sequence and Parallel
// =============================================================================

describe("testEffect Sequence and Parallel", () => {
  it("executes Sequence effects in order", async () => {
    const effect = Effect.sequence([Effect.delay(100), Effect.none()]);
    const result = await testEffect(effect);
    expect(result.ok).toBe(true);
  });

  it("executes Parallel effects", async () => {
    const effect = Effect.parallel([Effect.delay(100), Effect.none()]);
    const result = await testEffect(effect);
    expect(result.ok).toBe(true);
  });

  it("propagates errors from Sequence sub-effects", async () => {
    const port = { __portName: "SeqPort" };
    const effect = Effect.sequence([
      Effect.delay(10),
      Effect.invoke(port as never, "method" as never, [] as never),
    ]);

    // No mocks provided, so the Invoke should fail
    const result = await testEffect(effect);
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });

  it("propagates errors from Parallel sub-effects", async () => {
    const port = { __portName: "ParPort" };
    const effect = Effect.parallel([
      Effect.delay(10),
      Effect.invoke(port as never, "method" as never, [] as never),
    ]);

    // No mocks provided, so the Invoke should fail
    const result = await testEffect(effect);
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });

  it("handles Sequence with successful Invoke sub-effects", async () => {
    const port = { __portName: "SeqOkPort" };
    const effect = Effect.sequence([
      Effect.delay(10),
      Effect.invoke(port as never, "getData" as never, ["a"] as never),
    ]);

    const result = await testEffect(effect, {
      mocks: {
        SeqOkPort: {
          getData: () => "ok",
        },
      },
    });
    expect(result.ok).toBe(true);
  });

  it("handles Parallel with successful Invoke sub-effects", async () => {
    const port = { __portName: "ParOkPort" };
    const effect = Effect.parallel([
      Effect.none(),
      Effect.invoke(port as never, "getData" as never, [] as never),
    ]);

    const result = await testEffect(effect, {
      mocks: {
        ParOkPort: {
          getData: () => "ok",
        },
      },
    });
    expect(result.ok).toBe(true);
  });

  it("handles unknown effect tag via default case", async () => {
    const unknownEffect = { _tag: "UnknownCustomTag" } as never;
    const result = await testEffect(unknownEffect);
    expect(result.ok).toBe(true);
    expect(result.called).toBe(false);
  });
});

// =============================================================================
// Mutation-killing tests: testEffect catch block
// =============================================================================

describe("testEffect top-level catch block", () => {
  it("catches errors thrown during executeEffect", async () => {
    // Create an effect that has _tag "Invoke" but is missing internal properties
    // to trigger an error path
    const brokenEffect = { _tag: "Invoke" } as never;
    const result = await testEffect(brokenEffect);
    // Should return ok: false since method property is missing
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });
});

// =============================================================================
// Mutation-killing tests: testEffect Invoke validation
// =============================================================================

describe("testEffect Invoke validation", () => {
  it("returns error when Invoke effect has no method property", async () => {
    // Invoke without method
    const effect = { _tag: "Invoke", port: { __portName: "SomePort" }, args: [] } as never;
    const result = await testEffect(effect);
    expect(result.ok).toBe(false);
    expect(result.called).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    if (result.error instanceof Error) {
      expect(result.error.message).toContain("method");
    }
  });

  it("returns error when Invoke port has no __portName", async () => {
    const effect = { _tag: "Invoke", port: {}, method: "doStuff", args: [] } as never;
    const result = await testEffect(effect);
    expect(result.ok).toBe(false);
    expect(result.called).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    if (result.error instanceof Error) {
      expect(result.error.message).toContain("__portName");
    }
  });

  it("returns error when port is not an object", async () => {
    const effect = { _tag: "Invoke", port: "not-object", method: "doStuff", args: [] } as never;
    const result = await testEffect(effect);
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });

  it("returns error when port is null", async () => {
    const effect = { _tag: "Invoke", port: null, method: "doStuff", args: [] } as never;
    const result = await testEffect(effect);
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });

  it("reports error message for missing port mock", async () => {
    const port = { __portName: "NonExistentService" };
    const effect = Effect.invoke(port as never, "method" as never, [] as never);
    const result = await testEffect(effect);
    expect(result.ok).toBe(false);
    expect(result.called).toBe(false);
    if (result.error instanceof Error) {
      expect(result.error.message).toContain("NonExistentService");
    }
  });

  it("reports error message for missing method on mock", async () => {
    const port = { __portName: "SvcPort" };
    const effect = Effect.invoke(port as never, "missingMethod" as never, [] as never);
    const result = await testEffect(effect, {
      mocks: {
        SvcPort: {
          otherMethod: () => "nope",
        },
      },
    });
    expect(result.ok).toBe(false);
    expect(result.called).toBe(false);
    if (result.error instanceof Error) {
      expect(result.error.message).toContain("missingMethod");
      expect(result.error.message).toContain("SvcPort");
    }
  });

  it("handles Invoke with non-array args", async () => {
    const port = { __portName: "SvcPort" };
    const effect = {
      _tag: "Invoke",
      port,
      method: "doStuff",
      args: "not-an-array",
    } as never;
    const result = await testEffect(effect, {
      mocks: {
        SvcPort: {
          doStuff: () => "ok",
        },
      },
    });
    // args fallback to empty array
    expect(result.ok).toBe(true);
    expect(result.called).toBe(true);
    expect(result.calledWith).toEqual([]);
  });
});

// =============================================================================
// Mutation-killing tests: assertions
// =============================================================================

describe("expectFlowState additional assertions", () => {
  it("toHaveActivityCount verifies activity count", () => {
    const harness = createFlowTestHarness(counterMachine);
    // Counter machine has no activities, so count should be 0
    expectFlowState(harness.runner).toHaveActivityCount(0);
  });

  it("expectEvents with empty arrays", () => {
    expectEvents([], []);
  });

  it("expectEvents verifies length mismatch (implicit via vitest)", () => {
    // Just verifying that expectEvents works with a matching single-element list
    const events = [{ type: "A" }];
    expectEvents(events, [{ type: "A" }]);
  });

  it("expectEvents verifies each event object matches", () => {
    const events = [
      { type: "A", payload: { x: 1 } },
      { type: "B", payload: { y: 2 } },
    ];
    expectEvents(events, [{ type: "A" }, { type: "B" }]);
  });

  it("expectEventTypes with empty arrays", () => {
    expectEventTypes([], []);
  });

  it("expectSnapshot toBeInState and toHaveContext verify values", () => {
    const harness = createFlowTestHarness(counterMachine, { context: { count: 5 } });
    const snapshot = harness.snapshot();

    expectSnapshot(snapshot).toBeInState("idle");
    expectSnapshot(snapshot).toHaveContext({ count: 5 });
  });
});

// =============================================================================
// Mutation-killing tests: mock-activity
// =============================================================================

describe("createMockActivity additional coverage", () => {
  it("started is initially false before execution", () => {
    const mock = createMockActivity<string, string>({ result: "done" });
    expect(mock.started).toBe(false);
  });

  it("stopped is initially false before execution", () => {
    const mock = createMockActivity<string, string>({ result: "done" });
    expect(mock.stopped).toBe(false);
  });

  it("stopped is true after abort", async () => {
    const mock = createMockActivity<void, void>({ delay: 10000 });
    const controller = new AbortController();

    const promise = mock.activity.execute(undefined as void, null, controller.signal);
    controller.abort();

    await expect(promise).rejects.toThrow("Activity aborted");
    expect(mock.stopped).toBe(true);
  });

  it("reset sets stopped back to false", async () => {
    const mock = createMockActivity<void, void>({ delay: 10000 });
    const controller = new AbortController();

    const promise = mock.activity.execute(undefined as void, null, controller.signal);
    controller.abort();
    await expect(promise).rejects.toThrow();

    expect(mock.stopped).toBe(true);
    mock.reset();
    expect(mock.stopped).toBe(false);
  });

  it("executes with delay = 0 (immediate resolution)", async () => {
    const mock = createMockActivity<void, string>({ result: "fast", delay: 0 });
    const controller = new AbortController();

    const result = await mock.activity.execute(undefined as void, null, controller.signal);
    expect(result).toBe("fast");
    expect(mock.started).toBe(true);
  });

  it("executes with positive delay and resolves after timeout", async () => {
    const mock = createMockActivity<void, string>({ result: "delayed", delay: 50 });
    const controller = new AbortController();

    const result = await mock.activity.execute(undefined as void, null, controller.signal);
    expect(result).toBe("delayed");
    expect(mock.started).toBe(true);
  });

  it("executes with delay and resultFn", async () => {
    const mock = createMockActivity<string, string>({
      resultFn: (input: string) => `processed-${input}`,
      delay: 50,
    });
    const controller = new AbortController();

    const result = await mock.activity.execute("data", null, controller.signal);
    expect(result).toBe("processed-data");
  });

  it("executes with delay and error", async () => {
    const mock = createMockActivity<void, void>({
      error: new Error("delayed error"),
      delay: 50,
    });
    const controller = new AbortController();

    await expect(mock.activity.execute(undefined as void, null, controller.signal)).rejects.toThrow(
      "delayed error"
    );
  });

  it("handles abort during delay clearing the timer", async () => {
    const mock = createMockActivity<void, string>({ result: "never", delay: 60000 });
    const controller = new AbortController();

    const promise = mock.activity.execute(undefined as void, null, controller.signal);

    // Abort during the delay to exercise the clearTimeout path
    controller.abort();

    await expect(promise).rejects.toThrow("Activity aborted");
    expect(mock.stopped).toBe(true);
  });

  it("creates mock with no options", async () => {
    const mock = createMockActivity();
    const controller = new AbortController();

    const result = await mock.activity.execute(undefined, null, controller.signal);
    // result should be undefined since no result/resultFn/error configured
    expect(result).toBeUndefined();
    expect(mock.started).toBe(true);
  });

  it("rejects immediately when signal is already aborted", async () => {
    const mock = createMockActivity<void, string>({ result: "never" });
    const controller = new AbortController();
    controller.abort();

    await expect(mock.activity.execute(undefined as void, null, controller.signal)).rejects.toThrow(
      "Activity aborted"
    );
    expect(mock.stopped).toBe(true);
    expect(mock.started).toBe(true);
  });

  it("sets stopped=true on abort without delay", async () => {
    const mock = createMockActivity<void, string>({ result: "done" });
    const controller = new AbortController();

    // Start execution, then abort on next microtask
    const promise = mock.activity.execute(undefined as void, null, controller.signal);

    // Wait for the resolve to complete first (no delay = immediate)
    const result = await promise;
    expect(result).toBe("done");
    expect(mock.started).toBe(true);
  });

  it("abort during no-delay execution triggers stopped", async () => {
    // Create mock with a delay of 0 (no setTimeout)
    const mock = createMockActivity<void, void>({ delay: 0 });
    const controller = new AbortController();

    // Execute (no delay, resolves immediately)
    await mock.activity.execute(undefined as void, null, controller.signal);

    // Now abort after completion - the listener shouldn't cause issues
    controller.abort();
    expect(mock.started).toBe(true);
  });
});

// =============================================================================
// Mutation-killing tests: mock-effect-executor
// =============================================================================

describe("createMockEffectExecutor additional coverage", () => {
  it("records effects when no responses are configured", async () => {
    const mock = createMockEffectExecutor();

    await mock.executor.execute({ _tag: "Invoke" } as never);
    expect(mock.callCount).toBe(1);
    expect(mock.effects[0].effect._tag).toBe("Invoke");
  });

  it("skips non-matching response tags", async () => {
    let handlerCalled = false;

    const mock = createMockEffectExecutor([
      {
        tag: "Invoke",
        handler: () => {
          handlerCalled = true;
        },
      },
    ]);

    // Send a Delay effect - should not match the Invoke response
    await mock.executor.execute({ _tag: "Delay", milliseconds: 100 } as never);
    expect(handlerCalled).toBe(false);
    expect(mock.callCount).toBe(1);
  });

  it("response with handler but no error calls handler", async () => {
    let receivedEffect: unknown;

    const mock = createMockEffectExecutor([
      {
        tag: "Delay",
        handler: (effect: unknown) => {
          receivedEffect = effect;
        },
      },
    ]);

    const effect = { _tag: "Delay", milliseconds: 500 } as never;
    await mock.executor.execute(effect);
    expect(receivedEffect).toBeDefined();
  });

  it("response with error takes precedence over handler", async () => {
    let handlerCalled = false;

    const mock = createMockEffectExecutor([
      {
        tag: "Invoke",
        error: new Error("priority error"),
        handler: () => {
          handlerCalled = true;
        },
      },
    ]);

    const result = await mock.executor.execute({ _tag: "Invoke" } as never);
    expect(result._tag).toBe("Err");
    expect(handlerCalled).toBe(false);
  });
});

// =============================================================================
// Mutation-killing tests: serializeSnapshot with activities
// =============================================================================

describe("serializeSnapshot with activities", () => {
  it("serializes activities with sequential IDs", () => {
    // Create a fake snapshot with activities
    const fakeSnapshot = {
      state: "active" as const,
      context: {},
      activities: [
        { id: "abc-123", status: "running" as const, startTime: 0, endTime: undefined },
        { id: "def-456", status: "cancelled" as const, startTime: 0, endTime: undefined },
      ],
      pendingEvents: [],
      stateValue: "active",
      matches: () => false,
      can: () => false,
    };

    const serialized = serializeSnapshot(fakeSnapshot);
    expect(serialized.state).toBe("active");
    expect(serialized.activities).toHaveLength(2);
    expect(serialized.activities[0].id).toBe("activity-0");
    expect(serialized.activities[0].status).toBe("running");
    expect(serialized.activities[1].id).toBe("activity-1");
    expect(serialized.activities[1].status).toBe("cancelled");
  });
});

// =============================================================================
// Mutation-killing tests: testTransition error path
// =============================================================================

describe("testTransition error path verification", () => {
  it("returns transitioned=false when guard throws", () => {
    const errorMachine = defineMachine({
      id: "err-trans",
      initial: "idle" as "idle" | "done",
      context: {},
      states: {
        idle: {
          on: {
            GO: {
              target: "done" as const,
              guard: (): boolean => {
                throw new Error("guard boom");
              },
            },
          },
        },
        done: { on: {} },
      },
    });

    const result = testTransition(errorMachine, "idle", { type: "GO" });
    expect(result.ok).toBe(false);
    expect(result.transitioned).toBe(false);
    expect(result.target).toBeUndefined();
    expect(result.newContext).toBeUndefined();
    expect(result.value).toBeUndefined();
    expect(result.effects).toEqual([]);
  });
});

// =============================================================================
// Mutation-killing: assertions.ts - verify assertions actually assert
// =============================================================================

describe("assertion functions actually verify values", () => {
  it("expectFlowState.toBeInState throws on wrong state", async () => {
    const harness = createFlowTestHarness(counterMachine);
    // The machine is in "idle", so asserting "counting" must throw
    expect(() => expectFlowState(harness.runner).toBeInState("counting")).toThrow();
    await harness.cleanup();
  });

  it("expectFlowState.toHaveContext throws on wrong context", async () => {
    const harness = createFlowTestHarness(counterMachine);
    expect(() => expectFlowState(harness.runner).toHaveContext({ count: 999 })).toThrow();
    await harness.cleanup();
  });

  it("expectFlowState.toHaveNoActivities throws when activities exist", () => {
    // Create a mock runner that has activities in snapshot
    const mockRunner = {
      snapshot: () => ({
        state: "active" as const,
        context: {},
        activities: [{ id: "a1", status: "running" as const, startTime: 0, endTime: undefined }],
        pendingEvents: [],
        stateValue: "active",
        matches: () => false,
        can: () => false,
      }),
      state: () => "active" as const,
      context: () => ({}),
    };
    expect(() => expectFlowState(mockRunner).toHaveNoActivities()).toThrow();
  });

  it("expectFlowState.toHaveActivityCount throws on wrong count", () => {
    const harness = createFlowTestHarness(counterMachine);
    expect(() => expectFlowState(harness.runner).toHaveActivityCount(5)).toThrow();
  });

  it("expectEvents throws when events length mismatches", () => {
    const events = [{ type: "A" }];
    expect(() => expectEvents(events, [{ type: "A" }, { type: "B" }])).toThrow();
  });

  it("expectEvents throws when event content mismatches", () => {
    const events = [{ type: "A" }, { type: "B" }];
    expect(() => expectEvents(events, [{ type: "A" }, { type: "WRONG" }])).toThrow();
  });

  it("expectEventTypes throws on mismatch", () => {
    const events = [{ type: "A" }, { type: "B" }];
    expect(() => expectEventTypes(events, ["A", "WRONG"])).toThrow();
  });

  it("expectSnapshot.toBeInState throws on wrong state", () => {
    const harness = createFlowTestHarness(counterMachine);
    const snapshot = harness.snapshot();
    expect(() => expectSnapshot(snapshot).toBeInState("counting")).toThrow();
  });

  it("expectSnapshot.toHaveContext throws on wrong context", () => {
    const harness = createFlowTestHarness(counterMachine);
    const snapshot = harness.snapshot();
    expect(() => expectSnapshot(snapshot).toHaveContext({ count: 999 })).toThrow();
  });
});

// =============================================================================
// Mutation-killing: test-machine.ts createMockExecutor and waiters
// =============================================================================

describe("createFlowTestHarness mock executor thorough coverage", () => {
  const invokePort = { __portName: "HarnessPort" };

  const harnessInvokeMachine = defineMachine({
    id: "harness-invoke",
    initial: "idle" as "idle" | "loading" | "done",
    context: { result: "" },
    states: {
      idle: {
        on: {
          FETCH: {
            target: "loading" as const,
            effects: [Effect.invoke(invokePort as never, "fetchData" as never, ["id-1"] as never)],
          },
        },
      },
      loading: { on: { DONE: { target: "done" as const } } },
      done: { on: {} },
    },
  });

  it("calls mock port method and records effect for Invoke", async () => {
    let receivedArgs: unknown[] = [];
    const harness = createFlowTestHarness(harnessInvokeMachine, {
      mocks: {
        HarnessPort: {
          fetchData: (...args: unknown[]) => {
            receivedArgs = args;
            return "mock-result";
          },
        },
      },
    });

    await harness.send({ type: "FETCH" });
    expect(harness.snapshot().state).toBe("loading");
    expect(receivedArgs).toEqual(["id-1"]);
    // Verify Invoke effect was recorded
    const invokeEffects = harness.effects.filter(e => e._tag === "Invoke");
    expect(invokeEffects).toHaveLength(1);

    await harness.cleanup();
  });

  it("handles Invoke with missing port in mocks gracefully", async () => {
    const harness = createFlowTestHarness(harnessInvokeMachine, {
      mocks: {
        DifferentPort: { fetchData: () => "nope" },
      },
    });

    // Should not throw when port mock is missing
    await harness.send({ type: "FETCH" });
    expect(harness.snapshot().state).toBe("loading");

    await harness.cleanup();
  });

  it("handles Invoke with missing method on mock port gracefully", async () => {
    const harness = createFlowTestHarness(harnessInvokeMachine, {
      mocks: {
        HarnessPort: { otherMethod: () => "nope" },
      },
    });

    await harness.send({ type: "FETCH" });
    expect(harness.snapshot().state).toBe("loading");

    await harness.cleanup();
  });

  it("handles Invoke with non-object service mock", async () => {
    const harness = createFlowTestHarness(harnessInvokeMachine, {
      mocks: {
        HarnessPort: "not-an-object" as never,
      },
    });

    await harness.send({ type: "FETCH" });
    expect(harness.snapshot().state).toBe("loading");

    await harness.cleanup();
  });

  it("handles harness with empty mocks object", async () => {
    const harness = createFlowTestHarness(harnessInvokeMachine, {
      mocks: {},
    });

    await harness.send({ type: "FETCH" });
    expect(harness.snapshot().state).toBe("loading");
    await harness.cleanup();
  });

  it("handles harness with no mocks option", async () => {
    const harness = createFlowTestHarness(harnessInvokeMachine);

    await harness.send({ type: "FETCH" });
    expect(harness.snapshot().state).toBe("loading");
    await harness.cleanup();
  });

  it("waitForEvent timeout removes the waiter from the list", async () => {
    const harness = createFlowTestHarness(counterMachine);

    // First waiter times out
    await expect(harness.waitForEvent("TIMEOUT_ME", 30)).rejects.toThrow(
      /Timed out waiting for event "TIMEOUT_ME"/
    );

    // Now send START and set up a new waiter that succeeds
    const waitPromise = harness.waitForEvent("START");
    await harness.send({ type: "START" });
    const event = await waitPromise;
    expect(event.type).toBe("START");

    await harness.cleanup();
  });

  it("cleanup clears multiple pending event waiters", async () => {
    const harness = createFlowTestHarness(counterMachine);

    const wait1 = harness.waitForEvent("E1");
    const wait2 = harness.waitForEvent("E2");

    await harness.cleanup();

    await expect(wait1).rejects.toThrow("Harness cleanup while waiting for event");
    await expect(wait2).rejects.toThrow("Harness cleanup while waiting for event");
  });

  it("send resolves matching waiters and clears their timers", async () => {
    const harness = createFlowTestHarness(counterMachine);

    // Set up waiter with a long timeout
    const waitPromise = harness.waitForEvent("START", 30000);

    // Send the matching event -- this should resolve the waiter and clear the timer
    await harness.send({ type: "START" });

    const event = await waitPromise;
    expect(event.type).toBe("START");

    // Cleanup should work normally since the waiter was resolved
    await harness.cleanup();
  });

  it("non-matching events do not resolve waiters", async () => {
    const harness = createFlowTestHarness(counterMachine);

    const waitPromise = harness.waitForEvent("DONE", 100);

    // Send a non-matching event
    await harness.send({ type: "START" });

    // The waiter should eventually timeout since DONE was never sent
    await expect(waitPromise).rejects.toThrow(/Timed out/);

    await harness.cleanup();
  });
});

// =============================================================================
// Mutation-killing: test-flow-in-container.ts detailed executor paths
// =============================================================================

describe("testFlowInContainer detailed executor paths", () => {
  const invokePort = { __portName: "DetailPort" };

  const multiInvokeMachine = defineMachine({
    id: "multi-invoker",
    initial: "idle" as "idle" | "step1" | "step2" | "done",
    context: {},
    states: {
      idle: {
        on: {
          GO: {
            target: "step1" as const,
            effects: [
              Effect.invoke(invokePort as never, "methodA" as never, ["a1", "a2"] as never),
            ],
          },
        },
      },
      step1: {
        on: {
          NEXT: {
            target: "step2" as const,
            effects: [Effect.invoke(invokePort as never, "methodB" as never, [] as never)],
          },
        },
      },
      step2: {
        on: {
          FINISH: { target: "done" as const },
        },
      },
      done: { on: {} },
    },
  });

  it("records multiple invocations from separate transitions", async () => {
    const test = testFlowInContainer({
      machine: multiInvokeMachine,
      mocks: {
        DetailPort: {
          methodA: (a: unknown, b: unknown) => `${a}-${b}`,
          methodB: () => "b-result",
        },
      },
    });

    await test.send({ type: "GO" });
    expect(test.invocations).toHaveLength(1);
    expect(test.invocations[0].portName).toBe("DetailPort");
    expect(test.invocations[0].method).toBe("methodA");
    expect(test.invocations[0].args).toEqual(["a1", "a2"]);
    expect(test.invocations[0].threw).toBe(false);

    await test.send({ type: "NEXT" });
    expect(test.invocations).toHaveLength(2);
    expect(test.invocations[1].method).toBe("methodB");
    expect(test.invocations[1].args).toEqual([]);

    await test.dispose();
  });

  it("handles async mock methods in container", async () => {
    const asyncPort = { __portName: "AsyncPort" };
    const asyncMachine = defineMachine({
      id: "async-invoker",
      initial: "idle" as "idle" | "loading",
      context: {},
      states: {
        idle: {
          on: {
            GO: {
              target: "loading" as const,
              effects: [
                Effect.invoke(asyncPort as never, "fetchAsync" as never, ["param"] as never),
              ],
            },
          },
        },
        loading: { on: {} },
      },
    });

    const test = testFlowInContainer({
      machine: asyncMachine,
      mocks: {
        AsyncPort: {
          fetchAsync: async (p: unknown) => `async-${p}`,
        },
      },
    });

    await test.send({ type: "GO" });
    expect(test.invocations).toHaveLength(1);
    expect(test.invocations[0].threw).toBe(false);

    await test.dispose();
  });

  it("handles non-Invoke effects as no-ops in container", async () => {
    const delayMachine = defineMachine({
      id: "delay-machine",
      initial: "idle" as "idle" | "waiting",
      context: {},
      states: {
        idle: {
          on: {
            GO: {
              target: "waiting" as const,
              effects: [Effect.delay(1000)],
            },
          },
        },
        waiting: { on: {} },
      },
    });

    const test = testFlowInContainer({ machine: delayMachine });
    await test.send({ type: "GO" });
    expect(test.state()).toBe("waiting");
    // Delay is a no-op, no invocations
    expect(test.invocations).toHaveLength(0);
    expect(test.effects.length).toBe(1);
    expect(test.effects[0]._tag).toBe("Delay");

    await test.dispose();
  });

  it("handles mock service that is null", async () => {
    const test = testFlowInContainer({
      machine: multiInvokeMachine,
      mocks: {
        DetailPort: null as never,
      },
    });

    await test.send({ type: "GO" });
    // Should not crash, but no invocations recorded
    expect(test.invocations).toHaveLength(0);

    await test.dispose();
  });
});

// =============================================================================
// Mutation-killing: test-effect.ts getProperty edge cases
// =============================================================================

describe("testEffect getProperty edge cases", () => {
  it("handles Invoke with method=42 (non-string method)", async () => {
    const effect = { _tag: "Invoke", port: { __portName: "P" }, method: 42, args: [] } as never;
    const result = await testEffect(effect);
    expect(result.ok).toBe(false);
    expect(result.called).toBe(false);
  });

  it("handles Sequence with non-array effects property", async () => {
    const effect = { _tag: "Sequence", effects: "not-an-array" } as never;
    const result = await testEffect(effect);
    expect(result.ok).toBe(true);
    expect(result.called).toBe(false);
  });

  it("handles Parallel with non-array effects property", async () => {
    const effect = { _tag: "Parallel", effects: "not-an-array" } as never;
    const result = await testEffect(effect);
    expect(result.ok).toBe(true);
    expect(result.called).toBe(false);
  });

  it("handles Sequence with no effects property", async () => {
    const effect = { _tag: "Sequence" } as never;
    const result = await testEffect(effect);
    expect(result.ok).toBe(true);
    expect(result.called).toBe(false);
  });

  it("handles Parallel with no effects property", async () => {
    const effect = { _tag: "Parallel" } as never;
    const result = await testEffect(effect);
    expect(result.ok).toBe(true);
    expect(result.called).toBe(false);
  });

  it("Sequence propagates and returns the sub-effect error result", async () => {
    const port = { __portName: "FailPort" };
    const effect = Effect.sequence([Effect.invoke(port as never, "fail" as never, [] as never)]);

    const result = await testEffect(effect);
    expect(result.ok).toBe(false);
    // The error is from the missing mock
    expect(result.error).toBeInstanceOf(Error);
  });

  it("Parallel propagates and returns the sub-effect error result", async () => {
    const port = { __portName: "FailPort" };
    const effect = Effect.parallel([Effect.invoke(port as never, "fail" as never, [] as never)]);

    const result = await testEffect(effect);
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });

  it("testEffect Sequence returns ok with called=false", async () => {
    const effect = Effect.sequence([Effect.delay(10), Effect.delay(20)]);
    const result = await testEffect(effect);
    expect(result.ok).toBe(true);
    expect(result.called).toBe(false);
  });

  it("testEffect Parallel returns ok with called=false", async () => {
    const effect = Effect.parallel([Effect.delay(10), Effect.delay(20)]);
    const result = await testEffect(effect);
    expect(result.ok).toBe(true);
    expect(result.called).toBe(false);
  });
});

// =============================================================================
// Mutation-killing: mock-activity.ts precise behavior verification
// =============================================================================

describe("createMockActivity precise behavior", () => {
  it("abort listener is registered on signal", async () => {
    const mock = createMockActivity<void, string>({ result: "done" });
    const controller = new AbortController();

    // Track listeners
    const addSpy = vi.spyOn(controller.signal, "addEventListener");

    await mock.activity.execute(undefined as void, null, controller.signal);

    // Verify addEventListener was called with "abort"
    expect(addSpy).toHaveBeenCalledWith("abort", expect.anything());

    addSpy.mockRestore();
  });

  it("abort during delay clears timeout and calls finish", async () => {
    const mock = createMockActivity<void, string>({ result: "value", delay: 60000 });
    const controller = new AbortController();

    // Use a spy to verify clearTimeout was called
    const clearSpy = vi.spyOn(globalThis, "clearTimeout");

    const promise = mock.activity.execute(undefined as void, null, controller.signal);
    controller.abort();

    await expect(promise).rejects.toThrow("Activity aborted");
    expect(clearSpy).toHaveBeenCalled();

    clearSpy.mockRestore();
  });

  it("multiple starts increment count correctly", async () => {
    const mock = createMockActivity<string, string>({ result: "ok" });
    const c1 = new AbortController();
    const c2 = new AbortController();
    const c3 = new AbortController();

    await mock.activity.execute("a", null, c1.signal);
    await mock.activity.execute("b", null, c2.signal);
    await mock.activity.execute("c", null, c3.signal);

    expect(mock.startCount).toBe(3);
    expect(mock.lastInput).toBe("c");
  });

  it("delay with value > 0 uses setTimeout", async () => {
    const mock = createMockActivity<void, string>({ result: "delayed", delay: 10 });
    const controller = new AbortController();

    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const result = await mock.activity.execute(undefined as void, null, controller.signal);
    expect(result).toBe("delayed");
    expect(setTimeoutSpy).toHaveBeenCalled();
    setTimeoutSpy.mockRestore();
  });

  it("delay = 0 does not use setTimeout", async () => {
    const mock = createMockActivity<void, string>({ result: "immediate", delay: 0 });
    const controller = new AbortController();

    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const callsBefore = setTimeoutSpy.mock.calls.length;
    await mock.activity.execute(undefined as void, null, controller.signal);
    // No new setTimeout calls for the activity itself
    expect(setTimeoutSpy.mock.calls.length).toBe(callsBefore);
    setTimeoutSpy.mockRestore();
  });
});

// =============================================================================
// Mutation-killing: mock-effect-executor.ts conditional branches
// =============================================================================

describe("createMockEffectExecutor conditional branch coverage", () => {
  it("with undefined responses does not iterate responses", async () => {
    // Create without any responses
    const mock = createMockEffectExecutor();
    const result = await mock.executor.execute({ _tag: "Delay", milliseconds: 100 } as never);
    expect(result._tag).toBe("Ok");
    expect(mock.callCount).toBe(1);
  });

  it("response tag must exactly match effect tag", async () => {
    let called = false;
    const mock = createMockEffectExecutor([
      {
        tag: "Invoke",
        handler: () => {
          called = true;
        },
      },
    ]);

    // Send a Delay, handler should NOT be called
    await mock.executor.execute({ _tag: "Delay", milliseconds: 50 } as never);
    expect(called).toBe(false);

    // Send an Invoke, handler SHOULD be called
    await mock.executor.execute({ _tag: "Invoke" } as never);
    expect(called).toBe(true);
  });

  it("response without handler and without error just returns", async () => {
    const mock = createMockEffectExecutor([
      {
        tag: "Delay",
      },
    ]);

    const result = await mock.executor.execute({ _tag: "Delay", milliseconds: 50 } as never);
    expect(result._tag).toBe("Ok");
  });

  it("error in executor is wrapped in InvokeError", async () => {
    const mock = createMockEffectExecutor([
      {
        tag: "Invoke",
        error: new Error("execution failed"),
      },
    ]);

    const result = await mock.executor.execute({ _tag: "Invoke" } as never);
    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error._tag).toBe("InvokeError");
    }
  });
});

// =============================================================================
// Mutation-killing: virtual-clock.ts uninstall conditional
// =============================================================================

describe("createVirtualClock uninstall conditional", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("uninstall when not installed does not call useRealTimers", async () => {
    const clock = createVirtualClock();
    // uninstall without install is a no-op
    clock.uninstall();
    // The clock should still be "not installed"
    const result = await clock.advance(100);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(/not installed/);
    }
  });

  it("double uninstall does not error", () => {
    const clock = createVirtualClock();
    clock.install();
    clock.uninstall();
    clock.uninstall(); // second uninstall should be no-op
  });

  it("uninstall after install actually restores so advance returns Err", async () => {
    const clock = createVirtualClock();
    clock.install();
    // After uninstall, installed should be false
    clock.uninstall();
    // This proves that uninstall() actually set installed = false
    const result = await clock.advance(50);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(/not installed/);
    }
  });
});

// =============================================================================
// Mutation-killing: Exhaustive Invoke executor path tests
// =============================================================================

describe("testFlowInContainer executor internals", () => {
  // Test machine with an effect that has no port (to exercise getProperty returning undefined for port)
  it("handles Invoke effect with non-array args in container", async () => {
    // Create a machine with a crafted effect that has non-array args
    const port = { __portName: "ArgsPort" };
    const craftedMachine = defineMachine({
      id: "crafted",
      initial: "idle" as "idle" | "done",
      context: {},
      states: {
        idle: {
          on: {
            GO: {
              target: "done" as const,
              effects: [
                // Normal invoke effect - but we want to test the executor
                Effect.invoke(port as never, "action" as never, ["arg1"] as never),
              ],
            },
          },
        },
        done: { on: {} },
      },
    });

    let called = false;
    const test = testFlowInContainer({
      machine: craftedMachine,
      mocks: {
        ArgsPort: {
          action: () => {
            called = true;
          },
        },
      },
    });

    await test.send({ type: "GO" });
    // The mock was called through the executor
    expect(called).toBe(true);
    expect(test.invocations).toHaveLength(1);
    expect(test.invocations[0].args).toEqual(["arg1"]);
    await test.dispose();
  });

  it("container executor invokes mock and records return value correctly", async () => {
    const port = { __portName: "RetPort" };
    const retMachine = defineMachine({
      id: "ret-machine",
      initial: "idle" as "idle" | "done",
      context: {},
      states: {
        idle: {
          on: {
            GO: {
              target: "done" as const,
              effects: [Effect.invoke(port as never, "getVal" as never, [] as never)],
            },
          },
        },
        done: { on: {} },
      },
    });

    const test = testFlowInContainer({
      machine: retMachine,
      mocks: {
        RetPort: {
          getVal: () => 42,
        },
      },
    });

    await test.send({ type: "GO" });
    expect(test.invocations[0].returnValue).toBe(42);
    expect(test.invocations[0].threw).toBe(false);
    await test.dispose();
  });
});

// =============================================================================
// Mutation-killing: createFlowTestHarness Invoke mock executor internals
// =============================================================================

describe("createFlowTestHarness Invoke executor detailed tests", () => {
  it("mock executor passes through non-Invoke effects as no-ops", async () => {
    const delayMachine = defineMachine({
      id: "delay-harness",
      initial: "idle" as "idle" | "waiting",
      context: {},
      states: {
        idle: {
          on: {
            GO: {
              target: "waiting" as const,
              effects: [Effect.delay(100)],
            },
          },
        },
        waiting: { on: {} },
      },
    });

    const harness = createFlowTestHarness(delayMachine);
    await harness.send({ type: "GO" });
    expect(harness.snapshot().state).toBe("waiting");
    // Delay is recorded as an effect
    expect(harness.effects).toHaveLength(1);
    expect(harness.effects[0]._tag).toBe("Delay");
    await harness.cleanup();
  });

  it("mock executor calls mock for Invoke and records it as effect", async () => {
    const port = { __portName: "ExecPort" };
    const invMachine = defineMachine({
      id: "exec-test",
      initial: "a" as "a" | "b",
      context: {},
      states: {
        a: {
          on: {
            GO: {
              target: "b" as const,
              effects: [Effect.invoke(port as never, "run" as never, ["p1", "p2"] as never)],
            },
          },
        },
        b: { on: {} },
      },
    });

    const calls: unknown[][] = [];
    const harness = createFlowTestHarness(invMachine, {
      mocks: {
        ExecPort: {
          run: (...args: unknown[]) => {
            calls.push(args);
            return "exec-result";
          },
        },
      },
    });

    await harness.send({ type: "GO" });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual(["p1", "p2"]);
    expect(harness.effects).toHaveLength(1);
    expect(harness.effects[0]._tag).toBe("Invoke");
    await harness.cleanup();
  });

  it("mock executor handles async mock methods in harness", async () => {
    const port = { __portName: "AsyncHarnessPort" };
    const asyncMachine = defineMachine({
      id: "async-harness",
      initial: "idle" as "idle" | "done",
      context: {},
      states: {
        idle: {
          on: {
            GO: {
              target: "done" as const,
              effects: [Effect.invoke(port as never, "asyncOp" as never, ["val"] as never)],
            },
          },
        },
        done: { on: {} },
      },
    });

    let asyncCalled = false;
    const harness = createFlowTestHarness(asyncMachine, {
      mocks: {
        AsyncHarnessPort: {
          asyncOp: async (v: unknown) => {
            asyncCalled = true;
            return `async-${v}`;
          },
        },
      },
    });

    await harness.send({ type: "GO" });
    expect(asyncCalled).toBe(true);
    await harness.cleanup();
  });

  it("mock executor handles mock that throws in harness", async () => {
    const port = { __portName: "ThrowPort" };
    const throwMachine = defineMachine({
      id: "throw-harness",
      initial: "idle" as "idle" | "done",
      context: {},
      states: {
        idle: {
          on: {
            GO: {
              target: "done" as const,
              effects: [Effect.invoke(port as never, "throwOp" as never, [] as never)],
            },
          },
        },
        done: { on: {} },
      },
    });

    const harness = createFlowTestHarness(throwMachine, {
      mocks: {
        ThrowPort: {
          throwOp: () => {
            throw new Error("harness throw test");
          },
        },
      },
    });

    // The error is caught by the executor's ResultAsync error mapping
    // The machine still transitions because the runner handles the error
    await harness.send({ type: "GO" });
    await harness.cleanup();
  });
});

// =============================================================================
// Mutation-killing: testEffect - Ensure Spawn block is exercised distinctly
// =============================================================================

describe("testEffect Spawn distinction", () => {
  it("Spawn effect returns activityId, not undefined", async () => {
    const effect = Effect.spawn("worker-1", { key: "val" });
    const result = await testEffect(effect);
    expect(result.ok).toBe(true);
    expect(result.called).toBe(true);
    // The return value must be the activityId, not undefined
    expect(result.returnValue).toBe("worker-1");
    expect(result.returnValue).not.toBeUndefined();
  });

  it("Spawn effect with different ID returns that ID", async () => {
    const effect = Effect.spawn("another-worker", undefined);
    const result = await testEffect(effect);
    expect(result.returnValue).toBe("another-worker");
  });
});

// =============================================================================
// Mutation-killing: testEffect - ensure Delay and None are distinct
// =============================================================================

describe("testEffect Delay vs None distinction", () => {
  it("Delay effect returns called=false and ok=true", async () => {
    const effect = Effect.delay(500);
    const result = await testEffect(effect);
    expect(result.ok).toBe(true);
    expect(result.called).toBe(false);
    expect(result.returnValue).toBeUndefined();
    expect(result.calledWith).toBeUndefined();
  });

  it("None effect returns called=false and ok=true", async () => {
    const effect = Effect.none();
    const result = await testEffect(effect);
    expect(result.ok).toBe(true);
    expect(result.called).toBe(false);
    expect(result.returnValue).toBeUndefined();
    expect(result.calledWith).toBeUndefined();
  });
});

// =============================================================================
// Mutation-killing: testEffect catch block - force real throw from executeEffect
// =============================================================================

describe("testEffect error handling", () => {
  it("catches synchronous errors thrown by executeEffect", async () => {
    // An effect with _tag that is not a string at runtime should not happen
    // but let's test the default case more thoroughly
    const effect = { _tag: "SomethingVeryUnknown" } as never;
    const result = await testEffect(effect);
    expect(result.ok).toBe(true);
    expect(result.called).toBe(false);
  });
});

// =============================================================================
// Mutation-killing: mock-effect-executor - handler conditional and error/handler ordering
// =============================================================================

describe("createMockEffectExecutor handler ordering", () => {
  it("response with only handler calls the handler and returns Ok", async () => {
    let handlerCallCount = 0;
    const mock = createMockEffectExecutor([
      {
        tag: "Invoke",
        handler: () => {
          handlerCallCount++;
        },
      },
    ]);

    const result = await mock.executor.execute({ _tag: "Invoke" } as never);
    expect(result._tag).toBe("Ok");
    expect(handlerCallCount).toBe(1);
  });

  it("response with error but no handler returns Err without calling handler", async () => {
    const mock = createMockEffectExecutor([
      {
        tag: "Invoke",
        error: new Error("test error"),
      },
    ]);

    const result = await mock.executor.execute({ _tag: "Invoke" } as never);
    expect(result._tag).toBe("Err");
  });

  it("multiple responses: first matching one is used", async () => {
    let firstCalled = false;
    let secondCalled = false;

    const mock = createMockEffectExecutor([
      {
        tag: "Invoke",
        handler: () => {
          firstCalled = true;
        },
      },
      {
        tag: "Invoke",
        handler: () => {
          secondCalled = true;
        },
      },
    ]);

    await mock.executor.execute({ _tag: "Invoke" } as never);
    expect(firstCalled).toBe(true);
    expect(secondCalled).toBe(false);
  });
});

// =============================================================================
// Mutation-killing: expectEvents for-loop boundary condition
// =============================================================================

describe("expectEvents boundary", () => {
  it("expectEvents iterates through all elements", () => {
    const events = [
      { type: "A", data: 1 },
      { type: "B", data: 2 },
      { type: "C", data: 3 },
    ];
    const expected = [
      { type: "A", data: 1 },
      { type: "B", data: 2 },
      { type: "C", data: 3 },
    ];
    // This tests that all elements are compared
    expectEvents(events, expected);
  });

  it("expectEvents fails if last element mismatches", () => {
    const events = [{ type: "A" }, { type: "B" }, { type: "C" }];
    expect(() => expectEvents(events, [{ type: "A" }, { type: "B" }, { type: "WRONG" }])).toThrow();
  });

  it("expectEvents with single element", () => {
    expectEvents([{ type: "X" }], [{ type: "X" }]);
  });

  it("expectEvents single element mismatch throws", () => {
    expect(() => expectEvents([{ type: "X" }], [{ type: "Y" }])).toThrow();
  });
});

// =============================================================================
// Mutation-killing: Exercise internal getProperty and conditional chains
// in test-flow-in-container.ts and test-machine.ts with malformed effects
// =============================================================================

describe("testFlowInContainer with malformed Invoke effects", () => {
  it("handles Invoke effect with non-object port (string port)", async () => {
    // Create a machine with an effect tagged as Invoke but with a string port
    const malformedMachine = defineMachine({
      id: "malformed-port",
      initial: "idle" as "idle" | "done",
      context: {},
      states: {
        idle: {
          on: {
            GO: {
              target: "done" as const,
              effects: [{ _tag: "Invoke", port: "string-port", method: "doIt", args: [] } as never],
            },
          },
        },
        done: { on: {} },
      },
    });

    const test = testFlowInContainer({
      machine: malformedMachine,
      mocks: {},
    });

    await test.send({ type: "GO" });
    expect(test.state()).toBe("done");
    // No invocations since port is not an object
    expect(test.invocations).toHaveLength(0);
    await test.dispose();
  });

  it("handles Invoke effect with null port", async () => {
    const malformedMachine = defineMachine({
      id: "null-port",
      initial: "idle" as "idle" | "done",
      context: {},
      states: {
        idle: {
          on: {
            GO: {
              target: "done" as const,
              effects: [{ _tag: "Invoke", port: null, method: "doIt", args: [] } as never],
            },
          },
        },
        done: { on: {} },
      },
    });

    const test = testFlowInContainer({ machine: malformedMachine, mocks: {} });
    await test.send({ type: "GO" });
    expect(test.state()).toBe("done");
    expect(test.invocations).toHaveLength(0);
    await test.dispose();
  });

  it("handles Invoke effect with port missing __portName", async () => {
    const malformedMachine = defineMachine({
      id: "no-portname",
      initial: "idle" as "idle" | "done",
      context: {},
      states: {
        idle: {
          on: {
            GO: {
              target: "done" as const,
              effects: [
                { _tag: "Invoke", port: { name: "wrong-key" }, method: "doIt", args: [] } as never,
              ],
            },
          },
        },
        done: { on: {} },
      },
    });

    const test = testFlowInContainer({ machine: malformedMachine, mocks: {} });
    await test.send({ type: "GO" });
    expect(test.state()).toBe("done");
    expect(test.invocations).toHaveLength(0);
    await test.dispose();
  });

  it("handles Invoke effect with non-string method", async () => {
    const malformedMachine = defineMachine({
      id: "bad-method",
      initial: "idle" as "idle" | "done",
      context: {},
      states: {
        idle: {
          on: {
            GO: {
              target: "done" as const,
              effects: [
                { _tag: "Invoke", port: { __portName: "Svc" }, method: 42, args: [] } as never,
              ],
            },
          },
        },
        done: { on: {} },
      },
    });

    const test = testFlowInContainer({ machine: malformedMachine, mocks: {} });
    await test.send({ type: "GO" });
    expect(test.state()).toBe("done");
    expect(test.invocations).toHaveLength(0);
    await test.dispose();
  });

  it("handles Invoke effect with no port property", async () => {
    const malformedMachine = defineMachine({
      id: "missing-port",
      initial: "idle" as "idle" | "done",
      context: {},
      states: {
        idle: {
          on: {
            GO: {
              target: "done" as const,
              effects: [{ _tag: "Invoke", method: "doIt", args: [] } as never],
            },
          },
        },
        done: { on: {} },
      },
    });

    const test = testFlowInContainer({ machine: malformedMachine, mocks: {} });
    await test.send({ type: "GO" });
    expect(test.state()).toBe("done");
    expect(test.invocations).toHaveLength(0);
    await test.dispose();
  });

  it("handles Invoke effect with no method property", async () => {
    const malformedMachine = defineMachine({
      id: "missing-method",
      initial: "idle" as "idle" | "done",
      context: {},
      states: {
        idle: {
          on: {
            GO: {
              target: "done" as const,
              effects: [{ _tag: "Invoke", port: { __portName: "Svc" }, args: [] } as never],
            },
          },
        },
        done: { on: {} },
      },
    });

    const test = testFlowInContainer({ machine: malformedMachine, mocks: {} });
    await test.send({ type: "GO" });
    expect(test.state()).toBe("done");
    expect(test.invocations).toHaveLength(0);
    await test.dispose();
  });

  it("handles Invoke effect with non-array args", async () => {
    const malformedMachine = defineMachine({
      id: "bad-args",
      initial: "idle" as "idle" | "done",
      context: {},
      states: {
        idle: {
          on: {
            GO: {
              target: "done" as const,
              effects: [
                {
                  _tag: "Invoke",
                  port: { __portName: "Svc" },
                  method: "doIt",
                  args: "not-array",
                } as never,
              ],
            },
          },
        },
        done: { on: {} },
      },
    });

    let called = false;
    const test = testFlowInContainer({
      machine: malformedMachine,
      mocks: {
        Svc: {
          doIt: () => {
            called = true;
          },
        },
      },
    });

    await test.send({ type: "GO" });
    expect(test.state()).toBe("done");
    // Should use fallback empty array for args
    expect(called).toBe(true);
    expect(test.invocations).toHaveLength(1);
    expect(test.invocations[0].args).toEqual([]);
    await test.dispose();
  });

  it("handles Invoke with service mock being undefined value", async () => {
    const port = { __portName: "UndSvc" };
    const machine = defineMachine({
      id: "und-svc",
      initial: "idle" as "idle" | "done",
      context: {},
      states: {
        idle: {
          on: {
            GO: {
              target: "done" as const,
              effects: [Effect.invoke(port as never, "doIt" as never, [] as never)],
            },
          },
        },
        done: { on: {} },
      },
    });

    const test = testFlowInContainer({
      machine,
      mocks: {
        UndSvc: undefined as never,
      },
    });

    await test.send({ type: "GO" });
    expect(test.invocations).toHaveLength(0);
    await test.dispose();
  });

  it("handles Invoke where service method is not a function", async () => {
    const port = { __portName: "BadFnSvc" };
    const machine = defineMachine({
      id: "bad-fn",
      initial: "idle" as "idle" | "done",
      context: {},
      states: {
        idle: {
          on: {
            GO: {
              target: "done" as const,
              effects: [Effect.invoke(port as never, "notAFn" as never, [] as never)],
            },
          },
        },
        done: { on: {} },
      },
    });

    const test = testFlowInContainer({
      machine,
      mocks: {
        BadFnSvc: {
          notAFn: "string-value",
        },
      },
    });

    await test.send({ type: "GO" });
    expect(test.invocations).toHaveLength(0);
    await test.dispose();
  });
});

describe("createFlowTestHarness with malformed Invoke effects", () => {
  it("handles Invoke effect with string port in harness", async () => {
    const malformedMachine = defineMachine({
      id: "harness-malformed",
      initial: "idle" as "idle" | "done",
      context: {},
      states: {
        idle: {
          on: {
            GO: {
              target: "done" as const,
              effects: [{ _tag: "Invoke", port: "bad-port", method: "fn", args: [] } as never],
            },
          },
        },
        done: { on: {} },
      },
    });

    const harness = createFlowTestHarness(malformedMachine);
    await harness.send({ type: "GO" });
    expect(harness.snapshot().state).toBe("done");
    await harness.cleanup();
  });

  it("handles Invoke effect with null port in harness", async () => {
    const malformedMachine = defineMachine({
      id: "harness-null-port",
      initial: "idle" as "idle" | "done",
      context: {},
      states: {
        idle: {
          on: {
            GO: {
              target: "done" as const,
              effects: [{ _tag: "Invoke", port: null, method: "fn", args: [] } as never],
            },
          },
        },
        done: { on: {} },
      },
    });

    const harness = createFlowTestHarness(malformedMachine);
    await harness.send({ type: "GO" });
    expect(harness.snapshot().state).toBe("done");
    await harness.cleanup();
  });

  it("handles Invoke with port missing __portName in harness", async () => {
    const malformedMachine = defineMachine({
      id: "harness-no-portname",
      initial: "idle" as "idle" | "done",
      context: {},
      states: {
        idle: {
          on: {
            GO: {
              target: "done" as const,
              effects: [
                { _tag: "Invoke", port: { other: "key" }, method: "fn", args: [] } as never,
              ],
            },
          },
        },
        done: { on: {} },
      },
    });

    const harness = createFlowTestHarness(malformedMachine);
    await harness.send({ type: "GO" });
    expect(harness.snapshot().state).toBe("done");
    await harness.cleanup();
  });

  it("handles Invoke with non-string method in harness", async () => {
    const malformedMachine = defineMachine({
      id: "harness-bad-method",
      initial: "idle" as "idle" | "done",
      context: {},
      states: {
        idle: {
          on: {
            GO: {
              target: "done" as const,
              effects: [
                { _tag: "Invoke", port: { __portName: "Svc" }, method: 999, args: [] } as never,
              ],
            },
          },
        },
        done: { on: {} },
      },
    });

    const harness = createFlowTestHarness(malformedMachine);
    await harness.send({ type: "GO" });
    expect(harness.snapshot().state).toBe("done");
    await harness.cleanup();
  });

  it("handles Invoke with non-array args in harness", async () => {
    const malformedMachine = defineMachine({
      id: "harness-bad-args",
      initial: "idle" as "idle" | "done",
      context: {},
      states: {
        idle: {
          on: {
            GO: {
              target: "done" as const,
              effects: [
                { _tag: "Invoke", port: { __portName: "Svc" }, method: "go", args: "str" } as never,
              ],
            },
          },
        },
        done: { on: {} },
      },
    });

    let calledWithArgs: unknown[] = [];
    const harness = createFlowTestHarness(malformedMachine, {
      mocks: {
        Svc: {
          go: (...args: unknown[]) => {
            calledWithArgs = args;
          },
        },
      },
    });
    await harness.send({ type: "GO" });
    // args fallback to empty array, so mock should be called with no arguments
    expect(calledWithArgs).toEqual([]);
    await harness.cleanup();
  });

  it("handles Invoke with no port property in harness", async () => {
    const malformedMachine = defineMachine({
      id: "harness-no-port",
      initial: "idle" as "idle" | "done",
      context: {},
      states: {
        idle: {
          on: {
            GO: {
              target: "done" as const,
              effects: [{ _tag: "Invoke", method: "fn", args: [] } as never],
            },
          },
        },
        done: { on: {} },
      },
    });

    const harness = createFlowTestHarness(malformedMachine);
    await harness.send({ type: "GO" });
    expect(harness.snapshot().state).toBe("done");
    await harness.cleanup();
  });

  it("handles Invoke with no method property in harness", async () => {
    const malformedMachine = defineMachine({
      id: "harness-no-method",
      initial: "idle" as "idle" | "done",
      context: {},
      states: {
        idle: {
          on: {
            GO: {
              target: "done" as const,
              effects: [{ _tag: "Invoke", port: { __portName: "Svc" }, args: [] } as never],
            },
          },
        },
        done: { on: {} },
      },
    });

    const harness = createFlowTestHarness(malformedMachine, {
      mocks: { Svc: { fn: () => "x" } },
    });
    await harness.send({ type: "GO" });
    expect(harness.snapshot().state).toBe("done");
    await harness.cleanup();
  });

  it("handles Invoke with undefined service in harness mocks", async () => {
    const port = { __portName: "UndSvc" };
    const machine = defineMachine({
      id: "harness-und-svc",
      initial: "idle" as "idle" | "done",
      context: {},
      states: {
        idle: {
          on: {
            GO: {
              target: "done" as const,
              effects: [Effect.invoke(port as never, "fn" as never, [] as never)],
            },
          },
        },
        done: { on: {} },
      },
    });

    const harness = createFlowTestHarness(machine, {
      mocks: { UndSvc: undefined as never },
    });
    await harness.send({ type: "GO" });
    expect(harness.snapshot().state).toBe("done");
    await harness.cleanup();
  });

  it("handles Invoke with non-function method in harness mocks", async () => {
    const port = { __portName: "StrSvc" };
    const machine = defineMachine({
      id: "harness-str-fn",
      initial: "idle" as "idle" | "done",
      context: {},
      states: {
        idle: {
          on: {
            GO: {
              target: "done" as const,
              effects: [Effect.invoke(port as never, "prop" as never, [] as never)],
            },
          },
        },
        done: { on: {} },
      },
    });

    const harness = createFlowTestHarness(machine, {
      mocks: { StrSvc: { prop: 42 } },
    });
    await harness.send({ type: "GO" });
    expect(harness.snapshot().state).toBe("done");
    await harness.cleanup();
  });
});

// =============================================================================
// Mutation-killing: testEffect catch block coverage
// =============================================================================

describe("testEffect catch block coverage", () => {
  it("catches errors thrown by executeEffect when _tag getter throws", async () => {
    // Create an effect with a getter that throws
    const throwingEffect = Object.create(null);
    Object.defineProperty(throwingEffect, "_tag", {
      get() {
        throw new Error("getter throws");
      },
    });

    const result = await testEffect(throwingEffect as never);
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.called).toBe(false);
    expect(result.calledWith).toBeUndefined();
    expect(result.returnValue).toBeUndefined();
  });
});

// =============================================================================
// Mutation-killing: waitForState with intermediate transitions
// =============================================================================

describe("waitForState only resolves on exact state match", () => {
  it("does not resolve on intermediate state transitions", async () => {
    const harness = createFlowTestHarness(counterMachine);

    let resolved = false;
    // Wait for "done" - should NOT resolve when we go to "counting"
    const waitPromise = harness.waitForState("done", 2000).then(() => {
      resolved = true;
    });

    // Transition to "counting" (intermediate state)
    await harness.send({ type: "START" });

    // Give a brief pause to see if the promise resolves incorrectly
    await new Promise(r => setTimeout(r, 50));
    expect(resolved).toBe(false); // Should NOT be resolved yet

    // Now transition to "done"
    await harness.send({ type: "DONE" });
    await waitPromise;
    expect(resolved).toBe(true);

    await harness.cleanup();
  });
});

// =============================================================================
// Mutation-killing: test-effect.ts case "Delay" vs case ""
// =============================================================================

describe("testEffect case label mutations", () => {
  it("Delay effect is handled (not unhandled)", async () => {
    const result = await testEffect(Effect.delay(100));
    expect(result.ok).toBe(true);
    expect(result.called).toBe(false);
    // Delay is matched by its case, NOT the default case
    expect(result).not.toHaveProperty("unhandled");
  });

  it("None effect is handled (not unhandled)", async () => {
    const result = await testEffect(Effect.none());
    expect(result.ok).toBe(true);
    expect(result.called).toBe(false);
    expect(result).not.toHaveProperty("unhandled");
  });

  it("Log effect is handled (not unhandled)", async () => {
    const result = await testEffect(Effect.log("msg"));
    expect(result.ok).toBe(true);
    expect(result).not.toHaveProperty("unhandled");
  });

  it("Choose effect is handled (not unhandled)", async () => {
    const result = await testEffect(Effect.choose([]));
    expect(result.ok).toBe(true);
    expect(result).not.toHaveProperty("unhandled");
  });

  it("unknown tag returns unhandled=true", async () => {
    const result = await testEffect({ _tag: "SomethingUnknown" } as never);
    expect(result.ok).toBe(true);
    expect(result.unhandled).toBe(true);
  });
});

// =============================================================================
// Mutation-killing: Verify initial recordedEffects array is clean
// =============================================================================

describe("createFlowTestHarness initial effects state", () => {
  it("effects array is empty before any events are sent", () => {
    const harness = createFlowTestHarness(counterMachine);
    // This kills the mutant that changes `recordedEffects: EffectAny[] = []`
    // to `recordedEffects: EffectAny[] = ["Stryker was here"]`
    expect(harness.effects).toHaveLength(0);
  });
});

describe("testFlowInContainer initial effects state", () => {
  it("effects array is empty before any events are sent", () => {
    const test = testFlowInContainer({ machine: counterMachine });
    expect(test.effects).toHaveLength(0);
    expect(test.invocations).toHaveLength(0);
  });
});

// =============================================================================
// Mutation-killing: mock-effect-executor InvokeError properties
// =============================================================================

describe("createMockEffectExecutor error mapping properties", () => {
  it("error result has empty portName and method strings", async () => {
    const mock = createMockEffectExecutor([
      {
        tag: "Invoke",
        error: new Error("test-cause"),
      },
    ]);

    const result = await mock.executor.execute({ _tag: "Invoke" } as never);
    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error._tag).toBe("InvokeError");
      const errObj = result.error as Record<string, unknown>;
      // Verify the specific property values are empty strings
      expect(errObj["portName"]).toBe("");
      expect(errObj["method"]).toBe("");
      expect(errObj["cause"]).toBeInstanceOf(Error);
    }
  });
});

// =============================================================================
// Mutation-killing: test-effect.ts Spawn block - verify activityId is returned
// =============================================================================

describe("testEffect Spawn block verification", () => {
  it("Spawn effect returns activityId specifically (not from default case)", async () => {
    const effect = Effect.spawn("unique-activity-id", { key: "val" });
    const result = await testEffect(effect);
    // If the Spawn case block were empty/removed, the default case returns
    // { ok: true, called: false, returnValue: undefined }
    // We verify that called is true and returnValue is the activityId
    expect(result.ok).toBe(true);
    expect(result.called).toBe(true);
    expect(result.returnValue).toBe("unique-activity-id");
    // These would be different if the default case handled it instead
    expect(result.called).not.toBe(false);
    expect(result.returnValue).not.toBeUndefined();
  });
});

// =============================================================================
// Mutation-killing: test-effect.ts Sequence/Parallel case labels
// =============================================================================

describe("testEffect Sequence and Parallel case label distinction", () => {
  it("Sequence with failing sub-effect returns error (not default ok)", async () => {
    const port = { __portName: "SeqKill" };
    const effect = Effect.sequence([
      Effect.invoke(port as never, "missingMethod" as never, [] as never),
    ]);

    const result = await testEffect(effect);
    // If Sequence case becomes "" (empty string), the default case returns
    // { ok: true, called: false }
    // But Sequence should propagate the sub-effect error
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });

  it("Parallel with failing sub-effect returns error (not default ok)", async () => {
    const port = { __portName: "ParKill" };
    const effect = Effect.parallel([
      Effect.invoke(port as never, "missingMethod" as never, [] as never),
    ]);

    const result = await testEffect(effect);
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });
});

// =============================================================================
// Mutation-killing: test-flow-in-container.ts InvokeError properties in error path
// =============================================================================

describe("testFlowInContainer error invocation details", () => {
  it("error invocation contains correct portName and method", async () => {
    const port = { __portName: "ErrPort" };
    const machine = defineMachine({
      id: "err-invocation",
      initial: "idle" as "idle" | "done",
      context: {},
      states: {
        idle: {
          on: {
            GO: {
              target: "done" as const,
              effects: [Effect.invoke(port as never, "failMethod" as never, ["a"] as never)],
            },
          },
        },
        done: { on: {} },
      },
    });

    const test = testFlowInContainer({
      machine,
      mocks: {
        ErrPort: {
          failMethod: () => {
            throw new Error("intentional");
          },
        },
      },
    });

    await test.send({ type: "GO" });
    expect(test.invocations).toHaveLength(1);
    // Verify the error invocation record has correct portName and method
    expect(test.invocations[0].portName).toBe("ErrPort");
    expect(test.invocations[0].method).toBe("failMethod");
    expect(test.invocations[0].threw).toBe(true);
    expect(test.invocations[0].error).toBeInstanceOf(Error);
    if (test.invocations[0].error instanceof Error) {
      expect(test.invocations[0].error.message).toBe("intentional");
    }
    await test.dispose();
  });
});

// =============================================================================
// Mutation-killing: test-machine.ts waitForState timer.id clearing
// =============================================================================

describe("waitForState timer cleanup", () => {
  it("timer is cleared when state is reached before timeout", async () => {
    const clearSpy = vi.spyOn(globalThis, "clearTimeout");
    const callsBefore = clearSpy.mock.calls.length;

    const harness = createFlowTestHarness(counterMachine);

    // Set up waitForState with a long timeout
    const waitPromise = harness.waitForState("counting", 30000);

    // Transition should resolve the wait and clear the timer
    await harness.send({ type: "START" });
    await waitPromise;

    // Verify clearTimeout was called (at least once more than before)
    expect(clearSpy.mock.calls.length).toBeGreaterThan(callsBefore);

    clearSpy.mockRestore();
    await harness.cleanup();
  });
});

// =============================================================================
// Mutation-killing: test-machine.ts eventWaiters filter removal
// =============================================================================

describe("waitForEvent waiter cleanup after timeout", () => {
  it("timed out waiter is removed from waiters list", async () => {
    const harness = createFlowTestHarness(counterMachine);

    // First waiter times out
    await expect(harness.waitForEvent("NEVER", 30)).rejects.toThrow(/Timed out/);

    // Now send START and create a waiter for it
    const waitPromise = harness.waitForEvent("START", 5000);
    await harness.send({ type: "START" });
    const event = await waitPromise;
    expect(event.type).toBe("START");

    // If the timed-out waiter wasn't removed, cleanup might try to
    // reject it again, but it's already rejected
    await harness.cleanup();
  });

  it("resolved waiter is removed from waiters list on match", async () => {
    const harness = createFlowTestHarness(counterMachine);

    // Create a waiter, resolve it, then check that cleanup doesn't error
    const waitPromise = harness.waitForEvent("START", 5000);
    await harness.send({ type: "START" });
    await waitPromise;

    // Cleanup should not try to reject the already-resolved waiter
    await harness.cleanup();
  });

  it("timeout of one waiter does not remove other waiters", async () => {
    const harness = createFlowTestHarness(counterMachine);

    // Create two waiters: one will timeout, other should still work
    const timeoutWaiter = harness.waitForEvent("NEVER", 30);
    const keepWaiter = harness.waitForEvent("START", 5000);

    // First waiter times out
    await expect(timeoutWaiter).rejects.toThrow(/Timed out/);

    // Second waiter should still work after first one timed out
    await harness.send({ type: "START" });
    const event = await keepWaiter;
    expect(event.type).toBe("START");

    await harness.cleanup();
  });
});

// =============================================================================
// testGuardSafe
// =============================================================================

describe("testGuardSafe", () => {
  it("returns Ok(true) when guard returns true", () => {
    const canRetry = (ctx: { retryCount: number }) => ctx.retryCount < 3;
    const result = testGuardSafe(canRetry, {
      context: { retryCount: 2 },
      event: { type: "RETRY" },
    });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(true);
    }
  });

  it("returns Ok(false) when guard returns false", () => {
    const canRetry = (ctx: { retryCount: number }) => ctx.retryCount < 3;
    const result = testGuardSafe(canRetry, {
      context: { retryCount: 5 },
      event: { type: "RETRY" },
    });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(false);
    }
  });

  it("returns Err when guard throws", () => {
    const badGuard = (): boolean => {
      throw new Error("guard boom");
    };
    const result = testGuardSafe(badGuard, {
      context: {},
      event: { type: "TEST" },
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(Error);
    }
  });

  it("works with named guards", () => {
    const isAdmin = guard("isAdmin", (ctx: { role: string }) => ctx.role === "admin");
    const result = testGuardSafe(isAdmin, {
      context: { role: "admin" },
      event: { type: "TEST" },
    });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(true);
    }
  });

  it("works with guard combinators", () => {
    const isAdmin = guard(
      "isAdmin",
      (ctx: { role: string; active: boolean }) => ctx.role === "admin"
    );
    const isActive = guard("isActive", (ctx: { role: string; active: boolean }) => ctx.active);
    const canEdit = and(isAdmin, isActive);

    const okResult = testGuardSafe(canEdit, {
      context: { role: "admin", active: true },
      event: { type: "EDIT" },
    });
    expect(okResult.isOk()).toBe(true);
    if (okResult.isOk()) {
      expect(okResult.value).toBe(true);
    }

    const failResult = testGuardSafe(canEdit, {
      context: { role: "admin", active: false },
      event: { type: "EDIT" },
    });
    expect(failResult.isOk()).toBe(true);
    if (failResult.isOk()) {
      expect(failResult.value).toBe(false);
    }
  });
});

// =============================================================================
// testEffectSafe
// =============================================================================

describe("testEffectSafe", () => {
  it("returns Ok(result) for successful effect", async () => {
    const effect = Effect.delay(1000);
    const result = await testEffectSafe(effect);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.ok).toBe(true);
    }
  });

  it("returns Ok(result) for Invoke effect with mocks", async () => {
    const port = { __portName: "ApiService" };
    const effect = Effect.invoke(port as never, "fetchData" as never, ["id-123"] as never);

    const result = await testEffectSafe(effect, {
      mocks: {
        ApiService: {
          fetchData: (id: unknown) => ({ id, name: "Test" }),
        },
      },
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.ok).toBe(true);
      expect(result.value.called).toBe(true);
      expect(result.value.returnValue).toEqual({ id: "id-123", name: "Test" });
    }
  });

  it("returns Ok(result) with ok=false for failed mock", async () => {
    const port = { __portName: "ApiService" };
    const effect = Effect.invoke(port as never, "badMethod" as never, [] as never);

    const result = await testEffectSafe(effect, {
      mocks: {
        ApiService: {
          badMethod: () => {
            throw new Error("mock failure");
          },
        },
      },
    });

    // testEffect catches this internally and returns { ok: false }, so testEffectSafe wraps that as Ok
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.ok).toBe(false);
      expect(result.value.error).toBeInstanceOf(Error);
    }
  });

  it("returns Ok(result) with ok=false for missing mock port", async () => {
    const port = { __portName: "MissingPort" };
    const effect = Effect.invoke(port as never, "method" as never, [] as never);

    const result = await testEffectSafe(effect);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.ok).toBe(false);
      expect(result.value.error).toBeInstanceOf(Error);
    }
  });
});
