/**
 * DoD 12: Advanced Patterns (Spec Section 13) - Unit Tests
 *
 * Tests covering:
 * - Actor model: createMachineActivity (tests 1-4)
 * - Subscription: createSubscriptionActivity (tests 5-7)
 * - Retry: retryConfig (tests 8-10)
 * - Coordination: waitForAll, waitForAny (tests 11-12)
 * - Serialization: serializeMachineState, restoreMachineState (tests 13-19)
 * - Batch: sendBatch (tests 20-22)
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi } from "vitest";
import { expectOk, expectErr } from "@hex-di/result-testing";
import { defineMachine } from "../src/machine/define-machine.js";
import type { MachineAny } from "../src/machine/types.js";
import { Effect } from "../src/effects/constructors.js";
import {
  createMachineRunner,
  createBasicExecutor,
  type MachineSnapshot,
} from "../src/runner/index.js";
import { createActivityManager } from "../src/activities/index.js";
import {
  createMachineActivity,
  createSubscriptionActivity,
  retryConfig,
  waitForAll,
  waitForAny,
  serializeMachineState,
  restoreMachineState,
} from "../src/index.js";

// =============================================================================
// Test Helpers
// =============================================================================

function createRunner(machine: MachineAny) {
  const activityManager = createActivityManager();
  const runner = createMachineRunner(machine, {
    executor: createBasicExecutor(),
    activityManager,
  });
  return { runner, activityManager };
}

// =============================================================================
// DoD 12.1: createMachineActivity wraps child machine in Activity
// =============================================================================

describe("DoD 12.1: createMachineActivity wraps child machine in Activity", () => {
  it("creates an Activity with execute function", () => {
    const childMachine = defineMachine({
      id: "child",
      initial: "idle",
      states: {
        idle: { on: { GO: { target: "done" } } },
        done: { type: "final" },
      },
    });

    const activity = createMachineActivity(childMachine);
    expect(activity).toHaveProperty("execute");
    expect(typeof activity.execute).toBe("function");
  });
});

// =============================================================================
// DoD 12.2: Child machine activity completes when child reaches final state
// =============================================================================

describe("DoD 12.2: Child machine activity completes when child reaches final state", () => {
  it("emits done event when child reaches final state", async () => {
    const childMachine = defineMachine({
      id: "child",
      initial: "idle",
      states: {
        idle: { on: { GO: { target: "done" } } },
        done: { type: "final" },
      },
    });

    const activity = createMachineActivity(childMachine, {
      doneEventType: "CHILD_DONE",
    });

    const events: { readonly type: string }[] = [];
    const sink = { emit: (e: { readonly type: string }) => events.push(e) };
    const controller = new AbortController();

    // Run activity with events that take child to final state
    const promise = activity.execute({ events: [{ type: "GO" }] }, sink, controller.signal);

    // Abort to let the activity finish
    controller.abort();
    await promise;

    expect(events).toContainEqual({ type: "CHILD_DONE" });
  });
});

// =============================================================================
// DoD 12.3: Child machine activity emits events to parent via EventSink
// =============================================================================

describe("DoD 12.3: Child machine activity emits events to parent via EventSink", () => {
  it("forwards events through the EventSink", async () => {
    const childMachine = defineMachine({
      id: "child",
      initial: "idle",
      states: {
        idle: { on: { GO: { target: "done" } } },
        done: { type: "final" },
      },
    });

    const activity = createMachineActivity(childMachine, {
      doneEventType: "CHILD_COMPLETE",
    });

    const events: { readonly type: string }[] = [];
    const sink = { emit: (e: { readonly type: string }) => events.push(e) };
    const controller = new AbortController();

    const promise = activity.execute({ events: [{ type: "GO" }] }, sink, controller.signal);

    controller.abort();
    await promise;

    // Should have emitted the done event through the sink
    expect(events.length).toBeGreaterThan(0);
    expect(events.some(e => e.type === "CHILD_COMPLETE")).toBe(true);
  });
});

// =============================================================================
// DoD 12.4: Child machine is stopped on parent state exit (via AbortSignal)
// =============================================================================

describe("DoD 12.4: Child machine is stopped on parent state exit", () => {
  it("stops when AbortSignal is triggered", async () => {
    const childMachine = defineMachine({
      id: "long-running",
      initial: "running",
      states: {
        running: { on: {} },
      },
    });

    const activity = createMachineActivity(childMachine);
    const sink = { emit: vi.fn() };
    const controller = new AbortController();

    const promise = activity.execute({ events: [] }, sink, controller.signal);

    // Activity should be waiting for abort
    controller.abort();
    await promise;

    // If we get here, the activity properly responded to abort
    expect(true).toBe(true);
  });

  it("returns immediately if already aborted", async () => {
    const childMachine = defineMachine({
      id: "child",
      initial: "idle",
      states: { idle: { on: {} } },
    });

    const activity = createMachineActivity(childMachine);
    const sink = { emit: vi.fn() };
    const controller = new AbortController();
    controller.abort(); // Already aborted

    await activity.execute({ events: [] }, sink, controller.signal);
    // Should complete without hanging
    expect(true).toBe(true);
  });
});

// =============================================================================
// DoD 12.5: createSubscriptionActivity wraps external event source
// =============================================================================

describe("DoD 12.5: createSubscriptionActivity wraps external event source", () => {
  it("creates an Activity with execute function", () => {
    const activity = createSubscriptionActivity({
      subscribe: _callback => () => {},
    });

    expect(activity).toHaveProperty("execute");
    expect(typeof activity.execute).toBe("function");
  });
});

// =============================================================================
// DoD 12.6: Subscription activity routes events to machine
// =============================================================================

describe("DoD 12.6: Subscription activity routes events to machine", () => {
  it("routes events from source to EventSink", async () => {
    type TestEvent = { readonly type: "DATA"; readonly value: number };
    let emitter: ((event: TestEvent) => void) | undefined;

    const activity = createSubscriptionActivity<TestEvent>({
      subscribe: callback => {
        emitter = callback;
        return () => {
          emitter = undefined;
        };
      },
    });

    const events: { readonly type: string }[] = [];
    const sink = { emit: (e: { readonly type: string }) => events.push(e) };
    const controller = new AbortController();

    const promise = activity.execute(undefined, sink, controller.signal);

    // Wait a tick for subscription to be established
    await new Promise(resolve => {
      setTimeout(resolve, 10);
    });

    // Emit events through the source
    emitter?.({ type: "DATA", value: 1 });
    emitter?.({ type: "DATA", value: 2 });

    controller.abort();
    await promise;

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: "DATA", value: 1 });
    expect(events[1]).toEqual({ type: "DATA", value: 2 });
  });
});

// =============================================================================
// DoD 12.7: Subscription activity respects AbortSignal cancellation
// =============================================================================

describe("DoD 12.7: Subscription activity respects AbortSignal cancellation", () => {
  it("unsubscribes when signal is aborted", async () => {
    let unsubCalled = false;

    const activity = createSubscriptionActivity({
      subscribe: _callback => () => {
        unsubCalled = true;
      },
    });

    const sink = { emit: vi.fn() };
    const controller = new AbortController();

    const promise = activity.execute(undefined, sink, controller.signal);

    controller.abort();
    await promise;

    expect(unsubCalled).toBe(true);
  });

  it("does not route events after abort", async () => {
    type TestEvent = { readonly type: "DATA" };
    let emitter: ((event: TestEvent) => void) | undefined;

    const activity = createSubscriptionActivity<TestEvent>({
      subscribe: callback => {
        emitter = callback;
        return () => {};
      },
    });

    const events: unknown[] = [];
    const sink = { emit: (e: unknown) => events.push(e) };
    const controller = new AbortController();

    const promise = activity.execute(undefined, sink, controller.signal);
    await new Promise(resolve => {
      setTimeout(resolve, 10);
    });

    emitter?.({ type: "DATA" });
    controller.abort();
    await promise;

    // Events emitted before abort should be captured
    const countBefore = events.length;

    // Events after abort should be ignored (emitter may still exist but sink check prevents)
    emitter?.({ type: "DATA" });
    expect(events.length).toBe(countBefore);
  });

  it("returns immediately if already aborted", async () => {
    const activity = createSubscriptionActivity({
      subscribe: _callback => () => {},
    });

    const sink = { emit: vi.fn() };
    const controller = new AbortController();
    controller.abort();

    await activity.execute(undefined, sink, controller.signal);
    expect(true).toBe(true);
  });
});

// =============================================================================
// DoD 12.8: retryConfig generates states and transitions for retry pattern
// =============================================================================

describe("DoD 12.8: retryConfig generates states and transitions", () => {
  it("produces retryWaiting state", () => {
    const retry = retryConfig({
      maxRetries: 3,
      initialDelay: 1000,
      successTarget: "success",
      failureTarget: "failed",
      retryEvent: "RETRY",
      successEvent: "SUCCESS",
      failureEvent: "FAILURE",
    });

    expect(retry.states).toHaveProperty("retryWaiting");
    expect(retry.initialContext).toEqual({ retryCount: 0, retryDelay: 1000 });
  });
});

// =============================================================================
// DoD 12.9: Retry guard canRetry checks retryCount against maxRetries
// =============================================================================

describe("DoD 12.9: canRetry guard checks retryCount", () => {
  it("returns true when retryCount < maxRetries", () => {
    const retry = retryConfig({
      maxRetries: 3,
      successTarget: "success",
      failureTarget: "failed",
      retryEvent: "RETRY",
      successEvent: "SUCCESS",
      failureEvent: "FAILURE",
    });

    expect(retry.canRetry({ retryCount: 0, retryDelay: 1000 })).toBe(true);
    expect(retry.canRetry({ retryCount: 2, retryDelay: 1000 })).toBe(true);
    expect(retry.canRetry({ retryCount: 3, retryDelay: 1000 })).toBe(false);
    expect(retry.canRetry({ retryCount: 5, retryDelay: 1000 })).toBe(false);
  });
});

// =============================================================================
// DoD 12.10: Exponential backoff computes correct delay
// =============================================================================

describe("DoD 12.10: Exponential backoff computes correct delay", () => {
  it("doubles delay for each retry by default", () => {
    const retry = retryConfig({
      maxRetries: 5,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      successTarget: "success",
      failureTarget: "failed",
      retryEvent: "RETRY",
      successEvent: "SUCCESS",
      failureEvent: "FAILURE",
    });

    expect(retry.computeDelay({ retryCount: 0, retryDelay: 0 })).toBe(1000);
    expect(retry.computeDelay({ retryCount: 1, retryDelay: 0 })).toBe(2000);
    expect(retry.computeDelay({ retryCount: 2, retryDelay: 0 })).toBe(4000);
    expect(retry.computeDelay({ retryCount: 3, retryDelay: 0 })).toBe(8000);
    expect(retry.computeDelay({ retryCount: 4, retryDelay: 0 })).toBe(16000);
  });

  it("caps delay at maxDelay", () => {
    const retry = retryConfig({
      maxRetries: 10,
      initialDelay: 1000,
      maxDelay: 5000,
      backoffMultiplier: 3,
      successTarget: "success",
      failureTarget: "failed",
      retryEvent: "RETRY",
      successEvent: "SUCCESS",
      failureEvent: "FAILURE",
    });

    // 1000 * 3^3 = 27000, capped at 5000
    expect(retry.computeDelay({ retryCount: 3, retryDelay: 0 })).toBe(5000);
  });
});

// =============================================================================
// DoD 12.11: waitForAll guard returns true when all completed
// =============================================================================

describe("DoD 12.11: waitForAll guard", () => {
  it("returns true when all child IDs are in completedActivities", () => {
    const guard = waitForAll(["a", "b", "c"]);

    expect(guard({ completedActivities: ["a", "b", "c"] })).toBe(true);
    expect(guard({ completedActivities: ["a", "b", "c", "d"] })).toBe(true);
  });

  it("returns false when some child IDs are missing", () => {
    const guard = waitForAll(["a", "b", "c"]);

    expect(guard({ completedActivities: ["a", "b"] })).toBe(false);
    expect(guard({ completedActivities: [] })).toBe(false);
    expect(guard({})).toBe(false);
  });
});

// =============================================================================
// DoD 12.12: waitForAny guard returns true when any completed
// =============================================================================

describe("DoD 12.12: waitForAny guard", () => {
  it("returns true when any child ID is in completedActivities", () => {
    const guard = waitForAny(["a", "b", "c"]);

    expect(guard({ completedActivities: ["a"] })).toBe(true);
    expect(guard({ completedActivities: ["b", "d"] })).toBe(true);
    expect(guard({ completedActivities: ["c"] })).toBe(true);
  });

  it("returns false when no child IDs are completed", () => {
    const guard = waitForAny(["a", "b", "c"]);

    expect(guard({ completedActivities: ["d", "e"] })).toBe(false);
    expect(guard({ completedActivities: [] })).toBe(false);
    expect(guard({})).toBe(false);
  });
});

// =============================================================================
// DoD 12.13: serializeMachineState returns Ok(SerializedMachineState)
// =============================================================================

describe("DoD 12.13: serializeMachineState returns Ok for valid state", () => {
  it("serializes a machine runner state", () => {
    const machine = defineMachine({
      id: "serialize-test",
      initial: "idle",
      context: { count: 42 },
      states: {
        idle: { on: {} },
      },
    });

    const { runner, activityManager } = createRunner(machine);

    const result = serializeMachineState(runner, "serialize-test");
    const value = expectOk(result);
    expect(value.machineId).toBe("serialize-test");
    expect(value.state).toBe("idle");
    expect(value.context).toEqual({ count: 42 });
    expect(value.version).toBe(1);
    expect(typeof value.timestamp).toBe("number");

    activityManager.dispose();
  });
});

// =============================================================================
// DoD 12.14: serializeMachineState returns Err(NonSerializableContext) for functions
// =============================================================================

describe("DoD 12.14: serializeMachineState rejects non-serializable context", () => {
  it("returns Err for function in context", () => {
    const machine = defineMachine({
      id: "nonserial-test",
      initial: "idle",
      context: { callback: () => {} },
      states: {
        idle: { on: {} },
      },
    });

    const { runner, activityManager } = createRunner(machine);

    const result = serializeMachineState(runner, "nonserial-test");
    const error = expectErr(result);
    expect(error._tag).toBe("NonSerializableContext");

    activityManager.dispose();
  });
});

// =============================================================================
// DoD 12.15: serializeMachineState returns Err(CircularReference) for cycles
// =============================================================================

describe("DoD 12.15: serializeMachineState rejects circular references", () => {
  it("returns Err for circular context", () => {
    const circular: Record<string, unknown> = { a: 1 };
    circular["self"] = circular;

    const machine = defineMachine({
      id: "circular-test",
      initial: "idle",
      context: circular,
      states: {
        idle: { on: {} },
      },
    });

    const { runner, activityManager } = createRunner(machine);

    const result = serializeMachineState(runner, "circular-test");
    const error = expectErr(result);
    expect(error._tag).toBe("CircularReference");

    activityManager.dispose();
  });
});

// =============================================================================
// DoD 12.16: restoreMachineState returns Ok for valid snapshot
// =============================================================================

describe("DoD 12.16: restoreMachineState returns Ok for valid snapshot", () => {
  it("restores a valid snapshot", () => {
    const machine = defineMachine({
      id: "restore-test",
      initial: "idle",
      context: { data: null },
      states: {
        idle: { on: { GO: { target: "active" } } },
        active: { on: {} },
      },
    });

    const result = restoreMachineState(
      {
        version: 1,
        machineId: "restore-test",
        state: "active",
        context: { data: "restored" },
        timestamp: Date.now(),
      },
      machine
    );

    const value = expectOk(result);
    expect(value.state).toBe("active");
    expect(value.context).toEqual({ data: "restored" });
  });
});

// =============================================================================
// DoD 12.17: restoreMachineState returns Err(InvalidState) for unknown state
// =============================================================================

describe("DoD 12.17: restoreMachineState rejects unknown state", () => {
  it("returns Err for invalid state name", () => {
    const machine = defineMachine({
      id: "restore-invalid",
      initial: "idle",
      states: {
        idle: { on: {} },
        active: { on: {} },
      },
    });

    const result = restoreMachineState(
      {
        version: 1,
        machineId: "restore-invalid",
        state: "nonexistent",
        context: undefined,
        timestamp: Date.now(),
      },
      machine
    );

    const error = expectErr(result);
    expect(error._tag).toBe("InvalidState");
  });
});

// =============================================================================
// DoD 12.18: restoreMachineState returns Err(MachineIdMismatch) for wrong machine
// =============================================================================

describe("DoD 12.18: restoreMachineState rejects machine ID mismatch", () => {
  it("returns Err when machine IDs don't match", () => {
    const machine = defineMachine({
      id: "correct-id",
      initial: "idle",
      states: { idle: { on: {} } },
    });

    const result = restoreMachineState(
      {
        version: 1,
        machineId: "wrong-id",
        state: "idle",
        context: undefined,
        timestamp: Date.now(),
      },
      machine
    );

    const error = expectErr(result);
    expect(error._tag).toBe("MachineIdMismatch");
  });
});

// =============================================================================
// DoD 12.19: Restored machine skips entry effects (resumes as-is)
// =============================================================================

describe("DoD 12.19: Restored machine resumes without entry effects", () => {
  it("restoreMachineState returns state/context without triggering effects", () => {
    const machine = defineMachine({
      id: "skip-entry",
      initial: "idle",
      context: { count: 0 },
      states: {
        idle: {
          entry: [Effect.delay(100)],
          on: { GO: { target: "active" } },
        },
        active: {
          entry: [Effect.delay(200)],
          on: {},
        },
      },
    });

    const result = restoreMachineState(
      {
        version: 1,
        machineId: "skip-entry",
        state: "active",
        context: { count: 5 },
        timestamp: Date.now(),
      },
      machine
    );

    // restoreMachineState returns the state/context for the caller to
    // create a runner with — no effects are triggered
    const value = expectOk(result);
    expect(value.state).toBe("active");
    expect(value.context).toEqual({ count: 5 });
  });
});

// =============================================================================
// DoD 12.20: sendBatch processes multiple events in one pass
// =============================================================================

describe("DoD 12.20: sendBatch processes multiple events", () => {
  it("processes multiple events and accumulates effects", () => {
    const machine = defineMachine({
      id: "batch-test",
      initial: "a",
      context: { value: 0 },
      states: {
        a: {
          on: {
            NEXT: {
              target: "b",
              actions: [(ctx: { value: number }) => ({ value: ctx.value + 1 })],
            },
          },
        },
        b: {
          on: {
            NEXT: {
              target: "c",
              actions: [(ctx: { value: number }) => ({ value: ctx.value + 1 })],
            },
          },
        },
        c: { on: {} },
      },
    });

    const { runner, activityManager } = createRunner(machine);

    const result = runner.sendBatch([{ type: "NEXT" }, { type: "NEXT" }]);
    expectOk(result);
    expect(runner.state()).toBe("c");
    expect(runner.context()).toEqual({ value: 2 });

    activityManager.dispose();
  });
});

// =============================================================================
// DoD 12.21: sendBatch notifies subscribers only once at the end
// =============================================================================

describe("DoD 12.21: sendBatch notifies subscribers once", () => {
  it("calls subscriber exactly once after all events are processed", () => {
    const machine = defineMachine({
      id: "batch-notify",
      initial: "a",
      states: {
        a: { on: { NEXT: { target: "b" } } },
        b: { on: { NEXT: { target: "c" } } },
        c: { on: {} },
      },
    });

    const { runner, activityManager } = createRunner(machine);

    const snapshots: MachineSnapshot<string, unknown>[] = [];
    runner.subscribe(snap => snapshots.push(snap));

    runner.sendBatch([{ type: "NEXT" }, { type: "NEXT" }]);

    // Should have been called exactly once (not twice)
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].state).toBe("c");

    activityManager.dispose();
  });
});

// =============================================================================
// DoD 12.22: sendBatch short-circuits on first Err(TransitionError)
// =============================================================================

describe("DoD 12.22: sendBatch short-circuits on first error", () => {
  it("stops processing on guard error and returns Err", () => {
    const throwingGuard = () => {
      throw new Error("guard boom");
    };

    const machine = defineMachine({
      id: "batch-error",
      initial: "a",
      states: {
        a: { on: { NEXT: { target: "b" } } },
        b: {
          on: {
            NEXT: { target: "c", guard: throwingGuard },
          },
        },
        c: { on: { NEXT: { target: "d" } } },
        d: { on: {} },
      },
    });

    const { runner, activityManager } = createRunner(machine);

    // First event succeeds (a→b), second event causes guard error (b→c)
    // Third event should never be processed
    const result = runner.sendBatch([{ type: "NEXT" }, { type: "NEXT" }, { type: "NEXT" }]);

    const error = expectErr(result);
    expect(error._tag).toBe("GuardThrew");

    // State should be 'b' (first transition applied, second failed)
    expect(runner.state()).toBe("b");

    activityManager.dispose();
  });

  it("returns Ok with empty array for empty batch", () => {
    const machine = defineMachine({
      id: "batch-empty",
      initial: "idle",
      states: { idle: { on: {} } },
    });

    const { runner, activityManager } = createRunner(machine);

    const snapshots: unknown[] = [];
    runner.subscribe(snap => snapshots.push(snap));

    const result = runner.sendBatch([]);
    const value = expectOk(result);
    expect(value).toEqual([]);

    // No subscribers should be notified for empty batch
    expect(snapshots).toHaveLength(0);

    activityManager.dispose();
  });
});
