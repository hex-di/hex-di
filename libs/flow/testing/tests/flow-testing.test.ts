import { describe, it, expect, afterEach } from "vitest";
import { createMachine } from "@hex-di/flow";
import {
  createFlowTestHarness,
  createMockEffectExecutor,
  createFlowEventRecorder,
  createMockActivity,
  expectFlowState,
  expectEvents,
  expectEventTypes,
  expectSnapshot,
  serializeSnapshot,
  snapshotMachine,
} from "../src/index.js";

// =============================================================================
// Test Machine Setup
// =============================================================================

interface CounterContext {
  readonly count: number;
}

const counterMachine = createMachine({
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

const guardedMachine = createMachine({
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

  it("throws error for matching effects with error config", async () => {
    const mock = createMockEffectExecutor([
      {
        tag: "Invoke",
        error: new Error("mock invoke error"),
      },
    ]);

    await expect(mock.executor.execute({ _tag: "Invoke" } as never)).rejects.toThrow(
      "mock invoke error"
    );
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
